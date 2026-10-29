#!/usr/bin/env node
/* LPIC-1 Trainer — test suite (no dependencies): node tests/run.js
 *  1. shell simulator behaviour
 *  2. content validation (objectives, quiz answers)
 *  3. every lab is solvable with its reference solution
 *  4. every wiki example command runs without crashing the simulator */
'use strict';
const path = require('path');
global.window = global;
const ROOT = path.join(__dirname, '..', 'assets');
for (const f of ['vfs', 'world', 'parser', 'interp', 'builtins', 'hash', 'cmds-files', 'cmds-text', 'cmds-sys', 'cmds-net', 'man']) require(path.join(ROOT, 'js', 'shell', f + '.js'));
require(path.join(ROOT, 'js', 'labh.js'));
require(path.join(ROOT, 'data', 'topics.js'));
for (const f of ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110']) require(path.join(ROOT, 'data', f + '.js'));
for (const f of ['q101', 'q102', 'q103', 'q104', 'q105', 'q106', 'q107', 'q108', 'q109', 'q110']) if (require('fs').existsSync(path.join(ROOT, 'data', f + '.js'))) require(path.join(ROOT, 'data', f + '.js'));
for (const f of ['de-101', 'de-102']) if (require('fs').existsSync(path.join(ROOT, 'data', f + '.js'))) require(path.join(ROOT, 'data', f + '.js'));
require(path.join(ROOT, 'data', 'labs.js'));
require(path.join(ROOT, 'data', 'scenarios.js'));

const SIMS_IDS = {};
for (const m of require('fs').readFileSync(path.join(ROOT, 'js', 'sims.js'), 'utf8').matchAll(/^\s{4}id: '([\w-]+)'/gm)) SIMS_IDS[m[1]] = true;
const newShell = () => new SIM.Shell({ promptFn: () => 'Secret123!' });
let failed = 0;
let passed = 0;
const ok = (cond, name, info) => {
  if (cond) passed++;
  else {
    failed++;
    console.log('  ✗ ' + name + (info ? '\n      ' + String(info).replace(/\n/g, '\n      ') : ''));
  }
};
const section = (t) => console.log('\n■ ' + t);

/* ---------- 1. shell ---------- */
section('shell simulator');
{
  const sh = newShell();
  const out = (cmd) => sh.capture(cmd).out;
  const T = (cmd, expect) => {
    const r = sh.capture(cmd);
    const got = r.out + r.err;
    ok(expect instanceof RegExp ? expect.test(got) : got === expect, cmd, `got: ${JSON.stringify(got)}`);
  };
  T('pwd', '/home/student\n');
  T('echo $((3 * (2 + 4)))', '18\n');
  T('echo {a,b}{1,2}', 'a1 a2 b1 b2\n');
  T('x=hello; echo ${x^^} ${#x} ${x:1:3}', 'HELLO 5 ell\n');
  T("printf '%s-%03d\\n' ab 7", 'ab-007\n');
  T('echo one two three | awk \'{print $2}\'', 'two\n');
  T("echo 'a,b,c' | cut -d, -f2,3", 'b,c\n');
  T("printf 'b\\na\\nb\\n' | sort | uniq -c | sort -rn | head -1", /^\s+2 b\n$/);
  T("echo 'The lazy dog' | sed 's/lazy/quick/'", 'The quick dog\n');
  T("echo foo123 | grep -oE '[0-9]+'", '123\n');
  T('f() { echo "n=$#"; }; f a b c', 'n=3\n');
  T('for i in 1 2 3; do printf $i; done; echo', '123\n');
  T('i=0; while [ $i -lt 3 ]; do i=$((i+1)); done; echo $i', '3\n');
  T('case abc in a*) echo yes;; *) echo no;; esac', 'yes\n');
  T('[[ -f notes.txt && -d docs ]] && echo both', 'both\n');
  T('false || echo fallback', 'fallback\n');
  T('cat <<EOF\nhi $USER\nEOF', 'hi student\n');
  T('ls /nonexistent 2>/dev/null; echo $?', '2\n');
  T('cat /etc/shadow', /Permission denied/);
  T('sudo head -1 /etc/shadow', /^root:/);
  T('touch t1 && ln t1 t2 && stat -c %h t1', '2\n');
  T('ln -s /etc/hosts hl && readlink hl', '/etc/hosts\n');
  T('umask 027; touch u1; stat -c %a u1', '640\n');
  T('mkdir -p a/b/c && find a -type d | wc -l', '3\n');
  T('echo abc | md5sum', '0bee89b07a248e27c83fc3d5951213c1  -\n');
  T('echo abc | sha256sum', 'edeaaff3f1774ad2888673770c6d64097e391bc362d7d6fb34982ddf0efd18cb  -\n');
  T('tar czf d.tgz docs && tar tzf d.tgz | head -1', /^docs\/\n$/);
  T('sudo useradd -m -G developers tester && id -nG tester', /tester developers/);
  T('sudo chmod 4755 /tmp && stat -c %A /tmp', 'drwsr-xr-x\n');
  T('type cd', 'cd is a shell builtin\n');
  T('sleep 100 & jobs', /\[1\]\+\s+Running\s+sleep 100 &/);
  T('ip -br a | grep -c UP', '1\n');
  T('dig +short example.com', '93.184.215.14\n');
  T('crontab -l 2>&1; echo "5 * * * * true" | crontab -; crontab -l', /5 \* \* \* \* true/);
  T('systemctl is-active ssh', 'active\n');
  T('sudo systemctl stop ssh; systemctl is-active ssh', 'inactive\n');
  T('ls --help | head -1', 'Usage: ls [OPTION]... [FILE]...\n');
  T('sudo pvcreate /dev/sdb >/dev/null && sudo vgcreate vg /dev/sdb >/dev/null && sudo lvcreate -L 5G -n lv vg && sudo lvs | tail -1', /Logical volume "lv" created[\s\S]*lv\s+vg/);
  T('systemd-cat -t unit-test echo journal-ok; journalctl -t unit-test', /unit-test: journal-ok/);
  T('getent ahosts localhost | head -1', /^127\.0\.0\.1\s+STREAM localhost/);
  ok(out('history | tail -1') !== undefined, 'history works');
  {
    // after "rm -rf /*" every program is gone, but reset-sandbox (a builtin) must still work
    const broken = newShell();
    let ev = null;
    broken.onEvent = (t) => (ev = t);
    broken.capture('sudo rm -rf /*');
    const r = broken.capture('ls');
    ok(r.status === 127 && /reset-sandbox/.test(r.err), 'after rm -rf /* a hint points to reset-sandbox', r.err);
    broken.capture('reset-sandbox');
    ok(ev === 'resetSandbox', 'reset-sandbox works after rm -rf /*');
  }
}

/* ---------- 2. content ---------- */
section('content');
{
  const objs = LPIC.sorted();
  const expected = ['101.1', '101.2', '101.3', '102.1', '102.2', '102.3', '102.4', '102.5', '102.6', '103.1', '103.2', '103.3', '103.4', '103.5', '103.6', '103.7', '103.8', '104.1', '104.2', '104.3', '104.5', '104.6', '104.7', '105.1', '105.2', '106.1', '106.2', '106.3', '107.1', '107.2', '107.3', '108.1', '108.2', '108.3', '108.4', '109.1', '109.2', '109.3', '109.4', '110.1', '110.2', '110.3'];
  ok(JSON.stringify(objs.map((o) => o.id)) === JSON.stringify(expected), 'all LPIC-1 v5.0 objectives present', objs.map((o) => o.id).join(' '));
  const w = (e) => LPIC.ofExam(e).reduce((a, o) => a + o.weight, 0);
  ok(w('101') === 60, 'exam 101 weights sum to 60', w('101'));
  ok(w('102') === 60, 'exam 102 weights sum to 60', w('102'));
  const ids = new Set();
  for (const o of objs) {
    ok(o.title && o.desc && o.wiki && o.wiki.length > 1500, `${o.id} has title, description and wiki`);
    ok(Array.isArray(o.terms) && o.terms.length > 0, `${o.id} lists terms`);
    ok(o.quiz.length >= 7, `${o.id} has at least 7 questions`, o.quiz.length);
    for (const s of o.sims || []) ok(!!SIMS_IDS[s], `${o.id} references existing simulation ${s}`);
    for (const q of o.quiz) {
      ok(!ids.has(q.id), `unique question id ${q.id}`);
      ids.add(q.id);
      ok(typeof q.q === 'string' && q.q.length > 8, `${q.id} has question text`);
      if (q.fill) {
        ok(Array.isArray(q.fill) && q.fill.length > 0 && q.fill.every((x) => typeof x === 'string' && x.trim()), `${q.id} fill answers`);
      } else {
        ok(Array.isArray(q.o) && q.o.length >= 2, `${q.id} has options`);
        const a = [].concat(q.a);
        ok(a.length > 0 && a.every((i) => Number.isInteger(i) && i >= 0 && i < q.o.length), `${q.id} answer index in range`, JSON.stringify(q.a));
        ok(new Set(q.o).size === q.o.length, `${q.id} options are distinct`);
        if (/choose (two|three)/i.test(q.q)) ok(a.length === (/two/i.test(q.q) ? 2 : 3), `${q.id} "choose N" matches answer count`);
      }
    }
    // wiki: balanced code spans and fences
    const src = o.wiki;
    ok((src.match(/^~~~/gm) || []).length % 2 === 0, `${o.id} wiki has balanced ~~~ fences`);
    ok((src.match(/\{\{/g) || []).length === (src.match(/\}\}/g) || []).length, `${o.id} wiki has balanced {{ }}`);
  }
  for (const q of LPIC.allQuestions()) ok(typeof q.de === 'string' && q.de.length > 10, `${q.id} has a German explanation`);
  for (const o of objs) ok(typeof LPIC.deSummary[o.id] === 'string' && LPIC.deSummary[o.id].length > 100, `${o.id} has a German summary`);
  const seenText = new Map();
  for (const q of LPIC.allQuestions()) {
    const k = q.q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    ok(!seenText.has(k), `question text is unique: ${q.id}`, 'same as ' + seenText.get(k));
    seenText.set(k, q.id);
  }
  console.log(`  ${objs.length} objectives, ${ids.size} questions, ${Object.keys(LPIC.labs).length} labs`);
}

/* ---------- 3. labs ---------- */
section('labs (reference solutions)');
for (const [id, lab] of Object.entries(LPIC.labs).concat(Object.entries(LPIC.scenarios).map(([k, v]) => ['scenario:' + k, v]))) {
  if (id.startsWith('scenario:')) ok(lab.obj.every((x) => LPIC.byId[x]) && lab.story, `${id} has a story and valid objectives`);
  else ok(!!LPIC.byId[id], `lab ${id} belongs to an objective`);
  const sh = newShell();
  if (lab.setup) lab.setup(sh, LABH);
  const log = [];
  let status = 0;
  const done = new Set();
  const evaluate = (last) => {
    const ctx = { last, status, log, used: (re) => log.some((c) => re.test(c)) };
    lab.tasks.forEach((t, i) => {
      if (done.has(i)) return;
      let r = false;
      try {
        r = SIM.asRoot(sh, () => !!t.check(sh, ctx, LABH));
      } catch (e) {
        r = false;
      }
      if (r) done.add(i);
    });
  };
  evaluate('');
  ok(done.size === 0, `lab ${id}: no task is done before starting`, [...done].map((i) => lab.tasks[i].t).join(' | '));
  done.clear();
  lab.tasks.forEach((t, i) => {
    ok(Array.isArray(t.sol) && t.sol.length, `lab ${id} task ${i + 1} has a reference solution`);
    for (const cmd of t.sol || []) {
      let r;
      try {
        r = sh.capture(cmd);
      } catch (e) {
        r = { status: 99, out: '', err: e.stack };
      }
      status = r.status;
      log.push(cmd);
      evaluate(cmd);
      if (r.status === 99) ok(false, `lab ${id}: "${cmd}" crashed`, r.err);
    }
    ok(done.has(i), `lab ${id} task ${i + 1} solved by its solution: ${t.t.slice(0, 70)}`, 'commands: ' + (t.sol || []).join(' ; '));
  });
}

/* ---------- 4. wiki examples ---------- */
section('wiki example commands');
{
  const asUser = (p, cmd) => {
    if (p !== '#' || /^(sudo|su|cd|export|umask|source|\.|exit|ulimit|set)\b/.test(cmd)) return cmd;
    if (/[|<>;&]/.test(cmd)) return "sudo sh -c '" + cmd.replace(/'/g, "'\\''") + "'";
    return 'sudo ' + cmd;
  };
  let n = 0;
  let notFound = 0;
  for (const o of LPIC.sorted()) {
    const sh = newShell();
    const src = o.wiki.replace(/\$\\\{/g, '${').replace(/\\`/g, '`');
    const blocks = src.split('~~~');
    for (let i = 1; i < blocks.length; i += 2) {
      const lines = blocks[i].split('\n');
      if (lines[0].trim() !== 'console') continue;
      for (const l of lines.slice(1)) {
        const m = /^\s*(\$|#) (.*)$/.exec(l);
        if (!m) continue;
        const cmd = asUser(m[1], m[2].replace(/\s+#\s.*$/, ''));
        n++;
        let errText = '';
        let r;
        const origErr = console.error;
        try {
          r = sh.capture(cmd);
        } catch (e) {
          ok(false, `${o.id}: "${cmd}" threw`, e.stack.split('\n').slice(0, 4).join('\n'));
          continue;
        } finally {
          console.error = origErr;
        }
        errText = (r.err || '').replace(/\x1b\[[0-9;]*m/g, '');
        ok(!/TypeError|ReferenceError|is not a function|Cannot read prop|undefined is not/.test(errText + r.out), `${o.id}: "${cmd}" has no internal error`, errText + r.out);
        if (r.status === 127 && !/^(hi|myprog|!!|\.\/)/.test(cmd.replace(/^\S+=\S+\s+/, '')) && !/xclock|setxkbmap/.test(cmd)) notFound++;
      }
    }
  }
  ok(notFound <= 6, `wiki commands found by the simulator (${notFound} unknown)`);
  console.log(`  ${n} example commands executed`);
}

console.log(`\n${failed ? '✗' : '✓'} ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
