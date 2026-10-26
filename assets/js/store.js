/* LPIC-1 Trainer — progress store.
 * Writes go to localStorage immediately and, when the page is served by the
 * bundled server (Docker), are synced to its SQLite database. */
(function (G) {
  'use strict';
  const KEY = 'lpic1.progress.v1';
  const SBKEY = 'lpic1.sandbox.v1';
  const API = 'api/kv/';

  const empty = () => ({
    v: 1,
    updated: 0,
    objectives: {}, // id -> {read, notes, labs:{taskIdx:true}, sims:{}}
    questions: {}, // qid -> {n, ok, last, box, due, flagged}
    exams: [], // {exam, date, correct, total, secs}
    activity: {}, // YYYY-MM-DD -> count
    settings: { theme: 'auto' },
  });

  const ls = {
    get(k) {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
        return true;
      } catch (e) {
        return false;
      }
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        /* */
      }
    },
  };

  const Store = {
    data: empty(),
    sandbox: null,
    server: false,
    status: 'local',
    listeners: [],
    async init() {
      const local = ls.get(KEY);
      if (local) this.data = Object.assign(empty(), local);
      this.sandbox = ls.get(SBKEY);
      if (location.protocol === 'file:') return;
      try {
        const r = await fetch(API + 'progress', { cache: 'no-store' });
        if (r.ok || r.status === 404) {
          this.server = true;
          this.status = 'server';
          if (r.ok) {
            const remote = await r.json();
            if (remote && remote.updated >= (this.data.updated || 0)) this.data = Object.assign(empty(), remote);
            else this.push('progress', this.data);
          } else if (this.data.updated) this.push('progress', this.data);
          const s = await fetch(API + 'sandbox', { cache: 'no-store' });
          if (s.ok) {
            const remote = await s.json();
            if (remote && (!this.sandbox || (remote.ts || 0) >= (this.sandbox.ts || 0))) this.sandbox = remote;
          }
        }
      } catch (e) {
        this.status = 'local';
      }
      ls.set(KEY, this.data);
    },
    push(key, value) {
      if (!this.server) return;
      clearTimeout(this['_t' + key]);
      this['_t' + key] = setTimeout(() => {
        fetch(API + key, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
          .then((r) => {
            this.status = r.ok ? 'server' : 'error';
            this.notify();
          })
          .catch(() => {
            this.status = 'offline';
            this.notify();
          });
      }, key === 'sandbox' ? 1500 : 600);
    },
    save() {
      this.data.updated = Date.now();
      ls.set(KEY, this.data);
      this.push('progress', this.data);
      this.notify();
    },
    onChange(fn) {
      this.listeners.push(fn);
    },
    notify() {
      for (const f of this.listeners) f(this.data);
    },
    today() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    tick(n = 1) {
      const t = this.today();
      this.data.activity[t] = (this.data.activity[t] || 0) + n;
    },
    obj(id) {
      return (this.data.objectives[id] = this.data.objectives[id] || { read: false, notes: '', labs: {}, sims: {} });
    },
    q(id) {
      return (this.data.questions[id] = this.data.questions[id] || { n: 0, ok: 0, last: null, box: 0, due: 0 });
    },
    // Leitner boxes: 1d, 2d, 4d, 8d, 16d
    answer(id, correct) {
      const q = this.q(id);
      q.n++;
      if (correct) q.ok++;
      q.last = !!correct;
      q.t = Date.now();
      q.box = correct ? Math.min(5, (q.box || 0) + 1) : 0;
      q.due = Date.now() + (correct ? [0, 1, 2, 4, 8, 16][q.box] * 86400000 : 0);
      this.tick();
      this.save();
    },
    setRead(id, v) {
      this.obj(id).read = v;
      this.tick();
      this.save();
    },
    setNotes(id, text) {
      this.obj(id).notes = text;
      this.save();
    },
    labDone(id, idx) {
      const o = this.obj(id);
      if (!o.labs[idx]) {
        o.labs[idx] = Date.now();
        this.tick();
        this.save();
      }
    },
    simDone(simId) {
      this.data.sims = this.data.sims || {};
      if (!this.data.sims[simId]) {
        this.data.sims[simId] = Date.now();
        this.tick();
        this.save();
      }
    },
    addExam(rec) {
      this.data.exams.push(rec);
      this.tick(5);
      this.save();
    },
    setSetting(k, v) {
      this.data.settings[k] = v;
      this.save();
    },
    streak() {
      let n = 0;
      const d = new Date();
      for (;;) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (this.data.activity[k]) n++;
        else if (n > 0 || k !== this.today()) break;
        d.setDate(d.getDate() - 1);
        if (n > 3650) break;
      }
      return n;
    },
    // sandbox persistence (for the global terminal)
    sandboxPersist() {
      return {
        load: () => this.sandbox,
        save: (s) => {
          s.ts = Date.now();
          this.sandbox = s;
          ls.set(SBKEY, s);
          this.push('sandbox', s);
        },
      };
    },
    export() {
      return JSON.stringify({ progress: this.data, sandbox: this.sandbox, exported: new Date().toISOString(), app: 'lpic1-trainer' }, null, 1);
    },
    import(text) {
      const o = JSON.parse(text);
      if (!o || (!o.progress && !o.objectives)) throw new Error('not an LPIC-1 Trainer backup');
      this.data = Object.assign(empty(), o.progress || o);
      this.save();
      if (o.sandbox) {
        this.sandbox = o.sandbox;
        ls.set(SBKEY, o.sandbox);
        this.push('sandbox', o.sandbox);
      }
    },
    reset() {
      this.data = empty();
      this.save();
    },
    resetSandbox() {
      this.sandbox = null;
      ls.del(SBKEY);
      if (this.server) fetch(API + 'sandbox', { method: 'DELETE' }).catch(() => {});
    },
  };
  G.Store = Store;
})(window);
