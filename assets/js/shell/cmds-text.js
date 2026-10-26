/* LPIC-1 Trainer — text processing commands (103.2 / 103.7). */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});
  const C = (SIM.cmds = SIM.cmds || {});
  const getopt = SIM.getopt;

  /* ---------- helpers ---------- */
  function readInputs(c, files, opts = {}) {
    const list = files.length ? files : ['-'];
    const res = [];
    for (const f of list) {
      if (f === '-') {
        res.push({ name: opts.stdinName || '(standard input)', data: c.stdin === null ? '' : c.stdin });
        continue;
      }
      try {
        const r = c.fs.lookup(f, c.sh.cwd);
        if (r.node.t === 'd') {
          c.err(`${c.name}: ${f}: Is a directory\n`);
          c.st = 1;
          continue;
        }
        res.push({ name: f, data: c.fs.readFile(f, c.sh.cwd) });
      } catch (e) {
        c.err(`${c.name}: ${f}: ${e.message}\n`);
        c.st = 1;
      }
    }
    return res;
  }
  SIM.readInputs = readInputs;
  const lines = (s) => {
    if (!s) return [];
    const l = s.split('\n');
    if (l[l.length - 1] === '') l.pop();
    return l;
  };
  SIM.lines = lines;
  const joinLines = (l) => (l.length ? l.join('\n') + '\n' : '');

  /* ---------- POSIX BRE/ERE -> JS RegExp ---------- */
  SIM.toJsRegex = function (pat, ere) {
    let r = '';
    let i = 0;
    const n = pat.length;
    let atStart = true;
    while (i < n) {
      const c = pat[i];
      if (c === '[') {
        // bracket expression
        let j = i + 1;
        let cls = '[';
        if (pat[j] === '^') {
          cls += '^';
          j++;
        }
        if (pat[j] === ']') {
          cls += '\\]';
          j++;
        }
        while (j < n && pat[j] !== ']') {
          if (pat[j] === '[' && pat[j + 1] === ':') {
            const e = pat.indexOf(':]', j + 2);
            if (e > 0) {
              cls += SIM.PCLASS[pat.slice(j + 2, e)] || '';
              j = e + 2;
              continue;
            }
          }
          if (pat[j] === '\\') cls += '\\\\';
          else if (pat[j] === '[') cls += '\\[';
          else cls += pat[j];
          j++;
        }
        if (j >= n) throw new Error('Unmatched [, [^, [:, [., or [=');
        r += cls + ']';
        i = j + 1;
        atStart = false;
        continue;
      }
      if (c === '\\') {
        const d = pat[i + 1];
        i += 2;
        if (d === undefined) throw new Error('Trailing backslash');
        if (!ere && '(){}|+?'.indexOf(d) >= 0) {
          r += d;
          atStart = d === '(' || d === '|';
          continue;
        }
        if (d === '<' || d === '>') {
          r += '\\b';
          continue;
        }
        if (d === '`') {
          r += '^';
          continue;
        }
        if (d === "'") {
          r += '$';
          continue;
        }
        if (/[1-9wWsSbB.*\[\]^$\\/]/.test(d)) r += '\\' + d;
        else if (d === 'n') r += '\\n';
        else if (d === 't') r += '\\t';
        else r += SIM.reEsc(d);
        atStart = false;
        continue;
      }
      if (!ere && '(){}|+?'.indexOf(c) >= 0) {
        r += '\\' + c;
        i++;
        atStart = false;
        continue;
      }
      if (c === '*' && atStart) {
        r += '\\*';
        i++;
        atStart = false;
        continue;
      }
      if (ere && c === '{' && !/^\{\d*(,\d*)?\}/.test(pat.slice(i))) {
        r += '\\{';
        i++;
        continue;
      }
      if (c === '/') {
        r += '\\/';
        i++;
        continue;
      }
      r += c;
      atStart = c === '^' && r.length === 1 ? true : c === '(' || c === '|';
      i++;
    }
    return r;
  };
  function mkRegex(pat, opts = {}) {
    let src;
    if (opts.fixed) src = SIM.reEsc(pat);
    else src = SIM.toJsRegex(pat, opts.ere);
    if (opts.word) src = '(?<![\\w])(?:' + src + ')(?![\\w])';
    if (opts.line) src = '^(?:' + src + ')$';
    return new RegExp(src, (opts.icase ? 'i' : '') + (opts.g ? 'g' : ''));
  }
  SIM.mkRegex = mkRegex;

  /* ---------- cat / tac / head / tail ---------- */
  C.cat = (c) => {
    const { o, rest } = getopt(c.args, 'nbsAEvTet', { number: 'n', 'number-nonblank': 'b', 'squeeze-blank': 's', 'show-all': 'A', 'show-ends': 'E', 'show-tabs': 'T' });
    if (o.A) o.E = o.T = o.v = true;
    if (o.e) o.E = o.v = true;
    if (o.t) o.T = o.v = true;
    c.st = 0;
    const ins = readInputs(c, rest);
    if (!rest.length && c.stdin === null && !c.hasStdin) {
      c.err('\x1b[2m(cat is waiting for input on stdin — in the simulator, pipe or redirect input, e.g. echo hi | cat)\x1b[0m\n');
      return 0;
    }
    if (!o.n && !o.b && !o.s && !o.E && !o.T && !o.v) {
      for (const i of ins) c.out(i.data);
      return c.st;
    }
    let num = 1;
    let prevBlank = false;
    for (const i of ins) {
      let ls = i.data.split('\n');
      const trailing = ls[ls.length - 1] === '';
      if (trailing) ls.pop();
      let out = '';
      for (let l of ls) {
        const blank = l === '';
        if (o.s && blank && prevBlank) continue;
        prevBlank = blank;
        if (o.T) l = l.replace(/\t/g, '^I');
        if (o.v) l = l.replace(/[\x00-\x08\x0b-\x1f]/g, (ch) => '^' + String.fromCharCode(ch.charCodeAt(0) + 64));
        if (o.E) l += '$';
        if (o.b ? !blank : o.n) l = String(num++).padStart(6) + '\t' + l;
        out += l + '\n';
      }
      if (!trailing && out) out = out.slice(0, -1);
      c.out(out);
    }
    return c.st;
  };
  C.tac = (c) => {
    c.st = 0;
    for (const i of readInputs(c, c.args)) c.out(joinLines(lines(i.data).reverse()));
    return c.st;
  };
  function headTail(c, tail) {
    const args = c.args.map((a) => (/^-\d+$/.test(a) ? '-n' + a.slice(1) : /^\+\d+$/.test(a) && tail ? '-n' + a : a));
    const { o, rest } = getopt(args, 'n:c:qvfF', { 'lines=': 'n', 'bytes=': 'c', quiet: 'q', silent: 'q', verbose: 'v', follow: 'f' });
    c.st = 0;
    const ins = readInputs(c, rest);
    const hdr = (ins.length > 1 && !o.q) || o.v;
    ins.forEach((i, idx) => {
      if (hdr) c.out((idx ? '\n' : '') + `==> ${i.name} <==\n`);
      if (o.c !== undefined) {
        const n = parseInt(o.c, 10);
        if (tail) c.out(String(o.c).startsWith('+') ? i.data.slice(n - 1) : i.data.slice(-n));
        else c.out(n < 0 ? i.data.slice(0, n) : i.data.slice(0, n));
        return;
      }
      const spec = o.n === undefined ? '10' : String(o.n);
      const n = parseInt(spec, 10);
      const ls = lines(i.data);
      let sel;
      if (tail) sel = spec.startsWith('+') ? ls.slice(Math.max(0, n - 1)) : n === 0 ? [] : ls.slice(-Math.abs(n));
      else sel = n < 0 ? ls.slice(0, n) : ls.slice(0, n);
      c.out(joinLines(sel));
    });
    if (tail && o.f) c.err('\x1b[2m(tail -f would keep following the file for new lines; press Ctrl+C in a real terminal)\x1b[0m\n');
    return c.st;
  }
  C.head = (c) => headTail(c, false);
  C.tail = (c) => headTail(c, true);
  C.less = (c) => {
    c.st = 0;
    const files = c.args.filter((a) => !a.startsWith('-') && !a.startsWith('+'));
    const ins = readInputs(c, files);
    if (c.sh.onEvent && c.io.tty && c.io.out === c.io.tty) {
      c.sh.onEvent('pager', { name: c.name, text: ins.map((i) => i.data).join('') });
      return c.st;
    }
    for (const i of ins) c.out(i.data);
    return c.st;
  };
  C.more = C.less;
  C.pg = C.less;

  /* ---------- wc ---------- */
  C.wc = (c) => {
    const { o, rest } = getopt(c.args, 'lwcmL', { lines: 'l', words: 'w', bytes: 'c', chars: 'm', 'max-line-length': 'L' });
    if (!o.l && !o.w && !o.c && !o.m && !o.L) o.l = o.w = o.c = true;
    c.st = 0;
    const ins = readInputs(c, rest);
    const rows = [];
    const tot = [0, 0, 0, 0, 0];
    for (const i of ins) {
      const d = i.data;
      const v = [(d.match(/\n/g) || []).length, (d.match(/\S+/g) || []).length, [...d].length, SIM.byteLen(d), Math.max(0, ...d.split('\n').map((l) => l.length))];
      v.forEach((x, k) => (tot[k] = k === 4 ? Math.max(tot[k], x) : tot[k] + x));
      rows.push([v, rest.length ? i.name : '']);
    }
    if (ins.length > 1) rows.push([tot, 'total']);
    const pick = (v) => [o.l && v[0], o.w && v[1], o.m && v[2], o.c && v[3], o.L && v[4]].filter((x) => x !== false && x !== undefined);
    const nCols = pick(tot).length;
    const width = nCols === 1 && rows.length === 1 ? 0 : Math.max(...rows.map((r) => Math.max(...pick(r[0]).map((x) => String(x).length))), rest.length ? 1 : 7);
    for (const [v, name] of rows) c.out(pick(v).map((x) => String(x).padStart(width)).join(' ') + (name ? ' ' + name : '') + '\n');
    return c.st;
  };

  /* ---------- sort / uniq ---------- */
  function sortKey(line, o) {
    if (!o.k) return line;
    const m = /^(\d+)(?:\.(\d+))?([a-zA-Z]*)(?:,(\d+)(?:\.(\d+))?([a-zA-Z]*))?$/.exec(o.k);
    if (!m) return line;
    const sep = o.t;
    let fields;
    if (sep !== undefined) fields = line.split(sep);
    else fields = line.match(/\s*\S+/g) || [''];
    const a = +m[1] - 1;
    const b = m[4] ? +m[4] - 1 : fields.length - 1;
    let key = fields.slice(a, b + 1).join(sep !== undefined ? sep : '');
    if (m[2] && sep === undefined) key = key.trimStart().slice(+m[2] - 1);
    else if (m[2]) key = key.slice(+m[2] - 1);
    return key;
  }
  const HSUF = { K: 1e3, M: 1e6, G: 1e9, T: 1e12, k: 1e3 };
  C.sort = (c) => {
    const { o, rest } = getopt(c.args, 'nrufk:t:hbMRcCdio:Vs', {
      'numeric-sort': 'n',
      reverse: 'r',
      unique: 'u',
      'ignore-case': 'f',
      'key=': 'k',
      'field-separator=': 't',
      'human-numeric-sort': 'h',
      'month-sort': 'M',
      'random-sort': 'R',
      check: 'c',
      'output=': 'o',
      'version-sort': 'V',
    });
    const kflags = o.k ? (/[a-zA-Z]+/.exec(o.k.replace(/^[\d.,]+/, '')) || [''])[0] : '';
    if (kflags.indexOf('n') >= 0) o.n = true;
    if (kflags.indexOf('r') >= 0) o.r = true;
    if (kflags.indexOf('h') >= 0) o.h = true;
    if (o.k) o.k = o.k.replace(/[a-zA-Z]/g, '');
    if (o.t === '\\t') o.t = '\t';
    c.st = 0;
    let all = [];
    for (const i of readInputs(c, rest)) all = all.concat(lines(i.data));
    const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const num = (s) => {
      const m = /^\s*(-?\d*\.?\d+)([KMGTk]?)/.exec(s);
      if (!m) return o.h ? -Infinity : 0;
      return parseFloat(m[1]) * (o.h ? HSUF[m[2]] || 1 : 1);
    };
    const cmp = (a, b) => {
      let ka = sortKey(a, o);
      let kb = sortKey(b, o);
      if (o.b) {
        ka = ka.trimStart();
        kb = kb.trimStart();
      }
      let r;
      if (o.n || o.h) {
        r = num(ka) - num(kb);
        if (r === 0 && !o.k) r = a < b ? -1 : a > b ? 1 : 0;
      } else if (o.M) r = MON.indexOf(ka.trim().slice(0, 3).toLowerCase()) - MON.indexOf(kb.trim().slice(0, 3).toLowerCase());
      else if (o.V) r = ka.localeCompare(kb, undefined, { numeric: true });
      else {
        if (o.f) {
          ka = ka.toLowerCase();
          kb = kb.toLowerCase();
        }
        // en_US.UTF-8 collation: case-insensitive first, then lowercase before uppercase
        r = ka.localeCompare(kb, 'en', { sensitivity: 'base', ignorePunctuation: false });
        if (r === 0) r = ka.localeCompare(kb, 'en');
      }
      return o.r ? -r : r;
    };
    if (o.c) {
      for (let i = 1; i < all.length; i++)
        if (cmp(all[i - 1], all[i]) > 0) {
          c.err(`sort: ${rest[0] || '-'}:${i + 1}: disorder: ${all[i]}\n`);
          return 1;
        }
      return 0;
    }
    if (o.R) {
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
    } else all.sort(cmp);
    if (o.u) all = all.filter((l, i) => i === 0 || cmp(all[i - 1], l) !== 0);
    if (o.o) c.fs.writeFile(o.o, c.sh.cwd, joinLines(all));
    else c.out(joinLines(all));
    return c.st;
  };
  C.uniq = (c) => {
    const { o, rest } = getopt(c.args, 'cduif:s:w:D', { count: 'c', repeated: 'd', unique: 'u', 'ignore-case': 'i', 'skip-fields=': 'f', 'skip-chars=': 's', 'check-chars=': 'w', 'all-repeated': 'D' });
    c.st = 0;
    const ins = readInputs(c, rest.slice(0, 1));
    const ls = ins.length ? lines(ins[0].data) : [];
    const key = (l) => {
      let k = l;
      if (o.f) k = k.replace(new RegExp('^(\\s*\\S+){' + +o.f + '}'), '');
      if (o.s) k = k.slice(+o.s);
      if (o.w) k = k.slice(0, +o.w);
      return o.i ? k.toLowerCase() : k;
    };
    const groups = [];
    for (const l of ls) {
      const g = groups[groups.length - 1];
      if (g && key(g.line) === key(l)) {
        g.n++;
        g.all.push(l);
      } else groups.push({ line: l, n: 1, all: [l] });
    }
    let out = '';
    for (const g of groups) {
      if (o.d && g.n < 2) continue;
      if (o.u && g.n > 1) continue;
      if (o.D) {
        if (g.n > 1) out += g.all.join('\n') + '\n';
        continue;
      }
      out += (o.c ? String(g.n).padStart(7) + ' ' : '') + g.line + '\n';
    }
    if (rest[1]) c.fs.writeFile(rest[1], c.sh.cwd, out);
    else c.out(out);
    return c.st;
  };

  /* ---------- cut / paste / join / tr ---------- */
  function parseList(spec) {
    const ranges = [];
    for (const part of spec.split(',')) {
      const m = /^(\d*)(-?)(\d*)$/.exec(part);
      if (!m || (!m[1] && !m[3])) throw SIM.usage(`invalid field value '${part}'`);
      const a = m[1] ? +m[1] : 1;
      const b = m[2] ? (m[3] ? +m[3] : Infinity) : a;
      ranges.push([a, b]);
    }
    return (i) => ranges.some(([a, b]) => i >= a && i <= b);
  }
  C.cut = (c) => {
    const { o, rest } = getopt(c.args, 'd:f:c:b:sz', { 'delimiter=': 'd', 'fields=': 'f', 'characters=': 'c', 'bytes=': 'b', 'only-delimited': 's', complement: 'compl', 'output-delimiter=': 'od' });
    if (!o.f && !o.c && !o.b) return c.fail('you must specify a list of bytes, characters, or fields', 1);
    c.st = 0;
    const d = o.d === undefined ? '\t' : o.d;
    if (d.length > 1) return c.fail('the delimiter must be a single character');
    const sel = parseList(o.f || o.c || o.b);
    const keep = o.compl ? (i) => !sel(i) : sel;
    let out = '';
    for (const inp of readInputs(c, rest))
      for (const l of lines(inp.data)) {
        if (o.f) {
          if (l.indexOf(d) < 0) {
            if (!o.s) out += l + '\n';
            continue;
          }
          out += l.split(d).filter((_, i) => keep(i + 1)).join(o.od !== undefined ? o.od : d) + '\n';
        } else out += [...l].filter((_, i) => keep(i + 1)).join('') + '\n';
      }
    c.out(out);
    return c.st;
  };
  C.paste = (c) => {
    const { o, rest } = getopt(c.args, 'd:s', { 'delimiters=': 'd', serial: 's' });
    c.st = 0;
    const ds = (o.d === undefined ? '\t' : o.d).replace(/\\t/g, '\t').replace(/\\n/g, '\n').replace(/\\0/g, '');
    const ins = readInputs(c, rest).map((i) => lines(i.data));
    let out = '';
    if (o.s) {
      for (const ls of ins) out += ls.reduce((a, l, i) => (i ? a + (ds[(i - 1) % ds.length] || '') : '') + l, '') + '\n';
    } else {
      const max = Math.max(0, ...ins.map((l) => l.length));
      for (let r = 0; r < max; r++) out += ins.map((l) => l[r] || '').reduce((a, x, i) => (i ? a + (ds[(i - 1) % ds.length] || '') : '') + x, '') + '\n';
    }
    c.out(out);
    return c.st;
  };
  C.join = (c) => {
    const { o, rest } = getopt(c.args, 't:1:2:j:ia:v:', { 'ignore-case': 'i' });
    if (rest.length !== 2) return c.fail('missing operand');
    const f1 = +(o['1'] || o.j || 1) - 1;
    const f2 = +(o['2'] || o.j || 1) - 1;
    const sep = o.t;
    const split = (l) => (sep !== undefined ? l.split(sep) : l.trim().split(/\s+/));
    const [A, B] = rest.map((f) => lines(f === '-' ? c.stdin || '' : c.fs.readFile(f, c.sh.cwd)).map(split));
    const os = sep !== undefined ? sep : ' ';
    const norm = (k) => (o.i ? (k || '').toLowerCase() : k);
    const usedB = new Set();
    for (const a of A) {
      let matched = false;
      B.forEach((b, bi) => {
        if (norm(a[f1]) === norm(b[f2])) {
          matched = true;
          usedB.add(bi);
          if (!o.v) c.out([a[f1], ...a.filter((_, i) => i !== f1), ...b.filter((_, i) => i !== f2)].join(os) + '\n');
        }
      });
      if (!matched && (o.a === '1' || o.v === '1')) c.out(a.join(os) + '\n');
    }
    if (o.a === '2' || o.v === '2') B.forEach((b, i) => !usedB.has(i) && c.out(b.join(os) + '\n'));
  };
  function trSet(s) {
    s = s.replace(/\[:(\w+):\]/g, (m, k) => ({ alpha: 'a-zA-Z', digit: '0-9', alnum: 'a-zA-Z0-9', upper: 'A-Z', lower: 'a-z', space: ' \t\n\r\f\v', blank: ' \t', punct: '!-/:-@[-`{-~', xdigit: '0-9A-Fa-f', cntrl: '\x00-\x1f' }[k] || m));
    s = s.replace(/\\(n|t|r|\\|\d{3})/g, (m, x) => ({ n: '\n', t: '\t', r: '\r', '\\': '\\' }[x] || String.fromCharCode(parseInt(x, 8))));
    const out = [];
    const ch = [...s];
    for (let i = 0; i < ch.length; i++) {
      if (ch[i + 1] === '-' && ch[i + 2] !== undefined) {
        const a = ch[i].codePointAt(0);
        const b = ch[i + 2].codePointAt(0);
        for (let k = a; k <= b; k++) out.push(String.fromCodePoint(k));
        i += 2;
      } else if (ch[i] === '[' && /^\[(.)\*(\d*)\]/.test(ch.slice(i).join(''))) {
        const m = /^\[(.)\*(\d*)\]/.exec(ch.slice(i).join(''));
        out.push({ rep: m[1], n: m[2] ? +m[2] : 0 });
        i += m[0].length - 1;
      } else out.push(ch[i]);
    }
    return out;
  }
  C.tr = (c) => {
    const { o, rest } = getopt(c.args, 'dscCt', { delete: 'd', 'squeeze-repeats': 's', complement: 'c', truncate: 't' });
    if (!rest.length) return c.fail('missing operand');
    if (rest.length > 2 || (!o.d && !o.s && rest.length < 2)) return c.fail(rest.length > 2 ? `extra operand '${rest[2]}'` : `missing operand after '${rest[0]}'`);
    const input = c.stdin || '';
    let s1 = trSet(rest[0]).filter((x) => typeof x === 'string');
    let s2raw = rest[1] !== undefined ? trSet(rest[1]) : [];
    const inS1 = (ch) => (o.c || o.C ? s1.indexOf(ch) < 0 : s1.indexOf(ch) >= 0);
    let out = '';
    if (o.d) {
      for (const ch of input) if (!inS1(ch)) out += ch;
      if (o.s && rest[1]) {
        const sq = trSet(rest[1]).filter((x) => typeof x === 'string');
        out = out.replace(/([\s\S])\1+/g, (m, ch) => (sq.indexOf(ch) >= 0 ? ch : m));
      }
      c.out(out);
      return 0;
    }
    if (rest[1] !== undefined) {
      // expand [x*] in set2
      let s2 = [];
      for (const x of s2raw) {
        if (typeof x === 'string') s2.push(x);
        else {
          const n = x.n || Math.max(0, s1.length - s2raw.filter((y) => typeof y === 'string').length);
          for (let k = 0; k < n; k++) s2.push(x.rep);
        }
      }
      if (o.t) s1 = s1.slice(0, s2.length);
      const map = new Map();
      if (o.c || o.C) {
        const last = s2[s2.length - 1];
        for (const ch of input) if (s1.indexOf(ch) < 0) map.set(ch, last);
      } else s1.forEach((ch, i) => map.set(ch, s2[Math.min(i, s2.length - 1)]));
      for (const ch of input) out += map.has(ch) ? map.get(ch) : ch;
      if (o.s) {
        const sq = new Set(s2);
        out = out.replace(/([\s\S])\1+/g, (m, ch) => (sq.has(ch) ? ch : m));
      }
    } else if (o.s) out = input.replace(/([\s\S])\1+/g, (m, ch) => (inS1(ch) ? ch : m));
    c.out(out);
    return 0;
  };

  /* ---------- nl / od / expand / fmt / pr / split / fold / rev / tee ---------- */
  C.nl = (c) => {
    const { o, rest } = getopt(c.args, 'b:n:w:s:v:i:', { 'body-numbering=': 'b', 'number-format=': 'n', 'number-width=': 'w', 'number-separator=': 's', 'starting-line-number=': 'v', 'line-increment=': 'i' });
    c.st = 0;
    const style = o.b || 't';
    const w = o.w ? +o.w : 6;
    const sep = o.s !== undefined ? o.s : '\t';
    let n = o.v ? +o.v : 1;
    const inc = o.i ? +o.i : 1;
    let out = '';
    for (const i of readInputs(c, rest))
      for (const l of lines(i.data)) {
        const num = style === 'a' || (style === 't' && l.trim() !== '') || (style[0] === 'p' && new RegExp(style.slice(1)).test(l));
        if (num) {
          let ns = String(n);
          ns = o.n === 'ln' ? ns.padEnd(w) : o.n === 'rz' ? ns.padStart(w, '0') : ns.padStart(w);
          out += ns + sep + l + '\n';
          n += inc;
        } else out += ' '.repeat(w) + (style === 'n' || l === '' ? '' : '') + (l === '' ? '' : sep) + l + '\n';
      }
    c.out(out);
    return c.st;
  };
  C.od = (c) => {
    const { o, rest } = getopt(c.args, 'cxXobdA:t:vN:j:', { 'address-radix=': 'A', 'format=': 't' });
    c.st = 0;
    const data = readInputs(c, rest).map((i) => i.data).join('');
    let bytes = Array.from(typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(data) : [...data].map((x) => x.charCodeAt(0)));
    if (o.j) bytes = bytes.slice(+o.j);
    if (o.N) bytes = bytes.slice(0, +o.N);
    const radix = o.A || 'o';
    const addr = (n) => (radix === 'n' ? '' : radix === 'x' ? n.toString(16).padStart(7, '0') : radix === 'd' ? String(n).padStart(7, '0') : n.toString(8).padStart(7, '0'));
    let fmt = o.t || (o.c ? 'c' : o.x ? 'x2' : o.X ? 'x4' : o.b ? 'o1' : o.d ? 'u2' : 'o2');
    const names = { 0: '\\0', 7: '\\a', 8: '\\b', 9: '\\t', 10: '\\n', 11: '\\v', 12: '\\f', 13: '\\r' };
    let out = '';
    for (let off = 0; off < bytes.length; off += 16) {
      const chunk = bytes.slice(off, off + 16);
      let line = addr(off);
      if (fmt[0] === 'c' || fmt === 'a') line += chunk.map((b) => (names[b] || (b >= 32 && b < 127 ? String.fromCharCode(b) : b.toString(8).padStart(3, '0'))).padStart(4)).join('');
      else {
        const size = +(fmt.slice(1) || 2);
        const base = fmt[0] === 'x' ? 16 : fmt[0] === 'o' ? 8 : 10;
        const width = { 16: size * 2, 8: Math.ceil((size * 8) / 3), 10: String(2 ** (size * 8)).length }[base];
        for (let k = 0; k < chunk.length; k += size) {
          let v = 0;
          for (let b = size - 1; b >= 0; b--) v = v * 256 + (chunk[k + b] || 0);
          line += ' ' + v.toString(base).padStart(width, base === 10 ? ' ' : '0');
        }
      }
      out += line + '\n';
    }
    out += addr(bytes.length) + '\n';
    c.out(out);
    return c.st;
  };
  C.hexdump = (c) => {
    const data = readInputs(c, c.args.filter((a) => !a.startsWith('-'))).map((i) => i.data).join('');
    const bytes = Array.from(new TextEncoder().encode(data));
    let out = '';
    for (let off = 0; off < bytes.length; off += 16) {
      const ch = bytes.slice(off, off + 16);
      const hx = ch.map((b) => b.toString(16).padStart(2, '0'));
      out += off.toString(16).padStart(8, '0') + '  ' + hx.slice(0, 8).join(' ').padEnd(23) + '  ' + hx.slice(8).join(' ').padEnd(23) + '  |' + ch.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('') + '|\n';
    }
    out += bytes.length.toString(16).padStart(8, '0') + '\n';
    c.out(out);
  };
  C.xxd = (c) => {
    const data = readInputs(c, c.args.filter((a) => !a.startsWith('-'))).map((i) => i.data).join('');
    const bytes = Array.from(new TextEncoder().encode(data));
    let out = '';
    for (let off = 0; off < bytes.length; off += 16) {
      const ch = bytes.slice(off, off + 16);
      const hx = [];
      for (let k = 0; k < ch.length; k += 2) hx.push(ch.slice(k, k + 2).map((b) => b.toString(16).padStart(2, '0')).join(''));
      out += off.toString(16).padStart(8, '0') + ': ' + hx.join(' ').padEnd(40) + ' ' + ch.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('') + '\n';
    }
    c.out(out);
  };
  C.expand = (c) => {
    const { o, rest } = getopt(c.args, 't:i', { 'tabs=': 't', initial: 'i' });
    const ts = o.t ? +o.t : 8;
    c.st = 0;
    let out = '';
    for (const i of readInputs(c, rest))
      for (const l of lines(i.data)) {
        let col = 0;
        let s = '';
        let lead = true;
        for (const ch of l) {
          if (ch === '\t' && (lead || !o.i)) {
            const n = ts - (col % ts);
            s += ' '.repeat(n);
            col += n;
          } else {
            if (ch !== ' ' && ch !== '\t') lead = false;
            s += ch;
            col++;
          }
        }
        out += s + '\n';
      }
    c.out(out);
    return c.st;
  };
  C.unexpand = (c) => {
    const { o, rest } = getopt(c.args, 'at:', { all: 'a', 'tabs=': 't' });
    const ts = o.t ? +o.t : 8;
    c.st = 0;
    let out = '';
    for (const i of readInputs(c, rest))
      for (const l of lines(i.data)) {
        const conv = (seg) => {
          let r = '';
          for (let k = 0; k < seg.length; k += ts) {
            const chunk = seg.slice(k, k + ts);
            r += chunk.length === ts && /^ +$/.test(chunk) && ts > 1 ? '\t' : chunk.length === ts ? chunk.replace(/ {2,}$/, '\t') : chunk;
          }
          return r;
        };
        if (o.a || o.t) out += conv(l) + '\n';
        else {
          const m = /^ */.exec(l)[0];
          out += conv(m) + l.slice(m.length) + '\n';
        }
      }
    c.out(out);
    return c.st;
  };
  C.fmt = (c) => {
    const args = c.args.map((a) => (/^-\d+$/.test(a) ? '-w' + a.slice(1) : a));
    const { o, rest } = getopt(args, 'w:sut', { 'width=': 'w', 'split-only': 's', 'uniform-spacing': 'u' });
    const w = o.w ? +o.w : 75;
    c.st = 0;
    let out = '';
    for (const i of readInputs(c, rest)) {
      const paras = i.data.replace(/\n+$/, '').split(/\n\s*\n/);
      out += paras
        .map((p) => {
          const words = p.split(/\s+/).filter(Boolean);
          const ls = [];
          let cur = '';
          for (const wd of words) {
            if (cur && (cur + ' ' + wd).length > w) {
              ls.push(cur);
              cur = wd;
            } else cur = cur ? cur + (o.u && /[.!?]$/.test(cur) ? '  ' : ' ') + wd : wd;
          }
          if (cur) ls.push(cur);
          return ls.join('\n');
        })
        .join('\n\n') + '\n';
    }
    c.out(out);
    return c.st;
  };
  C.pr = (c) => {
    const { o, rest } = getopt(c.args, 'dl:h:tw:nmT', { 'header=': 'h', 'length=': 'l', 'omit-header': 't', double: 'd', 'number-lines': 'n' });
    c.st = 0;
    const plen = o.l ? +o.l : 66;
    for (const i of readInputs(c, rest)) {
      let ls = lines(i.data);
      if (o.n) ls = ls.map((l, k) => String(k + 1).padStart(5) + '\t' + l);
      if (o.d) ls = ls.flatMap((l) => [l, '']);
      const body = o.t ? ls.length || 1 : plen - 10;
      const pages = Math.max(1, Math.ceil(ls.length / body));
      const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
      for (let p = 0; p < pages; p++) {
        if (!o.t) c.out(`\n\n${date}${' '.repeat(20)}${o.h || (i.name === '(standard input)' ? '' : i.name)}${' '.repeat(20)}Page ${p + 1}\n\n\n`);
        const chunk = ls.slice(p * body, (p + 1) * body);
        c.out(joinLines(chunk));
        if (!o.t) c.out('\n'.repeat(Math.max(0, body - chunk.length) + 5));
      }
    }
    return c.st;
  };
  C.split = (c) => {
    const { o, rest } = getopt(c.args, 'l:b:n:da:', { 'lines=': 'l', 'bytes=': 'b', 'number=': 'n', 'numeric-suffixes': 'd', 'suffix-length=': 'a', verbose: 'v' });
    const [file = '-', prefix = 'x'] = rest;
    c.st = 0;
    const ins = readInputs(c, [file]);
    if (!ins.length) return 1;
    const data = ins[0].data;
    const sl = o.a ? +o.a : 2;
    const suffix = (k) => {
      if (o.d) return String(k).padStart(sl, '0');
      let s = '';
      for (let i = 0; i < sl; i++) {
        s = String.fromCharCode(97 + (k % 26)) + s;
        k = Math.floor(k / 26);
      }
      return s;
    };
    let chunks = [];
    if (o.b) {
      const n = +String(o.b).replace(/[kKmM]$/, (m) => ({ k: '000', K: '024', m: '000000', M: '048576' }[m]));
      const size = /K$/.test(o.b) ? +o.b.slice(0, -1) * 1024 : /M$/.test(o.b) ? +o.b.slice(0, -1) * 1048576 : n;
      for (let i = 0; i < data.length; i += size) chunks.push(data.slice(i, i + size));
    } else if (o.n) {
      const n = +o.n;
      const size = Math.ceil(data.length / n);
      for (let i = 0; i < n; i++) chunks.push(data.slice(i * size, (i + 1) * size));
    } else {
      const n = o.l ? +o.l : 1000;
      const ls = lines(data);
      for (let i = 0; i < ls.length; i += n) chunks.push(joinLines(ls.slice(i, i + n)));
    }
    chunks.forEach((ch, k) => {
      c.fs.writeFile(prefix + suffix(k), c.sh.cwd, ch);
      if (o.v) c.out(`creating file '${prefix + suffix(k)}'\n`);
    });
    return c.st;
  };
  C.fold = (c) => {
    const { o, rest } = getopt(c.args, 'w:sb', { 'width=': 'w', spaces: 's' });
    const w = o.w ? +o.w : 80;
    c.st = 0;
    let out = '';
    for (const i of readInputs(c, rest))
      for (let l of lines(i.data)) {
        while (l.length > w) {
          let cut = w;
          if (o.s) {
            const sp = l.lastIndexOf(' ', w - 1);
            if (sp > 0) cut = sp + 1;
          }
          out += l.slice(0, cut) + '\n';
          l = l.slice(cut);
        }
        out += l + '\n';
      }
    c.out(out);
    return c.st;
  };
  C.rev = (c) => {
    c.st = 0;
    for (const i of readInputs(c, c.args)) c.out(joinLines(lines(i.data).map((l) => [...l].reverse().join(''))));
    return c.st;
  };
  C.tee = (c) => {
    const { o, rest } = getopt(c.args, 'ai', { append: 'a', 'ignore-interrupts': 'i' });
    const data = c.stdin || '';
    let st = 0;
    for (const f of rest) {
      try {
        c.fs.writeFile(f, c.sh.cwd, data, { append: !!o.a });
      } catch (e) {
        c.err(`tee: ${f}: ${e.message}\n`);
        st = 1;
      }
    }
    c.out(data);
    return st;
  };
  C.column = (c) => {
    const { o, rest } = getopt(c.args, 'ts:o:n', { table: 't', 'separator=': 's', 'output-separator=': 'o' });
    c.st = 0;
    const ls = readInputs(c, rest).flatMap((i) => lines(i.data));
    if (!o.t) {
      c.out(SIM.columns(ls, ls, 80));
      return c.st;
    }
    const rows = ls.map((l) => (o.s ? l.split(new RegExp('[' + SIM.reEsc(o.s) + ']')) : l.trim().split(/\s+/)));
    const w = [];
    rows.forEach((r) => r.forEach((x, i) => (w[i] = Math.max(w[i] || 0, x.length))));
    c.out(rows.map((r) => r.map((x, i) => (i === r.length - 1 ? x : x.padEnd(w[i]))).join(o.o || '  ')).join('\n') + '\n');
    return c.st;
  };

  /* ---------- checksums & encoding ---------- */
  function sumCmd(alg, label) {
    return (c) => {
      const { o, rest } = getopt(c.args, 'cbtw', { check: 'c', binary: 'b', text: 't', quiet: 'q', status: 's', tag: 'tag' });
      c.st = 0;
      if (o.c) {
        let bad = 0;
        let ok = 0;
        for (const i of readInputs(c, rest))
          for (const l of lines(i.data)) {
            const m = /^([0-9a-f]+)\s+\*?(.+)$/.exec(l);
            if (!m) continue;
            let d;
            try {
              d = c.fs.readFile(m[2], c.sh.cwd);
            } catch (e) {
              c.err(`${c.name}: ${m[2]}: No such file or directory\n`);
              c.out(`${m[2]}: FAILED open or read\n`);
              bad++;
              continue;
            }
            const good = SIM.hash[alg](d) === m[1];
            if (good) ok++;
            else bad++;
            if (!o.status && !(o.quiet && good)) c.out(`${m[2]}: ${good ? 'OK' : 'FAILED'}\n`);
          }
        if (bad) c.err(`${c.name}: WARNING: ${bad} computed checksum${bad > 1 ? 's' : ''} did NOT match\n`);
        return bad ? 1 : 0;
      }
      for (const i of readInputs(c, rest, { stdinName: '-' })) {
        const h = SIM.hash[alg](i.data);
        c.out(o.tag ? `${label} (${i.name}) = ${h}\n` : `${h}  ${i.name}\n`);
      }
      return c.st;
    };
  }
  C.md5sum = sumCmd('md5', 'MD5');
  C.sha1sum = sumCmd('sha1', 'SHA1');
  C.sha256sum = sumCmd('sha256', 'SHA256');
  C.sha512sum = sumCmd('sha512', 'SHA512');
  C.cksum = (c) => {
    c.st = 0;
    for (const i of readInputs(c, c.args)) {
      let crc = 0;
      for (const ch of i.data) crc = (crc * 31 + ch.charCodeAt(0)) >>> 0;
      c.out(`${crc} ${SIM.byteLen(i.data)}${c.args.length ? ' ' + i.name : ''}\n`);
    }
    return c.st;
  };
  C.base64 = (c) => {
    const { o, rest } = getopt(c.args, 'dw:i', { decode: 'd', 'wrap=': 'w' });
    const data = readInputs(c, rest).map((i) => i.data).join('');
    const enc = (s) => (typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s).toString('base64'));
    const dec = (s) => (typeof atob !== 'undefined' ? decodeURIComponent(escape(atob(s.replace(/\s/g, '')))) : Buffer.from(s, 'base64').toString());
    if (o.d) {
      try {
        c.out(dec(data));
      } catch (e) {
        return c.fail('invalid input');
      }
    } else {
      const w = o.w === undefined ? 76 : +o.w;
      const e = enc(data);
      c.out((w ? e.match(new RegExp('.{1,' + w + '}', 'g')) || [''] : [e]).join('\n') + '\n');
    }
  };
  C.strings = (c) => {
    const { o, rest } = getopt(c.args, 'n:a', {});
    const n = o.n ? +o.n : 4;
    for (const i of readInputs(c, rest)) for (const m of i.data.match(new RegExp('[\\x20-\\x7e\\t]{' + n + ',}', 'g')) || []) c.out(m + '\n');
  };
  C.iconv = (c) => {
    const { o, rest } = getopt(c.args, 'f:t:lc', { 'from-code=': 'f', 'to-code=': 't', list: 'l' });
    if (o.l) {
      c.out('ASCII, ISO-8859-1, ISO-8859-15, LATIN1, UTF-8, UTF-16, UTF-16LE, UTF-16BE, UTF-32, WINDOWS-1252, CP437\n');
      return 0;
    }
    let data = readInputs(c, rest).map((i) => i.data).join('');
    const to = (o.t || 'UTF-8').toUpperCase();
    if (/ASCII/.test(to)) {
      if (/TRANSLIT/.test(to)) data = data.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/€/g, 'EUR');
      else {
        const bad = data.search(/[^\x00-\x7f]/);
        if (bad >= 0 && !o.c) {
          c.out(data.slice(0, bad));
          return c.fail(`illegal input sequence at position ${bad}`);
        }
        data = data.replace(/[^\x00-\x7f]/g, '');
      }
    }
    c.out(data);
  };

  /* ---------- seq / yes / shuf / xargs ---------- */
  C.seq = (c) => {
    const { o, rest } = getopt(c.args, 's:wf:', { 'separator=': 's', 'equal-width': 'w', 'format=': 'f' }, { numeric: true });
    const nums = rest.map(Number);
    if (!nums.length || nums.some(isNaN)) return c.fail(`invalid floating point argument: '${rest.find((x) => isNaN(+x)) || ''}'`);
    let [first, inc, last] = nums.length === 1 ? [1, 1, nums[0]] : nums.length === 2 ? [nums[0], 1, nums[1]] : nums;
    const out = [];
    const dec = Math.max(...rest.map((r) => (r.split('.')[1] || '').length));
    for (let x = first, k = 0; inc > 0 ? x <= last + 1e-9 : x >= last - 1e-9; x = first + ++k * inc) {
      if (k > 100000) break;
      out.push(dec ? x.toFixed(dec) : String(Math.round(x)));
    }
    if (o.w) {
      const w = Math.max(...out.map((s) => s.length));
      for (let i = 0; i < out.length; i++) out[i] = out[i].padStart(w, '0');
    }
    if (o.f) for (let i = 0; i < out.length; i++) out[i] = SIM.sprintf(o.f, [out[i]]);
    c.out(out.join(o.s === undefined ? '\n' : o.s.replace(/\\n/g, '\n').replace(/\\t/g, '\t')) + '\n');
  };
  C.yes = (c) => {
    const s = c.args.length ? c.args.join(' ') : 'y';
    c.out((s + '\n').repeat(50));
    c.err('\x1b[2m(yes prints forever; the simulator stops after 50 lines)\x1b[0m\n');
  };
  C.shuf = (c) => {
    const { o, rest } = getopt(c.args, 'n:ei:', { 'head-count=': 'n', echo: 'e', 'input-range=': 'i' });
    let ls;
    if (o.e) ls = rest.slice();
    else if (o.i) {
      const [a, b] = o.i.split('-').map(Number);
      ls = [];
      for (let k = a; k <= b; k++) ls.push(String(k));
    } else ls = readInputs(c, rest).flatMap((i) => lines(i.data));
    for (let i = ls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ls[i], ls[j]] = [ls[j], ls[i]];
    }
    if (o.n) ls = ls.slice(0, +o.n);
    c.out(joinLines(ls));
  };
  C.xargs = (c) => {
    const { o, rest } = getopt(c.args, 'n:I:0trpd:L:a:P:', { 'max-args=': 'n', null: '0', verbose: 't', 'no-run-if-empty': 'r', interactive: 'p', 'delimiter=': 'd', 'arg-file=': 'a', 'replace=': 'I' }, { stopAtFirst: true });
    const cmd = rest.length ? rest : ['echo'];
    let input = o.a ? c.fs.readFile(o.a, c.sh.cwd) : c.stdin || '';
    let items;
    if (o['0']) items = input.split('\0').filter(Boolean);
    else if (o.d) items = input.split(o.d.replace(/\\n/g, '\n')).filter(Boolean);
    else if (o.I || o.L) items = lines(input).filter((l) => l.trim());
    else items = input.match(/"[^"]*"|'[^']*'|(?:\\.|\S)+/g) || [];
    items = items.map((x) => x.replace(/^["'](.*)["']$/s, '$1').replace(/\\(.)/g, '$1'));
    if (!items.length && o.r) return 0;
    const runOne = (argv) => {
      if (o.t || o.p) c.err(argv.join(' ') + (o.p ? ' ?...' : '') + '\n');
      if (o.p && c.sh.promptFn) {
        const a = c.sh.promptFn(argv.join(' ') + ' ?...');
        if (!a || !/^y/i.test(a)) return 0;
      }
      return c.sh.exec(argv, { ...c.io, stdin: null });
    };
    let st = 0;
    if (o.I) {
      for (const it of items) st = runOne(cmd.map((a) => a.split(o.I).join(it))) || st;
      return st ? 123 : 0;
    }
    const n = o.n ? +o.n : o.L ? +o.L : items.length || 1;
    if (!items.length) return runOne(cmd);
    for (let i = 0; i < items.length; i += n) st = runOne([...cmd, ...items.slice(i, i + n)]) || st;
    return st ? 123 : 0;
  };

  /* ---------- diff / cmp / comm ---------- */
  C.diff = (c) => {
    const { o, rest } = getopt(c.args, 'uqiywbBrN', { unified: 'u', brief: 'q', 'ignore-case': 'i', 'side-by-side': 'y' });
    if (rest.length !== 2) return c.fail(`missing operand after '${rest[0] || 'diff'}'`, 2);
    const [a, b] = rest.map((f) => (f === '-' ? c.stdin || '' : c.fs.readFile(f, c.sh.cwd)));
    const A = lines(a);
    const B = lines(b);
    const eq = (x, y) => (o.i ? x.toLowerCase() === y.toLowerCase() : o.w ? x.replace(/\s+/g, '') === y.replace(/\s+/g, '') : x === y);
    // LCS
    const n = A.length;
    const m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = eq(A[i], B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && eq(A[i], B[j])) {
        ops.push([' ', A[i], i, j]);
        i++;
        j++;
      } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) {
        ops.push(['+', B[j], i, j]);
        j++;
      } else {
        ops.push(['-', A[i], i, j]);
        i++;
      }
    }
    if (!ops.some((x) => x[0] !== ' ')) return 0;
    if (o.q) {
      c.out(`Files ${rest[0]} and ${rest[1]} differ\n`);
      return 1;
    }
    if (o.u) {
      c.out(`--- ${rest[0]}\n+++ ${rest[1]}\n@@ -1,${n} +1,${m} @@\n`);
      for (const op of ops) c.out(op[0] + op[1] + '\n');
      return 1;
    }
    // normal diff format
    let k = 0;
    const rng = (s, e) => (s === e ? String(s) : `${s},${e}`);
    while (k < ops.length) {
      if (ops[k][0] === ' ') {
        k++;
        continue;
      }
      const del = [];
      const add = [];
      const ai = ops[k][2];
      const bj = ops[k][3];
      while (k < ops.length && ops[k][0] !== ' ') {
        if (ops[k][0] === '-') del.push(ops[k][1]);
        else add.push(ops[k][1]);
        k++;
      }
      if (del.length && add.length) c.out(`${rng(ai + 1, ai + del.length)}c${rng(bj + 1, bj + add.length)}\n`);
      else if (del.length) c.out(`${rng(ai + 1, ai + del.length)}d${bj}\n`);
      else c.out(`${ai}a${rng(bj + 1, bj + add.length)}\n`);
      del.forEach((l) => c.out('< ' + l + '\n'));
      if (del.length && add.length) c.out('---\n');
      add.forEach((l) => c.out('> ' + l + '\n'));
    }
    return 1;
  };
  C.cmp = (c) => {
    const files = c.args.filter((a) => !a.startsWith('-'));
    const [a, b] = files.map((f) => c.fs.readFile(f, c.sh.cwd));
    for (let i = 0, line = 1; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        if (a[i] === undefined || b[i] === undefined) {
          c.err(`cmp: EOF on ${a[i] === undefined ? files[0] : files[1]} after byte ${i}\n`);
          return 1;
        }
        if (c.args.indexOf('-s') < 0) c.out(`${files[0]} ${files[1]} differ: byte ${i + 1}, line ${line}\n`);
        return 1;
      }
      if (a[i] === '\n') line++;
    }
    return 0;
  };
  C.comm = (c) => {
    const { o, rest } = getopt(c.args, '123', {});
    const [A, B] = rest.map((f) => lines(f === '-' ? c.stdin || '' : c.fs.readFile(f, c.sh.cwd)));
    let i = 0;
    let j = 0;
    const col = (n, s) => {
      if (o[String(n)]) return;
      let pre = '';
      for (let k = 1; k < n; k++) if (!o[String(k)]) pre += '\t';
      c.out(pre + s + '\n');
    };
    while (i < A.length || j < B.length) {
      if (j >= B.length || (i < A.length && A[i] < B[j])) col(1, A[i++]);
      else if (i >= A.length || B[j] < A[i]) col(2, B[j++]);
      else {
        col(3, A[i]);
        i++;
        j++;
      }
    }
  };

  /* ---------- grep ---------- */
  function grepImpl(c, mode) {
    const { o, rest } = getopt(
      c.args,
      'ivcnlLrREFGwxohHqsA:B:C:m:e:f:zbZ',
      {
        'ignore-case': 'i',
        'invert-match': 'v',
        count: 'c',
        'line-number': 'n',
        'files-with-matches': 'l',
        'files-without-match': 'L',
        recursive: 'r',
        'dereference-recursive': 'R',
        'extended-regexp': 'E',
        'fixed-strings': 'F',
        'basic-regexp': 'G',
        'word-regexp': 'w',
        'line-regexp': 'x',
        'only-matching': 'o',
        'no-filename': 'h',
        'with-filename': 'H',
        quiet: 'q',
        silent: 'q',
        'no-messages': 's',
        'after-context=': 'A',
        'before-context=': 'B',
        'context=': 'C',
        'max-count=': 'm',
        'regexp=': 'e',
        'file=': 'f',
        'color=': 'color',
        colour: 'colorAlways',
        color: 'colorAlways',
        'include=': 'include',
        'exclude=': 'exclude',
      },
      { multi: ['e', 'include', 'exclude'] }
    );
    if (mode === 'E') o.E = true;
    if (mode === 'F') o.F = true;
    if (o.R) o.r = true;
    let pats = o.e ? o.e.slice() : [];
    const args = rest.slice();
    if (o.f) pats = pats.concat(lines(c.fs.readFile(o.f, c.sh.cwd)));
    if (!pats.length) {
      if (!args.length) {
        c.err(`Usage: grep [OPTION]... PATTERNS [FILE]...\nTry 'grep --help' for more information.\n`);
        return 2;
      }
      pats = args.shift().split('\n');
    }
    let regs;
    try {
      regs = pats.map((p) => SIM.mkRegex(p, { ere: o.E, fixed: o.F, icase: o.i, word: o.w, line: o.x, g: true }));
    } catch (e) {
      c.err(`grep: ${e.message}\n`);
      return 2;
    }
    const tty = c.io.tty && c.io.out === c.io.tty;
    const useColor = o.color === 'always' || (o.color === 'auto' && tty) || (o.colorAlways && tty);
    const CM = '\x1b[01;31m';
    const CF = '\x1b[35m';
    const CN = '\x1b[32m';
    const CS = '\x1b[36m';
    const R = '\x1b[0m';
    // collect files
    let files = args;
    if (o.r && !files.length) files = ['.'];
    const list = [];
    c.st = 0;
    if (o.r) {
      for (const f of files) {
        const r = c.fs.tryLookup(f, c.sh.cwd);
        if (!r) {
          if (!o.s) c.err(`grep: ${f}: No such file or directory\n`);
          c.st = 2;
          continue;
        }
        if (r.node.t !== 'd') {
          list.push(f);
          continue;
        }
        const walk = (p) => {
          const d = c.fs.lookup(p, c.sh.cwd);
          if (!c.fs.can(d.node, 4)) {
            if (!o.s) c.err(`grep: ${p}: Permission denied\n`);
            c.st = 2;
            return;
          }
          for (const n of Object.keys(d.node.ents).sort()) {
            const sub = p.replace(/\/$/, '') + '/' + n;
            const node = c.fs.node(d.node.ents[n]);
            if (node.t === 'd') walk(sub);
            else if (node.t === 'f') {
              if (o.include && !o.include.some((x) => SIM.patMatch(n, x))) continue;
              if (o.exclude && o.exclude.some((x) => SIM.patMatch(n, x))) continue;
              list.push(sub);
            }
          }
        };
        walk(f);
      }
    } else list.push(...files);
    const inputs = [];
    if (!list.length && !o.r) inputs.push({ name: '(standard input)', data: c.stdin || '' });
    for (const f of list) {
      try {
        const r = c.fs.lookup(f, c.sh.cwd);
        if (r.node.t === 'd') {
          if (!o.s) c.err(`grep: ${f}: Is a directory\n`);
          continue;
        }
        inputs.push({ name: f, data: c.fs.readFile(f, c.sh.cwd) });
      } catch (e) {
        if (!o.s) c.err(`grep: ${f}: ${e.message}\n`);
        c.st = 2;
      }
    }
    const showName = o.H || (!o.h && (list.length > 1 || o.r));
    const A = +(o.A || o.C || 0);
    const Bc = +(o.B || o.C || 0);
    let any = false;
    let out = '';
    for (const inp of inputs) {
      const ls = lines(inp.data);
      let count = 0;
      const matched = new Array(ls.length).fill(false);
      for (let i = 0; i < ls.length; i++) {
        const hit = regs.some((re) => {
          re.lastIndex = 0;
          return re.test(ls[i]);
        });
        if (hit !== !!o.v) {
          matched[i] = true;
          count++;
          if (o.m && count >= +o.m) break;
        }
      }
      if (count) any = true;
      if (o.q) {
        if (any) return 0;
        continue;
      }
      const fname = useColor ? CF + inp.name + R : inp.name;
      const sep = useColor ? CS + ':' + R : ':';
      if (o.l) {
        if (count) out += fname + '\n';
        continue;
      }
      if (o.L) {
        if (!count) out += fname + '\n';
        continue;
      }
      if (o.c) {
        out += (showName ? fname + sep : '') + count + '\n';
        continue;
      }
      let lastPrinted = -1;
      for (let i = 0; i < ls.length; i++) {
        if (!matched[i]) continue;
        const from = Math.max(0, i - Bc);
        if ((A || Bc) && lastPrinted >= 0 && from > lastPrinted + 1) out += (useColor ? CS + '--' + R : '--') + '\n';
        for (let k = from; k <= Math.min(ls.length - 1, i + A); k++) {
          if (k <= lastPrinted) continue;
          if (k > i && matched[k]) break;
          const isM = matched[k];
          const s = isM ? sep : useColor ? CS + '-' + R : '-';
          const pre = (showName ? fname + s : '') + (o.n ? (useColor ? CN + (k + 1) + R : k + 1) + s : '');
          let text = ls[k];
          if (o.o && isM && !o.v) {
            for (const re of regs) {
              re.lastIndex = 0;
              let m;
              while ((m = re.exec(text))) {
                if (m[0] === '') {
                  re.lastIndex++;
                  continue;
                }
                out += pre + (useColor ? CM + m[0] + R : m[0]) + '\n';
              }
            }
            lastPrinted = k;
            continue;
          }
          if (useColor && isM && !o.v) for (const re of regs) text = text.replace(re, (m) => (m ? CM + m + R : m));
          out += pre + text + '\n';
          lastPrinted = k;
        }
      }
    }
    c.out(out);
    if (c.st === 2 && !any) return 2;
    return any ? 0 : 1;
  }
  C.grep = (c) => grepImpl(c);
  C.egrep = (c) => grepImpl(c, 'E');
  C.fgrep = (c) => grepImpl(c, 'F');

  /* ---------- sprintf (shared by awk / seq) ---------- */
  SIM.sprintf = function (fmt, args) {
    let ai = 0;
    return fmt.replace(/%(%|[-+ 0#]*(\*|\d+)?(?:\.(\*|\d+))?([sdiouxXfeEgGc]))|\\(n|t|\\|")/g, (m, spec, w, p, conv, e) => {
      if (e) return { n: '\n', t: '\t', '\\': '\\', '"': '"' }[e];
      if (spec === '%') return '%';
      const flags = /^[-+ 0#]*/.exec(spec)[0];
      let width = w === '*' ? +args[ai++] : w ? +w : 0;
      let prec = p === '*' ? +args[ai++] : p !== undefined ? +p : null;
      const a = args[ai++];
      let s;
      switch (conv) {
        case 's':
          s = a === undefined ? '' : String(a);
          if (prec !== null) s = s.slice(0, prec);
          break;
        case 'c':
          s = typeof a === 'number' ? String.fromCharCode(a) : String(a || '')[0] || '';
          break;
        case 'd':
        case 'i':
          s = String(Math.trunc(+a || 0));
          if (flags.indexOf('+') >= 0 && +a >= 0) s = '+' + s;
          break;
        case 'o':
          s = (Math.trunc(+a || 0) >>> 0).toString(8);
          break;
        case 'u':
          s = String(Math.trunc(+a || 0) >>> 0);
          break;
        case 'x':
          s = (Math.trunc(+a || 0) >>> 0).toString(16);
          break;
        case 'X':
          s = (Math.trunc(+a || 0) >>> 0).toString(16).toUpperCase();
          break;
        case 'f':
          s = (+a || 0).toFixed(prec === null ? 6 : prec);
          break;
        case 'e':
        case 'E':
          s = (+a || 0).toExponential(prec === null ? 6 : prec).replace(/e([+-])(\d)$/, 'e$10$2');
          if (conv === 'E') s = s.toUpperCase();
          break;
        case 'g':
        case 'G':
          s = String(+(+a || 0).toPrecision(prec || 6));
          break;
      }
      if (s.length < width) {
        if (flags.indexOf('-') >= 0) s = s.padEnd(width);
        else if (flags.indexOf('0') >= 0 && conv !== 's') s = s.startsWith('-') ? '-' + s.slice(1).padStart(width - 1, '0') : s.padStart(width, '0');
        else s = s.padStart(width);
      }
      return s;
    });
  };

  /* ---------- sed ---------- */
  function parseSed(script, ere) {
    const cmds = [];
    const blocks = [];
    let i = 0;
    const n = script.length;
    const ws = () => {
      while (i < n && (script[i] === ' ' || script[i] === '\t')) i++;
    };
    const readRe = (delim) => {
      let s = '';
      while (i < n && script[i] !== delim) {
        if (script[i] === '\\' && script[i + 1] === delim) {
          s += delim;
          i += 2;
          continue;
        }
        if (script[i] === '\\') {
          s += script[i] + (script[i + 1] || '');
          i += 2;
          continue;
        }
        if (script[i] === '\n' && delim !== '\n') throw new Error('unterminated address regex');
        s += script[i++];
      }
      if (script[i] !== delim) throw new Error(`unterminated \`s' command`);
      i++;
      return s;
    };
    const compile = (s, flags = '') => {
      if (s === '') return null; // reuse last regex
      return new RegExp(SIM.toJsRegex(s, ere), flags);
    };
    const readAddr = () => {
      ws();
      const ch = script[i];
      if (ch === undefined) return null;
      if (/\d/.test(ch)) {
        let s = '';
        while (/\d/.test(script[i] || '')) s += script[i++];
        if (script[i] === '~') {
          i++;
          let st = '';
          while (/\d/.test(script[i] || '')) st += script[i++];
          return { step: [+s, +st] };
        }
        return { line: +s };
      }
      if (ch === '$') {
        i++;
        return { last: true };
      }
      if (ch === '/' || ch === '\\') {
        let d = '/';
        if (ch === '\\') {
          d = script[i + 1];
          i++;
        }
        i++;
        const src = readRe(d);
        let fl = '';
        while (script[i] === 'I' || script[i] === 'M') {
          if (script[i] === 'I') fl += 'i';
          i++;
        }
        return { re: compile(src, fl) };
      }
      return null;
    };
    const readLabel = () => {
      ws();
      let s = '';
      while (i < n && script[i] !== ';' && script[i] !== '\n' && script[i] !== '}') s += script[i++];
      return s.trim();
    };
    const readText = () => {
      // a\ text  |  a text
      ws();
      if (script[i] === '\\') {
        i++;
        if (script[i] === '\n') i++;
      }
      ws();
      let s = '';
      while (i < n && script[i] !== '\n') {
        if (script[i] === '\\' && script[i + 1] === '\n') {
          s += '\n';
          i += 2;
          continue;
        }
        if (script[i] === '\\' && i + 1 < n) {
          s += script[i + 1] === 't' ? '\t' : script[i + 1];
          i += 2;
          continue;
        }
        s += script[i++];
      }
      return s;
    };
    while (i < n) {
      while (i < n && /[\s;]/.test(script[i])) i++;
      if (i >= n) break;
      if (script[i] === '#') {
        while (i < n && script[i] !== '\n') i++;
        continue;
      }
      const cmd = { a1: null, a2: null, neg: false };
      cmd.a1 = readAddr();
      if (cmd.a1) {
        ws();
        if (script[i] === ',') {
          i++;
          ws();
          if (script[i] === '+') {
            i++;
            let s = '';
            while (/\d/.test(script[i] || '')) s += script[i++];
            cmd.a2 = { plus: +s };
          } else if (script[i] === '~') {
            i++;
            let s = '';
            while (/\d/.test(script[i] || '')) s += script[i++];
            cmd.a2 = { mult: +s };
          } else cmd.a2 = readAddr();
          if (!cmd.a2) throw new Error('unexpected `,\'');
        }
      }
      ws();
      if (script[i] === '!') {
        cmd.neg = true;
        i++;
        ws();
      }
      const op = script[i++];
      cmd.op = op;
      switch (op) {
        case '{':
          blocks.push(cmds.length);
          break;
        case '}':
          if (!blocks.length) throw new Error('unexpected `}\'');
          cmds[blocks.pop()].end = cmds.length;
          break;
        case 's': {
          const d = script[i++];
          const pat = readRe(d);
          const rep = readRe(d);
          let flags = '';
          let nth = 0;
          let wfile = null;
          while (i < n && !/[;\n}]/.test(script[i])) {
            const f = script[i];
            if (f === 'g') flags += 'g';
            else if (f === 'p') cmd.print = true;
            else if (f === 'i' || f === 'I') flags += 'i';
            else if (/\d/.test(f)) {
              let s = '';
              while (/\d/.test(script[i] || '')) s += script[i++];
              nth = +s;
              continue;
            } else if (f === 'w') {
              i++;
              wfile = readLabel();
              break;
            } else if (f === 'e' || f === 'm' || f === 'M') {
              /* ignore */
            } else if (f === ' ') {
              /* */
            } else throw new Error(`unknown option to \`s'`);
            i++;
          }
          cmd.re = pat === '' ? null : new RegExp(SIM.toJsRegex(pat, ere), 'g' + (flags.indexOf('i') >= 0 ? 'i' : ''));
          cmd.global = flags.indexOf('g') >= 0;
          cmd.nth = nth;
          cmd.rep = rep;
          cmd.wfile = wfile;
          break;
        }
        case 'y': {
          const d = script[i++];
          const a = readRe(d);
          const b = readRe(d);
          if ([...a].length !== [...b].length) throw new Error("strings for `y' command are different lengths");
          cmd.map = new Map([...a].map((ch, k) => [ch, [...b][k]]));
          break;
        }
        case 'a':
        case 'i':
        case 'c':
          cmd.text = readText();
          break;
        case 'b':
        case 't':
        case 'T':
          cmd.label = readLabel();
          break;
        case ':':
          cmd.label = readLabel();
          if (!cmd.label) throw new Error('":" lacks a label');
          break;
        case 'r':
        case 'R':
        case 'w':
        case 'W':
          cmd.file = readLabel();
          break;
        case 'q':
        case 'Q':
        case 'l':
        case 'L': {
          ws();
          let s = '';
          while (/\d/.test(script[i] || '')) s += script[i++];
          cmd.num = s ? +s : null;
          break;
        }
        case 'd':
        case 'D':
        case 'p':
        case 'P':
        case 'n':
        case 'N':
        case 'g':
        case 'G':
        case 'h':
        case 'H':
        case 'x':
        case '=':
        case 'z':
        case 'F':
          break;
        default:
          throw new Error(`unknown command: \`${op}'`);
      }
      cmds.push(cmd);
    }
    if (blocks.length) throw new Error('unmatched `{\'');
    return cmds;
  }
  function sedReplace(rep, m) {
    // m = match array; supports & \1-\9 \n \t \U \L \E \u \l
    let out = '';
    let mode = null;
    let one = null;
    const emit = (s) => {
      for (const ch of s) {
        let x = ch;
        if (one === 'u') {
          x = x.toUpperCase();
          one = null;
        } else if (one === 'l') {
          x = x.toLowerCase();
          one = null;
        } else if (mode === 'U') x = x.toUpperCase();
        else if (mode === 'L') x = x.toLowerCase();
        out += x;
      }
    };
    for (let i = 0; i < rep.length; i++) {
      const ch = rep[i];
      if (ch === '\\') {
        const d = rep[++i];
        if (/\d/.test(d)) emit(m[+d] || '');
        else if (d === 'n') emit('\n');
        else if (d === 't') emit('\t');
        else if (d === 'U' || d === 'L') mode = d;
        else if (d === 'E') mode = null;
        else if (d === 'u' || d === 'l') one = d;
        else if (d === '&') emit('&');
        else if (d !== undefined) emit(d);
        continue;
      }
      if (ch === '&') emit(m[0]);
      else emit(ch);
    }
    return out;
  }
  C.sed = (c) => {
    const args = c.args.slice();
    const scripts = [];
    let quiet = false;
    let inPlace = null;
    let ere = false;
    let separate = false;
    const files = [];
    for (let k = 0; k < args.length; k++) {
      const a = args[k];
      if (a === '-n' || a === '--quiet' || a === '--silent') quiet = true;
      else if (a === '-e' || a === '--expression') scripts.push(args[++k]);
      else if (a.startsWith('--expression=')) scripts.push(a.slice(13));
      else if (a === '-f' || a === '--file') scripts.push(c.fs.readFile(args[++k], c.sh.cwd));
      else if (a === '-E' || a === '-r' || a === '--regexp-extended') ere = true;
      else if (a === '-s' || a === '--separate') separate = true;
      else if (a.startsWith('-i') || a.startsWith('--in-place')) inPlace = a.startsWith('-i') ? a.slice(2) : (a.split('=')[1] || '');
      else if (/^-[nEr]+$/.test(a)) {
        if (a.indexOf('n') >= 0) quiet = true;
        if (/[Er]/.test(a)) ere = true;
      } else if (/^-[nEr]*i/.test(a)) {
        if (a.indexOf('n') >= 0) quiet = true;
        if (/[Er]/.test(a)) ere = true;
        inPlace = a.slice(a.indexOf('i') + 1);
      } else if (a.startsWith('-') && a.length > 1) {
        c.err(`sed: invalid option -- '${a.slice(1)}'\n`);
        return 1;
      } else files.push(a);
    }
    if (!scripts.length) {
      if (!files.length) {
        c.err('Usage: sed [OPTION]... {script-only-if-no-other-script} [input-file]...\n');
        return 1;
      }
      scripts.push(files.shift());
    }
    let cmds;
    try {
      cmds = parseSed(scripts.join('\n'), ere);
    } catch (e) {
      c.err(`sed: -e expression #1, char 0: ${e.message}\n`);
      return 1;
    }
    const labels = {};
    cmds.forEach((cm, idx) => {
      if (cm.op === ':') labels[cm.label] = idx;
    });
    c.st = 0;
    const units = inPlace !== null || separate ? files.map((f) => [f]) : [files];
    let exitCode = 0;
    let quitAll = false;
    for (const unit of units) {
      if (quitAll) break;
      const ins = readInputs(c, unit);
      const allLines = [];
      for (const i of ins) allLines.push(...lines(i.data));
      let out = '';
      const wfiles = {};
      let lastRe = null;
      const range = new Array(cmds.length).fill(null);
      let li = 0;
      let lineNo = 0;
      let hold = '';
      const total = allLines.length;
      const matchAddr = (a, ps) => {
        if (a.line !== undefined) return lineNo === a.line;
        if (a.last) return lineNo === total;
        if (a.step) return a.step[1] ? lineNo >= a.step[0] && (lineNo - a.step[0]) % a.step[1] === 0 : lineNo === a.step[0];
        if (a.re !== undefined) {
          const re = a.re || lastRe;
          if (!re) return false;
          lastRe = re;
          re.lastIndex = 0;
          return re.test(ps);
        }
        return false;
      };
      while (li < total && !quitAll) {
        let ps = allLines[li++];
        lineNo = li;
        let append = '';
        let deleted = false;
        let subst = false;
        let pc = 0;
        let restart = false;
        cycle: while (pc < cmds.length) {
          c.sh.tick();
          const cm = cmds[pc];
          // address match
          let sel = true;
          if (cm.a1) {
            if (!cm.a2) sel = matchAddr(cm.a1, ps);
            else {
              const st = range[pc];
              if (!st) {
                if (matchAddr(cm.a1, ps)) {
                  sel = true;
                  let end = false;
                  if (cm.a2.line !== undefined && cm.a2.line <= lineNo) end = true;
                  if (cm.a2.plus === 0) end = true;
                  range[pc] = end ? null : { start: lineNo };
                } else sel = false;
              } else {
                sel = true;
                let end = false;
                if (cm.a2.line !== undefined) end = lineNo >= cm.a2.line;
                else if (cm.a2.last) end = lineNo === total;
                else if (cm.a2.plus !== undefined) end = lineNo >= st.start + cm.a2.plus;
                else if (cm.a2.mult !== undefined) end = lineNo % cm.a2.mult === 0;
                else if (cm.a2.re !== undefined) end = matchAddr(cm.a2, ps);
                if (end) range[pc] = null;
              }
            }
          }
          if (cm.neg) sel = !sel;
          if (!sel) {
            pc = cm.op === '{' ? cm.end + 1 : pc + 1;
            continue;
          }
          switch (cm.op) {
            case '{':
            case '}':
            case ':':
              break;
            case 's': {
              const re = cm.re || lastRe;
              if (!re) throw new Error('no previous regular expression');
              lastRe = re;
              re.lastIndex = 0;
              let count = 0;
              let did = false;
              const res = ps.replace(re, (...m) => {
                count++;
                const groups = m.slice(0, -2).filter((x, k) => typeof x === 'string' || x === undefined || k === 0);
                if (cm.nth && count < cm.nth) return m[0];
                if (!cm.global && did) return m[0];
                did = true;
                return sedReplace(cm.rep, m);
              });
              if (did) {
                ps = res;
                subst = true;
                if (cm.print) out += ps + '\n';
                if (cm.wfile) wfiles[cm.wfile] = (wfiles[cm.wfile] || '') + ps + '\n';
              }
              break;
            }
            case 'y':
              ps = [...ps].map((ch) => (cm.map.has(ch) ? cm.map.get(ch) : ch)).join('');
              break;
            case 'p':
              out += ps + '\n';
              break;
            case 'P':
              out += ps.split('\n')[0] + '\n';
              break;
            case 'd':
              deleted = true;
              break cycle;
            case 'D': {
              const k = ps.indexOf('\n');
              if (k < 0) {
                deleted = true;
                break cycle;
              }
              ps = ps.slice(k + 1);
              restart = true;
              break cycle;
            }
            case 'a':
              append += cm.text + '\n';
              break;
            case 'i':
              out += cm.text + '\n';
              break;
            case 'c':
              if (!cm.a2 || !range[pc]) out += cm.text + '\n';
              deleted = true;
              break cycle;
            case '=':
              out += lineNo + '\n';
              break;
            case 'l':
              out += ps.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n') + '$\n';
              break;
            case 'n':
              if (!quiet) out += ps + '\n';
              out += append;
              append = '';
              if (li >= total) {
                deleted = true;
                quitAll = false;
                break cycle;
              }
              ps = allLines[li++];
              lineNo = li;
              break;
            case 'N':
              if (li >= total) break cycle;
              ps += '\n' + allLines[li++];
              lineNo = li;
              break;
            case 'g':
              ps = hold;
              break;
            case 'G':
              ps += '\n' + hold;
              break;
            case 'h':
              hold = ps;
              break;
            case 'H':
              hold += '\n' + ps;
              break;
            case 'x':
              [ps, hold] = [hold, ps];
              break;
            case 'z':
              ps = '';
              break;
            case 'F':
              out += (unit[0] || '-') + '\n';
              break;
            case 'r':
              try {
                append += c.fs.readFile(cm.file, c.sh.cwd);
              } catch (e) {
                /* sed ignores missing files */
              }
              break;
            case 'w':
              wfiles[cm.file] = (wfiles[cm.file] || '') + ps + '\n';
              break;
            case 'b':
              pc = cm.label ? labels[cm.label] : cmds.length;
              if (pc === undefined) throw new Error(`can't find label for jump to \`${cm.label}'`);
              continue;
            case 't':
            case 'T':
              if ((cm.op === 't') === subst) {
                subst = false;
                pc = cm.label ? labels[cm.label] : cmds.length;
                continue;
              }
              if (cm.op === 't') subst = false;
              break;
            case 'q':
              exitCode = cm.num || 0;
              quitAll = true;
              break cycle;
            case 'Q':
              exitCode = cm.num || 0;
              quitAll = true;
              deleted = true;
              break cycle;
          }
          pc++;
        }
        if (!deleted && !quiet) out += ps + '\n';
        out += append;
        if (restart) {
          allLines.splice(li, 0, ps);
          lineNo--;
        }
      }
      for (const [f, d] of Object.entries(wfiles)) c.fs.writeFile(f, c.sh.cwd, d);
      if (inPlace !== null && unit.length) {
        if (inPlace) c.fs.writeFile(unit[0] + inPlace, c.sh.cwd, c.fs.readFile(unit[0], c.sh.cwd));
        c.fs.writeFile(unit[0], c.sh.cwd, out);
      } else c.out(out);
    }
    return c.st || exitCode;
  };

  /* ---------- awk (compact interpreter) ---------- */
  function awkLex(src) {
    const toks = [];
    let i = 0;
    const KW = new Set(['BEGIN', 'END', 'function', 'func', 'if', 'else', 'while', 'for', 'do', 'break', 'continue', 'next', 'nextfile', 'exit', 'return', 'delete', 'in', 'getline', 'print', 'printf']);
    let prevSig = null; // previous significant token for regex detection
    const regexOk = () => !prevSig || (prevSig.t === 'op' && !/^[)\]]$/.test(prevSig.v) && prevSig.v !== '++' && prevSig.v !== '--' && prevSig.v !== '$') || prevSig.t === 'nl' || (prevSig.t === 'kw' && prevSig.v !== 'getline');
    while (i < src.length) {
      const ch = src[i];
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        i++;
        continue;
      }
      if (ch === '\\' && src[i + 1] === '\n') {
        i += 2;
        continue;
      }
      if (ch === '#') {
        while (i < src.length && src[i] !== '\n') i++;
        continue;
      }
      let tok;
      if (ch === '\n') {
        tok = { t: 'nl' };
        i++;
      } else if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1]))) {
        const m = /^(\d*\.?\d*(?:[eE][-+]?\d+)?|0x[0-9a-fA-F]+)/.exec(src.slice(i));
        tok = { t: 'num', v: Number(m[1]) };
        i += m[1].length;
      } else if (ch === '"') {
        let s = '';
        i++;
        while (i < src.length && src[i] !== '"') {
          if (src[i] === '\\') {
            const d = src[++i];
            s += { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', '/': '/', a: '\x07' }[d] !== undefined ? { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', '/': '/', a: '\x07' }[d] : '\\' + d;
            i++;
            continue;
          }
          s += src[i++];
        }
        i++;
        tok = { t: 'str', v: s };
      } else if (ch === '/' && regexOk()) {
        let s = '';
        i++;
        while (i < src.length && src[i] !== '/') {
          if (src[i] === '\\' && src[i + 1] === '/') {
            s += '/';
            i += 2;
            continue;
          }
          if (src[i] === '\\') {
            s += src[i] + src[i + 1];
            i += 2;
            continue;
          }
          if (src[i] === '\n') throw new Error('newline in regex');
          s += src[i++];
        }
        i++;
        tok = { t: 're', v: s };
      } else if (/[A-Za-z_]/.test(ch)) {
        const m = /^[A-Za-z_]\w*/.exec(src.slice(i));
        i += m[0].length;
        if (KW.has(m[0])) tok = { t: 'kw', v: m[0] === 'func' ? 'function' : m[0] };
        else if (src[i] === '(') tok = { t: 'fn', v: m[0] };
        else tok = { t: 'name', v: m[0] };
      } else {
        const ops = ['+=', '-=', '*=', '/=', '%=', '^=', '**', '==', '<=', '>=', '!=', '++', '--', '&&', '||', '>>', '!~', '{', '}', '(', ')', '[', ']', ';', ',', '+', '-', '*', '/', '%', '^', '!', '>', '<', '|', '?', ':', '~', '$', '='];
        const op = ops.find((o) => src.startsWith(o, i));
        if (!op) throw new Error(`syntax error at source line 1: unexpected character '${ch}'`);
        tok = { t: 'op', v: op === '**' ? '^' : op };
        i += op.length;
      }
      toks.push(tok);
      prevSig = tok;
    }
    toks.push({ t: 'eof' });
    return toks;
  }
  function awkParse(src) {
    const T = awkLex(src);
    let p = 0;
    const peek = () => T[p];
    const isOp = (v, t = peek()) => t.t === 'op' && t.v === v;
    const isKw = (v, t = peek()) => t.t === 'kw' && t.v === v;
    const eat = (v) => {
      if (!isOp(v)) throw new Error(`syntax error: expected '${v}' near ${JSON.stringify(peek().v || peek().t)}`);
      p++;
    };
    const nl = () => {
      while (peek().t === 'nl' || isOp(';')) p++;
    };
    const optNl = () => {
      while (peek().t === 'nl') p++;
    };
    const items = [];
    const funcs = {};
    function block() {
      eat('{');
      const st = [];
      nl();
      while (!isOp('}')) {
        if (peek().t === 'eof') throw new Error('syntax error: unexpected end of program');
        st.push(stmt());
        nl();
      }
      eat('}');
      return { k: 'block', st };
    }
    function simpleEnd() {
      if (isOp(';') || peek().t === 'nl') p++;
    }
    function stmt() {
      const t = peek();
      if (isOp('{')) return block();
      if (t.t === 'kw') {
        switch (t.v) {
          case 'if': {
            p++;
            eat('(');
            const cond = expr();
            eat(')');
            optNl();
            const then = stmt();
            let els = null;
            const save = p;
            nl();
            if (isKw('else')) {
              p++;
              optNl();
              els = stmt();
            } else p = save;
            return { k: 'if', cond, then, els };
          }
          case 'while': {
            p++;
            eat('(');
            const cond = expr();
            eat(')');
            optNl();
            if (isOp(';')) {
              p++;
              return { k: 'while', cond, body: { k: 'block', st: [] } };
            }
            return { k: 'while', cond, body: stmt() };
          }
          case 'do': {
            p++;
            optNl();
            const body = stmt();
            nl();
            if (!isKw('while')) throw new Error('syntax error: expected while');
            p++;
            eat('(');
            const cond = expr();
            eat(')');
            return { k: 'do', cond, body };
          }
          case 'for': {
            p++;
            eat('(');
            if (peek().t === 'name' && isKw('in', T[p + 1])) {
              const v = T[p].v;
              p += 2;
              const arr = T[p++].v;
              eat(')');
              optNl();
              return { k: 'forin', v, arr, body: stmt() };
            }
            const init = isOp(';') ? null : expr();
            eat(';');
            optNl();
            const cond = isOp(';') ? null : expr();
            eat(';');
            optNl();
            const step = isOp(')') ? null : expr();
            eat(')');
            optNl();
            return { k: 'for', init, cond, step, body: stmt() };
          }
          case 'break':
          case 'continue':
          case 'next':
          case 'nextfile':
            p++;
            simpleEnd();
            return { k: t.v };
          case 'exit':
          case 'return': {
            p++;
            let e = null;
            if (!isOp(';') && peek().t !== 'nl' && !isOp('}')) e = expr();
            simpleEnd();
            return { k: t.v, e };
          }
          case 'delete': {
            p++;
            const name = T[p++].v;
            let idx = null;
            if (isOp('[')) {
              p++;
              idx = exprList(']');
              eat(']');
            }
            simpleEnd();
            return { k: 'delete', name, idx };
          }
          case 'print':
          case 'printf': {
            p++;
            let args = [];
            const paren = isOp('(');
            if (!isOp(';') && peek().t !== 'nl' && !isOp('}') && !isOp('>') && !isOp('|')) {
              noGt++;
              try {
                if (paren) {
                  const save = p;
                  p++;
                  args = exprList(')');
                  eat(')');
                  if (!(isOp(';') || peek().t === 'nl' || isOp('}') || isOp('>') || isOp('>>') || isOp('|') || peek().t === 'eof')) {
                    p = save;
                    args = exprList();
                  }
                } else args = exprList();
              } finally {
                noGt--;
              }
            }
            let redir = null;
            if (isOp('>') || isOp('>>') || isOp('|')) {
              const op = T[p++].v;
              redir = { op, e: concat() };
            }
            simpleEnd();
            return { k: t.v, args, redir };
          }
        }
      }
      if (isOp(';')) {
        p++;
        return { k: 'block', st: [] };
      }
      const e = expr();
      simpleEnd();
      return { k: 'expr', e };
    }
    let noGt = 0;
    let noIn = 0;
    function exprList(end) {
      const l = [];
      if (end && isOp(end)) return l;
      l.push(expr());
      while (isOp(',')) {
        p++;
        optNl();
        l.push(expr());
      }
      return l;
    }
    function expr() {
      return ternary();
    }
    function ternary() {
      const c = orE();
      if (isOp('?')) {
        p++;
        optNl();
        const a = ternary();
        optNl();
        eat(':');
        optNl();
        const b = ternary();
        return { k: '?:', c, a, b };
      }
      if (peek().t === 'op' && /^[-+*\/%^]?=$/.test(peek().v) && isLv(c)) {
        const op = T[p++].v;
        optNl();
        return { k: 'assign', op, lv: c, e: ternary() };
      }
      return c;
    }
    const isLv = (n) => n.k === 'var' || n.k === 'field' || n.k === 'idx';
    function orE() {
      let a = andE();
      while (isOp('||')) {
        p++;
        optNl();
        a = { k: '||', a, b: andE() };
      }
      return a;
    }
    function andE() {
      let a = inE();
      while (isOp('&&')) {
        p++;
        optNl();
        a = { k: '&&', a, b: inE() };
      }
      return a;
    }
    function inE() {
      let a = matchE();
      while (!noIn && isKw('in')) {
        p++;
        a = { k: 'in', key: a, arr: T[p++].v };
      }
      return a;
    }
    function matchE() {
      let a = relE();
      while (isOp('~') || isOp('!~')) {
        const op = T[p++].v;
        a = { k: op, a, b: relE() };
      }
      return a;
    }
    function relE() {
      let a = concat();
      const t = peek();
      if (t.t === 'op' && ['<', '<=', '==', '!=', '>=', '>'].indexOf(t.v) >= 0 && !(noGt && t.v === '>')) {
        p++;
        a = { k: 'cmp', op: t.v, a, b: concat() };
      }
      return a;
    }
    function startsExpr(t) {
      return t.t === 'num' || t.t === 'str' || t.t === 're' || t.t === 'name' || t.t === 'fn' || (t.t === 'op' && ['$', '(', '!', '++', '--', '-'].indexOf(t.v) >= 0 && t.v !== '-');
    }
    function concat() {
      let a = add();
      while (startsExpr(peek()) && !isKw('in')) a = { k: 'cat', a, b: add() };
      return a;
    }
    function add() {
      let a = mul();
      while (isOp('+') || isOp('-')) {
        const op = T[p++].v;
        a = { k: 'bin', op, a, b: mul() };
      }
      return a;
    }
    function mul() {
      let a = unary();
      while (isOp('*') || isOp('/') || isOp('%')) {
        const op = T[p++].v;
        a = { k: 'bin', op, a, b: unary() };
      }
      return a;
    }
    function unary() {
      if (isOp('!')) {
        p++;
        return { k: '!', a: unary() };
      }
      if (isOp('-')) {
        p++;
        return { k: 'neg', a: unary() };
      }
      if (isOp('+')) {
        p++;
        return { k: 'num', a: unary() };
      }
      return pow();
    }
    function pow() {
      const a = post();
      if (isOp('^')) {
        p++;
        return { k: 'bin', op: '^', a, b: unary() };
      }
      return a;
    }
    function post() {
      if (isOp('++') || isOp('--')) {
        const op = T[p++].v;
        return { k: 'pre', op, lv: post() };
      }
      const a = prim();
      if ((isOp('++') || isOp('--')) && isLv(a)) {
        const op = T[p++].v;
        return { k: 'postinc', op, lv: a };
      }
      return a;
    }
    function prim() {
      const t = T[p++];
      switch (t.t) {
        case 'num':
          return { k: 'const', v: t.v };
        case 'str':
          return { k: 'const', v: t.v };
        case 're':
          return { k: 're', re: new RegExp(SIM.toJsRegex(t.v, true)) };
        case 'name':
          if (isOp('[')) {
            p++;
            const idx = exprList(']');
            eat(']');
            return { k: 'idx', name: t.v, idx };
          }
          return { k: 'var', name: t.v };
        case 'fn': {
          eat('(');
          noIn++;
          noGt = 0;
          const args = exprList(')');
          noIn--;
          eat(')');
          return { k: 'call', name: t.v, args };
        }
        case 'op':
          if (t.v === '$') return { k: 'field', e: post() };
          if (t.v === '(') {
            const saveGt = noGt;
            noGt = 0;
            const e = exprList(')');
            noGt = saveGt;
            eat(')');
            if (e.length > 1 && isKw('in')) {
              p++;
              return { k: 'in', key: { k: 'multi', l: e }, arr: T[p++].v };
            }
            return { k: 'group', e: e[0] };
          }
          if (t.v === '-') return { k: 'neg', a: unary() };
          break;
        case 'kw':
          if (t.v === 'getline') return { k: 'getline', lv: peek().t === 'name' ? prim() : null };
      }
      throw new Error(`syntax error at source line 1 near ${JSON.stringify(t.v === undefined ? t.t : t.v)}`);
    }
    nl();
    while (peek().t !== 'eof') {
      if (isKw('function')) {
        p++;
        const name = T[p++].v;
        eat('(');
        const params = [];
        while (!isOp(')')) {
          params.push(T[p++].v);
          if (isOp(',')) p++;
        }
        eat(')');
        optNl();
        funcs[name] = { params, body: block() };
      } else if (isKw('BEGIN') || isKw('END')) {
        const kind = T[p++].v;
        optNl();
        items.push({ kind, body: block() });
      } else {
        let pat = null;
        let pat2 = null;
        if (!isOp('{')) {
          pat = expr();
          if (isOp(',')) {
            p++;
            optNl();
            pat2 = expr();
          }
        }
        const body = isOp('{') ? block() : null;
        items.push({ kind: 'main', pat, pat2, body, inRange: false });
      }
      nl();
    }
    return { items, funcs };
  }
  const isNumStr = (s) => typeof s === 'number' || /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(s);
  const toNum = (v) => {
    if (typeof v === 'number') return v;
    const m = /^\s*([-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?)/.exec(v || '');
    return m ? parseFloat(m[1]) : 0;
  };
  const toStr = (v, conv = '%.6g') => {
    if (typeof v === 'string') return v;
    if (v === undefined) return '';
    if (Number.isInteger(v)) return String(v);
    return SIM.sprintf(conv, [v]).trim();
  };
  C.awk = (c) => {
    let args = c.args.slice();
    let fs = ' ';
    const vars = {};
    let prog = null;
    while (args.length) {
      const a = args[0];
      if (a === '-F') {
        fs = args[1];
        args = args.slice(2);
      } else if (a.startsWith('-F')) {
        fs = a.slice(2);
        args.shift();
      } else if (a === '-v') {
        const [k, ...v] = args[1].split('=');
        vars[k] = v.join('=');
        args = args.slice(2);
      } else if (a === '-f') {
        prog = c.fs.readFile(args[1], c.sh.cwd);
        args = args.slice(2);
      } else if (a === '--') {
        args.shift();
        break;
      } else break;
    }
    if (prog === null) {
      if (!args.length) {
        c.err("usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]\n");
        return 2;
      }
      prog = args.shift();
    }
    if (fs === 't' || fs === '\\t') fs = '\t';
    let ast;
    try {
      ast = awkParse(prog);
    } catch (e) {
      c.err(`awk: ${e.message}\n awk: ${prog.split('\n')[0]}\n`);
      return 2;
    }
    const V = Object.assign({ FS: fs, OFS: ' ', ORS: '\n', RS: '\n', NR: 0, NF: 0, FNR: 0, FILENAME: '', SUBSEP: '\x1c', RSTART: 0, RLENGTH: -1, OFMT: '%.6g', CONVFMT: '%.6g' }, vars);
    const ENV = c.sh.env();
    const arrays = { ENVIRON: ENV };
    let fields = [''];
    let out = '';
    const files = {};
    const flushOut = () => {
      if (out) {
        c.out(out);
        out = '';
      }
    };
    class Next {}
    class Exit {
      constructor(code) {
        this.code = code;
      }
    }
    class Ret {
      constructor(v) {
        this.v = v;
      }
    }
    class Brk {}
    class Cont {}
    const splitRec = (rec) => {
      const f = toStr(V.FS);
      let parts;
      if (rec === '') parts = [];
      else if (f === ' ') parts = rec.trim() === '' ? [] : rec.trim().split(/[ \t\n]+/);
      else if (f.length === 1 && f !== '\\') parts = rec.split(f);
      else parts = rec.split(new RegExp(SIM.toJsRegex(f, true)));
      fields = [rec, ...parts];
      V.NF = parts.length;
    };
    const rebuild = () => {
      fields[0] = fields.slice(1, V.NF + 1).map((x) => toStr(x === undefined ? '' : x)).join(toStr(V.OFS));
    };
    const locals = [];
    const getVar = (n) => {
      for (let i = locals.length - 1; i >= 0; i--) if (n in locals[i]) return locals[i][n];
      if (n === 'NF') return V.NF;
      return V[n] === undefined ? '' : V[n];
    };
    const setVar = (n, v) => {
      for (let i = locals.length - 1; i >= 0; i--)
        if (n in locals[i]) {
          locals[i][n] = v;
          return;
        }
      V[n] = v;
      if (n === 'NF') {
        V.NF = toNum(v);
        fields.length = V.NF + 1;
        rebuild();
      }
    };
    const arr = (n) => {
      for (let i = locals.length - 1; i >= 0; i--)
        if (n in locals[i]) {
          if (typeof locals[i][n] !== 'object' || locals[i][n] === null) locals[i][n] = {};
          return locals[i][n];
        }
      return (arrays[n] = arrays[n] || {});
    };
    const key = (idx) => idx.map((e) => toStr(ev(e))).join(toStr(V.SUBSEP));
    const assignLv = (lv, v) => {
      if (lv.k === 'var') setVar(lv.name, v);
      else if (lv.k === 'idx') arr(lv.name)[key(lv.idx)] = v;
      else if (lv.k === 'field') {
        const i = toNum(ev(lv.e));
        if (i === 0) splitRec(toStr(v));
        else {
          fields[i] = v;
          if (i > V.NF) {
            for (let k = V.NF + 1; k < i; k++) fields[k] = '';
            V.NF = i;
          }
          rebuild();
        }
      }
      return v;
    };
    const getLv = (lv) => (lv.k === 'var' ? getVar(lv.name) : lv.k === 'idx' ? (arr(lv.name)[key(lv.idx)] === undefined ? '' : arr(lv.name)[key(lv.idx)]) : ev(lv));
    const reOf = (e) => (e.k === 're' ? e.re : new RegExp(SIM.toJsRegex(toStr(ev(e)), true)));
    const cmp = (a, b) => {
      if (isNumStr(a) && isNumStr(b) && !(typeof a === 'string' && typeof b === 'string' && a.constNum === false)) return toNum(a) - toNum(b);
      const x = toStr(a);
      const y = toStr(b);
      return x < y ? -1 : x > y ? 1 : 0;
    };
    const truthy = (v) => (typeof v === 'number' ? v !== 0 : v !== '' && !(isNumStr(v) && toNum(v) === 0 && v !== ''));
    function ev(n) {
      c.sh.tick();
      switch (n.k) {
        case 'const':
          return n.v;
        case 're':
          return n.re.test(fields[0]) ? 1 : 0;
        case 'var':
          return getVar(n.name);
        case 'idx': {
          const a = arr(n.name);
          const k = key(n.idx);
          return a[k] === undefined ? '' : a[k];
        }
        case 'field': {
          const i = toNum(ev(n.e));
          if (i === 0) return fields[0];
          return fields[i] === undefined ? '' : fields[i];
        }
        case 'group':
          return ev(n.e);
        case 'assign': {
          let v = ev(n.e);
          if (n.op !== '=') {
            const cur = toNum(getLv(n.lv));
            const r = toNum(v);
            v = { '+=': cur + r, '-=': cur - r, '*=': cur * r, '/=': cur / r, '%=': cur % r, '^=': Math.pow(cur, r) }[n.op];
          }
          return assignLv(n.lv, v);
        }
        case 'pre': {
          const v = toNum(getLv(n.lv)) + (n.op === '++' ? 1 : -1);
          return assignLv(n.lv, v);
        }
        case 'postinc': {
          const v = toNum(getLv(n.lv));
          assignLv(n.lv, v + (n.op === '++' ? 1 : -1));
          return v;
        }
        case 'bin': {
          const a = toNum(ev(n.a));
          const b = toNum(ev(n.b));
          switch (n.op) {
            case '+':
              return a + b;
            case '-':
              return a - b;
            case '*':
              return a * b;
            case '/':
              if (b === 0) throw new Error('division by zero');
              return a / b;
            case '%':
              return a % b;
            case '^':
              return Math.pow(a, b);
          }
          break;
        }
        case 'neg':
          return -toNum(ev(n.a));
        case 'num':
          return toNum(ev(n.a));
        case '!':
          return truthy(ev(n.a)) ? 0 : 1;
        case 'cat':
          return toStr(ev(n.a)) + toStr(ev(n.b));
        case 'cmp': {
          const r = cmp(ev(n.a), ev(n.b));
          return { '<': r < 0, '<=': r <= 0, '==': r === 0, '!=': r !== 0, '>=': r >= 0, '>': r > 0 }[n.op] ? 1 : 0;
        }
        case '~':
          return reOf(n.b).test(toStr(ev(n.a))) ? 1 : 0;
        case '!~':
          return reOf(n.b).test(toStr(ev(n.a))) ? 0 : 1;
        case '&&':
          return truthy(ev(n.a)) && truthy(ev(n.b)) ? 1 : 0;
        case '||':
          return truthy(ev(n.a)) || truthy(ev(n.b)) ? 1 : 0;
        case '?:':
          return truthy(ev(n.c)) ? ev(n.a) : ev(n.b);
        case 'in': {
          const k = n.key.k === 'multi' ? key(n.key.l) : toStr(ev(n.key));
          return k in arr(n.arr) ? 1 : 0;
        }
        case 'getline':
          return 0;
        case 'call':
          return call(n);
      }
      throw new Error('bad node ' + n.k);
    }
    function call(n) {
      const a = n.args;
      const s = (i) => toStr(ev(a[i]));
      switch (n.name) {
        case 'length':
          if (!a.length) return [...fields[0]].length;
          if (a[0].k === 'var' && typeof arrays[a[0].name] === 'object') return Object.keys(arrays[a[0].name]).length;
          return [...s(0)].length;
        case 'substr': {
          const str = s(0);
          let m = Math.round(toNum(ev(a[1])));
          let len = a[2] ? Math.round(toNum(ev(a[2]))) : Infinity;
          if (m < 1) {
            len += m - 1;
            m = 1;
          }
          return str.substr(m - 1, Math.max(0, len));
        }
        case 'index':
          return s(0).indexOf(s(1)) + 1;
        case 'split': {
          const str = s(0);
          const target = arr(a[1].name);
          for (const k of Object.keys(target)) delete target[k];
          let parts;
          const sep = a[2] ? (a[2].k === 're' ? a[2].re : toStr(ev(a[2]))) : toStr(V.FS);
          if (sep === ' ') parts = str.trim() ? str.trim().split(/\s+/) : [];
          else if (sep instanceof RegExp) parts = str.split(sep);
          else parts = sep.length === 1 ? str.split(sep) : str.split(new RegExp(sep));
          parts.forEach((x, i) => (target[i + 1] = x));
          return parts.length;
        }
        case 'sub':
        case 'gsub': {
          const re = reOf(a[0]);
          const g = new RegExp(re.source, 'g');
          const rep = s(1);
          const lv = a[2] || { k: 'field', e: { k: 'const', v: 0 } };
          const cur = toStr(getLv(lv));
          let cnt = 0;
          const res = cur.replace(g, (m) => {
            if (n.name === 'sub' && cnt) return m;
            cnt++;
            return rep.replace(/\\\\|\\&|&/g, (x) => (x === '&' ? m : x === '\\&' ? '&' : '\\'));
          });
          if (cnt) assignLv(lv, res);
          return cnt;
        }
        case 'match': {
          const m = reOf(a[1]).exec(s(0));
          V.RSTART = m ? m.index + 1 : 0;
          V.RLENGTH = m ? m[0].length : -1;
          return V.RSTART;
        }
        case 'sprintf':
          return SIM.sprintf(s(0), a.slice(1).map(ev));
        case 'tolower':
          return s(0).toLowerCase();
        case 'toupper':
          return s(0).toUpperCase();
        case 'int':
          return Math.trunc(toNum(ev(a[0])));
        case 'sqrt':
          return Math.sqrt(toNum(ev(a[0])));
        case 'exp':
          return Math.exp(toNum(ev(a[0])));
        case 'log':
          return Math.log(toNum(ev(a[0])));
        case 'sin':
          return Math.sin(toNum(ev(a[0])));
        case 'cos':
          return Math.cos(toNum(ev(a[0])));
        case 'atan2':
          return Math.atan2(toNum(ev(a[0])), toNum(ev(a[1])));
        case 'rand':
          return Math.random();
        case 'srand':
          return 0;
        case 'systime':
          return Math.floor(Date.now() / 1000);
        case 'strftime':
          return new Date().toString();
        case 'system': {
          flushOut();
          return c.sh.runSource(s(0), c.io);
        }
        case 'close':
          return 0;
      }
      const f = ast.funcs[n.name];
      if (!f) throw new Error(`calling undefined function ${n.name}`);
      const frame = {};
      f.params.forEach((pn, i) => {
        if (i < a.length) {
          if (a[i].k === 'var' && typeof arrays[a[i].name] === 'object') frame[pn] = arrays[a[i].name];
          else frame[pn] = ev(a[i]);
        } else frame[pn] = '';
      });
      locals.push(frame);
      try {
        exec(f.body);
      } catch (e) {
        if (e instanceof Ret) return e.v;
        throw e;
      } finally {
        locals.pop();
      }
      return '';
    }
    const emit = (s, redir) => {
      if (!redir) {
        out += s;
        return;
      }
      const target = toStr(ev(redir.e));
      if (redir.op === '|') {
        files['|' + target] = (files['|' + target] || '') + s;
        return;
      }
      if (!(target in files)) {
        files[target] = '';
        if (redir.op === '>' && target !== '/dev/stderr') c.fs.writeFile(target, c.sh.cwd, '');
      }
      if (target === '/dev/stderr') c.err(s);
      else c.fs.writeFile(target, c.sh.cwd, s, { append: true });
    };
    function exec(s) {
      switch (s.k) {
        case 'block':
          for (const x of s.st) exec(x);
          return;
        case 'expr':
          ev(s.e);
          return;
        case 'print': {
          const str = s.args.length ? s.args.map((a) => (typeof ev(a) === 'number' ? toStr(ev(a), toStr(V.OFMT)) : toStr(ev(a)))).join(toStr(V.OFS)) : fields[0];
          emit(str + toStr(V.ORS), s.redir);
          return;
        }
        case 'printf': {
          const vals = s.args.map(ev);
          emit(SIM.sprintf(toStr(vals[0]), vals.slice(1)), s.redir);
          return;
        }
        case 'if':
          if (truthy(ev(s.cond))) exec(s.then);
          else if (s.els) exec(s.els);
          return;
        case 'while':
          while (truthy(ev(s.cond))) {
            try {
              exec(s.body);
            } catch (e) {
              if (e instanceof Brk) break;
              if (e instanceof Cont) continue;
              throw e;
            }
          }
          return;
        case 'do':
          do {
            try {
              exec(s.body);
            } catch (e) {
              if (e instanceof Brk) break;
              if (e instanceof Cont) continue;
              throw e;
            }
          } while (truthy(ev(s.cond)));
          return;
        case 'for':
          for (s.init && ev(s.init); s.cond ? truthy(ev(s.cond)) : true; s.step && ev(s.step)) {
            try {
              exec(s.body);
            } catch (e) {
              if (e instanceof Brk) break;
              if (e instanceof Cont) continue;
              throw e;
            }
          }
          return;
        case 'forin': {
          const a = arr(s.arr);
          for (const k of Object.keys(a)) {
            setVar(s.v, k);
            try {
              exec(s.body);
            } catch (e) {
              if (e instanceof Brk) break;
              if (e instanceof Cont) continue;
              throw e;
            }
          }
          return;
        }
        case 'break':
          throw new Brk();
        case 'continue':
          throw new Cont();
        case 'next':
        case 'nextfile':
          throw new Next();
        case 'exit':
          throw new Exit(s.e ? toNum(ev(s.e)) : 0);
        case 'return':
          throw new Ret(s.e ? ev(s.e) : '');
        case 'delete': {
          const a = arr(s.name);
          if (s.idx) delete a[key(s.idx)];
          else for (const k of Object.keys(a)) delete a[k];
          return;
        }
      }
    }
    let code = 0;
    let exited = false;
    const runItems = (kind) => {
      for (const it of ast.items) {
        if (it.kind !== kind) continue;
        if (kind !== 'main') {
          exec(it.body);
          continue;
        }
        let sel;
        if (!it.pat) sel = true;
        else if (it.pat2) {
          if (it.inRange) {
            sel = true;
            if (truthy(ev(it.pat2))) it.inRange = false;
          } else if (truthy(ev(it.pat))) {
            sel = true;
            it.inRange = !truthy(ev(it.pat2));
          } else sel = false;
        } else sel = truthy(ev(it.pat));
        if (!sel) continue;
        if (it.body) exec(it.body);
        else out += fields[0] + toStr(V.ORS);
      }
    };
    c.st = 0;
    try {
      try {
        runItems('BEGIN');
      } catch (e) {
        if (e instanceof Exit) {
          code = e.code;
          exited = true;
        } else throw e;
      }
      const hasMain = ast.items.some((i) => i.kind === 'main' || i.kind === 'END');
      if (!exited && hasMain) {
        const fileArgs = [];
        for (const a of args) {
          const m = /^([A-Za-z_]\w*)=(.*)$/s.exec(a);
          if (m) fileArgs.push({ assign: m });
          else fileArgs.push({ file: a });
        }
        if (!fileArgs.some((f) => f.file)) fileArgs.push({ file: '-' });
        outer: for (const fa of fileArgs) {
          if (fa.assign) {
            V[fa.assign[1]] = fa.assign[2];
            continue;
          }
          const ins = readInputs(c, [fa.file]);
          if (!ins.length) continue;
          V.FILENAME = fa.file === '-' ? '' : fa.file;
          V.FNR = 0;
          for (const rec of lines(ins[0].data)) {
            V.NR++;
            V.FNR++;
            splitRec(rec);
            try {
              runItems('main');
            } catch (e) {
              if (e instanceof Next) continue;
              if (e instanceof Exit) {
                code = e.code;
                break outer;
              }
              throw e;
            }
          }
        }
      }
      try {
        runItems('END');
      } catch (e) {
        if (e instanceof Exit) code = e.code;
        else throw e;
      }
    } catch (e) {
      flushOut();
      if (e && e.limit) throw e;
      c.err(`awk: ${e.message}\n`);
      return 2;
    }
    flushOut();
    for (const [k, v] of Object.entries(files)) if (k.startsWith('|')) c.sh.runSource(k.slice(1), { ...c.io, stdin: new SIM.Stream(v) });
    return code || c.st;
  };
  C.gawk = C.awk;
  C.mawk = C.awk;
})(typeof window !== 'undefined' ? window : globalThis);
