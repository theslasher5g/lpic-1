/* LPIC-1 Trainer — virtual filesystem (inode based, supports hard links,
 * symlinks, permissions, device nodes and mounted filesystems). */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});

  const ERR = {
    ENOENT: 'No such file or directory',
    ENOTDIR: 'Not a directory',
    EACCES: 'Permission denied',
    EEXIST: 'File exists',
    EISDIR: 'Is a directory',
    ENOTEMPTY: 'Directory not empty',
    ELOOP: 'Too many levels of symbolic links',
    EPERM: 'Operation not permitted',
    EBUSY: 'Device or resource busy',
    EXDEV: 'Invalid cross-device link',
    EINVAL: 'Invalid argument',
    EROFS: 'Read-only file system',
  };
  function fsErr(code, path) {
    const e = new Error(ERR[code] || code);
    e.code = code;
    e.path = path;
    e.fs = true;
    return e;
  }
  SIM.fsErr = fsErr;
  SIM.ERR = ERR;

  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  function byteLen(s) {
    if (!s) return 0;
    return enc ? enc.encode(s).length : s.length;
  }
  SIM.byteLen = byteLen;
  SIM.fsize = (n) => (n.t === 'd' ? 4096 : n.t === 'l' ? (n.target || '').length : n.t === 'b' || n.t === 'c' ? 0 : n.fsize !== undefined ? n.fsize : byteLen(n.data));

  class VFS {
    constructor() {
      this.inodes = {};
      this.next = 2;
      this.mounts = []; // {dev, on (ino), root (ino), fstype, opts, target}
      this.devices = {}; // '/dev/sdb1' -> {fstype, uuid, label, root, size}
      this.cred = { uid: 0, gid: 0, groups: [0] };
      this.umask = 0o022;
      const root = this._alloc({ t: 'd', mode: 0o755, uid: 0, gid: 0, ents: {}, dev: '/dev/sda2' });
      root.parent = root.ino;
      this.root = root.ino;
    }

    /* ---------- serialisation ---------- */
    toJSON() {
      return { inodes: this.inodes, next: this.next, mounts: this.mounts, devices: this.devices, root: this.root };
    }
    static fromJSON(o) {
      const v = new VFS();
      v.inodes = o.inodes;
      v.next = o.next;
      v.mounts = o.mounts || [];
      v.devices = o.devices || {};
      v.root = o.root;
      return v;
    }

    _alloc(props) {
      const now = Date.now();
      const n = Object.assign({ ino: this.next++, nlink: 1, mtime: now, ctime: now, atime: now }, props);
      if (n.t === 'd') n.nlink = 2;
      this.inodes[n.ino] = n;
      return n;
    }
    node(ino) {
      return this.inodes[ino];
    }

    /* ---------- permissions ---------- */
    can(n, bit) {
      const c = this.cred;
      if (c.uid === 0) {
        if (bit === 1 && n.t !== 'd') return (n.mode & 0o111) !== 0;
        return true;
      }
      let shift;
      if (n.uid === c.uid) shift = 6;
      else if (c.groups.indexOf(n.gid) >= 0 || n.gid === c.gid) shift = 3;
      else shift = 0;
      return ((n.mode >> shift) & bit) === bit;
    }
    isOwner(n) {
      return this.cred.uid === 0 || n.uid === this.cred.uid;
    }

    isRO(dev) {
      for (const m of this.mounts) if (m.dev === dev && /(^|,)ro(,|$)/.test(m.opts)) return true;
      return false;
    }
    mountAt(ino) {
      for (let i = this.mounts.length - 1; i >= 0; i--) if (this.mounts[i].on === ino) return this.mounts[i];
      return null;
    }

    /* ---------- path resolution ---------- */
    split(p) {
      return p.split('/').filter((x) => x !== '' && x !== '.');
    }
    _walk(comps, startIno, startPath, followLast, depth, full) {
      let cur = startIno;
      const p = startPath.slice();
      for (let i = 0; i < comps.length; i++) {
        const c = comps[i];
        const node = this.inodes[cur];
        if (node.t !== 'd') throw fsErr('ENOTDIR', full);
        if (!this.can(node, 1)) throw fsErr('EACCES', full);
        if (c === '..') {
          cur = node.parent;
          p.pop();
          continue;
        }
        let childIno = node.ents[c];
        if (childIno === undefined) {
          const e = fsErr('ENOENT', full);
          e.last = i === comps.length - 1;
          throw e;
        }
        let child = this.inodes[childIno];
        const m = child.t === 'd' ? this.mountAt(childIno) : null;
        if (m) {
          childIno = m.root;
          child = this.inodes[childIno];
        }
        if (child.t === 'l' && (i < comps.length - 1 || followLast)) {
          if (depth > 40) throw fsErr('ELOOP', full);
          const t = child.target;
          const r = t.startsWith('/')
            ? this._walk(this.split(t), this.root, [], true, depth + 1, full)
            : this._walk(this.split(t), cur, p, true, depth + 1, full);
          cur = r.ino;
          p.length = 0;
          p.push(...r.path);
          continue;
        }
        cur = childIno;
        p.push(c);
      }
      return { ino: cur, path: p };
    }
    abs(path, cwd) {
      if (!path.startsWith('/')) path = (cwd || '/') + '/' + path;
      return path;
    }
    // returns {ino, node, path}
    lookup(path, cwd, follow = true) {
      const full = this.abs(path, cwd);
      const r = this._walk(this.split(full), this.root, [], follow, 0, path);
      return { ino: r.ino, node: this.inodes[r.ino], path: '/' + r.path.join('/') };
    }
    tryLookup(path, cwd, follow = true) {
      try {
        return this.lookup(path, cwd, follow);
      } catch (e) {
        return null;
      }
    }
    exists(path, cwd) {
      return !!this.tryLookup(path, cwd, false);
    }
    // parent directory + basename
    lookupParent(path, cwd) {
      const full = this.abs(path, cwd).replace(/\/+$/, '') || '/';
      const idx = full.lastIndexOf('/');
      const dirPath = full.slice(0, idx) || '/';
      const name = full.slice(idx + 1);
      const d = this.lookup(dirPath, '/', true);
      if (d.node.t !== 'd') throw fsErr('ENOTDIR', path);
      return { dir: d.node, dirPath: d.path, name };
    }
    // logical normalisation (used by cd)
    normalize(path, cwd) {
      const full = this.abs(path, cwd);
      const out = [];
      for (const c of full.split('/')) {
        if (!c || c === '.') continue;
        if (c === '..') out.pop();
        else out.push(c);
      }
      return '/' + out.join('/');
    }

    /* ---------- creation / mutation ---------- */
    _touchDir(dir) {
      dir.mtime = dir.ctime = Date.now();
    }
    create(path, cwd, props) {
      const { dir, name } = this.lookupParent(path, cwd);
      if (!name || name === '.' || name === '..') throw fsErr('EEXIST', path);
      if (dir.ents[name] !== undefined) throw fsErr('EEXIST', path);
      if (!this.can(dir, 2) || !this.can(dir, 1)) throw fsErr('EACCES', path);
      if (this.isRO(dir.dev)) throw fsErr('EROFS', path);
      const n = this._alloc(
        Object.assign({ uid: this.cred.uid, gid: this.cred.gid, dev: dir.dev }, props)
      );
      if (dir.mode & 0o2000) n.gid = dir.gid; // SGID directory inherits group
      if (n.t === 'd') {
        n.ents = {};
        n.parent = dir.ino;
        if (dir.mode & 0o2000) n.mode |= 0o2000;
        dir.nlink++;
      }
      dir.ents[name] = n.ino;
      this._touchDir(dir);
      return n;
    }
    mkdir(path, cwd, mode) {
      return this.create(path, cwd, { t: 'd', mode: (mode === undefined ? 0o777 : mode) & ~this.umask & 0o7777 });
    }
    mkdirp(path, cwd, mode) {
      const full = this.abs(path, cwd);
      const parts = this.split(full);
      let cur = '';
      let last = null;
      for (const p of parts) {
        cur += '/' + p;
        const r = this.tryLookup(cur, '/', true);
        if (r) {
          if (r.node.t !== 'd') throw fsErr('ENOTDIR', cur);
          last = r.node;
        } else last = this.mkdir(cur, '/', mode);
      }
      return last;
    }
    writeFile(path, cwd, data, opts = {}) {
      let r = this.tryLookup(path, cwd, true);
      if (r) {
        if (r.node.t === 'd') throw fsErr('EISDIR', path);
        if (r.node.t === 'c' || r.node.t === 'b') return r.node; // /dev/null etc.
        if (!this.can(r.node, 2)) throw fsErr('EACCES', path);
        if (this.isRO(r.node.dev)) throw fsErr('EROFS', path);
        if ((r.node.attrs || '').indexOf('i') >= 0 || ((r.node.attrs || '').indexOf('a') >= 0 && !opts.append)) throw fsErr('EPERM', path);
        r.node.data = opts.append ? (r.node.data || '') + data : data;
        delete r.node.fsize;
        r.node.mtime = r.node.ctime = Date.now();
        return r.node;
      }
      // dangling symlink -> create target
      const l = this.tryLookup(path, cwd, false);
      if (l && l.node.t === 'l') {
        const t = l.node.target.startsWith('/') ? l.node.target : this.lookupParent(path, cwd).dirPath + '/' + l.node.target;
        return this.writeFile(t, '/', data, opts);
      }
      const mode = (opts.mode === undefined ? 0o666 : opts.mode) & ~this.umask;
      return this.create(path, cwd, { t: 'f', mode, data });
    }
    readFile(path, cwd) {
      const r = this.lookup(path, cwd, true);
      if (r.node.t === 'd') throw fsErr('EISDIR', path);
      if (!this.can(r.node, 4)) throw fsErr('EACCES', path);
      r.node.atime = Date.now();
      if (r.node.t === 'c') {
        if (r.node.devname === 'zero') return '\0'.repeat(64);
        if (r.node.devname === 'urandom' || r.node.devname === 'random') {
          let s = '';
          for (let i = 0; i < 32; i++) s += String.fromCharCode(33 + Math.floor(Math.random() * 90));
          return s;
        }
        return '';
      }
      if (r.node.t === 'b') return '';
      return r.node.data || '';
    }
    unlink(path, cwd) {
      const { dir, name } = this.lookupParent(path, cwd);
      const ino = dir.ents[name];
      if (ino === undefined) throw fsErr('ENOENT', path);
      const n = this.inodes[ino];
      if (n.t === 'd') throw fsErr('EISDIR', path);
      if (!this.can(dir, 2)) throw fsErr('EACCES', path);
      if (this.isRO(dir.dev)) throw fsErr('EROFS', path);
      if (/[ia]/.test(n.attrs || '')) throw fsErr('EPERM', path);
      // sticky bit: only owner of file/dir or root can delete
      if (dir.mode & 0o1000 && this.cred.uid !== 0 && n.uid !== this.cred.uid && dir.uid !== this.cred.uid)
        throw fsErr('EPERM', path);
      delete dir.ents[name];
      this._touchDir(dir);
      n.nlink--;
      n.ctime = Date.now();
      if (n.nlink <= 0) delete this.inodes[ino];
    }
    rmdir(path, cwd) {
      const { dir, name } = this.lookupParent(path, cwd);
      const ino = dir.ents[name];
      if (ino === undefined) throw fsErr('ENOENT', path);
      const n = this.inodes[ino];
      if (n.t !== 'd') throw fsErr('ENOTDIR', path);
      if (this.mountAt(ino)) throw fsErr('EBUSY', path);
      if (Object.keys(n.ents).length) throw fsErr('ENOTEMPTY', path);
      if (!this.can(dir, 2)) throw fsErr('EACCES', path);
      delete dir.ents[name];
      dir.nlink--;
      this._touchDir(dir);
      delete this.inodes[ino];
    }
    // recursive removal of a directory tree (rm -r)
    rmtree(path, cwd, onErr) {
      const r = this.lookup(path, cwd, false);
      if (r.node.t === 'd' && !this.mountAt(r.ino)) {
        for (const name of Object.keys(r.node.ents)) {
          try {
            this.rmtree(r.path + '/' + name, '/', onErr);
          } catch (e) {
            if (onErr) onErr(e, r.path + '/' + name);
            else throw e;
          }
        }
        this.rmdir(r.path, '/');
      } else this.unlink(path, cwd);
    }
    link(src, dst, cwd) {
      const s = this.lookup(src, cwd, false);
      if (s.node.t === 'd') throw fsErr('EPERM', src);
      const { dir, name } = this.lookupParent(dst, cwd);
      if (dir.ents[name] !== undefined) throw fsErr('EEXIST', dst);
      if (dir.dev !== s.node.dev) throw fsErr('EXDEV', dst);
      if (!this.can(dir, 2)) throw fsErr('EACCES', dst);
      dir.ents[name] = s.ino;
      s.node.nlink++;
      s.node.ctime = Date.now();
      this._touchDir(dir);
    }
    symlink(target, path, cwd) {
      return this.create(path, cwd, { t: 'l', mode: 0o777, target });
    }
    rename(src, dst, cwd) {
      const a = this.lookupParent(src, cwd);
      const ino = a.dir.ents[a.name];
      if (ino === undefined) throw fsErr('ENOENT', src);
      if (!this.can(a.dir, 2)) throw fsErr('EACCES', src);
      let b = this.lookupParent(dst, cwd);
      const existing = b.dir.ents[b.name];
      if (existing !== undefined) {
        const en = this.inodes[existing];
        if (en.t === 'd') {
          // move into directory
          return this.rename(src, b.dirPath.replace(/\/$/, '') + '/' + b.name + '/' + a.name, '/');
        }
        if (existing === ino) return;
        this.unlink(dst, cwd);
      }
      if (!this.can(b.dir, 2)) throw fsErr('EACCES', dst);
      const n = this.inodes[ino];
      if (n.dev !== b.dir.dev) {
        // cross-device move: copy then delete
        this.copyTree(src, dst, cwd, true);
        this.rmtree(src, cwd);
        return;
      }
      delete a.dir.ents[a.name];
      b.dir.ents[b.name] = ino;
      if (n.t === 'd') {
        n.parent = b.dir.ino;
        a.dir.nlink--;
        b.dir.nlink++;
      }
      this._touchDir(a.dir);
      this._touchDir(b.dir);
    }
    copyTree(src, dst, cwd, preserve) {
      const s = this.lookup(src, cwd, true);
      if (s.node.t === 'd') {
        const d = this.mkdir(dst, cwd, s.node.mode);
        if (preserve) Object.assign(d, { mode: s.node.mode, uid: s.node.uid, gid: s.node.gid, mtime: s.node.mtime });
        const dpath = this.lookup(dst, cwd).path;
        for (const name of Object.keys(s.node.ents)) this.copyTree(s.path + '/' + name, dpath + '/' + name, '/', preserve);
        return d;
      }
      const n = this.writeFile(dst, cwd, this.readFile(src, cwd), { mode: s.node.mode });
      if (preserve) Object.assign(n, { mode: s.node.mode, uid: s.node.uid, gid: s.node.gid, mtime: s.node.mtime });
      return n;
    }

    /* ---------- devices & mounts ---------- */
    mkfs(dev, fstype, label) {
      const d = (this.devices[dev] = this.devices[dev] || {});
      const root = this._alloc({ t: 'd', mode: 0o755, uid: 0, gid: 0, ents: {}, dev });
      root.parent = root.ino;
      d.fstype = fstype;
      d.label = label || '';
      d.uuid = SIM.uuid(fstype === 'vfat');
      d.root = root.ino;
      if (/^ext/.test(fstype)) {
        const lf = this._alloc({ t: 'd', mode: 0o700, uid: 0, gid: 0, ents: {}, dev, parent: root.ino });
        root.ents['lost+found'] = lf.ino;
        root.nlink++;
      }
      return d;
    }
    mount(dev, target, cwd, fstype, opts) {
      const t = this.lookup(target, cwd, true);
      if (t.node.t !== 'd') throw fsErr('ENOTDIR', target);
      const d = this.devices[dev];
      const m = { dev, on: t.ino, root: d.root, fstype: fstype || d.fstype, opts: opts || 'rw,relatime', target: t.path };
      const rootNode = this.inodes[d.root];
      rootNode.parent = t.node.parent;
      this.mounts.push(m);
      return m;
    }
    umount(what, cwd) {
      let idx = -1;
      for (let i = this.mounts.length - 1; i >= 0; i--) {
        const m = this.mounts[i];
        if (m.dev === what || m.target === this.normalize(what, cwd)) {
          idx = i;
          break;
        }
      }
      if (idx < 0) return null;
      const m = this.mounts[idx];
      this.mounts.splice(idx, 1);
      return m;
    }
    // which mount/device does a path live on
    devOf(node) {
      return node.dev;
    }

    /* ---------- tree walk ---------- */
    walk(path, cwd, fn, maxDepth = Infinity, depth = 0) {
      const r = this.lookup(path, cwd, depth === 0);
      fn(r.path, r.node, depth);
      if (r.node.t === 'd' && depth < maxDepth && this.can(r.node, 4) && this.can(r.node, 1)) {
        for (const name of Object.keys(r.node.ents).sort()) {
          const p = (r.path === '/' ? '' : r.path) + '/' + name;
          try {
            this.walk(p, '/', fn, maxDepth, depth + 1);
          } catch (e) {
            /* ignore */
          }
        }
      }
    }
    list(node) {
      return Object.keys(node.ents).sort((a, b) => a.localeCompare(b));
    }
  }
  SIM.VFS = VFS;

  SIM.uuid = function (short) {
    const h = () => Math.floor(Math.random() * 16).toString(16);
    const s = (n) => Array.from({ length: n }, h).join('');
    if (short) return (s(4) + '-' + s(4)).toUpperCase();
    return `${s(8)}-${s(4)}-4${s(3)}-a${s(3)}-${s(12)}`;
  };

  /* ---------- mode helpers ---------- */
  SIM.modeString = function (n) {
    const types = { f: '-', d: 'd', l: 'l', b: 'b', c: 'c', p: 'p', s: 's' };
    const m = n.mode;
    const r = (b, ch) => (m & b ? ch : '-');
    let s = types[n.t] || '-';
    s += r(0o400, 'r') + r(0o200, 'w');
    s += m & 0o4000 ? (m & 0o100 ? 's' : 'S') : r(0o100, 'x');
    s += r(0o040, 'r') + r(0o020, 'w');
    s += m & 0o2000 ? (m & 0o010 ? 's' : 'S') : r(0o010, 'x');
    s += r(0o004, 'r') + r(0o002, 'w');
    s += m & 0o1000 ? (m & 0o001 ? 't' : 'T') : r(0o001, 'x');
    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
