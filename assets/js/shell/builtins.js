/* LPIC-1 Trainer — shell builtins (cd, export, read, test, alias, ...). */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});
  const Flow = SIM.Flow;

  /* option parser: spec "abn:" (":" = takes value), long {"all":"a","lines=":"n"} */
  SIM.getopt = function (args, spec, long = {}, opts = {}) {
    const o = {};
    const rest = [];
    const takes = new Set();
    const flags = new Set();
    for (let i = 0; i < spec.length; i++) {
      if (spec[i + 1] === ':') {
        takes.add(spec[i]);
        i++;
      } else flags.add(spec[i]);
    }
    const set = (k, v) => {
      if (opts.multi && opts.multi.indexOf(k) >= 0) (o[k] = o[k] || []).push(v);
      else if (v === true && o[k] && opts.count && opts.count.indexOf(k) >= 0) o[k] = (o[k] === true ? 1 : o[k]) + 1;
      else o[k] = v;
    };
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '--') {
        rest.push(...args.slice(i + 1));
        break;
      }
      if (a.startsWith('--') && a.length > 2) {
        const [k, v] = a.slice(2).split(/=(.*)/s);
        if (long[k + '='] !== undefined) {
          const val = v !== undefined ? v : args[++i];
          if (val === undefined) throw usage(`option '--${k}' requires an argument`);
          set(long[k + '='], val);
        } else if (long[k] !== undefined) set(long[k], v !== undefined ? v : true);
        else if (opts.loose) rest.push(a);
        else throw usage(`unrecognized option '--${k}'`);
        continue;
      }
      if (a.startsWith('-') && a.length > 1 && !(opts.numeric && /^-\d+$/.test(a))) {
        for (let j = 1; j < a.length; j++) {
          const c = a[j];
          if (takes.has(c)) {
            let val = a.slice(j + 1);
            if (!val) val = args[++i];
            if (val === undefined) throw usage(`option requires an argument -- '${c}'`);
            set(c, val);
            break;
          } else if (flags.has(c)) set(c, true);
          else if (opts.loose) {
            rest.push(a);
            break;
          } else throw usage(`invalid option -- '${c}'`);
        }
        continue;
      }
      if (opts.stopAtFirst) {
        rest.push(...args.slice(i));
        break;
      }
      rest.push(a);
    }
    return { o, rest };
  };
  function usage(msg) {
    const e = new Error(msg);
    e.usage = true;
    return e;
  }
  SIM.usage = usage;

  const B = (SIM.builtins = {});

  B.cd = (c) => {
    const sh = c.sh;
    let args = c.args.filter((a) => a !== '-L' && a !== '-P');
    const phys = c.args.indexOf('-P') >= 0;
    let target = args[0];
    if (target === undefined || target === '') target = sh.vars.HOME;
    if (target === '-') {
      target = sh.vars.OLDPWD || sh.cwd;
      c.out(target + '\n');
    }
    if (args.length > 1) return c.fail('too many arguments');
    let r;
    try {
      r = c.fs.lookup(target, sh.cwd, true);
    } catch (e) {
      c.err(`bash: cd: ${target}: ${e.message}\n`);
      return 1;
    }
    if (r.node.t !== 'd') {
      c.err(`bash: cd: ${target}: Not a directory\n`);
      return 1;
    }
    if (!c.fs.can(r.node, 1)) {
      c.err(`bash: cd: ${target}: Permission denied\n`);
      return 1;
    }
    sh.vars.OLDPWD = sh.cwd;
    sh.cwd = phys ? r.path : c.fs.normalize(target, sh.cwd);
    // logical path may traverse a symlink; ensure it resolves
    if (!c.fs.tryLookup(sh.cwd, '/')) sh.cwd = r.path;
    sh.vars.PWD = sh.cwd;
    return 0;
  };
  B.pwd = (c) => {
    if (c.args.indexOf('-P') >= 0) c.out(c.fs.lookup(c.sh.cwd, '/').path + '\n');
    else c.out(c.sh.cwd + '\n');
  };
  function echoEsc(s) {
    let stop = false;
    const r = s.replace(/\\(c|n|t|r|a|b|e|f|v|\\|0[0-7]{0,3}|x[0-9a-fA-F]{1,2})/g, (m, x) => {
      if (stop) return '';
      switch (x) {
        case 'c':
          stop = true;
          return '';
        case 'n':
          return '\n';
        case 't':
          return '\t';
        case 'r':
          return '\r';
        case 'a':
          return '\x07';
        case 'b':
          return '\b';
        case 'e':
          return '\x1b';
        case 'f':
          return '\f';
        case 'v':
          return '\v';
        case '\\':
          return '\\';
      }
      if (x[0] === 'x') return String.fromCharCode(parseInt(x.slice(1), 16));
      return String.fromCharCode(parseInt(x, 8));
    });
    return { s: r, stop };
  }
  B.echo = (c) => {
    let args = c.args.slice();
    let nl = true;
    let e = false;
    while (args.length && /^-[neE]+$/.test(args[0])) {
      const f = args.shift();
      if (f.indexOf('n') >= 0) nl = false;
      if (f.indexOf('e') >= 0) e = true;
      if (f.indexOf('E') >= 0) e = false;
    }
    let s = args.join(' ');
    if (e) {
      const r = echoEsc(s);
      s = r.s;
      if (r.stop) nl = false;
    }
    c.out(s + (nl ? '\n' : ''));
  };
  B.printf = (c) => {
    let args = c.args.slice();
    let varName = null;
    if (args[0] === '-v') {
      varName = args[1];
      args = args.slice(2);
    }
    if (!args.length) return c.fail('usage: printf [-v var] format [arguments]', 2);
    const fmt = args.shift();
    let out = '';
    let guard = 0;
    do {
      let used = 0;
      out += fmt.replace(/%(%|[-+ 0#]*\d*(?:\.\d+)?[sdiouxXfeEgGcb])|\\(n|t|r|\\|a|e|0[0-7]*|x[0-9a-fA-F]{1,2}|")/g, (m, spec, escp) => {
        if (escp !== undefined) return echoEsc('\\' + escp).s;
        if (spec === '%') return '%';
        const conv = spec[spec.length - 1];
        const flags = /^[-+ 0#]*/.exec(spec)[0];
        const wm = /(\d*)(?:\.(\d+))?[a-zA-Z]$/.exec(spec.slice(flags.length));
        const width = wm && wm[1] ? +wm[1] : 0;
        const prec = wm && wm[2] !== undefined ? +wm[2] : null;
        let a = args.length ? args.shift() : undefined;
        used++;
        let s;
        switch (conv) {
          case 's':
            s = a === undefined ? '' : a;
            if (prec !== null) s = s.slice(0, prec);
            break;
          case 'b':
            s = echoEsc(a || '').s;
            break;
          case 'c':
            s = (a || '')[0] || '';
            break;
          case 'd':
          case 'i': {
            let n = a === undefined || a === '' ? 0 : parseInt(a, /^0x/i.test(a) ? 16 : 10);
            if (isNaN(n)) {
              c.err(`printf: ${a}: invalid number\n`);
              n = 0;
            }
            s = String(Math.trunc(n));
            if (flags.indexOf('+') >= 0 && n >= 0) s = '+' + s;
            break;
          }
          case 'o':
            s = (parseInt(a || '0', 10) >>> 0).toString(8);
            break;
          case 'u':
            s = String(parseInt(a || '0', 10) >>> 0);
            break;
          case 'x':
            s = (parseInt(a || '0', 10) >>> 0).toString(16);
            break;
          case 'X':
            s = (parseInt(a || '0', 10) >>> 0).toString(16).toUpperCase();
            break;
          case 'f':
          case 'F':
            s = (parseFloat(a || '0') || 0).toFixed(prec === null ? 6 : prec);
            break;
          case 'e':
          case 'E':
            s = (parseFloat(a || '0') || 0).toExponential(prec === null ? 6 : prec).replace(/e([+-])(\d)$/, 'e$10$2');
            if (conv === 'E') s = s.toUpperCase();
            break;
          case 'g':
          case 'G':
            s = String(+(parseFloat(a || '0') || 0).toPrecision(prec || 6));
            break;
        }
        if (s.length < width) {
          if (flags.indexOf('-') >= 0) s = s.padEnd(width);
          else if (flags.indexOf('0') >= 0 && /[dioxXfeEgu]/.test(conv)) s = s.startsWith('-') ? '-' + s.slice(1).padStart(width - 1, '0') : s.padStart(width, '0');
          else s = s.padStart(width);
        }
        return s;
      });
      if (!used) break;
    } while (args.length && ++guard < 1000);
    if (varName) c.sh.setVar(varName, out);
    else c.out(out);
  };
  function declareLike(c, mode) {
    const sh = c.sh;
    let args = c.args.slice();
    let flags = '';
    while (args.length && /^[-+][a-zA-Z]+$/.test(args[0])) flags += args.shift();
    if (mode === 'export' && (!args.length || flags.indexOf('p') >= 0)) {
      for (const k of [...sh.exported].sort()) if (sh.vars[k] !== undefined) c.out(`declare -x ${k}="${sh.vars[k]}"\n`);
      return 0;
    }
    if (mode === 'readonly' && !args.length) {
      for (const k of [...sh.readonly].sort()) c.out(`declare -r ${k}="${sh.vars[k] || ''}"\n`);
      return 0;
    }
    if (mode === 'declare' && !args.length) {
      if (flags.indexOf('f') >= 0) {
        for (const f of Object.keys(sh.funcs).sort()) c.out(`${f} () \n{\n    ${SIM.nodeText(sh.funcs[f].body || sh.funcs[f])}\n}\n`);
        return 0;
      }
      if (flags.indexOf('x') >= 0) return declareLike({ ...c, args: [] }, 'export');
      for (const k of Object.keys(sh.vars).sort()) c.out(`${k}=${quoteVal(sh.vars[k])}\n`);
      return 0;
    }
    let st = 0;
    for (const a of args) {
      const eq = a.indexOf('=');
      const name = eq >= 0 ? a.slice(0, eq) : a;
      if (!/^[A-Za-z_]\w*$/.test(name)) {
        c.err(`bash: ${mode}: \`${a}': not a valid identifier\n`);
        st = 1;
        continue;
      }
      try {
        if (mode === 'export' && flags.indexOf('n') >= 0) {
          sh.exported.delete(name);
          continue;
        }
        if (mode === 'local') {
          if (!sh.localStack.length) {
            c.err('bash: local: can only be used in a function\n');
            return 1;
          }
          const top = sh.localStack[sh.localStack.length - 1];
          if (!(name in top)) top[name] = sh.vars[name];
          sh.vars[name] = eq >= 0 ? a.slice(eq + 1) : '';
          continue;
        }
        if (eq >= 0) sh.setVar(name, a.slice(eq + 1));
        if (mode === 'export' || flags.indexOf('x') >= 0) sh.exported.add(name);
        if (mode === 'readonly' || flags.indexOf('r') >= 0) sh.readonly.add(name);
        if (flags.indexOf('i') >= 0 && eq >= 0) sh.vars[name] = String(SIM.arith(a.slice(eq + 1), sh));
        if (eq < 0 && sh.vars[name] === undefined && mode !== 'export') sh.vars[name] = '';
      } catch (e) {
        c.err('bash: ' + e.message + '\n');
        st = 1;
      }
    }
    return st;
  }
  function quoteVal(v) {
    if (v === undefined) return "''";
    if (/^[\w@%+=:,./-]*$/.test(v) && v !== '') return v;
    return "'" + v.replace(/'/g, "'\\''") + "'";
  }
  B.export = (c) => declareLike(c, 'export');
  B.readonly = (c) => declareLike(c, 'readonly');
  B.declare = (c) => declareLike(c, 'declare');
  B.typeset = B.declare;
  B.local = (c) => declareLike(c, 'local');
  B.unset = (c) => {
    const { o, rest } = SIM.getopt(c.args, 'vf');
    for (const n of rest) {
      try {
        if (o.f) delete c.sh.funcs[n];
        else if (c.sh.vars[n] === undefined && c.sh.funcs[n] && !o.v) delete c.sh.funcs[n];
        else c.sh.unsetVar(n);
      } catch (e) {
        c.err('bash: ' + e.message + '\n');
        return 1;
      }
    }
  };
  B.set = (c) => {
    const sh = c.sh;
    if (!c.args.length) {
      for (const k of Object.keys(sh.vars).sort()) c.out(`${k}=${quoteVal(sh.vars[k])}\n`);
      for (const f of Object.keys(sh.funcs).sort()) c.out(`${f} () \n{ \n    ${SIM.nodeText(sh.funcs[f].body || sh.funcs[f])}\n}\n`);
      return 0;
    }
    const args = c.args.slice();
    const map = { xtrace: 'x', errexit: 'e', noclobber: 'C', nounset: 'u' };
    while (args.length) {
      const a = args[0];
      if (a === '--') {
        args.shift();
        sh.positional = args.slice();
        return 0;
      }
      if (a === '-o' || a === '+o') {
        args.shift();
        const name = args.shift();
        if (!name) {
          for (const [k, v] of Object.entries(map)) c.out(`${k.padEnd(15)}\t${sh.opts[v] ? 'on' : 'off'}\n`);
          for (const k of ['emacs', 'history', 'monitor', 'vi']) c.out(`${k.padEnd(15)}\t${k === 'vi' ? (sh.opts.vi ? 'on' : 'off') : 'on'}\n`);
          return 0;
        }
        if (name === 'vi' || name === 'emacs') sh.opts.vi = name === 'vi' && a === '-o';
        else if (map[name]) sh.opts[map[name]] = a === '-o';
        continue;
      }
      if (/^[-+][a-zA-Z]+$/.test(a)) {
        args.shift();
        for (const ch of a.slice(1)) sh.opts[ch] = a[0] === '-';
        continue;
      }
      break;
    }
    if (args.length) sh.positional = args.slice();
    return 0;
  };
  B.shopt = (c) => {
    if (!c.args.length) {
      ['autocd', 'cdspell', 'checkwinsize', 'dotglob', 'extglob', 'histappend', 'nocaseglob'].forEach((o) =>
        c.out(`${o.padEnd(16)}\t${o === 'checkwinsize' || o === 'histappend' ? 'on' : 'off'}\n`)
      );
    }
  };
  B.alias = (c) => {
    const sh = c.sh;
    const args = c.args.filter((a) => a !== '-p');
    if (!args.length) {
      for (const k of Object.keys(sh.aliases).sort()) c.out(`alias ${k}='${sh.aliases[k].replace(/'/g, "'\\''")}'\n`);
      return 0;
    }
    let st = 0;
    for (const a of args) {
      const eq = a.indexOf('=');
      if (eq < 0) {
        if (sh.aliases[a] !== undefined) c.out(`alias ${a}='${sh.aliases[a]}'\n`);
        else {
          c.err(`bash: alias: ${a}: not found\n`);
          st = 1;
        }
      } else sh.aliases[a.slice(0, eq)] = a.slice(eq + 1);
    }
    return st;
  };
  B.unalias = (c) => {
    if (c.args[0] === '-a') {
      c.sh.aliases = {};
      return 0;
    }
    let st = 0;
    for (const a of c.args) {
      if (c.sh.aliases[a] === undefined) {
        c.err(`bash: unalias: ${a}: not found\n`);
        st = 1;
      } else delete c.sh.aliases[a];
    }
    return st;
  };
  const KEYWORDS = new Set(['if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'select', 'while', 'until', 'do', 'done', 'in', 'function', 'time', '{', '}', '!', '[[', ']]']);
  B.type = (c) => {
    const { o, rest } = SIM.getopt(c.args, 'atpP');
    let st = 0;
    for (const n of rest) {
      const sh = c.sh;
      const found = [];
      if (sh.aliases[n] !== undefined) found.push(['alias', `${n} is aliased to \`${sh.aliases[n]}'`]);
      if (KEYWORDS.has(n)) found.push(['keyword', `${n} is a shell keyword`]);
      if (sh.funcs[n]) found.push(['function', `${n} is a function`]);
      if (SIM.builtins[n]) found.push(['builtin', `${n} is a shell builtin`]);
      for (const d of (sh.vars.PATH || '').split(':')) {
        const p = d + '/' + n;
        const r = sh.fs.tryLookup(p, '/');
        if (r && r.node.t === 'f' && r.node.mode & 0o111) {
          found.push(['file', `${n} is ${p}`, p]);
          if (!o.a) break;
        }
      }
      if (!found.length) {
        if (!o.t) c.err(`bash: type: ${n}: not found\n`);
        st = 1;
        continue;
      }
      const list = o.a ? found : [found[0]];
      for (const f of list) {
        if (o.t) c.out(f[0] + '\n');
        else if (o.p || o.P) {
          if (f[2]) c.out(f[2] + '\n');
        } else c.out(f[1] + '\n');
      }
    }
    return st;
  };
  B.command = (c) => {
    const args = c.args.slice();
    if (args[0] === '-v' || args[0] === '-V') {
      const n = args[1];
      const sh = c.sh;
      if (sh.aliases[n] !== undefined) c.out(args[0] === '-v' ? `alias ${n}='${sh.aliases[n]}'\n` : `${n} is aliased to \`${sh.aliases[n]}'\n`);
      else if (SIM.builtins[n] || sh.funcs[n]) c.out(args[0] === '-v' ? n + '\n' : `${n} is a shell builtin\n`);
      else {
        const p = sh.which(n);
        if (!p) return 1;
        c.out(args[0] === '-v' ? p + '\n' : `${n} is ${p}\n`);
      }
      return 0;
    }
    if (!args.length) return 0;
    c.sh._noFunc = true;
    try {
      return c.sh.runArgv(args, c.io);
    } finally {
      c.sh._noFunc = false;
    }
  };
  B.builtin = (c) => {
    const n = c.args[0];
    if (!SIM.builtins[n]) return c.fail(`${n}: not a shell builtin`);
    return c.sh.callImpl(SIM.builtins[n], n, c.args.slice(1), c.io);
  };
  B.source = (c) => {
    const f = c.args[0];
    if (!f) return c.fail('filename argument required', 2);
    const sh = c.sh;
    let path = f;
    if (f.indexOf('/') < 0 && !sh.fs.exists(f, sh.cwd)) {
      const w = (sh.vars.PATH || '').split(':').map((d) => d + '/' + f).find((p) => sh.fs.exists(p));
      if (w) path = w;
    }
    let data;
    try {
      data = sh.fs.readFile(path, sh.cwd);
    } catch (e) {
      c.err(`bash: ${f}: ${e.message}\n`);
      return 1;
    }
    const savePos = sh.positional;
    if (c.args.length > 1) sh.positional = c.args.slice(1);
    try {
      return sh.runSource(data, c.io, { source: true, name: f });
    } finally {
      if (c.args.length > 1) sh.positional = savePos;
    }
  };
  B['.'] = B.source;
  B.exit = (c) => {
    const code = c.args[0] !== undefined ? parseInt(c.args[0], 10) & 255 : c.sh.status;
    throw new Flow('exit', 1, isNaN(code) ? 2 : code);
  };
  B.logout = B.exit;
  B.return = (c) => {
    const code = c.args[0] !== undefined ? parseInt(c.args[0], 10) & 255 : c.sh.status;
    throw new Flow('return', 1, code);
  };
  B.break = (c) => {
    throw new Flow('break', parseInt(c.args[0] || '1', 10));
  };
  B.continue = (c) => {
    throw new Flow('continue', parseInt(c.args[0] || '1', 10));
  };
  B.shift = (c) => {
    const n = parseInt(c.args[0] || '1', 10);
    if (n > c.sh.positional.length) return 1;
    c.sh.positional = c.sh.positional.slice(n);
  };
  B.true = () => 0;
  B.false = () => 1;
  B[':'] = () => 0;
  B.read = (c) => {
    const { o, rest } = SIM.getopt(c.args, 'rsp:t:n:d:a:u:e');
    const sh = c.sh;
    let line = null;
    const st = c.io.stdin;
    if (st && st.readLine) {
      if (o.n) {
        const s = st.readAll();
        line = s.slice(0, +o.n);
        st.data = s.slice(+o.n);
        st.pos = 0;
      } else line = st.readLine();
      // join continuation lines unless -r
      while (!o.r && line !== null && /\\$/.test(line)) {
        const nx = st.readLine();
        line = line.slice(0, -1) + (nx || '');
        if (nx === null) break;
      }
    } else if (sh.promptFn) {
      if (o.p) c.err(o.p);
      line = sh.promptFn(o.p || (rest.length ? rest.join(' ') + ':' : 'input:'), o.s);
      if (line !== null && !o.s && sh.onEvent) sh.onEvent('echoInput', line);
    }
    if (line === null) return 1;
    if (!o.r) line = line.replace(/\\(.)/g, '$1');
    const names = rest.length ? rest : ['REPLY'];
    if (o.a) {
      sh.setVar(o.a, line.trim().split(/\s+/).join(' '));
      return 0;
    }
    if (!rest.length) {
      sh.setVar('REPLY', line);
      return 0;
    }
    const ifs = sh.vars.IFS === undefined ? ' \t\n' : sh.vars.IFS;
    const wsIfs = ifs.replace(/[^ \t\n]/g, '');
    let s = wsIfs ? line.replace(new RegExp('^[' + SIM.reEsc(wsIfs) + ']+|[' + SIM.reEsc(wsIfs) + ']+$', 'g'), '') : line;
    const sep = new RegExp('[' + SIM.reEsc(ifs) + ']' + (wsIfs === ifs ? '+' : ''));
    for (let i = 0; i < names.length; i++) {
      if (i === names.length - 1) {
        sh.setVar(names[i], s);
        break;
      }
      const m = sep.exec(s);
      if (!m) {
        sh.setVar(names[i], s);
        s = '';
        continue;
      }
      sh.setVar(names[i], s.slice(0, m.index));
      s = s.slice(m.index + m[0].length);
    }
    return 0;
  };
  B.test = (c) => {
    try {
      return SIM.testEval(c.args, c.sh, false) ? 0 : 1;
    } catch (e) {
      c.err(`bash: test: ${e.message}\n`);
      return 2;
    }
  };
  B['['] = (c) => {
    if (c.args[c.args.length - 1] !== ']') {
      c.err("bash: [: missing `]'\n");
      return 2;
    }
    try {
      return SIM.testEval(c.args.slice(0, -1), c.sh, false) ? 0 : 1;
    } catch (e) {
      c.err(`bash: [: ${e.message}\n`);
      return 2;
    }
  };
  B['[['] = (c) => {
    if (c.args[c.args.length - 1] !== ']]') {
      c.err("bash: syntax error: missing `]]'\n");
      return 2;
    }
    try {
      return SIM.testEval(c.args.slice(0, -1), c.sh, true) ? 0 : 1;
    } catch (e) {
      c.err(`bash: ${e.message}\n`);
      return 2;
    }
  };
  B.let = (c) => {
    let v = 0;
    try {
      for (const a of c.args) v = SIM.arith(a, c.sh);
    } catch (e) {
      c.err('bash: let: ' + e.message + '\n');
      return 1;
    }
    return v ? 0 : 1;
  };
  B.eval = (c) => c.sh.runSource(c.args.join(' '), c.io);
  B.exec = (c) => {
    if (!c.args.length) return 0;
    const st = c.sh.runArgv(c.args, c.io);
    if (c.sh.userStack.length) throw new Flow('exit', 1, st);
    return st;
  };
  B.umask = (c) => {
    const fs = c.fs;
    const args = c.args.slice();
    const S = args[0] === '-S';
    if (S) args.shift();
    if (!args.length) {
      if (S) {
        const m = ~fs.umask & 0o777;
        const part = (sh) => ['r', 'w', 'x'].filter((x, i) => m & (4 >> i) << sh).join('');
        c.out(`u=${part(6)},g=${part(3)},o=${part(0)}\n`);
      } else c.out(fs.umask.toString(8).padStart(4, '0') + '\n');
      return 0;
    }
    const v = args[0];
    if (/^[0-7]{1,4}$/.test(v)) fs.umask = parseInt(v, 8) & 0o777;
    else {
      // symbolic: u=rwx,g=rx,o=
      let allowed = ~fs.umask & 0o777;
      for (const part of v.split(',')) {
        const m = /^([ugoa]*)([=+-])([rwx]*)$/.exec(part);
        if (!m) return c.fail(`${v}: invalid symbolic mode operator`);
        const who = m[1] || 'a';
        let bits = 0;
        for (const p of m[3]) bits |= { r: 4, w: 2, x: 1 }[p];
        for (const w of who === 'a' ? 'ugo' : who) {
          const sh = { u: 6, g: 3, o: 0 }[w];
          if (m[2] === '=') allowed = (allowed & ~(7 << sh)) | (bits << sh);
          else if (m[2] === '+') allowed |= bits << sh;
          else allowed &= ~(bits << sh);
        }
      }
      fs.umask = ~allowed & 0o777;
    }
    return 0;
  };
  B.jobs = (c) => {
    const sh = c.sh;
    const l = c.args.indexOf('-l') >= 0;
    const p = c.args.indexOf('-p') >= 0;
    const now = Date.now();
    sh.jobs.forEach((j, idx) => {
      const state = j.stopped ? 'Stopped' : j.end > now ? 'Running' : 'Done';
      const mark = idx === sh.jobs.length - 1 ? '+' : idx === sh.jobs.length - 2 ? '-' : ' ';
      if (p) c.out(j.pid + '\n');
      else c.out(`[${j.id}]${mark}  ${l ? j.pid + ' ' : ''}${state.padEnd(22)}${j.text}${state === 'Running' ? ' &' : ''}\n`);
    });
  };
  function jobArg(sh, a) {
    if (!sh.jobs.length) return null;
    if (!a || a === '%%' || a === '%+' || a === '%') return sh.jobs[sh.jobs.length - 1];
    if (a === '%-') return sh.jobs[sh.jobs.length - 2] || null;
    const m = /^%(\d+)$/.exec(a);
    if (m) return sh.jobs.find((j) => j.id === +m[1]) || null;
    if (a.startsWith('%')) return sh.jobs.find((j) => j.text.startsWith(a.slice(1))) || null;
    return sh.jobs.find((j) => j.pid === +a) || null;
  }
  SIM.jobArg = jobArg;
  B.fg = (c) => {
    const j = jobArg(c.sh, c.args[0]);
    if (!j) return c.fail(`${c.args[0] || 'current'}: no such job`);
    c.out(j.text + '\n');
    c.out('\x1b[2m(simulated: the job runs in the foreground and finishes)\x1b[0m\n');
    j.done = true;
    c.sh.jobs = c.sh.jobs.filter((x) => x !== j);
    return 0;
  };
  B.bg = (c) => {
    const j = jobArg(c.sh, c.args[0]);
    if (!j) return c.fail(`${c.args[0] || 'current'}: no such job`);
    j.stopped = false;
    if (j.end < Date.now()) j.end = Date.now() + 60000;
    c.out(`[${j.id}]+ ${j.text} &\n`);
  };
  B.wait = (c) => {
    for (const j of c.sh.jobs) j.end = 0;
  };
  B.disown = (c) => {
    const j = jobArg(c.sh, c.args.filter((a) => a !== '-h')[0]);
    if (j) {
      c.sh.jobs = c.sh.jobs.filter((x) => x !== j);
      c.sh.state.procs.push({ pid: j.pid, ppid: 1, user: j.user, cmd: j.text, ni: j.ni, stat: 'S', tty: '?', cpu: 0.5, mem: 0.1, vsz: 8000, rss: 1200, start: new Date().toTimeString().slice(0, 5) });
    }
  };
  B.history = (c) => {
    const sh = c.sh;
    if (c.args[0] === '-c') {
      sh.history = [];
      return 0;
    }
    if (c.args[0] === '-d') {
      sh.history.splice(+c.args[1] - 1, 1);
      return 0;
    }
    if (c.args[0] === '-w') {
      try {
        sh.fs.writeFile(sh.vars.HOME + '/.bash_history', '/', sh.history.join('\n') + '\n');
      } catch (e) {
        /* */
      }
      return 0;
    }
    let list = sh.history.map((h, i) => [i + 1, h]);
    if (/^\d+$/.test(c.args[0] || '')) list = list.slice(-+c.args[0]);
    for (const [i, h] of list) c.out(String(i).padStart(5) + '  ' + h + '\n');
  };
  B.fc = (c) => {
    if (c.args[0] === '-l') {
      const h = c.sh.history;
      h.slice(-16).forEach((x, i) => c.out(`${h.length - Math.min(16, h.length) + i + 1}\t ${x}\n`));
      return 0;
    }
    c.out('\x1b[2m(fc would open the last command in $EDITOR — use history / !n in the simulator)\x1b[0m\n');
  };
  B.hash = (c) => {
    if (c.args[0] === '-r') return 0;
    c.out('hits\tcommand\n');
    const seen = new Set();
    for (const h of c.sh.history.slice(-30)) {
      const w = h.split(/\s+/)[0];
      const p = c.sh.which(w);
      if (p && !seen.has(p)) {
        seen.add(p);
        c.out(`   1\t${p}\n`);
      }
    }
  };
  B.pushd = (c) => {
    const sh = c.sh;
    const target = c.args[0];
    if (!target) {
      if (!sh.dirStack.length) return c.fail('no other directory');
      const t = sh.dirStack.shift();
      sh.dirStack.unshift(sh.cwd);
      B.cd({ ...c, args: [t], out: () => {} });
    } else {
      const old = sh.cwd;
      const st = B.cd({ ...c, args: [target] });
      if (st) return st;
      sh.dirStack.unshift(old);
    }
    return B.dirs({ ...c, args: [] });
  };
  B.popd = (c) => {
    const sh = c.sh;
    if (!sh.dirStack.length) return c.fail('directory stack empty');
    const t = sh.dirStack.shift();
    B.cd({ ...c, args: [t] });
    return B.dirs({ ...c, args: [] });
  };
  B.dirs = (c) => {
    const sh = c.sh;
    const home = sh.vars.HOME;
    const t = (p) => (home && p.startsWith(home) ? '~' + p.slice(home.length) : p);
    if (c.args[0] === '-v') [sh.cwd, ...sh.dirStack].forEach((d, i) => c.out(` ${i}  ${t(d)}\n`));
    else if (c.args[0] === '-c') sh.dirStack = [];
    else c.out([sh.cwd, ...sh.dirStack].map(t).join(' ') + '\n');
  };
  B.trap = (c) => {
    if (!c.args.length || c.args[0] === '-p') {
      for (const [s, a] of Object.entries(c.sh.traps)) c.out(`trap -- '${a}' ${s}\n`);
      return 0;
    }
    if (c.args[0] === '-l') return SIM.cmds.kill({ ...c, args: ['-l'] });
    const action = c.args[0];
    for (const s of c.args.slice(1)) c.sh.traps[s.replace(/^SIG/, '')] = action;
  };
  B.ulimit = (c) => {
    if (c.args[0] === '-a') {
      c.out(`real-time non-blocking time  (microseconds, -R) unlimited
core file size              (blocks, -c) 0
data seg size               (kbytes, -d) unlimited
scheduling priority                 (-e) 0
file size                   (blocks, -f) unlimited
pending signals                     (-i) 15421
max locked memory           (kbytes, -l) 500296
max memory size             (kbytes, -m) unlimited
open files                          (-n) 1024
pipe size                (512 bytes, -p) 8
POSIX message queues         (bytes, -q) 819200
real-time priority                  (-r) 0
stack size                  (kbytes, -s) 8192
cpu time                   (seconds, -t) unlimited
max user processes                  (-u) 15421
virtual memory              (kbytes, -v) unlimited
file locks                          (-x) unlimited
`);
      return 0;
    }
    const m = { '-n': '1024', '-u': '15421', '-c': '0', '-s': '8192', '-f': 'unlimited', '-v': 'unlimited' };
    const flag = c.args.find((a) => a.startsWith('-')) || '-f';
    const val = c.args.find((a) => !a.startsWith('-'));
    if (val) {
      c.sh.ulimits = c.sh.ulimits || {};
      c.sh.ulimits[flag] = val;
      return 0;
    }
    c.out(((c.sh.ulimits && c.sh.ulimits[flag]) || m[flag] || 'unlimited') + '\n');
  };
  B.times = (c) => c.out('0m0.012s 0m0.004s\n0m0.380s 0m0.120s\n');
  B.enable = (c) => {
    for (const k of Object.keys(SIM.builtins).sort()) c.out('enable ' + k + '\n');
  };
  B.help = (c) => {
    if (c.args[0] && SIM.man && SIM.man[c.args[0]]) {
      c.out(SIM.man[c.args[0]].s + '\n    ' + SIM.man[c.args[0]].d + '\n');
      return 0;
    }
    c.out(`\x1b[1mLPIC-1 Trainer shell\x1b[0m — a bash-like simulator running entirely in your browser.

  Supports: pipes |, redirects > >> < 2> 2>&1 &> <<EOF <<<, && ||, ; &,
  variables, $(cmd), \`cmd\`, $((math)), globs * ? [..], brace {a,b} {1..5},
  quotes, aliases, functions, if/for/while/until/case, test/[ ]/[[ ]],
  scripts with #!/bin/bash, job control (sleep 100 &, jobs, kill %1).

  Useful:  man <cmd>     manual page (simulated, LPIC-focused)
           apropos <kw>  search manual descriptions
           compgen -c    list every available command
           sudo -i       become root      exit   leave root shell
           vi <file>     open the vi/vim simulator     nano <file>
           reset-sandbox restore the factory filesystem

  Builtins: ${Object.keys(SIM.builtins).sort().join(' ')}
`);
  };
  B.compgen = (c) => {
    if (c.args[0] === '-c') {
      const all = new Set([...Object.keys(SIM.builtins), ...Object.keys(SIM.cmds), ...Object.keys(c.sh.aliases), ...Object.keys(c.sh.funcs)]);
      [...all].sort().forEach((x) => c.out(x + '\n'));
    } else if (c.args[0] === '-a') Object.keys(c.sh.aliases).sort().forEach((x) => c.out(x + '\n'));
    else if (c.args[0] === '-b') Object.keys(SIM.builtins).sort().forEach((x) => c.out(x + '\n'));
    else if (c.args[0] === '-v') Object.keys(c.sh.vars).sort().forEach((x) => c.out(x + '\n'));
    return 0;
  };
  B.kill = (c) => SIM.cmds.kill(c);
  B.getopts = (c) => {
    const sh = c.sh;
    const [optstring, name] = c.args;
    const args = c.args.length > 2 ? c.args.slice(2) : sh.positional;
    let ind = parseInt(sh.vars.OPTIND || '1', 10);
    sh._optpos = sh._optpos || 1;
    const a = args[ind - 1];
    if (!a || a === '--' || a[0] !== '-' || a === '-') {
      if (a === '--') sh.vars.OPTIND = String(ind + 1);
      sh.setVar(name, '?');
      return 1;
    }
    const ch = a[sh._optpos];
    const idx = optstring.indexOf(ch);
    const next = () => {
      sh._optpos++;
      if (sh._optpos >= a.length) {
        sh._optpos = 1;
        ind++;
      }
    };
    if (idx < 0 || ch === ':') {
      if (optstring[0] !== ':') c.err(`${sh.scriptName || 'bash'}: illegal option -- ${ch}\n`);
      sh.setVar(name, '?');
      next();
      sh.vars.OPTIND = String(ind);
      return 0;
    }
    sh.setVar(name, ch);
    if (optstring[idx + 1] === ':') {
      if (sh._optpos + 1 < a.length) sh.setVar('OPTARG', a.slice(sh._optpos + 1));
      else {
        sh.setVar('OPTARG', args[ind] || '');
        ind++;
      }
      sh._optpos = 1;
      ind++;
    } else next();
    sh.vars.OPTIND = String(ind);
    return 0;
  };
})(typeof window !== 'undefined' ? window : globalThis);
