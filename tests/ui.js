#!/usr/bin/env node
/* LPIC-1 Trainer — browser smoke tests (needs Playwright with Chromium):
 *   npm install --no-save playwright && npx playwright install chromium
 *   node tests/ui.js
 * Starts the server on a free port with a temporary database, visits every
 * page, and drives a quiz, a lab, a scenario, an exam and the terminal. */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const { spawn } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('Playwright is not installed — skipping UI tests (npm install --no-save playwright).');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const freePort = () =>
  new Promise((res) => {
    const s = net.createServer().listen(0, () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
  });

let failed = 0;
let passed = 0;
const ok = (cond, name, info) => {
  if (cond) passed++;
  else {
    failed++;
    console.log('  ✗ ' + name + (info ? '\n      ' + info : ''));
  }
};

(async () => {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lpic1-ui-'));
  const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server.js'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(port), DATA_DIR: dataDir }), stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(base + 'api/health');
      if (r.ok) break;
    } catch (e) {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text());
  });
  page.on('dialog', (d) => d.accept('Secret123!'));
  const visit = async (hash, wait = 150) => {
    await page.goto(base + hash);
    await page.waitForTimeout(wait);
  };
  const type = async (sel, cmd) => {
    await page.fill(sel + ' .term-input', cmd);
    await page.press(sel + ' .term-input', 'Enter');
    await page.waitForTimeout(200);
  };
  try {
    console.log('■ pages');
    await visit('', 800);
    ok(await page.$('#sidebar .nav-topic'), 'dashboard and sidebar render');
    const ids = await page.evaluate(() => LPIC.sorted().map((o) => o.id));
    ok(ids.length === 42, 'all 42 objectives loaded in the browser', ids.length);
    const fixed = ['#/quiz', '#/exam', '#/exam/history', '#/review', '#/weak', '#/cheat', '#/cheat/101-500', '#/cards', '#/cards?kind=q', '#/sims', '#/scenarios', '#/shell', '#/commands', '#/settings', '#/search?q=chmod'];
    // (#/shell opens the full-height terminal; leaving the page must close it again)
    for (const h of fixed) {
      await visit(h);
      ok((await page.textContent('#view')).trim().length > 50, `page ${h} renders`);
    }
    ok(!(await page.evaluate(() => document.body.classList.contains('drawer-open'))), 'terminal drawer closes after leaving the sandbox page');
    for (const t of Object.keys(await page.evaluate(() => LPIC.topics))) await visit('#/topic/' + t, 80);
    for (const id of ids) for (const tab of ['', '/quiz', '/sims', '/notes']) await visit('#/obj/' + id + tab, 60);
    for (const s of await page.evaluate(() => Object.keys(SIMS.registry))) await visit('#/sim/' + s, 80);
    for (const s of await page.evaluate(() => Object.keys(LPIC.scenarios))) await visit('#/scenario/' + s, 120);
    ok(errors.length === 0, 'no JavaScript errors while visiting all pages', errors.slice(0, 3).join(' | '));

    console.log('■ German summary and quiz feedback');
    await visit('#/obj/104.5', 300);
    ok(await page.$('.de-sum'), 'German summary shown on the objective page');
    await visit('#/obj/104.5/quiz', 300);
    if (await page.$('#fillIn')) await page.fill('#fillIn', 'x');
    else await page.click('.opt');
    await page.click('#qCheck');
    await page.waitForTimeout(150);
    ok(await page.$('.feedback'), 'quiz shows feedback');
    ok(await page.$('.feedback .de-ex'), 'quiz feedback includes the German explanation');

    console.log('■ calm layout: today, plan, step-by-step reading');
    await visit('#/plan', 300);
    const exam = new Date(Date.now() + 56 * 86400000).toISOString().slice(0, 10);
    await page.fill('input[name=d101]', exam);
    await page.fill('input[name=hours]', '10');
    await page.click('#planForm button[type=submit]');
    await page.waitForTimeout(400);
    ok((await page.$$('.plan-week')).length === 8, 'plan has one block per week (8 weeks)', (await page.$$('.plan-week')).length);
    ok(await page.$('.plan-week.cur'), 'current week is highlighted');
    await visit('', 400);
    ok(/Week 1 of 8/.test(await page.textContent('.today')), 'Today shows the plan week', (await page.textContent('.today')).slice(0, 80));
    ok(await page.$('.today a.btn-primary'), 'Today has exactly one main action button');
    ok((await page.$$('#sidebar > .nav-sec:first-child > a.nav-a')).length <= 6, 'sidebar shows at most 6 main entries');
    await visit('#/obj/103.4', 400);
    ok((await page.$$('.wsec:not([hidden])')).length === 1, 'objective page shows one wiki section at a time');
    const h1 = await page.evaluate(() => document.getElementById('view').scrollHeight);
    ok(h1 < 2200, 'objective page is short in step-by-step mode', h1);
    await page.click('#stepNext');
    ok(/2 \//.test(await page.textContent('#stepTitle')), 'Next moves to step 2');
    await page.click('#showAll');
    await page.waitForTimeout(300);
    ok((await page.$$('.wsec:not([hidden])')).length > 1, '"Show all" displays the whole page');
    await page.click('#focusOn');
    await page.waitForTimeout(300);

    console.log('■ calm mode');
    await visit('#/obj/103.4', 400);
    await page.click('#zenBtn');
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.body.classList.contains('zen')), 'calm mode switches on');
    ok(!(await page.isVisible('#sidebar')) && !(await page.isVisible('#searchInput')), 'sidebar and search are hidden in calm mode');
    ok(await page.isVisible('.wsec:not([hidden])') && (await page.isVisible('#stepNext')), 'the current wiki step stays visible');
    await visit('#/obj/103.4', 400);
    ok(await page.evaluate(() => document.body.classList.contains('zen')), 'calm mode survives a reload (stored in the settings)');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    ok(!(await page.evaluate(() => document.body.classList.contains('zen'))) && (await page.isVisible('#sidebar')), 'Esc leaves calm mode');
    await page.keyboard.press('z');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.body.classList.contains('zen')), 'Z toggles calm mode on');
    await page.keyboard.press('z');
    await page.waitForTimeout(150);

    console.log('■ lab and scenario');
    await visit('#/obj/104.6/lab', 500);
    for (const c of ['ln orig.txt orig-hard', 'ln -s orig.txt orig-sym']) await type('#labTerm', c);
    ok(/^2\//.test(await page.textContent('#labCount')), 'lab 104.6: two tasks completed', await page.textContent('#labCount'));
    await visit('#/scenario/network-down', 500);
    for (const c of ['ping -c 1 example.com', 'ping -c 1 192.168.56.1', 'ping -c 1 8.8.8.8', 'ip route', 'sudo ip route add default via 192.168.56.1']) await type('#labTerm', c);
    ok(/^4\//.test(await page.textContent('#labCount')), 'scenario network-down: four tasks completed', await page.textContent('#labCount'));

    console.log('■ exam');
    await visit('#/exam/101?n=10&min=5', 400);
    ok((await page.$$('#qnav button')).length === 10, 'short exam has exactly 10 questions', (await page.$$('#qnav button')).length);
    await page.click('#exSubmit');
    await page.waitForTimeout(400);
    ok(await page.$('.result-hero'), 'exam result is shown');
    await visit('#/exam/history', 300);
    ok(await page.$('svg.trend'), 'exam history shows the trend chart');

    console.log('■ sandbox terminal and persistence');
    await visit('#/shell', 500);
    await type('#drawerTerm', 'echo persisted > ~/ui-test.txt');
    await page.waitForTimeout(1800);
    const r = await fetch(base + 'api/kv/sandbox');
    ok(r.ok && /ui-test\.txt/.test(await r.text()), 'sandbox state is saved to the server database');
    ok(errors.length === 0, 'no JavaScript errors overall', errors.slice(0, 3).join(' | '));
  } catch (e) {
    ok(false, 'UI test run crashed', e.stack);
  } finally {
    await browser.close();
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  console.log(`\n${failed ? '✗' : '✓'} ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
