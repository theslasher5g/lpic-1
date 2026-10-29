/* LPIC-1 Trainer — shell interpreter: expansion, execution, builtins. */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});
  SIM.cmds = SIM.cmds || {};
  SIM.sbin = SIM.sbin || new Set();

  const Q = '\u0001'; // marks a quoted (non-glob) character
  const SP = '\u0000'; // field separator produced by word splitting
  const BIN_MARK = '#!sim:';

  class Flow {
    constructor(kind, n, code) {
      this.kind = kind;
      this.n = n || 1;
      this.code = code;
    }
  }
  SIM.Flow = Flow;

  class Stream {
    constructor(data) {
      this.data = data == null ? '' : String(data);
      this.pos = 0;
    }
    readAll() {
      const s = this.data.slice(this.pos);
      this.pos = this.data.length;
      return s;
    }
    readLine() {
      if (this.pos >= this.data.length) return null;
      let e = this.data.indexOf('\n', this.pos);
      let line;
      if (e < 0) {
        line = this.data.slice(this.pos);
        this.pos = this.data.length;
      } else {
        line = this.data.slice(this.pos, e);
        this.pos = e + 1;
      }
      return line;
    }
  }
  SIM.Stream = Stream;

  /* ---------- POSIX character classes (shared with tr/grep/glob) ---------- */
  const PCLASS = {
    alpha: 'a-zA-Z',
    digit: '0-9',
    alnum: 'a-zA-Z0-9',
    upper: 'A-Z',
    lower: 'a-z',
    space: ' \\t\\n\\r\\f\\v',
    blank: ' \\t',
    punct: '!-\\/:-@\\[-`{-~',
    xdigit: '0-9A-Fa-f',
    cntrl: '\\x00-\\x1f\\x7f',
    print: '\\x20-\\x7e',
    graph: '\\x21-\\x7e',
    word: '\\w',
  };
  SIM.PCLASS = PCLASS;

  function globToRegex(pat, anchored = true) {
    let r = '';
    for (let i = 0; i < pat.length; i++) {
      const c = pat[i];
      if (c === Q) {
        r += esc(pat[++i] || '');
        continue;
      }
      if (c === '\\') {
        r += esc(pat[++i] || '\\');
        continue;
      }
      if (c === '*') r += '[^/]*';
      else if (c === '?') r += '[^/]';
      else if (c === '[') {
        let j = i + 1;
        let cls = '';
        if (pat[j] === '!' || pat[j] === '^') {
          cls += '^';
          j++;
        }
        if (pat[j] === ']') {
          cls += '\\]';
          j++;
        }
        let ok = false;
        while (j < pat.length) {
          if (pat[j] === ']') {
            ok = true;
            break;
          }
          if (pat[j] === '[' && pat[j + 1] === ':') {
            const e = pat.indexOf(':]', j + 2);
            if (e > 0) {
              cls += PCLASS[pat.slice(j + 2, e)] || '';
              j = e + 2;
              continue;
            }
          }
          if (pat[j] === Q) j++;
          const ch = pat[j];
          cls += ch === '\\' || ch === ']' || ch === '[' ? '\\' + ch : ch;
          j++;
        }
        if (ok) {
          r += '[' + cls + ']';
          i = j;
        } else r += '\\[';
      } else r += esc(c);
    }
    return anchored ? new RegExp('^' + r + '$', 's') : r;
  }
  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  }
  SIM.globToRegex = globToRegex;
  SIM.reEsc = esc;
  const hasGlob = (s) => {
    for (let i = 0; i < s.length; i++) {
      if (s[i] === Q) {
        i++;
        continue;
      }
      if (s[i] === '*' || s[i] === '?' || s[i] === '[') return true;
    }
    return false;
  };
  const unmark = (s) => s.replace(/\u0001(.)/gs, '$1').replace(/\u0001/g, '');
  SIM.hasGlob = hasGlob;
  SIM.unmark = unmark;
  // test a string against a shell pattern (case, [[ == ]], ${x#pat})
  SIM.patMatch = function (str, pat) {
    return globToRegex(pat).test(str);
  };
  function patToRe(pat) {
    return globToRegex(pat, false).replace(/\[\^\/\]/g, '.');
  }

  /* ---------- brace expansion ---------- */
  function braceExpand(w) {
    let i = 0;
    let q = null;
    while (i < w.length) {
      const c = w[i];
      if (q) {
        if (c === '\\' && q === '"') i++;
        else if (c === q) q = null;
        i++;
        continue;
      }
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === "'" || c === '"') {
        q = c;
        i++;
        continue;
      }
      if (c === '$' && w[i + 1] === '{') {
        i = SIM.scanBrace(w, i + 2);
        continue;
      }
      if (c === '{') {
        // find matching
        let depth = 1;
        let j = i + 1;
        const commas = [];
        let q2 = null;
        for (; j < w.length; j++) {
          const d = w[j];
          if (q2) {
            if (d === q2) q2 = null;
            continue;
          }
          if (d === '\\') {
            j++;
            continue;
          }
          if (d === "'" || d === '"') {
            q2 = d;
            continue;
          }
          if (d === '{') depth++;
          else if (d === '}') {
            depth--;
            if (depth === 0) break;
          } else if (d === ',' && depth === 1) commas.push(j);
        }
        if (j >= w.length) return [w];
        const pre = w.slice(0, i);
        const body = w.slice(i + 1, j);
        const post = w.slice(j + 1);
        let alts = null;
        if (commas.length) {
          alts = [];
          let s = i + 1;
          for (const cpos of commas) {
            alts.push(w.slice(s, cpos));
            s = cpos + 1;
          }
          alts.push(w.slice(s, j));
        } else {
          let m = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(body);
          if (m) {
            const a = +m[1];
            const b = +m[2];
            let st = Math.abs(+(m[3] || 1)) || 1;
            const pad = /^-?0\d/.test(m[1]) || /^-?0\d/.test(m[2]) ? Math.max(m[1].length, m[2].length) : 0;
            alts = [];
            if (a <= b) for (let k = a; k <= b; k += st) alts.push(String(k).padStart(pad, '0'));
            else for (let k = a; k >= b; k -= st) alts.push(String(k).padStart(pad, '0'));
          } else if ((m = /^([a-zA-Z])\.\.([a-zA-Z])$/.exec(body))) {
            const a = m[1].charCodeAt(0);
            const b = m[2].charCodeAt(0);
            alts = [];
            if (a <= b) for (let k = a; k <= b; k++) alts.push(String.fromCharCode(k));
            else for (let k = a; k >= b; k--) alts.push(String.fromCharCode(k));
          }
        }
        if (!alts) {
          // not a brace expression: continue after it
          const rest = braceExpand(w.slice(i + 1));
          return rest.map((r) => w.slice(0, i + 1) + r);
        }
        const out = [];
        for (const a of alts) for (const r of braceExpand(pre + a + post)) out.push(r);
        return out;
      }
      i++;
    }
    return [w];
  }
  SIM.braceExpand = braceExpand;

  /* ---------- arithmetic ---------- */
  function arith(expr, sh) {
    const toks = [];
    const re = /\s*(0[xX][0-9a-fA-F]+|\d+#[0-9a-zA-Z]+|\d+|[A-Za-z_]\w*|\*\*=?|<<=?|>>=?|\+\+|--|&&|\|\||[=!<>]=|[-+*\/%&|^]=|[-+*\/%()<>!~&|^?:=,])/y;
    let m;
    let pos = 0;
    expr = expr.trim();
    while (pos < expr.length) {
      re.lastIndex = pos;
      m = re.exec(expr);
      if (!m) throw new Error(`${expr}: syntax error: invalid arithmetic operator (error token is "${expr.slice(pos)}")`);
      toks.push(m[1]);
      pos = re.lastIndex;
      while (expr[pos] === ' ') pos++;
    }
    let p = 0;
    const peek = () => toks[p];
    const isName = (t) => /^[A-Za-z_]\w*$/.test(t || '');
    const getVar = (n) => {
      const v = sh.getVar(n);
      if (v === undefined || v === '') return 0;
      if (/^-?\d+$/.test(v.trim())) return parseInt(v, 10);
      try {
        return arith(v, sh);
      } catch (e) {
        return 0;
      }
    };
    const num = (t) => {
      if (/^0[xX]/.test(t)) return parseInt(t, 16);
      if (/#/.test(t)) {
        const [b, d] = t.split('#');
        return parseInt(d, +b);
      }
      if (/^0\d+$/.test(t)) return parseInt(t, 8);
      return parseInt(t, 10);
    };
    function primary() {
      const t = toks[p++];
      if (t === undefined) throw new Error('syntax error: operand expected');
      if (t === '(') {
        const v = comma();
        if (toks[p++] !== ')') throw new Error('missing )');
        return v;
      }
      if (t === '-') return -unary();
      if (t === '+') return +unary();
      if (t === '!') return unary() ? 0 : 1;
      if (t === '~') return ~unary();
      if (t === '++' || t === '--') {
        const n = toks[p++];
        const v = getVar(n) + (t === '++' ? 1 : -1);
        sh.setVar(n, String(v));
        return v;
      }
      if (/^\d/.test(t)) return num(t);
      if (isName(t)) {
        if (peek() === '++' || peek() === '--') {
          const op = toks[p++];
          const v = getVar(t);
          sh.setVar(t, String(v + (op === '++' ? 1 : -1)));
          return v;
        }
        const ao = peek();
        if (ao && /^([-+*\/%&|^]|\*\*|<<|>>)?=$/.test(ao) && ao !== '==') {
          p++;
          const rhs = assign();
          let v = rhs;
          if (ao !== '=') v = binop(ao.slice(0, -1), getVar(t), rhs);
          sh.setVar(t, String(v));
          return v;
        }
        return getVar(t);
      }
      throw new Error(`syntax error: operand expected (error token is "${t}")`);
    }
    function unary() {
      return primary();
    }
    function binop(op, a, b) {
      switch (op) {
        case '**':
          return Math.pow(a, b);
        case '*':
          return a * b;
        case '/':
          if (b === 0) throw new Error('division by 0 (error token is "' + b + '")');
          return Math.trunc(a / b);
        case '%':
          if (b === 0) throw new Error('division by 0');
          return a % b;
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '<<':
          return a << b;
        case '>>':
          return a >> b;
        case '<':
          return +(a < b);
        case '<=':
          return +(a <= b);
        case '>':
          return +(a > b);
        case '>=':
          return +(a >= b);
        case '==':
          return +(a === b);
        case '!=':
          return +(a !== b);
        case '&':
          return a & b;
        case '^':
          return a ^ b;
        case '|':
          return a | b;
        case '&&':
          return +(a && b);
        case '||':
          return +(a || b);
      }
      throw new Error('bad operator ' + op);
    }
    const LEVELS = [['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '<=', '>', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%'], ['**']];
    function level(i) {
      if (i >= LEVELS.length) return unary();
      let a = level(i + 1);
      while (LEVELS[i].indexOf(peek()) >= 0) {
        const op = toks[p++];
        const b = op === '**' ? level(i) : level(i + 1);
        a = binop(op, a, b);
        if (op === '**') break;
      }
      return a;
    }
    function ternary() {
      const c = level(0);
      if (peek() === '?') {
        p++;
        const a = assign();
        if (toks[p++] !== ':') throw new Error('expected :');
        const b = assign();
        return c ? a : b;
      }
      return c;
    }
    function assign() {
      return ternary();
    }
    function comma() {
      let v = assign();
      while (peek() === ',') {
        p++;
        v = assign();
      }
      return v;
    }
    if (!toks.length) return 0;
    const v = comma();
    if (p < toks.length) throw new Error(`syntax error in expression (error token is "${toks.slice(p).join(' ')}")`);
    return v;
  }
  SIM.arith = arith;

  /* ================= Shell ================= */
  class Shell {
    constructor(opts = {}) {
      this.fs = opts.fs || new SIM.VFS();
      if (!opts.fs) SIM.buildWorld(this.fs);
      this.state = opts.state || SIM.initialState();
      this.vars = {};
      this.exported = new Set();
      this.readonly = new Set();
      this.aliases = {};
      this.funcs = {};
      this.positional = [];
      this.status = 0;
      this.history = [];
      this.jobs = [];
      this.nextJob = 1;
      this.dirStack = [];
      this.userStack = [];
      this.opts = { x: false, e: false, C: false, u: false };
      this.steps = 0;
      this.localStack = [];
      this.sleepAccum = 0;
      this.promptFn = opts.promptFn || null;
      this.onEvent = opts.onEvent || null; // ui hooks (vi editor, clear, ...)
      this.lastPid = 0;
      this.traps = {};
      this.installBinaries();
      this.login(opts.user || 'student', true);
    }

    /* ---------- users ---------- */
    passwd() {
      return this._dbRead('/etc/passwd').map((l) => {
        const p = l.split(':');
        return { name: p[0], pw: p[1], uid: +p[2], gid: +p[3], gecos: p[4] || '', home: p[5] || '/', shell: p[6] || '/bin/sh' };
      });
    }
    groupDb() {
      return this._dbRead('/etc/group').map((l) => {
        const p = l.split(':');
        return { name: p[0], gid: +p[2], members: (p[3] || '').split(',').filter(Boolean) };
      });
    }
    _dbRead(path) {
      const c = this.fs.cred;
      this.fs.cred = { uid: 0, gid: 0, groups: [0] };
      let t = '';
      try {
        t = this.fs.readFile(path, '/');
      } catch (e) {
        /* */
      }
      this.fs.cred = c;
      return t.split('\n').filter((l) => l && !l.startsWith('#'));
    }
    user(nameOrUid) {
      const db = this.passwd();
      return db.find((u) => u.name === nameOrUid || (typeof nameOrUid === 'number' && u.uid === nameOrUid)) || null;
    }
    group(nameOrGid) {
      return this.groupDb().find((g) => g.name === nameOrGid || (typeof nameOrGid === 'number' && g.gid === nameOrGid)) || null;
    }
    uname(uid) {
      const u = this.user(uid);
      return u ? u.name : String(uid);
    }
    gname(gid) {
      const g = this.group(gid);
      return g ? g.name : String(gid);
    }
    groupsOf(name) {
      const u = this.user(name);
      const gs = this.groupDb();
      const res = [];
      if (u) res.push(u.gid);
      for (const g of gs) if (g.members.indexOf(name) >= 0 && res.indexOf(g.gid) < 0) res.push(g.gid);
      return res;
    }
    setCred(name) {
      const u = this.user(name) || this.user('nobody');
      this.cur = u;
      this.fs.cred = { uid: u.uid, gid: u.gid, groups: this.groupsOf(u.name) };
    }
    get uid() {
      return this.fs.cred.uid;
    }
    get username() {
      return this.cur ? this.cur.name : 'student';
    }
    login(name, initial) {
      this.setCred(name);
      const u = this.cur;
      this.vars = {};
      this.exported = new Set();
      const set = (k, v) => {
        this.vars[k] = v;
        this.exported.add(k);
      };
      set('HOME', u.home);
      set('USER', u.name);
      set('LOGNAME', u.name);
      set('SHELL', u.shell);
      set('PATH', u.uid === 0 ? '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' : '/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games');
      set('LANG', this.state.lang || 'en_US.UTF-8');
      set('TERM', 'xterm-256color');
      set('PWD', u.home);
      set('HOSTNAME', this.state.hostname);
      set('MAIL', '/var/mail/' + u.name);
      set('SHLVL', '1');
      set('XDG_RUNTIME_DIR', '/run/user/' + u.uid);
      if (u.uid >= 1000) set('DISPLAY', ':0');
      this.vars.PS1 = u.uid === 0 ? '\\u@\\h:\\w# ' : '\\u@\\h:\\w\\$ ';
      this.vars.PS2 = '> ';
      this.vars.IFS = ' \t\n';
      this.vars.BASH = '/bin/bash';
      this.vars.BASH_VERSION = '5.2.15(1)-release';
      this.vars.HISTSIZE = '1000';
      this.vars.UID = String(u.uid);
      this.vars.EUID = String(u.uid);
      this.vars.PPID = '1250';
      this.vars.OSTYPE = 'linux-gnu';
      this.vars.HOSTTYPE = 'x86_64';
      this.aliases = {};
      this.funcs = {};
      this.cwd = this.fs.tryLookup(u.home, '/') ? u.home : '/';
      if (!this.fs.tryLookup(this.cwd, '/')) this.cwd = '/';
      this.vars.PWD = this.cwd;
      this.vars.OLDPWD = this.cwd;
      // login shell startup files
      this.sourceQuiet('/etc/profile');
      const h = u.home;
      if (this.fs.exists(h + '/.bash_profile')) this.sourceQuiet(h + '/.bash_profile');
      else if (this.fs.exists(h + '/.bash_login')) this.sourceQuiet(h + '/.bash_login');
      else if (this.fs.exists(h + '/.profile')) this.sourceQuiet(h + '/.profile');
      if (this.fs.exists('/etc/bash.bashrc')) this.sourceQuiet('/etc/bash.bashrc');
      this.status = 0;
    }
    sourceQuiet(path) {
      try {
        const sink = { stdin: null, out: () => {}, err: () => {} };
        this.vars.PS1 = this.vars.PS1 || '$ ';
        this.runSource(this.fs.readFile(path, '/'), sink, { source: true });
      } catch (e) {
        /* ignore */
      }
    }
    pushUser(name, loginShell) {
      this.userStack.push({
        cred: this.fs.cred,
        cur: this.cur,
        vars: Object.assign({}, this.vars),
        exported: new Set(this.exported),
        aliases: Object.assign({}, this.aliases),
        funcs: Object.assign({}, this.funcs),
        cwd: this.cwd,
      });
      if (loginShell) this.login(name);
      else {
        this.setCred(name);
        const u = this.cur;
        this.vars.USER = u.name;
        this.vars.UID = this.vars.EUID = String(u.uid);
        this.vars.PS1 = u.uid === 0 ? '\\u@\\h:\\w# ' : '\\u@\\h:\\w\\$ ';
        this.vars.HOME = u.home;
      }
      this.vars.SHLVL = String(this.userStack.length + 1);
    }
    popUser() {
      const s = this.userStack.pop();
      if (!s) return false;
      Object.assign(this, { cur: s.cur, vars: s.vars, exported: s.exported, aliases: s.aliases, funcs: s.funcs, cwd: s.cwd });
      this.fs.cred = s.cred;
      return true;
    }

    /* ---------- binaries in PATH ---------- */
    installBinaries() {
      const fs = this.fs;
      const c = fs.cred;
      const um = fs.umask;
      fs.cred = { uid: 0, gid: 0, groups: [0] };
      fs.umask = 0;
      for (const name of Object.keys(SIM.cmds)) {
        if (SIM.optional && SIM.optional.has(name)) continue;
        const dir = SIM.sbin.has(name) ? '/usr/sbin/' : '/usr/bin/';
        const r = fs.tryLookup(dir + name, '/');
        if (!r) {
          try {
            const n = fs.writeFile(dir + name, '/', BIN_MARK + name + '\n\x7fELF 64-bit LSB pie executable, x86-64, dynamically linked\n');
            n.mode = 0o755;
          } catch (e) {
            /* */
          }
        } else if (r.node.data && !r.node.data.startsWith(BIN_MARK) && r.node.data.startsWith('\x7fELF')) {
          r.node.data = BIN_MARK + name + '\n' + r.node.data;
        }
        const man = '/usr/share/man/man' + (SIM.sbin.has(name) ? 8 : 1) + '/' + name + '.' + (SIM.sbin.has(name) ? 8 : 1) + '.gz';
        if (!fs.tryLookup(man, '/')) {
          try {
            fs.writeFile(man, '/', 'SIMGZ\n(manual page)\n').mode = 0o644;
          } catch (e) {
            /* */
          }
        }
      }
      fs.cred = c;
      fs.umask = um;
    }

    /* ---------- variables ---------- */
    getVar(name) {
      switch (name) {
        case '?':
          return String(this.status);
        case '$':
          return '1990';
        case '!':
          return this.lastPid ? String(this.lastPid) : '';
        case '#':
          return String(this.positional.length);
        case '0':
          return this.scriptName || '-bash';
        case '@':
        case '*':
          return this.positional.join(name === '*' ? (this.vars.IFS || ' ')[0] || '' : ' ');
        case '-':
          return 'himB' + (this.opts.x ? 'x' : '') + (this.opts.e ? 'e' : '');
        case 'RANDOM':
          return String(Math.floor(Math.random() * 32768));
        case 'SECONDS':
          return String(Math.floor((Date.now() - (this.started || (this.started = Date.now()))) / 1000));
        case 'PWD':
          return this.cwd;
        case 'LINENO':
          return '1';
      }
      if (/^\d+$/.test(name)) return this.positional[+name - 1];
      return this.vars[name];
    }
    setVar(name, val, opts = {}) {
      if (this.readonly.has(name)) throw new Error(`${name}: readonly variable`);
      // local scope
      if (this.localStack.length && !opts.global) {
        const top = this.localStack[this.localStack.length - 1];
        if (opts.local && !(name in top)) top[name] = this.vars[name];
      }
      this.vars[name] = val;
      if (name === 'PWD') this.cwd = val;
      if (opts.export) this.exported.add(name);
    }
    unsetVar(name) {
      if (this.readonly.has(name)) throw new Error(`unset: ${name}: cannot unset: readonly variable`);
      delete this.vars[name];
      this.exported.delete(name);
    }
    env() {
      const e = {};
      for (const k of this.exported) if (this.vars[k] !== undefined) e[k] = this.vars[k];
      return e;
    }

    /* ---------- prompt ---------- */
    prompt(ps) {
      const p = ps === undefined ? this.vars.PS1 || '$ ' : ps;
      const home = this.vars.HOME;
      let w = this.cwd;
      if (home && (w === home || w.startsWith(home + '/'))) w = '~' + w.slice(home.length);
      const now = new Date();
      return p.replace(/\\([uhHwW$nt@dsjv#\\]|\[|\])/g, (m, c) => {
        switch (c) {
          case 'u':
            return this.username;
          case 'h':
            return this.state.hostname.split('.')[0];
          case 'H':
            return this.state.hostname;
          case 'w':
            return w;
          case 'W':
            return w === '~' || w === '/' ? w : w.split('/').pop();
          case '$':
            return this.uid === 0 ? '#' : '$';
          case 'n':
            return '\n';
          case 't':
            return now.toTimeString().slice(0, 8);
          case '@':
            return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          case 'd':
            return now.toDateString().slice(0, 10);
          case 's':
            return 'bash';
          case 'j':
            return String(this.jobs.filter((j) => !j.done).length);
          case 'v':
            return '5.2';
          case '#':
            return String(this.history.length + 1);
          case '\\':
            return '\\';
          default:
            return '';
        }
      });
    }

    /* ---------- expansion ---------- */
    expandParam(inner, quoted) {
      if (inner === '#') return String(this.positional.length);
      if (inner[0] === '#' && inner.length > 1) {
        const v = this.getVar(inner.slice(1));
        return String((v || '').length);
      }
      if (inner[0] === '!') {
        const ref = this.getVar(inner.slice(1));
        return ref ? this.getVar(ref) || '' : '';
      }
      const m = /^([A-Za-z_]\w*|\d+|[@*#?$!-])(:?[-=+?]|##?|%%?|\/\/?|\^\^?|,,?|:)?([\s\S]*)$/.exec(inner);
      if (!m) throw new Error(`\${${inner}}: bad substitution`);
      const name = m[1];
      const op = m[2];
      const word = m[3];
      let v = this.getVar(name);
      if (!op) {
        if (word) throw new Error(`\${${inner}}: bad substitution`);
        if (v === undefined && this.opts.u) throw new Error(`${name}: unbound variable`);
        return v === undefined ? '' : v;
      }
      const ew = () => this.expandString(word);
      const unsetOrNull = v === undefined || (op[0] === ':' && v === '');
      switch (op) {
        case ':-':
        case '-':
          return unsetOrNull ? ew() : v;
        case ':=':
        case '=':
          if (unsetOrNull) {
            v = ew();
            this.setVar(name, v);
          }
          return v;
        case ':+':
        case '+':
          return unsetOrNull ? '' : ew();
        case ':?':
        case '?':
          if (unsetOrNull) throw new Error(`${name}: ${ew() || 'parameter null or not set'}`);
          return v;
        case '#':
        case '##': {
          v = v || '';
          const re = new RegExp('^(' + patToRe(this.expandPattern(word)) + ')', 's');
          if (op === '##') return v.replace(re, '');
          // shortest: try increasing prefixes
          for (let k = 0; k <= v.length; k++) if (SIM.patMatch(v.slice(0, k), this.expandPattern(word))) return v.slice(k);
          return v;
        }
        case '%':
        case '%%': {
          v = v || '';
          const pat = this.expandPattern(word);
          if (op === '%')
            for (let k = v.length; k >= 0; k--) {
              if (SIM.patMatch(v.slice(k), pat)) return v.slice(0, k);
            }
          else
            for (let k = 0; k <= v.length; k++) {
              if (SIM.patMatch(v.slice(k), pat)) return v.slice(0, k);
            }
          return v;
        }
        case '/':
        case '//': {
          v = v || '';
          const idx = findUnescaped(word, '/');
          const pat = idx < 0 ? word : word.slice(0, idx);
          const rep = idx < 0 ? '' : this.expandString(word.slice(idx + 1));
          let re = patToRe(this.expandPattern(pat));
          let flags = op === '//' ? 'g' : '';
          if (pat.startsWith('#')) re = '^' + patToRe(this.expandPattern(pat.slice(1)));
          if (pat.startsWith('%')) re = patToRe(this.expandPattern(pat.slice(1))) + '$';
          return v.replace(new RegExp(re, flags), () => rep);
        }
        case '^':
          return (v || '').replace(/^./, (c) => c.toUpperCase());
        case '^^':
          return (v || '').toUpperCase();
        case ',':
          return (v || '').replace(/^./, (c) => c.toLowerCase());
        case ',,':
          return (v || '').toLowerCase();
        case ':': {
          const parts = word.split(':');
          let off = arith(parts[0] || '0', this);
          v = v || '';
          if (off < 0) off = Math.max(0, v.length + off);
          if (parts.length > 1) {
            let len = arith(parts[1], this);
            if (len < 0) return v.slice(off, v.length + len);
            return v.substr(off, len);
          }
          return v.slice(off);
        }
      }
      return v || '';
    }
    // expansion helpers returning a single string
    expandString(raw) {
      return this.expandWord(raw, { noSplit: true, noGlob: true }).join(' ');
    }
    expandPattern(raw) {
      // keep glob characters active, quoted ones escaped with backslash
      const r = this.expandWord(raw, { noSplit: true, noGlob: true, keepMarks: true }).join(' ');
      return r.replace(/\u0001(.)/gs, '\\$1');
    }
    cmdSubst(src) {
      let out = '';
      const sub = this.subshell(() => {
        const st = this.runSource(src, { stdin: null, out: (s) => (out += s), err: this.curErr || (() => {}) });
        return st;
      });
      this.status = sub;
      return out.replace(/\n+$/, '');
    }
    subshell(fn) {
      const save = {
        vars: Object.assign({}, this.vars),
        exported: new Set(this.exported),
        aliases: Object.assign({}, this.aliases),
        funcs: Object.assign({}, this.funcs),
        cwd: this.cwd,
        positional: this.positional.slice(),
        opts: Object.assign({}, this.opts),
      };
      try {
        return fn();
      } catch (e) {
        if (e instanceof Flow && e.kind === 'exit') return e.code;
        throw e;
      } finally {
        Object.assign(this, save);
      }
    }
    // the core: raw word -> list of fields
    expandWord(raw, opt = {}) {
      let out = '';
      let quotedSeen = false;
      const addLit = (s, quoted) => {
        if (quoted) out += s.replace(/[\s\S]/g, (ch) => (/[*?[\]\\]/.test(ch) || opt.keepMarks ? Q + ch : ch));
        else out += s;
      };
      const addExp = (s, quoted) => {
        if (quoted || opt.noSplit) {
          addLit(s, quoted);
          return;
        }
        const ifs = this.vars.IFS === undefined ? ' \t\n' : this.vars.IFS;
        if (!ifs) {
          out += s;
          return;
        }
        const re = new RegExp('[' + esc(ifs) + ']+');
        out += s.split(re).join(SP);
      };
      const s = raw;
      let i = 0;
      const n = s.length;
      const dollar = (inDq) => {
        // s[i] === '$'
        const c1 = s[i + 1];
        if (c1 === '(' && s[i + 2] === '(') {
          const end = SIM.scanParen(s, i + 2);
          // end points after the closing '))'
          let expr;
          let e2 = end;
          if (s[end - 2] === ')') {
            expr = s.slice(i + 3, end - 2);
          } else {
            // $( (subshell) ) form
            const e = SIM.scanParen(s, i + 2);
            const src = s.slice(i + 2, e - 1);
            i = e;
            addExp(this.cmdSubst(src), inDq);
            return;
          }
          i = e2;
          const ex = this.expandString(expr.replace(/"/g, ''));
          addExp(String(arith(ex, this)), inDq);
          return;
        }
        if (c1 === '(') {
          const e = SIM.scanParen(s, i + 2);
          const src = s.slice(i + 2, e - 1);
          i = e;
          addExp(this.cmdSubst(src), inDq);
          return;
        }
        if (c1 === '{') {
          const e = SIM.scanBrace(s, i + 2);
          const inner = s.slice(i + 2, e - 1);
          i = e;
          if ((inner === '@' || inner === '*') && inDq && inner === '@') {
            out += this.positional.map((x) => x.replace(/[*?[\]\\]/g, (ch) => Q + ch)).join(SP);
            if (!this.positional.length) quotedSeen = quotedSeen && false;
            return;
          }
          addExp(this.expandParam(inner, inDq), inDq);
          return;
        }
        if (c1 && /[A-Za-z_]/.test(c1)) {
          const m = /^[A-Za-z_]\w*/.exec(s.slice(i + 1));
          i += 1 + m[0].length;
          const v = this.getVar(m[0]);
          if (v === undefined && this.opts.u) throw new Error(`${m[0]}: unbound variable`);
          addExp(v === undefined ? '' : v, inDq);
          return;
        }
        if (c1 && /[0-9?$!#@*-]/.test(c1)) {
          i += 2;
          if (c1 === '@' && inDq) {
            out += this.positional.map((x) => x.replace(/[*?[\]\\]/g, (ch) => Q + ch)).join(SP);
            return;
          }
          if (c1 === '@' && !inDq) {
            out += this.positional.join(SP);
            return;
          }
          addExp(this.getVar(c1) || '', inDq);
          return;
        }
        // literal $
        addLit('$', inDq);
        i++;
      };
      // tilde
      if (!opt.heredoc && s[0] === '~') {
        const m = /^~([A-Za-z0-9_.-]*)(?=\/|$|:)/.exec(s);
        if (m) {
          let h;
          if (m[1] === '') h = this.vars.HOME;
          else if (m[1] === '+') h = this.cwd;
          else if (m[1] === '-') h = this.vars.OLDPWD;
          else {
            const u = this.user(m[1]);
            h = u ? u.home : null;
          }
          if (h != null) {
            addLit(h, true);
            i = m[0].length;
          }
        }
      }
      while (i < n) {
        const c = s[i];
        if (opt.heredoc) {
          if (c === '\\' && /[$`\\]/.test(s[i + 1] || '')) {
            addLit(s[i + 1], true);
            i += 2;
            continue;
          }
          if (c === '$') {
            dollar(true);
            continue;
          }
          if (c === '`') {
            const e = SIM.scanBacktick(s, i + 1);
            addExp(this.cmdSubst(s.slice(i + 1, e - 1).replace(/\\`/g, '`')), true);
            i = e;
            continue;
          }
          addLit(c, true);
          i++;
          continue;
        }
        if (c === '\\') {
          if (i + 1 < n) addLit(s[i + 1], true);
          i += 2;
          quotedSeen = true;
          continue;
        }
        if (c === "'") {
          const e = s.indexOf("'", i + 1);
          addLit(s.slice(i + 1, e < 0 ? n : e), true);
          i = e < 0 ? n : e + 1;
          quotedSeen = true;
          continue;
        }
        if (c === '$' && s[i + 1] === "'") {
          // ANSI-C quoting
          const e = s.indexOf("'", i + 2);
          const body = s.slice(i + 2, e < 0 ? n : e);
          addLit(body.replace(/\\(n|t|r|e|a|\\|'|0[0-7]*|x[0-9a-fA-F]{1,2})/g, (m, x) => ({ n: '\n', t: '\t', r: '\r', e: '\x1b', a: '\x07', '\\': '\\', "'": "'" }[x] || (x[0] === 'x' ? String.fromCharCode(parseInt(x.slice(1), 16)) : String.fromCharCode(parseInt(x, 8))))), true);
          i = e < 0 ? n : e + 1;
          quotedSeen = true;
          continue;
        }
        if (c === '"') {
          quotedSeen = true;
          i++;
          while (i < n && s[i] !== '"') {
            const d = s[i];
            if (d === '\\') {
              const nx = s[i + 1];
              if (nx === '$' || nx === '`' || nx === '"' || nx === '\\') {
                addLit(nx, true);
                i += 2;
              } else if (nx === '\n') i += 2;
              else {
                addLit('\\', true);
                i++;
              }
              continue;
            }
            if (d === '$') {
              dollar(true);
              continue;
            }
            if (d === '`') {
              const e = SIM.scanBacktick(s, i + 1);
              addExp(this.cmdSubst(s.slice(i + 1, e - 1).replace(/\\`/g, '`')), true);
              i = e;
              continue;
            }
            addLit(d, true);
            i++;
          }
          i++;
          continue;
        }
        if (c === '$') {
          dollar(false);
          continue;
        }
        if (c === '`') {
          const e = SIM.scanBacktick(s, i + 1);
          addExp(this.cmdSubst(s.slice(i + 1, e - 1).replace(/\\`/g, '`')), false);
          i = e;
          continue;
        }
        if (opt.assign && c === ':' && s[i + 1] === '~') {
          addLit(':', false);
          i++;
          const m = /^~(?=\/|$|:)/.exec(s.slice(i));
          if (m) {
            addLit(this.vars.HOME, true);
            i++;
          }
          continue;
        }
        addLit(c, false);
        i++;
      }
      if (opt.keepMarks) return [out.split(SP).join(' ')];
      let fields = opt.noSplit ? [out.split(SP).join(' ')] : out.split(SP);
      if (!opt.noSplit) {
        fields = fields.filter((f, idx) => f !== '' || (quotedSeen && fields.length === 1));
      }
      const res = [];
      for (const f of fields) {
        if (!opt.noGlob && hasGlob(f)) {
          const g = this.glob(f);
          if (g.length) {
            res.push(...g);
            continue;
          }
        }
        res.push(unmark(f));
      }
      return res;
    }
    expandWords(words) {
      const out = [];
      for (const w of words) for (const b of braceExpand(w)) out.push(...this.expandWord(b));
      return out;
    }
    glob(pat) {
      const abs = pat.startsWith('/');
      const parts = pat.split('/').filter((x, i) => x !== '' || i === 0);
      if (abs) parts.shift();
      let results = [{ path: abs ? '/' : '', dir: abs ? '/' : this.cwd }];
      for (let pi = 0; pi < parts.length; pi++) {
        const comp = parts[pi];
        const last = pi === parts.length - 1;
        const next = [];
        for (const r of results) {
          const d = this.fs.tryLookup(r.dir, '/');
          if (!d || d.node.t !== 'd') continue;
          if (!hasGlob(comp)) {
            const name = unmark(comp);
            const p = r.dir === '/' ? '/' + name : r.dir + '/' + name;
            if (name === '.' || name === '..' || this.fs.tryLookup(p, '/', !last))
              next.push({ path: r.path + (r.path && !r.path.endsWith('/') ? '/' : '') + name, dir: p });
            continue;
          }
          if (!this.fs.can(d.node, 4)) continue;
          const re = globToRegex(comp);
          const showHidden = unmark(comp).startsWith('.');
          for (const name of this.fs.list(d.node)) {
            if (name.startsWith('.') && !showHidden) continue;
            if (!re.test(name)) continue;
            const p = r.dir === '/' ? '/' + name : r.dir + '/' + name;
            if (!last) {
              const t = this.fs.tryLookup(p, '/');
              if (!t || t.node.t !== 'd') continue;
            }
            next.push({ path: r.path + (r.path && !r.path.endsWith('/') ? '/' : '') + name, dir: p });
          }
        }
        results = next;
        if (!results.length) break;
      }
      return results.map((r) => r.path).sort();
    }

    /* ---------- running ---------- */
    run(src, io) {
      // top-level entry used by terminal: returns {status} or {incomplete:true}
      let ast;
      try {
        ast = SIM.parse(src);
      } catch (e) {
        if (e.incomplete) return { incomplete: true };
        io.err('bash: ' + e.message + '\n');
        this.status = 2;
        return { status: 2 };
      }
      this.steps = 0;
      try {
        this.status = this.execNode(ast, io);
      } catch (e) {
        if (e instanceof Flow) {
          if (e.kind === 'exit') return { status: e.code, exit: true };
          if (e.kind === 'return') this.status = e.code;
        } else if (e && e.limit) {
          io.err('\n[simulator] stopped: ' + e.message + '\n');
          this.status = 130;
        } else {
          io.err('bash: ' + (e && e.message ? e.message : e) + '\n');
          this.status = 1;
        }
      }
      return { status: this.status };
    }
    runSource(src, io, opts = {}) {
      let ast;
      try {
        ast = SIM.parse(src);
      } catch (e) {
        io.err((opts.name || 'bash') + ': ' + (e.incomplete ? 'syntax error: unexpected end of file' : e.message) + '\n');
        return 2;
      }
      try {
        return this.execNode(ast, io);
      } catch (e) {
        if (e instanceof Flow && e.kind === 'return' && opts.source) return e.code;
        throw e;
      }
    }
    tick() {
      if (++this.steps > 50000) {
        const e = new Error('too many steps (infinite loop?)');
        e.limit = true;
        throw e;
      }
    }
    execList(list, io) {
      let st = 0;
      for (const it of list.items) {
        if (it.bg) st = this.runBackground(it.node, io);
        else st = this.execNode(it.node, io);
        this.status = st;
      }
      return st;
    }
    runBackground(node, io) {
      const id = this.nextJob++;
      const pid = this.state.nextPid++;
      this.lastPid = pid;
      io.err(`[${id}] ${pid}\n`);
      const before = this.sleepAccum;
      const text = SIM.nodeText(node);
      const job = { id, pid, text, start: Date.now(), end: 0, done: false, user: this.username, ni: this.pendingNice || 0 };
      this.pendingNice = 0;
      this.jobs.push(job);
      let st = 0;
      try {
        st = this.subshell(() => this.execNode(node, io));
      } catch (e) {
        if (!(e instanceof Flow)) io.err('bash: ' + e.message + '\n');
      }
      const slept = this.sleepAccum - before;
      this.sleepAccum = before;
      job.end = Date.now() + slept * 1000;
      job.ni = job.ni || this.lastNice || 0;
      this.lastNice = 0;
      job.status = st;
      return 0;
    }
    reapJobs() {
      // returns notification lines for finished jobs
      const now = Date.now();
      const out = [];
      for (const j of this.jobs) {
        if (!j.done && !j.killed && j.end <= now) {
          j.done = true;
          out.push(`[${j.id}]+  ${j.status ? 'Exit ' + j.status : 'Done'}                    ${j.text}`);
        }
      }
      this.jobs = this.jobs.filter((j) => !j.done && !j.killed);
      if (!this.jobs.length) this.nextJob = 1;
      return out;
    }
    execNode(node, io) {
      this.tick();
      switch (node.type) {
        case 'list':
          return this.execList(node, io);
        case 'andor': {
          let st = this.execNode(node.first, io);
          for (const r of node.rest) {
            if (r.op === '&&' ? st === 0 : st !== 0) st = this.execNode(r.node, io);
          }
          return st;
        }
        case 'pipe':
          return this.execPipe(node, io);
        case 'cmd':
          return this.execCmd(node, io);
        case 'if':
          return this.withRedirs(node.redirs, io, (io2) => {
            for (const c of node.clauses) {
              if (this.execNode(c.cond, io2) === 0) return this.execNode(c.body, io2);
            }
            if (node.else) return this.execNode(node.else, io2);
            return 0;
          });
        case 'for':
          return this.withRedirs(node.redirs, io, (io2) => {
            const items = node.words ? this.expandWords(node.words) : this.positional.slice();
            let st = 0;
            for (const it of items) {
              this.setVar(node.var, it);
              try {
                st = this.execNode(node.body, io2);
              } catch (e) {
                if (e instanceof Flow && e.kind === 'break') {
                  if (e.n > 1) throw new Flow('break', e.n - 1);
                  break;
                }
                if (e instanceof Flow && e.kind === 'continue') {
                  if (e.n > 1) throw new Flow('continue', e.n - 1);
                  continue;
                }
                throw e;
              }
            }
            return st;
          });
        case 'while':
          return this.withRedirs(node.redirs, io, (io2) => {
            let st = 0;
            for (;;) {
              this.tick();
              const c = this.execNode(node.cond, io2);
              if (node.until ? c === 0 : c !== 0) break;
              try {
                st = this.execNode(node.body, io2);
              } catch (e) {
                if (e instanceof Flow && e.kind === 'break') {
                  if (e.n > 1) throw new Flow('break', e.n - 1);
                  break;
                }
                if (e instanceof Flow && e.kind === 'continue') {
                  if (e.n > 1) throw new Flow('continue', e.n - 1);
                  continue;
                }
                throw e;
              }
            }
            return st;
          });
        case 'case':
          return this.withRedirs(node.redirs, io, (io2) => {
            const w = this.expandString(node.word);
            for (const it of node.items) {
              for (const p of it.pats) {
                if (SIM.patMatch(w, this.expandPattern(p))) return this.execNode(it.body, io2);
              }
            }
            return 0;
          });
        case 'group':
          return this.withRedirs(node.redirs, io, (io2) => this.execNode(node.body, io2));
        case 'subshell':
          return this.withRedirs(node.redirs, io, (io2) => this.subshell(() => this.execNode(node.body, io2)));
        case 'func':
          this.funcs[node.name] = node.body;
          return 0;
      }
      return 0;
    }
    execPipe(node, io) {
      let input = io.stdin;
      let st = 0;
      const n = node.cmds.length;
      for (let i = 0; i < n; i++) {
        const last = i === n - 1;
        let buf = '';
        const out = last ? io.out : (s) => (buf += s);
        const err = node.cmds[i].stderrToPipe && !last ? (s) => (buf += s) : io.err;
        const io2 = { stdin: input, out, err, tty: io.tty };
        if (n > 1) st = this.subshell(() => this.execNode(node.cmds[i], io2));
        else st = this.execNode(node.cmds[i], io2);
        input = new Stream(buf);
      }
      if (node.neg) st = st === 0 ? 1 : 0;
      return st;
    }
    withRedirs(redirs, io, fn) {
      if (!redirs || !redirs.length) return fn(io);
      const io2 = Object.assign({}, io);
      for (const r of redirs) {
        const ok = this.applyRedir(r, io2, io);
        if (!ok) return 1;
      }
      return fn(io2);
    }
    applyRedir(r, io2, io) {
      const fs = this.fs;
      const errOut = io.err;
      if (r.op === 'dup') {
        if (r.to === '-') {
          if (r.fd === 1) io2.out = () => {};
          if (r.fd === 2) io2.err = () => {};
          return true;
        }
        const src = r.to === '1' ? io2.out : r.to === '2' ? io2.err : null;
        if (!src) {
          errOut(`bash: ${r.to}: Bad file descriptor\n`);
          return false;
        }
        if (r.fd === 1) io2.out = src;
        else if (r.fd === 2) io2.err = src;
        return true;
      }
      if (r.op === '<<') {
        const body = r.quoted ? r.body : this.expandWord(r.body, { heredoc: true, noSplit: true, noGlob: true }).join('');
        io2.stdin = new Stream(body);
        return true;
      }
      const targets = this.expandWords([r.target]);
      if (targets.length !== 1) {
        errOut(`bash: ${r.target}: ambiguous redirect\n`);
        return false;
      }
      const t = targets[0];
      if (r.op === '<<<') {
        io2.stdin = new Stream(t + '\n');
        return true;
      }
      if (r.op === '<' || r.op === '<>') {
        try {
          io2.stdin = new Stream(fs.readFile(t, this.cwd));
        } catch (e) {
          errOut(`bash: ${t}: ${e.message}\n`);
          return false;
        }
        return true;
      }
      // output redirections
      if (t === '/dev/stdout') {
        if (r.fd === 2) io2.err = io2.out;
        return true;
      }
      if (t === '/dev/stderr') {
        if (r.fd === 2) return true;
        io2.out = io2.err;
        return true;
      }
      const append = r.op === '>>' || r.op === '&>>';
      try {
        if (!append) {
          const ex = fs.tryLookup(t, this.cwd);
          if (ex && this.opts.C && r.op === '>' && ex.node.t === 'f') {
            errOut(`bash: ${t}: cannot overwrite existing file\n`);
            return false;
          }
          fs.writeFile(t, this.cwd, '');
        } else fs.writeFile(t, this.cwd, '', { append: true });
      } catch (e) {
        errOut(`bash: ${t}: ${e.message}\n`);
        return false;
      }
      const cwd = this.cwd;
      const writer = (s) => {
        try {
          fs.writeFile(t, cwd, s, { append: true });
        } catch (e) {
          /* */
        }
      };
      if (r.op === '&>' || r.op === '&>>') {
        io2.out = writer;
        io2.err = writer;
      } else if (r.fd === 2) io2.err = writer;
      else io2.out = writer;
      return true;
    }
    doAssign(a, opts) {
      const eq = a.indexOf('=');
      let name = a.slice(0, eq);
      let append = false;
      if (name.endsWith('+')) {
        name = name.slice(0, -1);
        append = true;
      }
      let val = this.expandWord(a.slice(eq + 1), { noSplit: true, noGlob: true, assign: true }).join('');
      if (append) val = (this.getVar(name) || '') + val;
      this.setVar(name, val, opts);
      return name;
    }
    execCmd(node, io, aliasDepth = 0) {
      // alias expansion
      if (node.words.length && aliasDepth < 5) {
        const w0 = node.words[0];
        if (this.aliases[w0] !== undefined && !(this._aliasing && this._aliasing.has(w0))) {
          const val = this.aliases[w0];
          let sub;
          try {
            sub = SIM.parse(val + (val.endsWith(' ') ? '' : ' ') + node.words.slice(1).join(' '));
          } catch (e) {
            sub = null;
          }
          if (sub && sub.items.length === 1 && sub.items[0].node.type === 'cmd' && !sub.items[0].bg) {
            const c = sub.items[0].node;
            const merged = { type: 'cmd', assigns: node.assigns.concat(c.assigns), words: c.words, redirs: c.redirs.concat(node.redirs) };
            this._aliasing = this._aliasing || new Set();
            this._aliasing.add(w0);
            try {
              return this.execCmd(merged, io, aliasDepth + 1);
            } finally {
              this._aliasing.delete(w0);
            }
          } else if (sub) {
            this._aliasing = this._aliasing || new Set();
            this._aliasing.add(w0);
            try {
              return this.withRedirs(node.redirs, io, (io2) => this.execNode(sub, io2));
            } finally {
              this._aliasing.delete(w0);
            }
          }
        }
      }
      this.curErr = io.err;
      let argv;
      try {
        argv = this.expandWords(node.words);
      } catch (e) {
        if (e instanceof Flow) throw e;
        io.err('bash: ' + e.message + '\n');
        return 1;
      }
      if (!argv.length) {
        // only assignments / redirections
        this.status = 0;
        let st = 0;
        try {
          for (const a of node.assigns) this.doAssign(a);
        } catch (e) {
          io.err('bash: ' + e.message + '\n');
          return 1;
        }
        st = this.status;
        if (node.redirs.length) return this.withRedirs(node.redirs, io, () => st);
        return st;
      }
      if (this.opts.x) io.err('+ ' + node.assigns.concat(argv.map((a) => (/\s/.test(a) ? `'${a}'` : a))).join(' ') + '\n');
      // temporary assignments
      const saved = [];
      try {
        for (const a of node.assigns) {
          const name = a.slice(0, a.indexOf('=')).replace(/\+$/, '');
          saved.push([name, this.vars[name], this.exported.has(name)]);
          this.doAssign(a, { export: true });
        }
      } catch (e) {
        io.err('bash: ' + e.message + '\n');
        return 1;
      }
      try {
        return this.withRedirs(node.redirs, io, (io2) => this.runArgv(argv, io2));
      } finally {
        for (const [name, v, ex] of saved) {
          if (v === undefined) delete this.vars[name];
          else this.vars[name] = v;
          if (!ex) this.exported.delete(name);
        }
      }
    }
    // find an executable in PATH
    which(name) {
      const path = (this.vars.PATH || '').split(':');
      for (const d of path) {
        if (!d) continue;
        const p = d.replace(/\/$/, '') + '/' + name;
        const r = this.fs.tryLookup(p, '/');
        if (r && r.node.t === 'f' && (r.node.mode & 0o111)) return p;
      }
      return null;
    }
    runArgv(argv, io) {
      const name = argv[0];
      const args = argv.slice(1);
      if (this.funcs[name] && !(this._noFunc)) return this.callFunc(name, args, io);
      if (SIM.builtins[name]) return this.callImpl(SIM.builtins[name], name, args, io);
      let path = null;
      if (name.indexOf('/') >= 0) path = name;
      else path = this.which(name);
      if (!path) {
        if (SIM.cmds[name] && SIM.sbin.has(name) && this.uid !== 0) {
          io.err(`bash: ${name}: command not found\n`);
          io.err(`\x1b[2m(hint: ${name} lives in /usr/sbin which is not in a normal user's PATH — try "sudo ${argv.join(' ')}")\x1b[0m\n`);
          return 127;
        }
        io.err(`${name}: command not found\n`);
        // the system directories are gone (e.g. after "rm -rf /*"): tell the user how to recover
        if (SIM.cmds[name] && !this.fs.tryLookup('/usr/bin/ls', '/')) {
          io.err('\x1b[33m(the system programs in /usr/bin were deleted — this is what rm -rf / does to a real machine. Type "reset-sandbox" to restore the factory filesystem.)\x1b[0m\n');
          return 127;
        }
        if (SIM.suggest) {
          const s = SIM.suggest(name);
          if (s) io.err(`\x1b[2m${s}\x1b[0m\n`);
        }
        return 127;
      }
      return this.execFile(path, name, args, io);
    }
    execFile(path, name, args, io) {
      let r;
      try {
        r = this.fs.lookup(path, this.cwd);
      } catch (e) {
        io.err(`bash: ${path}: ${e.message}\n`);
        return 127;
      }
      if (r.node.t === 'd') {
        io.err(`bash: ${path}: Is a directory\n`);
        return 126;
      }
      if (!this.fs.can(r.node, 1)) {
        io.err(`bash: ${path}: Permission denied\n`);
        return 126;
      }
      const data = r.node.data || '';
      if (data.startsWith(BIN_MARK)) {
        const impl = data.slice(BIN_MARK.length, data.indexOf('\n'));
        const fn = SIM.cmds[impl];
        if (fn) {
          // setuid binaries run as their owner (passwd, sudo ...)
          return this.callImpl(fn, name.split('/').pop(), args, io);
        }
      }
      if (data.startsWith('\x7fELF')) {
        io.err(`${name}: (simulated binary — no implementation in this trainer)\n`);
        return 0;
      }
      if (!this.fs.can(r.node, 4) && this.uid !== 0) {
        io.err(`bash: ${path}: Permission denied\n`);
        return 126;
      }
      return this.runScript(r.path, data, args, io);
    }
    runScript(path, data, args, io) {
      const first = data.split('\n')[0];
      if (first.startsWith('#!')) {
        const interp = first.slice(2).trim().split(/\s+/)[0];
        if (/python|perl|ruby|node/.test(interp)) {
          io.err(`${path}: interpreter ${interp} is not available in the simulator (only sh/bash scripts run)\n`);
          return 126;
        }
      }
      const save = { pos: this.positional, name: this.scriptName };
      this.positional = args.slice();
      this.scriptName = path;
      try {
        return this.subshell(() => {
          try {
            return this.runSource(data, io, { name: path });
          } catch (e) {
            if (e instanceof Flow && e.kind === 'return') return e.code;
            throw e;
          }
        });
      } finally {
        this.positional = save.pos;
        this.scriptName = save.name;
      }
    }
    callFunc(name, args, io) {
      const savePos = this.positional;
      this.positional = args.slice();
      this.localStack.push({});
      this.funcDepth = (this.funcDepth || 0) + 1;
      if (this.funcDepth > 100) {
        this.funcDepth--;
        io.err(`bash: ${name}: maximum function nesting level exceeded\n`);
        return 1;
      }
      try {
        return this.execNode(this.funcs[name], io);
      } catch (e) {
        if (e instanceof Flow && e.kind === 'return') return e.code;
        throw e;
      } finally {
        this.funcDepth--;
        this.positional = savePos;
        const locals = this.localStack.pop();
        for (const k of Object.keys(locals)) {
          if (locals[k] === undefined) delete this.vars[k];
          else this.vars[k] = locals[k];
        }
      }
    }
    callImpl(fn, name, args, io) {
      const sh = this;
      let stdinCache = null;
      const ctx = {
        sh,
        fs: this.fs,
        name,
        args,
        io,
        out: io.out,
        err: (s) => io.err(s),
        get stdin() {
          if (stdinCache === null) stdinCache = io.stdin ? (io.stdin.readAll ? io.stdin.readAll() : String(io.stdin)) : null;
          return stdinCache;
        },
        hasStdin: !!io.stdin,
        stream: io.stdin,
        cwd: this.cwd,
        fail(msg, code = 1) {
          io.err(`${name}: ${msg}\n`);
          return code;
        },
      };
      // generic --help from the condensed manual page
      if (args.length === 1 && args[0] === '--help' && SIM.man && SIM.man[name] && !SIM.builtins[name]) {
        const m = SIM.man[name];
        io.out(`Usage: ${m.s}\n${m.d.charAt(0).toUpperCase() + m.d.slice(1)}.\n\n${m.o.map((x) => '  ' + x).join('\n')}${m.o.length ? '\n' : ''}\nFull documentation: man ${name}\n`);
        return 0;
      }
      try {
        const r = fn(ctx);
        return typeof r === 'number' ? r : 0;
      } catch (e) {
        if (e instanceof Flow) throw e;
        if (e && e.limit) throw e;
        if (e && e.fs) {
          io.err(`${name}: ${e.path ? `'${e.path}': ` : ''}${e.message}\n`);
          return 1;
        }
        if (e && e.usage) {
          io.err(`${name}: ${e.message}\nTry '${name} --help' for more information.\n`);
          return 2;
        }
        io.err(`${name}: ${e && e.message ? e.message : e}\n`);
        if (typeof console !== 'undefined' && e && e.stack && !e.user) console.warn(e);
        return 1;
      }
    }
    // helper to run argv from within commands (sudo, xargs, nice ...)
    exec(argv, io) {
      return this.runArgv(argv, io);
    }
    // run a source string and capture output (used by labs/tests)
    capture(src) {
      let out = '';
      let err = '';
      const r = this.run(src, { stdin: null, out: (s) => (out += s), err: (s) => (err += s) });
      return { out, err, status: r.status };
    }
  }
  SIM.Shell = Shell;

  function findUnescaped(s, ch) {
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '\\') {
        i++;
        continue;
      }
      if (s[i] === ch) return i;
    }
    return -1;
  }

  SIM.nodeText = function nodeText(n) {
    if (!n) return '';
    switch (n.type) {
      case 'cmd':
        return n.assigns
          .concat(n.words)
          .concat(n.redirs.map((r) => (r.op === 'dup' ? `${r.fd}>&${r.to}` : (r.fd != null ? r.fd : '') + (r.op === '<<' ? '<<' + r.delim : r.op + ' ' + (r.target || '')))))
          .join(' ');
      case 'pipe':
        return (n.neg ? '! ' : '') + n.cmds.map(nodeText).join(' | ');
      case 'andor':
        return nodeText(n.first) + n.rest.map((r) => ` ${r.op} ${nodeText(r.node)}`).join('');
      case 'list':
        return n.items.map((i) => nodeText(i.node) + (i.bg ? ' &' : '')).join('; ');
      case 'subshell':
        return '( ' + nodeText(n.body) + ' )';
      case 'group':
        return '{ ' + nodeText(n.body) + '; }';
      default:
        return n.type + ' ...';
    }
  };

  /* ================= test / [ ================= */
  function testEval(args, sh, dbl) {
    let p = 0;
    const fs = sh.fs;
    const file = (f) => fs.tryLookup(f, sh.cwd, true);
    const UNARY = new Set(['-e', '-f', '-d', '-r', '-w', '-x', '-s', '-L', '-h', '-b', '-c', '-p', '-S', '-u', '-g', '-k', '-O', '-G', '-z', '-n', '-t', '-a']);
    const BIN = new Set(['=', '==', '!=', '<', '>', '-eq', '-ne', '-lt', '-le', '-gt', '-ge', '-nt', '-ot', '-ef', '=~']);
    const int = (v) => {
      if (!/^\s*-?\d+\s*$/.test(v)) {
        if (dbl) return arith(v || '0', sh);
        const e = new Error(`${v}: integer expression expected`);
        e.test = true;
        throw e;
      }
      return parseInt(v, 10);
    };
    function unary(op, a) {
      switch (op) {
        case '-z':
          return a === '';
        case '-n':
          return a !== '';
        case '-t':
          return a === '0' || a === '1';
      }
      const r = op === '-L' || op === '-h' ? fs.tryLookup(a, sh.cwd, false) : file(a);
      if (!r) return false;
      const n = r.node;
      switch (op) {
        case '-e':
        case '-a':
          return true;
        case '-f':
          return n.t === 'f';
        case '-d':
          return n.t === 'd';
        case '-L':
        case '-h':
          return n.t === 'l';
        case '-b':
          return n.t === 'b';
        case '-c':
          return n.t === 'c';
        case '-p':
          return n.t === 'p';
        case '-S':
          return n.t === 's';
        case '-r':
          return fs.can(n, 4);
        case '-w':
          return fs.can(n, 2);
        case '-x':
          return fs.can(n, 1);
        case '-s':
          return n.t === 'd' || SIM.byteLen(n.data) > 0;
        case '-u':
          return !!(n.mode & 0o4000);
        case '-g':
          return !!(n.mode & 0o2000);
        case '-k':
          return !!(n.mode & 0o1000);
        case '-O':
          return n.uid === sh.uid;
        case '-G':
          return n.gid === sh.fs.cred.gid;
      }
      return false;
    }
    function binary(a, op, b) {
      switch (op) {
        case '=':
        case '==':
          return dbl ? SIM.patMatch(a, b) : a === b;
        case '!=':
          return dbl ? !SIM.patMatch(a, b) : a !== b;
        case '<':
          return a < b;
        case '>':
          return a > b;
        case '=~':
          try {
            const m = new RegExp(b).exec(a);
            sh.vars.BASH_REMATCH = m ? m[0] : '';
            return !!m;
          } catch (e) {
            return false;
          }
        case '-eq':
          return int(a) === int(b);
        case '-ne':
          return int(a) !== int(b);
        case '-lt':
          return int(a) < int(b);
        case '-le':
          return int(a) <= int(b);
        case '-gt':
          return int(a) > int(b);
        case '-ge':
          return int(a) >= int(b);
        case '-nt':
        case '-ot': {
          const x = file(a);
          const y = file(b);
          if (op === '-nt') return !!x && (!y || x.node.mtime > y.node.mtime);
          return !!y && (!x || x.node.mtime < y.node.mtime);
        }
        case '-ef': {
          const x = file(a);
          const y = file(b);
          return !!x && !!y && x.ino === y.ino;
        }
      }
      return false;
    }
    const OR = dbl ? '||' : '-o';
    const AND = dbl ? '&&' : '-a';
    function expr() {
      let v = andE();
      while (args[p] === OR) {
        p++;
        const r = andE();
        v = v || r;
      }
      return v;
    }
    function andE() {
      let v = notE();
      while (args[p] === AND) {
        p++;
        const r = notE();
        v = v && r;
      }
      return v;
    }
    function notE() {
      if (args[p] === '!' && p + 1 < args.length) {
        p++;
        return !notE();
      }
      return prim();
    }
    function prim() {
      const a = args[p];
      if (a === undefined) return false;
      if (a === '(' ) {
        p++;
        const v = expr();
        if (args[p] === ')') p++;
        return v;
      }
      if (BIN.has(args[p + 1]) && p + 2 < args.length + 0 && args[p + 2] !== undefined) {
        const r = binary(args[p], args[p + 1], args[p + 2]);
        p += 3;
        return r;
      }
      if (UNARY.has(a) && args[p + 1] !== undefined && !(a === '-a' && p > 0)) {
        p += 2;
        return unary(a, args[p - 1]);
      }
      p++;
      return a !== '';
    }
    if (!args.length) return false;
    const v = expr();
    if (p < args.length) {
      const e = new Error(`${args[p]}: unexpected operator`);
      e.test = true;
      throw e;
    }
    return v;
  }
  SIM.testEval = testEval;
})(typeof window !== 'undefined' ? window : globalThis);
