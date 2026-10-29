/* LPIC-1 Trainer — system administration commands: users, processes, systemd,
 * hardware, disks & filesystems, time, logging, scheduling, editors, help. */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});
  const C = (SIM.cmds = SIM.cmds || {});
  const getopt = SIM.getopt;
  const sbin = (...names) => names.forEach((n) => SIM.sbin.add(n));
  SIM.optional = SIM.optional || new Set();
  const note = (s) => `\x1b[2m${s}\x1b[0m\n`;
  SIM.note = note;
  const asRoot = (sh, fn) => {
    const save = sh.fs.cred;
    sh.fs.cred = { uid: 0, gid: 0, groups: [0] };
    try {
      return fn();
    } finally {
      sh.fs.cred = save;
    }
  };
  SIM.asRoot = asRoot;
  const needRoot = (c, msg) => {
    if (c.sh.uid === 0) return false;
    c.err((msg || `${c.name}: Permission denied (are you root?)`) + '\n');
    return true;
  };
  SIM.needRoot = needRoot;

  /* ================= time helpers ================= */
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function tzParts(ms, tz) {
    try {
      const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, weekday: 'short', timeZoneName: 'short' });
      const p = {};
      for (const x of f.formatToParts(new Date(ms))) p[x.type] = x.value;
      const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
      const Y = +p.year;
      const M = +p.month - 1;
      const D = +p.day;
      const h = +p.hour % 24;
      const m = +p.minute;
      const s = +p.second;
      const asUTC = Date.UTC(Y, M, D, h, m, s);
      const off = Math.round((asUTC - Math.floor(ms / 1000) * 1000) / 60000);
      let abbr = p.timeZoneName || 'UTC';
      const TZA = { 'Europe/Berlin': off === 120 ? 'CEST' : 'CET', 'Europe/Vienna': off === 120 ? 'CEST' : 'CET', 'Europe/Zurich': off === 120 ? 'CEST' : 'CET', 'Europe/Paris': off === 120 ? 'CEST' : 'CET', 'Europe/London': off === 60 ? 'BST' : 'GMT', UTC: 'UTC', 'Asia/Tokyo': 'JST', 'Asia/Kolkata': 'IST' };
      if (TZA[tz]) abbr = TZA[tz];
      return { Y, M, D, h, m, s, wd, off, abbr };
    } catch (e) {
      const d = new Date(ms);
      return { Y: d.getUTCFullYear(), M: d.getUTCMonth(), D: d.getUTCDate(), h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), wd: d.getUTCDay(), off: 0, abbr: 'UTC' };
    }
  }
  SIM.tzParts = tzParts;
  const p2 = (n) => String(n).padStart(2, '0');
  SIM.strftime = function (fmt, ms, tz) {
    const t = tzParts(ms, tz);
    const doy = Math.floor((Date.UTC(t.Y, t.M, t.D) - Date.UTC(t.Y, 0, 1)) / 86400000) + 1;
    const offs = (t.off < 0 ? '-' : '+') + p2(Math.floor(Math.abs(t.off) / 60)) + p2(Math.abs(t.off) % 60);
    const map = {
      Y: t.Y,
      y: p2(t.Y % 100),
      C: p2(Math.floor(t.Y / 100)),
      m: p2(t.M + 1),
      d: p2(t.D),
      e: String(t.D).padStart(2),
      H: p2(t.h),
      I: p2(t.h % 12 || 12),
      M: p2(t.m),
      S: p2(t.s),
      p: t.h < 12 ? 'AM' : 'PM',
      P: t.h < 12 ? 'am' : 'pm',
      a: DAYS[t.wd].slice(0, 3),
      A: DAYS[t.wd],
      b: MONTHS[t.M].slice(0, 3),
      h: MONTHS[t.M].slice(0, 3),
      B: MONTHS[t.M],
      j: String(doy).padStart(3, '0'),
      u: t.wd || 7,
      w: t.wd,
      Z: t.abbr,
      z: offs,
      s: Math.floor(ms / 1000),
      N: String(ms % 1000).padStart(3, '0') + '000000',
      n: '\n',
      t: '\t',
      '%': '%',
      U: p2(Math.floor((doy + 6 - t.wd) / 7)),
      V: p2(Math.max(1, Math.ceil((doy - ((t.wd + 6) % 7) + 3) / 7))),
    };
    map.F = `${map.Y}-${map.m}-${map.d}`;
    map.T = `${map.H}:${map.M}:${map.S}`;
    map.R = `${map.H}:${map.M}`;
    map.D = `${map.m}/${map.d}/${map.y}`;
    map.r = `${map.I}:${map.M}:${map.S} ${map.p}`;
    map.c = `${map.a} ${map.b} ${map.e} ${map.T} ${map.Y}`;
    map.x = `${map.m}/${map.d}/${map.y}`;
    map.X = map.T;
    return fmt.replace(/%[-_0^#]?([a-zA-Z%])/g, (m, k) => {
      let v = map[k] !== undefined ? String(map[k]) : m;
      if (m[1] === '-') v = v.replace(/^[0 ]+(?=.)/, '');
      if (m[1] === '^') v = v.toUpperCase();
      return v;
    });
  };
  SIM.parseDate = function (s, base = Date.now()) {
    s = String(s).trim();
    const lower = s.toLowerCase();
    const DAY = 86400000;
    if (/^@\d+$/.test(s)) return +s.slice(1) * 1000;
    if (lower === 'now' || lower === 'today') return base;
    if (lower === 'yesterday') return base - DAY;
    if (lower === 'tomorrow') return base + DAY;
    let m = /^([+-]?\d+)\s*(second|sec|minute|min|hour|day|week|month|year)s?(\s+ago)?$/.exec(lower);
    if (!m) m = /^(next|last)\s+(second|minute|hour|day|week|month|year)$/.exec(lower) && [null, /^next/.test(lower) ? '1' : '-1', lower.split(/\s+/)[1], ''];
    if (m) {
      const n = +m[1] * (m[3] ? -1 : 1);
      const unit = { second: 1000, sec: 1000, minute: 60000, min: 60000, hour: 3600000, day: DAY, week: 7 * DAY, month: 30 * DAY, year: 365 * DAY }[m[2]];
      return base + n * unit;
    }
    m = /^(next|last)?\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/.exec(lower);
    if (m) {
      const target = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(m[2]);
      const d = new Date(base);
      let diff = (target - d.getDay() + 7) % 7;
      if (m[1] === 'last') diff = diff - 7 || -7;
      else if (diff === 0 && m[1] === 'next') diff = 7;
      return base + diff * DAY;
    }
    m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
    const t = Date.parse(s);
    return isNaN(t) ? NaN : t;
  };
  const curTZ = (sh) => sh.vars.TZ || sh.state.timezone || 'UTC';

  /* ================= users & identity ================= */
  C.whoami = (c) => c.out(c.sh.username + '\n');
  C.logname = (c) => c.out((c.sh.userStack.length ? c.sh.userStack[0].cur.name : c.sh.username) + '\n');
  C.id = (c) => {
    const { o, rest } = getopt(c.args, 'ugGnr', { user: 'u', group: 'g', groups: 'G', name: 'n' });
    const sh = c.sh;
    const u = rest[0] ? sh.user(rest[0]) : sh.cur;
    if (!u) return c.fail(`'${rest[0]}': no such user`);
    const gids = rest[0] ? sh.groupsOf(u.name) : [...new Set([sh.fs.cred.gid, ...sh.fs.cred.groups])];
    const uid = rest[0] ? u.uid : sh.uid;
    const gid = rest[0] ? u.gid : sh.fs.cred.gid;
    if (o.u) return c.out((o.n ? sh.uname(uid) : uid) + '\n');
    if (o.g) return c.out((o.n ? sh.gname(gid) : gid) + '\n');
    if (o.G) return c.out(gids.map((g) => (o.n ? sh.gname(g) : g)).join(' ') + '\n');
    c.out(`uid=${uid}(${sh.uname(uid)}) gid=${gid}(${sh.gname(gid)}) groups=${gids.map((g) => `${g}(${sh.gname(g)})`).join(',')}\n`);
  };
  C.groups = (c) => {
    const sh = c.sh;
    if (!c.args.length) return c.out(sh.fs.cred.groups.map((g) => sh.gname(g)).join(' ') + '\n');
    for (const n of c.args) {
      if (!sh.user(n)) {
        c.err(`groups: '${n}': no such user\n`);
        continue;
      }
      c.out(`${n} : ${sh.groupsOf(n).map((g) => sh.gname(g)).join(' ')}\n`);
    }
  };
  const sessions = (sh) => [
    { user: 'student', tty: 'tty2', from: '', login: '08:11', what: '/usr/libexec/gnome-session-binary', idle: '3:25m' },
    { user: 'student', tty: 'pts/0', from: '192.168.56.1', login: '09:00', what: '-bash', idle: '0.00s' },
    { user: 'alice', tty: 'pts/1', from: '10.0.0.7', login: '08:47', what: 'vim report.py', idle: '12:04' },
  ];
  C.who = (c) => {
    const { o, rest } = getopt(c.args, 'abdHlmpqrsTuw', { heading: 'H', boot: 'b', runlevel: 'r', count: 'q' });
    if (rest[0] === 'am' || o.m) {
      c.out(`${c.sh.username.padEnd(8)} pts/0        ${new Date().toISOString().slice(0, 10)} 09:00 (192.168.56.1)\n`);
      return 0;
    }
    if (o.b) return c.out(`         system boot  ${new Date(Date.now() - 12345000).toISOString().slice(0, 16).replace('T', ' ')}\n`);
    if (o.r) return c.out(`         run-level ${c.sh.state.runlevel}  ${new Date(Date.now() - 12300000).toISOString().slice(0, 16).replace('T', ' ')}\n`);
    const s = sessions(c.sh);
    if (o.q) return c.out(s.map((x) => x.user).join(' ') + `\n# users=${s.length}\n`);
    if (o.H) c.out('NAME     LINE         TIME             COMMENT\n');
    const d = new Date().toISOString().slice(0, 10);
    for (const x of s) c.out(`${x.user.padEnd(8)} ${x.tty.padEnd(12)} ${d} ${x.login}${x.from ? ` (${x.from})` : ' (:0)'}\n`);
  };
  C.users = (c) => c.out([...new Set(sessions(c.sh).map((x) => x.user))].sort().join(' ') + '\n');
  C.w = (c) => {
    const now = new Date();
    c.out(` ${now.toTimeString().slice(0, 8)} up  3:25,  3 users,  load average: 0.08, 0.12, 0.09\nUSER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT\n`);
    for (const x of sessions(c.sh)) c.out(`${x.user.padEnd(8)} ${x.tty.padEnd(8)} ${(x.from || ':0').padEnd(16)} ${x.login}   ${x.idle.padStart(6)}  0.04s  0.01s ${x.what}\n`);
  };
  C.last = (c) => {
    const rows = [
      ['student', 'pts/0', '192.168.56.1', 'Mon Oct 26 09:00', '  still logged in'],
      ['alice', 'pts/1', '10.0.0.7', 'Mon Oct 26 08:47', '  still logged in'],
      ['student', 'tty2', 'tty2', 'Mon Oct 26 08:11', '  still logged in'],
      ['reboot', 'system boot', '6.1.0-18-amd64', 'Mon Oct 26 08:10', '  still running'],
      ['student', 'pts/0', '192.168.56.1', 'Sun Oct 25 18:02', ' - 19:40  (01:38)'],
      ['bob', 'pts/0', '10.0.0.12', 'Sun Oct 25 14:20', ' - 14:21  (00:01)'],
      ['root', 'tty1', '', 'Sat Oct 24 10:00', ' - 10:15  (00:15)'],
      ['reboot', 'system boot', '6.1.0-18-amd64', 'Sat Oct 24 09:58', ' - 08:09 (1+22:11)'],
    ];
    const who = c.args.filter((a) => !a.startsWith('-'));
    const n = c.args.find((a) => /^-\d+$/.test(a));
    let list = rows.filter((r) => !who.length || who.indexOf(r[0]) >= 0 || (who[0] === 'reboot' && r[0] === 'reboot'));
    if (n) list = list.slice(0, +n.slice(1));
    for (const r of list) c.out(`${r[0].padEnd(8)} ${r[1].padEnd(12)} ${r[2].padEnd(16)} ${r[3]}${r[4]}\n`);
    c.out(`\nwtmp begins Sat Oct 24 09:58:12 2026\n`);
  };
  C.lastb = (c) => {
    if (needRoot(c, 'lastb: /var/log/btmp: Permission denied')) return 1;
    c.out(`admin    ssh:notty    203.0.113.9      Mon Oct 26 08:21 - 08:21  (00:00)\nadmin    ssh:notty    203.0.113.9      Mon Oct 26 08:21 - 08:21  (00:00)\nroot     ssh:notty    198.51.100.23    Mon Oct 26 08:31 - 08:31  (00:00)\n\nbtmp begins Mon Oct 26 08:21:44 2026\n`);
  };
  C.lastlog = (c) => {
    c.out('Username         Port     From             Latest\n');
    for (const u of c.sh.passwd()) {
      const latest = u.name === 'student' ? 'pts/0    192.168.56.1     Mon Oct 26 09:00:00 +0100 2026' : u.name === 'alice' ? 'pts/1    10.0.0.7         Mon Oct 26 08:47:10 +0100 2026' : u.name === 'root' ? 'tty1                      Sat Oct 24 10:00:12 +0100 2026' : '**Never logged in**';
      if (c.args.indexOf('-u') >= 0 && c.args[c.args.indexOf('-u') + 1] !== u.name) continue;
      c.out(`${u.name.padEnd(16)} ${latest}\n`);
    }
  };
  C.tty = (c) => c.out('/dev/pts/0\n');
  C.mesg = (c) => c.out(c.args[0] ? '' : 'is y\n');
  C.wall = (c) => {
    const msg = c.args.length ? c.args.join(' ') : c.stdin || '';
    c.out(`\nBroadcast message from ${c.sh.username}@${c.sh.state.hostname} (pts/0) (${new Date().toString().slice(0, 24)}):\n\n${msg.replace(/\n$/, '')}\n\n`);
  };
  C.write = (c) => {
    if (!c.args[0]) return c.fail('usage: write user [tty]');
    c.out(note(`(message would be written to ${c.args[0]}'s terminal)`));
  };

  function dbEdit(sh, file, fn) {
    return asRoot(sh, () => {
      const text = sh.fs.readFile(file, '/');
      let ls = text.split('\n');
      if (ls[ls.length - 1] === '') ls.pop();
      ls = fn(ls);
      sh.fs.writeFile(file, '/', ls.join('\n') + '\n');
    });
  }
  SIM.dbEdit = dbEdit;
  const shadowDays = () => Math.floor(Date.now() / 86400000);
  const fakeHash = () => '$6$' + Math.random().toString(36).slice(2, 10) + '$' + Array.from({ length: 86 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./'[Math.floor(Math.random() * 64)]).join('');
  SIM.fakeHash = fakeHash;

  C.useradd = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'mMd:s:u:g:G:c:e:f:rk:DNUop:', {
      'create-home': 'm',
      'no-create-home': 'M',
      'home-dir=': 'd',
      'shell=': 's',
      'uid=': 'u',
      'gid=': 'g',
      'groups=': 'G',
      'comment=': 'c',
      'expiredate=': 'e',
      'inactive=': 'f',
      system: 'r',
      'skel=': 'k',
      defaults: 'D',
      'password=': 'p',
    });
    if (o.D && !rest.length) {
      c.out(asRoot(sh, () => sh.fs.readFile('/etc/default/useradd', '/')).replace(/^#.*\n/gm, '').replace(/^(\w+)=/gm, '$1='));
      return 0;
    }
    if (needRoot(c, 'useradd: Permission denied.\nuseradd: cannot lock /etc/passwd; try again later.')) return 1;
    const name = rest[0];
    if (!name) {
      c.err('Usage: useradd [options] LOGIN\n');
      return 2;
    }
    if (!/^[a-z_][a-z0-9_-]*\$?$/.test(name)) return c.fail(`invalid user name '${name}'`, 3);
    if (sh.user(name)) return c.fail(`user '${name}' already exists`, 9);
    const users = sh.passwd();
    let uid;
    if (o.u) {
      uid = +o.u;
      if (users.some((u) => u.uid === uid) && !o.o) return c.fail(`UID ${uid} is not unique`, 4);
    } else {
      const lo = o.r ? 100 : 1000;
      const hi = o.r ? 999 : 60000;
      uid = Math.max(lo - 1, ...users.filter((u) => u.uid >= lo && u.uid <= hi).map((u) => u.uid)) + 1;
    }
    let gid;
    const groups = sh.groupDb();
    if (o.g) {
      const g = /^\d+$/.test(o.g) ? groups.find((x) => x.gid === +o.g) : groups.find((x) => x.name === o.g);
      if (!g) return c.fail(`group '${o.g}' does not exist`, 6);
      gid = g.gid;
    } else if (o.N) gid = 100;
    else {
      if (groups.some((g) => g.name === name)) return c.fail(`group ${name} exists - if you want to add this user to that group, use -g.`, 9);
      gid = groups.some((g) => g.gid === uid) ? Math.max(...groups.filter((g) => g.gid >= 1000 && g.gid < 60000).map((g) => g.gid), 999) + 1 : uid;
      dbEdit(sh, '/etc/group', (l) => [...l, `${name}:x:${gid}:`]);
      dbEdit(sh, '/etc/gshadow', (l) => [...l, `${name}:!::`]);
    }
    const extra = o.G ? o.G.split(',') : [];
    for (const g of extra) if (!sh.group(g)) return c.fail(`group '${g}' does not exist`, 6);
    const home = o.d || '/home/' + name;
    const shell = o.s || (o.r ? '/usr/sbin/nologin' : '/bin/sh');
    dbEdit(sh, '/etc/passwd', (l) => [...l, `${name}:x:${uid}:${gid}:${o.c || ''}:${home}:${shell}`]);
    const expire = o.e ? Math.floor(new Date(o.e).getTime() / 86400000) : '';
    dbEdit(sh, '/etc/shadow', (l) => [...l, `${name}:${o.p || '!'}:${shadowDays()}:0:99999:7:${o.f || ''}:${expire}:`]);
    if (extra.length)
      dbEdit(sh, '/etc/group', (l) =>
        l.map((line) => {
          const p = line.split(':');
          if (extra.indexOf(p[0]) >= 0) p[3] = p[3] ? p[3] + ',' + name : name;
          return p.join(':');
        })
      );
    if (o.m && !o.M) {
      if (sh.fs.exists(home)) c.err(`useradd: warning: the home directory ${home} already exists.\nuseradd: Not copying any file from skel directory into it.\n`);
      else {
        const skel = o.k || '/etc/skel';
        sh.fs.copyTree(skel, home, '/', false);
        sh.fs.walk(home, '/', (p, n) => {
          n.uid = uid;
          n.gid = gid;
        });
        sh.fs.lookup(home, '/').node.mode = 0o750;
      }
    }
    return 0;
  };
  sbin('useradd');
  C.adduser = (c) => {
    if (needRoot(c, 'adduser: Only root may add a user or group to the system.')) return 1;
    const a = c.args.filter((x) => !x.startsWith('-'));
    if (a.length === 2) return C.usermod({ ...c, args: ['-aG', a[1], a[0]] }) || (c.out(`Adding user \`${a[0]}' to group \`${a[1]}' ...\nDone.\n`), 0);
    const name = a[0];
    const st = C.useradd({ ...c, args: ['-m', '-s', '/bin/bash', name] });
    if (st) return st;
    const u = c.sh.user(name);
    c.out(`Adding user \`${name}' ...\nAdding new group \`${name}' (${u.gid}) ...\nAdding new user \`${name}' (${u.uid}) with group \`${name} (${u.gid})' ...\nCreating home directory \`/home/${name}' ...\nCopying files from \`/etc/skel' ...\n`);
    const pw = c.sh.promptFn ? c.sh.promptFn(`New password for ${name}:`, true) : 'x';
    if (pw) {
      dbEdit(c.sh, '/etc/shadow', (l) => l.map((x) => (x.startsWith(name + ':') ? x.replace(/^([^:]*):[^:]*/, `$1:${fakeHash()}`) : x)));
      c.out('passwd: password updated successfully\n');
    }
    c.out(`Changing the user information for ${name}\nEnter the new value, or press ENTER for the default\n\tFull Name []: \n\tRoom Number []: \n\tWork Phone []: \n\tHome Phone []: \n\tOther []: \nIs the information correct? [Y/n] Y\n`);
  };
  sbin('adduser');
  C.userdel = (c) => {
    const { o, rest } = getopt(c.args, 'rf', { remove: 'r', force: 'f' });
    if (needRoot(c, 'userdel: Permission denied.\nuserdel: cannot lock /etc/passwd; try again later.')) return 1;
    const name = rest[0];
    const u = c.sh.user(name);
    if (!u) return c.fail(`user '${name}' does not exist`, 6);
    if (name === c.sh.username || (c.sh.userStack.length && c.sh.userStack[0].cur.name === name && !o.f)) return c.fail(`user ${name} is currently used by process 1990`, 8);
    const sh = c.sh;
    dbEdit(sh, '/etc/passwd', (l) => l.filter((x) => !x.startsWith(name + ':')));
    dbEdit(sh, '/etc/shadow', (l) => l.filter((x) => !x.startsWith(name + ':')));
    dbEdit(sh, '/etc/group', (l) =>
      l
        .filter((x) => {
          const p = x.split(':');
          return !(p[0] === name && +p[2] === u.gid && !p[3]);
        })
        .map((x) => {
          const p = x.split(':');
          p[3] = (p[3] || '').split(',').filter((m) => m && m !== name).join(',');
          return p.join(':');
        })
    );
    dbEdit(sh, '/etc/gshadow', (l) => l.filter((x) => !x.startsWith(name + ':')));
    if (o.r) {
      if (sh.fs.exists(u.home)) sh.fs.rmtree(u.home, '/');
      if (sh.fs.exists('/var/mail/' + name)) sh.fs.unlink('/var/mail/' + name, '/');
      else c.err(`userdel: ${name} mail spool (/var/mail/${name}) not found\n`);
    }
    return 0;
  };
  sbin('userdel', 'deluser');
  C.deluser = (c) => C.userdel({ ...c, args: c.args.map((a) => (a === '--remove-home' ? '-r' : a)) });
  C.usermod = (c) => {
    const { o, rest } = getopt(c.args, 'aG:g:s:d:ml:LUc:e:u:f:', { append: 'a', 'groups=': 'G', 'gid=': 'g', 'shell=': 's', 'home=': 'd', 'move-home': 'm', 'login=': 'l', lock: 'L', unlock: 'U', 'comment=': 'c', 'expiredate=': 'e', 'uid=': 'u' });
    if (needRoot(c, 'usermod: Permission denied.\nusermod: cannot lock /etc/passwd; try again later.')) return 1;
    const sh = c.sh;
    const name = rest[0];
    const u = sh.user(name);
    if (!u) return c.fail(`user '${name}' does not exist`, 6);
    if (o.G) {
      const want = o.G.split(',').filter(Boolean);
      for (const g of want) if (!sh.group(g)) return c.fail(`group '${g}' does not exist`, 6);
      dbEdit(sh, '/etc/group', (l) =>
        l.map((line) => {
          const p = line.split(':');
          let mem = (p[3] || '').split(',').filter(Boolean);
          if (want.indexOf(p[0]) >= 0) {
            if (mem.indexOf(name) < 0) mem.push(name);
          } else if (!o.a) mem = mem.filter((m) => m !== name);
          p[3] = mem.join(',');
          return p.join(':');
        })
      );
    } else if (o.a) return c.fail('-a flag is ONLY allowed with the -G flag', 2);
    const editPw = (idx, val) =>
      dbEdit(sh, '/etc/passwd', (l) =>
        l.map((line) => {
          const p = line.split(':');
          if (p[0] === name) p[idx] = val;
          return p.join(':');
        })
      );
    if (o.g) {
      const g = /^\d+$/.test(o.g) ? sh.group(+o.g) : sh.group(o.g);
      if (!g) return c.fail(`group '${o.g}' does not exist`, 6);
      editPw(3, g.gid);
    }
    if (o.s) editPw(6, o.s);
    if (o.c !== undefined) editPw(4, o.c);
    if (o.u) editPw(2, o.u);
    if (o.d) {
      if (o.m && sh.fs.exists(u.home)) sh.fs.rename(u.home, o.d, '/');
      editPw(5, o.d);
    }
    const editSh = (fn) =>
      dbEdit(sh, '/etc/shadow', (l) =>
        l.map((line) => {
          const p = line.split(':');
          if (p[0] === name) fn(p);
          return p.join(':');
        })
      );
    if (o.L) editSh((p) => !p[1].startsWith('!') && (p[1] = '!' + p[1]));
    if (o.U) editSh((p) => (p[1] = p[1].replace(/^!/, '')));
    if (o.e !== undefined) editSh((p) => (p[7] = o.e === '' || o.e === '-1' ? '' : String(Math.floor(new Date(o.e).getTime() / 86400000))));
    if (o.f !== undefined) editSh((p) => (p[6] = o.f));
    if (o.l) {
      for (const f of ['/etc/passwd', '/etc/shadow']) dbEdit(sh, f, (l) => l.map((x) => (x.startsWith(name + ':') ? o.l + x.slice(name.length) : x)));
      dbEdit(sh, '/etc/group', (l) => l.map((x) => x.replace(new RegExp(`([:,])${name}(?=,|$)`, 'g'), `$1${o.l}`)));
    }
    return 0;
  };
  sbin('usermod');
  C.groupadd = (c) => {
    const { o, rest } = getopt(c.args, 'g:rfo', { 'gid=': 'g', system: 'r', force: 'f' });
    if (needRoot(c, 'groupadd: Permission denied.\ngroupadd: cannot lock /etc/group; try again later.')) return 1;
    const name = rest[0];
    if (!name) return c.fail('Usage: groupadd [options] GROUP', 2);
    if (c.sh.group(name)) {
      if (o.f) return 0;
      return c.fail(`group '${name}' already exists`, 9);
    }
    const gs = c.sh.groupDb();
    let gid = o.g ? +o.g : Math.max(o.r ? 99 : 999, ...gs.filter((g) => (o.r ? g.gid < 1000 && g.gid >= 100 : g.gid >= 1000 && g.gid < 60000)).map((g) => g.gid)) + 1;
    if (o.g && gs.some((g) => g.gid === gid) && !o.o) return c.fail(`GID '${gid}' already exists`, 4);
    dbEdit(c.sh, '/etc/group', (l) => [...l, `${name}:x:${gid}:`]);
    dbEdit(c.sh, '/etc/gshadow', (l) => [...l, `${name}:!::`]);
  };
  sbin('groupadd', 'groupdel', 'groupmod', 'addgroup', 'delgroup');
  C.addgroup = C.groupadd;
  C.groupdel = (c) => {
    if (needRoot(c, 'groupdel: Permission denied.')) return 1;
    const name = c.args[0];
    const g = c.sh.group(name);
    if (!g) return c.fail(`group '${name}' does not exist`, 6);
    const prim = c.sh.passwd().find((u) => u.gid === g.gid);
    if (prim) return c.fail(`cannot remove the primary group of user '${prim.name}'`, 8);
    dbEdit(c.sh, '/etc/group', (l) => l.filter((x) => !x.startsWith(name + ':')));
    dbEdit(c.sh, '/etc/gshadow', (l) => l.filter((x) => !x.startsWith(name + ':')));
  };
  C.delgroup = C.groupdel;
  C.groupmod = (c) => {
    const { o, rest } = getopt(c.args, 'n:g:', { 'new-name=': 'n', 'gid=': 'g' });
    if (needRoot(c, 'groupmod: Permission denied.')) return 1;
    const name = rest[0];
    if (!c.sh.group(name)) return c.fail(`group '${name}' does not exist`, 6);
    dbEdit(c.sh, '/etc/group', (l) =>
      l.map((x) => {
        const p = x.split(':');
        if (p[0] === name) {
          if (o.n) p[0] = o.n;
          if (o.g) p[2] = o.g;
        }
        return p.join(':');
      })
    );
  };
  C.gpasswd = (c) => {
    const { o, rest } = getopt(c.args, 'a:d:M:A:rR', { 'add=': 'a', 'delete=': 'd', 'members=': 'M', 'administrators=': 'A' });
    if (needRoot(c, 'gpasswd: Permission denied.')) return 1;
    const g = rest[0];
    if (!c.sh.group(g)) return c.fail(`group '${g}' does not exist in /etc/group`, 3);
    dbEdit(c.sh, '/etc/group', (l) =>
      l.map((x) => {
        const p = x.split(':');
        if (p[0] !== g) return x;
        let m = (p[3] || '').split(',').filter(Boolean);
        if (o.a && m.indexOf(o.a) < 0) m.push(o.a);
        if (o.d) m = m.filter((u) => u !== o.d);
        if (o.M !== undefined) m = o.M.split(',').filter(Boolean);
        p[3] = m.join(',');
        return p.join(':');
      })
    );
    if (o.a) c.out(`Adding user ${o.a} to group ${g}\n`);
    if (o.d) c.out(`Removing user ${o.d} from group ${g}\n`);
  };
  C.newgrp = (c) => {
    const g = c.sh.group(c.args[0] || c.sh.gname(c.sh.cur.gid));
    if (!g) return c.fail(`group '${c.args[0]}' does not exist`);
    if (c.sh.uid !== 0 && c.sh.groupsOf(c.sh.username).indexOf(g.gid) < 0) {
      const pw = c.sh.promptFn ? c.sh.promptFn('Password:', true) : null;
      if (!pw) return c.fail('failed to crypt password with previous salt: Invalid argument');
    }
    c.sh.fs.cred = { ...c.sh.fs.cred, gid: g.gid, groups: [...new Set([g.gid, ...c.sh.fs.cred.groups])] };
  };
  C.passwd = (c) => {
    const { o, rest } = getopt(c.args, 'lusdeSn:x:w:i:a', { lock: 'l', unlock: 'u', status: 'S', delete: 'd', expire: 'e', all: 'a' });
    const sh = c.sh;
    const name = rest[0] || sh.username;
    if (!sh.user(name)) return c.fail(`user '${name}' does not exist`);
    if (name !== sh.username && sh.uid !== 0) return c.fail(`You may not view or modify password information for ${name}.`);
    const shadowLine = () => asRoot(sh, () => sh.fs.readFile('/etc/shadow', '/')).split('\n').find((l) => l.startsWith(name + ':'));
    const edit = (fn) =>
      dbEdit(sh, '/etc/shadow', (l) =>
        l.map((line) => {
          const p = line.split(':');
          if (p[0] === name) fn(p);
          return p.join(':');
        })
      );
    if (o.S) {
      const p = (shadowLine() || '').split(':');
      const st = p[1].startsWith('!') || p[1] === '*' ? 'L' : p[1] === '' ? 'NP' : 'P';
      const d = new Date(+p[2] * 86400000).toISOString().slice(0, 10);
      c.out(`${name} ${st} ${d} ${p[3] || 0} ${p[4] || 99999} ${p[5] || 7} ${p[6] || -1}\n`);
      return 0;
    }
    if ((o.l || o.u || o.d || o.e || o.n || o.x || o.w || o.i) && needRoot(c, 'passwd: Permission denied.')) return 1;
    if (o.l) {
      edit((p) => !p[1].startsWith('!') && (p[1] = '!' + p[1]));
      return c.out(`passwd: password changed.\n`);
    }
    if (o.u) {
      edit((p) => (p[1] = p[1].replace(/^!/, '')));
      return c.out(`passwd: password changed.\n`);
    }
    if (o.d) {
      edit((p) => (p[1] = ''));
      return c.out(`passwd: password changed.\n`);
    }
    if (o.e) {
      edit((p) => (p[2] = '0'));
      return c.out(`passwd: password changed.\n`);
    }
    if (o.n || o.x || o.w || o.i) {
      edit((p) => {
        if (o.n) p[3] = o.n;
        if (o.x) p[4] = o.x;
        if (o.w) p[5] = o.w;
        if (o.i) p[6] = o.i;
      });
      return c.out(`passwd: password changed.\n`);
    }
    c.out(`Changing password for ${name}.\n`);
    if (sh.uid !== 0) {
      const cur = sh.promptFn ? sh.promptFn('Current password:', true) : 'x';
      if (cur === null) return c.fail('Authentication token manipulation error', 10);
    }
    const p1 = sh.promptFn ? sh.promptFn('New password:', true) : 'Secret123!';
    if (p1 === null) return c.fail('Authentication token manipulation error', 10);
    if (sh.uid !== 0 && p1.length < 6) {
      c.err('BAD PASSWORD: The password is shorter than 6 characters\n');
      return 10;
    }
    const p2 = sh.promptFn ? sh.promptFn('Retype new password:', true) : p1;
    if (p1 !== p2) {
      c.err('Sorry, passwords do not match.\npasswd: Authentication token manipulation error\npasswd: password unchanged\n');
      return 10;
    }
    edit((p) => {
      p[1] = fakeHash();
      p[2] = String(shadowDays());
    });
    c.out('passwd: password updated successfully\n');
  };
  C.chpasswd = (c) => {
    if (needRoot(c)) return 1;
    for (const l of (c.stdin || '').split('\n').filter(Boolean)) {
      const [u] = l.split(':');
      dbEdit(c.sh, '/etc/shadow', (ls) => ls.map((x) => (x.startsWith(u + ':') ? x.replace(/^([^:]*):[^:]*/, `$1:${fakeHash()}`) : x)));
    }
  };
  sbin('chpasswd', 'vipw', 'vigr', 'visudo', 'pwck', 'grpck');
  C.chage = (c) => {
    const { o, rest } = getopt(c.args, 'lm:M:W:I:E:d:', { list: 'l', 'mindays=': 'm', 'maxdays=': 'M', 'warndays=': 'W', 'inactive=': 'I', 'expiredate=': 'E', 'lastday=': 'd' });
    const sh = c.sh;
    const name = rest[0];
    if (!name || !sh.user(name)) return c.fail(`user '${name || ''}' does not exist in /etc/passwd`);
    if (!(o.l && name === sh.username) && needRoot(c, 'chage: Permission denied.')) return 1;
    const line = asRoot(sh, () => sh.fs.readFile('/etc/shadow', '/')).split('\n').find((l) => l.startsWith(name + ':'));
    const p = line.split(':');
    const fmt = (days) => (days === '' || days === undefined ? 'never' : new Date(+days * 86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }));
    if (o.l || !Object.keys(o).length) {
      const last = +p[2];
      const max = p[4] === '' ? 99999 : +p[4];
      c.out(`Last password change\t\t\t\t\t: ${p[2] === '0' ? 'password must be changed' : fmt(p[2])}
Password expires\t\t\t\t\t: ${max >= 99999 ? 'never' : fmt(last + max)}
Password inactive\t\t\t\t\t: ${p[6] && max < 99999 ? fmt(last + max + +p[6]) : 'never'}
Account expires\t\t\t\t\t\t: ${fmt(p[7])}
Minimum number of days between password change\t\t: ${p[3] || 0}
Maximum number of days between password change\t\t: ${max}
Number of days of warning before password expires\t: ${p[5] || 7}
`);
      return 0;
    }
    dbEdit(sh, '/etc/shadow', (l) =>
      l.map((x) => {
        const q = x.split(':');
        if (q[0] !== name) return x;
        if (o.d !== undefined) q[2] = /^\d+$/.test(o.d) ? o.d : String(Math.floor(new Date(o.d).getTime() / 86400000));
        if (o.m !== undefined) q[3] = o.m;
        if (o.M !== undefined) q[4] = o.M;
        if (o.W !== undefined) q[5] = o.W;
        if (o.I !== undefined) q[6] = o.I === '-1' ? '' : o.I;
        if (o.E !== undefined) q[7] = o.E === '-1' ? '' : /^\d+$/.test(o.E) ? o.E : String(Math.floor(new Date(o.E).getTime() / 86400000));
        return q.join(':');
      })
    );
  };
  C.getent = (c) => {
    const [db, ...keys] = c.args;
    const sh = c.sh;
    const files = { passwd: '/etc/passwd', group: '/etc/group', shadow: '/etc/shadow', gshadow: '/etc/gshadow', services: '/etc/services', hosts: '/etc/hosts', ahosts: null, ahostsv4: null, protocols: null, networks: null };
    if (!(db in files)) return c.fail(`Unknown database: ${db}`, 1);
    if (/^ahosts/.test(db)) {
      let st = 0;
      for (const k of keys) {
        const r = SIM.resolve(sh, k);
        if (!r) {
          st = 2;
          continue;
        }
        const ips = [r.ip].concat(db === 'ahosts' && k === 'localhost' ? ['::1'] : []);
        for (const ip of ips) for (const t of ['STREAM', 'DGRAM', 'RAW']) c.out(`${ip.padEnd(15)} ${t}${t === 'STREAM' ? ' ' + r.name : ''}\n`);
      }
      return st;
    }
    if ((db === 'shadow' || db === 'gshadow') && sh.uid !== 0) return 0;
    if (db === 'hosts') {
      if (!keys.length) {
        for (const l of sh.fs.readFile('/etc/hosts', '/').split('\n')) if (l && !l.startsWith('#')) c.out(l.replace(/\s+/, '       ') + '\n');
        return 0;
      }
      let st = 0;
      for (const k of keys) {
        const r = SIM.resolve(sh, k);
        if (r) c.out(`${r.ip.padEnd(15)} ${r.name}\n`);
        else st = 2;
      }
      return st;
    }
    const ls = asRoot(sh, () => sh.fs.readFile(files[db], '/')).split('\n').filter((l) => l && !l.startsWith('#'));
    if (!keys.length) {
      ls.forEach((l) => c.out(l + '\n'));
      return 0;
    }
    let st = 0;
    for (const k of keys) {
      const hit = ls.find((l) => {
        const p = l.split(/[:\s]+/);
        if (db === 'services') return p[0] === k || p[1] === k || p[1].split('/')[0] === k;
        return p[0] === k || (/^\d+$/.test(k) && p[2] === k);
      });
      if (hit) c.out(hit + '\n');
      else st = 2;
    }
    return st;
  };
  C.pwck = (c) => {
    if (needRoot(c)) return 1;
    c.out('user \'sync\': directory \'/bin\' is not a valid home directory\npwck: no changes\n');
  };
  C.grpck = (c) => (needRoot(c) ? 1 : 0);
  C.chsh = (c) => {
    const { o, rest } = getopt(c.args, 's:l', { 'shell=': 's', 'list-shells': 'l' });
    const name = rest[0] || c.sh.username;
    if (o.l) return c.out(c.fs.readFile('/etc/shells', '/').replace(/^#.*\n/gm, ''));
    let shell = o.s;
    if (!shell && c.sh.promptFn) shell = c.sh.promptFn('Login Shell [/bin/bash]:');
    if (!shell) return 0;
    if (!c.fs.readFile('/etc/shells', '/').split('\n').includes(shell)) return c.fail(`${shell} is an invalid shell`);
    if (name !== c.sh.username && needRoot(c, 'chsh: You may not change the shell for \'' + name + '\'.')) return 1;
    dbEdit(c.sh, '/etc/passwd', (l) => l.map((x) => (x.startsWith(name + ':') ? x.replace(/:[^:]*$/, ':' + shell) : x)));
  };
  C.chfn = (c) => {
    const { o, rest } = getopt(c.args, 'f:r:w:h:', {});
    const name = rest[0] || c.sh.username;
    if (o.f) dbEdit(c.sh, '/etc/passwd', (l) => l.map((x) => (x.startsWith(name + ':') ? x.replace(/^((?:[^:]*:){4})[^:]*/, `$1${o.f},,,`) : x)));
  };

  /* ---- su / sudo ---- */
  C.su = (c) => {
    const sh = c.sh;
    let args = c.args.slice();
    let login = false;
    let cmd = null;
    let shellOpt = null;
    while (args.length) {
      const a = args[0];
      if (a === '-' || a === '-l' || a === '--login') {
        login = true;
        args.shift();
      } else if (a === '-c' || a === '--command') {
        cmd = args[1];
        args = args.slice(2);
      } else if (a === '-s' || a === '--shell') {
        shellOpt = args[1];
        args = args.slice(2);
      } else break;
    }
    const target = args[0] || 'root';
    const u = sh.user(target);
    if (!u) return c.fail(`user ${target} does not exist or the user entry does not contain all the required fields`);
    if (sh.uid !== 0) {
      const pw = sh.promptFn ? sh.promptFn(`Password for ${target}:`, true) : null;
      if (pw === null || pw === '') {
        c.err('su: Authentication failure\n');
        return 1;
      }
      const sl = asRoot(sh, () => sh.fs.readFile('/etc/shadow', '/')).split('\n').find((l) => l.startsWith(target + ':')) || '';
      if (sl.split(':')[1].startsWith('!')) {
        c.err('su: Authentication failure\n');
        return 1;
      }
      SIM.authLog(sh, `su[${sh.state.nextPid++}]: (to ${target}) ${sh.username} on pts/0`);
    }
    if (/nologin|false/.test(u.shell) && !shellOpt) {
      c.out('This account is currently not available.\n');
      return 1;
    }
    if (cmd !== null) {
      sh.pushUser(target, login);
      try {
        return sh.runSource(cmd, c.io);
      } catch (e) {
        if (e instanceof SIM.Flow && e.kind === 'exit') return e.code;
        throw e;
      } finally {
        sh.popUser();
      }
    }
    sh.pushUser(target, login);
    if (c.sh.onEvent) c.sh.onEvent('note', `(now ${target}; type "exit" to return to ${sh.userStack[sh.userStack.length - 1].cur.name})`);
    return 0;
  };
  C.sudoedit = (c) => C.sudo({ ...c, args: ['-e'].concat(c.args) });
  C.sudo = (c) => {
    const sh = c.sh;
    let args = c.args.slice();
    let user = 'root';
    let mode = null;
    while (args.length && args[0].startsWith('-')) {
      const a = args.shift();
      if (a === '-u') user = args.shift();
      else if (a === '-i' || a === '--login') mode = 'i';
      else if (a === '-s' || a === '--shell') mode = 's';
      else if (a === '-l' || a === '--list') mode = 'l';
      else if (a === '-k' || a === '-K') mode = 'k';
      else if (a === '-v') mode = 'v';
      else if (a === '-e' || a === '--edit') mode = 'e';
      else if (a === '-E') {
        /* preserve env */
      } else if (a === '--') break;
      else return c.fail(`invalid option -- '${a.replace(/^-+/, '')}'`);
    }
    const allowed = sh.uid === 0 || sh.groupsOf(sh.username).indexOf(27) >= 0;
    if (!allowed) {
      if (sh.promptFn) sh.promptFn(`[sudo] password for ${sh.username}:`, true);
      c.err(`${sh.username} is not in the sudoers file.\nThis incident has been reported to the administrator.\n`);
      SIM.authLog(sh, `sudo: ${sh.username} : user NOT in sudoers ; TTY=pts/0 ; PWD=${sh.cwd} ; USER=root ; COMMAND=${args.join(' ')}`);
      return 1;
    }
    if (mode === 'k') {
      sh.sudoTs = 0;
      return 0;
    }
    if (sh.uid !== 0 && (!sh.sudoTs || Date.now() - sh.sudoTs > 15 * 60000)) {
      const pw = sh.promptFn ? sh.promptFn(`[sudo] password for ${sh.username}:`, true) : 'x';
      if (pw === null || pw === '') {
        c.err('sudo: a password is required\n');
        return 1;
      }
      sh.sudoTs = Date.now();
    }
    if (mode === 'v') return 0;
    if (mode === 'e') {
      if (!args.length) return c.fail('usage: sudoedit file ...');
      args = [(sh.vars.SUDO_EDITOR || sh.vars.VISUAL || sh.vars.EDITOR || 'nano').split('/').pop()].concat(args);
    }
    if (mode === 'l') {
      c.out(`Matching Defaults entries for ${sh.username} on ${sh.state.hostname}:\n    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin\n\nUser ${sh.username} may run the following commands on ${sh.state.hostname}:\n    (ALL : ALL) ALL\n`);
      return 0;
    }
    if (mode === 'i' || mode === 's' || !args.length) {
      if (!args.length && !mode) {
        c.err('usage: sudo -h | -K | -k | -V\nusage: sudo [-u user] [-i | -s] [command]\n');
        return 1;
      }
      if (!args.length) {
        sh.pushUser(user, mode === 'i');
        if (sh.onEvent) sh.onEvent('note', `(now ${user}; type "exit" to return)`);
        return 0;
      }
    }
    SIM.authLog(sh, `sudo:  ${sh.username} : TTY=pts/0 ; PWD=${sh.cwd} ; USER=${user} ; COMMAND=${args.join(' ')}`);
    const savePath = sh.vars.PATH;
    sh.pushUser(user, false);
    sh.vars.PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
    try {
      return sh.runArgv(args, c.io);
    } catch (e) {
      if (e instanceof SIM.Flow && e.kind === 'exit') return e.code;
      throw e;
    } finally {
      sh.popUser();
      sh.vars.PATH = savePath;
    }
  };
  SIM.authLog = (sh, msg) => {
    try {
      asRoot(sh, () => sh.fs.writeFile('/var/log/auth.log', '/', `${SIM.strftime('%b %e %H:%M:%S', Date.now(), curTZ(sh))} ${sh.state.hostname} ${msg}\n`, { append: true }));
    } catch (e) {
      /* */
    }
  };

  /* ================= processes ================= */
  const SIGNALS = ['HUP', 'INT', 'QUIT', 'ILL', 'TRAP', 'ABRT', 'BUS', 'FPE', 'KILL', 'USR1', 'SEGV', 'USR2', 'PIPE', 'ALRM', 'TERM', 'STKFLT', 'CHLD', 'CONT', 'STOP', 'TSTP', 'TTIN', 'TTOU', 'URG', 'XCPU', 'XFSZ', 'VTALRM', 'PROF', 'WINCH', 'POLL', 'PWR', 'SYS'];
  SIM.SIGNALS = SIGNALS;
  const sigNum = (s) => {
    if (/^\d+$/.test(s)) return +s;
    const n = s.toUpperCase().replace(/^SIG/, '');
    const i = SIGNALS.indexOf(n === 'IO' ? 'POLL' : n);
    return i < 0 ? null : i + 1;
  };
  SIM.sigNum = sigNum;
  // full process table including shell, jobs
  SIM.procTable = function (sh, extra) {
    const now = Date.now();
    const list = sh.state.procs.map((p) => Object.assign({}, p));
    for (const j of sh.jobs) {
      if (j.end > now && !j.killed) list.push({ pid: j.pid, ppid: 1990, user: j.user, cmd: j.text.replace(/\s*&$/, '').replace(/^(nice(\s+-n)?\s+-?\d+|nohup|exec)\s+/, ''), ni: j.ni || 0, stat: j.stopped ? 'T' : j.ni > 0 ? 'SN' : j.ni < 0 ? 'S<' : 'S', tty: 'pts/0', cpu: 0.0, mem: 0.0, vsz: 7400, rss: 1000, start: new Date(j.start).toTimeString().slice(0, 5), job: j });
    }
    if (sh.userStack.length) list.push({ pid: 2000 + sh.userStack.length, ppid: 1990, user: sh.username, cmd: '-bash', ni: 0, stat: 'S', tty: 'pts/0', cpu: 0, mem: 0.1, vsz: 8960, rss: 5200, start: '09:10' });
    if (extra) list.push({ pid: sh.state.nextPid++, ppid: 1990, user: sh.username, cmd: extra, ni: 0, stat: 'R+', tty: 'pts/0', cpu: 0, mem: 0.1, vsz: 11200, rss: 4100, start: new Date().toTimeString().slice(0, 5) });
    return list.sort((a, b) => a.pid - b.pid);
  };
  const comm = (p) => {
    const first = p.cmd.replace(/^-/, '').split(' ')[0];
    if (/^\[/.test(p.cmd)) return p.cmd.replace(/[[\]]/g, '');
    return first.split('/').pop().replace(/:$/, '');
  };
  SIM.procComm = comm;
  C.ps = (c) => {
    const sh = c.sh;
    let args = c.args.slice();
    let bsd = '';
    if (args.length && /^[a-zA-Z]+$/.test(args[0]) && !args[0].startsWith('-')) bsd = args.shift();
    const { o } = getopt(args, 'efFlaxAu:p:o:C:jHMNTwyU:g:G:t:', { 'forest': 'forest', 'sort=': 'sort', 'pid=': 'p', 'user=': 'u', 'format=': 'o', 'ppid=': 'ppid', 'no-headers': 'noh' });
    const all = sh.state.procs;
    let list = SIM.procTable(sh, 'ps ' + c.args.join(' '));
    const everyone = o.e || o.A || /a/.test(bsd) && /x/.test(bsd) || o.a;
    if (o.u || o.U) {
      const us = (o.u || o.U).split(',');
      list = list.filter((p) => us.indexOf(p.user) >= 0 || us.indexOf(String((sh.user(p.user) || {}).uid)) >= 0);
    } else if (o.p) list = list.filter((p) => o.p.split(',').map(Number).indexOf(p.pid) >= 0);
    else if (o.C) list = list.filter((p) => o.C.split(',').indexOf(comm(p)) >= 0);
    else if (o.ppid) list = list.filter((p) => o.ppid.split(',').map(Number).indexOf(p.ppid) >= 0);
    else if (!everyone && !/x/.test(bsd)) list = list.filter((p) => p.tty === 'pts/0');
    else if (/x/.test(bsd) && !/a/.test(bsd)) list = list.filter((p) => p.user === sh.username);
    if (o.sort) {
      const k = o.sort.replace(/^[-+]/, '');
      const desc = o.sort[0] === '-';
      const val = (p) => ({ pid: p.pid, '%cpu': p.cpu, pcpu: p.cpu, '%mem': p.mem, pmem: p.mem, rss: p.rss, ni: p.ni, user: p.user, cmd: p.cmd, comm: comm(p) }[k]);
      list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * (desc ? -1 : 1));
    }
    const time = (p) => (p.cpu > 5 ? '00:02:' + String(Math.floor(p.cpu * 2)).padStart(2, '0') : '00:00:0' + Math.min(9, Math.floor(p.cpu * 3)));
    const forest = (rows, fmt) => {
      if (!o.forest && !o.H && !/f/.test(bsd)) return rows.map((p) => fmt(p, '')).join('');
      const byP = {};
      rows.forEach((p) => (byP[p.ppid] = byP[p.ppid] || []).push(p));
      const pids = new Set(rows.map((p) => p.pid));
      let out = '';
      const rec = (p, depth) => {
        out += fmt(p, depth ? '  '.repeat(depth - 1) + ' \\_ ' : '');
        for (const ch of byP[p.pid] || []) rec(ch, depth + 1);
      };
      rows.filter((p) => !pids.has(p.ppid)).forEach((p) => rec(p, 0));
      return out;
    };
    if (o.o) {
      const cols = o.o.split(',').map((x) => x.split('=')[0]);
      const H = { pid: 'PID', ppid: 'PPID', user: 'USER', uid: 'UID', ni: 'NI', nice: 'NI', pri: 'PRI', cmd: 'CMD', args: 'COMMAND', command: 'COMMAND', comm: 'COMMAND', '%cpu': '%CPU', pcpu: '%CPU', '%mem': '%MEM', pmem: '%MEM', stat: 'STAT', state: 'S', tty: 'TT', rss: 'RSS', vsz: 'VSZ', start: 'STARTED', time: 'TIME', etime: 'ELAPSED' };
      const val = (p, k) => ({ pid: p.pid, ppid: p.ppid, user: p.user, uid: (sh.user(p.user) || { uid: 0 }).uid, ni: p.ni, nice: p.ni, pri: 19 - p.ni, cmd: p.cmd, args: p.cmd, command: p.cmd, comm: comm(p), '%cpu': p.cpu.toFixed(1), pcpu: p.cpu.toFixed(1), '%mem': p.mem.toFixed(1), pmem: p.mem.toFixed(1), stat: p.stat, state: p.stat[0], tty: p.tty, rss: p.rss, vsz: p.vsz, start: p.start, time: time(p), etime: '01:02:03' }[k]);
      const rows = list.map((p) => cols.map((k) => String(val(p, k) === undefined ? '-' : val(p, k))));
      const w = cols.map((k, i) => Math.max((H[k] || k.toUpperCase()).length, ...rows.map((r) => r[i].length)));
      const line = (r) => r.map((x, i) => (i === r.length - 1 ? x : /^-?[\d.]+$/.test(x) || i === 0 ? x.padStart(w[i]) : x.padEnd(w[i]))).join(' ') + '\n';
      if (!o.noh) c.out(line(cols.map((k) => H[k] || k.toUpperCase())));
      rows.forEach((r) => c.out(line(r)));
      return 0;
    }
    if (/u/.test(bsd)) {
      c.out('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n');
      c.out(forest(list, (p, pre) => `${p.user.slice(0, 8).padEnd(8)} ${String(p.pid).padStart(7)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${String(p.vsz).padStart(6)} ${String(p.rss).padStart(5)} ${p.tty.padEnd(8)} ${p.stat.padEnd(4)} ${p.start}   ${time(p).slice(3)} ${pre}${p.cmd}\n`));
      return 0;
    }
    if (bsd) {
      c.out('    PID TTY      STAT   TIME COMMAND\n');
      c.out(forest(list, (p, pre) => `${String(p.pid).padStart(7)} ${p.tty.padEnd(8)} ${p.stat.padEnd(6)} ${time(p).slice(3)} ${pre}${p.cmd}\n`));
      return 0;
    }
    if (o.l) {
      c.out('F S   UID     PID    PPID  C PRI  NI ADDR SZ WCHAN  TTY          TIME CMD\n');
      c.out(forest(list, (p, pre) => `4 ${p.stat[0]} ${String((sh.user(p.user) || { uid: 0 }).uid).padStart(5)} ${String(p.pid).padStart(7)} ${String(p.ppid).padStart(7)}  0 ${String(80 + p.ni).padStart(3)} ${String(p.ni).padStart(3)} - ${String(Math.floor(p.vsz / 4)).padStart(5)} ${p.stat[0] === 'R' ? '-     ' : 'do_wai'} ${p.tty.padEnd(8)} ${time(p)} ${pre}${o.f ? p.cmd : comm(p)}\n`));
      return 0;
    }
    if (o.f || o.F) {
      c.out('UID          PID    PPID  C STIME TTY          TIME CMD\n');
      c.out(forest(list, (p, pre) => `${p.user.slice(0, 8).padEnd(8)} ${String(p.pid).padStart(7)} ${String(p.ppid).padStart(7)}  ${Math.floor(p.cpu / 10)} ${p.start} ${p.tty.padEnd(8)} ${time(p)} ${pre}${p.cmd}\n`));
      return 0;
    }
    c.out('    PID TTY          TIME CMD\n');
    c.out(forest(list, (p, pre) => `${String(p.pid).padStart(7)} ${p.tty.padEnd(8)} ${time(p)} ${pre}${comm(p)}\n`));
    void all;
  };
  C.pstree = (c) => {
    const { o } = getopt(c.args.filter((a) => !/^\w+$/.test(a)), 'pnuaA', {});
    const list = SIM.procTable(c.sh, 'pstree');
    const byP = {};
    list.forEach((p) => (byP[p.ppid] = byP[p.ppid] || []).push(p));
    const name = (p) => (o.a ? p.cmd : comm(p)) + (o.p ? `(${p.pid})` : '');
    let out = '';
    const rec = (p, prefix, isLast, isRoot) => {
      out += (isRoot ? '' : prefix + (isLast ? '└─' : '├─')) + name(p) + '\n';
      const ch = (byP[p.pid] || []).filter((x) => x.pid !== 2);
      ch.forEach((x, i) => rec(x, isRoot ? '' : prefix + (isLast ? '  ' : '│ '), i === ch.length - 1, false));
    };
    const root = list.find((p) => p.pid === 1);
    rec({ ...root, cmd: 'systemd' }, '', true, true);
    c.out(out);
  };
  C.top = (c) => {
    const sh = c.sh;
    const list = SIM.procTable(sh, 'top').sort((a, b) => b.cpu - a.cpu);
    const run = list.filter((p) => p.stat[0] === 'R').length;
    c.out(`top - ${new Date().toTimeString().slice(0, 8)} up  3:25,  3 users,  load average: 0.08, 0.12, 0.09
Tasks: ${list.length + 190} total,   ${run} running, ${list.length + 189 - run} sleeping,   0 stopped,   0 zombie
%Cpu(s):  4.3 us,  1.2 sy,  1.1 ni, 93.1 id,  0.2 wa,  0.0 hi,  0.1 si,  0.0 st
MiB Mem :   3933.8 total,   2162.6 free,    838.1 used,   1055.6 buff/cache
MiB Swap:   4096.0 total,   4096.0 free,      0.0 used.   3126.6 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
`);
    for (const p of list.slice(0, 18)) c.out(`${String(p.pid).padStart(7)} ${p.user.slice(0, 8).padEnd(8)}  ${String(20 + p.ni).padStart(2)} ${String(p.ni).padStart(3)} ${String(p.vsz).padStart(7)} ${String(p.rss).padStart(6)} ${String(Math.floor(p.rss / 3)).padStart(6)} ${p.stat[0]} ${p.cpu.toFixed(1).padStart(5)} ${p.mem.toFixed(1).padStart(5)}   0:0${Math.floor(p.cpu / 3)}.${String(p.pid % 100).padStart(2, '0')} ${comm(p)}\n`);
    if (c.args.indexOf('-b') < 0) c.err(note('(top is interactive in a real terminal: k=kill, r=renice, M=sort by memory, P=sort by CPU, q=quit — the simulator shows one snapshot)'));
  };
  C.htop = (c) => {
    C.top(c);
  };
  SIM.optional.add('htop');
  // send a signal to pid; returns error string or null
  SIM.signal = function (sh, pid, sig, err) {
    const s = sig;
    const job = sh.jobs.find((j) => j.pid === pid && j.end > Date.now());
    const proc = sh.state.procs.find((p) => p.pid === pid);
    const isShell = pid === 1990 || (sh.userStack.length && pid === 2000 + sh.userStack.length);
    if (!job && !proc && !isShell) return 'No such process';
    const owner = job ? job.user : proc ? proc.user : sh.username;
    if (sh.uid !== 0 && owner !== sh.username) return 'Operation not permitted';
    if (s === 0) return null;
    if (pid === 1) return null; // init ignores signals it has no handler for
    if (isShell) {
      if (s === 9) err('\x1b[2m(you just killed your own shell — the simulator keeps it alive)\x1b[0m\n');
      return null;
    }
    const term = [1, 2, 3, 6, 9, 15].indexOf(s) >= 0;
    if (job) {
      if (s === 19 || s === 20) job.stopped = true;
      else if (s === 18) job.stopped = false;
      else if (term) {
        job.killed = true;
        job.end = 0;
        err(`[${job.id}]+  ${s === 9 ? 'Killed' : s === 2 ? 'Interrupt' : s === 1 ? 'Hangup' : 'Terminated'}              ${job.text}\n`);
        sh.jobs = sh.jobs.filter((x) => x !== job);
      }
      return null;
    }
    if (s === 19 || s === 20) proc.stat = 'T' + proc.stat.slice(1);
    else if (s === 18) proc.stat = proc.stat.replace(/^T/, 'S');
    else if (s === 1 && /sshd|rsyslog|cupsd|cron|NetworkManager|master|chronyd/.test(proc.cmd)) {
      err(`\x1b[2m(${comm(proc)} received SIGHUP and re-read its configuration — daemons usually reload on HUP)\x1b[0m\n`);
    } else if (term) {
      sh.state.procs = sh.state.procs.filter((p) => p !== proc);
      const svc = Object.entries(sh.state.services).find(([, v]) => v.pid === pid);
      if (svc) {
        svc[1].active = false;
        svc[1].failed = s === 9;
      }
    }
    return null;
  };
  C.kill = (c) => {
    const sh = c.sh;
    const args = c.args.slice();
    if (args[0] === '-l' || args[0] === '-L' || args[0] === '--list') {
      if (args[1]) {
        const n = sigNum(args[1]);
        c.out((/^\d+$/.test(args[1]) ? SIGNALS[n - 1] : n) + '\n');
        return 0;
      }
      let out = '';
      SIGNALS.forEach((s, i) => (out += `${String(i + 1).padStart(2)}) SIG${s.padEnd(8)}` + ((i + 1) % 5 === 0 ? '\n' : '\t')));
      c.out(out.replace(/\t$/, '') + '\n');
      return 0;
    }
    let sig = 15;
    if (args[0] === '-s' || args[0] === '-n') {
      sig = sigNum(args[1]);
      args.splice(0, 2);
    } else if (args[0] && /^-/.test(args[0]) && args[0] !== '--') {
      sig = sigNum(args[0].slice(1));
      args.shift();
    }
    if (sig === null) return c.fail(`${c.args[0]}: invalid signal specification`);
    if (!args.length) {
      c.err('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n');
      return 2;
    }
    let st = 0;
    for (const a of args) {
      let pid;
      if (a.startsWith('%')) {
        const j = SIM.jobArg(sh, a);
        if (!j) {
          c.err(`bash: kill: ${a}: no such job\n`);
          st = 1;
          continue;
        }
        pid = j.pid;
      } else if (/^-?\d+$/.test(a)) pid = +a;
      else {
        c.err(`bash: kill: ${a}: arguments must be process or job IDs\n`);
        st = 1;
        continue;
      }
      const e = SIM.signal(sh, pid, sig, c.err);
      if (e) {
        c.err(`bash: kill: (${pid}) - ${e}\n`);
        st = 1;
      }
    }
    return st;
  };
  function matchProcs(c, pattern, o) {
    const re = new RegExp(o.x ? `^(?:${pattern})$` : pattern, o.i ? 'i' : '');
    return SIM.procTable(c.sh).filter((p) => {
      if (p.pid === 1990) return false;
      if (o.u && p.user !== o.u) return false;
      return re.test(o.f ? p.cmd : comm(p));
    });
  }
  C.pgrep = (c) => {
    const { o, rest } = getopt(c.args, 'lafu:xicn', { 'list-name': 'l', 'list-full': 'a', full: 'f', count: 'c' });
    const m = matchProcs(c, rest[0] || '.', o);
    if (o.c) c.out(m.length + '\n');
    else m.forEach((p) => c.out(p.pid + (o.l ? ' ' + comm(p) : o.a ? ' ' + p.cmd : '') + '\n'));
    return m.length ? 0 : 1;
  };
  C.pidof = (c) => {
    const m = SIM.procTable(c.sh).filter((p) => c.args.indexOf(comm(p)) >= 0);
    if (!m.length) return 1;
    c.out(m.map((p) => p.pid).reverse().join(' ') + '\n');
  };
  C.pkill = (c) => {
    const args = c.args.slice();
    let sig = 15;
    if (args[0] && /^-[A-Z0-9]+$/.test(args[0]) && sigNum(args[0].slice(1))) sig = sigNum(args.shift().slice(1));
    const { o, rest } = getopt(args, 'fu:xie', { full: 'f', echo: 'e', 'signal=': 'sig' });
    if (o.sig) sig = sigNum(o.sig);
    const m = matchProcs(c, rest[0] || '.', o);
    let st = m.length ? 0 : 1;
    for (const p of m) {
      const e = SIM.signal(c.sh, p.pid, sig, c.err);
      if (e) {
        c.err(`pkill: killing pid ${p.pid} failed: ${e}\n`);
        st = 1;
      } else if (o.e) c.out(`${comm(p)} killed (pid ${p.pid})\n`);
    }
    return st;
  };
  C.killall = (c) => {
    const args = c.args.slice();
    let sig = 15;
    let verbose = false;
    let user = null;
    const names = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '-v') verbose = true;
      else if (a === '-u') user = args[++i];
      else if (a === '-s' || a === '--signal') sig = sigNum(args[++i]);
      else if (a === '-l') return C.kill({ ...c, args: ['-l'] });
      else if (/^-[A-Z0-9]+$/i.test(a) && sigNum(a.slice(1))) sig = sigNum(a.slice(1));
      else names.push(a);
    }
    let st = 0;
    for (const n of names) {
      const m = SIM.procTable(c.sh).filter((p) => comm(p) === n && (!user || p.user === user) && p.pid !== 1990);
      if (!m.length) {
        c.err(`${n}: no process found\n`);
        st = 1;
      }
      for (const p of m) {
        const e = SIM.signal(c.sh, p.pid, sig, c.err);
        if (e) {
          c.err(`${n}(${p.pid}): ${e}\n`);
          st = 1;
        } else if (verbose) c.out(`Killed ${n}(${p.pid}) with signal ${sig}\n`);
      }
    }
    return st;
  };
  C.nice = (c) => {
    const args = c.args.slice();
    let inc = 10;
    if (args[0] === '-n' || args[0] === '--adjustment') {
      inc = parseInt(args[1], 10);
      args.splice(0, 2);
    } else if (/^--?adjustment=/.test(args[0] || '')) inc = parseInt(args.shift().split('=')[1], 10);
    else if (/^-[-]?\d+$/.test(args[0] || '')) inc = parseInt(args.shift().slice(1), 10);
    if (!args.length) {
      c.out('0\n');
      return 0;
    }
    if (inc < 0 && c.sh.uid !== 0) {
      c.err('nice: cannot set niceness: Permission denied\n');
      inc = 0;
    }
    c.sh.lastNice = Math.max(-20, Math.min(19, inc));
    c.sh.pendingNice = c.sh.lastNice;
    return c.sh.runArgv(args, c.io);
  };
  C.renice = (c) => {
    const args = c.args.slice();
    let prio = null;
    let mode = 'p';
    const targets = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '-n' || a === '--priority') prio = parseInt(args[++i], 10);
      else if (a === '-p') mode = 'p';
      else if (a === '-u') mode = 'u';
      else if (a === '-g') mode = 'g';
      else if (prio === null && /^[-+]?\d+$/.test(a)) prio = parseInt(a, 10);
      else targets.push([mode, a]);
    }
    if (prio === null || !targets.length) return c.fail('usage: renice [-n] <priority> [-p|--pid] <pid>...');
    prio = Math.max(-20, Math.min(19, prio));
    const sh = c.sh;
    let st = 0;
    for (const [m, t] of targets) {
      const procs = SIM.procTable(sh).filter((p) => (m === 'u' ? p.user === t || String((sh.user(p.user) || {}).uid) === t : p.pid === +t));
      if (!procs.length) {
        c.err(`renice: failed to get priority for ${t} (process ID): No such process\n`);
        st = 1;
        continue;
      }
      for (const p of procs) {
        if (sh.uid !== 0 && (p.user !== sh.username || prio < p.ni)) {
          c.err(`renice: failed to set priority for ${p.pid} (process ID): Permission denied\n`);
          st = 1;
          continue;
        }
        const real = sh.state.procs.find((x) => x.pid === p.pid) || (p.job ? p.job : null);
        const old = p.ni;
        if (real) {
          real.ni = prio;
          if (real.stat) real.stat = real.stat.replace(/[N<]/g, '') + (prio > 0 ? 'N' : prio < 0 ? '<' : '');
        }
        c.out(`${p.pid} (process ID) old priority ${old}, new priority ${prio}\n`);
      }
    }
    return st;
  };
  C.nohup = (c) => {
    if (!c.args.length) return c.fail('missing operand');
    let target = c.io.out;
    if (c.io.tty && c.io.out === c.io.tty) {
      c.err("nohup: ignoring input and appending output to 'nohup.out'\n");
      c.fs.writeFile('nohup.out', c.sh.cwd, '', { append: true });
      const cwd = c.sh.cwd;
      target = (s) => c.fs.writeFile('nohup.out', cwd, s, { append: true });
    }
    return c.sh.runArgv(c.args, { ...c.io, out: target });
  };
  C.sleep = (c) => {
    let total = 0;
    for (const a of c.args) {
      const m = /^(\d*\.?\d+)([smhd]?)$/.exec(a);
      if (!m) return c.fail(`invalid time interval '${a}'`);
      total += +m[1] * { '': 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
    }
    if (!c.args.length) return c.fail('missing operand');
    c.sh.sleepAccum += total;
  };
  C.watch = (c) => {
    const { o, rest } = getopt(c.args, 'n:dt', { 'interval=': 'n', differences: 'd', 'no-title': 't' }, { stopAtFirst: true });
    if (!o.t) c.out(`Every ${(+(o.n || 2)).toFixed(1)}s: ${rest.join(' ')}${' '.repeat(20)}${c.sh.state.hostname}: ${new Date().toString().slice(0, 24)}\n\n`);
    c.sh.runSource(rest.join(' '), c.io);
    c.err(note('(watch repeats the command every ' + (o.n || 2) + 's until Ctrl+C — shown once in the simulator)'));
  };
  C.time = (c) => {
    const t0 = Date.now();
    const st = c.sh.runArgv(c.args, c.io);
    const ms = Date.now() - t0 + Math.floor(c.sh.sleepAccum * 1000);
    c.err(`\nreal\t0m${(ms / 1000).toFixed(3)}s\nuser\t0m0.001s\nsys\t0m0.001s\n`);
    return st;
  };
  C.timeout = (c) => {
    const args = c.args.filter((a) => !a.startsWith('-'));
    return c.sh.runArgv(args.slice(1), c.io);
  };
  C.screen = (c) => c.out(note('(screen: terminal multiplexer — Ctrl+a d detaches, "screen -r" reattaches. Not simulated.)'));
  C.tmux = (c) => c.out(note('(tmux: terminal multiplexer — Ctrl+b d detaches, "tmux attach" reattaches, "tmux ls" lists sessions. Not simulated.)'));
  SIM.optional.add('screen');
  SIM.optional.add('tmux');
  C.free = (c) => {
    const { o } = getopt(c.args, 'hbkmgtwl', { human: 'h', total: 't', mega: 'm', giga: 'g' });
    const vals = { total: 4028252, used: 858216, free: 2214508, shared: 12688, buff: 1080100, avail: 3201644, stotal: 4194300, sused: 0, sfree: 4194300 };
    const f = (k) => (o.h ? SIM.human(k * 1024).replace(/(\d)([KMGT])$/, '$1$2i').replace(/^(\d+)$/, '$1B') : o.m ? String(Math.floor(k / 1024)) : o.g ? String(Math.floor(k / 1048576)) : o.b ? String(k * 1024) : String(k));
    const col = (s) => s.padStart(12);
    c.out(`${' '.repeat(15)}total        used        free      shared  buff/cache   available\n`);
    c.out(`Mem:   ${col(f(vals.total)).slice(-12)}${col(f(vals.used))}${col(f(vals.free))}${col(f(vals.shared))}${col(f(vals.buff))}${col(f(vals.avail))}\n`.replace('Mem:   ', 'Mem:  '));
    c.out(`Swap:  ${col(f(vals.stotal))}${col(f(vals.sused))}${col(f(vals.sfree))}\n`);
    if (o.t) c.out(`Total: ${col(f(vals.total + vals.stotal))}${col(f(vals.used))}${col(f(vals.free + vals.sfree))}\n`);
  };
  C.uptime = (c) => {
    if (c.args.indexOf('-p') >= 0) return c.out('up 3 hours, 25 minutes\n');
    if (c.args.indexOf('-s') >= 0) return c.out(new Date(Date.now() - 12300000).toISOString().replace('T', ' ').slice(0, 19) + '\n');
    c.out(` ${new Date().toTimeString().slice(0, 8)} up  3:25,  3 users,  load average: 0.08, 0.12, 0.09\n`);
  };
  C.uname = (c) => {
    const { o } = getopt(c.args, 'asnrvmpio', { all: 'a', 'kernel-name': 's', nodename: 'n', 'kernel-release': 'r', 'kernel-version': 'v', machine: 'm', processor: 'p', 'hardware-platform': 'i', 'operating-system': 'o' });
    const v = { s: 'Linux', n: c.sh.state.hostname, r: '6.1.0-18-amd64', v: '#1 SMP PREEMPT_DYNAMIC Debian 6.1.76-1 (2024-02-01)', m: 'x86_64', p: 'unknown', i: 'unknown', o: 'GNU/Linux' };
    if (o.a) return c.out(`${v.s} ${v.n} ${v.r} ${v.v} ${v.m} ${v.o}\n`);
    const keys = 'snrvmpio'.split('').filter((k) => o[k]);
    c.out((keys.length ? keys : ['s']).map((k) => v[k]).join(' ') + '\n');
  };
  C.arch = (c) => c.out('x86_64\n');
  C.nproc = (c) => c.out('2\n');
  C.hostname = (c) => {
    const { o, rest } = getopt(c.args, 'fIisdAa', { fqdn: 'f', 'all-ip-addresses': 'I', 'ip-address': 'i', short: 's', domain: 'd' });
    const st = c.sh.state;
    if (rest[0]) {
      if (needRoot(c, 'hostname: you must be root to change the host name')) return 1;
      st.hostname = rest[0];
      return 0;
    }
    if (o.I) return c.out(st.ip.links.flatMap((l) => (l.name === 'lo' ? [] : l.v4.map((a) => a.split('/')[0]))).join(' ') + ' \n');
    if (o.i) return c.out('127.0.1.1\n');
    if (o.f || o.A) return c.out(st.hostname + '.example.com\n');
    if (o.d) return c.out('example.com\n');
    c.out(st.hostname + '\n');
  };
  C.dnsdomainname = (c) => c.out('example.com\n');
  C.hostnamectl = (c) => {
    const sh = c.sh;
    const sub = c.args[0] || 'status';
    if (sub === 'set-hostname' || sub === 'hostname' && c.args[1]) {
      if (needRoot(c, 'Could not set static hostname: Access denied')) return 1;
      sh.state.hostname = c.args[1];
      asRoot(sh, () => sh.fs.writeFile('/etc/hostname', '/', c.args[1] + '\n'));
      return 0;
    }
    c.out(` Static hostname: ${sh.state.hostname}
       Icon name: computer-vm
         Chassis: vm 🖴
      Machine ID: a3f1c2d4e5b60718293a4b5c6d7e8f90
         Boot ID: 6b2c1d0e9f8a47b3a2c1d0e9f8a7b6c5
  Virtualization: kvm
Operating System: Debian GNU/Linux 12 (bookworm)
          Kernel: Linux 6.1.0-18-amd64
    Architecture: x86-64
 Hardware Vendor: QEMU
  Hardware Model: Standard PC _Q35 + ICH9, 2009_
Firmware Version: 1.16.2-debian-1.16.2-1
`);
  };

  /* ================= hardware ================= */
  C.lspci = (c) => {
    const k = c.args.some((a) => /k/.test(a));
    const v = c.args.some((a) => /v/.test(a));
    const nn = c.args.indexOf('-nn') >= 0;
    const devs = [
      ['00:00.0', 'Host bridge', 'Intel Corporation 440FX - 82441FX PMC [Natoma] (rev 02)', '8086:1237', null],
      ['00:01.0', 'ISA bridge', 'Intel Corporation 82371SB PIIX3 ISA [Natoma/Triton II]', '8086:7000', null],
      ['00:01.1', 'IDE interface', 'Intel Corporation 82371AB/EB/MB PIIX4 IDE (rev 01)', '8086:7111', 'ata_piix'],
      ['00:02.0', 'VGA compatible controller', 'VMware SVGA II Adapter', '15ad:0405', 'vmwgfx'],
      ['00:03.0', 'Ethernet controller', 'Intel Corporation 82540EM Gigabit Ethernet Controller (rev 02)', '8086:100e', 'e1000'],
      ['00:04.0', 'System peripheral', 'InnoTek Systemberatung GmbH VirtualBox Guest Service', '80ee:cafe', 'vboxguest'],
      ['00:05.0', 'Multimedia audio controller', 'Intel Corporation 82801AA AC\'97 Audio Controller (rev 01)', '8086:2415', 'snd_intel8x0'],
      ['00:06.0', 'USB controller', 'Apple Inc. KeyLargo/Intrepid USB', '106b:003f', 'ohci-pci'],
      ['00:0b.0', 'USB controller', 'Intel Corporation 82801FB/FBM/FR/FW/FRW (ICH6 Family) USB2 EHCI Controller', '8086:265c', 'ehci-pci'],
      ['00:0d.0', 'SATA controller', 'Intel Corporation 82801HM/HEM (ICH8M/ICH8M-E) SATA Controller [AHCI mode] (rev 02)', '8086:2829', 'ahci'],
    ];
    for (const d of devs) {
      c.out(`${d[0]} ${d[1]}${nn ? ' [0' + (100 + devs.indexOf(d)) + ']' : ''}: ${d[2]}${nn ? ` [${d[3]}]` : ''}\n`);
      if (v) c.out(`\tSubsystem: ${d[2].split(' ').slice(0, 2).join(' ')} Device\n\tFlags: bus master, fast devsel, latency 64, IRQ ${19 + devs.indexOf(d) % 3}\n`);
      if ((k || v) && d[4]) c.out(`\tKernel driver in use: ${d[4]}\n\tKernel modules: ${d[4]}\n`);
      if (v) c.out('\n');
    }
  };
  C.lsusb = (c) => {
    if (c.args.indexOf('-t') >= 0) {
      c.out(`/:  Bus 02.Port 1: Dev 1, Class=root_hub, Driver=ehci-pci/12p, 480M
    |__ Port 1: Dev 2, If 0, Class=Mass Storage, Driver=usb-storage, 480M
/:  Bus 01.Port 1: Dev 1, Class=root_hub, Driver=ohci-pci/12p, 12M
    |__ Port 1: Dev 2, If 0, Class=Human Interface Device, Driver=usbhid, 12M
`);
      return 0;
    }
    c.out(`Bus 002 Device 002: ID 0781:5567 SanDisk Corp. Cruzer Blade
Bus 002 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
Bus 001 Device 002: ID 80ee:0021 VirtualBox USB Tablet
Bus 001 Device 001: ID 1d6b:0001 Linux Foundation 1.1 root hub
`);
    if (c.args.indexOf('-v') >= 0) c.out(note('(-v would print full descriptors: idVendor, idProduct, bcdUSB, MaxPower ...)'));
  };
  C.lscpu = (c) => {
    c.out(`Architecture:            x86_64
  CPU op-mode(s):        32-bit, 64-bit
  Address sizes:         39 bits physical, 48 bits virtual
  Byte Order:            Little Endian
CPU(s):                  2
  On-line CPU(s) list:   0,1
Vendor ID:               GenuineIntel
  Model name:            Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz
    CPU family:          6
    Model:               158
    Thread(s) per core:  1
    Core(s) per socket:  2
    Socket(s):           1
    BogoMIPS:            6384.00
Virtualization features:
  Hypervisor vendor:     KVM
  Virtualization type:   full
Caches (sum of all):
  L1d:                   64 KiB (2 instances)
  L2:                    512 KiB (2 instances)
  L3:                    24 MiB (2 instances)
`);
  };
  C.lsmod = (c) => {
    c.out('Module                  Size  Used by\n');
    for (const m of c.sh.state.modules) c.out(`${m[0].padEnd(24)}${String(m[1]).padStart(6)}  ${m[2]}${m[3] ? ' ' + m[3] : ''}\n`);
  };
  sbin('modprobe', 'rmmod', 'insmod', 'depmod', 'modinfo');
  C.modprobe = (c) => {
    const { o, rest } = getopt(c.args, 'rnvaqcl', { remove: 'r', 'dry-run': 'n', verbose: 'v', all: 'a', 'show-depends': 'D' });
    const st = c.sh.state;
    if (!rest.length) return c.fail('ERROR: missing parameters. See -h.');
    if (!o.n && needRoot(c, `modprobe: ERROR: could not insert '${rest[0]}': Operation not permitted`)) return 1;
    const names = o.a ? rest : [rest[0]];
    for (const raw of names) {
      const name = raw.replace(/-/g, '_');
      const loaded = st.modules.find((m) => m[0] === name);
      if (o.r) {
        if (!loaded) continue;
        if (loaded[2] > 0 && loaded[3]) return c.fail(`FATAL: Module ${name} is in use.`);
        if (o.v) c.out(`rmmod ${name}\n`);
        if (!o.n) st.modules = st.modules.filter((m) => m !== loaded);
        const info = st.availableModules[name];
        if (info) for (const d of info.deps) {
          const dm = st.modules.find((m) => m[0] === d);
          if (dm) {
            if (o.v) c.out(`rmmod ${d}\n`);
            if (!o.n) st.modules = st.modules.filter((m) => m !== dm);
          }
        }
        continue;
      }
      if (loaded) continue;
      const info = st.availableModules[name];
      if (!info) return c.fail(`FATAL: Module ${raw} not found in directory /lib/modules/6.1.0-18-amd64`);
      for (const d of info.deps) {
        if (!st.modules.find((m) => m[0] === d)) {
          if (o.v) c.out(`insmod /lib/modules/6.1.0-18-amd64/kernel/${d}.ko\n`);
          if (!o.n) st.modules.unshift([d, st.availableModules[d].size, 1, name]);
        }
      }
      if (o.v) c.out(`insmod /lib/modules/6.1.0-18-amd64/kernel/${name}.ko${rest.slice(1).length ? ' ' + rest.slice(1).join(' ') : ''}\n`);
      if (!o.n) {
        st.modules.unshift([name, info.size, 0, '']);
        SIM.kmsg(c.sh, `${name}: ${info.desc} loaded`);
      }
    }
  };
  C.insmod = (c) => {
    if (needRoot(c, `insmod: ERROR: could not insert module ${c.args[0]}: Operation not permitted`)) return 1;
    const name = (c.args[0] || '').split('/').pop().replace(/\.ko(\.xz)?$/, '');
    const st = c.sh.state;
    if (!c.fs.exists(c.args[0], c.sh.cwd) && !st.availableModules[name]) return c.fail(`ERROR: could not load module ${c.args[0]}: No such file or directory`);
    const info = st.availableModules[name];
    if (info && info.deps.some((d) => !st.modules.find((m) => m[0] === d))) return c.fail(`ERROR: could not insert module ${c.args[0]}: Unknown symbol in module`);
    st.modules.unshift([name, info ? info.size : 16384, 0, '']);
  };
  C.rmmod = (c) => {
    if (needRoot(c, `rmmod: ERROR: ../libkmod/libkmod-module.c:799 kmod_module_remove_module() could not remove '${c.args[0]}': Operation not permitted`)) return 1;
    const st = c.sh.state;
    for (const n of c.args.filter((a) => !a.startsWith('-'))) {
      const m = st.modules.find((x) => x[0] === n.replace(/-/g, '_'));
      if (!m) return c.fail(`ERROR: Module ${n} is not currently loaded`);
      if (m[2] > 0 && m[3]) return c.fail(`ERROR: Module ${n} is in use by: ${m[3]}`);
      st.modules = st.modules.filter((x) => x !== m);
    }
  };
  C.modinfo = (c) => {
    const n = (c.args.filter((a) => !a.startsWith('-'))[0] || '').replace(/-/g, '_');
    const st = c.sh.state;
    const info = st.availableModules[n] || (st.modules.find((m) => m[0] === n) && { desc: n + ' driver', deps: [] });
    if (!info) return c.fail(`ERROR: Module ${n} not found.`);
    c.out(`filename:       /lib/modules/6.1.0-18-amd64/kernel/drivers/${n}.ko
description:    ${info.desc}
license:        GPL
depends:        ${(info.deps || []).join(',')}
retpoline:      Y
intree:         Y
name:           ${n}
vermagic:       6.1.0-18-amd64 SMP preempt mod_unload modversions
${n === 'e1000' ? 'parm:           TxDescriptors:Number of transmit descriptors (array of int)\nparm:           debug:Debug level (0=none,...,16=all) (int)\n' : ''}`);
  };
  C.depmod = (c) => (needRoot(c) ? 1 : 0);
  SIM.kmsg = (sh, msg) => {
    const t = ((Date.now() / 1000) % 100000).toFixed(6);
    (sh.state.kmsg = sh.state.kmsg || []).push(`[${t.padStart(12)}] ${msg}`);
  };
  const DMESG = `[    0.000000] Linux version 6.1.0-18-amd64 (debian-kernel@lists.debian.org) (gcc-12 (Debian 12.2.0-14) 12.2.0) #1 SMP PREEMPT_DYNAMIC Debian 6.1.76-1
[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-6.1.0-18-amd64 root=UUID=3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93 ro quiet
[    0.000000] BIOS-provided physical RAM map:
[    0.000000] efi: EFI v2.70 by EDK II
[    0.004000] DMI: QEMU Standard PC (Q35 + ICH9, 2009), BIOS 1.16.2-debian-1.16.2-1 04/01/2014
[    0.004000] Hypervisor detected: KVM
[    0.120351] Memory: 3921644K/4193784K available (14336K kernel code)
[    0.381012] PCI: Using configuration type 1 for base access
[    0.901238] ACPI: Interpreter enabled
[    1.022113] SCSI subsystem initialized
[    1.201133] ata1.00: ATA-8: VBOX HARDDISK, 1.0, max UDMA/133
[    1.210004] sd 0:0:0:0: [sda] 83886080 512-byte logical blocks: (42.9 GB/40.0 GiB)
[    1.210331] sd 1:0:0:0: [sdb] 41943040 512-byte logical blocks: (21.5 GB/20.0 GiB)
[    1.213001]  sda: sda1 sda2 sda3
[    1.401203] Freeing unused kernel image (initmem) memory: 2908K
[    1.401255] Run /init as init process
[    1.512309] EXT4-fs (sda2): mounted filesystem 3b5e9c41-6f2a-4d0e-9a51-8c7d2e1f0a93 with ordered data mode.
[    1.801232] systemd[1]: systemd 252.22-1~deb12u1 running in system mode
[    1.851200] systemd[1]: Detected virtualization kvm.
[    1.851210] systemd[1]: Hostname set to <lpic-lab>.
[    2.114213] e1000 0000:00:03.0 enp0s3: renamed from eth0
[    2.302113] Adding 4194300k swap on /dev/sda3.  Priority:-2 extents:1 across:4194300k FS
[    2.512000] e1000: enp0s3 NIC Link is Up 1000 Mbps Full Duplex, Flow Control: RX
[  311.552100] usb 2-1: new high-speed USB device number 2 using ehci-pci
[  311.700011] usb 2-1: New USB device found, idVendor=0781, idProduct=5567, bcdDevice= 1.00
[  311.700111] usb-storage 2-1:1.0: USB Mass Storage device detected
[  311.900021] sd 2:0:0:0: [sdc] 15633408 512-byte logical blocks: (8.00 GB/7.45 GiB)
[  311.910221]  sdc: sdc1
`;
  C.dmesg = (c) => {
    const { o } = getopt(c.args, 'HTwcCkl:n:x', { human: 'H', ctime: 'T', follow: 'w', 'read-clear': 'c', clear: 'C', 'level=': 'l' });
    if (c.sh.uid !== 0 && false) return c.fail('read kernel buffer failed: Operation not permitted');
    let text = DMESG + (c.sh.state.kmsg || []).join('\n') + ((c.sh.state.kmsg || []).length ? '\n' : '');
    if (o.l) text = text.split('\n').filter((l) => (o.l.indexOf('err') >= 0 ? /error|fail/i.test(l) : true)).join('\n');
    if (o.T) text = text.replace(/^\[\s*(\d+)\.\d+\]/gm, (m, s) => '[' + new Date(Date.now() - 12345000 + +s * 1000).toString().slice(0, 24) + ']');
    if (o.C || o.c) {
      if (needRoot(c, 'dmesg: klogctl failed: Operation not permitted')) return 1;
      if (o.c) c.out(text);
      c.sh.state.kmsg = [];
      return 0;
    }
    c.out(text);
  };
  C.udevadm = (c) => {
    const sub = c.args[0];
    if (sub === 'info' && c.args.some((a) => /\/sys\/class\/net\/|^\/?sys\/class\/net/.test(a))) {
      const ifn = c.args.find((a) => /\/class\/net\//.test(a)).split('/').pop();
      const slot = { enp0s3: '3', enp0s8: '8' }[ifn] || '3';
      c.out(`P: /devices/pci0000:00/0000:00:0${slot}.0/net/${ifn}\nE: INTERFACE=${ifn}\nE: SUBSYSTEM=net\nE: ID_BUS=pci\nE: ID_NET_NAMING_SCHEME=v252\nE: ID_NET_NAME_MAC=enx080027${ifn === 'enp0s8' ? 'b2190c' : '4e66a1'}\nE: ID_NET_NAME_PATH=${ifn}\nE: ID_NET_DRIVER=e1000\nE: ID_NET_LINK_FILE=/usr/lib/systemd/network/99-default.link\n`);
      return 0;
    }
    if (sub === 'info') {
      const dev = c.args.find((a) => a.startsWith('/dev/')) || (c.args.find((a) => a.startsWith('--name=')) || '').split('=')[1] || '/dev/sda';
      c.out(`P: /devices/pci0000:00/0000:00:0d.0/ata1/host0/target0:0:0/0:0:0:0/block/${dev.replace('/dev/', '')}
N: ${dev.replace('/dev/', '')}
L: 0
S: disk/by-id/ata-VBOX_HARDDISK_VB1234
E: DEVNAME=${dev}
E: DEVTYPE=disk
E: SUBSYSTEM=block
E: ID_BUS=ata
E: ID_MODEL=VBOX_HARDDISK
E: ID_SERIAL=VBOX_HARDDISK_VB1234
`);
    } else if (sub === 'monitor') {
      c.out(`monitor will print the received events for:
UDEV - the event which udev sends out after rule processing
KERNEL - the kernel uevent

KERNEL[312.100211] add      /devices/pci0000:00/0000:00:0b.0/usb2/2-1 (usb)
UDEV  [312.140001] add      /devices/pci0000:00/0000:00:0b.0/usb2/2-1 (usb)
KERNEL[312.300421] add      /devices/.../block/sdc (block)
UDEV  [312.350123] add      /devices/.../block/sdc (block)
`);
      c.err(note('(udevadm monitor runs until Ctrl+C)'));
    } else if (sub === 'trigger' || sub === 'control' || sub === 'settle') {
      if (needRoot(c)) return 1;
    } else c.out('udevadm [--help] [--version] [--debug] COMMAND [COMMAND OPTIONS]\n\n  info  control  trigger  settle  monitor  test\n');
  };
  sbin('sysctl', 'dmidecode');
  C.sysctl = (c) => {
    const params = { 'kernel.hostname': () => c.sh.state.hostname, 'kernel.osrelease': () => '6.1.0-18-amd64', 'net.ipv4.ip_forward': () => c.fs.readFile('/proc/sys/net/ipv4/ip_forward', '/').trim(), 'vm.swappiness': () => '60', 'kernel.printk': () => '3\t4\t1\t3', 'fs.file-max': () => '9223372036854775807', 'net.ipv6.conf.all.disable_ipv6': () => '0' };
    const a = c.args;
    if (a[0] === '-a' || a[0] === '--all') {
      for (const [k, v] of Object.entries(params)) c.out(`${k} = ${v()}\n`);
      return 0;
    }
    if (a[0] === '-p') {
      if (needRoot(c, 'sysctl: permission denied on key "kernel.printk"')) return 1;
      c.out('kernel.printk = 3 4 1 3\n');
      return 0;
    }
    for (const x of a.filter((y) => y !== '-w')) {
      if (x.indexOf('=') > 0) {
        if (needRoot(c, `sysctl: permission denied on key "${x.split('=')[0]}"`)) return 1;
        const [k, v] = x.split('=');
        if (k === 'net.ipv4.ip_forward') c.fs.writeFile('/proc/sys/net/ipv4/ip_forward', '/', v + '\n');
        c.out(`${k} = ${v}\n`);
      } else if (params[x]) c.out(`${x} = ${params[x]()}\n`);
      else c.err(`sysctl: cannot stat /proc/sys/${x.replace(/\./g, '/')}: No such file or directory\n`);
    }
  };
  C.dmidecode = (c) => {
    if (needRoot(c, '/sys/firmware/dmi/tables/smbios_entry_point: Permission denied')) return 1;
    if (c.args[0] === '-s') return c.out({ 'system-product-name': 'Standard PC (Q35 + ICH9, 2009)', 'system-manufacturer': 'QEMU', 'bios-version': '1.16.2-debian-1.16.2-1' }[c.args[1]] + '\n');
    c.out('# dmidecode 3.4\nHandle 0x0100, DMI type 1, 27 bytes\nSystem Information\n\tManufacturer: QEMU\n\tProduct Name: Standard PC (Q35 + ICH9, 2009)\n');
  };
  C['systemd-detect-virt'] = (c) => c.out(c.args.indexOf('-c') >= 0 ? 'none\n' : 'kvm\n');
  C['virt-what'] = (c) => c.out('kvm\n');

  /* ================= disks, partitions, filesystems ================= */
  SIM.disks = function (sh) {
    const st = sh.state;
    if (!st.disks)
      st.disks = {
        sda: { size: 40 * 1024, label: 'gpt', model: 'VBOX HARDDISK', parts: [{ n: 1, start: 1, end: 513, type: 'EFI System', fsHint: 'vfat' }, { n: 2, start: 513, end: 36863, type: 'Linux filesystem' }, { n: 3, start: 36863, end: 40959, type: 'Linux swap' }] },
        sdb: { size: 20 * 1024, label: null, model: 'VBOX HARDDISK', parts: [] },
      };
    return st.disks;
  };
  const MiB = (m) => (m >= 1024 ? +(m / 1024).toFixed(1) + 'G' : Math.round(m) + 'M');
  C.lsblk = (c) => {
    const { o, rest } = getopt(c.args, 'fpalmo:dnSb', { fs: 'f', paths: 'p', all: 'a', 'output=': 'o', nodeps: 'd', noheadings: 'n' });
    const sh = c.sh;
    const disks = SIM.disks(sh);
    const mountOf = (dev) => {
      if (dev === '/dev/sda2') return '/';
      if (dev === '/dev/sda1') return '/boot/efi';
      if (dev === '/dev/sda3') return '[SWAP]';
      const m = sh.fs.mounts.find((x) => x.dev === dev);
      if (m) return m.target;
      if ((sh.state.swaps || []).indexOf(dev) >= 0) return '[SWAP]';
      return '';
    };
    const P = (n) => (o.p ? '/dev/' + n : n);
    if (o.f) c.out('NAME   FSTYPE FSVER LABEL  UUID                                 FSAVAIL FSUSE% MOUNTPOINTS\n');
    else if (!o.n) c.out('NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS\n');
    const want = rest.map((r) => r.replace('/dev/', ''));
    let minor = { sda: 0, sdb: 16 };
    for (const [name, d] of Object.entries(disks)) {
      if (want.length && !want.some((w) => w.startsWith(name))) continue;
      if (o.f) c.out(`${P(name).padEnd(6)}\n`);
      else c.out(`${P(name).padEnd(6)}   8:${String(minor[name]).padEnd(3)} 0 ${MiB(d.size).padStart(4)}  0 disk \n`);
      if (o.d) continue;
      d.parts.forEach((p, i) => {
        const dev = '/dev/' + name + p.n;
        const info = sh.fs.devices[dev] || {};
        const pre = i === d.parts.length - 1 ? '└─' : '├─';
        if (o.f) c.out(`${(pre + P(name + p.n)).padEnd(6)} ${(info.fstype || '').padEnd(6)} ${info.fstype === 'ext4' ? '1.0  ' : info.fstype === 'vfat' ? 'FAT32' : '     '} ${(info.label || '').padEnd(6)} ${(info.uuid || '').padEnd(36)} ${mountOf(dev) && mountOf(dev) !== '[SWAP]' ? '  27.1G    20%' : '              '} ${mountOf(dev)}\n`);
        else c.out(`${(pre + P(name + p.n)).padEnd(6)}   8:${String(minor[name] + p.n).padEnd(3)} 0 ${MiB(p.end - p.start).padStart(4)}  0 part ${mountOf(dev)}\n`);
      });
    }
    if (!want.length || want.indexOf('sr0') >= 0) {
      if (o.f) c.out('sr0    iso966 Jolie Debian 12.5.0 amd64 n 2024-02-10-11-02-33-00\n');
      else c.out(`sr0     11:0    1  628M  0 rom  ${sh.fs.mounts.find((m) => m.dev === '/dev/sr0') ? '/media/cdrom0' : ''}\n`);
    }
  };
  C.blkid = (c) => {
    const sh = c.sh;
    if (sh.uid !== 0 && !c.args.length) {
      /* non-root blkid still shows cached info */
    }
    const devs = Object.entries(sh.fs.devices).filter(([k, v]) => v.fstype && (!c.args.length || c.args.indexOf(k) >= 0));
    for (const [k, v] of devs.sort()) {
      const label = v.label ? `LABEL="${v.label}" ` : '';
      const type = v.fstype === 'swap' ? 'swap' : v.fstype;
      c.out(`${k}: ${label}UUID="${v.uuid}" ${v.fstype === 'ext4' ? 'BLOCK_SIZE="4096" ' : ''}TYPE="${type}"${k.startsWith('/dev/sd') && /\d$/.test(k) ? ` PARTUUID="${(v.uuid || '').slice(0, 8)}-0${k.slice(-1)}"` : ''}\n`);
    }
  };
  sbin('fdisk', 'gdisk', 'sgdisk', 'parted', 'mkfs', 'mke2fs', 'mkfs.ext2', 'mkfs.ext3', 'mkfs.ext4', 'mkfs.xfs', 'mkfs.vfat', 'mkfs.fat', 'mkdosfs', 'mkfs.exfat', 'mkfs.btrfs', 'mkswap', 'swapon', 'swapoff', 'fsck', 'e2fsck', 'fsck.ext4', 'fsck.xfs', 'tune2fs', 'dumpe2fs', 'debugfs', 'xfs_repair', 'xfs_db', 'xfs_fsr', 'xfs_admin', 'blkid', 'cfdisk', 'partprobe', 'e2label', 'resize2fs', 'xfs_growfs');
  function diskOf(c, dev) {
    const m = /^\/dev\/(sd[a-z])$/.exec(dev || '');
    if (!m) return null;
    return SIM.disks(c.sh)[m[1]] || null;
  }
  function printTable(c, name, d) {
    const sectors = d.size * 2048;
    c.out(`Disk /dev/${name}: ${(d.size / 1024).toFixed(0)} GiB, ${d.size * 1048576} bytes, ${sectors} sectors\nDisk model: ${d.model}\nUnits: sectors of 1 * 512 = 512 bytes\nSector size (logical/physical): 512 bytes / 512 bytes\nI/O size (minimum/optimal): 512 bytes / 512 bytes\n`);
    if (!d.label) {
      c.out('\n');
      return;
    }
    c.out(`Disklabel type: ${d.label === 'msdos' ? 'dos' : 'gpt'}\nDisk identifier: ${d.label === 'msdos' ? '0x3c2a1f9e' : '9E2F4A71-1C3B-4D5E-8F60-A1B2C3D4E5F6'}\n\n`);
    if (!d.parts.length) return;
    if (d.label === 'msdos') {
      c.out('Device     Boot    Start      End  Sectors  Size Id Type\n');
      for (const p of d.parts) c.out(`/dev/${name}${p.n}  ${p.boot ? '*' : ' '}  ${String(p.start * 2048).padStart(9)} ${String(p.end * 2048 - 1).padStart(9)} ${String((p.end - p.start) * 2048).padStart(8)} ${MiB(p.end - p.start).padStart(5)} ${p.id || '83'} ${p.type || 'Linux'}\n`);
    } else {
      c.out('Device        Start      End  Sectors  Size Type\n');
      for (const p of d.parts) c.out(`/dev/${name}${p.n}  ${String(p.start * 2048).padStart(9)} ${String(p.end * 2048 - 1).padStart(9)} ${String((p.end - p.start) * 2048).padStart(8)} ${MiB(p.end - p.start).padStart(5)} ${p.type}\n`);
    }
  }
  C.fdisk = (c) => {
    const { o, rest } = getopt(c.args, 'lu:s', { list: 'l' });
    if (needRoot(c, `fdisk: cannot open ${rest[0] || '/dev/sda'}: Permission denied`)) return 1;
    const disks = SIM.disks(c.sh);
    if (o.l) {
      const which = rest.length ? rest.map((r) => r.replace('/dev/', '')) : Object.keys(disks);
      which.forEach((n, i) => {
        if (!disks[n]) return c.err(`fdisk: cannot open /dev/${n}: No such file or directory\n`);
        if (i) c.out('\n\n');
        printTable(c, n, disks[n]);
      });
      return 0;
    }
    if (!rest[0]) return c.fail('bad usage');
    const d = diskOf(c, rest[0]);
    if (!d) return c.fail(`cannot open ${rest[0]}: No such file or directory`);
    c.out(`\nWelcome to fdisk (util-linux 2.38.1).\nChanges will remain in memory only, until you decide to write them.\nBe careful before using the write command.\n\n`);
    if (c.sh.onEvent) c.sh.onEvent('fdisk', { dev: rest[0], disk: d });
    c.out(note(`(interactive fdisk: open the "Partition Planner" simulation to practise n/p/t/w — or use the scriptable form here:\n  parted -s ${rest[0]} mklabel msdos mkpart primary ext4 1MiB 5GiB)`));
  };
  C.cfdisk = C.fdisk;
  C.gdisk = (c) => {
    if (needRoot(c, `Problem opening ${c.args[c.args.length - 1]} for reading! Error is 13.`)) return 1;
    const dev = c.args.filter((a) => !a.startsWith('-'))[0];
    const d = diskOf(c, dev);
    if (!d) return c.fail(`Problem opening ${dev} for reading! Error is 2.`);
    c.out(`GPT fdisk (gdisk) version 1.0.9\n\nPartition table scan:\n  MBR: ${d.label === 'gpt' ? 'protective' : d.label ? 'MBR only' : 'not present'}\n  BSD: not present\n  APM: not present\n  GPT: ${d.label === 'gpt' ? 'present' : 'not present'}\n\n`);
    if (c.args.indexOf('-l') >= 0) {
      c.out(`Disk ${dev}: ${d.size * 2048} sectors, ${(d.size / 1024).toFixed(1)} GiB\nLogical sector size: 512 bytes\nNumber  Start (sector)    End (sector)  Size       Code  Name\n`);
      for (const p of d.parts) c.out(`   ${p.n}          ${String(p.start * 2048).padStart(8)}       ${String(p.end * 2048 - 1).padStart(9)}   ${MiB(p.end - p.start).padEnd(9)}  ${p.type === 'Linux swap' ? '8200' : p.type === 'EFI System' ? 'EF00' : '8300'}  ${p.type}\n`);
    } else c.out(note('(gdisk is interactive: n=new, d=delete, t=type code (8300 Linux, 8200 swap, EF00 EFI), p=print, w=write)'));
  };
  C.sgdisk = (c) => {
    if (needRoot(c)) return 1;
    const dev = c.args[c.args.length - 1];
    const d = diskOf(c, dev);
    if (!d) return c.fail(`Problem opening ${dev}`);
    if (c.args.indexOf('-p') >= 0) return C.gdisk({ ...c, args: ['-l', dev] });
    if (c.args.indexOf('-o') >= 0 || c.args.indexOf('--clear') >= 0) {
      d.label = 'gpt';
      d.parts = [];
    }
    c.out('The operation has completed successfully.\n');
  };
  const parseSize = (s, total) => {
    const m = /^(\d*\.?\d+)\s*(MiB|GiB|MB|GB|M|G|KiB|kB|K|s|%)?$/i.exec(String(s));
    if (!m) return NaN;
    const v = +m[1];
    switch ((m[2] || 'MB').toLowerCase()) {
      case 'gib':
      case 'g':
        return v * 1024;
      case 'gb':
        return (v * 1e9) / 1048576;
      case 'mb':
        return (v * 1e6) / 1048576;
      case 'kib':
      case 'k':
      case 'kb':
        return v / 1024;
      case 's':
        return v / 2048;
      case '%':
        return (total * v) / 100;
      default:
        return v;
    }
  };
  function makePartDev(c, name, p) {
    const dev = `/dev/${name}${p.n}`;
    asRoot(c.sh, () => {
      if (!c.fs.exists(dev)) {
        const n = c.fs.create(dev, '/', { t: 'b', mode: 0o660, rdev: [8, (name === 'sdb' ? 16 : 0) + p.n], devname: name + p.n });
        n.gid = 6;
      }
    });
    c.fs.devices[dev] = { size: MiB(p.end - p.start) };
  }
  C.parted = (c) => {
    let args = c.args.slice();
    const script = args[0] === '-s' || args[0] === '--script';
    if (script) args.shift();
    if (args[0] === '-l' || args[0] === '--list') return C.fdisk({ ...c, args: ['-l'] });
    if (needRoot(c, 'Error: Error opening ' + (args[0] || '/dev/sda') + ': Permission denied')) return 1;
    const dev = args.shift();
    const d = diskOf(c, dev);
    if (!d) return c.fail(`Error: Could not stat device ${dev} - No such file or directory.`);
    const name = dev.replace('/dev/', '');
    if (!args.length) {
      c.out(`GNU Parted 3.5\nUsing ${dev}\nWelcome to GNU Parted! Type 'help' to view a list of commands.\n`);
      c.out(note(`(interactive parted is not simulated; use: parted -s ${dev} mklabel gpt | mkpart primary ext4 1MiB 10GiB | print | rm 1)`));
      return 0;
    }
    while (args.length) {
      const cmd = args.shift();
      if (cmd === 'print' || cmd === 'p') {
        c.out(`Model: ATA ${d.model} (scsi)\nDisk ${dev}: ${(d.size * 1.048576 / 1000).toFixed(1)}GB\nSector size (logical/physical): 512B/512B\nPartition Table: ${d.label || 'unknown'}\nDisk Flags: \n\n`);
        if (!d.label) {
          c.err(`Error: ${dev}: unrecognised disk label\n`);
          return 1;
        }
        c.out(`Number  Start   End     Size    ${d.label === 'gpt' ? 'File system  Name     Flags' : 'Type     File system  Flags'}\n`);
        for (const p of d.parts) {
          const info = c.fs.devices[`/dev/${name}${p.n}`] || {};
          c.out(` ${p.n}      ${(Math.round(p.start * 1.048576) + 'MB').padEnd(7)} ${(Math.round(p.end * 1.048576) + 'MB').padEnd(7)} ${(Math.round((p.end - p.start) * 1.048576) + 'MB').padEnd(7)} ${d.label === 'gpt' ? (info.fstype || '').padEnd(12) + ' ' + (p.name || 'primary') : (p.kind || 'primary').padEnd(8) + ' ' + (info.fstype || '')}\n`);
        }
      } else if (cmd === 'mklabel' || cmd === 'mktable') {
        const t = args.shift();
        if (t !== 'gpt' && t !== 'msdos') return c.fail(`Error: Invalid partition table type ${t} (use gpt or msdos)`);
        if (c.fs.mounts.some((m) => m.dev.startsWith(dev))) return c.fail(`Error: Partition(s) on ${dev} are being used.`);
        d.label = t;
        d.parts = [];
      } else if (cmd === 'mkpart') {
        if (!d.label) return c.fail(`Error: ${dev}: unrecognised disk label`);
        let kind = 'primary';
        let pname = 'primary';
        if (d.label === 'msdos') {
          kind = args.shift();
          if (['primary', 'extended', 'logical'].indexOf(kind) < 0) return c.fail('Error: Expecting a partition type (primary, extended, logical).');
        } else if (!/^\d/.test(args[0])) pname = args.shift();
        let fsType = null;
        if (args[0] && !/^\d/.test(args[0])) fsType = args.shift();
        const start = parseSize(args.shift(), d.size);
        const end = parseSize(args.shift(), d.size);
        if (isNaN(start) || isNaN(end) || end <= start) return c.fail('Error: Invalid start/end.');
        if (end > d.size + 0.01) return c.fail('Error: The location is outside of the device ' + dev + '.');
        if (d.parts.some((p) => start < p.end && end > p.start && !(p.kind === 'extended' && kind === 'logical'))) return c.fail("Error: Can't have overlapping partitions.");
        if (d.label === 'msdos') {
          const prim = d.parts.filter((p) => p.kind !== 'logical');
          if (kind !== 'logical' && prim.length >= 4) return c.fail('Error: Too many primary partitions. (MBR allows max. 4 primary, or 3 primary + 1 extended)');
          if (kind === 'extended' && prim.some((p) => p.kind === 'extended')) return c.fail("Error: Can't create more than one extended partition.");
          if (kind === 'logical' && !prim.some((p) => p.kind === 'extended')) return c.fail("Error: Can't create a logical partition without an extended partition.");
        }
        let n;
        if (d.label === 'msdos' && kind === 'logical') n = Math.max(4, ...d.parts.filter((p) => p.kind === 'logical').map((p) => p.n)) + 1;
        else {
          n = 1;
          while (d.parts.some((p) => p.n === n)) n++;
        }
        const p = { n, start, end, kind, name: pname, type: fsType === 'linux-swap' ? 'Linux swap' : kind === 'extended' ? 'Extended' : 'Linux filesystem', id: kind === 'extended' ? '5' : fsType === 'linux-swap' ? '82' : '83' };
        if (d.label === 'msdos') p.type = kind === 'extended' ? 'Extended' : fsType === 'linux-swap' ? 'Linux swap / Solaris' : 'Linux';
        d.parts.push(p);
        d.parts.sort((a, b) => a.n - b.n);
        makePartDev(c, name, p);
      } else if (cmd === 'rm') {
        const n = +args.shift();
        const dv = `/dev/${name}${n}`;
        if (c.fs.mounts.some((m) => m.dev === dv)) return c.fail(`Error: Partition ${dv} is being used. You must unmount it before you modify it with Parted.`);
        d.parts = d.parts.filter((p) => p.n !== n);
        asRoot(c.sh, () => c.fs.exists(dv) && c.fs.unlink(dv, '/'));
        delete c.fs.devices[dv];
      } else if (cmd === 'set') {
        const n = +args.shift();
        const flag = args.shift();
        const on = args.shift();
        const p = d.parts.find((x) => x.n === n);
        if (p && flag === 'boot') p.boot = on === 'on';
        if (p && flag === 'esp') p.type = 'EFI System';
        if (p && flag === 'lvm') p.type = 'Linux LVM';
      } else if (cmd === 'unit') args.shift();
      else return c.fail(`Error: unknown command ${cmd}`);
    }
    if (!script) c.out('Information: You may need to update /etc/fstab.\n\n');
  };
  C.partprobe = (c) => (needRoot(c) ? 1 : 0);
  function mkfsImpl(c, type, args) {
    const { o, rest } = getopt(args, 'L:n:t:fFqjvcm:b:i:N:T:O:E:', { 'label=': 'L' }, { loose: true });
    if (o.t && !type) type = o.t;
    type = type || 'ext2';
    const dev = rest.filter((r) => !r.startsWith('-'))[0];
    if (!dev) return c.fail(`Usage: mkfs.${type} [options] device`);
    if (needRoot(c, `mkfs.${type}: Permission denied while trying to determine filesystem size`)) return 1;
    if (o.j && type === 'ext2') type = 'ext3';
    const r = c.fs.tryLookup(dev, c.sh.cwd);
    if (!r) return c.fail(`The file ${dev} does not exist and no size was specified.`);
    if (r.node.t !== 'b') return c.fail(`${dev} is not a block special device.`);
    if (/^\/dev\/sd[a-z]$/.test(dev) && SIM.disks(c.sh)[dev.slice(5)].parts.length && !o.F) return c.fail(`${dev} contains a partition table; refusing (use -F to force)`);
    if (c.fs.mounts.some((m) => m.dev === dev) || /^\/dev\/sda[1-3]$/.test(dev)) return c.fail(`${dev} contains a mounted filesystem.`);
    const prev = c.fs.devices[dev] || {};
    if (type === 'xfs' && prev.fstype && !o.f) return c.fail(`mkfs.xfs: ${dev} appears to contain an existing filesystem (${prev.fstype}).\nmkfs.xfs: Use the -f option to force overwrite.`);
    const label = o.L || o.n || '';
    const size = prev.size || '5G';
    const d = c.fs.mkfs(dev, type, label);
    d.size = size;
    if (/^ext/.test(type)) {
      c.out(`mke2fs 1.47.0 (5-Feb-2023)\nCreating filesystem with 1310720 4k blocks and 327680 inodes\nFilesystem UUID: ${d.uuid}\nSuperblock backups stored on blocks: \n\t32768, 98304, 163840, 229376, 294912, 819200, 884736\n\nAllocating group tables: done                            \nWriting inode tables: done                            \n${type !== 'ext2' ? 'Creating journal (16384 blocks): done\n' : ''}Writing superblocks and filesystem accounting information: done\n\n`);
    } else if (type === 'xfs') {
      c.out(`meta-data=${dev.padEnd(22)} isize=512    agcount=4, agsize=327680 blks\n         =                       sectsz=512   attr=2, projid32bit=1\n         =                       crc=1        finobt=1, sparse=1, rmapbt=0\ndata     =                       bsize=4096   blocks=1310720, imaxpct=25\nnaming   =version 2              bsize=4096   ascii-ci=0, ftype=1\nlog      =internal log           bsize=4096   blocks=16384, version=2\nrealtime =none                   extsz=4096   blocks=0, rtextents=0\n`);
    } else if (type === 'vfat' || type === 'fat') {
      d.fstype = 'vfat';
      c.out(`mkfs.fat 4.2 (2021-01-31)\n`);
    } else if (type === 'btrfs') c.out(`btrfs-progs v6.2\nLabel:              ${label || '(null)'}\nUUID:               ${d.uuid}\nFilesystem size:    ${size}\n`);
    else if (type === 'exfat') c.out('exfatprogs version : 1.2.0\nCreating exFAT filesystem(' + dev + ', cluster size=32768)\nexFAT format complete!\n');
    return 0;
  }
  C.mkfs = (c) => {
    const args = c.args.slice();
    let type = null;
    const i = args.indexOf('-t');
    if (i >= 0) {
      type = args[i + 1];
      args.splice(i, 2);
    }
    return mkfsImpl(c, type, args);
  };
  C.mke2fs = (c) => mkfsImpl(c, null, c.args);
  ['ext2', 'ext3', 'ext4', 'xfs', 'vfat', 'fat', 'btrfs', 'exfat'].forEach((t) => (C['mkfs.' + t] = (c) => mkfsImpl(c, t, c.args)));
  C.mkdosfs = (c) => mkfsImpl(c, 'vfat', c.args);
  C.mkswap = (c) => {
    const { o, rest } = getopt(c.args, 'L:fc', { 'label=': 'L' });
    if (needRoot(c, `mkswap: cannot open ${rest[0]}: Permission denied`)) return 1;
    const dev = rest[0];
    const r = c.fs.tryLookup(dev, c.sh.cwd);
    if (!r) return c.fail(`cannot open ${dev}: No such file or directory`);
    const size = r.node.t === 'f' ? r.node.fsize || SIM.byteLen(r.node.data) : 4294967296;
    if (r.node.t === 'f' && (r.node.mode & 0o077)) c.err(`mkswap: ${dev}: insecure permissions ${(r.node.mode & 0o777).toString(8).padStart(4, '0')}, fix with: chmod 0600 ${dev}\n`);
    const key = r.node.t === 'f' ? r.path : dev;
    c.fs.devices[key] = Object.assign(c.fs.devices[key] || {}, { fstype: 'swap', uuid: SIM.uuid(), label: o.L || '' });
    c.out(`Setting up swapspace version 1, size = ${SIM.human(size)}iB (${size - 4096} bytes)\nno label, UUID=${c.fs.devices[key].uuid}\n`);
  };
  C.swapon = (c) => {
    const sh = c.sh;
    sh.state.swaps = sh.state.swaps || [];
    const { o, rest } = getopt(c.args, 'sape:', { summary: 's', show: 'show', all: 'a' });
    if (o.s || o.show || !rest.length && !o.a) {
      if (o.show) {
        c.out('NAME      TYPE      SIZE USED PRIO\n/dev/sda3 partition   4G   0B   -2\n');
        sh.state.swaps.forEach((s, i) => c.out(`${s.padEnd(9)} ${s.startsWith('/dev') ? 'partition' : 'file     '}   1G   0B   ${-3 - i}\n`));
      } else {
        c.out('Filename\t\t\t\tType\t\tSize\t\tUsed\t\tPriority\n/dev/sda3                               partition\t4194300\t\t0\t\t-2\n');
        sh.state.swaps.forEach((s, i) => c.out(`${s.padEnd(40)}${s.startsWith('/dev') ? 'partition' : 'file'}\t1048572\t\t0\t\t${-3 - i}\n`));
      }
      return 0;
    }
    if (needRoot(c, `swapon: ${rest[0] || ''}: swapon failed: Operation not permitted`)) return 1;
    for (const d of rest) {
      const r = c.fs.tryLookup(d, sh.cwd);
      const key = r && r.node.t === 'f' ? r.path : d;
      const info = c.fs.devices[key];
      if (!info || info.fstype !== 'swap') {
        c.err(`swapon: ${d}: read swap header failed\n`);
        return 255;
      }
      if (sh.state.swaps.indexOf(key) >= 0) {
        c.err(`swapon: ${d}: swapon failed: Device or resource busy\n`);
        return 255;
      }
      sh.state.swaps.push(key);
    }
  };
  C.swapoff = (c) => {
    if (needRoot(c, 'swapoff: Operation not permitted')) return 1;
    const sh = c.sh;
    sh.state.swaps = (sh.state.swaps || []).filter((s) => c.args.indexOf(s) < 0 && c.args.indexOf('-a') < 0);
  };
  function parseFstab(sh) {
    return sh.fs
      .readFile('/etc/fstab', '/')
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => {
        const [spec, file, type, opts, dump, pass] = l.trim().split(/\s+/);
        return { spec, file, type, opts: opts || 'defaults', dump, pass };
      });
  }
  SIM.parseFstab = parseFstab;
  function resolveSpec(sh, spec) {
    const m = /^(UUID|LABEL|PARTUUID)=(.*)$/.exec(spec);
    if (!m) return spec;
    for (const [k, v] of Object.entries(sh.fs.devices)) {
      if (m[1] === 'UUID' && v.uuid === m[2].replace(/"/g, '')) return k;
      if (m[1] === 'LABEL' && v.label === m[2].replace(/"/g, '')) return k;
    }
    return null;
  }
  const BASE_MOUNTS = [
    ['sysfs', '/sys', 'sysfs', 'rw,nosuid,nodev,noexec,relatime'],
    ['proc', '/proc', 'proc', 'rw,nosuid,nodev,noexec,relatime'],
    ['udev', '/dev', 'devtmpfs', 'rw,nosuid,relatime,size=1980000k,nr_inodes=495000,mode=755'],
    ['devpts', '/dev/pts', 'devpts', 'rw,nosuid,noexec,relatime,gid=5,mode=620,ptmxmode=000'],
    ['tmpfs', '/run', 'tmpfs', 'rw,nosuid,nodev,noexec,relatime,size=402828k,mode=755'],
    ['/dev/sda2', '/', 'ext4', 'rw,relatime,errors=remount-ro'],
    ['tmpfs', '/dev/shm', 'tmpfs', 'rw,nosuid,nodev'],
    ['cgroup2', '/sys/fs/cgroup', 'cgroup2', 'rw,nosuid,nodev,noexec,relatime,nsdelegate,memory_recursiveprot'],
    ['/dev/sda1', '/boot/efi', 'vfat', 'rw,relatime,fmask=0077,dmask=0077,codepage=437,iocharset=ascii,shortname=mixed,utf8,errors=remount-ro'],
    ['tmpfs', '/tmp', 'tmpfs', 'rw,nosuid,nodev,size=1048576k'],
    ['tmpfs', '/run/user/1000', 'tmpfs', 'rw,nosuid,nodev,relatime,size=402824k,nr_inodes=100706,mode=700,uid=1000,gid=1000'],
  ];
  SIM.mountList = (sh) => BASE_MOUNTS.concat(sh.fs.mounts.map((m) => [m.dev, m.target, m.fstype, m.opts]));
  C.mount = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'at:o:rwvlnfL:U:B', { all: 'a', 'types=': 't', 'options=': 'o', 'read-only': 'r', 'read-write': 'w', verbose: 'v', bind: 'B', 'label=': 'L', 'uuid=': 'U' });
    if (!rest.length && !o.a && !o.L && !o.U) {
      for (const m of SIM.mountList(sh)) if (!o.t || m[2] === o.t) c.out(`${m[0]} on ${m[1]} type ${m[2]} (${m[3]})\n`);
      return 0;
    }
    const doMount = (dev, dir, type, opts, quietErr) => {
      const info = sh.fs.devices[dev];
      const t = sh.fs.tryLookup(dir, sh.cwd);
      if (!t) return c.fail(`${dir}: mount point does not exist.`, 32);
      if (t.node.t !== 'd') return c.fail(`${dir}: mount point is not a directory.`, 32);
      if (!sh.fs.tryLookup(dev, sh.cwd) && !info) return c.fail(`${dir}: special device ${dev} does not exist.`, 32);
      if (sh.fs.mounts.some((m) => m.dev === dev) && !/remount/.test(opts || '')) return c.fail(`${dir}: ${dev} already mounted on ${sh.fs.mounts.find((m) => m.dev === dev).target}.`, 32);
      if (/remount/.test(opts || '')) {
        const m = sh.fs.mounts.find((x) => x.target === t.path);
        if (!m) return c.fail(`${dir}: mount point not mounted or bad option.`, 32);
        m.opts = (opts.indexOf('ro') >= 0 ? 'ro' : 'rw') + ',relatime';
        return 0;
      }
      if (!info || !info.fstype || !info.root) {
        if (dev === '/dev/sr0') {
          if (!info.root) {
            const d = sh.fs.mkfs('/dev/sr0', 'iso9660', info.label);
            d.uuid = '2024-02-10-11-02-33-00';
            asRoot(sh, () => {
              sh.fs.writeFile('/README.txt', '/', '');
            });
            const root = sh.fs.node(d.root);
            const mk = (name, data) => {
              const n = sh.fs._alloc({ t: 'f', mode: 0o444, uid: 0, gid: 0, data, dev: '/dev/sr0' });
              root.ents[name] = n.ino;
            };
            asRoot(sh, () => sh.fs.unlink('/README.txt', '/'));
            mk('README.txt', 'Debian GNU/Linux 12.5.0 "Bookworm" - Official amd64 NETINST\n');
            mk('md5sum.txt', 'f1c3a5... ./README.txt\n');
          }
        } else return c.fail(`${dir}: wrong fs type, bad option, bad superblock on ${dev}, missing codepage or helper program, or other error.\n       dmesg(1) may have more information after failed mount system call.`, 32);
      }
      const realType = sh.fs.devices[dev].fstype;
      if (type && type !== 'auto' && type !== realType && !(type === 'ext3' && realType === 'ext4') && !(type.split(',').indexOf(realType) >= 0)) return c.fail(`${dir}: wrong fs type, bad option, bad superblock on ${dev}, missing codepage or helper program, or other error.`, 32);
      let mo = opts ? opts.replace(/\bdefaults\b/, 'rw') : 'rw';
      if (o.r || dev === '/dev/sr0') mo = mo.replace(/\brw\b/, 'ro').replace(/^(?!.*\bro\b)/, 'ro,');
      if (mo.indexOf('relatime') < 0) mo += ',relatime';
      sh.fs.mount(dev, dir, sh.cwd, realType, mo.replace(/^,|,$/g, ''));
      if (dev === '/dev/sr0' && !quietErr) c.err(`mount: ${t.path}: WARNING: source write-protected, mounted read-only.\n`);
      if (o.v) c.out(`mount: ${dev} mounted on ${t.path}.\n`);
      return 0;
    };
    const fstab = parseFstab(sh);
    if (o.a) {
      if (needRoot(c, 'mount: only root can use "--all" option')) return 32;
      let st = 0;
      for (const e of fstab) {
        if (e.type === 'swap' || /noauto/.test(e.opts) || e.file === 'none') continue;
        const dev = resolveSpec(sh, e.spec);
        if (!dev) {
          c.err(`mount: ${e.file}: can't find ${e.spec}.\n`);
          st = 32;
          continue;
        }
        if (['/', '/boot/efi', '/tmp'].indexOf(e.file) >= 0) continue;
        if (sh.fs.mounts.some((m) => m.target === e.file)) continue;
        const r = doMount(dev, e.file, e.type, e.opts, true);
        if (r) st = r;
      }
      return st;
    }
    let dev = o.L ? resolveSpec(sh, 'LABEL=' + o.L) : o.U ? resolveSpec(sh, 'UUID=' + o.U) : rest[0];
    let dir = o.L || o.U ? rest[0] : rest[1];
    if (rest.length === 1 && !o.L && !o.U) {
      const e = fstab.find((x) => x.file === rest[0] || x.spec === rest[0] || resolveSpec(sh, x.spec) === rest[0]);
      if (!e) return c.fail(`${rest[0]}: can't find in /etc/fstab.`, 1);
      dev = resolveSpec(sh, e.spec);
      dir = e.file;
      if (sh.uid !== 0 && !/\b(user|users)\b/.test(e.opts)) return c.fail(`${dir}: must be superuser to use mount.`, 1);
      return doMount(dev, dir, e.type, e.opts.replace(/,?\b(users?|noauto)\b/g, ''));
    }
    if (needRoot(c, `mount: ${dir}: must be superuser to use mount.`)) return 32;
    if (o.B) {
      c.out(note('(bind mounts are not simulated)'));
      return 0;
    }
    if (!dev) return c.fail(`can't find ${o.L ? 'LABEL=' + o.L : 'UUID=' + o.U}.`, 1);
    return doMount(dev, dir, o.t, o.o);
  };
  C.umount = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'aflrvR', { all: 'a', force: 'f', lazy: 'l', verbose: 'v' });
    if (!rest.length && !o.a) return c.fail('bad usage');
    const fstab = parseFstab(sh);
    for (const t of rest) {
      const isUser = fstab.some((e) => (e.file === t || e.spec === t) && /\busers?\b/.test(e.opts));
      if (sh.uid !== 0 && !isUser) return c.fail(`${t}: must be superuser to unmount.`, 32);
      const abs = sh.fs.normalize(t, sh.cwd);
      if (['/', '/boot/efi', '/proc', '/sys', '/dev', '/run', '/tmp'].indexOf(abs) >= 0) return c.fail(`${abs}: target is busy.`, 32);
      const m = sh.fs.mounts.find((x) => x.dev === t || x.target === abs);
      if (!m) return c.fail(`${t}: not mounted.`, 32);
      if (!o.l && (sh.cwd === m.target || sh.cwd.startsWith(m.target + '/'))) return c.fail(`${m.target}: target is busy.`, 32);
      sh.fs.umount(m.target, '/');
      if (o.v) c.out(`umount: ${m.target} unmounted\n`);
    }
  };
  C.findmnt = (c) => {
    c.out('TARGET                SOURCE     FSTYPE   OPTIONS\n');
    const ms = SIM.mountList(c.sh).sort((a, b) => a[1].localeCompare(b[1]));
    const want = c.args.filter((a) => !a.startsWith('-'));
    for (const m of ms) if (!want.length || want.indexOf(m[1]) >= 0 || want.indexOf(m[0]) >= 0) c.out(`${(m[1] === '/' ? '/' : '├─' + m[1]).padEnd(21)} ${m[0].padEnd(10)} ${m[2].padEnd(8)} ${m[3].slice(0, 40)}\n`);
  };
  function fsckImpl(c, forceType) {
    const { o, rest } = getopt(c.args, 'fnypaANRrvVCt:Tsb:', { 'force': 'f' });
    if (needRoot(c, `fsck: cannot open ${rest[0]}: Permission denied`)) return 8;
    if (o.A && !rest.length) {
      // walk /etc/fstab in pass order (6th field), -R skips the root filesystem
      const tab = c.fs.readFile('/etc/fstab', '/').split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).map((l) => l.trim().split(/\s+/));
      const list = tab.filter((f) => +f[5] > 0 && !(o.R && f[1] === '/')).sort((a, b) => +a[5] - +b[5]);
      c.out('fsck from util-linux 2.38.1\n');
      for (const f of list) c.out(`${f[0]}: clean (checked in pass ${f[5]}, mounted on ${f[1]} — skipped)\n`);
      if (!list.length) c.out(note('(no filesystems with a non-zero pass number in /etc/fstab)'));
      return 0;
    }
    const dev = rest[0];
    if (!dev) return c.fail('no device specified', 8);
    const info = c.fs.devices[dev];
    const type = forceType || o.t || (info && info.fstype);
    if (!o.N && !forceType) c.out('fsck from util-linux 2.38.1\n');
    if (o.N) {
      c.out(`fsck from util-linux 2.38.1\n[/sbin/fsck.${type} (1) -- ${dev}] fsck.${type} ${dev}\n`);
      return 0;
    }
    if (!info || !info.fstype) return c.fail(`Bad magic number in super-block while trying to open ${dev}`, 8);
    const mounted = c.fs.mounts.some((m) => m.dev === dev) || /^\/dev\/sda[12]$/.test(dev);
    if (type === 'xfs') {
      c.out(`If you wish to check the consistency of an XFS filesystem or\nrepair a damaged filesystem, see xfs_repair(8).\n`);
      return 0;
    }
    if (type === 'vfat') {
      c.out(`fsck.fat 4.2 (2021-01-31)\n${dev}: 3 files, 1493/130812 clusters\n`);
      return 0;
    }
    if (mounted) {
      c.out(`e2fsck 1.47.0 (5-Feb-2023)\n${dev} is mounted.\ne2fsck: Cannot continue, aborting.\n\n\n`);
      return 8;
    }
    c.out(`e2fsck 1.47.0 (5-Feb-2023)\n`);
    if (o.f) c.out(`Pass 1: Checking inodes, blocks, and sizes\nPass 2: Checking directory structure\nPass 3: Checking directory connectivity\nPass 4: Checking reference counts\nPass 5: Checking group summary information\n`);
    const files = Object.keys(c.fs.node(info.root).ents).length + 10;
    c.out(`${info.label || dev}: ${o.f ? '' : 'clean, '}${files}/327680 files (0.0% non-contiguous), 42078/1310720 blocks\n`);
    return 0;
  }
  C.fsck = (c) => fsckImpl(c);
  C.e2fsck = (c) => fsckImpl(c, 'ext4');
  C['fsck.ext4'] = C.e2fsck;
  C['fsck.ext3'] = C.e2fsck;
  C['fsck.ext2'] = C.e2fsck;
  C['fsck.xfs'] = (c) => (c.out('If you wish to check the consistency of an XFS filesystem or\nrepair a damaged filesystem, see xfs_repair(8).\n'), 0);
  C['fsck.vfat'] = (c) => fsckImpl({ ...c }, 'vfat');
  C.xfs_repair = (c) => {
    if (needRoot(c)) return 1;
    const { o, rest } = getopt(c.args, 'nLvd', {});
    const dev = rest[0];
    const info = c.fs.devices[dev];
    if (!info || info.fstype !== 'xfs') return c.fail(`${dev}: is not a valid XFS filesystem (unexpected SB magic number)`);
    if (c.fs.mounts.some((m) => m.dev === dev)) return c.fail(`${dev} contains a mounted filesystem\n\nfatal error -- couldn't initialize XFS library`);
    c.out(`Phase 1 - find and verify superblock...\nPhase 2 - using internal log\n        - zero log...\n        - scan filesystem freespace and inode maps...\nPhase 3 - for each AG...\n        - scan ${o.n ? '(but don\'t clear) ' : 'and clear '}agi unlinked lists...\nPhase 4 - check for duplicate blocks...\nPhase 5 - rebuild AG headers and trees...\nPhase 6 - check inode connectivity...\nPhase 7 - verify and correct link counts...\n${o.n ? 'No modify flag set, skipping filesystem flush and exiting.\n' : 'done\n'}`);
  };
  C.xfs_db = (c) => {
    if (needRoot(c)) return 1;
    c.out(note('(xfs_db is an interactive XFS debugger; e.g. xfs_db -r -c "frag" /dev/sdb1 prints fragmentation)'));
    if (c.args.indexOf('frag') >= 0 || c.args.some((a) => /frag/.test(a))) c.out('actual 214, ideal 210, fragmentation factor 1.87%\n');
  };
  C.xfs_fsr = (c) => (needRoot(c) ? 1 : (c.out('xfs_fsr -m /proc/mounts -t 7200 -f /var/tmp/.fsrlast_xfs ...\n/dev/sdb1 start inode=0\n'), 0));
  C.xfs_info = (c) => {
    const m = c.fs.mounts.find((x) => x.target === c.fs.normalize(c.args[0] || '/', c.sh.cwd) || x.dev === c.args[0]);
    if (!m || m.fstype !== 'xfs') return c.fail(`${c.args[0]} is not a mounted XFS filesystem`);
    c.out(`meta-data=${m.dev.padEnd(22)} isize=512    agcount=4, agsize=327680 blks\ndata     =                       bsize=4096   blocks=1310720, imaxpct=25\nlog      =internal log           bsize=4096   blocks=16384, version=2\n`);
  };
  C.xfs_admin = (c) => {
    if (needRoot(c)) return 1;
    const dev = c.args[c.args.length - 1];
    if (c.args[0] === '-l') c.out(`label = "${(c.fs.devices[dev] || {}).label || ''}"\n`);
    if (!c.fs.devices[dev]) return c.fail(`${dev}: No such file or directory`);
    if (c.args[0] === '-L') c.fs.devices[dev].label = c.args[1];
    if (c.args[0] === '-u') c.out(`UUID = ${(c.fs.devices[dev] || {}).uuid}\n`);
  };
  C.xfs_growfs = (c) => (needRoot(c) ? 1 : 0);
  C.resize2fs = (c) => (needRoot(c) ? 1 : (c.out('resize2fs 1.47.0 (5-Feb-2023)\nThe filesystem is already 1310720 (4k) blocks long.  Nothing to do!\n'), 0));
  C.tune2fs = (c) => {
    const { o, rest } = getopt(c.args, 'lc:C:i:L:m:O:e:r:jU:E:', {});
    if (needRoot(c, `tune2fs: Permission denied while trying to open ${rest[0]}`)) return 1;
    const dev = rest[0];
    const info = c.fs.devices[dev];
    if (!info || !/^ext/.test(info.fstype || '')) return c.fail(`Bad magic number in super-block while trying to open ${dev}`);
    info.tune = info.tune || { maxMount: -1, interval: 0, reserved: 5 };
    c.out('tune2fs 1.47.0 (5-Feb-2023)\n');
    if (o.c) {
      info.tune.maxMount = +o.c;
      c.out(`Setting maximal mount count to ${o.c}\n`);
    }
    if (o.i) {
      info.tune.interval = o.i;
      c.out(`Setting interval between checks to ${parseInt(o.i, 10) * ({ d: 86400, w: 604800, m: 2592000 }[o.i.slice(-1)] || 86400)} seconds\n`);
    }
    if (o.L !== undefined) info.label = o.L;
    if (o.m) {
      info.tune.reserved = +o.m;
      c.out(`Setting reserved blocks percentage to ${o.m}% (${Math.floor(13107.2 * o.m)} blocks)\n`);
    }
    if (o.j) {
      info.fstype = 'ext3';
      c.out('Creating journal inode: done\n');
    }
    if (o.O) {
      if (o.O === '^has_journal') info.fstype = 'ext2';
      if (o.O === 'has_journal') info.fstype = 'ext3';
      if (/extent|dir_index/.test(o.O) && info.fstype === 'ext3') info.fstype = 'ext4';
    }
    if (o.U) info.uuid = o.U === 'random' || o.U === 'time' ? SIM.uuid() : o.U;
    if (o.l) {
      c.out(`Filesystem volume name:   ${info.label || '<none>'}
Last mounted on:          <not available>
Filesystem UUID:          ${info.uuid}
Filesystem magic number:  0xEF53
Filesystem revision #:    1 (dynamic)
Filesystem features:      ${info.fstype === 'ext2' ? '' : 'has_journal '}ext_attr resize_inode dir_index filetype${info.fstype === 'ext4' ? ' extent 64bit flex_bg sparse_super large_file huge_file dir_nlink extra_isize metadata_csum' : ' sparse_super large_file'}
Filesystem state:         clean
Errors behavior:          Continue
Filesystem OS type:       Linux
Inode count:              327680
Block count:              1310720
Reserved block count:     ${Math.floor(13107.2 * info.tune.reserved)}
Free blocks:              1268642
Free inodes:              327669
First block:              0
Block size:               4096
Mount count:              ${c.fs.mounts.some((m) => m.dev === dev) ? 1 : 0}
Maximum mount count:      ${info.tune.maxMount}
Check interval:           ${info.tune.interval === 0 ? '0 (<none>)' : info.tune.interval}
Reserved blocks uid:      0 (user root)
Reserved blocks gid:      0 (group root)
Inode size:	          256
Journal inode:            8
`);
    }
  };
  C.dumpe2fs = (c) => {
    if (needRoot(c, `dumpe2fs: Permission denied while trying to open ${c.args[c.args.length - 1]}`)) return 1;
    const dev = c.args.filter((a) => !a.startsWith('-'))[0];
    const info = c.fs.devices[dev];
    if (!info || !/^ext/.test(info.fstype || '')) return c.fail(`Bad magic number in super-block while trying to open ${dev}`);
    c.out('dumpe2fs 1.47.0 (5-Feb-2023)\n');
    C.tune2fs({ ...c, args: ['-l', dev], out: (s) => c.out(s.replace(/^tune2fs.*\n/, '')) });
    if (c.args.indexOf('-h') < 0) c.out(`\nGroup 0: (Blocks 0-32767) csum 0x1a2b [ITABLE_ZEROED]\n  Primary superblock at 0, Group descriptors at 1-1\n  Block bitmap at 2 (+2)\n  Inode bitmap at 18 (+18)\n  Inode table at 34-545 (+34)\n`);
  };
  C.debugfs = (c) => {
    if (needRoot(c)) return 1;
    const req = c.args.indexOf('-R') >= 0 ? c.args[c.args.indexOf('-R') + 1] : null;
    if (req && /^stats/.test(req)) return C.tune2fs({ ...c, args: ['-l', c.args[c.args.length - 1]] });
    c.out('debugfs 1.47.0 (5-Feb-2023)\n');
    c.out(note('(debugfs is an interactive ext2/3/4 debugger: ls, stat <inode>, undel, lsdel ... — use -R "cmd" for one-shot use)'));
  };
  C.e2label = (c) => {
    if (needRoot(c)) return 1;
    const [dev, label] = c.args;
    const info = c.fs.devices[dev];
    if (!info) return c.fail(`No such file or directory while trying to open ${dev}`);
    if (label !== undefined) info.label = label;
    else c.out((info.label || '') + '\n');
  };

  /* ================= systemd, runlevels, boot ================= */
  const TARGETS = { 0: 'poweroff.target', 1: 'rescue.target', 2: 'multi-user.target', 3: 'multi-user.target', 4: 'multi-user.target', 5: 'graphical.target', 6: 'reboot.target' };
  SIM.TARGETS = TARGETS;
  const unitFile = (n) => (/\.(timer|socket|mount|path|target|service)$/.test(n) ? n : n + '.service');
  function unitName(u) {
    return u.replace(/\.service$/, '');
  }
  function svc(sh, u) {
    const n = unitName(u);
    // units written by the user (e.g. /etc/systemd/system/data.mount) become known after creation
    if (!sh.state.services[n] && /^[\w@.-]+$/.test(u)) {
      const fn = u.indexOf('.') >= 0 ? u : u + '.service';
      for (const d of ['/etc/systemd/system/', '/lib/systemd/system/', '/usr/lib/systemd/system/']) {
        const txt = asRoot(sh, () => {
          try {
            return sh.fs.readFile(d + fn, '/');
          } catch (e) {
            return null;
          }
        });
        if (txt !== null) {
          const m = /^Description=(.*)$/m.exec(txt);
          const ex = /^(?:ExecStart|What)=(.*)$/m.exec(txt);
          sh.state.services[n] = { desc: m ? m[1] : fn, active: false, enabled: false, pid: 0, bin: ex ? ex[1] : '', timer: fn.endsWith('.timer'), kind: fn.split('.').pop() };
          break;
        }
      }
    }
    const s = sh.state.services[n] || sh.state.services[n.replace(/^sshd$/, 'ssh')] || (n === 'httpd' ? sh.state.services.apache2 : null);
    return s ? { name: s === sh.state.services.ssh ? 'ssh' : sh.state.services[n] ? n : 'apache2', s } : null;
  }
  function serviceStatus(c, name, s) {
    const fn = /\.(timer|socket|mount|path|target)$/.test(name) ? name : name + '.service';
    const now = new Date();
    const dot = s.active ? '\x1b[1;32m●\x1b[0m' : s.failed ? '\x1b[1;31m×\x1b[0m' : '○';
    c.out(`${dot} ${fn} - ${s.desc}
     Loaded: loaded (/lib/systemd/system/${fn}; ${s.masked ? 'masked' : s.static ? 'static' : s.enabled ? 'enabled' : 'disabled'}; preset: enabled)
     Active: ${s.active ? '\x1b[1;32mactive (running)\x1b[0m' : s.failed ? '\x1b[1;31mfailed\x1b[0m (Result: signal)' : 'inactive (dead)'}${s.active ? ' since ' + SIM.strftime('%a %F', now.getTime(), c.sh.state.timezone) + ' 08:10:12 CET; 1h 31min ago' : ''}
${s.active && s.pid ? `   Main PID: ${s.pid} (${(s.bin || '').split(' ')[0].split('/').pop()})\n      Tasks: 1 (limit: 4613)\n     Memory: 4.8M\n        CPU: 112ms\n     CGroup: /system.slice/${fn}\n             └─${s.pid} ${s.bin}\n` : ''}
${SIM.strftime('%b %d', now.getTime(), c.sh.state.timezone)} 08:10:12 ${c.sh.state.hostname} systemd[1]: ${s.active ? 'Started' : 'Stopped'} ${fn} - ${s.desc}.
`);
  }
  SIM.serviceStatus = serviceStatus;
  C.systemctl = (c) => {
    const sh = c.sh;
    const args = c.args.filter((a) => !/^--(no-pager|quiet|full|no-legend|plain)$/.test(a) && a !== '-q' && a !== '-l');
    const flags = {};
    const rest = [];
    for (const a of args) {
      if (a === '--now') flags.now = true;
      else if (a === '--all' || a === '-a') flags.all = true;
      else if (a.startsWith('--type=') || a.startsWith('-t')) flags.type = a.split('=')[1] || 'service';
      else if (a.startsWith('--state=')) flags.state = a.split('=')[1];
      else if (a === '--failed') flags.failed = true;
      else if (a === '--user') flags.user = true;
      else rest.push(a);
    }
    const sub = rest.shift() || 'list-units';
    const units = rest;
    const priv = ['start', 'stop', 'restart', 'reload', 'enable', 'disable', 'mask', 'unmask', 'isolate', 'set-default', 'daemon-reload', 'reboot', 'poweroff', 'halt', 'rescue', 'emergency', 'try-restart', 'reload-or-restart', 'kill', 'suspend', 'hibernate'];
    if (priv.indexOf(sub) >= 0 && sh.uid !== 0) {
      c.err(`Failed to ${sub} ${units.join(' ') || 'system'}: Interactive authentication required.\nSee system logs and 'systemctl status ${units[0] || ''}' for details.\n`);
      return 1;
    }
    const unknown = (u) => {
      c.err(`Failed to ${sub} ${u}: Unit ${u.indexOf('.') >= 0 ? u : u + '.service'} not found.\n`);
      return 5;
    };
    const st = sh.state;
    switch (sub) {
      case 'status': {
        if (!units.length) {
          c.out(`● ${st.hostname}\n    State: running\n    Units: 247 loaded (incl. loaded aliases)\n     Jobs: 0 queued\n   Failed: ${Object.values(st.services).filter((s) => s.failed).length} units\n    Since: ${new Date(Date.now() - 12300000).toString().slice(0, 24)}\n  systemd: 252.22-1~deb12u1\n   CGroup: /\n`);
          return 0;
        }
        let code = 0;
        for (const u of units) {
          if (/\.target$/.test(u)) {
            c.out(`● ${u} - ${u.replace('.target', '')}\n     Loaded: loaded (/lib/systemd/system/${u}; static)\n     Active: ${u === st.target || (u === 'multi-user.target' && st.target === 'graphical.target') ? 'active' : 'inactive (dead)'}\n`);
            continue;
          }
          const x = svc(sh, u);
          if (!x) {
            c.err(`Unit ${u.indexOf('.') >= 0 ? u : u + '.service'} could not be found.\n`);
            code = 4;
            continue;
          }
          serviceStatus(c, x.name, x.s);
          if (!x.s.active) code = 3;
        }
        return code;
      }
      case 'start':
      case 'restart':
      case 'reload':
      case 'try-restart':
      case 'reload-or-restart':
        for (const u of units) {
          const x = svc(sh, u);
          if (!x) return unknown(u);
          if (x.s.masked) {
            c.err(`Failed to start ${u}.service: Unit ${u}.service is masked.\n`);
            return 1;
          }
          if (sub === 'reload' && !x.s.active) {
            c.err(`Job for ${unitFile(x.name)} failed — unit is not active.\n`);
            return 1;
          }
          x.s.active = true;
          x.s.failed = false;
          if (!x.s.pid || sub === 'restart') {
            x.s.pid = st.nextPid++;
            st.procs = st.procs.filter((p) => p.cmd !== x.s.bin);
            st.procs.push({ pid: x.s.pid, ppid: 1, user: 'root', cmd: x.s.bin || x.name, ni: 0, stat: 'Ss', tty: '?', cpu: 0, mem: 0.2, vsz: 20000, rss: 6000, start: new Date().toTimeString().slice(0, 5) });
          }
          SIM.journal(sh, 'systemd[1]', `${sub === 'reload' ? 'Reloaded' : 'Started'} ${unitFile(x.name)} - ${x.s.desc}.`);
        }
        return 0;
      case 'stop':
        for (const u of units) {
          const x = svc(sh, u);
          if (!x) return unknown(u);
          x.s.active = false;
          st.procs = st.procs.filter((p) => p.pid !== x.s.pid);
          x.s.pid = 0;
          SIM.journal(sh, 'systemd[1]', `Stopped ${unitFile(x.name)} - ${x.s.desc}.`);
        }
        return 0;
      case 'enable':
      case 'disable':
        for (const u of units) {
          const x = svc(sh, u);
          if (!x) return unknown(u);
          if (x.s.masked && sub === 'enable') {
            c.err(`Failed to enable unit: Unit file /etc/systemd/system/${unitFile(x.name)} is masked.\n`);
            return 1;
          }
          const link = `/etc/systemd/system/${/\.socket$/.test(x.name) ? 'sockets' : /\.timer$/.test(x.name) ? 'timers' : 'multi-user'}.target.wants/${unitFile(x.name)}`;
          if (sub === 'enable' && !x.s.enabled) {
            c.err(`${unitFile(x.name).endsWith('.service') ? `Synchronizing state of ${unitFile(x.name)} with SysV service script with /lib/systemd/systemd-sysv-install.\nExecuting: /lib/systemd/systemd-sysv-install enable ${x.name}\n` : ''}Created symlink ${link} → /lib/systemd/system/${unitFile(x.name)}.\n`);
            asRoot(sh, () => !sh.fs.exists(link) && sh.fs.symlink(`/lib/systemd/system/${unitFile(x.name)}`, link, '/'));
          }
          if (sub === 'disable' && x.s.enabled) {
            c.err(`${unitFile(x.name).endsWith('.service') ? `Synchronizing state of ${unitFile(x.name)} with SysV service script with /lib/systemd/systemd-sysv-install.\nExecuting: /lib/systemd/systemd-sysv-install disable ${x.name}\n` : ''}Removed "${link}".\n`);
            asRoot(sh, () => sh.fs.exists(link) && sh.fs.unlink(link, '/'));
          }
          x.s.enabled = sub === 'enable';
          if (flags.now) C.systemctl({ ...c, args: [sub === 'enable' ? 'start' : 'stop', u] });
        }
        return 0;
      case 'mask':
      case 'unmask':
        for (const u of units) {
          const x = svc(sh, u);
          if (!x) return unknown(u);
          x.s.masked = sub === 'mask';
          if (sub === 'mask') c.err(`Created symlink /etc/systemd/system/${unitFile(x.name)} → /dev/null.\n`);
          else c.err(`Removed "/etc/systemd/system/${unitFile(x.name)}".\n`);
        }
        return 0;
      case 'is-active': {
        let code = 0;
        for (const u of units) {
          const x = svc(sh, u);
          const a = x && x.s.active;
          c.out((a ? 'active' : x && x.s.failed ? 'failed' : 'inactive') + '\n');
          if (!a) code = 3;
        }
        return code;
      }
      case 'is-enabled': {
        let code = 0;
        for (const u of units) {
          const x = svc(sh, u);
          if (!x) {
            c.err(`Failed to get unit file state for ${u}.service: No such file or directory\n`);
            return 1;
          }
          c.out((x.s.masked ? 'masked' : x.s.static ? 'static' : x.s.enabled ? 'enabled' : 'disabled') + '\n');
          if (!x.s.enabled) code = 1;
        }
        return code;
      }
      case 'is-failed': {
        const x = svc(sh, units[0] || '');
        c.out((x && x.s.failed ? 'failed' : x && x.s.active ? 'active' : 'inactive') + '\n');
        return x && x.s.failed ? 0 : 1;
      }
      case 'list-units':
      case 'list-timers': {
        if (sub === 'list-timers' || flags.type === 'timer') {
          c.out(`NEXT                        LEFT          LAST                        PASSED  UNIT                         ACTIVATES\n${new Date(Date.now() + 3600000 * 17).toString().slice(0, 16)}02:30:00 CET 17h left      ${new Date(Date.now() - 3600000 * 7).toString().slice(0, 16)}02:30:00 CET 7h ago  backup.timer                 backup.service\n${new Date(Date.now() + 3600000 * 5).toString().slice(0, 24)} 5h left       -                           -       apt-daily.timer              apt-daily.service\n${new Date(Date.now() + 3600000 * 20).toString().slice(0, 24)} 20h left      -                           -       logrotate.timer              logrotate.service\n\n3 timers listed.\n`);
          return 0;
        }
        if (flags.type === 'target') {
          c.out('  UNIT                   LOAD   ACTIVE SUB    DESCRIPTION\n');
          for (const t of ['basic.target', 'getty.target', 'graphical.target', 'local-fs.target', 'multi-user.target', 'network.target', 'sockets.target', 'sysinit.target', 'timers.target'])
            if (t !== 'graphical.target' || st.target === 'graphical.target') c.out(`  ${t.padEnd(22)} loaded active active ${t.replace('.target', '')}\n`);
          return 0;
        }
        c.out('  UNIT                          LOAD   ACTIVE   SUB     DESCRIPTION\n');
        let n = 0;
        for (const [k, s] of Object.entries(st.services)) {
          if (k.endsWith('.timer')) continue;
          const kind = /\.(\w+)$/.test(k) ? k.split('.').pop() : 'service';
          if (flags.type && flags.type !== kind) continue;
          if (!flags.all && !s.active && !s.failed) continue;
          if (flags.failed && !s.failed) continue;
          if (flags.state && !((flags.state === 'running' && s.active) || (flags.state === 'failed' && s.failed) || (flags.state === 'inactive' && !s.active))) continue;
          n++;
          c.out(`${s.failed ? '\x1b[1;31m●\x1b[0m' : ' '} ${(kind === 'service' ? k + '.service' : k).padEnd(29)} loaded ${(s.active ? 'active' : s.failed ? 'failed' : 'inactive').padEnd(8)} ${(s.active ? (kind === 'service' ? 'running' : kind === 'socket' ? 'listening' : kind === 'mount' ? 'mounted' : 'waiting') : s.failed ? 'failed' : 'dead').padEnd(7)} ${s.desc}\n`);
        }
        c.out(`\nLOAD   = Reflects whether the unit definition was properly loaded.\nACTIVE = The high-level unit activation state, i.e. generalization of SUB.\nSUB    = The low-level unit activation state, values depend on unit type.\n${n} loaded units listed.${flags.all ? '' : ' Pass --all to see loaded but inactive units, too.'}\n`);
        return 0;
      }
      case 'list-unit-files': {
        c.out('UNIT FILE                     STATE           PRESET\n');
        for (const [k, s] of Object.entries(st.services)) {
          const kind = /\.(\w+)$/.test(k) ? k.split('.').pop() : 'service';
          if (flags.type && flags.type !== kind) continue;
          if (flags.state && flags.state !== (s.masked ? 'masked' : s.static ? 'static' : s.enabled ? 'enabled' : 'disabled')) continue;
          c.out(`${(kind === 'service' ? k + '.service' : k).padEnd(29)} ${(s.masked ? 'masked' : s.static ? 'static' : s.enabled ? 'enabled' : 'disabled').padEnd(15)} enabled\n`);
        }
        return 0;
      }
      case 'list-sockets': {
        c.out('LISTEN                       UNIT                 ACTIVATES\n');
        const socks = Object.entries(st.services).filter(([k, s]) => k.endsWith('.socket') && (s.active || flags.all));
        for (const [k, s] of socks) c.out(`${(s.listen || '-').padEnd(28)} ${k.padEnd(20)} ${k.replace(/\.socket$/, '.service')}\n`);
        c.out('/run/systemd/journal/socket  systemd-journald.socket systemd-journald.service\n\n' + (socks.length + 1) + ' sockets listed.\n');
        return 0;
      }
      case 'get-default': {
        const l = sh.fs.tryLookup('/etc/systemd/system/default.target', '/', false);
        c.out((l && l.node.t === 'l' ? l.node.target.split('/').pop() : 'graphical.target') + '\n');
        return 0;
      }
      case 'set-default': {
        const t = units[0];
        if (!/\.target$/.test(t || '')) return c.fail(`Failed to set default target: Invalid argument`);
        asRoot(sh, () => {
          sh.fs.unlink('/etc/systemd/system/default.target', '/');
          sh.fs.symlink('/usr/lib/systemd/system/' + t, '/etc/systemd/system/default.target', '/');
        });
        c.err(`Removed "/etc/systemd/system/default.target".\nCreated symlink /etc/systemd/system/default.target → /usr/lib/systemd/system/${t}.\n`);
        return 0;
      }
      case 'isolate': {
        const t = units[0].endsWith('.target') ? units[0] : units[0] + '.target';
        if (t === 'reboot.target' || t === 'poweroff.target') return SIM.powerEvent(c, t === 'reboot.target' ? 'reboot' : 'poweroff');
        const rl = t === 'emergency.target' ? ['1'] : Object.entries(TARGETS).find(([, v]) => v === t);
        if (!rl) return c.fail(`Failed to start ${t}: Unit ${t} not found.`);
        st.prevRunlevel = String(st.runlevel);
        st.runlevel = t === 'multi-user.target' ? 3 : +rl[0];
        st.target = t;
        if (t === 'rescue.target' || t === 'emergency.target') c.out(note(`(rescue/emergency mode: single-user, most services stopped, root password required on the console)`));
        if (t === 'multi-user.target') {
          st.services.gdm.active = false;
          c.out(note('(graphical display manager stopped — text console only)'));
        }
        if (t === 'graphical.target') st.services.gdm.active = true;
        return 0;
      }
      case 'rescue':
      case 'emergency':
        return C.systemctl({ ...c, args: ['isolate', sub + '.target'] });
      case 'reboot':
      case 'poweroff':
      case 'halt':
        return SIM.powerEvent(c, sub);
      case 'suspend':
      case 'hibernate':
        c.out(note(`(the system would ${sub} now)`));
        return 0;
      case 'daemon-reload':
        return 0;
      case 'cat': {
        const x = svc(sh, units[0] || '');
        if (units[0] === 'ssh' || units[0] === 'ssh.service' || units[0] === 'sshd') return c.out('# /lib/systemd/system/ssh.service\n' + sh.fs.readFile('/usr/lib/systemd/system/ssh.service', '/'));
        if (/backup/.test(units[0] || '')) {
          const f = units[0].endsWith('.timer') ? 'backup.timer' : 'backup.service';
          return c.out(`# /etc/systemd/system/${f}\n` + sh.fs.readFile('/etc/systemd/system/' + f, '/'));
        }
        if (!x) return unknown(units[0]);
        c.out(`# /lib/systemd/system/${x.name}.service\n[Unit]\nDescription=${x.s.desc}\nAfter=network.target\n\n[Service]\nExecStart=${x.s.bin}\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n`);
        return 0;
      }
      case 'show': {
        const x = svc(sh, units[0] || '');
        if (!x) return unknown(units[0]);
        c.out(`Id=${x.name}.service\nDescription=${x.s.desc}\nLoadState=loaded\nActiveState=${x.s.active ? 'active' : 'inactive'}\nSubState=${x.s.active ? 'running' : 'dead'}\nUnitFileState=${x.s.enabled ? 'enabled' : 'disabled'}\nMainPID=${x.s.pid}\nWantedBy=multi-user.target\n`);
        return 0;
      }
      case 'list-dependencies':
        c.out(`${units[0] || 'default.target'}\n● ├─accounts-daemon.service\n● ├─gdm.service\n● └─multi-user.target\n●   ├─cron.service\n●   ├─rsyslog.service\n●   ├─ssh.service\n●   └─basic.target\n●     ├─sockets.target\n●     ├─sysinit.target\n●     └─timers.target\n`);
        return 0;
      case 'kill': {
        const x = svc(sh, units[0] || '');
        if (!x) return unknown(units[0]);
        SIM.signal(sh, x.s.pid, 15, c.err);
        return 0;
      }
    }
    return c.fail(`Unknown command verb '${sub}'.`);
  };
  SIM.powerEvent = function (c, kind) {
    const sh = c.sh;
    if (sh.uid !== 0) {
      c.err(`Call to ${kind === 'reboot' ? 'Reboot' : 'PowerOff'} failed: Interactive authentication required.\n`);
      return 1;
    }
    c.out(`\nBroadcast message from root@${sh.state.hostname} on pts/0 (${new Date().toString().slice(0, 24)}):\n\nThe system will ${kind === 'reboot' ? 'reboot' : 'power off'} now!\n\n`);
    // reset volatile state like a real reboot would
    sh.jobs = [];
    sh.fs.mounts = sh.fs.mounts.filter(() => false);
    sh.state.swaps = [];
    const def = (sh.fs.tryLookup('/etc/systemd/system/default.target', '/', false) || { node: { target: 'graphical.target' } }).node.target.split('/').pop();
    sh.state.target = def;
    sh.state.runlevel = def === 'multi-user.target' ? 3 : 5;
    sh.state.prevRunlevel = 'N';
    sh.state.shutdown = null;
    if (sh.onEvent) sh.onEvent('power', { kind, target: def });
    else c.out(`[simulated ${kind}]\n`);
    return 0;
  };
  sbin('shutdown', 'reboot', 'poweroff', 'halt', 'telinit', 'init', 'runlevel', 'service', 'chkconfig', 'update-rc.d', 'grub-install', 'grub-mkconfig', 'update-grub', 'grub2-mkconfig', 'grub2-install', 'efibootmgr', 'update-initramfs', 'mkinitramfs', 'dracut', 'logrotate', 'ldconfig', 'hwclock', 'ntpdate', 'chronyd', 'locale-gen', 'cupsd', 'lpadmin', 'cupsenable', 'cupsdisable', 'cupsaccept', 'cupsreject', 'accept', 'reject', 'lpc');
  C.runlevel = (c) => c.out(`${c.sh.state.prevRunlevel} ${c.sh.state.runlevel}\n`);
  C.telinit = (c) => {
    if (needRoot(c, 'Couldn\'t find an alternative telinit implementation to spawn.')) return 1;
    const lvl = (c.args[0] || '').toLowerCase();
    if (lvl === 's' || lvl === 'single') return C.systemctl({ ...c, args: ['isolate', 'rescue.target'] });
    if (lvl === 'q') return 0;
    if (!/^[0-6]$/.test(lvl)) return c.fail('telinit: invalid runlevel');
    if (lvl === '0') return SIM.powerEvent(c, 'poweroff');
    if (lvl === '6') return SIM.powerEvent(c, 'reboot');
    c.sh.state.prevRunlevel = String(c.sh.state.runlevel);
    c.sh.state.runlevel = +lvl;
    c.sh.state.target = TARGETS[lvl];
    if (lvl === '1') c.out(note('(runlevel 1 = single-user / rescue mode)'));
  };
  C.init = (c) => (c.args.length ? C.telinit(c) : c.fail('must be run as PID 1'));
  C.shutdown = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'hrPckHt:f', { halt: 'H', poweroff: 'P', reboot: 'r', 'no-wall': 'nowall' });
    if (needRoot(c, 'Failed to set wall message, ignoring: Interactive authentication required.\nFailed to call ScheduleShutdown in logind, proceeding with immediate shutdown: Interactive authentication required.\nFailed to power off system via logind: Interactive authentication required.')) return 1;
    if (o.c) {
      if (!sh.state.shutdown) return 0;
      sh.state.shutdown = null;
      c.out(`\nBroadcast message from root@${sh.state.hostname} on pts/0 (${new Date().toString().slice(0, 24)}):\n\nThe system shutdown has been cancelled\n\n`);
      return 0;
    }
    const when = rest[0] || '+1';
    const msg = rest.slice(1).join(' ');
    let at;
    if (when === 'now' || when === '+0') at = Date.now();
    else if (/^\+\d+$/.test(when)) at = Date.now() + +when.slice(1) * 60000;
    else if (/^\d{1,2}:\d{2}$/.test(when)) {
      const [h, m] = when.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
      at = d.getTime();
    } else return c.fail(`Failed to parse time specification: ${when}`);
    const kind = o.r ? 'reboot' : o.H ? 'halt' : 'poweroff';
    if (o.k) {
      c.out(`\nBroadcast message from root@${sh.state.hostname} on pts/0:\n\n${msg || 'The system will go down for maintenance'} (warning only — -k: no actual shutdown)\n\n`);
      return 0;
    }
    if (at <= Date.now()) return SIM.powerEvent(c, kind === 'halt' ? 'poweroff' : kind);
    sh.state.shutdown = { at, kind, msg };
    c.out(`Shutdown scheduled for ${new Date(at).toString().slice(0, 24)}, use 'shutdown -c' to cancel.\n`);
    c.out(`\nBroadcast message from root@${sh.state.hostname} on pts/0 (${new Date().toString().slice(0, 24)}):\n\n${msg ? msg + '\n' : ''}The system will ${kind === 'reboot' ? 'reboot' : 'power off'} at ${new Date(at).toString().slice(0, 21)}!\n\n`);
    if (at - Date.now() <= 5 * 60000) c.out(note('(within 5 minutes of shutdown, /run/nologin is created and non-root logins are refused)'));
  };
  C.reboot = (c) => (c.args.indexOf('--help') >= 0 ? 0 : needRoot(c, 'Call to Reboot failed: Interactive authentication required.') ? 1 : SIM.powerEvent(c, 'reboot'));
  C.poweroff = (c) => (needRoot(c, 'Call to PowerOff failed: Interactive authentication required.') ? 1 : SIM.powerEvent(c, 'poweroff'));
  C.halt = (c) => (needRoot(c, 'Call to Halt failed: Interactive authentication required.') ? 1 : SIM.powerEvent(c, 'poweroff'));
  C.service = (c) => {
    if (c.args[0] === '--status-all') {
      for (const [k, s] of Object.entries(c.sh.state.services)) if (!k.endsWith('.timer')) c.out(` [ ${s.active ? '+' : '-'} ]  ${k}\n`);
      return 0;
    }
    const [name, action] = c.args;
    if (!name || !action) return c.fail('Usage: service < option > | --status-all | [ service_name [ command | --full-restart ] ]');
    return C.systemctl({ ...c, args: [action, name] });
  };
  C.chkconfig = (c) => {
    if (c.args[0] === '--list' || !c.args.length) {
      for (const [k, s] of Object.entries(c.sh.state.services)) if (!k.endsWith('.timer')) c.out(`${k.padEnd(18)}0:off\t1:off\t2:${s.enabled ? 'on' : 'off'}\t3:${s.enabled ? 'on' : 'off'}\t4:${s.enabled ? 'on' : 'off'}\t5:${s.enabled ? 'on' : 'off'}\t6:off\n`);
      return 0;
    }
    const [name, onoff] = c.args.filter((a) => !a.startsWith('--'));
    return C.systemctl({ ...c, args: [onoff === 'on' ? 'enable' : 'disable', name] });
  };
  C['update-rc.d'] = (c) => {
    const [name, action] = c.args.filter((a) => a !== '-f');
    if (needRoot(c)) return 1;
    if (!svc(c.sh, name)) return c.fail(`error: initscript does not exist: /etc/init.d/${name}`);
    return C.systemctl({ ...c, args: [action === 'remove' || action === 'disable' ? 'disable' : 'enable', name] });
  };
  C['systemd-analyze'] = (c) => {
    if (c.args[0] === 'blame') {
      c.out('3.210s NetworkManager-wait-online.service\n1.102s apt-daily.service\n 812ms cups.service\n 640ms postfix@-.service\n 401ms systemd-journald.service\n 233ms ssh.service\n 120ms rsyslog.service\n');
      return 0;
    }
    if (c.args[0] === 'critical-chain') {
      c.out('graphical.target @4.021s\n└─multi-user.target @4.020s\n  └─ssh.service @3.786s +233ms\n    └─network.target @3.770s\n');
      return 0;
    }
    c.out('Startup finished in 1.623s (firmware) + 2.210s (loader) + 1.402s (kernel) + 2.619s (userspace) = 7.854s\ngraphical.target reached after 2.601s in userspace.\n');
  };
  C['grub-install'] = (c) => {
    if (needRoot(c, 'grub-install: error: failed to get canonical path of `/boot/grub\'.')) return 1;
    const dev = c.args.filter((a) => !a.startsWith('-'))[0];
    if (c.args.some((a) => /i386-pc/.test(a))) c.out(`Installing for i386-pc platform.\n${dev ? '' : 'grub-install: error: install device isn\'t specified.\n'}`);
    else c.out('Installing for x86_64-efi platform.\n');
    if (dev && !c.fs.exists(dev)) return c.fail(`error: failed to get canonical path of \`${dev}'.`);
    c.out('Installation finished. No error reported.\n');
  };
  C['grub2-install'] = C['grub-install'];
  C['grub-mkconfig'] = (c) => {
    if (needRoot(c, '/usr/sbin/grub-mkconfig: 270: cannot create /boot/grub/grub.cfg.new: Permission denied')) return 1;
    const oi = c.args.indexOf('-o');
    c.err('Generating grub configuration file ...\nFound background image: /usr/share/images/desktop-base/desktop-grub.png\nFound linux image: /boot/vmlinuz-6.1.0-18-amd64\nFound initrd image: /boot/initrd.img-6.1.0-18-amd64\nWarning: os-prober will not be executed to detect other bootable partitions.\nAdding boot menu entry for UEFI Firmware Settings ...\ndone\n');
    let cfg = c.fs.readFile('/boot/grub/grub.cfg', '/');
    const def = c.fs.readFile('/etc/default/grub', '/');
    const tm = /GRUB_TIMEOUT=(\d+)/.exec(def);
    const cl = /GRUB_CMDLINE_LINUX_DEFAULT="([^"]*)"/.exec(def);
    if (tm) cfg = cfg.replace(/set timeout=\d+/, 'set timeout=' + tm[1]);
    if (cl) cfg = cfg.replace(/(linux\t\/boot\/vmlinuz-6\.1\.0-18-amd64 root=UUID=\S+ ro) [^\n]*/, `$1  ${cl[1]}`);
    if (oi >= 0) {
      const n = c.fs.writeFile(c.args[oi + 1], c.sh.cwd, cfg);
      n.mode = 0o444;
    } else c.out(cfg);
  };
  C['grub2-mkconfig'] = C['grub-mkconfig'];
  C['update-grub'] = (c) => C['grub-mkconfig']({ ...c, args: ['-o', '/boot/grub/grub.cfg'] });
  C.efibootmgr = (c) => {
    c.out('BootCurrent: 0001\nTimeout: 1 seconds\nBootOrder: 0001,0000,0002\nBoot0000* UiApp\nBoot0001* debian\tHD(1,GPT,6a1f2c3d-...,0x800,0x100000)/File(\\EFI\\debian\\shimx64.efi)\nBoot0002* UEFI QEMU DVD-ROM QM00003\n');
  };
  C['update-initramfs'] = (c) => (needRoot(c) ? 1 : (c.out('update-initramfs: Generating /boot/initrd.img-6.1.0-18-amd64\n'), 0));
  C.mkinitramfs = (c) => (needRoot(c) ? 1 : 0);
  C.dracut = (c) => (needRoot(c) ? 1 : (c.out('dracut: Executing: /usr/bin/dracut -f\ndracut: *** Creating initramfs image file \'/boot/initramfs-5.14.0.img\' done ***\n'), 0));
  C.ldconfig = (c) => {
    if (c.args.indexOf('-p') >= 0 || c.args.indexOf('--print-cache') >= 0) {
      const libs = ['libz.so.1', 'libtinfo.so.6', 'libssl.so.3', 'libselinux.so.1', 'libpcre2-8.so.0', 'libm.so.6', 'libcrypto.so.3', 'libc.so.6', 'libacl.so.1'];
      c.out(`${libs.length + 1} libs found in cache \`/etc/ld.so.cache'\n`);
      for (const l of libs) c.out(`\t${l} (libc6,x86-64) => /lib/x86_64-linux-gnu/${l}\n`);
      c.out('\tld-linux-x86-64.so.2 (libc6,x86-64) => /lib64/ld-linux-x86-64.so.2\n');
      return 0;
    }
    if (needRoot(c, 'ldconfig: Can\'t create temporary cache file /etc/ld.so.cache~: Permission denied')) return 1;
    if (c.args.indexOf('-v') >= 0) c.out('/usr/local/lib: (from /etc/ld.so.conf.d/libc.conf:2)\n/lib/x86_64-linux-gnu: (from /etc/ld.so.conf.d/x86_64-linux-gnu.conf:4)\n\tlibc.so.6 -> libc.so.6\n\tlibz.so.1 -> libz.so.1.2.13\n');
  };
  C.ldd = (c) => {
    const files = c.args.filter((a) => !a.startsWith('-'));
    if (!files.length) return c.fail('missing file arguments');
    let st = 0;
    for (const f of files) {
      let path = f;
      if (f.indexOf('/') < 0) {
        c.err(`ldd: ./${f}: No such file or directory\n`);
        st = 1;
        continue;
      }
      const r = c.fs.tryLookup(path, c.sh.cwd);
      if (!r) {
        c.err(`ldd: ${f}: No such file or directory\n`);
        st = 1;
        continue;
      }
      if (!/^(#!sim:|\x7fELF)/.test(r.node.data || '')) {
        c.out('\tnot a dynamic executable\n');
        st = 1;
        continue;
      }
      if (files.length > 1) c.out(f + ':\n');
      const name = path.split('/').pop();
      const extra = { ls: ['libselinux.so.1', 'libpcre2-8.so.0'], bash: ['libtinfo.so.6'], ssh: ['libcrypto.so.3', 'libz.so.1'], sshd: ['libcrypto.so.3', 'libz.so.1'], cp: ['libselinux.so.1', 'libacl.so.1'], vim: ['libtinfo.so.6', 'libselinux.so.1'] }[name] || [];
      c.out('\tlinux-vdso.so.1 (0x00007ffd8b5f2000)\n');
      for (const l of extra) c.out(`\t${l} => /lib/x86_64-linux-gnu/${l} (0x00007f3a${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}000)\n`);
      c.out('\tlibc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f3a2c600000)\n\t/lib64/ld-linux-x86-64.so.2 (0x00007f3a2ca3e000)\n');
    }
    return st;
  };

  /* ================= logging ================= */
  SIM.journal = function (sh, ident, msg, prio = 6) {
    (sh.state.journal = sh.state.journal || []).push({ t: Date.now(), ident, msg, prio });
  };
  function journalEntries(sh) {
    const base = [];
    const syslog = asRoot(sh, () => {
      try {
        return sh.fs.readFile('/var/log/syslog', '/');
      } catch (e) {
        return '';
      }
    });
    for (const l of syslog.split('\n').filter(Boolean)) {
      const m = /^(\w{3}\s+\d+ [\d:]+) (\S+) ([^:]+): (.*)$/.exec(l);
      if (m) base.push({ ts: m[1], host: m[2], ident: m[3], msg: m[4], prio: /fail|error/i.test(m[4]) ? 3 : 6 });
    }
    for (const j of sh.state.journal || []) base.push({ ts: SIM.strftime('%b %d %H:%M:%S', j.t, curTZ(sh)), host: sh.state.hostname, ident: j.ident, msg: j.msg, prio: j.prio });
    return base;
  }
  C.journalctl = (c) => {
    const sh = c.sh;
    const { o } = getopt(c.args, 'n:fu:p:bkrext:o:', { 'lines=': 'n', follow: 'f', 'unit=': 'u', 'priority=': 'p', boot: 'b', dmesg: 'k', reverse: 'r', 'since=': 'since', 'until=': 'until', 'no-pager': 'np', 'list-boots': 'lb', 'disk-usage': 'du', 'vacuum-size=': 'vs', 'vacuum-time=': 'vt', 'identifier=': 't', 'output=': 'o' }, { loose: true });
    if (o.lb) {
      c.out('IDX BOOT ID                          FIRST ENTRY                 LAST ENTRY\n -1 1f2e3d4c5b6a49788796a5b4c3d2e1f0 Sat 2026-10-24 09:58:12 CEST Mon 2026-10-26 08:09:55 CET\n  0 6b2c1d0e9f8a47b3a2c1d0e9f8a7b6c5 Mon 2026-10-26 08:10:01 CET  ' + SIM.strftime('%a %F %T %Z', Date.now(), curTZ(sh)) + '\n');
      return 0;
    }
    if (o.du) return c.out('Archived and active journals take up 48.0M in the file system.\n');
    if (o.vs || o.vt) {
      if (needRoot(c)) return 1;
      return c.out('Vacuuming done, freed 0B of archived journals from /var/log/journal/a3f1c2d4e5b60718293a4b5c6d7e8f90.\n');
    }
    if (sh.uid !== 0 && sh.groupsOf(sh.username).indexOf(4) < 0) c.err('Hint: You are currently not seeing messages from other users and the system.\n      Users in groups \'adm\', \'systemd-journal\' can see all messages.\n');
    let list = journalEntries(sh);
    if (o.k) list = list.filter((e) => e.ident === 'kernel');
    if (o.u) {
      const u = o.u.replace(/\.service$/, '');
      const map = { ssh: 'sshd', sshd: 'sshd', cron: 'CRON', rsyslog: 'rsyslogd', chrony: 'chronyd', cups: 'cupsd', postfix: 'postfix' };
      list = list.filter((e) => e.ident.indexOf(map[u] || u) >= 0 || (e.ident === 'systemd[1]' && e.msg.indexOf(u) >= 0));
    }
    if (o.t) list = list.filter((e) => e.ident.split('[')[0] === o.t);
    if (o.p) {
      const P = { emerg: 0, alert: 1, crit: 2, err: 3, warning: 4, notice: 5, info: 6, debug: 7 };
      const max = /^\d$/.test(o.p) ? +o.p : P[o.p.split('..').pop()];
      list = list.filter((e) => e.prio <= max);
    }
    if (o.r) list.reverse();
    if (o.n !== undefined && o.n !== true) list = o.r ? list.slice(0, +o.n) : list.slice(-+o.n);
    else if (o.e) list = list.slice(-1000);
    if (!list.length) return c.out('-- No entries --\n');
    for (const e of list) {
      const line = `${e.ts} ${e.host} ${e.ident}: ${e.msg}\n`;
      c.out(e.prio <= 3 && c.io.tty && c.io.out === c.io.tty ? '\x1b[1;31m' + line.slice(0, -1) + '\x1b[0m\n' : line);
    }
    if (o.f) c.err(note('(journalctl -f keeps following new entries until Ctrl+C)'));
  };
  C.logger = (c) => {
    const { o, rest } = getopt(c.args, 't:p:isf:', { 'tag=': 't', 'priority=': 'p', id: 'i', stderr: 's', 'file=': 'f' });
    const msg = o.f ? c.fs.readFile(o.f, c.sh.cwd).trim() : rest.length ? rest.join(' ') : (c.stdin || '').trim();
    const tag = o.t || c.sh.username;
    const sh = c.sh;
    const PR = { emerg: 0, alert: 1, crit: 2, err: 3, error: 3, warning: 4, warn: 4, notice: 5, info: 6, debug: 7 };
    const prio = o.p ? PR[o.p.split('.').pop()] : 5;
    if (prio === undefined) return c.fail(`unknown priority name: ${o.p}`);
    const line = `${SIM.strftime('%b %e %H:%M:%S', Date.now(), curTZ(sh))} ${sh.state.hostname} ${tag}${o.i ? '[' + sh.state.nextPid + ']' : ''}: ${msg}\n`;
    asRoot(sh, () => {
      sh.fs.writeFile('/var/log/syslog', '/', line, { append: true });
      sh.fs.writeFile('/var/log/messages', '/', line, { append: true });
      if (/^(auth|authpriv)\./.test(o.p || '')) sh.fs.writeFile('/var/log/auth.log', '/', line, { append: true });
      if (/^mail\./.test(o.p || '')) sh.fs.writeFile('/var/log/mail.log', '/', line, { append: true });
    });
    if (o.s) c.err(`<${prio + 8}>${line}`);
  };
  C['systemd-cat'] = (c) => {
    const { o, rest } = getopt(c.args, 't:p:', { 'identifier=': 't', 'priority=': 'p' });
    const PR = { emerg: 0, alert: 1, crit: 2, err: 3, warning: 4, notice: 5, info: 6, debug: 7 };
    const prio = o.p === undefined ? 6 : /^\d$/.test(o.p) ? +o.p : PR[o.p];
    if (prio === undefined) return c.fail(`Failed to parse priority value: ${o.p}`);
    const ident = o.t || (rest[0] ? rest[0].split('/').pop() : 'cat');
    let buf = '';
    const st = rest.length ? c.sh.runArgv(rest, { ...c.io, out: (s) => (buf += s) }) : ((buf = c.stdin || ''), 0);
    for (const l of buf.split('\n').filter(Boolean)) SIM.journal(c.sh, ident, l, prio);
    return st;
  };
  C.logrotate = (c) => {
    const { o, rest } = getopt(c.args, 'dfvs:', { debug: 'd', force: 'f', verbose: 'v', 'state=': 's' });
    if (!o.d && needRoot(c, 'error: error creating state file /var/lib/logrotate/status: Permission denied')) return 1;
    const conf = rest[0] || '/etc/logrotate.conf';
    if (!c.fs.exists(conf, c.sh.cwd)) return c.fail(`error: cannot stat ${conf}: No such file or directory`);
    c.out(`reading config file ${conf}\nincluding /etc/logrotate.d\nreading config file rsyslog\n\nHandling 1 logs\n\nrotating pattern: /var/log/syslog\n/var/log/auth.log\n  weekly (4 rotations)\nempty log files are not rotated, old logs are removed\nconsidering log /var/log/syslog\n  log ${o.f ? 'needs rotating (forced)' : 'does not need rotating (log has been rotated at ' + new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) + ', which is less than a week ago)'}\n`);
    if (o.f && !o.d) {
      asRoot(c.sh, () => {
        const fs = c.fs;
        for (const f of ['/var/log/syslog', '/var/log/auth.log']) {
          if (fs.exists(f + '.1')) {
            fs.writeFile(f + '.2.gz', '/', SIM.zwrap('gzip', fs.readFile(f + '.1', '/')));
            fs.unlink(f + '.1', '/');
          }
          fs.writeFile(f + '.1', '/', fs.readFile(f, '/'));
          fs.writeFile(f, '/', '');
        }
      });
      c.out('rotating log /var/log/syslog, log->rotateCount is 4\nrenaming /var/log/syslog to /var/log/syslog.1\ncreating new /var/log/syslog mode = 0640 uid = 0 gid = 4\nrunning postrotate script\n');
    }
  };

  /* ================= time ================= */
  C.date = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'ud:s:RIr:', { utc: 'u', universal: 'u', 'date=': 'd', 'set=': 's', 'rfc-email': 'R', 'iso-8601': 'I', 'reference=': 'r' });
    let ms = Date.now();
    if (o.s) {
      if (needRoot(c, 'date: cannot set date: Operation not permitted')) return 1;
      const t = SIM.parseDate(o.s);
      if (isNaN(t)) return c.fail(`invalid date '${o.s}'`);
      c.out(SIM.strftime('%a %b %e %T %Z %Y', t, curTZ(sh)) + '\n');
      c.err(note('(system clock is not actually changed in the simulator; with NTP active it would be reset anyway)'));
      return 0;
    }
    if (o.d) {
      ms = SIM.parseDate(o.d);
      if (isNaN(ms)) return c.fail(`invalid date '${o.d}'`);
    }
    if (o.r) ms = c.fs.lookup(o.r, sh.cwd).node.mtime;
    const tz = o.u ? 'UTC' : curTZ(sh);
    let fmt = '%a %b %e %T %Z %Y';
    const f = rest.find((r) => r.startsWith('+'));
    if (f) fmt = f.slice(1);
    else if (rest.length && /^\d{8,12}/.test(rest[0])) return C.date({ ...c, args: ['-s', rest[0]] });
    if (o.R) fmt = '%a, %d %b %Y %T %z';
    if (o.I) fmt = o.I === true || o.I === 'date' ? '%F' : '%FT%T%z';
    c.out(SIM.strftime(fmt, ms, tz) + '\n');
  };
  C.cal = (c) => {
    const nums = c.args.filter((a) => /^\d+$/.test(a)).map(Number);
    const now = new Date();
    const showMonth = (y, m, hl) => {
      const title = `${MONTHS[m]} ${y}`;
      let out = title.padStart(Math.floor((20 + title.length) / 2)).padEnd(20) + '\nSu Mo Tu We Th Fr Sa\n';
      const first = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      let line = '   '.repeat(first);
      for (let d = 1; d <= days; d++) {
        const ds = String(d).padStart(2);
        line += (hl && d === now.getDate() ? '\x1b[7m' + ds + '\x1b[0m' : ds) + ' ';
        if ((first + d) % 7 === 0) {
          out += line.trimEnd() + '\n';
          line = '';
        }
      }
      if (line) out += line.trimEnd() + '\n';
      return out;
    };
    if (nums.length === 1 && nums[0] > 12) {
      for (let m = 0; m < 12; m++) c.out(showMonth(nums[0], m, false) + '\n');
      return 0;
    }
    const y = nums.length === 2 ? nums[1] : now.getFullYear();
    const m = nums.length === 2 ? nums[0] - 1 : now.getMonth();
    c.out(showMonth(y, m, nums.length === 0 && c.io.tty && c.io.out === c.io.tty));
  };
  C.ncal = C.cal;
  C.timedatectl = (c) => {
    const sh = c.sh;
    const sub = c.args[0] || 'status';
    const st = sh.state;
    if (sub === 'status' || sub === 'show') {
      const now = Date.now();
      c.out(`               Local time: ${SIM.strftime('%a %F %T %Z', now, st.timezone)}
           Universal time: ${SIM.strftime('%a %F %T %Z', now, 'UTC')}
                 RTC time: ${SIM.strftime('%a %F %T', now, 'UTC')}
                Time zone: ${st.timezone} (${SIM.strftime('%Z, %z', now, st.timezone)})
System clock synchronized: ${st.ntp ? 'yes' : 'no'}
              NTP service: ${st.ntp ? 'active' : 'inactive'}
          RTC in local TZ: no
`);
      return 0;
    }
    if (sub === 'list-timezones') {
      c.out(['Africa/Cairo', 'America/Chicago', 'America/Los_Angeles', 'America/New_York', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/Berlin', 'Europe/London', 'Europe/Paris', 'Europe/Vienna', 'Europe/Zurich', 'UTC'].join('\n') + '\n');
      return 0;
    }
    if (needRoot(c, `Failed to ${sub.replace('-', ' ')}: Interactive authentication required.`)) return 1;
    if (sub === 'set-timezone') {
      const tz = c.args[1];
      try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
      } catch (e) {
        return c.fail(`Failed to set time zone: Invalid or not installed time zone '${tz}'`);
      }
      st.timezone = tz;
      asRoot(sh, () => {
        sh.fs.unlink('/etc/localtime', '/');
        sh.fs.symlink('/usr/share/zoneinfo/' + tz, '/etc/localtime', '/');
        sh.fs.writeFile('/etc/timezone', '/', tz + '\n');
      });
      return 0;
    }
    if (sub === 'set-ntp') {
      st.ntp = /^(true|yes|1|on)$/.test(c.args[1]);
      return 0;
    }
    if (sub === 'set-time') {
      if (st.ntp) return c.fail('Failed to set time: Automatic time synchronization is enabled');
      return 0;
    }
    if (sub === 'set-local-rtc') return 0;
    return c.fail(`Unknown command verb ${sub}.`);
  };
  C.hwclock = (c) => {
    const { o } = getopt(c.args, 'rwsuVvl', { show: 'r', systohc: 'w', hctosys: 's', utc: 'u', localtime: 'l', verbose: 'v', set: 'set', 'date=': 'date', adjust: 'a', systz: 'systz' });
    if (needRoot(c, 'hwclock: Cannot access the Hardware Clock via any known method.\nhwclock: Use the --verbose option to see the details of our search for an access method.')) return 1;
    if (o.w || o.s || o.a || o.systz) return 0;
    if (o.set) return o.date ? 0 : c.fail('--date is required for --set');
    c.out(SIM.strftime('%F %T.%N', Date.now() - 1200, curTZ(c.sh)).slice(0, 26) + SIM.strftime('%z', Date.now(), curTZ(c.sh)).replace(/(\d\d)(\d\d)$/, '$1:$2') + '\n');
  };
  C.ntpdate = (c) => {
    if (needRoot(c, 'ntpdate: bind() fails: Permission denied')) return 1;
    const srv = c.args.filter((a) => !a.startsWith('-'))[0] || 'pool.ntp.org';
    c.out(`${SIM.strftime('%e %b %T', Date.now(), curTZ(c.sh))} ntpdate[${c.sh.state.nextPid++}]: adjust time server ${SIM.resolve(c.sh, srv) ? SIM.resolve(c.sh, srv).ip : '162.159.200.123'} offset -0.000231 sec\n`);
  };
  C.ntpq = (c) => {
    c.out(`     remote           refid      st t when poll reach   delay   offset  jitter
==============================================================================
 0.debian.pool.n .POOL.          16 p    -   64    0    0.000   +0.000   0.000
*ntp1.example.co 192.53.103.108   2 u   34   64  377   12.403   -0.231   0.412
+ntp2.example.co 131.188.3.222    2 u   21   64  377   14.112   +0.187   0.398
-time.cloudflare 10.40.9.193      3 u   55   64  377   18.900   +1.024   1.110
`);
  };
  C.ntpd = (c) => c.out(note('(ntpd: the classic NTP daemon — configured in /etc/ntp.conf; check with ntpq -p)'));
  C.chronyc = (c) => {
    const sub = c.args[0] || 'tracking';
    if (sub === 'sources') {
      c.out(`MS Name/IP address         Stratum Poll Reach LastRx Last sample
===============================================================================
^* 192.168.56.1                  2   6   377    23   -231us[ -298us] +/-   12ms
^+ ntp2.example.com              2   6   377    21   +187us[ +187us] +/-   14ms
^- time.cloudflare.com           3   6   377    55  +1024us[+1024us] +/-   19ms
`);
    } else if (sub === 'tracking') {
      c.out(`Reference ID    : C0A83801 (192.168.56.1)
Stratum         : 3
Ref time (UTC)  : ${new Date().toUTCString()}
System time     : 0.000231482 seconds slow of NTP time
Last offset     : -0.000067212 seconds
RMS offset      : 0.000412337 seconds
Frequency       : 3.412 ppm fast
Leap status     : Normal
`);
    } else if (sub === 'makestep') {
      if (needRoot(c, '501 Not authorised')) return 1;
      c.out('200 OK\n');
    } else c.out('200 OK\n');
  };
  C.chronyd = (c) => c.out(note('(chronyd runs as a service: systemctl status chrony)'));
  C.tzselect = (c) => {
    c.out(`Please identify a location so that time zone rules can be set correctly.
Please select a continent, ocean, "coord", or "TZ".
 1) Africa   2) Americas   3) Antarctica   4) Asia   5) Atlantic Ocean
 6) Australia   7) Europe   8) Indian Ocean   9) Pacific Ocean   10) coord   11) TZ
`);
    const tz = c.sh.promptFn ? c.sh.promptFn('#? (type a zone like Europe/Berlin)') : 'Europe/Berlin';
    if (!tz) return 1;
    c.out(`\nThe following information has been given:\n\n\t${tz}\n\nTherefore TZ='${tz}' will be used.\nLocal time is now:\t${SIM.strftime('%a %b %e %T %Z %Y', Date.now(), tz)}.\nUniversal Time is now:\t${SIM.strftime('%a %b %e %T %Z %Y', Date.now(), 'UTC')}.\n\nYou can make this change permanent for yourself by appending the line\n\tTZ='${tz}'; export TZ\nto the file '.profile' in your home directory; then log out and log in again.\n\nHere is that TZ value again, this time on standard output so that you\ncan use the /usr/bin/tzselect command in shell scripts:\n${tz}\n`);
  };

  /* ================= locale ================= */
  const LOCALES = ['C', 'C.utf8', 'POSIX', 'de_DE.utf8', 'en_US.utf8'];
  C.locale = (c) => {
    const sh = c.sh;
    if (c.args[0] === '-a') return c.out(LOCALES.join('\n') + '\n');
    if (c.args[0] === '-m') return c.out('ANSI_X3.4-1968\nISO-8859-1\nISO-8859-15\nUTF-8\n');
    if (c.args[0] === '-k' || c.args[0] === '-c') return c.out('LC_TIME\nd_fmt="%m/%d/%Y"\nt_fmt="%r"\n');
    const lang = sh.vars.LANG === undefined ? '' : sh.vars.LANG;
    const all = sh.vars.LC_ALL || '';
    const cats = ['LC_CTYPE', 'LC_NUMERIC', 'LC_TIME', 'LC_COLLATE', 'LC_MONETARY', 'LC_MESSAGES', 'LC_PAPER', 'LC_NAME', 'LC_ADDRESS', 'LC_TELEPHONE', 'LC_MEASUREMENT', 'LC_IDENTIFICATION'];
    c.out(`LANG=${lang}\nLANGUAGE=${sh.vars.LANGUAGE || ''}\n`);
    for (const k of cats) c.out(`${k}=${sh.vars[k] && !all ? sh.vars[k] : '"' + (all || lang || 'POSIX') + '"'}\n`);
    c.out(`LC_ALL=${all}\n`);
  };
  C.localectl = (c) => {
    const sh = c.sh;
    const sub = c.args[0] || 'status';
    if (sub === 'status') {
      const kb = sh.fs.readFile('/etc/default/keyboard', '/');
      c.out(`System Locale: LANG=${sh.state.lang}\n    VC Keymap: ${(/XKBLAYOUT="(\w+)"/.exec(kb) || [0, 'us'])[1]}\n   X11 Layout: ${(/XKBLAYOUT="(\w+)"/.exec(kb) || [0, 'us'])[1]}\n    X11 Model: pc105\n`);
      return 0;
    }
    if (sub === 'list-locales') return c.out('C.UTF-8\nde_DE.UTF-8\nen_US.UTF-8\n');
    if (sub === 'list-keymaps') return c.out('de\nde-latin1\nfr\nuk\nus\n');
    if (needRoot(c, `Failed to ${sub}: Interactive authentication required.`)) return 1;
    if (sub === 'set-locale') {
      const v = c.args[1].replace(/^LANG=/, '');
      sh.state.lang = v;
      asRoot(sh, () => {
        sh.fs.writeFile('/etc/default/locale', '/', `LANG=${v}\n`);
        sh.fs.writeFile('/etc/locale.conf', '/', `LANG=${v}\n`);
      });
      return 0;
    }
    if (sub === 'set-keymap' || sub === 'set-x11-keymap') {
      asRoot(sh, () => sh.fs.writeFile('/etc/default/keyboard', '/', `XKBMODEL="pc105"\nXKBLAYOUT="${c.args[1]}"\nXKBVARIANT=""\nXKBOPTIONS=""\n`));
      return 0;
    }
    return c.fail(`Unknown command verb ${sub}.`);
  };
  C['locale-gen'] = (c) => {
    if (needRoot(c, '/usr/sbin/locale-gen: line 41: /usr/lib/locale/locale-archive: Permission denied')) return 1;
    c.out('Generating locales (this might take a while)...\n');
    for (const l of c.fs.readFile('/etc/locale.gen', '/').split('\n').filter((x) => x && !x.startsWith('#'))) c.out(`  ${l.split(' ')[0].replace('.UTF-8', '')}.UTF-8... done\n`);
    c.out('Generation complete.\n');
  };
  C['dpkg-reconfigure'] = (c) => {
    if (needRoot(c, '/usr/sbin/dpkg-reconfigure must be run as root')) return 1;
    const p = c.args.filter((a) => !a.startsWith('-'))[0];
    if (p === 'tzdata') {
      c.out(`\nCurrent default time zone: '${c.sh.state.timezone}'\nLocal time is now:      ${SIM.strftime('%a %b %e %T %Z %Y', Date.now(), c.sh.state.timezone)}.\nUniversal Time is now:  ${SIM.strftime('%a %b %e %T %Z %Y', Date.now(), 'UTC')}.\n`);
    } else if (p === 'locales') C['locale-gen'](c);
    else if (p === 'keyboard-configuration') c.out(note('(dialog to pick keyboard model/layout; writes /etc/default/keyboard)'));
    else c.out(note(`(dpkg-reconfigure re-runs the debconf configuration questions of ${p})`));
  };
  SIM.sbin.add('dpkg-reconfigure');

  /* ================= scheduling: cron / at ================= */
  function cronAllowed(c, user) {
    if (user === 'root') return true;
    const allow = asRoot(c.sh, () => (c.fs.exists('/etc/cron.allow') ? c.fs.readFile('/etc/cron.allow', '/') : null));
    if (allow !== null) return allow.split('\n').indexOf(user) >= 0;
    const deny = asRoot(c.sh, () => (c.fs.exists('/etc/cron.deny') ? c.fs.readFile('/etc/cron.deny', '/') : ''));
    return deny.split('\n').indexOf(user) < 0;
  }
  SIM.validCron = function (text) {
    const errs = [];
    text.split('\n').forEach((l, i) => {
      const t = l.trim();
      if (!t || t.startsWith('#')) return;
      if (/^[A-Za-z_]\w*\s*=/.test(t)) return;
      if (/^@(reboot|yearly|annually|monthly|weekly|daily|midnight|hourly)\s+\S/.test(t)) return;
      const f = t.split(/\s+/);
      if (f.length < 6) {
        errs.push(`line ${i + 1}: bad command or too few fields`);
        return;
      }
      const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
      for (let k = 0; k < 5; k++) {
        const ok = f[k].split(',').every((part) => {
          const m = /^(\*|\d+(?:-\d+)?|[a-z]{3}(?:-[a-z]{3})?)(?:\/(\d+))?$/i.exec(part);
          if (!m) return false;
          if (m[1] === '*' || /[a-z]/i.test(m[1])) return true;
          return m[1].split('-').every((n) => +n >= ranges[k][0] && +n <= ranges[k][1]);
        });
        if (!ok) {
          errs.push(`line ${i + 1}: bad ${['minute', 'hour', 'day-of-month', 'month', 'day-of-week'][k]}`);
          return;
        }
      }
    });
    return errs;
  };
  C.crontab = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'lerui:', { list: 'l', edit: 'e', remove: 'r', 'user=': 'u' });
    let user = sh.username;
    if (o.u) {
      if (sh.uid !== 0) return c.fail(`must be privileged to use -u`);
      user = o.u;
    }
    if (!cronAllowed(c, user)) {
      c.err(`You (${user}) are not allowed to use this program (crontab)\nSee crontab(1) for more information\n`);
      return 1;
    }
    const path = '/var/spool/cron/crontabs/' + user;
    const read = () => asRoot(sh, () => (sh.fs.exists(path) ? sh.fs.readFile(path, '/') : null));
    const install = (text) => {
      const errs = SIM.validCron(text);
      if (errs.length) return `"/tmp/crontab.Xg3kQ2/crontab":${errs[0]}\nerrors in crontab file, can't install.`;
      asRoot(sh, () => {
        const n = sh.fs.writeFile(path, '/', text);
        n.mode = 0o600;
        n.uid = (sh.user(user) || { uid: 0 }).uid;
        n.gid = 0;
      });
      return null;
    };
    if (o.l) {
      const t = read();
      if (t === null) {
        c.err(`no crontab for ${user}\n`);
        return 1;
      }
      c.out(t.replace(/^# DO NOT EDIT[^\n]*\n(#[^\n]*\n){0,2}/, ''));
      return 0;
    }
    if (o.r) {
      if (read() === null) {
        c.err(`no crontab for ${user}\n`);
        return 1;
      }
      asRoot(sh, () => sh.fs.unlink(path, '/'));
      return 0;
    }
    if (o.e) {
      const cur = read() || '# Edit this file to introduce tasks to be run by cron.\n#\n# m h  dom mon dow   command\n';
      if (!sh.onEvent) return c.fail('no editor available');
      sh.onEvent('edit', {
        title: `crontab for ${user}`,
        path: '/tmp/crontab.Xg3kQ2/crontab',
        text: cur,
        save: (text) => {
          const e = install(text);
          return e ? { error: e } : { message: 'crontab: installing new crontab' };
        },
      });
      return 0;
    }
    const file = rest[0];
    const text = file && file !== '-' ? c.fs.readFile(file, sh.cwd) : c.stdin;
    if (text === null || text === undefined) return c.fail('usage error: file name or - (for stdin) must be specified');
    const e = install(text);
    if (e) {
      c.err(e + '\n');
      return 1;
    }
  };
  SIM.parseAtTime = function (spec, base = Date.now()) {
    const s = spec.trim().toLowerCase();
    let m = /^now\s*\+\s*(\d+)\s*(minute|min|hour|day|week)s?$/.exec(s);
    if (m) return base + +m[1] * { minute: 60000, min: 60000, hour: 3600000, day: 86400000, week: 604800000 }[m[2]];
    if (s === 'now') return base;
    if (s === 'midnight') {
      const d = new Date(base);
      d.setHours(24, 0, 0, 0);
      return d.getTime();
    }
    if (s === 'noon' || s === 'teatime') {
      const d = new Date(base);
      d.setHours(s === 'noon' ? 12 : 16, 0, 0, 0);
      if (d.getTime() < base) d.setDate(d.getDate() + 1);
      return d.getTime();
    }
    m = /^(\d{1,2}):?(\d{2})?\s*(am|pm)?(?:\s+(tomorrow|today))?(?:\s+(.+))?$/.exec(s);
    if (m) {
      let h = +m[1];
      if (m[3] === 'pm' && h < 12) h += 12;
      if (m[3] === 'am' && h === 12) h = 0;
      const d = new Date(base);
      d.setHours(h, +(m[2] || 0), 0, 0);
      if (m[4] === 'tomorrow') d.setDate(d.getDate() + 1);
      else if (m[5]) {
        const t = SIM.parseDate(m[5]);
        if (!isNaN(t)) {
          const x = new Date(t);
          d.setFullYear(x.getFullYear(), x.getMonth(), x.getDate());
        }
      } else if (d.getTime() < base) d.setDate(d.getDate() + 1);
      return d.getTime();
    }
    return NaN;
  };
  C.at = (c) => {
    const sh = c.sh;
    const { o, rest } = getopt(c.args, 'lrd:c:f:mqvt:', { 'file=': 'f' });
    if (o.l) return C.atq(c);
    if (o.d || o.r) return C.atrm({ ...c, args: o.d ? [o.d] : rest });
    if (o.c) {
      const j = sh.state.atJobs.find((x) => x.id === +o.c);
      if (!j) return c.fail(`Cannot find jobid ${o.c}`);
      c.out(`#!/bin/sh\n# atrun uid=${sh.uid} gid=${sh.fs.cred.gid}\n# mail ${j.user} 0\numask 22\ncd ${j.cwd} || {\n\t echo 'Execution directory inaccessible' >&2\n\t exit 1\n}\n${j.cmd}\n`);
      return 0;
    }
    const deny = asRoot(sh, () => (c.fs.exists('/etc/at.deny') ? c.fs.readFile('/etc/at.deny', '/') : ''));
    if (sh.uid !== 0 && deny.split('\n').indexOf(sh.username) >= 0) return c.fail('You do not have permission to use at.');
    if (!rest.length) return c.fail('Garbled time');
    const t = SIM.parseAtTime(rest.join(' '));
    if (isNaN(t)) return c.fail('Garbled time');
    let cmd = o.f ? c.fs.readFile(o.f, sh.cwd) : c.stdin;
    if (cmd === null || cmd === undefined) {
      if (sh.promptFn) cmd = sh.promptFn('at> (command to run; leave empty to finish)') || '';
      else cmd = '';
      if (sh.onEvent) sh.onEvent('echoInput', 'at> ' + cmd + '\nat> <EOT>');
    }
    const id = sh.state.atNext++;
    sh.state.atJobs.push({ id, at: t, user: sh.username, cmd: cmd.trim(), cwd: sh.cwd, queue: c.name === 'batch' ? 'b' : 'a' });
    c.err(`warning: commands will be executed using /bin/sh\njob ${id} at ${SIM.strftime('%a %b %e %H:%M:00 %Y', t, curTZ(sh))}\n`);
  };
  C.batch = (c) => C.at({ ...c, args: ['now'], name: 'batch' });
  C.atq = (c) => {
    const sh = c.sh;
    for (const j of sh.state.atJobs.filter((x) => sh.uid === 0 || x.user === sh.username).sort((a, b) => a.at - b.at)) c.out(`${j.id}\t${SIM.strftime('%a %b %e %H:%M:00 %Y', j.at, curTZ(sh))} ${j.queue} ${j.user}\n`);
  };
  C.atrm = (c) => {
    const sh = c.sh;
    for (const id of c.args) {
      const j = sh.state.atJobs.find((x) => x.id === +id);
      if (!j) {
        c.err(`Cannot find jobid ${id}\n`);
        continue;
      }
      if (sh.uid !== 0 && j.user !== sh.username) {
        c.err(`${id}: not owner\n`);
        continue;
      }
      sh.state.atJobs = sh.state.atJobs.filter((x) => x !== j);
    }
  };
  C.anacron = (c) => {
    if (needRoot(c, 'anacron: Can\'t open timestamp file for job cron.daily: Permission denied')) return 1;
    if (c.args.indexOf('-T') >= 0) return 0;
    c.out(note('(anacron runs jobs from /etc/anacrontab that were missed while the machine was off; timestamps live in /var/spool/anacron)'));
  };
  C['run-parts'] = (c) => {
    const dir = c.args.filter((a) => !a.startsWith('-'))[0];
    const r = c.fs.lookup(dir, c.sh.cwd);
    const test = c.args.indexOf('--test') >= 0 || c.args.indexOf('--list') >= 0;
    for (const n of Object.keys(r.node.ents).sort()) {
      if (!/^[a-zA-Z0-9_-]+$/.test(n)) continue;
      const p = r.path + '/' + n;
      const node = c.fs.node(r.node.ents[n]);
      if (!(node.mode & 0o111)) continue;
      if (test) c.out(p + '\n');
      else c.sh.execFile(p, n, [], c.io);
    }
  };

  /* ================= environment, help, misc ================= */
  C.env = (c) => {
    const sh = c.sh;
    const args = c.args.slice();
    let clear = false;
    const unset = [];
    const sets = [];
    while (args.length) {
      if (args[0] === '-i' || args[0] === '-') {
        clear = true;
        args.shift();
      } else if (args[0] === '-u') {
        unset.push(args[1]);
        args.splice(0, 2);
      } else if (/^[A-Za-z_]\w*=/.test(args[0])) sets.push(args.shift());
      else break;
    }
    const base = clear ? {} : sh.env();
    for (const u of unset) delete base[u];
    for (const s of sets) {
      const i = s.indexOf('=');
      base[s.slice(0, i)] = s.slice(i + 1);
    }
    if (!args.length) {
      for (const [k, v] of Object.entries(base)) c.out(`${k}=${v}\n`);
      return 0;
    }
    const save = { vars: sh.vars, exported: sh.exported };
    sh.vars = Object.assign(clear ? {} : Object.assign({}, sh.vars), base);
    if (clear) for (const k of Object.keys(save.vars)) if (!(k in base) && !save.exported.has(k)) sh.vars[k] = save.vars[k];
    sh.exported = new Set(Object.keys(base));
    try {
      return sh.runArgv(args, c.io);
    } finally {
      sh.vars = save.vars;
      sh.exported = save.exported;
    }
  };
  C.printenv = (c) => {
    const e = c.sh.env();
    if (!c.args.length) {
      for (const [k, v] of Object.entries(e)) c.out(`${k}=${v}\n`);
      return 0;
    }
    let st = 0;
    for (const k of c.args) {
      if (e[k] === undefined) st = 1;
      else c.out(e[k] + '\n');
    }
    return st;
  };
  C.clear = (c) => {
    if (c.sh.onEvent) c.sh.onEvent('clear');
    else c.out('\x1b[H\x1b[2J');
  };
  C.reset = C.clear;
  C['reset-sandbox'] = (c) => {
    if (c.sh.onEvent) c.sh.onEvent('resetSandbox');
  };
  C.expr = (c) => {
    const a = c.args.slice();
    let p = 0;
    const num = (x) => /^-?\d+$/.test(String(x));
    function orE() {
      let l = andE();
      while (a[p] === '|') {
        p++;
        const r = andE();
        l = l !== '' && l !== '0' && l !== 0 ? l : r !== '' && r !== '0' ? r : 0;
      }
      return l;
    }
    function andE() {
      let l = cmpE();
      while (a[p] === '&') {
        p++;
        const r = cmpE();
        l = l !== '' && l !== '0' && l !== 0 && r !== '' && r !== '0' && r !== 0 ? l : 0;
      }
      return l;
    }
    function cmpE() {
      let l = addE();
      while (['<', '<=', '=', '==', '!=', '>=', '>'].indexOf(a[p]) >= 0) {
        const op = a[p++];
        const r = addE();
        const x = num(l) && num(r) ? +l : String(l);
        const y = num(l) && num(r) ? +r : String(r);
        l = +{ '<': x < y, '<=': x <= y, '=': x === y, '==': x === y, '!=': x !== y, '>=': x >= y, '>': x > y }[op];
      }
      return l;
    }
    function addE() {
      let l = mulE();
      while (a[p] === '+' || a[p] === '-') {
        const op = a[p++];
        const r = mulE();
        if (!num(l) || !num(r)) throw new Error('non-integer argument');
        l = op === '+' ? +l + +r : +l - +r;
      }
      return l;
    }
    function mulE() {
      let l = matchE();
      while (a[p] === '*' || a[p] === '/' || a[p] === '%') {
        const op = a[p++];
        const r = matchE();
        if (!num(l) || !num(r)) throw new Error('non-integer argument');
        if ((op === '/' || op === '%') && +r === 0) throw new Error('division by zero');
        l = op === '*' ? +l * +r : op === '/' ? Math.trunc(+l / +r) : +l % +r;
      }
      return l;
    }
    function matchE() {
      let l = prim();
      while (a[p] === ':') {
        p++;
        const re = new RegExp('^(?:' + SIM.toJsRegex(String(prim()), false) + ')');
        const m = re.exec(String(l));
        l = m ? (m[1] !== undefined ? m[1] : m[0].length) : m === null && /\\\(/.test(a[p - 1]) ? '' : 0;
      }
      return l;
    }
    function prim() {
      const t = a[p++];
      if (t === undefined) throw new Error('syntax error: missing argument after ' + (a[p - 2] || ''));
      if (t === '(') {
        const v = orE();
        p++;
        return v;
      }
      if (t === 'length') return String(prim()).length;
      if (t === 'substr') {
        const s = String(prim());
        const pos = +prim();
        const len = +prim();
        return s.substr(pos - 1, len);
      }
      if (t === 'index') {
        const s = String(prim());
        const chars = String(prim());
        const i = [...s].findIndex((ch) => chars.indexOf(ch) >= 0);
        return i + 1;
      }
      if (t === 'match') {
        const s = String(prim());
        const re = new RegExp('^(?:' + SIM.toJsRegex(String(prim()), false) + ')');
        const m = re.exec(s);
        return m ? (m[1] !== undefined ? m[1] : m[0].length) : 0;
      }
      return t;
    }
    let v;
    try {
      v = orE();
      if (p < a.length) throw new Error(`syntax error: unexpected argument '${a[p]}'`);
    } catch (e) {
      c.err('expr: ' + e.message + '\n');
      return 2;
    }
    c.out(v + '\n');
    return v === 0 || v === '' || v === '0' ? 1 : 0;
  };
  C.bc = (c) => {
    const input = c.args.length && c.fs.exists(c.args.filter((a) => !a.startsWith('-'))[0] || '', c.sh.cwd) ? c.fs.readFile(c.args.filter((a) => !a.startsWith('-'))[0], c.sh.cwd) : c.stdin || '';
    let scale = c.args.indexOf('-l') >= 0 ? 20 : 0;
    const vars = {};
    for (const raw of input.split(/[\n;]/)) {
      const line = raw.trim();
      if (!line || line === 'quit') continue;
      const m = /^scale\s*=\s*(\d+)$/.exec(line);
      if (m) {
        scale = +m[1];
        continue;
      }
      const asg = /^([a-z]\w*)\s*=\s*(.+)$/.exec(line);
      const expr = (asg ? asg[2] : line).replace(/[a-z]\w*/g, (v) => (v in vars ? vars[v] : v === 'sqrt' ? 'Math.sqrt' : '0')).replace(/\^/g, '**');
      if (!/^[\d\s+\-*/%().Math.sqrt]+$/.test(expr)) {
        c.err('(standard_in) 1: syntax error\n');
        continue;
      }
      let v;
      try {
        v = Function('"use strict";return (' + expr + ')')();
      } catch (e) {
        c.err('(standard_in) 1: syntax error\n');
        continue;
      }
      if (asg) {
        vars[asg[1]] = v;
        continue;
      }
      const f = Math.trunc(v * 10 ** scale) / 10 ** scale;
      c.out((scale ? f.toFixed(scale) : String(Math.trunc(v))).replace(/^(-?)0\./, '$1.') + '\n');
    }
  };
  C.factor = (c) => {
    for (const a of c.args.length ? c.args : (c.stdin || '').split(/\s+/).filter(Boolean)) {
      let n = +a;
      const f = [];
      for (let d = 2; d * d <= n; d++)
        while (n % d === 0) {
          f.push(d);
          n /= d;
        }
      if (n > 1) f.push(n);
      c.out(`${a}: ${f.join(' ')}\n`);
    }
  };
  C.stty = (c) => {
    if (c.args[0] === '-a') c.out('speed 38400 baud; rows 40; columns 120; line = 0;\nintr = ^C; quit = ^\\; erase = ^?; kill = ^U; eof = ^D; eol = <undef>;\nstart = ^Q; stop = ^S; susp = ^Z; rprnt = ^R; werase = ^W; lnext = ^V;\n-parenb -parodd cs8 -hupcl -cstopb cread -clocal -crtscts\nicrnl ixon -ixoff iutf8\nopost onlcr\nisig icanon iexten echo echoe echok -echonl\n');
    else if (c.args[0] === 'size') c.out('40 120\n');
  };
  C.script = (c) => c.out(note('(script records a terminal session into a file — "script session.log", then "exit" to stop. Not simulated.)'));
  C.info = (c) => C.man({ ...c, name: 'info' });
  C.man = (c) => {
    const sh = c.sh;
    const args = c.args.slice();
    if (args[0] === '-k') return C.apropos({ ...c, args: args.slice(1) });
    if (args[0] === '-f') return C.whatis({ ...c, args: args.slice(1) });
    if (/^\d$/.test(args[0] || '')) args.shift();
    const name = args[0];
    if (!name) {
      c.err('What manual page do you want?\nFor example, try \'man man\'.\n');
      return 1;
    }
    const page = SIM.manPage ? SIM.manPage(name, c.args[0]) : null;
    if (!page) {
      c.err(`No manual entry for ${name}\n`);
      return 16;
    }
    if (sh.onEvent && c.io.tty && c.io.out === c.io.tty) sh.onEvent('pager', { name: `${name}(${/^\d$/.test(c.args[0]) ? c.args[0] : SIM.sbin.has(name) ? 8 : 1})`, text: page });
    else c.out(page);
  };
  C.whatis = (c) => {
    let st = 0;
    for (const n of c.args) {
      const m = SIM.man && SIM.man[n];
      if (!m) {
        c.out(`${n}: nothing appropriate.\n`);
        st = 16;
        continue;
      }
      c.out(`${(n + ' (' + (m.sec || 1) + ')').padEnd(20)} - ${m.d}\n`);
    }
    return st;
  };
  C.apropos = (c) => {
    const kw = c.args.filter((a) => !a.startsWith('-')).join(' ').toLowerCase();
    if (!kw) return c.fail('what?');
    let n = 0;
    for (const [k, m] of Object.entries(SIM.man || {}).sort()) {
      if (k.toLowerCase().indexOf(kw) >= 0 || m.d.toLowerCase().indexOf(kw) >= 0) {
        c.out(`${(k + ' (' + (m.sec || 1) + ')').padEnd(20)} - ${m.d}\n`);
        n++;
      }
    }
    if (!n) {
      c.out(`${kw}: nothing appropriate.\n`);
      return 16;
    }
  };
  C.mandb = (c) => (needRoot(c) ? 1 : (c.out('Purging old database entries in /usr/share/man...\nProcessing manual pages under /usr/share/man...\n0 man subdirectories contained newer manual pages.\n'), 0));

  /* ---- editors ---- */
  function editor(mode) {
    return (c) => {
      const sh = c.sh;
      const files = c.args.filter((a) => !a.startsWith('-') && !a.startsWith('+'));
      const file = files[0];
      let text = '';
      let path = null;
      let ro = c.name === 'view' || c.args.indexOf('-R') >= 0;
      if (file) {
        const r = sh.fs.tryLookup(file, sh.cwd);
        path = sh.fs.normalize(file, sh.cwd);
        if (r) {
          if (r.node.t === 'd') {
            c.err(`"${file}" is a directory\n`);
            return 1;
          }
          if (!sh.fs.can(r.node, 4)) {
            c.err(`"${file}" [Permission Denied]\n`);
            return 1;
          }
          text = r.node.data || '';
          if (!sh.fs.can(r.node, 2)) ro = true;
        }
      }
      if (!sh.onEvent) {
        c.err(`${c.name}: no terminal available in this context\n`);
        return 1;
      }
      const cwd = sh.cwd;
      sh.onEvent('edit', {
        mode,
        title: file || '[No Name]',
        path,
        text,
        readonly: ro,
        isNew: file && !sh.fs.tryLookup(file, cwd),
        save: (t, asPath) => {
          const p = asPath || path;
          if (!p) return { error: 'E32: No file name' };
          try {
            sh.fs.writeFile(p, cwd, t);
            path = p;
            return { message: `"${p.split('/').pop()}" ${t.split('\n').length - (t.endsWith('\n') ? 1 : 0)}L, ${SIM.byteLen(t)}B written` };
          } catch (e) {
            return { error: `"${p}" E212: Can't open file for writing${e.code === 'EACCES' ? ' (Permission denied)' : ': ' + e.message}` };
          }
        },
      });
      return 0;
    };
  }
  C.vi = editor('vi');
  C.vim = editor('vi');
  C['vim.basic'] = C.vim;
  C['vim.tiny'] = C.vim;
  C.view = editor('vi');
  C.nano = editor('nano');
  C.pico = C.nano;
  C.editor = C.nano;
  C.emacs = (c) => {
    c.err("Command 'emacs' not found, but can be installed with:\nsudo apt install emacs-nox\n");
    c.err(note('(for the exam you need vi — try: vi ' + (c.args[0] || 'notes.txt') + ')'));
    return 127;
  };
  function vipw(file, label) {
    return (c) => {
      if (needRoot(c, `${c.name}: Couldn't lock file: Permission denied\n${c.name}: ${file} is unchanged`)) return 1;
      const sh = c.sh;
      sh.onEvent &&
        sh.onEvent('edit', {
          mode: 'vi',
          title: label,
          path: file,
          text: sh.fs.readFile(file, '/'),
          save: (t) => {
            if (file === '/etc/sudoers' && !/root\s+ALL/.test(t)) return { error: '>>> /etc/sudoers: syntax error near line 1 <<<\nWhat now? (e)dit, e(x)it without saving, (Q)uit and save (DANGER!)' };
            sh.fs.writeFile(file, '/', t);
            return { message: `${c.name}: ${file} updated` };
          },
        });
    };
  }
  C.vipw = vipw('/etc/passwd', 'vipw: /etc/passwd');
  C.vigr = vipw('/etc/group', 'vigr: /etc/group');
  C.visudo = vipw('/etc/sudoers', 'visudo: /etc/sudoers.tmp');

  /* ---- nested shells ---- */
  function shellCmd(c) {
    const sh = c.sh;
    const args = c.args.slice();
    let trace = false;
    let check = false;
    let login = false;
    while (args.length && args[0].startsWith('-') && args[0] !== '-c') {
      const a = args.shift();
      if (a === '-x') trace = true;
      else if (a === '-n') check = true;
      else if (a === '-l' || a === '--login') login = true;
      else if (a === '-e' || a === '-u' || a === '-i' || a === '--norc') {
        /* */
      }
    }
    if (args[0] === '-c') {
      const src = args[1] || '';
      return sh.subshell(() => {
        sh.positional = args.slice(3);
        sh.scriptName = args[2] || c.name;
        if (trace) sh.opts.x = true;
        return sh.runSource(src, c.io);
      });
    }
    if (args.length) {
      let data;
      try {
        data = sh.fs.readFile(args[0], sh.cwd);
      } catch (e) {
        c.err(`${c.name}: ${args[0]}: ${e.message}\n`);
        return 127;
      }
      if (check) {
        try {
          SIM.parse(data);
          return 0;
        } catch (e) {
          c.err(`${args[0]}: ${e.incomplete ? 'syntax error: unexpected end of file' : e.message}\n`);
          return 2;
        }
      }
      const saveX = sh.opts.x;
      if (trace) sh.opts.x = true;
      try {
        return sh.runScript(args[0], data, args.slice(1), c.io);
      } finally {
        sh.opts.x = saveX;
      }
    }
    if (c.stdin) return sh.subshell(() => sh.runSource(c.stdin, c.io));
    sh.pushUser(sh.username, login);
    if (sh.onEvent) sh.onEvent('note', `(started a nested ${c.name} — SHLVL=${sh.vars.SHLVL}; "exit" returns to the parent shell)`);
    return 0;
  }
  /* ================= LVM (simplified) ================= */
  const lvm = (sh) => (sh.state.lvm = sh.state.lvm || { pvs: {}, vgs: {}, lvs: {} });
  const gib = (s) => {
    const m = /^\+?([\d.]+)([KMGT]?)/i.exec(s || '');
    return m ? +m[1] * { K: 1 / 1048576, M: 1 / 1024, G: 1, T: 1024, '': 1 / 1024 }[m[2].toUpperCase()] : 0;
  };
  const devSize = (c, d) => gib((c.fs.devices[d] || {}).size || '0');
  const lvAdd = (c, vg, name, size) => {
    const L = lvm(c.sh);
    const dev = `/dev/${vg}/${name}`;
    L.lvs[vg + '/' + name] = { vg, name, size };
    asRoot(c.sh, () => {
      c.fs.mkdirp('/dev/' + vg, '/');
      c.fs.mkdirp('/dev/mapper', '/');
      const mapper = `/dev/mapper/${vg.replace(/-/g, '--')}-${name.replace(/-/g, '--')}`;
      if (!c.fs.exists(mapper)) c.fs.create(mapper, '/', { t: 'b', mode: 0o660, rdev: [254, Object.keys(L.lvs).length - 1], devname: 'dm-' + (Object.keys(L.lvs).length - 1) });
      if (!c.fs.exists(dev)) c.fs.symlink('../mapper/' + mapper.split('/').pop(), dev, '/');
    });
    c.fs.devices[dev] = c.fs.devices[`/dev/mapper/${vg}-${name}`] = { size: size + 'G' };
  };
  C.pvcreate = (c) => {
    if (needRoot(c, '  WARNING: Running as a non-root user. Functionality may be unavailable.\n  /run/lock/lvm/P_global:aux: open failed: Permission denied')) return 5;
    const L = lvm(c.sh);
    for (const d of c.args.filter((a) => !a.startsWith('-'))) {
      if (!c.fs.devices[d]) return c.fail(`  No device found for ${d}.`, 5);
      L.pvs[d] = { vg: '', size: devSize(c, d) };
      c.fs.devices[d].fstype = 'LVM2_member';
      c.out(`  Physical volume "${d}" successfully created.\n`);
    }
    return 0;
  };
  C.vgcreate = (c) => {
    if (needRoot(c)) return 5;
    const L = lvm(c.sh);
    const [vg, ...pvs] = c.args.filter((a) => !a.startsWith('-'));
    if (!vg || !pvs.length) return c.fail('  Please provide volume group name and physical volumes', 3);
    for (const d of pvs) {
      if (!L.pvs[d]) {
        if (!c.fs.devices[d]) return c.fail(`  No device found for ${d}.`, 5);
        L.pvs[d] = { vg: '', size: devSize(c, d) };
        c.out(`  Physical volume "${d}" successfully created.\n`);
      }
      L.pvs[d].vg = vg;
    }
    L.vgs[vg] = { pvs };
    c.out(`  Volume group "${vg}" successfully created\n`);
  };
  C.vgextend = (c) => {
    if (needRoot(c)) return 5;
    const L = lvm(c.sh);
    const [vg, ...pvs] = c.args;
    if (!L.vgs[vg]) return c.fail(`  Volume group "${vg}" not found`, 5);
    for (const d of pvs) {
      L.pvs[d] = L.pvs[d] || { size: devSize(c, d) };
      L.pvs[d].vg = vg;
      L.vgs[vg].pvs.push(d);
    }
    c.out(`  Volume group "${vg}" successfully extended\n`);
  };
  const vgSize = (L, vg) => L.vgs[vg].pvs.reduce((a, d) => a + (L.pvs[d] ? L.pvs[d].size : 0), 0);
  const vgUsed = (L, vg) => Object.values(L.lvs).filter((l) => l.vg === vg).reduce((a, l) => a + l.size, 0);
  C.lvcreate = (c) => {
    if (needRoot(c)) return 5;
    const L = lvm(c.sh);
    const { o, rest } = getopt(c.args, 'L:l:n:', { 'size=': 'L', 'extents=': 'l', 'name=': 'n' });
    const vg = rest[0];
    if (!L.vgs[vg]) return c.fail(`  Volume group "${vg}" not found`, 5);
    const free = vgSize(L, vg) - vgUsed(L, vg);
    const size = o.L ? gib(o.L) : /%FREE/i.test(o.l || '') ? (free * parseInt(o.l, 10)) / 100 : 0;
    if (!size) return c.fail('  Please specify either size or extents', 3);
    if (size > free + 1e-9) return c.fail(`  Volume group "${vg}" has insufficient free space.`, 5);
    const name = o.n || 'lvol' + Object.keys(L.lvs).length;
    lvAdd(c, vg, name, size);
    c.out(`  Logical volume "${name}" created.\n`);
  };
  C.lvextend = (c) => {
    if (needRoot(c)) return 5;
    const L = lvm(c.sh);
    const { o, rest } = getopt(c.args, 'L:l:r', { 'size=': 'L', 'resizefs': 'r' });
    const key = (rest[0] || '').replace(/^\/dev\/(mapper\/)?/, '').replace(/-(?!-)/, '/');
    const lv = L.lvs[key];
    if (!lv) return c.fail(`  Failed to find logical volume "${key}"`, 5);
    const nsize = /^\+/.test(o.L || '') ? lv.size + gib(o.L) : o.L ? gib(o.L) : lv.size + ((vgSize(L, lv.vg) - vgUsed(L, lv.vg)) * parseInt(o.l || '0', 10)) / 100;
    if (nsize - lv.size > vgSize(L, lv.vg) - vgUsed(L, lv.vg) + 1e-9) return c.fail(`  Insufficient free space`, 5);
    c.out(`  Size of logical volume ${key} changed from ${lv.size.toFixed(2)} GiB to ${nsize.toFixed(2)} GiB.\n  Logical volume ${key} successfully resized.\n`);
    lv.size = nsize;
    c.fs.devices['/dev/' + key].size = nsize + 'G';
    if (o.r) c.out('resize2fs 1.47.0 (5-Feb-2023)\nThe filesystem on /dev/' + key + ' is now resized.\n');
  };
  const lvmReport = (c, kind) => {
    const L = lvm(c.sh);
    if (kind === 'pvs') {
      c.out('  PV         VG      Fmt  Attr PSize   PFree\n');
      for (const [d, p] of Object.entries(L.pvs)) c.out(`  ${d.padEnd(10)} ${(p.vg || '').padEnd(7)} lvm2 a--  ${(p.size.toFixed(2) + 'g').padStart(7)} ${((p.vg ? Math.max(0, vgSize(L, p.vg) - vgUsed(L, p.vg)) : p.size).toFixed(2) + 'g').padStart(7)}\n`);
    } else if (kind === 'vgs') {
      c.out('  VG      #PV #LV #SN Attr   VSize   VFree\n');
      for (const [vg, v] of Object.entries(L.vgs)) c.out(`  ${vg.padEnd(7)} ${String(v.pvs.length).padStart(3)} ${String(Object.values(L.lvs).filter((l) => l.vg === vg).length).padStart(3)}   0 wz--n- ${(vgSize(L, vg).toFixed(2) + 'g').padStart(7)} ${((vgSize(L, vg) - vgUsed(L, vg)).toFixed(2) + 'g').padStart(7)}\n`);
    } else {
      c.out('  LV      VG      Attr       LSize\n');
      for (const l of Object.values(L.lvs)) c.out(`  ${l.name.padEnd(7)} ${l.vg.padEnd(7)} -wi-a----- ${(l.size.toFixed(2) + 'g').padStart(7)}\n`);
    }
    if (!Object.keys(L[kind]).length) c.err(note(`(no ${kind === 'pvs' ? 'physical volumes' : kind === 'vgs' ? 'volume groups' : 'logical volumes'} yet — try pvcreate / vgcreate / lvcreate)`));
  };
  C.pvs = (c) => (needRoot(c) ? 5 : lvmReport(c, 'pvs'));
  C.vgs = (c) => (needRoot(c) ? 5 : lvmReport(c, 'vgs'));
  C.lvs = (c) => (needRoot(c) ? 5 : lvmReport(c, 'lvs'));
  C.pvdisplay = C.pvs;
  C.vgdisplay = C.vgs;
  C.lvdisplay = C.lvs;
  C.lvremove = (c) => {
    if (needRoot(c)) return 5;
    const L = lvm(c.sh);
    const key = (c.args.filter((a) => !a.startsWith('-'))[0] || '').replace(/^\/dev\//, '');
    if (!L.lvs[key]) return c.fail(`  Failed to find logical volume "${key}"`, 5);
    delete L.lvs[key];
    c.out(`  Logical volume "${key.split('/')[1]}" successfully removed.\n`);
  };
  sbin('pvcreate', 'vgcreate', 'vgextend', 'lvcreate', 'lvextend', 'pvs', 'vgs', 'lvs', 'pvdisplay', 'vgdisplay', 'lvdisplay', 'lvremove');

  /* ================= systemd-run, update-alternatives ================= */
  C['systemd-run'] = (c) => {
    const { o, rest } = getopt(c.args, 'u:', { 'on-active=': 'active', 'on-calendar=': 'cal', 'unit=': 'u', user: 'user', scope: 'scope', 'on-boot=': 'boot' }, { loose: true });
    if (!o.user && needRoot(c, 'Failed to start transient service unit: Interactive authentication required.')) return 1;
    if (!rest.length) return c.fail('Command line to execute required.');
    const unit = o.u || 'run-u' + c.sh.state.nextPid++;
    if (o.active || o.cal || o.boot) {
      c.sh.state.services[unit + '.timer'] = { desc: '/usr/bin/' + rest.join(' '), active: true, enabled: false, pid: 0, timer: true };
      c.err(`Running timer as unit: ${unit}.timer\nWill run service as unit: ${unit}.service\n`);
      c.err(note(`(the command runs ${o.active ? 'in ' + o.active : o.cal ? 'at "' + o.cal + '"' : o.boot + ' after boot'} — list it with "systemctl list-timers")`));
      return 0;
    }
    c.err(`Running as unit: ${unit}.service\n`);
    return c.sh.runArgv(rest, c.io);
  };
  C['update-alternatives'] = (c) => {
    const alts = (c.sh.state.alternatives = c.sh.state.alternatives || { editor: ['/usr/bin/vim.basic', '/bin/nano', '/usr/bin/vim.tiny'], 'x-www-browser': ['/usr/bin/firefox-esr'], java: ['/usr/lib/jvm/java-17-openjdk-amd64/bin/java'] });
    const sel = (c.sh.state.altSel = c.sh.state.altSel || { editor: 0, 'x-www-browser': 0, java: 0 });
    const [op, name, ...more] = c.args;
    if (op === '--get-selections') {
      for (const k of Object.keys(alts)) c.out(`${k.padEnd(28)} auto     ${alts[k][sel[k]]}\n`);
      return 0;
    }
    if (op === '--list') return alts[name] ? (alts[name].forEach((x) => c.out(x + '\n')), 0) : c.fail(`no alternatives for ${name}`, 2);
    if (op === '--display' || op === '--query') {
      if (!alts[name]) return c.fail(`no alternatives for ${name}`, 2);
      c.out(`${name} - auto mode\n  link best version is ${alts[name][0]}\n  link currently points to ${alts[name][sel[name]]}\n  link ${name} is /usr/bin/${name}\n`);
      alts[name].forEach((x, i) => c.out(`${x} - priority ${50 - i * 10}\n`));
      return 0;
    }
    if (needRoot(c, 'update-alternatives: error: unable to create file \'/var/lib/dpkg/alternatives/' + (name || '') + '.dpkg-tmp\': Permission denied')) return 2;
    if (op === '--config') {
      if (!alts[name]) return c.fail(`no alternatives for ${name}`, 2);
      c.out(`There are ${alts[name].length} choices for the alternative ${name} (providing /usr/bin/${name}).\n\n  Selection    Path                Priority   Status\n------------------------------------------------------------\n`);
      alts[name].forEach((x, i) => c.out(`${i === sel[name] ? '*' : ' '} ${i}            ${x.padEnd(20)}${50 - i * 10}        ${i ? 'manual mode' : 'auto mode'}\n`));
      const ans = c.sh.promptFn ? c.sh.promptFn('\nPress <enter> to keep the current choice[*], or type selection number: ') : '';
      if (ans && /^\d+$/.test(ans.trim()) && alts[name][+ans]) {
        sel[name] = +ans;
        c.out(`update-alternatives: using ${alts[name][+ans]} to provide /usr/bin/${name} (${name}) in manual mode\n`);
      }
      return 0;
    }
    if (op === '--set') {
      const i = (alts[name] || []).indexOf(more[0]);
      if (i < 0) return c.fail(`alternative ${more[0]} for ${name} not registered; not setting`, 2);
      sel[name] = i;
      c.out(`update-alternatives: using ${more[0]} to provide /usr/bin/${name} (${name}) in manual mode\n`);
      return 0;
    }
    if (op === '--install') {
      const [, nm, path, prio] = c.args.slice(1);
      alts[nm] = alts[nm] || [];
      if (alts[nm].indexOf(path) < 0) alts[nm].push(path);
      sel[nm] = sel[nm] || 0;
      c.out(`update-alternatives: using ${path} to provide ${c.args[1]} (${nm}) in auto mode (priority ${prio})\n`);
      return 0;
    }
    return c.fail('need --display, --config, --set, --install, --list or --get-selections', 2);
  };
  sbin('update-alternatives');

  C.bash = shellCmd;
  C.sh = shellCmd;
  C.dash = shellCmd;
  C.zsh = shellCmd;
  C.ksh = shellCmd;
  C.csh = (c) => (c.err(note('(csh/tcsh use a different syntax; this simulator only implements Bourne-style shells)')), 127);
})(typeof window !== 'undefined' ? window : globalThis);
