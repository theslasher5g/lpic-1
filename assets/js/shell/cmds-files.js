/* LPIC-1 Trainer — file management commands. */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});
  const C = (SIM.cmds = SIM.cmds || {});
  const getopt = SIM.getopt;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const color = {
    dir: '\x1b[1;34m',
    link: '\x1b[1;36m',
    exec: '\x1b[1;32m',
    dev: '\x1b[1;33m',
    arch: '\x1b[1;31m',
    suid: '\x1b[37;41m',
    sgid: '\x1b[30;43m',
    sticky: '\x1b[30;42m',
    reset: '\x1b[0m',
  };
  function colorName(name, n) {
    let c = null;
    if (n.t === 'd') c = n.mode & 0o1000 && n.mode & 0o002 ? color.sticky : color.dir;
    else if (n.t === 'l') c = color.link;
    else if (n.t === 'b' || n.t === 'c') c = color.dev;
    else if (n.mode & 0o4000) c = color.suid;
    else if (n.mode & 0o2000) c = color.sgid;
    else if (n.mode & 0o111) c = color.exec;
    else if (/\.(tar|tgz|gz|bz2|xz|zip|deb|rpm|cpio)$/.test(name)) c = color.arch;
    return c ? c + name + color.reset : name;
  }
  SIM.colorName = colorName;
  function fmtDate(ms, full) {
    const d = new Date(ms);
    if (full) return d.toISOString().replace('T', ' ').replace(/\..*/, '') + '.000000000 +0000';
    const six = 182 * 86400000;
    const recent = Math.abs(Date.now() - ms) < six;
    const day = String(d.getDate()).padStart(2, ' ');
    return `${MON[d.getMonth()]} ${day} ${recent ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ' ' + d.getFullYear()}`;
  }
  SIM.fmtDate = fmtDate;
  function human(n, si) {
    const u = ['', 'K', 'M', 'G', 'T'];
    const b = si ? 1000 : 1024;
    let i = 0;
    let v = n;
    while (v >= b && i < u.length - 1) {
      v /= b;
      i++;
    }
    if (i === 0) return String(n);
    return (v < 10 ? Math.ceil(v * 10) / 10 : Math.ceil(v)) + u[i];
  }
  SIM.human = human;
  const blocks = (n) => (n.t === 'd' ? 4 : n.t === 'f' ? Math.ceil(SIM.fsize(n) / 4096) * 4 : 0);
  SIM.blocks = blocks;
  function columns(names, raw, width = 100) {
    if (!names.length) return '';
    const w = Math.max(...raw.map((s) => s.length)) + 2;
    const cols = Math.max(1, Math.floor(width / w));
    const rows = Math.ceil(names.length / cols);
    let out = '';
    for (let r = 0; r < rows; r++) {
      let line = '';
      for (let c = 0; c < cols; c++) {
        const i = c * rows + r;
        if (i >= names.length) break;
        const next = c * rows + r + rows < names.length;
        line += names[i] + (next ? ' '.repeat(w - raw[i].length) : '');
      }
      out += line + '\n';
    }
    return out;
  }
  SIM.columns = columns;

  /* ---------------- ls ---------------- */
  C.ls = (c) => {
    const { o, rest } = getopt(c.args, 'alAhidRtrS1FnsUXcuGgo', {
      all: 'a',
      'almost-all': 'A',
      'human-readable': 'h',
      inode: 'i',
      directory: 'd',
      recursive: 'R',
      reverse: 'r',
      classify: 'F',
      'numeric-uid-gid': 'n',
      size: 's',
      'color=': 'color',
      color: 'colorAuto',
      'full-time': 'fulltime',
      'group-directories-first': 'gdf',
    });
    if (o.n || o.g || o.o) o.l = true;
    if (o.fulltime) o.l = true;
    const tty = c.io.tty && c.io.out === c.io.tty;
    const useColor = o.color === 'always' || ((o.color === 'auto' || o.colorAuto || o.color === undefined) && tty && o.color !== 'never');
    const fs = c.fs;
    const sh = c.sh;
    const targets = rest.length ? rest : ['.'];
    let st = 0;
    const files = [];
    const dirs = [];
    for (const t of targets) {
      let r;
      try {
        const l = fs.lookup(t, sh.cwd, false);
        // a dangling symlink is still listed (ls uses lstat for it)
        r = l.node.t === 'l' ? fs.tryLookup(t, sh.cwd, true) || l : l;
        if (l.node.t === 'l' && (o.l || o.d) && !t.endsWith('/')) r = l;
      } catch (e) {
        c.err(`ls: cannot access '${t}': ${e.message}\n`);
        st = 2;
        continue;
      }
      if (r.node.t === 'd' && !o.d) dirs.push({ name: t, r });
      else files.push({ name: t, node: r.node, ino: r.ino, path: r.path });
    }
    const sortEntries = (arr) => {
      if (o.U) return arr;
      const key = (e) => e.name.replace(/^\.+/, '').toLowerCase();
      arr.sort((a, b) => key(a).localeCompare(key(b)) || a.name.localeCompare(b.name));
      if (o.t) arr.sort((a, b) => b.node.mtime - a.node.mtime);
      if (o.S) arr.sort((a, b) => SIM.fsize(b.node) - SIM.fsize(a.node));
      if (o.gdf) arr.sort((a, b) => (b.node.t === 'd') - (a.node.t === 'd'));
      if (o.r) arr.reverse();
      return arr;
    };
    const fmtLong = (list) => {
      const rows = list.map((e) => {
        const n = e.node;
        const owner = o.n ? String(n.uid) : sh.uname(n.uid);
        const group = o.n ? String(n.gid) : sh.gname(n.gid);
        const size = n.t === 'b' || n.t === 'c' ? `${n.rdev[0]}, ${String(n.rdev[1]).padStart(3)}` : o.h ? human(SIM.fsize(n)) : String(SIM.fsize(n));
        let name = useColor ? colorName(e.name, n) : e.name;
        if (n.t === 'l') name += ' -> ' + n.target;
        else if (o.F) name += classify(n);
        return { ino: String(e.ino || ''), blk: String(blocks(n)), mode: SIM.modeString(n), nl: String(n.nlink), owner, group, size, date: o.fulltime ? fmtDate(n.mtime, true) : fmtDate(n.mtime), name };
      });
      const w = (k) => Math.max(0, ...rows.map((r) => r[k].length));
      const W = { ino: w('ino'), blk: w('blk'), nl: w('nl'), owner: w('owner'), group: w('group'), size: w('size') };
      return rows
        .map(
          (r) =>
            (o.i ? r.ino.padStart(W.ino) + ' ' : '') +
            (o.s ? r.blk.padStart(W.blk) + ' ' : '') +
            `${r.mode} ${r.nl.padStart(W.nl)} ` +
            (o.g ? '' : r.owner.padEnd(W.owner) + ' ') +
            (o.o ? '' : r.group.padEnd(W.group) + ' ') +
            `${r.size.padStart(W.size)} ${r.date} ${r.name}\n`
        )
        .join('');
    };
    const classify = (n) => (n.t === 'd' ? '/' : n.t === 'l' ? '@' : n.t === 'p' ? '|' : n.mode & 0o111 ? '*' : '');
    const fmtShort = (list) => {
      const names = list.map((e) => (o.i ? String(e.ino).padStart(7) + ' ' : '') + (o.s ? String(blocks(e.node)).padStart(3) + ' ' : '') + (useColor ? colorName(e.name, e.node) : e.name) + (o.F ? classify(e.node) : ''));
      const raw = list.map((e) => (o.i ? String(e.ino).padStart(7) + ' ' : '') + (o.s ? String(blocks(e.node)).padStart(3) + ' ' : '') + e.name + (o.F ? classify(e.node) : ''));
      if (o['1'] || !tty) return names.join('\n') + (names.length ? '\n' : '');
      return columns(names, raw);
    };
    const out = [];
    if (files.length) out.push(o.l ? fmtLong(sortEntries(files)) : fmtShort(sortEntries(files)));
    const showHeader = dirs.length + files.length > 1 || o.R;
    const listDir = (label, r, first) => {
      if (!fs.can(r.node, 4)) {
        c.err(`ls: cannot open directory '${label}': Permission denied\n`);
        st = 2;
        return;
      }
      let entries = [];
      for (const name of Object.keys(r.node.ents)) {
        if (name.startsWith('.') && !o.a && !o.A) continue;
        let ino = r.node.ents[name];
        let node = fs.node(ino);
        const m = node.t === 'd' ? fs.mountAt(ino) : null;
        if (m) {
          ino = m.root;
          node = fs.node(ino);
        }
        entries.push({ name, node, ino });
      }
      if (o.a) {
        entries.push({ name: '.', node: r.node, ino: r.ino });
        entries.push({ name: '..', node: fs.node(r.node.parent), ino: r.node.parent });
      }
      entries = sortEntries(entries);
      let s = '';
      if (showHeader) s += (first ? '' : '\n') + label + ':\n';
      if (o.l || o.s) s += 'total ' + entries.reduce((a, e) => a + blocks(e.node), 0) + '\n';
      s += o.l ? fmtLong(entries) : fmtShort(entries);
      out.push(s);
      if (o.R) {
        for (const e of entries) {
          if (e.node.t === 'd' && e.name !== '.' && e.name !== '..') {
            const p = (label === '/' ? '' : label.replace(/\/$/, '')) + '/' + e.name;
            listDir(p, { node: e.node, ino: e.ino, path: p }, false);
          }
        }
      }
    };
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    dirs.forEach((d, i) => listDir(d.name, d.r, i === 0 && !files.length));
    c.out(out.join(files.length && dirs.length ? '\n' : ''));
    return st;
  };
  C.dir = C.ls;
  C.vdir = (c) => C.ls({ ...c, args: ['-l', ...c.args] });

  /* ---------------- tree ---------------- */
  C.tree = (c) => {
    const { o, rest } = getopt(c.args, 'adfL:i', {});
    const fs = c.fs;
    const root = rest[0] || '.';
    let nd = 0;
    let nf = 0;
    const tty = c.io.tty && c.io.out === c.io.tty;
    let out = (tty ? colorName(root, fs.lookup(root, c.sh.cwd).node) : root) + '\n';
    const rec = (path, prefix, depth) => {
      const r = fs.lookup(path, c.sh.cwd);
      if (o.L && depth >= +o.L) return;
      let names = Object.keys(r.node.ents).sort();
      if (!o.a) names = names.filter((n) => !n.startsWith('.'));
      if (o.d) names = names.filter((n) => fs.node(r.node.ents[n]).t === 'd');
      names.forEach((n, i) => {
        const last = i === names.length - 1;
        const node = fs.node(r.node.ents[n]);
        if (node.t === 'd') nd++;
        else nf++;
        out += prefix + (last ? '└── ' : '├── ') + (tty ? colorName(n, node) : n) + (node.t === 'l' ? ' -> ' + node.target : '') + '\n';
        if (node.t === 'd' && fs.can(node, 4)) rec(path + '/' + n, prefix + (last ? '    ' : '│   '), depth + 1);
      });
    };
    rec(root, '', 0);
    out += `\n${nd} director${nd === 1 ? 'y' : 'ies'}${o.d ? '' : `, ${nf} file${nf === 1 ? '' : 's'}`}\n`;
    c.out(out);
  };

  /* ---------------- touch / mkdir / rmdir / rm ---------------- */
  function parseTouchStamp(s) {
    // [[CC]YY]MMDDhhmm[.ss]
    const m = /^(\d{2})?(\d{2})?(\d{2})(\d{2})(\d{2})(\d{2})(?:\.(\d{2}))?$/.exec(s);
    if (!m) return NaN;
    const now = new Date();
    let year = now.getFullYear();
    if (m[1] && m[2]) year = +(m[1] + m[2]);
    else if (m[1]) year = 2000 + +m[1];
    return new Date(year, +m[3] - 1, +m[4], +m[5], +m[6], +(m[7] || 0)).getTime();
  }
  C.touch = (c) => {
    const { o, rest } = getopt(c.args, 'acmt:d:r:h', { 'no-create': 'c', 'date=': 'd', 'reference=': 'r' });
    if (!rest.length) return c.fail('missing file operand', 1);
    let t = Date.now();
    if (o.t) t = parseTouchStamp(o.t);
    if (o.d) t = SIM.parseDate(o.d);
    if (o.r) t = c.fs.lookup(o.r, c.sh.cwd).node.mtime;
    if (isNaN(t)) return c.fail(`invalid date format '${o.t || o.d}'`);
    let st = 0;
    for (const f of rest) {
      try {
        let r = c.fs.tryLookup(f, c.sh.cwd);
        if (!r) {
          if (o.c) continue;
          c.fs.writeFile(f, c.sh.cwd, '');
          r = c.fs.lookup(f, c.sh.cwd);
        } else if (!c.fs.isOwner(r.node) && !c.fs.can(r.node, 2)) throw SIM.fsErr('EACCES', f);
        if (!o.a || o.m) r.node.mtime = t;
        if (!o.m || o.a) r.node.atime = t;
        r.node.ctime = Date.now();
      } catch (e) {
        c.err(`touch: cannot touch '${f}': ${e.message}\n`);
        st = 1;
      }
    }
    return st;
  };
  C.mkdir = (c) => {
    const { o, rest } = getopt(c.args, 'pm:v', { parents: 'p', 'mode=': 'm', verbose: 'v' });
    if (!rest.length) return c.fail('missing operand');
    let st = 0;
    for (const d of rest) {
      try {
        let mode;
        if (o.m) mode = SIM.applyMode(o.m, 0o777 & ~c.fs.umask, true, c.fs.umask);
        if (o.p) {
          const parts = c.fs.abs(d, c.sh.cwd).split('/').filter(Boolean);
          let cur = '';
          for (const p of parts) {
            cur += '/' + p;
            if (!c.fs.tryLookup(cur, '/')) {
              c.fs.mkdir(cur, '/');
              if (o.v) c.out(`mkdir: created directory '${cur}'\n`);
            }
          }
          if (mode !== undefined) c.fs.lookup(d, c.sh.cwd).node.mode = mode;
        } else {
          const n = c.fs.mkdir(d, c.sh.cwd);
          if (mode !== undefined) n.mode = mode;
          if (o.v) c.out(`mkdir: created directory '${d}'\n`);
        }
      } catch (e) {
        c.err(`mkdir: cannot create directory '${d}': ${e.message}\n`);
        st = 1;
      }
    }
    return st;
  };
  C.rmdir = (c) => {
    const { o, rest } = getopt(c.args, 'pv', { parents: 'p', verbose: 'v', 'ignore-fail-on-non-empty': 'ign' });
    if (!rest.length) return c.fail('missing operand');
    let st = 0;
    for (const d of rest) {
      try {
        c.fs.rmdir(d, c.sh.cwd);
        if (o.v) c.out(`rmdir: removing directory, '${d}'\n`);
        if (o.p) {
          let p = d.replace(/\/+$/, '');
          while (p.indexOf('/') > 0) {
            p = p.slice(0, p.lastIndexOf('/'));
            c.fs.rmdir(p, c.sh.cwd);
            if (o.v) c.out(`rmdir: removing directory, '${p}'\n`);
          }
        }
      } catch (e) {
        if (o.ign && e.code === 'ENOTEMPTY') continue;
        c.err(`rmdir: failed to remove '${d}': ${e.message}\n`);
        st = 1;
      }
    }
    return st;
  };
  C.rm = (c) => {
    const { o, rest } = getopt(c.args, 'rRfivdI', { recursive: 'r', force: 'f', interactive: 'i', verbose: 'v', dir: 'd', 'no-preserve-root': 'npr', 'preserve-root': 'pr' });
    if (o.R) o.r = true;
    if (!rest.length) {
      if (o.f) return 0;
      return c.fail('missing operand');
    }
    let st = 0;
    const fs = c.fs;
    for (const f of rest) {
      const abs = fs.normalize(f, c.sh.cwd);
      if (o.r && abs === '/' && !o.npr) {
        c.err("rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe\n");
        st = 1;
        continue;
      }
      if (/(^|\/)\.\.?$/.test(f)) {
        c.err(`rm: refusing to remove '.' or '..' directory: skipping '${f}'\n`);
        st = 1;
        continue;
      }
      const r = fs.tryLookup(f, c.sh.cwd, false);
      if (!r) {
        if (!o.f) {
          c.err(`rm: cannot remove '${f}': No such file or directory\n`);
          st = 1;
        }
        continue;
      }
      if (o.i && c.sh.promptFn) {
        const a = c.sh.promptFn(`rm: remove ${r.node.t === 'd' ? 'directory' : 'regular file'} '${f}'? (y/n)`);
        if (!a || !/^y/i.test(a)) continue;
      }
      try {
        if (r.node.t === 'd') {
          if (!o.r) {
            if (o.d) fs.rmdir(f, c.sh.cwd);
            else throw SIM.fsErr('EISDIR', f);
          } else
            fs.rmtree(f, c.sh.cwd, (e, p) => {
              c.err(`rm: cannot remove '${p}': ${e.message}\n`);
              st = 1;
            });
        } else {
          if (!o.f && !fs.can(r.node, 2) && r.node.t === 'f' && c.sh.promptFn && !o.v) {
            const a = c.sh.promptFn(`rm: remove write-protected regular file '${f}'? (y/n)`);
            if (!a || !/^y/i.test(a)) continue;
          }
          fs.unlink(f, c.sh.cwd);
        }
        if (o.v) c.out(`removed ${r.node.t === 'd' ? 'directory ' : ''}'${f}'\n`);
      } catch (e) {
        if (e.code === 'EISDIR') c.err(`rm: cannot remove '${f}': Is a directory\n`);
        else c.err(`rm: cannot remove '${f}': ${e.message}\n`);
        st = 1;
      }
    }
    return st;
  };
  C.unlink = (c) => {
    if (c.args.length !== 1) return c.fail('missing operand');
    c.fs.unlink(c.args[0], c.sh.cwd);
  };

  /* ---------------- cp / mv / ln ---------------- */
  function isDir(c, p) {
    const r = c.fs.tryLookup(p, c.sh.cwd);
    return r && r.node.t === 'd';
  }
  const base = (p) => p.replace(/\/+$/, '').split('/').pop();
  C.cp = (c) => {
    const { o, rest } = getopt(c.args, 'rRaipvfnulsdPLTt:', {
      recursive: 'r',
      archive: 'a',
      interactive: 'i',
      verbose: 'v',
      force: 'f',
      'no-clobber': 'n',
      update: 'u',
      link: 'l',
      'symbolic-link': 's',
      preserve: 'p',
      'target-directory=': 't',
      'no-target-directory': 'T',
    });
    if (o.R || o.a) o.r = true;
    if (o.a) o.p = true;
    const args = rest.slice();
    let dest = o.t || args.pop();
    if (!args.length) return c.fail(dest ? `missing destination file operand after '${dest}'` : 'missing file operand');
    const fs = c.fs;
    const destIsDir = isDir(c, dest) && !o.T;
    if (args.length > 1 && !destIsDir) return c.fail(`target '${dest}' is not a directory`);
    let st = 0;
    for (const src of args) {
      const d = destIsDir ? dest.replace(/\/$/, '') + '/' + base(src) : dest;
      try {
        const s = fs.lookup(src, c.sh.cwd, !(o.a || o.d || o.P));
        if (s.node.t === 'd' && !o.r) {
          c.err(`cp: -r not specified; omitting directory '${src}'\n`);
          st = 1;
          continue;
        }
        const existing = fs.tryLookup(d, c.sh.cwd);
        if (existing && existing.ino === s.ino) {
          c.err(`cp: '${src}' and '${d}' are the same file\n`);
          st = 1;
          continue;
        }
        if (existing && o.n) continue;
        if (existing && o.u && existing.node.mtime >= s.node.mtime) continue;
        if (existing && o.i && c.sh.promptFn) {
          const a = c.sh.promptFn(`cp: overwrite '${d}'? (y/n)`);
          if (!a || !/^y/i.test(a)) continue;
        }
        if (o.l) {
          fs.link(src, d, c.sh.cwd);
        } else if (o.s) {
          fs.symlink(src, d, c.sh.cwd);
        } else if (s.node.t === 'l') {
          if (existing) fs.unlink(d, c.sh.cwd);
          fs.symlink(s.node.target, d, c.sh.cwd);
        } else if (s.node.t === 'd') {
          if (existing && existing.node.t === 'd') {
            for (const name of Object.keys(s.node.ents)) copyRec(c, s.path + '/' + name, existing.path + '/' + name, o);
          } else {
            const dpath = fs.abs(d, c.sh.cwd);
            if (dpath.startsWith(s.path + '/')) {
              c.err(`cp: cannot copy a directory, '${src}', into itself, '${d}'\n`);
              st = 1;
              continue;
            }
            copyRec(c, s.path, dpath, o);
          }
        } else {
          copyFile(c, s, d, o);
        }
        if (o.v) c.out(`'${src}' -> '${d}'\n`);
      } catch (e) {
        c.err(`cp: cannot ${e.code === 'ENOENT' && !fs.exists(src, c.sh.cwd) ? 'stat' : 'create regular file'} '${e.code === 'ENOENT' && !fs.exists(src, c.sh.cwd) ? src : d}': ${e.message}\n`);
        st = 1;
      }
    }
    return st;
  };
  function copyFile(c, s, d, o) {
    const fs = c.fs;
    if (!fs.can(s.node, 4)) throw SIM.fsErr('EACCES', s.path);
    const data = s.node.data || '';
    const ex = fs.tryLookup(d, c.sh.cwd);
    const n = fs.writeFile(d, c.sh.cwd, data, { mode: s.node.mode & 0o777 });
    if (s.node.fsize !== undefined) n.fsize = s.node.fsize;
    if (o.p) {
      n.mode = s.node.mode;
      n.mtime = s.node.mtime;
      if (c.sh.uid === 0) {
        n.uid = s.node.uid;
        n.gid = s.node.gid;
      }
    } else if (!ex) n.mode = s.node.mode & 0o777 & ~0;
    return n;
  }
  function copyRec(c, src, dst, o) {
    const fs = c.fs;
    const s = fs.lookup(src, '/', false);
    if (s.node.t === 'l') return fs.symlink(s.node.target, dst, '/');
    if (s.node.t === 'd') {
      if (!fs.tryLookup(dst, '/')) fs.mkdir(dst, '/');
      const d = fs.lookup(dst, '/');
      if (o.p) {
        d.node.mode = s.node.mode;
        d.node.mtime = s.node.mtime;
      } else d.node.mode = s.node.mode & 0o777;
      for (const name of Object.keys(s.node.ents)) copyRec(c, s.path + '/' + name, d.path + '/' + name, o);
      return;
    }
    copyFile(c, s, dst, o);
  }
  C.mv = (c) => {
    const { o, rest } = getopt(c.args, 'ifnvuTt:b', { interactive: 'i', force: 'f', 'no-clobber': 'n', verbose: 'v', update: 'u', 'target-directory=': 't' });
    const args = rest.slice();
    const dest = o.t || args.pop();
    if (!args.length) return c.fail(dest ? `missing destination file operand after '${dest}'` : 'missing file operand');
    const destIsDir = isDir(c, dest) && !o.T;
    if (args.length > 1 && !destIsDir) return c.fail(`target '${dest}' is not a directory`);
    let st = 0;
    for (const src of args) {
      const d = destIsDir ? dest.replace(/\/$/, '') + '/' + base(src) : dest;
      try {
        const s = c.fs.lookup(src, c.sh.cwd, false);
        const ex = c.fs.tryLookup(d, c.sh.cwd, false);
        if (ex && ex.ino === s.ino) {
          c.err(`mv: '${src}' and '${d}' are the same file\n`);
          st = 1;
          continue;
        }
        if (ex && o.n) continue;
        if (ex && o.u && ex.node.mtime >= s.node.mtime) continue;
        if (ex && o.i && c.sh.promptFn) {
          const a = c.sh.promptFn(`mv: overwrite '${d}'? (y/n)`);
          if (!a || !/^y/i.test(a)) continue;
        }
        if (s.node.t === 'd' && c.fs.abs(d, c.sh.cwd).startsWith(s.path + '/')) {
          c.err(`mv: cannot move '${src}' to a subdirectory of itself, '${d}'\n`);
          st = 1;
          continue;
        }
        if (o.b && ex) c.fs.rename(d, d + '~', c.sh.cwd);
        c.fs.rename(src, d, c.sh.cwd);
        if (o.v) c.out(`renamed '${src}' -> '${d}'\n`);
      } catch (e) {
        c.err(`mv: cannot ${e.code === 'ENOENT' ? 'stat' : 'move'} '${src}'${e.code === 'ENOENT' ? '' : ` to '${d}'`}: ${e.message}\n`);
        st = 1;
      }
    }
    return st;
  };
  C.rename = (c) => {
    // perl-less util-linux rename: rename from to files...
    const [from, to, ...files] = c.args.filter((a) => a !== '-v');
    if (!files.length) return c.fail('not enough arguments');
    for (const f of files) {
      const nf = f.replace(from, to);
      if (nf !== f) {
        c.fs.rename(f, nf, c.sh.cwd);
        if (c.args.indexOf('-v') >= 0) c.out(`\`${f}' -> \`${nf}'\n`);
      }
    }
  };
  C.ln = (c) => {
    const { o, rest } = getopt(c.args, 'sfvnrPLiT', { symbolic: 's', force: 'f', verbose: 'v', 'no-dereference': 'n', relative: 'r' });
    if (!rest.length) return c.fail('missing file operand');
    const args = rest.slice();
    let dest = args.length > 1 ? args.pop() : '.';
    const destIsDir = isDir(c, dest) && !(o.n && c.fs.tryLookup(dest, c.sh.cwd, false).node.t === 'l');
    if (args.length > 1 && !destIsDir) return c.fail(`target '${dest}' is not a directory`);
    let st = 0;
    for (const src of args) {
      const d = destIsDir ? dest.replace(/\/$/, '') + '/' + base(src) : dest;
      try {
        if (c.fs.tryLookup(d, c.sh.cwd, false)) {
          if (!o.f) throw SIM.fsErr('EEXIST', d);
          c.fs.unlink(d, c.sh.cwd);
        }
        if (o.s) c.fs.symlink(src, d, c.sh.cwd);
        else {
          const s = c.fs.tryLookup(src, c.sh.cwd, true);
          if (!s) {
            c.err(`ln: failed to access '${src}': No such file or directory\n`);
            st = 1;
            continue;
          }
          if (s.node.t === 'd') {
            c.err(`ln: ${src}: hard link not allowed for directory\n`);
            st = 1;
            continue;
          }
          c.fs.link(s.path, d, c.sh.cwd);
        }
        if (o.v) c.out(`'${d}' ${o.s ? '->' : '=>'} '${src}'\n`);
      } catch (e) {
        c.err(`ln: failed to create ${o.s ? 'symbolic' : 'hard'} link '${d}'${e.code === 'EEXIST' ? '' : ` => '${src}'`}: ${e.message}\n`);
        st = 1;
      }
    }
    return st;
  };
  C.readlink = (c) => {
    const { o, rest } = getopt(c.args, 'fenmqsv', { canonicalize: 'f' });
    let st = 0;
    for (const f of rest) {
      if (o.f || o.e || o.m) {
        const r = c.fs.tryLookup(f, c.sh.cwd);
        if (r) c.out(r.path + '\n');
        else if (o.f || o.m) c.out(c.fs.normalize(f, c.sh.cwd) + '\n');
        else st = 1;
        continue;
      }
      const r = c.fs.tryLookup(f, c.sh.cwd, false);
      if (r && r.node.t === 'l') c.out(r.node.target + '\n');
      else st = 1;
    }
    return st;
  };
  C.realpath = (c) => {
    let st = 0;
    for (const f of c.args.filter((a) => !a.startsWith('-'))) {
      const r = c.fs.tryLookup(f, c.sh.cwd);
      if (r) c.out(r.path + '\n');
      else {
        c.err(`realpath: ${f}: No such file or directory\n`);
        st = 1;
      }
    }
    return st;
  };
  C.basename = (c) => {
    const { o, rest } = getopt(c.args, 'as:z', { multiple: 'a', 'suffix=': 's' });
    if (!rest.length) return c.fail('missing operand');
    const list = o.a || o.s ? rest : [rest[0]];
    const suf = o.s || (!o.a && rest[1]);
    for (const p of list) {
      let b = p === '/' ? '/' : p.replace(/\/+$/, '').split('/').pop();
      if (suf && b.endsWith(suf) && b !== suf) b = b.slice(0, -suf.length);
      c.out(b + '\n');
    }
  };
  C.dirname = (c) => {
    if (!c.args.length) return c.fail('missing operand');
    for (const p of c.args) {
      const s = p.replace(/\/+$/, '');
      const i = s.lastIndexOf('/');
      c.out((i < 0 ? '.' : i === 0 ? '/' : s.slice(0, i)) + '\n');
    }
  };

  /* ---------------- chmod / chown / chgrp ---------------- */
  // apply a chmod mode string to an existing mode
  SIM.applyMode = function (spec, mode, isDir, umask = 0) {
    if (/^[0-7]{1,4}$/.test(spec)) {
      const v = parseInt(spec, 8);
      // 3-digit modes keep the special bits of directories (GNU behaviour) — keep it simple: replace
      return spec.length <= 3 ? (mode & 0o7000 & (isDir ? 0o7000 : 0)) | v : v;
    }
    let m = mode;
    for (const part of spec.split(',')) {
      const mm = /^([ugoa]*)((?:[-+=][rwxXstugo]*)+)$/.exec(part);
      if (!mm) throw new Error(`invalid mode: '${spec}'`);
      const whoStr = mm[1];
      const who = whoStr === '' || whoStr.indexOf('a') >= 0 ? 'ugo' : whoStr;
      const ops = mm[2].match(/[-+=][rwxXstugo]*/g);
      for (const op of ops) {
        const o = op[0];
        const perms = op.slice(1);
        let bits = 0;
        for (const w of who) {
          const sh = { u: 6, g: 3, o: 0 }[w];
          let b = 0;
          for (const p of perms) {
            if (p === 'r') b |= 4 << sh;
            else if (p === 'w') b |= 2 << sh;
            else if (p === 'x') b |= 1 << sh;
            else if (p === 'X') {
              if (isDir || mode & 0o111) b |= 1 << sh;
            } else if (p === 's') {
              if (w === 'u') b |= 0o4000;
              if (w === 'g') b |= 0o2000;
            } else if (p === 't') {
              if (w === 'o' || whoStr === '' || whoStr.indexOf('a') >= 0) b |= 0o1000;
            } else if ('ugo'.indexOf(p) >= 0) {
              const src = { u: 6, g: 3, o: 0 }[p];
              b |= ((m >> src) & 7) << sh;
            }
          }
          bits |= b;
        }
        if (whoStr === '' && o !== '=') bits &= ~umask | 0o7000;
        if (o === '+') m |= bits;
        else if (o === '-') m &= ~bits;
        else {
          let clear = 0;
          for (const w of who) clear |= 7 << { u: 6, g: 3, o: 0 }[w];
          if (who.indexOf('u') >= 0) clear |= 0o4000;
          if (who.indexOf('g') >= 0) clear |= 0o2000;
          if (who.indexOf('o') >= 0) clear |= 0o1000;
          m = (m & ~clear) | bits;
        }
      }
    }
    return m & 0o7777;
  };
  function recurse(c, path, fn, R) {
    const r = c.fs.lookup(path, c.sh.cwd, true);
    fn(r, path);
    if (R && r.node.t === 'd') {
      for (const n of Object.keys(r.node.ents)) {
        const sub = r.path + '/' + n;
        const l = c.fs.lookup(sub, '/', false);
        if (l.node.t === 'l') continue;
        recurse(c, sub, fn, R);
      }
    }
  }
  C.chmod = (c) => {
    // mode may start with "-" (e.g. chmod -x file)
    const args = [];
    const flags = {};
    for (const a of c.args) {
      if (/^-[Rvcf]+$/.test(a)) for (const ch of a.slice(1)) flags[ch] = true;
      else if (a === '--recursive') flags.R = true;
      else if (a === '--verbose') flags.v = true;
      else args.push(a);
    }
    if (args.length < 2) return c.fail(args.length ? `missing operand after '${args[0]}'` : 'missing operand');
    const spec = args.shift();
    let st = 0;
    for (const f of args) {
      try {
        recurse(
          c,
          f,
          (r, p) => {
            if (!c.fs.isOwner(r.node)) throw Object.assign(SIM.fsErr('EPERM', p), { chm: true });
            const old = r.node.mode;
            const nm = SIM.applyMode(spec, old, r.node.t === 'd', c.fs.umask);
            r.node.mode = nm;
            r.node.ctime = Date.now();
            if (flags.v || (flags.c && old !== nm))
              c.out(`mode of '${p}' ${old === nm ? 'retained as' : 'changed from'} ${old.toString(8).padStart(4, '0')} (${SIM.modeString({ t: r.node.t, mode: old }).slice(1)})${old === nm ? '' : ` to ${nm.toString(8).padStart(4, '0')} (${SIM.modeString(r.node).slice(1)})`}\n`);
          },
          flags.R
        );
      } catch (e) {
        if (e.fs && e.code === 'EPERM') c.err(`chmod: changing permissions of '${f}': Operation not permitted\n`);
        else if (e.fs) c.err(`chmod: cannot access '${f}': ${e.message}\n`);
        else c.err(`chmod: ${e.message}\n`);
        st = 1;
      }
    }
    return st;
  };
  function parseOwner(c, spec) {
    const m = /^([^:.]*)(?:[:.](.*))?$/.exec(spec);
    let uid = null;
    let gid = null;
    if (m[1]) {
      const u = /^\d+$/.test(m[1]) ? c.sh.user(+m[1]) || { uid: +m[1], gid: +m[1] } : c.sh.user(m[1]);
      if (!u) throw new Error(`invalid user: '${spec}'`);
      uid = u.uid;
      if (m[2] === '') gid = u.gid;
    }
    if (m[2]) {
      const g = /^\d+$/.test(m[2]) ? { gid: +m[2] } : c.sh.group(m[2]);
      if (!g) throw new Error(`invalid group: '${spec}'`);
      gid = g.gid;
    }
    return { uid, gid };
  }
  function chownImpl(c, name, groupOnly) {
    const { o, rest } = getopt(c.args, 'RvchfHLP', { recursive: 'R', verbose: 'v', changes: 'c', 'reference=': 'ref' });
    let args = rest.slice();
    let spec;
    if (o.ref) {
      const r = c.fs.lookup(o.ref, c.sh.cwd).node;
      spec = groupOnly ? String(r.gid) : `${r.uid}:${r.gid}`;
    } else spec = args.shift();
    if (!args.length) return c.fail(spec ? `missing operand after '${spec}'` : 'missing operand');
    let target;
    try {
      target = groupOnly ? parseOwner(c, ':' + spec) : parseOwner(c, spec);
    } catch (e) {
      return c.fail(e.message.replace('invalid user', groupOnly ? 'invalid group' : 'invalid user'));
    }
    let st = 0;
    for (const f of args) {
      try {
        recurse(
          c,
          f,
          (r, p) => {
            const n = r.node;
            if (c.sh.uid !== 0) {
              if (target.uid !== null && target.uid !== n.uid) throw SIM.fsErr('EPERM', p);
              if (n.uid !== c.sh.uid || (target.gid !== null && c.fs.cred.groups.indexOf(target.gid) < 0)) throw SIM.fsErr('EPERM', p);
            }
            if (target.uid !== null) n.uid = target.uid;
            if (target.gid !== null) n.gid = target.gid;
            if (c.sh.uid !== 0 || target.uid !== null) n.mode &= ~(n.t === 'd' ? 0 : 0o6000);
            n.ctime = Date.now();
            if (o.v || o.c) c.out(`changed ${groupOnly ? 'group' : 'ownership'} of '${p}' to ${groupOnly ? c.sh.gname(n.gid) : c.sh.uname(n.uid) + ':' + c.sh.gname(n.gid)}\n`);
          },
          o.R
        );
      } catch (e) {
        if (e.code === 'EPERM') c.err(`${name}: changing ${groupOnly ? 'group' : 'ownership'} of '${f}': Operation not permitted\n`);
        else c.err(`${name}: cannot access '${f}': ${e.message}\n`);
        st = 1;
      }
    }
    return st;
  }
  C.chown = (c) => chownImpl(c, 'chown', false);
  C.chgrp = (c) => chownImpl(c, 'chgrp', true);
  C.chattr = (c) => {
    const [spec, ...files] = c.args;
    if (c.sh.uid !== 0) return c.fail(`Operation not permitted while setting flags on ${files[0]}`);
    for (const f of files) {
      const n = c.fs.lookup(f, c.sh.cwd).node;
      n.attrs = n.attrs || '';
      for (const ch of spec.slice(1)) {
        if (spec[0] === '+' && n.attrs.indexOf(ch) < 0) n.attrs += ch;
        if (spec[0] === '-') n.attrs = n.attrs.replace(ch, '');
      }
    }
  };
  C.lsattr = (c) => {
    for (const f of c.args.length ? c.args : ['.']) {
      const r = c.fs.lookup(f, c.sh.cwd);
      const show = (name, n) => c.out(`${'--------------e-------'.split('').map((x, i) => (i === 4 && (n.attrs || '').indexOf('i') >= 0 ? 'i' : i === 5 && (n.attrs || '').indexOf('a') >= 0 ? 'a' : x)).join('')} ${name}\n`);
      if (r.node.t === 'd' && f === (c.args[0] || '.') && !c.args.length) for (const n of Object.keys(r.node.ents)) show('./' + n, c.fs.node(r.node.ents[n]));
      else show(f, r.node);
    }
  };

  /* ---------------- stat / file ---------------- */
  const TYPE_NAMES = { f: 'regular file', d: 'directory', l: 'symbolic link', b: 'block special file', c: 'character special file', p: 'fifo' };
  C.stat = (c) => {
    const { o, rest } = getopt(c.args, 'c:Lft', { 'format=': 'c', dereference: 'L', 'file-system': 'f', 'printf=': 'c' });
    if (!rest.length) return c.fail('missing operand');
    let st = 0;
    for (const f of rest) {
      let r;
      try {
        r = c.fs.lookup(f, c.sh.cwd, !!o.L);
      } catch (e) {
        c.err(`stat: cannot statx '${f}': ${e.message}\n`);
        st = 1;
        continue;
      }
      const n = r.node;
      if (o.f) {
        c.out(`  File: "${f}"\n    ID: 3b5e9c416f2a4d0e Namelen: 255     Type: ext2/ext3\nBlock size: 4096       Fundamental block size: 4096\nBlocks: Total: 9305856    Free: 6123300    Available: 5645217\nInodes: Total: 2330624    Free: 2101340\n`);
        continue;
      }
      if (o.c) {
        const s = o.c.replace(/%([aAbBdDfFgGhiInNosuUwxXyYzZ%])/g, (m, k) => {
          switch (k) {
            case 'a':
              return n.mode.toString(8);
            case 'A':
              return SIM.modeString(n);
            case 'b':
              return String(blocks(n) * 2);
            case 'B':
              return '512';
            case 'd':
              return '2050';
            case 'F':
              return TYPE_NAMES[n.t] + (n.t === 'f' && !SIM.fsize(n) ? '' : '');
            case 'f':
              return n.mode.toString(16);
            case 'g':
              return String(n.gid);
            case 'G':
              return c.sh.gname(n.gid);
            case 'h':
              return String(n.nlink);
            case 'i':
              return String(r.ino);
            case 'n':
              return f;
            case 'N':
              return n.t === 'l' ? `'${f}' -> '${n.target}'` : `'${f}'`;
            case 'o':
              return '4096';
            case 's':
              return String(SIM.fsize(n));
            case 'u':
              return String(n.uid);
            case 'U':
              return c.sh.uname(n.uid);
            case 'x':
              return fmtDate(n.atime, true);
            case 'y':
              return fmtDate(n.mtime, true);
            case 'z':
              return fmtDate(n.ctime, true);
            case 'X':
              return String(Math.floor(n.atime / 1000));
            case 'Y':
              return String(Math.floor(n.mtime / 1000));
            case 'Z':
              return String(Math.floor(n.ctime / 1000));
            case '%':
              return '%';
          }
          return m;
        });
        c.out(s.replace(/\\n/g, '\n').replace(/\\t/g, '\t') + '\n');
        continue;
      }
      const type = n.t === 'f' && !SIM.fsize(n) ? 'regular empty file' : TYPE_NAMES[n.t];
      c.out(
        `  File: ${n.t === 'l' ? `${f} -> ${n.target}` : f}\n` +
          `  Size: ${String(SIM.fsize(n)).padEnd(15)} Blocks: ${String(blocks(n) * 2).padEnd(10)} IO Block: 4096   ${type}\n` +
          `Device: ${n.t === 'b' || n.t === 'c' ? '0,5' : '8,2'}\tInode: ${String(r.ino).padEnd(11)} Links: ${n.nlink}${n.rdev ? `     Device type: ${n.rdev[0]},${n.rdev[1]}` : ''}\n` +
          `Access: (${n.mode.toString(8).padStart(4, '0')}/${SIM.modeString(n)})  Uid: (${String(n.uid).padStart(5)}/${c.sh.uname(n.uid).padStart(8)})   Gid: (${String(n.gid).padStart(5)}/${c.sh.gname(n.gid).padStart(8)})\n` +
          `Access: ${fmtDate(n.atime, true)}\nModify: ${fmtDate(n.mtime, true)}\nChange: ${fmtDate(n.ctime, true)}\n Birth: -\n`
      );
    }
    return st;
  };
  SIM.fileType = function (n, name) {
    if (n.t === 'd') return 'directory';
    if (n.t === 'l') return 'symbolic link to ' + n.target;
    if (n.t === 'b') return `block special (${n.rdev[0]}/${n.rdev[1]})`;
    if (n.t === 'c') return `character special (${n.rdev[0]}/${n.rdev[1]})`;
    const d = n.data || '';
    if (!d && !n.fsize) return 'empty';
    if (d.startsWith('#!sim:')) return 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, for GNU/Linux 3.2.0, stripped';
    if (d.startsWith('\x7fELF')) {
      if (/shared object/.test(d)) return 'ELF 64-bit LSB shared object, x86-64, version 1 (GNU/Linux), dynamically linked, stripped';
      return 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, stripped' + (/setuid/.test(d) ? ' (setuid)' : '');
    }
    if (d.startsWith('SIMGZ\n')) return `gzip compressed data, was "${(name || '').replace(/\.gz$|\.tgz$/, '').split('/').pop()}", from Unix, original size modulo 2^32 ${SIM.byteLen(d) - 6}`;
    if (d.startsWith('SIMBZ2\n')) return 'bzip2 compressed data, block size = 900k';
    if (d.startsWith('SIMXZ\n')) return 'XZ compressed data, checksum CRC64';
    if (d.startsWith('SIMTAR\n')) return 'POSIX tar archive (GNU)';
    if (d.startsWith('SIMCPIO\n')) return 'ASCII cpio archive (SVR4 with no CRC)';
    if (d.startsWith('!<arch>\ndebian')) return 'Debian binary package (format 2.0), with control.tar.xz, data compression xz';
    if (d.startsWith('\xed\xab\xee\xdb') || /\.rpm$/.test(name || '')) return 'RPM v3.0 bin i386/x86_64';
    if (d.startsWith('TZif')) return 'timezone data (TZif, version 2)';
    if (d.startsWith('PE32')) return d.split('\n')[0];
    if (d.startsWith('Linux kernel')) return 'Linux kernel x86 boot executable bzImage, version 6.1.0-18-amd64';
    if (d.startsWith('ASCII cpio')) return 'ASCII cpio archive (SVR4 with no CRC)';
    if (d.startsWith('-----BEGIN OPENSSH PRIVATE KEY')) return 'OpenSSH private key';
    if (d.startsWith('-----BEGIN PGP')) return 'PGP armored data';
    if (d.startsWith('GPGSIM')) return 'GPG symmetrically encrypted data (AES256 cipher)';
    if (d.startsWith('ssh-')) return 'OpenSSH ' + d.split('-')[1].split(' ')[0].toUpperCase() + ' public key';
    if (d.startsWith('(binary')) return 'data';
    if (d.startsWith('\0')) return 'data';
    const first = d.split('\n')[0];
    let kind = 'ASCII text';
    if (/[^\x00-\x7f]/.test(d)) kind = 'Unicode text, UTF-8 text';
    if (first.startsWith('#!')) {
      const interp = first.slice(2).trim().split(/[\s/]/).filter(Boolean);
      const i = interp[interp.length - 1] === 'env' ? interp[interp.length - 1] : interp.pop();
      const map = { bash: 'Bourne-Again shell script', sh: 'POSIX shell script', python3: 'Python script', perl: 'Perl script', zsh: 'Paul Falstad\'s zsh script' };
      return (map[i] || `a ${first.slice(2).trim()} script`) + ', ' + kind + ' executable';
    }
    if (/^<!DOCTYPE html|^<html|^<h1>/i.test(d)) return 'HTML document, ' + kind;
    if (/\.csv$/.test(name || '')) return 'CSV ' + kind;
    if (/\[\w+\]\n/.test(d) && /\.(ini|conf|service|timer|repo)$/.test(name || '')) return kind;
    return kind + (/\r\n/.test(d) ? ', with CRLF line terminators' : '');
  };
  C.file = (c) => {
    const { o, rest } = getopt(c.args, 'bLiz', { brief: 'b', 'mime-type': 'i', dereference: 'L' });
    if (!rest.length) return c.fail('Usage: file [-bLiz] file...', 1);
    for (const f of rest) {
      const r = c.fs.tryLookup(f, c.sh.cwd, !!o.L);
      let t;
      if (!r) t = `cannot open \`${f}' (No such file or directory)`;
      else if (r.node.t === 'f' && !c.fs.can(r.node, 4)) t = `regular file, no read permission`;
      else t = SIM.fileType(r.node, f);
      if (o.i) t = r ? (r.node.t === 'd' ? 'inode/directory' : /text|script/.test(t) ? 'text/plain' : /gzip/.test(t) ? 'application/gzip' : 'application/octet-stream') : t;
      c.out((o.b ? '' : f + ': ') + t + '\n');
    }
  };

  /* ---------------- find ---------------- */
  C.find = (c) => {
    const sh = c.sh;
    const fs = c.fs;
    const args = c.args.slice();
    const paths = [];
    let follow = false;
    while (args.length && (args[0] === '-L' || args[0] === '-P' || args[0] === '-H')) follow = args.shift() === '-L';
    while (args.length && !/^[-!(]/.test(args[0])) paths.push(args.shift());
    if (!paths.length) paths.push('.');
    let maxDepth = Infinity;
    let minDepth = 0;
    let depthFirst = false;
    let xdev = false;
    let hasAction = false;
    const plusExec = [];
    let p = 0;
    const now = Date.now();
    const err = (m) => {
      const e = new Error(m);
      e.user = true;
      throw e;
    };
    const num = (s, unitFn) => {
      const m = /^([+-]?)(\d+)(.*)$/.exec(s || '');
      if (!m) err(`invalid argument \`${s}'`);
      return { cmp: m[1], n: +m[2], unit: m[3] };
    };
    const cmpN = (v, spec) => (spec.cmp === '+' ? v > spec.n : spec.cmp === '-' ? v < spec.n : v === spec.n);
    function parseOr() {
      let a = parseAnd();
      while (args[p] === '-o' || args[p] === '-or') {
        p++;
        const b = parseAnd();
        const x = a;
        a = (e) => x(e) || b(e);
      }
      return a;
    }
    function parseAnd() {
      let a = parseNot();
      while (p < args.length && args[p] !== '-o' && args[p] !== '-or' && args[p] !== ')') {
        if (args[p] === '-a' || args[p] === '-and') p++;
        const b = parseNot();
        const x = a;
        a = (e) => x(e) && b(e);
      }
      return a;
    }
    function parseNot() {
      if (args[p] === '!' || args[p] === '-not') {
        p++;
        const x = parseNot();
        return (e) => !x(e);
      }
      return parsePrim();
    }
    function parsePrim() {
      const t = args[p++];
      const val = () => {
        if (p >= args.length) err(`missing argument to \`${t}'`);
        return args[p++];
      };
      switch (t) {
        case '(': {
          const x = parseOr();
          if (args[p++] !== ')') err("invalid expression; I was expecting to find a ')' somewhere but did not see one.");
          return x;
        }
        case '-name': {
          const re = SIM.globToRegex(val());
          return (e) => re.test(e.name);
        }
        case '-iname': {
          const re = new RegExp(SIM.globToRegex(val()).source, 'i');
          return (e) => re.test(e.name);
        }
        case '-path':
        case '-wholename': {
          const re = new RegExp(SIM.globToRegex(val()).source.replace(/\[\^\/\]\*/g, '.*'));
          return (e) => re.test(e.path);
        }
        case '-ipath': {
          const re = new RegExp(SIM.globToRegex(val()).source.replace(/\[\^\/\]\*/g, '.*'), 'i');
          return (e) => re.test(e.path);
        }
        case '-regex': {
          const re = new RegExp('^' + val() + '$');
          return (e) => re.test(e.path);
        }
        case '-type': {
          const ty = val();
          return (e) => ty.split(',').some((x) => (x === 'f' ? e.node.t === 'f' : x === e.node.t));
        }
        case '-size': {
          const s = num(val());
          const u = { c: 1, w: 2, b: 512, k: 1024, M: 1048576, G: 1073741824, '': 512 }[s.unit];
          if (!u) err(`invalid -size type \`${s.unit}'`);
          return (e) => e.node.t !== 'd' && cmpN(Math.ceil(SIM.fsize(e.node) / u), s);
        }
        case '-empty':
          return (e) => (e.node.t === 'd' ? !Object.keys(e.node.ents).length : e.node.t === 'f' && !SIM.fsize(e.node));
        case '-perm': {
          let v = val();
          let mode = 'exact';
          if (v[0] === '-') {
            mode = 'all';
            v = v.slice(1);
          } else if (v[0] === '/' || v[0] === '+') {
            mode = 'any';
            v = v.slice(1);
          }
          const bits = /^[0-7]+$/.test(v) ? parseInt(v, 8) : SIM.applyMode(v, 0, false);
          return (e) => {
            const m = e.node.mode & 0o7777;
            if (mode === 'exact') return m === bits;
            if (mode === 'all') return (m & bits) === bits;
            return bits === 0 || (m & bits) !== 0;
          };
        }
        case '-user': {
          const u = val();
          const uid = /^\d+$/.test(u) ? +u : (sh.user(u) || {}).uid;
          if (uid === undefined) err(`'${u}' is not the name of a known user`);
          return (e) => e.node.uid === uid;
        }
        case '-uid': {
          const s = num(val());
          return (e) => cmpN(e.node.uid, s);
        }
        case '-group': {
          const g = val();
          const gid = /^\d+$/.test(g) ? +g : (sh.group(g) || {}).gid;
          if (gid === undefined) err(`'${g}' is not the name of an existing group`);
          return (e) => e.node.gid === gid;
        }
        case '-gid': {
          const s = num(val());
          return (e) => cmpN(e.node.gid, s);
        }
        case '-nouser': {
          const uids = new Set(sh.passwd().map((u) => u.uid));
          return (e) => !uids.has(e.node.uid);
        }
        case '-nogroup': {
          const gids = new Set(sh.groupDb().map((g) => g.gid));
          return (e) => !gids.has(e.node.gid);
        }
        case '-mtime':
        case '-atime':
        case '-ctime': {
          const s = num(val());
          const k = t[1] + 'time';
          return (e) => cmpN(Math.floor((now - e.node[k]) / 86400000), s);
        }
        case '-mmin':
        case '-amin':
        case '-cmin': {
          const s = num(val());
          const k = t[1] + 'time';
          return (e) => cmpN(Math.ceil((now - e.node[k]) / 60000), s);
        }
        case '-newer': {
          const ref = fs.lookup(val(), sh.cwd).node.mtime;
          return (e) => e.node.mtime > ref;
        }
        case '-links': {
          const s = num(val());
          return (e) => cmpN(e.node.nlink, s);
        }
        case '-inum': {
          const s = num(val());
          return (e) => cmpN(e.ino, s);
        }
        case '-samefile': {
          const ino = fs.lookup(val(), sh.cwd).ino;
          return (e) => e.ino === ino;
        }
        case '-executable':
          return (e) => fs.can(e.node, 1);
        case '-readable':
          return (e) => fs.can(e.node, 4);
        case '-writable':
          return (e) => fs.can(e.node, 2);
        case '-true':
          return () => true;
        case '-false':
          return () => false;
        case '-maxdepth':
          maxDepth = +val();
          return () => true;
        case '-mindepth':
          minDepth = +val();
          return () => true;
        case '-depth':
          depthFirst = true;
          return () => true;
        case '-xdev':
        case '-mount':
          xdev = true;
          return () => true;
        case '-follow':
          follow = true;
          return () => true;
        case '-print':
          hasAction = true;
          return (e) => (c.out(e.path + '\n'), true);
        case '-print0':
          hasAction = true;
          return (e) => (c.out(e.path + '\0'), true);
        case '-printf': {
          hasAction = true;
          const f = val();
          return (e) => {
            c.out(
              f
                .replace(/%([pfshmMugUGitdl%])/g, (m, k) =>
                  ({
                    p: e.path,
                    f: e.name,
                    s: String(SIM.fsize(e.node)),
                    h: e.path.slice(0, e.path.lastIndexOf('/')) || '.',
                    m: (e.node.mode & 0o7777).toString(8),
                    M: SIM.modeString(e.node),
                    u: sh.uname(e.node.uid),
                    g: sh.gname(e.node.gid),
                    U: String(e.node.uid),
                    G: String(e.node.gid),
                    i: String(e.ino),
                    t: new Date(e.node.mtime).toString().slice(0, 24),
                    d: String(e.depth),
                    l: e.node.target || '',
                    '%': '%',
                  }[k])
                )
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
            );
            return true;
          };
        }
        case '-ls':
          hasAction = true;
          return (e) => {
            const n = e.node;
            c.out(`${String(e.ino).padStart(7)} ${String(blocks(n)).padStart(4)} ${SIM.modeString(n)} ${String(n.nlink).padStart(3)} ${sh.uname(n.uid).padEnd(8)} ${sh.gname(n.gid).padEnd(8)} ${String(SIM.fsize(n)).padStart(8)} ${fmtDate(n.mtime)} ${e.path}${n.t === 'l' ? ' -> ' + n.target : ''}\n`);
            return true;
          };
        case '-delete':
          hasAction = true;
          depthFirst = true;
          return (e) => {
            try {
              if (e.node.t === 'd') fs.rmdir(e.path, sh.cwd);
              else fs.unlink(e.path, sh.cwd);
            } catch (er) {
              c.err(`find: cannot delete '${e.path}': ${er.message}\n`);
            }
            return true;
          };
        case '-prune':
          return (e) => {
            e.prune = true;
            return true;
          };
        case '-exec':
        case '-execdir':
        case '-ok': {
          hasAction = true;
          const cmd = [];
          while (p < args.length && args[p] !== ';' && args[p] !== '+') cmd.push(args[p++]);
          if (p >= args.length) err(`missing argument to \`${t}'`);
          const plus = args[p++] === '+';
          if (plus) {
            const entry = { cmd, files: [] };
            plusExec.push(entry);
            return (e) => (entry.files.push(e.path), true);
          }
          return (e) => {
            const argv = cmd.map((a) => a.split('{}').join(e.path));
            if (t === '-ok' && sh.promptFn) {
              const a = sh.promptFn(`< ${argv.join(' ')} ... ${e.path} > ? (y/n)`);
              if (!a || !/^y/i.test(a)) return false;
            }
            return sh.exec(argv, c.io) === 0;
          };
        }
        default:
          if (t === undefined) err('expected an expression');
          err(`unknown predicate \`${t}'`);
      }
    }
    let expr = () => true;
    if (args.length) {
      expr = parseOr();
      if (p < args.length) err(`paths must precede expression: \`${args[p]}'`);
    }
    let st = 0;
    const visit = (path, depth, dev) => {
      sh.tick();
      let r;
      try {
        r = fs.lookup(path, sh.cwd, follow || depth === 0);
      } catch (e) {
        c.err(`find: '${path}': ${e.message}\n`);
        st = 1;
        return;
      }
      const name = depth === 0 ? path : path.split('/').pop();
      const e = { path, name, node: r.node, ino: r.ino, depth };
      if (!depthFirst && depth >= minDepth) {
        if (expr(e) && !hasAction) c.out(path + '\n');
      }
      if (r.node.t === 'd' && depth < maxDepth && !e.prune && !(xdev && dev && r.node.dev !== dev)) {
        if (!fs.can(r.node, 4) || !fs.can(r.node, 1)) {
          c.err(`find: '${path}': Permission denied\n`);
          st = 1;
        } else {
          for (const n of Object.keys(r.node.ents).sort()) visit((path === '/' ? '' : path.replace(/\/$/, '')) + '/' + n, depth + 1, dev || r.node.dev);
        }
      }
      if (depthFirst && depth >= minDepth) {
        if (expr(e) && !hasAction) c.out(path + '\n');
      }
    };
    for (const pth of paths) visit(pth, 0, null);
    for (const pe of plusExec) {
      if (pe.files.length) {
        const i = pe.cmd.indexOf('{}');
        const argv = i >= 0 ? [...pe.cmd.slice(0, i), ...pe.files, ...pe.cmd.slice(i + 1)] : [...pe.cmd, ...pe.files];
        sh.exec(argv, c.io);
      }
    }
    return st;
  };

  /* ---------------- locate / updatedb / whereis / which ---------------- */
  function buildLocateDb(c) {
    const list = [];
    const fs = c.fs;
    const save = fs.cred;
    fs.cred = { uid: 0, gid: 0, groups: [0] };
    fs.walk('/', '/', (p) => {
      if (/^\/(proc|sys|dev|run|tmp)(\/|$)/.test(p)) return;
      list.push(p);
    });
    fs.cred = save;
    c.sh.state.locate = { list, time: Date.now() };
  }
  C.updatedb = (c) => {
    if (c.sh.uid !== 0) return c.fail("can not open a temporary file for `/var/lib/mlocate/mlocate.db'");
    buildLocateDb(c);
    c.fs.writeFile('/var/lib/mlocate/mlocate.db', '/', '(binary locate database)\n');
  };
  SIM.sbin.add('updatedb');
  C.locate = (c) => {
    const { o, rest } = getopt(c.args, 'icl:n:breS0Aq', { 'ignore-case': 'i', count: 'c', 'limit=': 'l', basename: 'b', 'regex': 'r', existing: 'e', statistics: 'S' });
    if (!c.sh.state.locate) buildLocateDb(c);
    const db = c.sh.state.locate.list;
    if (o.S) {
      c.out(`Database /var/lib/mlocate/mlocate.db:\n\t${db.filter((p) => !/\./.test(p.split('/').pop())).length} directories\n\t${db.length} files\n\t${db.join('').length} bytes in file names\n`);
      return 0;
    }
    if (!rest.length) return c.fail('no pattern to search for specified');
    let res = db.filter((p) =>
      rest.some((pat) => {
        const target = o.b ? p.split('/').pop() : p;
        if (o.r) return new RegExp(pat, o.i ? 'i' : '').test(target);
        if (SIM.hasGlob(pat)) return new RegExp(SIM.globToRegex(pat).source.replace(/\[\^\/\]/g, '.'), o.i ? 'i' : '').test(target);
        return o.i ? target.toLowerCase().indexOf(pat.toLowerCase()) >= 0 : target.indexOf(pat) >= 0;
      })
    );
    if (o.e) res = res.filter((p) => c.fs.exists(p));
    const lim = o.l || o.n;
    if (lim) res = res.slice(0, +lim);
    if (o.c) c.out(res.length + '\n');
    else res.forEach((r) => c.out(r + '\n'));
    return res.length ? 0 : 1;
  };
  C.plocate = C.locate;
  C.mlocate = C.locate;
  C.whereis = (c) => {
    const { o, rest } = getopt(c.args, 'bmsu', {});
    const all = !o.b && !o.m && !o.s;
    for (const n of rest) {
      const found = [];
      if (all || o.b) for (const d of ['/usr/bin', '/usr/sbin', '/usr/local/bin', '/usr/local/sbin', '/etc']) if (c.fs.exists(d + '/' + n) && (d !== '/etc' || true)) found.push(d + '/' + n);
      if (all || o.m)
        for (const s of [1, 5, 8]) {
          const p = `/usr/share/man/man${s}/${n}.${s}.gz`;
          if (c.fs.exists(p)) found.push(p);
        }
      if (all || o.s) if (c.fs.exists('/usr/share/doc/' + n)) found.push('/usr/share/doc/' + n);
      c.out(`${n}:${found.length ? ' ' + found.join(' ') : ''}\n`);
    }
  };
  C.which = (c) => {
    const all = c.args.indexOf('-a') >= 0;
    let st = 0;
    for (const n of c.args.filter((a) => a !== '-a')) {
      let found = false;
      for (const d of (c.sh.vars.PATH || '').split(':')) {
        const p = d + '/' + n;
        const r = c.fs.tryLookup(p, '/');
        if (r && r.node.t === 'f' && r.node.mode & 0o111) {
          c.out(p + '\n');
          found = true;
          if (!all) break;
        }
      }
      if (!found) st = 1;
    }
    return st;
  };

  /* ---------------- du / df ---------------- */
  C.du = (c) => {
    const { o, rest } = getopt(c.args, 'shacd:xbkm', { summarize: 's', 'human-readable': 'h', all: 'a', total: 'c', 'max-depth=': 'd', bytes: 'b', 'apparent-size': 'A' });
    const targets = rest.length ? rest : ['.'];
    const fs = c.fs;
    let total = 0;
    const fmt = (k) => (o.h ? human(k * 1024) : o.b ? String(k * 1024) : o.m ? String(Math.ceil(k / 1024)) : String(k));
    const maxD = o.s ? 0 : o.d !== undefined ? +o.d : Infinity;
    for (const t of targets) {
      const rec = (path, depth) => {
        let r;
        try {
          r = fs.lookup(path, c.sh.cwd, depth === 0);
        } catch (e) {
          c.err(`du: cannot access '${path}': ${e.message}\n`);
          return 0;
        }
        let size = blocks(r.node);
        if (r.node.t === 'd') {
          if (!fs.can(r.node, 4)) {
            c.err(`du: cannot read directory '${path}': Permission denied\n`);
            return size;
          }
          for (const n of Object.keys(r.node.ents).sort()) size += rec(path.replace(/\/$/, '') + '/' + n, depth + 1);
          if (depth <= maxD) c.out(`${fmt(size)}\t${path}\n`);
        } else if ((o.a && depth <= maxD) || depth === 0) c.out(`${fmt(size)}\t${path}\n`);
        return size;
      };
      total += rec(t, 0);
    }
    if (o.c) c.out(`${fmt(total)}\ttotal\n`);
  };
  SIM.dfRows = function (sh) {
    const rows = [
      { fs: 'udev', type: 'devtmpfs', size: 1980000, used: 0, on: '/dev', inodes: 495000, iused: 420 },
      { fs: 'tmpfs', type: 'tmpfs', size: 402828, used: 1180, on: '/run', inodes: 503531, iused: 820 },
      { fs: '/dev/sda2', type: 'ext4', size: 36508600, used: 9422120, on: '/', inodes: 2330624, iused: 229284 },
      { fs: 'tmpfs', type: 'tmpfs', size: 2014124, used: 0, on: '/dev/shm', inodes: 503531, iused: 1 },
      { fs: '/dev/sda1', type: 'vfat', size: 523248, used: 5972, on: '/boot/efi', inodes: 0, iused: 0 },
      { fs: 'tmpfs', type: 'tmpfs', size: 1048576, used: 48, on: '/tmp', inodes: 503531, iused: 12 },
      { fs: 'tmpfs', type: 'tmpfs', size: 402824, used: 64, on: '/run/user/1000', inodes: 100706, iused: 80 },
    ];
    for (const m of sh.fs.mounts) {
      const d = sh.fs.devices[m.dev] || {};
      const sizeK = { '20G': 20511312, '10G': 10218772, '5G': 5074592, '9G': 9175040, '1G': 1048576 }[d.size] || 10218772;
      rows.push({ fs: m.dev, type: m.fstype, size: sizeK, used: m.fstype === 'xfs' ? 104136 : 24 + 4 * Object.keys(sh.fs.node(m.root).ents).length, on: m.target, inodes: 655360, iused: 11 });
    }
    return rows;
  };
  C.df = (c) => {
    const { o, rest } = getopt(c.args, 'hHiTt:x:alkmP', { 'human-readable': 'h', inodes: 'i', 'print-type': 'T', 'type=': 't', 'exclude-type=': 'x', all: 'a', local: 'l' });
    let rows = SIM.dfRows(c.sh);
    if (o.t) rows = rows.filter((r) => r.type === o.t);
    if (o.x) rows = rows.filter((r) => r.type !== o.x);
    if (rest.length) {
      const pick = [];
      for (const p of rest) {
        const abs = c.fs.normalize(p, c.sh.cwd);
        const dev = rows.find((r) => r.fs === p);
        if (dev) {
          pick.push(dev);
          continue;
        }
        let best = null;
        for (const r of rows) if (abs === r.on || abs.startsWith(r.on === '/' ? '/' : r.on + '/')) if (!best || r.on.length > best.on.length) best = r;
        if (best) pick.push(best);
      }
      rows = pick;
    }
    const H = o.h || o.H;
    const f = (k) => (H ? human(k * 1024, o.H) : o.m ? String(Math.ceil(k / 1024)) : String(k));
    const table = [[o.T ? 'Filesystem     Type' : 'Filesystem', o.i ? 'Inodes' : H ? 'Size' : '1K-blocks', o.i ? 'IUsed' : 'Used', o.i ? 'IFree' : 'Avail', o.i ? 'IUse%' : 'Use%', 'Mounted on']];
    for (const r of rows) {
      const name = o.T ? r.fs.padEnd(14) + ' ' + r.type : r.fs;
      if (o.i) table.push([name, String(r.inodes), String(r.iused), String(r.inodes - r.iused), r.inodes ? Math.ceil((r.iused / r.inodes) * 100) + '%' : '-', r.on]);
      else table.push([name, f(r.size), f(r.used), f(Math.max(0, r.size - r.used - (r.type === 'ext4' ? Math.floor(r.size * 0.05) : 0))), Math.ceil((r.used / r.size) * 100) + '%', r.on]);
    }
    const w = table[0].map((_, i) => Math.max(...table.map((t) => t[i].length)));
    c.out(table.map((t) => t.map((x, i) => (i === 0 || i === 5 ? x.padEnd(w[i]) : x.padStart(w[i]))).join(' ').trimEnd()).join('\n') + '\n');
  };

  /* ---------------- archives & compression ---------------- */
  const ZMARK = { gzip: 'SIMGZ\n', bzip2: 'SIMBZ2\n', xz: 'SIMXZ\n' };
  const ZEXT = { gzip: '.gz', bzip2: '.bz2', xz: '.xz' };
  const ZRATIO = { gzip: 0.42, bzip2: 0.38, xz: 0.33 };
  SIM.zwrap = (kind, data) => ZMARK[kind] + data;
  SIM.zunwrap = (data) => {
    for (const k of Object.keys(ZMARK)) if (data.startsWith(ZMARK[k])) return { kind: k, data: data.slice(ZMARK[k].length) };
    return null;
  };
  function compressor(kind, mode) {
    return (c) => {
      const { o, rest } = getopt(c.args, 'cdkfvlrtq123456789', { stdout: 'c', decompress: 'd', keep: 'k', force: 'f', verbose: 'v', list: 'l', test: 't', recursive: 'r', best: '9', fast: '1' });
      let decompress = mode === 'd' || o.d;
      const toStdout = mode === 'cat' || o.c;
      const fs = c.fs;
      if (!rest.length) {
        if (c.stdin === null) return c.fail('compressed data not written to a terminal. Use -f to force compression.');
        if (decompress || mode === 'cat') {
          const u = SIM.zunwrap(c.stdin);
          if (!u) return c.fail('stdin: not in gzip format');
          c.out(u.data);
        } else c.out(SIM.zwrap(kind, c.stdin));
        return 0;
      }
      let st = 0;
      for (const f of rest) {
        try {
          const r = fs.lookup(f, c.sh.cwd);
          if (r.node.t === 'd') {
            c.err(`${c.name}: ${f} is a directory -- ignored\n`);
            st = 2;
            continue;
          }
          const data = fs.readFile(f, c.sh.cwd);
          if (o.l) {
            const u = SIM.zunwrap(data);
            if (!u) throw new Error(`${f}: not in ${kind} format`);
            c.out(`         compressed        uncompressed  ratio uncompressed_name\n${String(SIM.fsize(r.node)).padStart(19)} ${String(SIM.byteLen(u.data)).padStart(19)}  ${(100 - ZRATIO[kind] * 100).toFixed(1)}% ${f.replace(ZEXT[kind], '')}\n`);
            continue;
          }
          if (decompress || mode === 'cat') {
            const u = SIM.zunwrap(data);
            if (!u) throw new Error(`${f}: not in ${kind} format`);
            if (toStdout) {
              c.out(u.data);
              continue;
            }
            const outName = f.endsWith(ZEXT[kind]) ? f.slice(0, -ZEXT[kind].length) : f.endsWith('.tgz') ? f.slice(0, -4) + '.tar' : f + '.out';
            if (fs.exists(outName, c.sh.cwd) && !o.f) throw new Error(`${outName} already exists; not overwritten`);
            const n = fs.writeFile(outName, c.sh.cwd, u.data);
            n.mode = r.node.mode;
            n.mtime = r.node.mtime;
            if (!o.k) fs.unlink(f, c.sh.cwd);
            if (o.v) c.err(`${f}:\t ${(100 - ZRATIO[kind] * 100).toFixed(1)}% -- replaced with ${outName}\n`);
          } else {
            if (f.endsWith(ZEXT[kind])) {
              c.err(`${c.name}: ${f} already has ${ZEXT[kind]} suffix -- unchanged\n`);
              continue;
            }
            const z = SIM.zwrap(kind, data);
            if (toStdout) {
              c.out(z);
              continue;
            }
            const outName = f + ZEXT[kind];
            if (fs.exists(outName, c.sh.cwd) && !o.f) throw new Error(`${outName} already exists; not overwritten`);
            const n = fs.writeFile(outName, c.sh.cwd, z);
            n.fsize = Math.max(20, Math.ceil(SIM.byteLen(data) * ZRATIO[kind]) + 20);
            n.mode = r.node.mode;
            n.mtime = r.node.mtime;
            if (!o.k) fs.unlink(f, c.sh.cwd);
            if (o.v) c.err(`${f}:\t ${(100 - ZRATIO[kind] * 100).toFixed(1)}% -- replaced with ${outName}\n`);
          }
        } catch (e) {
          c.err(`${c.name}: ${e.fs ? f + ': ' : ''}${e.message}\n`);
          st = 1;
        }
      }
      return st;
    };
  }
  C.gzip = compressor('gzip');
  C.gunzip = compressor('gzip', 'd');
  C.zcat = compressor('gzip', 'cat');
  C.bzip2 = compressor('bzip2');
  C.bunzip2 = compressor('bzip2', 'd');
  C.bzcat = compressor('bzip2', 'cat');
  C.xz = compressor('xz');
  C.unxz = compressor('xz', 'd');
  C.xzcat = compressor('xz', 'cat');
  C.zless = C.zcat;
  C.zmore = C.zcat;
  C.zgrep = (c) => {
    const files = c.args.filter((a, i) => i > 0 && !a.startsWith('-'));
    let data = '';
    for (const f of files) {
      const u = SIM.zunwrap(c.fs.readFile(f, c.sh.cwd));
      data += u ? u.data : c.fs.readFile(f, c.sh.cwd);
    }
    return c.sh.exec(['grep', ...c.args.filter((a) => files.indexOf(a) < 0)], { ...c.io, stdin: new SIM.Stream(data) });
  };

  function collectArchive(c, paths, opts) {
    const fs = c.fs;
    const entries = [];
    let warned = false;
    for (const p of paths) {
      const rec = (path) => {
        const r = fs.lookup(path, c.sh.cwd, false);
        let name = path;
        if (name.startsWith('/')) {
          if (!warned && opts.warn) {
            c.err("tar: Removing leading `/' from member names\n");
            warned = true;
          }
          name = name.replace(/^\/+/, '');
        }
        if (opts.exclude && opts.exclude.some((x) => SIM.patMatch(path.split('/').pop(), x))) return;
        const n = r.node;
        const e = { p: name + (n.t === 'd' ? '/' : ''), t: n.t, mode: n.mode, uid: n.uid, gid: n.gid, mtime: n.mtime, size: SIM.fsize(n) };
        if (n.t === 'f') {
          if (!fs.can(n, 4)) {
            c.err(`tar: ${path}: Cannot open: Permission denied\n`);
            return;
          }
          e.data = n.data || '';
        }
        if (n.t === 'l') e.target = n.target;
        entries.push(e);
        if (n.t === 'd') for (const k of Object.keys(n.ents).sort()) rec(path.replace(/\/$/, '') + '/' + k);
      };
      rec(p);
    }
    return entries;
  }
  function tarLine(c, e, verbose) {
    if (!verbose) return e.p + '\n';
    const d = new Date(e.mtime);
    const date = d.toISOString().slice(0, 10) + ' ' + d.toTimeString().slice(0, 5);
    return `${SIM.modeString({ t: e.t, mode: e.mode })} ${c.sh.uname(e.uid)}/${c.sh.gname(e.gid)} ${String(e.size).padStart(8)} ${date} ${e.p}${e.t === 'l' ? ' -> ' + e.target : ''}\n`;
  }
  C.tar = (c) => {
    let args = c.args.slice();
    // old style "tar czvf file" without dash
    if (args.length && /^[a-zA-Z]+$/.test(args[0]) && /[cxtru]/.test(args[0])) args[0] = '-' + args[0];
    const { o, rest } = getopt(args, 'cxtrupvzjJf:C:kOTwP', {
      create: 'c',
      extract: 'x',
      get: 'x',
      list: 't',
      append: 'r',
      verbose: 'v',
      gzip: 'z',
      bzip2: 'j',
      xz: 'J',
      'file=': 'f',
      'directory=': 'C',
      'exclude=': 'exclude',
      'keep-old-files': 'k',
      'to-stdout': 'O',
      'preserve-permissions': 'p',
      'absolute-names': 'P',
    }, { multi: ['exclude'] });
    const fs = c.fs;
    const modes = ['c', 'x', 't', 'r', 'u'].filter((m) => o[m]);
    if (modes.length !== 1) return c.fail("You must specify one of the '-Acdtrux', '--delete' or '--test-label' options", 2);
    const kind = o.z ? 'gzip' : o.j ? 'bzip2' : o.J ? 'xz' : null;
    const file = o.f;
    const baseDir = o.C ? fs.lookup(o.C, c.sh.cwd).path : c.sh.cwd;
    const run = (fn) => {
      const save = c.sh.cwd;
      c.sh.cwd = baseDir;
      try {
        return fn();
      } finally {
        c.sh.cwd = save;
      }
    };
    const readArchive = () => {
      let data = file && file !== '-' ? fs.readFile(file, c.sh.cwd) : c.stdin || '';
      const u = SIM.zunwrap(data);
      if (u) data = u.data;
      if (!data.startsWith('SIMTAR\n')) throw new Error('This does not look like a tar archive');
      return JSON.parse(data.slice(7));
    };
    if (o.c || o.r) {
      if (!rest.length) return c.fail('Cowardly refusing to create an empty archive', 2);
      const entries = run(() => collectArchive(c, rest, { warn: !o.P, exclude: o.exclude }));
      let all = entries;
      if (o.r && file && fs.exists(file, c.sh.cwd)) all = readArchive().concat(entries);
      if (o.v) for (const e of entries) (file === '-' || !file ? c.err : c.out)(tarLine(c, e, o.v === true && false));
      let data = 'SIMTAR\n' + JSON.stringify(all);
      if (kind) data = SIM.zwrap(kind, data);
      if (!file || file === '-') c.out(data);
      else {
        const n = fs.writeFile(file, c.sh.cwd, data);
        const raw = all.reduce((a, e) => a + 512 + Math.ceil((e.size || 0) / 512) * 512, 1024);
        n.fsize = kind ? Math.ceil(raw * ZRATIO[kind] * 0.5) + 40 : Math.ceil(raw / 10240) * 10240;
      }
      return 0;
    }
    const entries = readArchive();
    const want = rest.length ? (e) => rest.some((r) => e.p === r || e.p === r + '/' || e.p.startsWith(r.replace(/\/$/, '') + '/')) : () => true;
    if (o.t) {
      for (const e of entries) if (want(e)) c.out(tarLine(c, e, o.v));
      return 0;
    }
    // extract
    return run(() => {
      let st = 0;
      for (const e of entries) {
        if (!want(e)) continue;
        if (o.O) {
          if (e.t === 'f') c.out(e.data);
          continue;
        }
        if (o.v) c.out(tarLine(c, e, false));
        const p = e.p.replace(/\/$/, '');
        try {
          if (e.t === 'd') {
            if (!fs.tryLookup(p, c.sh.cwd)) fs.mkdirp(p, c.sh.cwd);
            const n = fs.lookup(p, c.sh.cwd).node;
            n.mode = e.mode;
          } else {
            const dir = p.indexOf('/') >= 0 ? p.slice(0, p.lastIndexOf('/')) : '';
            if (dir && !fs.tryLookup(dir, c.sh.cwd)) fs.mkdirp(dir, c.sh.cwd);
            if (fs.tryLookup(p, c.sh.cwd, false)) {
              if (o.k) {
                c.err(`tar: ${p}: Cannot open: File exists\n`);
                st = 2;
                continue;
              }
              fs.unlink(p, c.sh.cwd);
            }
            if (e.t === 'l') fs.symlink(e.target, p, c.sh.cwd);
            else {
              const n = fs.writeFile(p, c.sh.cwd, e.data || '');
              n.mode = o.p || c.sh.uid === 0 ? e.mode : e.mode & ~c.fs.umask;
              n.mtime = e.mtime;
              if (c.sh.uid === 0) {
                n.uid = e.uid;
                n.gid = e.gid;
              }
            }
          }
        } catch (er) {
          c.err(`tar: ${p}: Cannot open: ${er.message}\n`);
          st = 2;
        }
      }
      return st;
    });
  };
  C.cpio = (c) => {
    const { o, rest } = getopt(c.args, 'oitdvumH:F:', { create: 'o', extract: 'i', list: 't', 'make-directories': 'd', verbose: 'v', 'format=': 'H', 'file=': 'F' });
    const fs = c.fs;
    if (o.o) {
      const names = (c.stdin || '').split('\n').filter(Boolean);
      const entries = [];
      for (const n of names) {
        const r = fs.tryLookup(n, c.sh.cwd, false);
        if (!r) {
          c.err(`cpio: ${n}: Cannot stat: No such file or directory\n`);
          continue;
        }
        const e = { p: n.replace(/^\.\//, ''), t: r.node.t, mode: r.node.mode, uid: r.node.uid, gid: r.node.gid, mtime: r.node.mtime, size: SIM.fsize(r.node) };
        if (r.node.t === 'f') e.data = r.node.data || '';
        if (r.node.t === 'l') e.target = r.node.target;
        entries.push(e);
        if (o.v) c.err(n + '\n');
      }
      const data = 'SIMCPIO\n' + JSON.stringify(entries);
      if (o.F) fs.writeFile(o.F, c.sh.cwd, data);
      else c.out(data);
      c.err(`${Math.max(1, Math.ceil(data.length / 512))} blocks\n`);
      return 0;
    }
    let data = o.F ? fs.readFile(o.F, c.sh.cwd) : c.stdin || '';
    const u = SIM.zunwrap(data);
    if (u) data = u.data;
    if (!data.startsWith('SIMCPIO\n')) return c.fail('premature end of archive');
    const entries = JSON.parse(data.slice(8));
    for (const e of entries) {
      if (rest.length && !rest.some((r) => SIM.patMatch(e.p, r))) continue;
      if (o.t) {
        c.out((o.v ? tarLine(c, e, true) : e.p + '\n'));
        continue;
      }
      if (o.i) {
        if (o.v) c.err(e.p + '\n');
        const dir = e.p.indexOf('/') >= 0 ? e.p.slice(0, e.p.lastIndexOf('/')) : '';
        if (dir && !fs.tryLookup(dir, c.sh.cwd)) {
          if (!o.d) {
            c.err(`cpio: ${e.p}: Cannot open: No such file or directory\n`);
            continue;
          }
          fs.mkdirp(dir, c.sh.cwd);
        }
        if (e.t === 'd') {
          if (!fs.tryLookup(e.p, c.sh.cwd)) fs.mkdir(e.p, c.sh.cwd);
        } else if (e.t === 'l') fs.symlink(e.target, e.p, c.sh.cwd);
        else if (!fs.tryLookup(e.p, c.sh.cwd) || o.u) fs.writeFile(e.p, c.sh.cwd, e.data || '').mode = e.mode;
        else c.err(`cpio: ${e.p} not created: newer or same age version exists\n`);
      }
    }
    c.err(`${Math.max(1, Math.ceil(data.length / 512))} blocks\n`);
  };
  C.dd = (c) => {
    const kv = {};
    for (const a of c.args) {
      const [k, v] = a.split('=');
      kv[k] = v;
    }
    const size = (s) => {
      if (!s) return 512;
      const m = /^(\d+)([kKMG]?)(B?)$/.exec(s);
      if (!m) throw new Error(`invalid number: '${s}'`);
      const bin = { '': 1, k: 1024, K: 1024, M: 1048576, G: 1073741824 }[m[2]];
      const dec = { '': 1, k: 1000, K: 1000, M: 1e6, G: 1e9 }[m[2]];
      return +m[1] * (m[3] ? dec : bin);
    };
    const bs = size(kv.bs || kv.ibs);
    const fs = c.fs;
    let src = '';
    let srcDev = null;
    if (kv.if) {
      const r = fs.lookup(kv.if, c.sh.cwd);
      if (r.node.t === 'b' && c.sh.uid !== 0) throw SIM.fsErr('EACCES', kv.if);
      if (r.node.t === 'c' || r.node.t === 'b') srcDev = r.node.devname;
      else src = fs.readFile(kv.if, c.sh.cwd);
    } else src = c.stdin || '';
    const skip = kv.skip ? +kv.skip * bs : 0;
    let count = kv.count !== undefined ? +kv.count : null;
    let total;
    let data = '';
    if (srcDev) {
      if (count === null) count = srcDev === 'zero' || srcDev === 'urandom' || srcDev === 'random' ? 1 : 1;
      total = bs * count;
      if (srcDev === 'urandom' || srcDev === 'random') {
        for (let i = 0; i < Math.min(total, 4096); i++) data += String.fromCharCode(Math.floor(Math.random() * 256));
      }
    } else {
      data = src.slice(skip, count === null ? undefined : skip + bs * count);
      total = SIM.byteLen(data);
    }
    if (kv.of) {
      const r = fs.tryLookup(kv.of, c.sh.cwd);
      if (r && (r.node.t === 'b' || r.node.t === 'c')) {
        if (c.sh.uid !== 0) throw SIM.fsErr('EACCES', kv.of);
      } else {
        const n = fs.writeFile(kv.of, c.sh.cwd, data);
        if (srcDev) n.fsize = total;
      }
    } else c.out(data);
    const recs = Math.ceil(total / bs);
    const full = Math.floor(total / bs);
    const partial = recs - full;
    const secs = (0.0005 + total / 900e6).toFixed(6);
    const hum = (b) => (b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : b >= 1e3 ? (b / 1e3).toFixed(1) + ' kB' : b + ' B');
    if (kv.status !== 'none') c.err(`${full}+${partial} records in\n${full}+${partial} records out\n${total} bytes${total >= 1000 ? ` (${hum(total)}, ${human(total)}iB)` : ''} copied, ${secs} s, ${hum(total / secs)}/s\n`);
  };
  C.mktemp = (c) => {
    const { o, rest } = getopt(c.args, 'dupqt', { directory: 'd', 'tmpdir=': 'p' });
    const tpl = rest[0] || 'tmp.XXXXXXXXXX';
    const name = tpl.replace(/X+$/, (m) => Array.from({ length: m.length }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join(''));
    const path = name.startsWith('/') ? name : (rest[0] && !o.t ? '' : '/tmp/') + name;
    if (!o.u) {
      if (o.d) c.fs.mkdir(path, c.sh.cwd, 0o700);
      else c.fs.writeFile(path, c.sh.cwd, '', { mode: 0o600 });
    }
    c.out(path + '\n');
  };
  C.sync = () => 0;
  C.truncate = (c) => {
    const { o, rest } = getopt(c.args, 's:c', { 'size=': 's' });
    for (const f of rest) {
      let r = c.fs.tryLookup(f, c.sh.cwd);
      if (!r) {
        if (o.c) continue;
        c.fs.writeFile(f, c.sh.cwd, '');
        r = c.fs.lookup(f, c.sh.cwd);
      }
      const n = +String(o.s).replace(/[KMG]$/, (m) => ({ K: '000', M: '000000', G: '000000000' }[m]));
      const d = r.node.data || '';
      r.node.data = n <= d.length ? d.slice(0, n) : d + '\0'.repeat(Math.min(n - d.length, 4096));
      if (n > 4096) r.node.fsize = n;
    }
  };
  C.install = (c) => {
    const { o, rest } = getopt(c.args, 'dm:o:g:Dv', { 'mode=': 'm', 'owner=': 'o', 'group=': 'g', directory: 'd' });
    if (o.d) {
      for (const d of rest) {
        const n = c.fs.mkdirp(d, c.sh.cwd);
        if (o.m) n.mode = parseInt(o.m, 8);
      }
      return 0;
    }
    const dest = rest.pop();
    for (const s of rest) {
      const d = isDir(c, dest) ? dest + '/' + base(s) : dest;
      const n = c.fs.writeFile(d, c.sh.cwd, c.fs.readFile(s, c.sh.cwd));
      n.mode = o.m ? parseInt(o.m, 8) : 0o755;
      if (o.o) n.uid = c.sh.user(o.o).uid;
      if (o.g) n.gid = c.sh.group(o.g).gid;
    }
  };
  C.mkfifo = (c) => {
    for (const f of c.args.filter((a) => !a.startsWith('-'))) c.fs.create(f, c.sh.cwd, { t: 'p', mode: 0o666 & ~c.fs.umask });
  };
  C.mknod = (c) => {
    if (c.sh.uid !== 0) return c.fail('Operation not permitted');
    const [name, type, maj, min] = c.args;
    if (type === 'p') return C.mkfifo({ ...c, args: [name] });
    c.fs.create(name, c.sh.cwd, { t: type === 'b' ? 'b' : 'c', mode: 0o644, rdev: [+maj, +min], devname: name.split('/').pop() });
  };
})(typeof window !== 'undefined' ? window : globalThis);
