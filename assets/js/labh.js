/* LPIC-1 Trainer — helpers available to lab checks (they run with root credentials). */
(function (G) {
  'use strict';
  const LABH = {
    exists: (sh, p) => !!sh.fs.tryLookup(p, '/home/student', false),
    isDir: (sh, p) => {
      const r = sh.fs.tryLookup(p, '/home/student');
      return !!r && r.node.t === 'd';
    },
    isFile: (sh, p) => {
      const r = sh.fs.tryLookup(p, '/home/student');
      return !!r && r.node.t === 'f';
    },
    isLink: (sh, p) => {
      const r = sh.fs.tryLookup(p, '/home/student', false);
      return !!r && r.node.t === 'l';
    },
    read: (sh, p) => {
      try {
        return sh.fs.readFile(p, '/home/student');
      } catch (e) {
        return null;
      }
    },
    node: (sh, p, follow = true) => {
      const r = sh.fs.tryLookup(p, '/home/student', follow);
      return r ? r.node : null;
    },
    ino: (sh, p) => {
      const r = sh.fs.tryLookup(p, '/home/student', false);
      return r ? r.ino : null;
    },
    mode: (sh, p) => {
      const r = sh.fs.tryLookup(p, '/home/student', false);
      return r ? r.node.mode & 0o7777 : null;
    },
    owner: (sh, p) => {
      const r = sh.fs.tryLookup(p, '/home/student', false);
      return r ? sh.uname(r.node.uid) + ':' + sh.gname(r.node.gid) : null;
    },
    user: (sh, n) => sh.user(n),
    group: (sh, n) => sh.group(n),
    groupsOf: (sh, n) => sh.groupsOf(n).map((g) => sh.gname(g)),
  };
  G.LABH = LABH;
})(typeof window !== 'undefined' ? window : globalThis);
