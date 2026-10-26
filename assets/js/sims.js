/* LPIC-1 Trainer — interactive simulations. */
(function (G) {
  'use strict';
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (s, el) => el.querySelector(s);
  const $$ = (s, el) => [...el.querySelectorAll(s)];
  const registry = {};
  const def = (o) => (registry[o.id] = o);
  G.SIMS = { registry };

  /* ------------------------------------------------------------------ */
  def({
    id: 'chmod',
    icon: '🔐',
    title: 'Permission calculator (chmod)',
    obj: ['104.5'],
    desc: 'Toggle read/write/execute bits and SUID/SGID/sticky — see the octal value, the symbolic string, ls -l output and the matching chmod commands. Includes a challenge mode.',
    render(el, ctx) {
      el.innerHTML = `<div class="grid grid-2"><div class="card"><div class="perm-grid" id="pg"></div>
        <div class="row" style="margin-top:1rem"><label class="muted">Special bits:</label>
          <label class="btn btn-sm"><input type="checkbox" data-b="2048"> SUID (4)</label>
          <label class="btn btn-sm"><input type="checkbox" data-b="1024"> SGID (2)</label>
          <label class="btn btn-sm"><input type="checkbox" data-b="512"> sticky (1)</label></div>
        <div class="row" style="margin-top:.8rem"><label class="muted">Type:</label><select class="inp" id="ty"><option value="f">regular file</option><option value="d">directory</option></select></div></div>
        <div class="card"><div class="field"><label>Octal (type to change)</label><input class="inp mono big-mono" id="oct" maxlength="4" style="width:9ch"></div>
        <div class="field"><label>ls -l</label><div class="big-mono" id="sym"></div></div>
        <div class="field"><label>Commands</label><div id="cmds" style="font-family:var(--mono);font-size:.9rem"></div></div></div></div>
        <div class="card" style="margin-top:1rem"><div class="row"><b>What the bits mean here</b></div><div id="explain" style="font-size:.92rem"></div></div>
        <div class="card" style="margin-top:1rem"><div class="row"><b>🎯 Challenge</b><span class="spacer"></span><span class="muted" id="score">0 / 0</span></div><p id="task" style="font-size:1.05rem"></p><div class="row"><button class="btn btn-primary" id="chk">Check</button><button class="btn" id="newt">New task</button></div><div id="res"></div></div>`;
      let mode = 0o644;
      const who = ['u', 'g', 'o'];
      const names = { u: 'user (owner)', g: 'group', o: 'others' };
      const pg = $('#pg', el);
      pg.innerHTML = '<span></span><b style="text-align:center">r (4)</b><b style="text-align:center">w (2)</b><b style="text-align:center">x (1)</b>' + who.map((w, i) => `<b>${names[w]}</b>` + [4, 2, 1].map((b) => `<label data-bit="${b << (6 - 3 * i)}"><input type="checkbox">${{ 4: 'r', 2: 'w', 1: 'x' }[b]}</label>`).join('')).join('');
      const sym = (m, t) => SIM.modeString({ t, mode: m });
      const update = () => {
        const t = $('#ty', el).value;
        $$('label[data-bit]', pg).forEach((l) => l.classList.toggle('on', !!(mode & +l.dataset.bit)));
        $$('input[data-b]', el).forEach((c) => (c.checked = !!(mode & +c.dataset.b)));
        if (document.activeElement !== $('#oct', el)) $('#oct', el).value = (mode & 0o7000 ? mode.toString(8).padStart(4, '0') : mode.toString(8).padStart(3, '0'));
        $('#sym', el).textContent = sym(mode, t);
        const parts = who.map((w, i) => {
          const v = (mode >> (6 - 3 * i)) & 7;
          let s = (v & 4 ? 'r' : '') + (v & 2 ? 'w' : '') + (v & 1 ? 'x' : '');
          if (w === 'u' && mode & 0o4000) s += 's';
          if (w === 'g' && mode & 0o2000) s += 's';
          if (w === 'o' && mode & 0o1000) s += 't';
          return `${w}=${s}`;
        });
        const f = t === 'd' ? 'mydir' : 'file.txt';
        $('#cmds', el).innerHTML = `<div>chmod ${$('#oct', el).value} ${f}</div><div>chmod ${parts.join(',')} ${f}</div><div class="muted" style="margin-top:.3rem">umask that creates this ${t === 'd' ? 'directory' : 'file'} by default: ${t === 'd' ? (~mode & 0o777).toString(8).padStart(4, '0') : (mode & 0o111 ? 'not possible (new files never get x)' : (0o666 & ~mode).toString(8).padStart(4, '0'))}</div>`;
        const e = [];
        const r = (b) => !!(mode & b);
        if (t === 'f') {
          e.push(`Owner can ${[r(0o400) && 'read', r(0o200) && 'modify', r(0o100) && 'execute'].filter(Boolean).join(', ') || 'do nothing'}.`);
          e.push(`Group members can ${[r(0o40) && 'read', r(0o20) && 'modify', r(0o10) && 'execute'].filter(Boolean).join(', ') || 'do nothing'}.`);
          e.push(`Everybody else can ${[r(0o4) && 'read', r(0o2) && 'modify', r(0o1) && 'execute'].filter(Boolean).join(', ') || 'do nothing'}.`);
          if (r(0o4000)) e.push(`<b>SUID</b>: the program runs with the <i>owner's</i> privileges (like <code>/usr/bin/passwd</code>).${r(0o100) ? '' : ' Shown as capital <b>S</b> because owner-x is missing — SUID without x is useless.'}`);
          if (r(0o2000)) e.push(`<b>SGID</b>: the program runs with the file's <i>group</i> privileges.`);
          if (r(0o1000)) e.push(`The sticky bit has no effect on regular files on Linux.`);
        } else {
          e.push(`r = list names (ls), w = create/delete/rename entries, x = enter (cd) and access entries. Without x, r alone shows names but no details.`);
          if (r(0o2000)) e.push(`<b>SGID directory</b>: new files inherit the directory's group — ideal for shared team folders.`);
          if (r(0o1000)) e.push(`<b>Sticky bit</b>: in a writable directory users may only delete their <i>own</i> files (like <code>/tmp</code>, mode 1777).`);
          if (r(0o4000)) e.push(`SUID on a directory is ignored by Linux.`);
          if (r(0o2) && !r(0o1000)) e.push(`⚠️ world-writable without sticky bit: anyone can delete anyone's files here.`);
        }
        $('#explain', el).innerHTML = '<ul>' + e.map((x) => `<li>${x}</li>`).join('') + '</ul>';
      };
      pg.addEventListener('click', (e) => {
        const l = e.target.closest('label[data-bit]');
        if (!l) return;
        e.preventDefault();
        mode ^= +l.dataset.bit;
        update();
      });
      $$('input[data-b]', el).forEach((c) =>
        c.addEventListener('change', () => {
          mode = c.checked ? mode | +c.dataset.b : mode & ~+c.dataset.b;
          update();
        })
      );
      $('#ty', el).onchange = update;
      $('#oct', el).addEventListener('input', (e) => {
        const v = e.target.value;
        if (/^[0-7]{3,4}$/.test(v)) {
          mode = parseInt(v, 8);
          update();
        }
      });
      // challenge
      let target = 0;
      let kind = 0;
      let n = 0;
      let ok = 0;
      const tasks = [
        () => {
          target = [0o755, 0o644, 0o600, 0o700, 0o750, 0o640, 0o711, 0o444, 0o664, 0o775][Math.floor(Math.random() * 10)];
          return `Set the permissions to <code>${SIM.modeString({ t: 'f', mode: target })}</code>`;
        },
        () => {
          target = [0o4755, 0o2755, 0o1777, 0o2770, 0o6755, 0o1755][Math.floor(Math.random() * 6)];
          return `Set the mode to octal <code>${target.toString(8)}</code> (including the special bit)`;
        },
        () => {
          const opts = [
            [0o750, 'Owner: everything; group: read and enter/execute; others: nothing'],
            [0o640, 'Owner: read+write; group: read; others: nothing'],
            [0o1777, 'A directory where everyone may create files but only delete their own'],
            [0o2775, 'A shared group directory where new files inherit the group (rwx for owner and group, r-x others)'],
            [0o4755, 'A program that runs as its owner, executable by everyone, writable only by the owner'],
            [0o600, 'A private key file: only the owner may read and write'],
          ];
          const p = opts[Math.floor(Math.random() * opts.length)];
          target = p[0];
          return p[1];
        },
      ];
      const newTask = () => {
        kind = Math.floor(Math.random() * tasks.length);
        $('#task', el).innerHTML = tasks[kind]();
        $('#res', el).innerHTML = '';
      };
      $('#newt', el).onclick = newTask;
      $('#chk', el).onclick = () => {
        n++;
        const good = (mode & 0o7777) === target;
        if (good) ok++;
        $('#score', el).textContent = `${ok} / ${n}`;
        $('#res', el).innerHTML = good ? '<div class="feedback ok"><b>✓ Correct!</b></div>' : `<div class="feedback no"><b>✗ Not yet.</b> Expected <code>${target.toString(8).padStart(4, '0')}</code> = <code>${SIM.modeString({ t: 'f', mode: target })}</code>, you have <code>${(mode & 0o7777).toString(8).padStart(4, '0')}</code>.</div>`;
        if (good) setTimeout(newTask, 900);
      };
      newTask();
      update();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'umask',
    icon: '🎭',
    title: 'umask calculator',
    obj: ['104.5'],
    desc: 'See how the umask removes bits from the default 666 (files) and 777 (directories).',
    render(el) {
      el.innerHTML = `<div class="card" style="max-width:760px"><div class="row"><div class="field"><label>umask</label><input class="inp mono big-mono" id="um" value="0022" maxlength="4" style="width:8ch"></div><div class="chips">${['0022', '0002', '0027', '0077', '0007', '0277'].map((x) => `<span class="chip" data-u="${x}">${x}</span>`).join('')}</div></div><div id="out"></div></div>
        <div class="card" style="max-width:760px;margin-top:1rem"><b>How it works</b><p style="font-size:.92rem">New files start from <code>666</code> (rw for everyone — the kernel never sets <b>x</b> on new regular files), new directories from <code>777</code>. Every bit that is <b>set in the umask is removed</b>: <code>result = default AND NOT umask</code>. It is <i>not</i> a subtraction: with umask 0033 a file gets 644 (not 633). Set it with <code>umask 027</code> or symbolically <code>umask u=rwx,g=rx,o=</code>; make it permanent in <code>~/.bashrc</code>, <code>~/.profile</code> or system-wide in <code>/etc/profile</code> / <code>/etc/login.defs</code> (UMASK).</p></div>`;
      const show = () => {
        const v = $('#um', el).value;
        if (!/^[0-7]{3,4}$/.test(v)) return;
        const u = parseInt(v, 8) & 0o777;
        const f = 0o666 & ~u;
        const d = 0o777 & ~u;
        const bin = (x) => x.toString(2).padStart(9, '0').replace(/(...)/g, '$1 ').trim();
        $('#out', el).innerHTML = `<div class="tbl-wrap"><table><tr><th></th><th>File</th><th>Directory</th></tr>
          <tr><td>default</td><td><code>666</code> <span class="muted">${bin(0o666)}</span></td><td><code>777</code> <span class="muted">${bin(0o777)}</span></td></tr>
          <tr><td>umask</td><td><code>${u.toString(8).padStart(3, '0')}</code> <span class="muted">${bin(u)}</span></td><td><code>${u.toString(8).padStart(3, '0')}</code> <span class="muted">${bin(u)}</span></td></tr>
          <tr><td><b>result</b></td><td><b><code>${f.toString(8).padStart(3, '0')}</code></b> <span class="muted">${bin(f)}</span><br><code>${SIM.modeString({ t: 'f', mode: f })}</code></td><td><b><code>${d.toString(8).padStart(3, '0')}</code></b> <span class="muted">${bin(d)}</span><br><code>${SIM.modeString({ t: 'd', mode: d })}</code></td></tr></table></div>
          <p class="muted">Symbolic: <code>umask -S</code> → <code>u=${['r', 'w', 'x'].filter((x, i) => !(u & (0o400 >> i))).join('')},g=${['r', 'w', 'x'].filter((x, i) => !(u & (0o40 >> i))).join('')},o=${['r', 'w', 'x'].filter((x, i) => !(u & (0o4 >> i))).join('')}</code></p>`;
      };
      $('#um', el).addEventListener('input', show);
      $$('[data-u]', el).forEach((c) =>
        c.addEventListener('click', () => {
          $('#um', el).value = c.dataset.u;
          show();
        })
      );
      show();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'regex',
    icon: '🔎',
    title: 'Regex tester (grep / sed)',
    obj: ['103.7', '103.2'],
    desc: 'Test basic (BRE) and extended (ERE) regular expressions against sample text with live highlighting — exactly the dialects grep, egrep and sed use.',
    render(el, ctx) {
      const sample = `root:x:0:0:root:/root:/bin/bash
student:x:1000:1000:LPIC Student,,,:/home/student:/bin/bash
bob:x:1002:1002:Bob Builder:/home/bob:/bin/zsh
192.168.56.1 - - "GET /index.html HTTP/1.1" 200 5123
10.0.0.7 - - "POST /login HTTP/1.1" 401 97
Mail: alice@example.com, bob.builder@mail.example.org
color colour colouur
2026-10-26 error: disk /dev/sda2 is 91% full
# a comment line

The year 1999 and 2026; phone +49 30 1234567`;
      el.innerHTML = `<div class="card"><div class="row"><div class="field" style="flex:1;min-width:240px"><label>Pattern</label><input class="inp mono" id="pat" value="^[a-z]+:x:[0-9]{4}"></div>
        <div class="field"><label>Dialect</label><select class="inp" id="dia"><option value="E">ERE (grep -E, egrep, sed -E)</option><option value="G">BRE (grep, sed)</option><option value="F">fixed (grep -F)</option></select></div></div>
        <div class="row"><label><input type="checkbox" id="ci"> -i ignore case</label><label><input type="checkbox" id="inv"> -v invert</label><label><input type="checkbox" id="wd"> -w words</label><label><input type="checkbox" id="only"> -o only matching</label></div>
        <div class="field"><label>Command</label><code id="cmd" style="font-size:.95rem"></code></div><div id="err"></div>
        <div class="field"><label>Result</label><div class="regex-out" id="out"></div></div>
        <details><summary class="muted">Edit sample text</summary><div class="field"><textarea id="txt">${esc(sample)}</textarea></div></details></div>
        <div class="grid grid-2" style="margin-top:1rem"><div class="card"><b>Try these</b><div class="chips" style="margin-top:.5rem" id="ex"></div></div>
        <div class="card cheat"><b>Cheat sheet</b><table><tr><td>^ $</td><td>start / end of line</td></tr><tr><td>.</td><td>any single character</td></tr><tr><td>[abc] [^abc] [a-z]</td><td>character class / negated / range</td></tr><tr><td>[[:digit:]] [[:space:]]</td><td>POSIX classes (inside brackets!)</td></tr><tr><td>*</td><td>0 or more (BRE+ERE)</td></tr><tr><td>+ ? {n,m} | ( )</td><td>ERE: 1+, 0/1, range, or, group — in BRE write \\+ \\? \\{n,m\\} \\| \\( \\)</td></tr><tr><td>\\< \\> \\b</td><td>word boundaries</td></tr><tr><td>\\1</td><td>back-reference to group 1</td></tr></table></div></div>`;
      const ex = [
        ['^#', 'G', 'comment lines'],
        ['^$', 'G', 'empty lines'],
        ['bash$', 'G', 'ends with bash'],
        ['colou?r', 'E', 'optional u (ERE)'],
        ['colou\\?r', 'G', 'same in BRE'],
        ['[0-9]{1,3}(\\.[0-9]{1,3}){3}', 'E', 'IPv4 address'],
        ['[[:alnum:]._-]+@[[:alnum:].-]+', 'E', 'e-mail'],
        [' (200|401) ', 'E', 'HTTP status'],
        ['\\<bob\\>', 'G', 'whole word bob'],
        ['([0-9])\\1', 'E', 'doubled digit'],
        ['/home/[^:]*', 'G', 'home dirs'],
        ['error|fail', 'E', 'alternation'],
      ];
      $('#ex', el).innerHTML = ex.map((x, i) => `<span class="chip" data-i="${i}" title="${esc(x[2])}">${esc(x[0])}</span>`).join('');
      const run = () => {
        const pat = $('#pat', el).value;
        const d = $('#dia', el).value;
        const flags = (d === 'E' ? 'E' : d === 'F' ? 'F' : '') + ($('#ci', el).checked ? 'i' : '') + ($('#inv', el).checked ? 'v' : '') + ($('#wd', el).checked ? 'w' : '') + ($('#only', el).checked ? 'o' : '');
        $('#cmd', el).textContent = `grep ${flags ? '-' + flags + ' ' : ''}'${pat}' file.txt`;
        let re;
        try {
          re = SIM.mkRegex(pat, { ere: d === 'E', fixed: d === 'F', icase: $('#ci', el).checked, word: $('#wd', el).checked, g: true });
          $('#err', el).innerHTML = '';
        } catch (e) {
          $('#err', el).innerHTML = `<div class="feedback no">grep: ${esc(e.message)}</div>`;
          return;
        }
        const lines = $('#txt', el).value.split('\n');
        let n = 0;
        const out = lines
          .map((l) => {
            re.lastIndex = 0;
            const hit = pat !== '' && re.test(l);
            const show = hit !== $('#inv', el).checked;
            if (show) n++;
            if (!show) return `<div class="nomatch">${esc(l) || '&nbsp;'}</div>`;
            if ($('#inv', el).checked) return `<div>${esc(l) || '&nbsp;'}</div>`;
            re.lastIndex = 0;
            if ($('#only', el).checked) {
              const ms = [];
              let m;
              while ((m = re.exec(l))) {
                if (!m[0]) {
                  re.lastIndex++;
                  continue;
                }
                ms.push(`<mark>${esc(m[0])}</mark>`);
              }
              return `<div>${ms.join('<br>')}</div>`;
            }
            let s = '';
            let last = 0;
            let m;
            while ((m = re.exec(l))) {
              if (!m[0]) {
                re.lastIndex++;
                continue;
              }
              s += esc(l.slice(last, m.index)) + `<mark>${esc(m[0])}</mark>`;
              last = m.index + m[0].length;
            }
            return `<div>${s + esc(l.slice(last)) || '&nbsp;'}</div>`;
          })
          .join('');
        $('#out', el).innerHTML = out + `<div class="muted" style="margin-top:.5rem;font-family:var(--sans)">${n} line(s) printed — grep exit status ${n ? 0 : 1}</div>`;
      };
      $$('input,select,textarea', el).forEach((x) => x.addEventListener('input', run));
      $$('[data-i]', el).forEach((c) =>
        c.addEventListener('click', () => {
          const x = ex[+c.dataset.i];
          $('#pat', el).value = x[0];
          $('#dia', el).value = x[1];
          run();
        })
      );
      run();
    },
  });

  /* ------------------------------------------------------------------ */
  function cronField(spec, min, max, names) {
    const set = new Set();
    for (let part of spec.toLowerCase().split(',')) {
      let step = 1;
      const sm = /^(.*)\/(\d+)$/.exec(part);
      if (sm) {
        part = sm[1];
        step = +sm[2];
        if (!step) throw new Error('step 0');
      }
      let a;
      let b;
      const nm = (x) => {
        if (names && names.indexOf(x) >= 0) return names.indexOf(x) + (min === 1 ? 1 : 0);
        if (!/^\d+$/.test(x)) throw new Error(`bad value "${x}"`);
        return +x;
      };
      if (part === '*') {
        a = min;
        b = max;
      } else if (part.indexOf('-') > 0) {
        [a, b] = part.split('-').map(nm);
      } else {
        a = nm(part);
        b = sm ? max : a;
      }
      if (a < min || b > max || a > b) throw new Error(`value out of range ${min}-${max}`);
      for (let x = a; x <= b; x += step) set.add(x);
    }
    return set;
  }
  const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  function parseCron(expr) {
    const sc = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
    const e = sc[expr.trim()] || expr.trim();
    if (expr.trim() === '@reboot') return { reboot: true };
    const f = e.split(/\s+/);
    if (f.length !== 5) throw new Error('need exactly 5 fields: minute hour day-of-month month day-of-week');
    const dow = cronField(f[4].replace(/\b7\b/g, '0'), 0, 7, DOW);
    if (dow.has(7)) dow.add(0);
    return { f, min: cronField(f[0], 0, 59), hour: cronField(f[1], 0, 23), dom: cronField(f[2], 1, 31), mon: cronField(f[3], 1, 12, MON), dow, domStar: f[2] === '*', dowStar: f[4] === '*' };
  }
  function cronNext(c, from, n) {
    const res = [];
    const d = new Date(from);
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);
    for (let i = 0; i < 600000 && res.length < n; i++) {
      const domOk = c.dom.has(d.getDate());
      const dowOk = c.dow.has(d.getDay());
      const dayOk = c.domStar || c.dowStar ? domOk && dowOk : domOk || dowOk;
      if (c.mon.has(d.getMonth() + 1) && dayOk && c.hour.has(d.getHours()) && c.min.has(d.getMinutes())) res.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1);
    }
    return res;
  }
  function describeCron(c) {
    if (c.reboot) return 'once, at system startup';
    const [mi, h, dom, mon, dow] = c.f;
    const list = (s, names) =>
      s
        .split(',')
        .map((p) => {
          const m = /^(.*)\/(\d+)$/.exec(p);
          if (m) return `every ${m[2]}${m[1] === '*' ? '' : ' within ' + m[1]}`;
          if (names && /^\d+(-\d+)?$/.test(p)) return p.split('-').map((x) => names[+x % names.length] || x).join('–');
          return p;
        })
        .join(', ');
    const DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MN = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let t;
    if (/^\d+$/.test(mi) && /^\d+$/.test(h)) t = `at ${h.padStart(2, '0')}:${mi.padStart(2, '0')}`;
    else t = `${mi === '*' ? 'every minute' : /^\*\/\d+$/.test(mi) ? `every ${mi.slice(2)} minutes` : `at minute ${list(mi)}`}${h === '*' ? '' : /^\*\/\d+$/.test(h) ? `, every ${h.slice(2)} hours` : ` past hour ${list(h)}`}`;
    let d = '';
    if (dom !== '*') d += ` on day-of-month ${list(dom)}`;
    if (dow !== '*') d += `${dom !== '*' ? ' or' : ''} on ${list(dow.replace(/\b7\b/g, '0'), DN)}`;
    if (mon !== '*') d += ` in ${list(mon, MN)}`;
    return t + (d || ', every day');
  }
  G.SIMS.cron = { parseCron, cronNext, describeCron };
  def({
    id: 'cron',
    icon: '⏰',
    title: 'Cron expression builder',
    obj: ['107.2'],
    desc: 'Write a crontab schedule, read it in plain English and see the next run times. Includes the classic exam traps.',
    render(el, ctx) {
      el.innerHTML = `<div class="card"><div class="row" style="align-items:flex-end">${['minute', 'hour', 'day of month', 'month', 'day of week']
        .map((l, i) => `<div class="field" style="width:120px"><label>${l}</label><input class="inp mono" data-f="${i}" value="${['30', '2', '*', '*', '1-5'][i]}"></div>`)
        .join('')}<div class="field" style="flex:1;min-width:180px"><label>command</label><input class="inp mono" id="cmd" value="/usr/local/bin/backup.sh"></div></div>
        <div class="field"><label>crontab line</label><input class="inp mono" id="line"></div><div id="desc" style="font-size:1.05rem;margin:.5rem 0"></div><div id="next"></div>
        <div class="chips" style="margin-top:.8rem">${[
          ['*/15 * * * *', 'every 15 min'],
          ['0 * * * *', 'hourly'],
          ['0 0 * * 0', 'weekly (Sun)'],
          ['30 6 1 * *', 'monthly'],
          ['0 9-17 * * 1-5', 'office hours'],
          ['0 22 * * fri', 'Friday 22:00'],
          ['0 0 1,15 * *', '1st & 15th'],
          ['5 4 * * sun', '04:05 Sundays'],
          ['@reboot', 'at boot'],
          ['0 0 13 * 5', 'trap: 13th OR Friday'],
        ]
          .map((p) => `<span class="chip" data-p="${p[0]}" title="${p[1]}">${p[0]}</span>`)
          .join('')}</div></div>
        <div class="card" style="margin-top:1rem"><b>Remember</b><ul style="font-size:.92rem"><li>Fields: <code>minute(0-59) hour(0-23) day-of-month(1-31) month(1-12|jan-dec) day-of-week(0-7|sun-sat, 0 and 7 = Sunday)</code>.</li><li>If <b>both</b> day-of-month and day-of-week are restricted, the job runs when <b>either</b> matches.</li><li>User crontabs (<code>crontab -e</code>, stored in <code>/var/spool/cron/crontabs/USER</code>) have 5 time fields + command. <code>/etc/crontab</code> and <code>/etc/cron.d/*</code> have an additional <b>user</b> field.</li><li>cron mails the output to the owner — redirect it: <code>&gt;/dev/null 2&gt;&amp;1</code>. <code>%</code> must be escaped as <code>\\%</code>.</li><li>Access control: <code>/etc/cron.allow</code> (if it exists only listed users), otherwise <code>/etc/cron.deny</code>.</li></ul><button class="btn btn-sm" id="inst">Install this line in the sandbox (crontab)</button></div>`;
      const inputs = $$('[data-f]', el);
      const fromFields = () => {
        $('#line', el).value = inputs.map((i) => i.value.trim() || '*').join(' ') + ' ' + $('#cmd', el).value;
        show();
      };
      const show = () => {
        const parts = $('#line', el).value.trim().split(/\s+/);
        const isAt = parts[0].startsWith('@');
        const expr = isAt ? parts[0] : parts.slice(0, 5).join(' ');
        try {
          const c = parseCron(expr);
          $('#desc', el).innerHTML = `🗓 <b>Runs ${esc(describeCron(c))}</b>`;
          if (c.reboot) $('#next', el).innerHTML = '';
          else {
            const nx = cronNext(c, Date.now(), 6);
            $('#next', el).innerHTML = '<span class="muted">Next runs:</span><ol style="font-family:var(--mono);font-size:.88rem">' + nx.map((d) => `<li>${d.toLocaleString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</li>`).join('') + '</ol>';
          }
        } catch (e) {
          $('#desc', el).innerHTML = `<span class="badge bad">invalid</span> ${esc(e.message)}`;
          $('#next', el).innerHTML = '';
        }
      };
      inputs.forEach((i) => i.addEventListener('input', fromFields));
      $('#cmd', el).addEventListener('input', fromFields);
      $('#line', el).addEventListener('input', () => {
        const p = $('#line', el).value.trim().split(/\s+/);
        if (!p[0].startsWith('@')) inputs.forEach((inp, i) => (inp.value = p[i] || ''));
        show();
      });
      $$('[data-p]', el).forEach((c) =>
        c.addEventListener('click', () => {
          const p = c.dataset.p;
          if (p.startsWith('@')) {
            $('#line', el).value = p + ' ' + $('#cmd', el).value;
            show();
          } else {
            p.split(' ').forEach((v, i) => (inputs[i].value = v));
            fromFields();
          }
        })
      );
      $('#inst', el).onclick = () => ctx.runInSandbox([`(crontab -l 2>/dev/null; echo '${$('#line', el).value.replace(/'/g, '')}') | crontab -`, 'crontab -l']);
      fromFields();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'boot',
    icon: '🚀',
    title: 'Boot sequence explorer',
    obj: ['101.2', '101.3', '102.2'],
    desc: 'Step from power-on to the login prompt — BIOS/MBR vs. UEFI/ESP, GRUB, kernel + initramfs, SysV init vs. systemd — with the files and commands of each stage.',
    render(el) {
      el.innerHTML = `<div class="card"><div class="row"><label class="muted">Firmware</label><select class="inp" id="fw"><option value="uefi">UEFI + GPT</option><option value="bios">BIOS + MBR</option></select><label class="muted">Init system</label><select class="inp" id="init"><option value="systemd">systemd</option><option value="sysv">SysV init</option></select><span class="spacer"></span><button class="btn" id="prev">←</button><button class="btn btn-primary" id="next">Next stage →</button></div>
        <div class="boot-steps" id="steps" style="margin-top:1rem"></div><div id="detail" style="margin-top:1rem"></div></div>
        <div class="card" style="margin-top:1rem"><b>Interrupting the boot (kernel command line in GRUB: press <kbd>e</kbd> on the entry, edit the <code>linux</code> line, boot with <kbd>Ctrl</kbd>+<kbd>X</kbd>)</b><div class="tbl-wrap"><table><tr><th>Add parameter</th><th>Effect</th></tr><tr><td><code>systemd.unit=rescue.target</code> (or <code>single</code>, <code>1</code>, <code>S</code>)</td><td>single-user / rescue mode</td></tr><tr><td><code>systemd.unit=emergency.target</code> (or <code>emergency</code>)</td><td>minimal emergency shell, root fs read-only</td></tr><tr><td><code>init=/bin/bash</code></td><td>skip init entirely — a root shell (remount with <code>mount -o remount,rw /</code>)</td></tr><tr><td><code>quiet</code> / <code>splash</code></td><td>less kernel output / graphical boot splash</td></tr><tr><td><code>ro</code> / <code>rw</code></td><td>mount the root fs read-only (fsck first) / read-write</td></tr><tr><td><code>root=UUID=…</code></td><td>which device holds the root filesystem</td></tr><tr><td><code>mem=</code>, <code>nomodeset</code>, <code>acpi=off</code></td><td>work around hardware problems</td></tr></table></div><p class="muted" style="font-size:.88rem;margin-bottom:0">See the current command line with <code>cat /proc/cmdline</code>; boot messages with <code>dmesg</code> and <code>journalctl -b</code>.</p></div>`;
      let i = 0;
      const stages = () => {
        const uefi = $('#fw', el).value === 'uefi';
        const sd = $('#init', el).value === 'systemd';
        return [
          { t: uefi ? 'UEFI firmware' : 'BIOS', d: uefi ? 'The UEFI firmware runs POST (power-on self test), initialises hardware and reads its <b>boot entries from NVRAM</b> (<code>efibootmgr -v</code>). Secure Boot can verify signatures (shim).' : 'The BIOS (in ROM) runs the POST, initialises hardware and walks the <b>boot order</b>. It knows nothing about filesystems.', files: uefi ? ['efibootmgr', '/sys/firmware/efi'] : ['CMOS setup (Del/F2)'] },
          { t: uefi ? 'ESP (EFI System Partition)' : 'MBR (first 512 bytes)', d: uefi ? 'A FAT32 partition (type EF00, usually mounted on <code>/boot/efi</code>) contains the boot loader as an EFI application, e.g. <code>\\EFI\\debian\\grubx64.efi</code> (or <code>shimx64.efi</code> with Secure Boot).' : 'The first sector of the disk: 446 bytes of boot code (GRUB stage 1 / boot.img), 64 bytes partition table (4 primary entries), 2 bytes signature <code>0x55AA</code>. Stage 1 loads core.img from the gap after the MBR.', files: uefi ? ['/boot/efi/EFI/debian/grubx64.efi', 'grub-install --target=x86_64-efi'] : ['dd if=/dev/sda of=mbr.bin bs=512 count=1', 'grub-install /dev/sda'] },
          { t: 'GRUB 2', d: 'The boot loader shows the menu (<code>GRUB_TIMEOUT</code>), reads <code>/boot/grub/grub.cfg</code> (generated by <code>grub-mkconfig</code>/<code>update-grub</code> from <code>/etc/default/grub</code> and <code>/etc/grub.d/</code>), loads the kernel and the initramfs into RAM and passes the kernel command line. Press <kbd>e</kbd> to edit an entry, <kbd>c</kbd> for the GRUB shell.', files: ['/boot/grub/grub.cfg', '/etc/default/grub', '/etc/grub.d/40_custom', 'update-grub'] },
          { t: 'Kernel', d: 'The compressed kernel (<code>/boot/vmlinuz-*</code>) decompresses itself, detects hardware, initialises memory and drivers and prints to the ring buffer (<code>dmesg</code>). It mounts the initramfs as a temporary root.', files: ['/boot/vmlinuz-6.1.0-18-amd64', '/proc/cmdline', 'dmesg', 'uname -r'] },
          { t: 'initramfs', d: 'A small cpio archive (<code>/boot/initrd.img-*</code>) with the modules and tools needed to reach the real root filesystem (disk controller drivers, LVM, RAID, LUKS). It runs <code>/init</code>, mounts the real root (first read-only) and switches to it. Rebuild with <code>update-initramfs -u</code> or <code>dracut</code>.', files: ['/boot/initrd.img-6.1.0-18-amd64', 'lsinitramfs', 'update-initramfs -u'] },
          sd
            ? { t: 'systemd (PID 1)', d: 'The kernel starts <code>/sbin/init</code> → <b>systemd</b>. It reads unit files from <code>/lib/systemd/system</code> and <code>/etc/systemd/system</code>, mounts filesystems from <code>/etc/fstab</code>, activates swap and starts units in parallel until <code>default.target</code> is reached.', files: ['systemctl get-default', '/etc/systemd/system/default.target', 'systemd-analyze blame', 'journalctl -b'] }
            : { t: 'SysV init (PID 1)', d: 'The kernel starts <code>/sbin/init</code>, which reads <code>/etc/inittab</code> (default runlevel <code>id:3:initdefault:</code>), runs <code>/etc/init.d/rcS</code> and then the scripts in <code>/etc/rcN.d/</code>: <b>K</b>* scripts stop, <b>S</b>* scripts start services, in numeric order.', files: ['/etc/inittab', '/etc/init.d/', '/etc/rc3.d/S01ssh', 'runlevel'] },
          sd ? { t: 'Targets', d: '<code>multi-user.target</code> (text mode, ≈ runlevel 3) or <code>graphical.target</code> (≈ runlevel 5). Change at runtime with <code>systemctl isolate</code>, permanently with <code>systemctl set-default</code>.', files: ['systemctl isolate multi-user.target', 'systemctl list-units --type=target'] } : { t: 'Runlevel', d: 'Runlevels 0 halt, 1/S single-user, 2–4 multi-user, 5 multi-user + X11, 6 reboot. Switch with <code>telinit 3</code> / <code>init 3</code>.', files: ['telinit 1', 'runlevel', 'who -r'] },
          { t: 'Login', d: '<code>getty</code> on the text consoles (Ctrl+Alt+F1…F6) or a display manager (gdm, lightdm, sddm) on the graphical console. After authentication via PAM the user\'s login shell starts and reads <code>/etc/profile</code> and <code>~/.profile</code>.', files: ['/etc/issue', '/etc/motd', 'who', 'last'] },
        ];
      };
      const draw = () => {
        const s = stages();
        $('#steps', el).innerHTML = s.map((x, k) => `<div class="boot-step ${k <= i ? 'on' : ''} ${k === i ? 'cur' : ''}" data-k="${k}">${k + 1}. ${esc(x.t)}</div>`).join('');
        const c = s[i];
        $('#detail', el).innerHTML = `<h3 style="margin-top:0">${i + 1}. ${esc(c.t)}</h3><p>${c.d}</p><div class="chips">${c.files.map((f) => `<code class="chip">${esc(f)}</code>`).join('')}</div>`;
        $$('[data-k]', el).forEach((b) =>
          b.addEventListener('click', () => {
            i = +b.dataset.k;
            draw();
          })
        );
        $('#prev', el).disabled = i === 0;
        $('#next', el).disabled = i === s.length - 1;
      };
      $('#next', el).onclick = () => {
        i++;
        draw();
      };
      $('#prev', el).onclick = () => {
        i--;
        draw();
      };
      $('#fw', el).onchange = draw;
      $('#init', el).onchange = draw;
      draw();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'targets',
    icon: '🎯',
    title: 'Runlevels ↔ systemd targets',
    obj: ['101.3'],
    desc: 'Map SysV runlevels to systemd targets and see the equivalent commands for switching, setting the default and shutting down.',
    render(el, ctx) {
      const rows = [
        [0, 'poweroff.target', 'halt / power off', 'systemctl poweroff', 'telinit 0 · shutdown -h now · poweroff'],
        [1, 'rescue.target', 'single-user, maintenance (root only, no network)', 'systemctl isolate rescue.target · systemctl rescue', 'telinit 1 · telinit S'],
        [2, 'multi-user.target', 'multi-user (Debian: = 3–5; RHEL: without NFS)', 'systemctl isolate multi-user.target', 'telinit 2'],
        [3, 'multi-user.target', 'multi-user, text mode, network', 'systemctl isolate multi-user.target', 'telinit 3'],
        [4, 'multi-user.target', 'unused / user defined', 'systemctl isolate multi-user.target', 'telinit 4'],
        [5, 'graphical.target', 'multi-user + graphical login', 'systemctl isolate graphical.target', 'telinit 5'],
        [6, 'reboot.target', 'reboot', 'systemctl reboot', 'telinit 6 · shutdown -r now · reboot'],
        ['–', 'emergency.target', 'emergency shell, root fs read-only, almost nothing started', 'systemctl emergency', '(boot param: emergency)'],
      ];
      el.innerHTML = `<div class="tbl-wrap"><table><tr><th>Runlevel</th><th>systemd target</th><th>Meaning</th><th>systemd command</th><th>SysV command</th><th></th></tr>${rows.map((r) => `<tr><td><b>${r[0]}</b></td><td><code>${r[1]}</code></td><td>${r[2]}</td><td><code>${r[3]}</code></td><td><code>${r[4]}</code></td><td>${r[0] === 0 || r[0] === 6 ? '' : `<button class="btn btn-sm" data-t="${r[1]}">try</button>`}</td></tr>`).join('')}</table></div>
        <div class="grid grid-2"><div class="card"><b>Default at boot</b><ul style="font-size:.92rem"><li>systemd: <code>systemctl get-default</code> / <code>systemctl set-default multi-user.target</code> (symlink <code>/etc/systemd/system/default.target</code>)</li><li>SysV: <code>id:3:initdefault:</code> in <code>/etc/inittab</code></li><li>one-time: kernel parameter <code>systemd.unit=…</code> or the runlevel number</li></ul></div>
        <div class="card"><b>Current state</b><ul style="font-size:.92rem"><li><code>runlevel</code> → e.g. <code>N 5</code> (previous, current)</li><li><code>who -r</code></li><li><code>systemctl list-units --type=target</code></li></ul><b>Shutdown</b><ul style="font-size:.92rem"><li><code>shutdown -h +10 "Maintenance"</code>, <code>shutdown -r now</code>, <code>shutdown -c</code></li><li><code>wall</code> sends a message to all terminals</li><li>ACPI events (power button) are handled by <code>acpid</code> / <code>systemd-logind</code></li></ul></div></div>`;
      $$('[data-t]', el).forEach((b) => b.addEventListener('click', () => ctx.runInSandbox(['runlevel', `sudo systemctl isolate ${b.dataset.t}`, 'runlevel', 'systemctl get-default'])));
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'vi',
    icon: '✏️',
    title: 'vi / vim trainer',
    obj: ['103.8'],
    desc: 'A real modal vi emulator with guided missions: modes, movement, delete/yank/put, search & replace, saving and quitting.',
    render(el, ctx) {
      const TEXT = `The quick brown fox jumps over the lazy dog.
Linux is a kernel; GNU/Linux is an operating system.
vi has two main modes: command mode and insert mode.
DELETE THIS LINE
Press ESC to return to command mode.
The lazy dog sleeps all day long.
colour colour colour`;
      const missions = [
        { t: 'Move the cursor to line 3 (use <kbd>j</kbd> or <kbd>3G</kbd>).', c: (s) => s.cy === 2 },
        { t: 'Jump to the last line with <kbd>G</kbd>.', c: (s) => s.cy === s.lines.length - 1 },
        { t: 'Go back to the first line with <kbd>gg</kbd> and the end of the line with <kbd>$</kbd>.', c: (s) => s.cy === 0 && s.cx === s.lines[0].length - 1 },
        { t: 'Delete the line <code>DELETE THIS LINE</code> (go there and press <kbd>dd</kbd>).', c: (s) => !s.lines.includes('DELETE THIS LINE') && s.lines.length === 6 },
        { t: 'Undo it with <kbd>u</kbd>, then delete it again (<kbd>dd</kbd>) — deleting = cutting.', c: (s, h) => h.undid && !s.lines.includes('DELETE THIS LINE') },
        { t: 'Paste the cut line below the last line: <kbd>G</kbd> then <kbd>p</kbd>.', c: (s) => s.lines[s.lines.length - 1] === 'DELETE THIS LINE' },
        { t: 'Enter insert mode (<kbd>i</kbd>, <kbd>a</kbd>, <kbd>o</kbd> or <kbd>A</kbd>), type <b>LPIC</b> somewhere and return with <kbd>Esc</kbd>.', c: (s) => s.text.includes('LPIC') && s.mode === 'normal' },
        { t: 'Search for <code>lazy</code> with <kbd>/lazy</kbd> <kbd>Enter</kbd> and jump to the next hit with <kbd>n</kbd>.', c: (s) => s.cy === 5 && s.lines[5].indexOf('lazy') === s.cx },
        { t: 'Replace every <code>colour</code> by <code>color</code> on all lines: <kbd>:%s/colour/color/g</kbd>', c: (s) => !s.text.includes('colour') && s.text.includes('color color color') },
        { t: 'Yank (copy) line 1 with <kbd>yy</kbd> on it and put it above with <kbd>P</kbd>.', c: (s) => s.lines[0] === s.lines[1] && s.lines[0].startsWith('The quick') },
        { t: 'Turn on line numbers: <kbd>:set number</kbd>', c: (s) => s.num },
        { t: 'Save the file with <kbd>:w</kbd> …', c: (s, h) => h.saved },
        { t: '… and quit with <kbd>:q</kbd> (or <kbd>:wq</kbd> / <kbd>:x</kbd> / <kbd>ZZ</kbd> in one step).', c: (s, h) => h.quit },
      ];
      el.innerHTML = `<div class="lab"><div><div class="vi-train" id="host"></div><p class="muted" style="font-size:.85rem">Click into the editor first. Your keystrokes go to the emulator (Esc, :, / work).</p></div>
        <div class="card"><div class="row"><b>Missions</b><span class="spacer"></span><span class="badge" id="cnt"></span></div><ol class="tasks" id="ms"></ol><button class="btn btn-sm" id="rst">↺ Restart</button></div></div>
        <div class="card cheat" style="margin-top:1rem"><b>Cheat sheet</b><div class="grid grid-3" style="margin-top:.5rem">
        <table><tr><td>i a o O I A</td><td>insert before/after cursor, new line below/above, line start/end</td></tr><tr><td>Esc</td><td>back to command mode</td></tr><tr><td>h j k l</td><td>← ↓ ↑ →</td></tr><tr><td>w b e</td><td>next word, back, end of word</td></tr><tr><td>0 ^ $</td><td>line start, first char, end</td></tr><tr><td>gg G 5G</td><td>first, last, line 5</td></tr></table>
        <table><tr><td>x dd 3dd</td><td>delete char / line / 3 lines</td></tr><tr><td>dw d$ D</td><td>delete word / to end of line</td></tr><tr><td>cw cc C</td><td>change word / line / to end</td></tr><tr><td>yy yw p P</td><td>yank line/word, put after/before</td></tr><tr><td>u Ctrl+r .</td><td>undo, redo, repeat</td></tr><tr><td>r R ~ J</td><td>replace char, overwrite, case, join</td></tr></table>
        <table><tr><td>/re ?re n N</td><td>search forward/backward, next/prev</td></tr><tr><td>:w :w file</td><td>write</td></tr><tr><td>:q :q! :wq :x ZZ</td><td>quit, discard, save+quit</td></tr><tr><td>:e!</td><td>reload, discard changes</td></tr><tr><td>:%s/a/b/g</td><td>replace in whole file</td></tr><tr><td>:!cmd :r file</td><td>run shell command, read file</td></tr></table></div></div>`;
      let ed;
      let done;
      let hist;
      const start = () => {
        done = new Set();
        hist = { saved: false, quit: false, undid: false };
        const host = $('#host', el);
        host.innerHTML = '';
        ed = new SIM.ViEditor(host, {
          text: TEXT,
          filename: 'practice.txt',
          save: () => {
            hist.saved = true;
            return { message: '"practice.txt" written' };
          },
          onQuit: () => {
            hist.quit = true;
            check({ lines: ed.lines, text: ed.text, cy: ed.cy, cx: ed.cx, mode: ed.mode, num: ed.num });
            host.innerHTML = '<div style="color:#cbd5e1;padding:1rem;font-family:var(--mono)">vi exited. ' + (done.size === missions.length ? '🎉 All missions completed!' : 'Press Restart to try again.') + '</div>';
          },
          onChange: (s) => {
            if (s.event === 'u') hist.undid = true;
            check(s);
          },
        });
        draw();
      };
      const firstOpen = () => missions.findIndex((_, i) => !done.has(i));
      const check = (s) => {
        const i = firstOpen();
        if (i >= 0 && missions[i].c(s, hist)) {
          done.add(i);
          ctx.toast('✓ Mission ' + (i + 1) + ' done');
          draw();
        }
      };
      const draw = () => {
        const cur = firstOpen();
        $('#ms', el).innerHTML = missions.map((m, i) => `<li class="${done.has(i) ? 'done' : ''}" style="${i === cur ? 'background:var(--accent-bg);border-radius:6px' : i > cur && cur >= 0 ? 'opacity:.55' : ''}"><div class="tt">${m.t}</div></li>`).join('');
        $('#cnt', el).textContent = `${done.size}/${missions.length}`;
      };
      $('#rst', el).onclick = start;
      start();
    },
  });

  /* ------------------------------------------------------------------ */
  function ip2n(ip) {
    const p = ip.split('.').map(Number);
    if (p.length !== 4 || p.some((x) => isNaN(x) || x < 0 || x > 255)) return null;
    return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  }
  const n2ip = (n) => [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255].join('.');
  function expand6(a) {
    let s = a.toLowerCase().split('%')[0];
    if (s.indexOf('::') >= 0) {
      const [l, r] = s.split('::');
      const L = l ? l.split(':') : [];
      const R = r ? r.split(':') : [];
      const miss = 8 - L.length - R.length;
      if (miss < 0) return null;
      s = [...L, ...Array(miss).fill('0'), ...R].join(':');
    }
    const parts = s.split(':');
    if (parts.length !== 8 || parts.some((p) => !/^[0-9a-f]{1,4}$/.test(p))) return null;
    return parts.map((p) => p.padStart(4, '0')).join(':');
  }
  function compress6(full) {
    const parts = full.split(':').map((p) => p.replace(/^0+(?=.)/, ''));
    let best = -1;
    let len = 0;
    for (let i = 0; i < 8; i++) {
      if (parts[i] !== '0') continue;
      let j = i;
      while (j < 8 && parts[j] === '0') j++;
      if (j - i > len && j - i > 1) {
        best = i;
        len = j - i;
      }
      i = j;
    }
    if (best < 0) return parts.join(':');
    const l = parts.slice(0, best).join(':');
    const r = parts.slice(best + len).join(':');
    return l + '::' + r;
  }
  def({
    id: 'ipcalc',
    icon: '🧮',
    title: 'Subnet calculator (IPv4 & IPv6)',
    obj: ['109.1'],
    desc: 'Network, broadcast, netmask, host range and host count for any CIDR — plus IPv6 shortening rules and address types. Includes subnetting practice.',
    render(el, ctx) {
      el.innerHTML = `<div class="grid grid-2"><div class="card"><div class="field"><label>IPv4 address / prefix</label><input class="inp mono big-mono" id="ip" value="192.168.56.101/24"></div><div class="chips">${['10.0.0.1/8', '172.16.5.4/12', '192.168.1.130/26', '192.168.1.1/30', '203.0.113.9/29', '127.0.0.1/8', '169.254.10.20/16'].map((x) => `<span class="chip" data-ip="${x}">${x}</span>`).join('')}</div><div id="v4" style="margin-top:.8rem"></div></div>
        <div class="card"><div class="field"><label>IPv6 address</label><input class="inp mono" id="ip6" value="2001:0db8:0000:0000:0000:ff00:0042:8329"></div><div class="chips">${['fe80::a00:27ff:fe4e:66a1', '::1', '2001:db8::1', 'ff02::1', 'fd12:3456:789a::1', '::ffff:192.168.1.1'].map((x) => `<span class="chip" data-ip6="${x}">${x}</span>`).join('')}</div><div id="v6" style="margin-top:.8rem"></div></div></div>
        <div class="card" style="margin-top:1rem"><div class="row"><b>🎯 Practice</b><span class="spacer"></span><span class="muted" id="sc">0/0</span></div><p id="pq"></p><div class="row"><input class="inp mono" id="pa" placeholder="answer"><button class="btn btn-primary" id="pc">Check</button><button class="btn" id="pn">New</button></div><div id="pr"></div></div>`;
      const v4 = () => {
        const v = $('#ip', el).value.trim();
        const [a, p = '32'] = v.split('/');
        const n = ip2n(a);
        const len = +p;
        if (n === null || !(len >= 0 && len <= 32)) return ($('#v4', el).innerHTML = '<span class="badge bad">invalid</span>');
        const mask = len === 0 ? 0 : (0xffffffff << (32 - len)) >>> 0;
        const net = (n & mask) >>> 0;
        const bc = (net | ~mask) >>> 0;
        const hosts = len >= 31 ? (len === 31 ? 2 : 1) : 2 ** (32 - len) - 2;
        const first = n >>> 24;
        const cls = first < 128 ? 'A' : first < 192 ? 'B' : first < 224 ? 'C' : first < 240 ? 'D (multicast)' : 'E (reserved)';
        const priv = first === 10 || (first === 172 && ((n >> 16) & 255) >= 16 && ((n >> 16) & 255) <= 31) || (first === 192 && ((n >> 16) & 255) === 168);
        const special = first === 127 ? 'loopback (127.0.0.0/8)' : first === 169 && ((n >> 16) & 255) === 254 ? 'link-local / APIPA (169.254.0.0/16)' : priv ? 'private (RFC 1918)' : /^(192\.0\.2|198\.51\.100|203\.0\.113)\./.test(a) ? 'documentation (TEST-NET)' : first >= 224 ? 'multicast/reserved' : 'public';
        const bin = (x) => x.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1.').slice(0, -1);
        $('#v4', el).innerHTML = `<table><tr><td>Netmask</td><td><code>${n2ip(mask)}</code> = /${len}</td></tr><tr><td>Wildcard</td><td><code>${n2ip(~mask >>> 0)}</code></td></tr><tr><td>Network</td><td><code>${n2ip(net)}/${len}</code></td></tr><tr><td>Broadcast</td><td><code>${len >= 31 ? '–' : n2ip(bc)}</code></td></tr><tr><td>Hosts</td><td><code>${len >= 31 ? n2ip(net) + ' – ' + n2ip(bc) : n2ip(net + 1) + ' – ' + n2ip(bc - 1)}</code></td></tr><tr><td>Usable hosts</td><td><b>${hosts.toLocaleString()}</b> (2<sup>${32 - len}</sup> − 2)</td></tr><tr><td>Class (historic)</td><td>${cls}</td></tr><tr><td>Type</td><td>${special}</td></tr></table><div style="font-family:var(--mono);font-size:.78rem;margin-top:.5rem"><div>addr ${bin(n)}</div><div>mask ${bin(mask)}</div><div>net  ${bin(net)}</div></div>`;
      };
      const v6 = () => {
        const v = $('#ip6', el).value.trim();
        const full = expand6(v.split('/')[0]);
        if (!full) return ($('#v6', el).innerHTML = '<span class="badge bad">invalid</span>');
        const short = compress6(full);
        const f = full.slice(0, 4);
        const type = full === '0000:0000:0000:0000:0000:0000:0000:0001' ? 'loopback ::1' : f === 'fe80' ? 'link-local (fe80::/10) — every interface has one, not routed' : f.startsWith('ff') ? 'multicast (ff00::/8), e.g. ff02::1 all nodes' : /^f[cd]/.test(f) ? 'unique local (fc00::/7) — like private IPv4' : f.startsWith('2') || f.startsWith('3') ? 'global unicast (2000::/3)' : full.startsWith('0000:0000:0000:0000:0000:ffff') ? 'IPv4-mapped' : 'other/reserved';
        $('#v6', el).innerHTML = `<table><tr><td>Full</td><td><code>${full}</code></td></tr><tr><td>Shortest</td><td><code>${short}</code></td></tr><tr><td>Type</td><td>${type}</td></tr><tr><td>Size</td><td>128 bit · 8 groups of 16 bit hex · usual prefix /64 (network) + 64 bit interface ID</td></tr></table><p class="muted" style="font-size:.85rem">Rules: leading zeros of a group may be dropped; <b>one</b> run of all-zero groups may be replaced by <code>::</code> (only once!). No broadcast in IPv6 — multicast instead. ICMPv6/NDP replaces ARP.</p>`;
      };
      $('#ip', el).addEventListener('input', v4);
      $('#ip6', el).addEventListener('input', v6);
      $$('[data-ip]', el).forEach((c) => c.addEventListener('click', () => (($('#ip', el).value = c.dataset.ip), v4())));
      $$('[data-ip6]', el).forEach((c) => c.addEventListener('click', () => (($('#ip6', el).value = c.dataset.ip6), v6())));
      v4();
      v6();
      let ans = '';
      let n = 0;
      let ok = 0;
      const gen = () => {
        const len = [24, 25, 26, 27, 28, 29, 30, 16, 20, 22][Math.floor(Math.random() * 10)];
        const ip = [192, 168, Math.floor(Math.random() * 255), Math.floor(Math.random() * 254) + 1].join('.');
        const mask = (0xffffffff << (32 - len)) >>> 0;
        const net = (ip2n(ip) & mask) >>> 0;
        const kinds = [
          [`What is the <b>network address</b> of <code>${ip}/${len}</code>?`, n2ip(net)],
          [`What is the <b>broadcast address</b> of <code>${ip}/${len}</code>?`, n2ip((net | ~mask) >>> 0)],
          [`How many <b>usable hosts</b> does a /${len} network have?`, String(2 ** (32 - len) - 2)],
          [`Write the netmask of /${len} in dotted decimal.`, n2ip(mask)],
        ];
        const k = kinds[Math.floor(Math.random() * kinds.length)];
        $('#pq', el).innerHTML = k[0];
        ans = k[1];
        $('#pa', el).value = '';
        $('#pr', el).innerHTML = '';
      };
      $('#pn', el).onclick = gen;
      const chk = () => {
        n++;
        const good = $('#pa', el).value.trim() === ans;
        if (good) ok++;
        $('#sc', el).textContent = `${ok}/${n}`;
        $('#pr', el).innerHTML = good ? '<div class="feedback ok">✓ Correct</div>' : `<div class="feedback no">✗ Answer: <code>${ans}</code></div>`;
        if (good) setTimeout(gen, 800);
      };
      $('#pc', el).onclick = chk;
      $('#pa', el).addEventListener('keydown', (e) => e.key === 'Enter' && chk());
      gen();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'ports',
    icon: '🔌',
    title: 'Well-known ports drill',
    obj: ['109.1'],
    desc: 'Learn the ports the exam expects: 20/21 FTP, 22 SSH, 25 SMTP, 53 DNS, 80/443 HTTP(S), 110/995 POP3, 143/993 IMAP, 161/162 SNMP, 389/636 LDAP, 514 syslog, 631 IPP …',
    render(el) {
      const P = [
        [20, 'ftp-data', 'TCP', 'FTP data'],
        [21, 'ftp', 'TCP', 'FTP control'],
        [22, 'ssh', 'TCP', 'Secure Shell (also scp, sftp)'],
        [23, 'telnet', 'TCP', 'Telnet (insecure)'],
        [25, 'smtp', 'TCP', 'Mail transfer between MTAs'],
        [53, 'domain', 'TCP+UDP', 'DNS'],
        [67, 'bootps', 'UDP', 'DHCP server'],
        [68, 'bootpc', 'UDP', 'DHCP client'],
        [80, 'http', 'TCP', 'Web'],
        [110, 'pop3', 'TCP', 'POP3 mail retrieval'],
        [123, 'ntp', 'UDP', 'Network Time Protocol'],
        [139, 'netbios-ssn', 'TCP', 'NetBIOS session (SMB over NetBIOS)'],
        [143, 'imap', 'TCP', 'IMAP mail access'],
        [161, 'snmp', 'UDP', 'SNMP queries'],
        [162, 'snmptrap', 'UDP', 'SNMP traps'],
        [389, 'ldap', 'TCP', 'LDAP directory'],
        [443, 'https', 'TCP', 'HTTP over TLS'],
        [465, 'smtps', 'TCP', 'SMTP over TLS (submissions)'],
        [514, 'syslog', 'UDP', 'remote syslog'],
        [587, 'submission', 'TCP', 'Mail submission by clients'],
        [631, 'ipp', 'TCP', 'Internet Printing Protocol (CUPS)'],
        [636, 'ldaps', 'TCP', 'LDAP over TLS'],
        [993, 'imaps', 'TCP', 'IMAP over TLS'],
        [995, 'pop3s', 'TCP', 'POP3 over TLS'],
      ];
      el.innerHTML = `<div class="card"><div class="row"><b>Quiz</b><span class="spacer"></span><span class="muted" id="sc">0/0</span></div><p id="q" style="font-size:1.15rem"></p><div class="grid grid-4" id="opts"></div></div>
        <div class="tbl-wrap"><table><tr><th>Port</th><th>Name in /etc/services</th><th>Protocol</th><th>Purpose</th></tr>${P.map((p) => `<tr><td><b>${p[0]}</b></td><td><code>${p[1]}</code></td><td>${p[2]}</td><td>${p[3]}</td></tr>`).join('')}</table></div><p class="muted">Ports below 1024 are privileged (only root may bind them). Look them up with <code>grep -w 22 /etc/services</code> or <code>getent services ssh</code>.</p>`;
      let n = 0;
      let ok = 0;
      const next = () => {
        const p = P[Math.floor(Math.random() * P.length)];
        const askPort = Math.random() < 0.5;
        $('#q', el).innerHTML = askPort ? `Which port does <b>${esc(p[3])}</b> (<code>${p[1]}</code>) use?` : `What runs on port <b>${p[0]}</b>?`;
        const others = P.filter((x) => x !== p).sort(() => Math.random() - 0.5).slice(0, 3);
        const opts = [p, ...others].sort(() => Math.random() - 0.5);
        $('#opts', el).innerHTML = opts.map((o) => `<button class="btn" data-v="${o[0]}">${askPort ? o[0] : esc(o[1] + ' — ' + o[3])}</button>`).join('');
        $$('[data-v]', el).forEach((b) =>
          b.addEventListener('click', () => {
            n++;
            const good = +b.dataset.v === p[0];
            if (good) ok++;
            b.classList.add(good ? 'btn-primary' : 'btn-danger');
            if (!good) $$('[data-v]', el).find((x) => +x.dataset.v === p[0]).classList.add('btn-primary');
            $('#sc', el).textContent = `${ok}/${n}`;
            setTimeout(next, good ? 600 : 1500);
          })
        );
      };
      next();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'passwd',
    icon: '👤',
    title: '/etc/passwd, shadow & group explained',
    obj: ['107.1', '110.2'],
    desc: 'Click any field of a passwd, shadow or group line to see what it means — including aging fields converted to real dates.',
    render(el) {
      const samples = {
        passwd: ['student:x:1000:1000:LPIC Student,,,:/home/student:/bin/bash', 'sshd:x:105:65534::/run/sshd:/usr/sbin/nologin', 'root:x:0:0:root:/root:/bin/bash'],
        shadow: ['alice:$6$aB3dE6gH$Kj8hG5fD2sA9pO6...:19650:0:90:7:14:20500:', 'bob:!$6$qW9eR2tY$Lk5jH8gF1dS4aP7...:19650:0:99999:7:::', 'daemon:*:19650:0:99999:7:::'],
        group: ['developers:x:1010:alice,bob', 'sudo:x:27:student,alice', 'student:x:1000:'],
      };
      const F = {
        passwd: [
          ['login name', 'The user name (max. 32 chars). Must be unique.'],
          ['password', '<code>x</code> = the hash is stored in /etc/shadow (readable only by root). An empty field would mean no password!'],
          ['UID', 'User ID. 0 = root, 1–999 system accounts (Debian: 100–999 dynamic), ≥ 1000 regular users (UID_MIN in /etc/login.defs).'],
          ['GID', 'Primary group ID (refers to /etc/group). New files get this group.'],
          ['GECOS', 'Comment: full name, room, phone… (comma separated). Change with <code>chfn</code> or <code>usermod -c</code>.'],
          ['home', 'Home directory. Created by <code>useradd -m</code> by copying /etc/skel.'],
          ['shell', 'Login shell. <code>/usr/sbin/nologin</code> or <code>/bin/false</code> prevent interactive logins. Valid shells are listed in /etc/shells; change with <code>chsh</code>.'],
        ],
        shadow: [
          ['login name', 'Must match /etc/passwd.'],
          ['password hash', '<code>$id$salt$hash</code>: $1$ MD5, $5$ SHA-256, $6$ SHA-512, $y$ yescrypt. <code>!</code> prefix = locked (passwd -l / usermod -L), <code>*</code> or <code>!</code> = no password login possible, empty = no password.'],
          ['last change', 'Day of last password change, counted in days since 1970-01-01. 0 = user must change the password at next login.'],
          ['min', 'Minimum days between password changes (chage -m).'],
          ['max', 'Maximum days a password is valid (chage -M). 99999 = practically never expires.'],
          ['warn', 'Days of warning before the password expires (chage -W).'],
          ['inactive', 'Days after expiry until the account is locked (chage -I).'],
          ['expire', 'Account expiration date in days since 1970-01-01 (chage -E / useradd -e). Empty = never.'],
          ['reserved', 'Unused.'],
        ],
        group: [
          ['group name', 'Name of the group.'],
          ['password', '<code>x</code> = see /etc/gshadow. Group passwords are rarely used (newgrp).'],
          ['GID', 'Group ID.'],
          ['members', 'Comma separated list of users who have this group as a <b>supplementary</b> group. Users whose primary group it is (GID in /etc/passwd) are usually NOT listed here.'],
        ],
      };
      el.innerHTML = `<div class="card"><div class="row"><select class="inp" id="file"><option value="passwd">/etc/passwd (0644)</option><option value="shadow">/etc/shadow (0640 root:shadow)</option><option value="group">/etc/group (0644)</option></select><select class="inp" id="smp"></select></div><input class="inp mono" id="line" style="width:100%;margin-top:.6rem"><div class="explain-line" id="ex"></div><div id="info" class="feedback" style="min-height:4rem"></div></div>`;
      const fill = () => {
        const f = $('#file', el).value;
        $('#smp', el).innerHTML = samples[f].map((s, i) => `<option value="${i}">${esc(s.split(':')[0])}</option>`).join('');
        $('#line', el).value = samples[f][0];
        draw();
      };
      const draw = () => {
        const f = $('#file', el).value;
        const parts = $('#line', el).value.split(':');
        $('#ex', el).innerHTML = parts.map((p, i) => `<span class="f" data-i="${i}">${esc(p) || '<span class="muted">∅</span>'}</span>${i < parts.length - 1 ? '<span class="sep">:</span>' : ''}`).join('');
        $$('.f', el).forEach((s) => {
          const show = () => {
            $$('.f', el).forEach((x) => x.classList.remove('hl'));
            s.classList.add('hl');
            const i = +s.dataset.i;
            const d = F[f][i] || ['extra field', 'Too many fields — the line is invalid.'];
            let extra = '';
            const v = parts[i];
            if (f === 'shadow' && (i === 2 || i === 7) && /^\d+$/.test(v)) extra = `<div>➜ ${new Date(+v * 86400000).toDateString()}</div>`;
            if (f === 'shadow' && i === 4 && /^\d+$/.test(v) && /^\d+$/.test(parts[2]) && +v < 99999) extra = `<div>➜ password expires on ${new Date((+parts[2] + +v) * 86400000).toDateString()}</div>`;
            $('#info', el).innerHTML = `<b>Field ${i + 1}: ${d[0]}</b> = <code>${esc(v)}</code><div>${d[1]}</div>${extra}`;
          };
          s.addEventListener('mouseenter', show);
          s.addEventListener('click', show);
        });
        $('#info', el).innerHTML = '<span class="muted">Hover or tap a field.</span>';
      };
      $('#file', el).onchange = fill;
      $('#smp', el).onchange = () => {
        $('#line', el).value = samples[$('#file', el).value][+$('#smp', el).value];
        draw();
      };
      $('#line', el).addEventListener('input', draw);
      fill();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'links',
    icon: '🔗',
    title: 'Hard links vs. symbolic links',
    obj: ['104.6'],
    desc: 'Create files, hard links and symlinks and watch directory entries, inodes and link counts — then delete or move the original and see what breaks.',
    render(el, ctx) {
      el.innerHTML = `<div class="card"><div class="row"><button class="btn" id="mkf">touch file</button><button class="btn" id="mkh">ln file hard</button><button class="btn" id="mks">ln -s file soft</button><button class="btn" id="mksa">ln -s /home/student/file abs</button><button class="btn" id="mv">mv file renamed</button><button class="btn btn-danger" id="rm">rm file</button><button class="btn btn-danger" id="rmh">rm hard</button><span class="spacer"></span><button class="btn btn-sm" id="rst">↺ reset</button></div>
        <div class="field" style="margin-top:.6rem"><label>Commands run</label><code id="log" style="white-space:pre-wrap"></code></div><div class="inode-viz" id="viz"></div><div class="field"><label>ls -li</label><pre class="regex-out" id="ls"></pre></div></div>
        <div class="grid grid-2" style="margin-top:1rem"><div class="card"><b>Hard link</b><ul style="font-size:.92rem"><li>a second <b>name</b> for the same inode — all names are equal</li><li>link count (2nd column of <code>ls -l</code>) increases</li><li>data is freed only when the last name is removed</li><li>same filesystem only, not for directories</li><li><code>ls -i</code> shows identical inode numbers; <code>find -samefile</code>, <code>find -inum</code></li></ul></div>
        <div class="card"><b>Symbolic (soft) link</b><ul style="font-size:.92rem"><li>own inode, type <code>l</code>, contains a <b>path</b></li><li>may point to directories and other filesystems</li><li>breaks ("dangling") when the target is removed or renamed</li><li>relative targets are resolved from the link's directory</li><li>permissions shown as <code>lrwxrwxrwx</code> — the target's permissions apply</li><li><code>readlink -f</code> resolves the final target</li></ul></div></div>`;
      let sh;
      let log = [];
      const reset = () => {
        sh = new SIM.Shell({ user: 'student' });
        sh.cwd = '/home/student/linklab';
        sh.fs.mkdir('/home/student/linklab', '/');
        log = [];
        draw();
      };
      const run = (c) => {
        const r = sh.capture(c);
        log.push('$ ' + c + (r.err ? '\n' + r.err.trim() : ''));
        draw();
      };
      const draw = () => {
        const d = sh.fs.lookup('/home/student/linklab', '/');
        const names = Object.keys(d.node.ents).sort();
        const inodes = {};
        let dent = '';
        for (const n of names) {
          const ino = d.node.ents[n];
          const node = sh.fs.node(ino);
          let cls = '';
          let extra = '';
          if (node.t === 'l') {
            const ok = sh.fs.tryLookup('/home/student/linklab/' + n, '/', true);
            cls = ok ? 'sym' : 'sym broken';
            extra = ` → "${esc(node.target)}"${ok ? '' : ' ✗ dangling'}`;
          }
          dent += `<div class="dentry ${cls}"><b>${esc(n)}</b> → inode ${ino}${extra}</div>`;
          inodes[ino] = node;
        }
        let ib = '';
        for (const [ino, node] of Object.entries(inodes)) ib += `<div class="inode-box" style="margin:.3rem 0">inode <b>${ino}</b> · ${node.t === 'l' ? 'symlink' : 'file'} · links: <b>${node.nlink}</b><br>${node.t === 'l' ? 'data: "' + esc(node.target) + '"' : 'data: "' + esc((node.data || '').trim()) + '"'}</div>`;
        $('#viz', el).innerHTML = `<div><div class="muted" style="font-family:var(--sans)">directory entries (names)</div>${dent || '<div class="muted">empty</div>'}</div><div style="font-size:1.6rem">⟶</div><div><div class="muted" style="font-family:var(--sans)">inodes (metadata + data)</div>${ib || '<div class="muted">–</div>'}</div>`;
        $('#ls', el).textContent = sh.capture('ls -li --color=never').out || '(empty)';
        $('#log', el).textContent = log.slice(-6).join('\n') || '–';
      };
      $('#mkf', el).onclick = () => run('echo "hello" > file');
      $('#mkh', el).onclick = () => run('ln file hard');
      $('#mks', el).onclick = () => run('ln -s file soft');
      $('#mksa', el).onclick = () => run('ln -s /home/student/linklab/file abs');
      $('#mv', el).onclick = () => run('mv file renamed');
      $('#rm', el).onclick = () => run('rm file');
      $('#rmh', el).onclick = () => run('rm hard');
      $('#rst', el).onclick = reset;
      reset();
      run('echo "hello" > file');
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'partition',
    icon: '💽',
    title: 'Partition planner (MBR vs GPT)',
    obj: ['102.1', '104.1'],
    desc: 'Lay out a disk with primary, extended and logical partitions or GPT partitions, hit the real limits, and get matching fdisk/parted, mkfs and fstab lines.',
    render(el) {
      el.innerHTML = `<div class="card"><div class="row"><label class="muted">Table</label><select class="inp" id="lbl"><option value="msdos">MBR / DOS</option><option value="gpt">GPT</option></select><label class="muted">Disk size (GiB)</label><input class="inp" id="dsz" type="number" value="20" style="width:7ch"><span class="spacer"></span><button class="btn btn-sm" id="clr">clear</button></div>
        <div class="disk" id="disk" style="margin-top:.8rem"></div><div class="muted" id="free" style="font-size:.85rem;margin-top:.3rem"></div>
        <div class="row" style="margin-top:.8rem;align-items:flex-end"><div class="field"><label>Type</label><select class="inp" id="ptype"></select></div><div class="field"><label>Size (GiB)</label><input class="inp" id="psz" type="number" value="5" style="width:7ch"></div><div class="field"><label>Use</label><select class="inp" id="puse"><option value="ext4">ext4</option><option value="xfs">xfs</option><option value="swap">swap</option><option value="vfat">vfat (EFI)</option><option value="lvm">LVM PV</option><option value="none">none</option></select></div><div class="field"><label>Mount point</label><input class="inp mono" id="pmnt" value="/data" style="width:12ch"></div><button class="btn btn-primary" id="add">Add partition</button></div><div id="err"></div></div>
        <div class="grid grid-2" style="margin-top:1rem"><div class="card"><b>Commands</b><pre class="regex-out" id="cmds"></pre></div><div class="card"><b>/etc/fstab</b><pre class="regex-out" id="fstab"></pre></div></div>
        <div class="card" style="margin-top:1rem"><b>Limits to remember</b><ul style="font-size:.92rem"><li><b>MBR</b>: max. 4 primary partitions — or 3 primary + 1 <b>extended</b> partition containing <b>logical</b> partitions (numbered from 5). Max. disk size 2 TiB (32-bit sectors × 512 B). Partition table in the first sector.</li><li><b>GPT</b>: 128 partitions by default, disks up to 8 ZiB, primary table at the start + backup table at the end of the disk, protective MBR, partitions identified by GUIDs. Needed for UEFI boot (ESP) and disks > 2 TiB.</li><li>Typical layout: <code>/boot</code> (or ESP <code>/boot/efi</code>), <code>/</code>, swap, separate <code>/home</code>, <code>/var</code> (logs, spool, databases), <code>/tmp</code>.</li><li>Swap rule of thumb: like RAM for hibernation; otherwise 1–2× RAM for small systems, less for large ones.</li></ul></div>`;
      let parts = [];
      const typeOpts = () => {
        const g = $('#lbl', el).value === 'gpt';
        $('#ptype', el).innerHTML = g ? '<option value="gpt">GPT partition</option>' : '<option value="primary">primary</option><option value="extended">extended</option><option value="logical">logical</option>';
      };
      const colors = { ext4: '#2563eb', xfs: '#7c3aed', swap: '#db2777', vfat: '#ea580c', lvm: '#0d9488', none: '#64748b', extended: '#94a3b8' };
      const draw = () => {
        const size = +$('#dsz', el).value || 20;
        const g = $('#lbl', el).value === 'gpt';
        const top = parts.filter((p) => p.type !== 'logical');
        const used = top.reduce((a, p) => a + p.size, 0);
        $('#disk', el).innerHTML = top
          .map((p) => {
            if (p.type === 'extended') {
              const logi = parts.filter((x) => x.type === 'logical');
              const lu = logi.reduce((a, x) => a + x.size, 0);
              return `<div style="width:${(p.size / size) * 100}%;background:${colors.extended};padding:3px;display:flex;gap:2px">${logi.map((x) => `<div style="flex:${x.size};background:${colors[x.use]};height:100%;display:flex;align-items:center;justify-content:center;border-radius:4px">${x.dev}</div>`).join('')}<div style="flex:${Math.max(0.0001, p.size - lu)};"></div></div>`;
            }
            return `<div style="width:${(p.size / size) * 100}%;background:${colors[p.use]}" title="${p.dev} ${p.size}G ${p.use}">${p.dev} ${p.size}G ${p.use}</div>`;
          })
          .join('');
        $('#free', el).textContent = `${(size - used).toFixed(1)} GiB unallocated · ${g ? `${parts.length}/128 GPT entries` : `${top.length}/4 primary table entries`}`;
        let c = `parted -s /dev/sdb mklabel ${g ? 'gpt' : 'msdos'}\n`;
        let start = 1;
        for (const p of top) {
          const end = start + p.size * 1024;
          if (g) c += `parted -s /dev/sdb mkpart ${p.use === 'swap' ? 'swap linux-swap' : p.use === 'vfat' ? 'ESP fat32' : 'data ' + (p.use === 'none' || p.use === 'lvm' ? 'ext4' : p.use)} ${start}MiB ${end}MiB\n`;
          else c += `parted -s /dev/sdb mkpart ${p.type}${p.type === 'extended' ? '' : ' ' + (p.use === 'swap' ? 'linux-swap' : p.use === 'vfat' ? 'fat32' : 'ext4')} ${start}MiB ${end}MiB\n`;
          if (p.type === 'extended') {
            let ls = start + 1;
            for (const x of parts.filter((q) => q.type === 'logical')) {
              c += `parted -s /dev/sdb mkpart logical ${x.use === 'swap' ? 'linux-swap' : 'ext4'} ${ls}MiB ${ls + x.size * 1024}MiB\n`;
              ls += x.size * 1024 + 1;
            }
          }
          start = end;
        }
        c += '\n';
        let fs = '';
        for (const p of parts) {
          if (p.type === 'extended') continue;
          if (p.use === 'swap') {
            c += `mkswap ${p.dev}\nswapon ${p.dev}\n`;
            fs += `${p.dev.padEnd(10)} none          swap  sw        0 0\n`;
          } else if (p.use === 'lvm') c += `pvcreate ${p.dev}\n`;
          else if (p.use !== 'none') {
            c += `mkfs.${p.use === 'vfat' ? 'vfat -F 32' : p.use} ${p.dev}\nmkdir -p ${p.mnt}\nmount ${p.dev} ${p.mnt}\n`;
            fs += `${p.dev.padEnd(10)} ${p.mnt.padEnd(13)} ${p.use.padEnd(5)} defaults  0 ${p.mnt === '/' ? 1 : 2}\n`;
          }
        }
        $('#cmds', el).textContent = c;
        $('#fstab', el).textContent = fs ? '# <device>  <mount point>  <type> <options> <dump> <pass>\n' + fs + '\n# better: use UUID=... (blkid) instead of /dev/sdbN' : '(no filesystems yet)';
      };
      const add = () => {
        const size = +$('#dsz', el).value || 20;
        const g = $('#lbl', el).value === 'gpt';
        const type = $('#ptype', el).value;
        const psz = +$('#psz', el).value;
        const err = (m) => ($('#err', el).innerHTML = `<div class="feedback no">✗ ${m}</div>`);
        $('#err', el).innerHTML = '';
        if (!(psz > 0)) return err('size must be > 0');
        const top = parts.filter((p) => p.type !== 'logical');
        const used = top.reduce((a, p) => a + p.size, 0);
        if (type === 'logical') {
          const ext = parts.find((p) => p.type === 'extended');
          if (!ext) return err("Can't create a logical partition without an extended partition.");
          const lu = parts.filter((p) => p.type === 'logical').reduce((a, p) => a + p.size, 0);
          if (lu + psz > ext.size + 0.001) return err('Not enough free space inside the extended partition.');
        } else {
          if (used + psz > size + 0.001) return err('Not enough free space on the disk.');
          if (!g && top.length >= 4) return err('An MBR partition table has only 4 primary slots. Use an extended partition (with logical partitions inside) or GPT.');
          if (type === 'extended' && parts.some((p) => p.type === 'extended')) return err('Only ONE extended partition is allowed.');
          if (g && parts.length >= 128) return err('GPT default limit: 128 partitions.');
        }
        if (!g && size > 2048) return err('MBR cannot address more than 2 TiB — use GPT.');
        let n;
        if (type === 'logical') n = 5 + parts.filter((p) => p.type === 'logical').length;
        else {
          n = 1;
          while (parts.some((p) => p.n === n)) n++;
        }
        const use = type === 'extended' ? 'extended' : $('#puse', el).value;
        parts.push({ n, type: g ? 'gpt' : type, size: psz, use, mnt: $('#pmnt', el).value || '/mnt', dev: '/dev/sdb' + n });
        draw();
      };
      $('#lbl', el).onchange = () => {
        parts = [];
        typeOpts();
        draw();
      };
      $('#dsz', el).oninput = draw;
      $('#add', el).onclick = add;
      $('#clr', el).onclick = () => {
        parts = [];
        draw();
      };
      typeOpts();
      draw();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'redirect',
    icon: '🔀',
    title: 'Redirection & pipes visualizer',
    obj: ['103.4'],
    desc: 'Build a command with redirections and see where stdin, stdout and stderr end up — finally understand why "2>&1 > file" differs from "> file 2>&1".',
    render(el, ctx) {
      el.innerHTML = `<div class="card"><div class="field"><label>Command line (redirections are evaluated left to right)</label><input class="inp mono" id="cmd" value="ls /etc/hostname /nonexistent > out.txt 2>&1"></div>
        <div class="chips">${['ls /etc/hostname /nonexistent > out.txt 2>&1', 'ls /etc/hostname /nonexistent 2>&1 > out.txt', 'ls /etc/hostname /nonexistent 2> err.txt', 'ls /etc/hostname /nonexistent &> all.txt', 'ls /etc/hostname /nonexistent 2>/dev/null', 'sort < fruits.txt > sorted.txt', 'ls /etc/hostname /nonexistent 2>&1 | wc -l', 'echo hi >> log.txt', 'cat <<< "here string"', 'ls /nonexistent | tee copy.txt'].map((x) => `<span class="chip" data-c="${esc(x)}">${esc(x)}</span>`).join('')}</div>
        <div id="fd" style="margin-top:1rem"></div><div class="row"><button class="btn btn-sm" id="run">▶ run it in the sandbox</button></div></div>
        <div class="card" style="margin-top:1rem"><b>File descriptors</b><table style="font-size:.92rem"><tr><td><code>0</code> stdin</td><td><code>&lt; file</code>, <code>&lt;&lt; EOF</code> (here document), <code>&lt;&lt;&lt; "text"</code> (here string)</td></tr><tr><td><code>1</code> stdout</td><td><code>&gt; file</code> overwrite (set -o noclobber protects; <code>&gt;|</code> forces), <code>&gt;&gt; file</code> append</td></tr><tr><td><code>2</code> stderr</td><td><code>2&gt; file</code>, <code>2&gt;&gt; file</code>, <code>2&gt;&amp;1</code> = "make fd 2 point where fd 1 points <i>now</i>"</td></tr><tr><td>both</td><td><code>&amp;&gt; file</code> or <code>&gt; file 2&gt;&amp;1</code>; to a pipe: <code>2&gt;&amp;1 |</code> or <code>|&amp;</code></td></tr><tr><td>discard</td><td><code>/dev/null</code></td></tr></table></div>`;
      const analyze = () => {
        const line = $('#cmd', el).value;
        const segs = line.split(/\|(?!&)/);
        let html = '';
        segs.forEach((seg, si) => {
          const fd = { 0: si > 0 ? 'pipe from previous command' : 'keyboard (terminal)', 1: si < segs.length - 1 ? 'pipe to next command' : 'terminal (screen)', 2: 'terminal (screen)' };
          const steps = [];
          const re = /(\d?)(>>|>&|<<<|<<|>|<|&>>|&>)\s*(&?\S+)?/g;
          let m;
          const cmd = seg.replace(re, '').trim();
          while ((m = re.exec(seg))) {
            const n = m[1] === '' ? (m[2].startsWith('<') ? 0 : 1) : +m[1];
            const op = m[2];
            let t = m[3] || '';
            if (op === '&>' || op === '&>>') {
              fd[1] = fd[2] = `file ${t} (${op === '&>>' ? 'append' : 'truncate'})`;
              steps.push(`<code>${esc(m[0])}</code>: stdout and stderr → ${esc(t)}`);
            } else if (op === '>&' || (op === '>' && t.startsWith('&'))) {
              const src = t.replace('&', '');
              fd[n] = fd[src];
              steps.push(`<code>${esc(m[0])}</code>: fd ${n} now points to where fd ${src} points <b>at this moment</b> → ${esc(fd[src])}`);
            } else if (op === '<<<') {
              fd[0] = `the string ${t}`;
              steps.push(`<code>${esc(m[0])}</code>: here string feeds stdin`);
            } else if (op === '<<') {
              fd[0] = `here document until ${t}`;
              steps.push(`<code>${esc(m[0])}</code>: here document feeds stdin`);
            } else if (op === '<') {
              fd[0] = `file ${t}`;
              steps.push(`<code>${esc(m[0])}</code>: stdin reads from ${esc(t)}`);
            } else {
              fd[n] = t === '/dev/null' ? '/dev/null (discarded)' : `file ${t} (${op === '>>' ? 'append' : 'truncate first'})`;
              steps.push(`<code>${esc(m[0])}</code>: fd ${n} → ${esc(fd[n])}`);
            }
          }
          html += `<div class="card" style="margin:.5rem 0;box-shadow:none"><b>${segs.length > 1 ? `Command ${si + 1}: ` : ''}<code>${esc(cmd)}</code></b>${steps.length ? '<ol style="font-size:.9rem">' + steps.map((s) => `<li>${s}</li>`).join('') + '</ol>' : ''}<table style="font-size:.92rem"><tr><td><code>0 stdin</code></td><td>⟵ ${esc(fd[0])}</td></tr><tr><td><code>1 stdout</code></td><td>⟶ <b>${esc(fd[1])}</b></td></tr><tr><td><code>2 stderr</code></td><td>⟶ <b>${esc(fd[2])}</b></td></tr></table></div>`;
        });
        $('#fd', el).innerHTML = html;
      };
      $('#cmd', el).addEventListener('input', analyze);
      $$('[data-c]', el).forEach((c) => c.addEventListener('click', () => (($('#cmd', el).value = c.dataset.c), analyze())));
      $('#run', el).onclick = () => {
        const c = $('#cmd', el).value;
        const f = (/(?:>>?|&>)\s*([^\s&]+)/.exec(c) || [])[1];
        ctx.runInSandbox(f && f !== '/dev/null' ? [c, `cat ${f}`] : [c]);
      };
      analyze();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'startup',
    icon: '📜',
    title: 'Which startup files does bash read?',
    obj: ['105.1'],
    desc: 'Choose login vs. non-login and interactive vs. non-interactive shells and see exactly which files bash reads, in order.',
    render(el) {
      el.innerHTML = `<div class="card"><div class="row"><label><input type="radio" name="k" value="login" checked> login shell <span class="muted">(console/ssh login, <code>su -</code>, <code>bash -l</code>)</span></label></div><div class="row"><label><input type="radio" name="k" value="inter"> interactive non-login <span class="muted">(new terminal window, <code>bash</code>, <code>su</code>)</span></label></div><div class="row"><label><input type="radio" name="k" value="script"> non-interactive <span class="muted">(<code>bash script.sh</code>, cron)</span></label></div><div class="row" style="margin-top:.6rem"><label><input type="checkbox" id="bp"> <code>~/.bash_profile</code> exists</label><label><input type="checkbox" id="bl"> <code>~/.bash_login</code> exists</label><label><input type="checkbox" id="pr" checked> <code>~/.profile</code> exists</label></div><div id="out" style="margin-top:1rem"></div></div>
        <div class="card" style="margin-top:1rem;font-size:.92rem"><ul><li>System-wide: <code>/etc/profile</code> (+ <code>/etc/profile.d/*.sh</code>) for login shells, <code>/etc/bash.bashrc</code> (Debian) or <code>/etc/bashrc</code> (RHEL) for interactive shells.</li><li>Login shells read <b>only the first</b> of <code>~/.bash_profile</code>, <code>~/.bash_login</code>, <code>~/.profile</code>.</li><li>Debian's <code>~/.profile</code> sources <code>~/.bashrc</code>, so aliases also work in login shells.</li><li><code>~/.bash_logout</code> runs when a login shell exits.</li><li>Changes take effect in new shells — or immediately with <code>source ~/.bashrc</code> (= <code>. ~/.bashrc</code>).</li><li>Non-interactive shells read the file named in <code>$BASH_ENV</code>.</li></ul></div>`;
      const draw = () => {
        const k = $('input[name=k]:checked', el).value;
        const steps = [];
        if (k === 'login') {
          steps.push(['/etc/profile', 'system-wide environment (PATH, umask …); runs /etc/profile.d/*.sh']);
          const f = $('#bp', el).checked ? '~/.bash_profile' : $('#bl', el).checked ? '~/.bash_login' : $('#pr', el).checked ? '~/.profile' : null;
          if (f) steps.push([f, 'first one found of ~/.bash_profile, ~/.bash_login, ~/.profile' + (f === '~/.profile' ? ' — on Debian it sources ~/.bashrc' : '')]);
          if (f === '~/.profile') steps.push(['~/.bashrc', 'sourced by ~/.profile (not by bash itself!)']);
          steps.push(['(on exit) ~/.bash_logout', 'cleanup when the login shell ends']);
        } else if (k === 'inter') {
          steps.push(['/etc/bash.bashrc', 'Debian (RHEL: /etc/bashrc, sourced from ~/.bashrc)']);
          steps.push(['~/.bashrc', 'aliases, functions, prompt (PS1), shell options']);
        } else steps.push(['$BASH_ENV', 'only the file named in this variable, if set — no profile, no bashrc']);
        $('#out', el).innerHTML = '<ol>' + steps.map((s) => `<li><code>${s[0]}</code> <span class="muted">— ${s[1]}</span></li>`).join('') + '</ol>';
      };
      $$('input', el).forEach((i) => i.addEventListener('change', draw));
      draw();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'pkg',
    icon: '📦',
    title: 'Debian ↔ Red Hat ↔ SUSE package commands',
    obj: ['102.4', '102.5'],
    desc: 'The same package task in dpkg/apt, rpm/yum/dnf and zypper — with a translation drill.',
    render(el, ctx) {
      const T = [
        ['install from repository', 'apt install PKG', 'dnf install PKG / yum install PKG', 'zypper install PKG'],
        ['remove', 'apt remove PKG', 'dnf remove PKG', 'zypper remove PKG'],
        ['remove incl. config files', 'apt purge PKG / dpkg -P PKG', 'rpm -e PKG (keeps changed configs as .rpmsave)', 'zypper rm PKG'],
        ['update package index', 'apt update', 'dnf makecache (automatic)', 'zypper refresh'],
        ['upgrade all packages', 'apt upgrade', 'dnf upgrade / yum update', 'zypper update'],
        ['search', 'apt search TERM / apt-cache search', 'dnf search TERM', 'zypper search TERM'],
        ['show package info', 'apt show PKG / dpkg -s PKG', 'dnf info PKG / rpm -qi PKG', 'zypper info PKG'],
        ['install a local package file', 'dpkg -i file.deb (apt install ./file.deb)', 'rpm -ivh file.rpm / dnf install ./file.rpm', 'zypper install file.rpm'],
        ['list installed packages', 'dpkg -l', 'rpm -qa', 'zypper search -i'],
        ['files of an installed package', 'dpkg -L PKG', 'rpm -ql PKG', 'rpm -ql PKG'],
        ['which package owns a file', 'dpkg -S /path/file', 'rpm -qf /path/file', 'rpm -qf /path/file'],
        ['which package provides a file (not installed)', 'apt-file search file', 'dnf provides file / yum whatprovides', 'zypper what-provides file'],
        ['dependencies', 'apt-cache depends PKG', 'rpm -qR PKG / dnf deplist', 'zypper info --requires PKG'],
        ['verify installed files', 'debsums PKG', 'rpm -V PKG', 'rpm -V PKG'],
        ['repository configuration', '/etc/apt/sources.list(.d/)', '/etc/yum.repos.d/*.repo', '/etc/zypp/repos.d/*.repo'],
        ['extract package without installing', 'dpkg-deb -x file.deb dir/', 'rpm2cpio file.rpm | cpio -idmv', 'rpm2cpio file.rpm | cpio -idmv'],
        ['reconfigure', 'dpkg-reconfigure PKG', '–', '–'],
        ['fix broken dependencies', 'apt-get install -f', 'dnf distro-sync', 'zypper verify'],
      ];
      el.innerHTML = `<div class="tbl-wrap"><table><tr><th>Task</th><th>Debian / Ubuntu</th><th>RHEL / Fedora / Rocky</th><th>openSUSE / SLES</th></tr>${T.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((x) => `<td><code>${esc(x)}</code></td>`).join('')}</tr>`).join('')}</table></div>
        <div class="card"><div class="row"><b>🎯 Translation drill</b><span class="spacer"></span><span class="muted" id="sc">0/0</span></div><p id="q"></p><div class="row"><input class="inp mono" id="a" style="flex:1" placeholder="type the command (use PKG / FILE as placeholders)"><button class="btn btn-primary" id="c">Check</button><button class="btn" id="n">Next</button></div><div id="r"></div></div>`;
      const drill = [
        ['On Debian, list all files installed by the package <code>bash</code>.', ['dpkg -L bash']],
        ['On RHEL, find which package owns <code>/etc/ssh/sshd_config</code>.', ['rpm -qf /etc/ssh/sshd_config']],
        ['On Debian, find the package that contains <code>/usr/bin/ls</code> (installed).', ['dpkg -S /usr/bin/ls', 'dpkg --search /usr/bin/ls']],
        ['Install the local file <code>htop.rpm</code> with rpm, verbose with progress hashes.', ['rpm -ivh htop.rpm', 'rpm -Uvh htop.rpm']],
        ['List all installed RPM packages.', ['rpm -qa']],
        ['Show detailed information about the installed RPM <code>bash</code>.', ['rpm -qi bash']],
        ['Remove <code>nano</code> including its configuration files on Debian (dpkg).', ['dpkg -P nano', 'dpkg --purge nano']],
        ['Refresh the repositories with zypper.', ['zypper refresh', 'zypper ref']],
        ['Search for packages matching <code>nginx</code> with dnf.', ['dnf search nginx']],
        ['Show which package provides the file <code>/usr/bin/htop</code> with yum.', ['yum provides /usr/bin/htop', 'yum whatprovides /usr/bin/htop']],
        ['Extract the contents of <code>pkg.rpm</code> into the current directory.', ['rpm2cpio pkg.rpm | cpio -idmv', 'rpm2cpio pkg.rpm | cpio -idv', 'rpm2cpio pkg.rpm | cpio -id']],
      ];
      let cur;
      let n = 0;
      let ok = 0;
      const next = () => {
        cur = drill[Math.floor(Math.random() * drill.length)];
        $('#q', el).innerHTML = cur[0];
        $('#a', el).value = '';
        $('#r', el).innerHTML = '';
        $('#a', el).focus();
      };
      const check = () => {
        n++;
        const v = $('#a', el).value.trim().replace(/\s+/g, ' ');
        const good = cur[1].some((x) => x === v);
        if (good) ok++;
        $('#sc', el).textContent = `${ok}/${n}`;
        $('#r', el).innerHTML = good ? '<div class="feedback ok">✓ Correct</div>' : `<div class="feedback no">✗ Expected: ${cur[1].map((x) => `<code>${esc(x)}</code>`).join(' or ')}</div>`;
      };
      $('#c', el).onclick = check;
      $('#n', el).onclick = next;
      $('#a', el).addEventListener('keydown', (e) => e.key === 'Enter' && check());
      next();
    },
  });

  /* ------------------------------------------------------------------ */
  def({
    id: 'fstab',
    icon: '🧾',
    title: 'fstab line builder',
    obj: ['104.3'],
    desc: 'Build /etc/fstab entries field by field with explanations of every mount option, dump and pass value.',
    render(el, ctx) {
      el.innerHTML = `<div class="card"><div class="grid grid-3"><div class="field"><label>1 · device</label><select class="inp mono" id="dev"><option>UUID=9b2e4f1a-7c3d-4e5f-a6b7-c8d9e0f1a2b3</option><option>LABEL=data</option><option>/dev/sdb1</option><option>//fileserver/share</option><option>fileserver:/export/home</option><option>tmpfs</option></select></div><div class="field"><label>2 · mount point</label><input class="inp mono" id="mnt" value="/data"></div><div class="field"><label>3 · type</label><select class="inp mono" id="ty"><option>ext4</option><option>xfs</option><option>vfat</option><option>btrfs</option><option>swap</option><option>nfs</option><option>cifs</option><option>tmpfs</option><option>iso9660</option><option>auto</option></select></div></div>
        <div class="field"><label>4 · options</label><div class="chips" id="opts">${['defaults', 'rw', 'ro', 'noauto', 'user', 'users', 'nouser', 'exec', 'noexec', 'suid', 'nosuid', 'dev', 'nodev', 'sync', 'async', 'relatime', 'noatime', 'nofail', '_netdev', 'errors=remount-ro', 'uid=1000', 'umask=0077', 'size=1G'].map((o) => `<span class="chip" data-o="${o}">${o}</span>`).join('')}</div></div>
        <div class="grid grid-2"><div class="field"><label>5 · dump</label><select class="inp" id="dump"><option>0</option><option>1</option></select></div><div class="field"><label>6 · pass (fsck order)</label><select class="inp" id="pass"><option>2</option><option>1</option><option>0</option></select></div></div>
        <div class="field"><label>Result</label><pre class="regex-out" id="out"></pre></div><div id="exp" style="font-size:.92rem"></div><button class="btn btn-sm" id="try">Append to /etc/fstab in the sandbox and mount -a</button></div>`;
      const sel = new Set(['defaults']);
      const D = { defaults: 'rw, suid, dev, exec, auto, nouser, async', rw: 'read-write', ro: 'read-only', noauto: 'not mounted by mount -a / at boot', user: 'any user may mount it; only that user (or root) may unmount; implies noexec,nosuid,nodev', users: 'any user may mount and unmount', nouser: 'only root may mount', exec: 'binaries may be executed', noexec: 'no execution of binaries', suid: 'SUID/SGID bits are honoured', nosuid: 'SUID/SGID bits are ignored', dev: 'device files are interpreted', nodev: 'device files are not interpreted', sync: 'writes go to disk immediately', async: 'writes are buffered', relatime: 'atime updated only if older than mtime/ctime (default)', noatime: 'never update access times (faster)', nofail: 'do not report errors (boot continues) if the device is missing', _netdev: 'network filesystem — wait for the network', 'errors=remount-ro': 'ext4: remount read-only on errors', 'uid=1000': 'vfat/cifs: owner of all files', 'umask=0077': 'vfat: permission mask', 'size=1G': 'tmpfs: maximum size' };
      const draw = () => {
        $$('[data-o]', el).forEach((c) => c.classList.toggle('known', sel.has(c.dataset.o)));
        const ty = $('#ty', el).value;
        const mnt = ty === 'swap' ? 'none' : $('#mnt', el).value;
        const opts = ty === 'swap' ? 'sw' : [...sel].join(',') || 'defaults';
        const line = `${$('#dev', el).value}  ${mnt}  ${ty}  ${opts}  ${$('#dump', el).value}  ${ty === 'swap' ? 0 : $('#pass', el).value}`;
        $('#out', el).textContent = '# <file system>  <mount point>  <type>  <options>  <dump>  <pass>\n' + line;
        $('#exp', el).innerHTML = '<ul>' + [...sel].map((o) => `<li><code>${o}</code>: ${D[o] || ''}</li>`).join('') + `<li><b>dump</b> ${$('#dump', el).value}: ${$('#dump', el).value === '1' ? 'back up with dump(8)' : 'not backed up by dump (usual)'}</li><li><b>pass</b> ${$('#pass', el).value}: ${{ 0: 'never checked by fsck at boot', 1: 'checked first — use for the root filesystem only', 2: 'checked after the root fs' }[$('#pass', el).value]}</li></ul>`;
        return line;
      };
      $$('[data-o]', el).forEach((c) =>
        c.addEventListener('click', () => {
          const o = c.dataset.o;
          if (sel.has(o)) sel.delete(o);
          else sel.add(o);
          draw();
        })
      );
      $$('select,input', el).forEach((x) => x.addEventListener('input', draw));
      $('#try', el).onclick = () => {
        const l = draw().replace(/^UUID=\S+|^LABEL=\S+/, '/dev/sdb1');
        ctx.runInSandbox(['sudo parted -s /dev/sdb mklabel gpt mkpart data ext4 1MiB 5GiB', `sudo mkfs.${$('#ty', el).value === 'xfs' ? 'xfs' : 'ext4'} /dev/sdb1`, `sudo mkdir -p ${$('#mnt', el).value}`, `echo '${l}' | sudo tee -a /etc/fstab`, 'sudo mount -a', 'findmnt ' + $('#mnt', el).value]);
      };
      draw();
    },
  });
})(window);
