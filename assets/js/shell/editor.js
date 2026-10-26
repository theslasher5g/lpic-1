/* LPIC-1 Trainer — vi/vim and nano emulators. */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /* =========================== vi =========================== */
  class ViEditor {
    constructor(root, opts = {}) {
      this.root = root;
      this.opts = opts;
      const text = opts.text || '';
      this.lines = text.split('\n');
      if (this.lines.length > 1 && this.lines[this.lines.length - 1] === '') this.lines.pop();
      if (!this.lines.length) this.lines = [''];
      this.saved = this.lines.join('\n');
      this.cy = 0;
      this.cx = 0;
      this.top = 0;
      this.mode = 'normal';
      this.count = '';
      this.pending = '';
      this.cmd = '';
      this.msg = opts.isNew ? `"${opts.filename}" [New]` : opts.text !== undefined && opts.filename ? `"${opts.filename}" ${this.lines.length}L, ${SIM.byteLen ? SIM.byteLen(text) : text.length}B` : '';
      if (opts.readonly) this.msg += ' [readonly]';
      this.msgErr = false;
      this.undoStack = [];
      this.redoStack = [];
      this.reg = null;
      this.search = null;
      this.num = !!opts.number;
      this.history = [];
      this.lastChange = null;
      root.innerHTML = '<div class="vi" tabindex="0" role="textbox" aria-label="vi editor"><div class="vi-lines"></div><div class="vi-status"><span class="vi-msg"></span><span class="vi-pos"></span></div></div>';
      this.el = root.querySelector('.vi');
      this.linesEl = root.querySelector('.vi-lines');
      this.msgEl = root.querySelector('.vi-msg');
      this.posEl = root.querySelector('.vi-pos');
      this.el.addEventListener('keydown', (e) => this.onKey(e));
      this.el.addEventListener('mousedown', (e) => {
        const row = e.target.closest('.vi-row');
        if (row && row.dataset.y !== undefined) {
          this.cy = +row.dataset.y;
          this.clampX();
          this.render();
        }
      });
      this.render();
      setTimeout(() => this.el.focus(), 0);
    }
    get text() {
      return this.lines.join('\n');
    }
    get modified() {
      return this.text !== this.saved;
    }
    rows() {
      const h = this.linesEl.clientHeight || 360;
      return Math.max(5, Math.floor(h / 19));
    }
    clampX(insert) {
      const len = this.lines[this.cy].length;
      const max = insert || this.mode === 'insert' ? len : Math.max(0, len - 1);
      if (this.cx > max) this.cx = max;
      if (this.cx < 0) this.cx = 0;
    }
    snap() {
      this.undoStack.push({ lines: this.lines.slice(), cy: this.cy, cx: this.cx });
      if (this.undoStack.length > 200) this.undoStack.shift();
      this.redoStack = [];
    }
    setMsg(m, err) {
      this.msg = m;
      this.msgErr = !!err;
    }
    emit(ev) {
      if (this.opts.onChange) this.opts.onChange(this.stateInfo(ev));
    }
    stateInfo(ev) {
      return { event: ev, lines: this.lines.slice(), text: this.text, cy: this.cy, cx: this.cx, mode: this.mode, modified: this.modified, reg: this.reg, num: this.num, lastCmd: this.lastEx };
    }
    render() {
      const rows = this.rows();
      if (this.cy < this.top) this.top = this.cy;
      if (this.cy >= this.top + rows) this.top = this.cy - rows + 1;
      const w = String(this.lines.length).length + 1;
      let html = '';
      for (let i = 0; i < rows; i++) {
        const y = this.top + i;
        if (y >= this.lines.length) {
          html += '<div class="vi-row vi-tilde">~</div>';
          continue;
        }
        const line = this.lines[y];
        let content;
        const hl = this.search && this.search.re ? this.search.re : null;
        const renderSeg = (s) => {
          if (!hl) return esc(s);
          try {
            const g = new RegExp(hl.source, 'g' + (hl.ignoreCase ? 'i' : ''));
            let out = '';
            let last = 0;
            let m;
            while ((m = g.exec(s))) {
              if (!m[0]) {
                g.lastIndex++;
                continue;
              }
              out += esc(s.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
              last = m.index + m[0].length;
            }
            return out + esc(s.slice(last));
          } catch (e) {
            return esc(s);
          }
        };
        if (y === this.cy && (this.mode === 'normal' || this.mode === 'insert' || this.mode === 'replace')) {
          const ch = line[this.cx] === undefined ? ' ' : line[this.cx];
          content = renderSeg(line.slice(0, this.cx)) + `<span class="vi-cur ${this.mode === 'insert' ? 'vi-cur-ins' : ''}">${esc(ch === '\t' ? '    ' : ch)}</span>` + renderSeg(line.slice(this.cx + 1));
        } else content = renderSeg(line) || '';
        html += `<div class="vi-row" data-y="${y}">${this.num ? `<span class="vi-num">${String(y + 1).padStart(w)} </span>` : ''}${content || '&#8203;'}</div>`;
      }
      this.linesEl.innerHTML = html;
      let m;
      if (this.mode === 'cmdline') m = ':' + esc(this.cmd) + '<span class="vi-cur">&nbsp;</span>';
      else if (this.mode === 'search') m = esc(this.searchDir) + esc(this.cmd) + '<span class="vi-cur">&nbsp;</span>';
      else if (this.mode === 'insert') m = '<b>-- INSERT --</b>';
      else if (this.mode === 'replace') m = '<b>-- REPLACE --</b>';
      else m = `<span class="${this.msgErr ? 'vi-err' : ''}">${esc(this.msg || '')}</span>`;
      this.msgEl.innerHTML = m;
      const pct = this.lines.length <= rows ? 'All' : this.top === 0 ? 'Top' : this.top + rows >= this.lines.length ? 'Bot' : Math.round((this.top / (this.lines.length - rows)) * 100) + '%';
      this.posEl.textContent = `${this.pending || this.count ? (this.count + this.pending).padEnd(8) : '        '}${this.cy + 1},${this.cx + 1}${' '.repeat(10)}${pct}`;
    }
    /* ---------- motions ---------- */
    cls(ch) {
      if (ch === undefined) return -1;
      if (/\s/.test(ch)) return 0;
      if (/\w/.test(ch)) return 1;
      return 2;
    }
    wordFwd(y, x, big) {
      const L = this.lines;
      let line = L[y];
      const c0 = big ? (/\s/.test(line[x] || ' ') ? 0 : 1) : this.cls(line[x]);
      // skip current word
      if (c0 > 0) while (x < line.length && (big ? !/\s/.test(line[x]) : this.cls(line[x]) === c0)) x++;
      // skip spaces (possibly across lines)
      for (;;) {
        while (x < line.length && /\s/.test(line[x])) x++;
        if (x < line.length) return { y, x };
        if (y >= L.length - 1) return { y, x: Math.max(0, line.length - 1), end: true };
        y++;
        x = 0;
        line = L[y];
        if (line === '') return { y, x: 0 };
      }
    }
    wordEnd(y, x, big) {
      const L = this.lines;
      let line = L[y];
      x++;
      for (;;) {
        while (x < line.length && /\s/.test(line[x])) x++;
        if (x < line.length) break;
        if (y >= L.length - 1) return { y, x: Math.max(0, line.length - 1) };
        y++;
        x = 0;
        line = L[y];
      }
      const c = big ? 1 : this.cls(line[x]);
      while (x + 1 < line.length && (big ? !/\s/.test(line[x + 1]) : this.cls(line[x + 1]) === c)) x++;
      return { y, x };
    }
    wordBack(y, x, big) {
      const L = this.lines;
      let line = L[y];
      x--;
      for (;;) {
        while (x >= 0 && /\s/.test(line[x])) x--;
        if (x >= 0) break;
        if (y === 0) return { y: 0, x: 0 };
        y--;
        line = L[y];
        x = line.length - 1;
        if (line === '') return { y, x: 0 };
      }
      const c = big ? 1 : this.cls(line[x]);
      while (x > 0 && (big ? !/\s/.test(line[x - 1]) : this.cls(line[x - 1]) === c)) x--;
      return { y, x };
    }
    motion(k, n) {
      // returns {y, x, linewise, inclusive} or null
      const L = this.lines;
      let y = this.cy;
      let x = this.cx;
      switch (k) {
        case 'h':
        case 'ArrowLeft':
        case 'Backspace':
          return { y, x: Math.max(0, x - n) };
        case 'l':
        case 'ArrowRight':
        case ' ':
          return { y, x: Math.min(Math.max(0, L[y].length - (this.pending ? 0 : 1)), x + n) };
        case 'j':
        case 'ArrowDown':
        case '+':
        case 'Enter':
          return { y: Math.min(L.length - 1, y + n), x, linewise: true };
        case 'k':
        case 'ArrowUp':
        case '-':
          return { y: Math.max(0, y - n), x, linewise: true };
        case '0':
        case 'Home':
          return { y, x: 0 };
        case '^':
          return { y, x: Math.max(0, L[y].search(/\S/)) };
        case '$':
        case 'End':
          return { y: Math.min(L.length - 1, y + n - 1), x: Math.max(0, L[Math.min(L.length - 1, y + n - 1)].length - 1), inclusive: true };
        case 'w':
        case 'W': {
          let p = { y, x };
          for (let i = 0; i < n; i++) p = this.wordFwd(p.y, p.x, k === 'W');
          return p;
        }
        case 'e':
        case 'E': {
          let p = { y, x };
          for (let i = 0; i < n; i++) p = this.wordEnd(p.y, p.x, k === 'E');
          return Object.assign(p, { inclusive: true });
        }
        case 'b':
        case 'B': {
          let p = { y, x };
          for (let i = 0; i < n; i++) p = this.wordBack(p.y, p.x, k === 'B');
          return p;
        }
        case 'G':
          return { y: this.count ? Math.min(L.length - 1, n - 1) : L.length - 1, x: 0, linewise: true, first: true };
        case 'gg':
          return { y: this.count ? Math.min(L.length - 1, n - 1) : 0, x: 0, linewise: true, first: true };
        case 'H':
          return { y: this.top, x: 0, linewise: true };
        case 'L':
          return { y: Math.min(L.length - 1, this.top + this.rows() - 1), x: 0, linewise: true };
        case 'M':
          return { y: Math.min(L.length - 1, this.top + Math.floor(this.rows() / 2)), x: 0, linewise: true };
        case '}': {
          let yy = y + 1;
          while (yy < L.length && L[yy].trim() !== '') yy++;
          return { y: Math.min(yy, L.length - 1), x: 0 };
        }
        case '{': {
          let yy = y - 1;
          while (yy > 0 && L[yy].trim() !== '') yy--;
          return { y: Math.max(0, yy), x: 0 };
        }
      }
      return null;
    }
    /* ---------- editing primitives ---------- */
    deleteRange(a, b, linewise, yankOnly) {
      // a <= b
      const L = this.lines;
      if (linewise) {
        const y1 = Math.min(a.y, b.y);
        const y2 = Math.max(a.y, b.y);
        this.reg = { lines: L.slice(y1, y2 + 1), linewise: true };
        if (yankOnly) return;
        L.splice(y1, y2 - y1 + 1);
        if (!L.length) L.push('');
        this.cy = Math.min(y1, L.length - 1);
        this.cx = Math.max(0, L[this.cy].search(/\S/));
        return;
      }
      let s = a;
      let e = b;
      if (s.y > e.y || (s.y === e.y && s.x > e.x)) [s, e] = [e, s];
      let text;
      if (s.y === e.y) text = L[s.y].slice(s.x, e.x);
      else text = [L[s.y].slice(s.x), ...L.slice(s.y + 1, e.y), L[e.y].slice(0, e.x)].join('\n');
      this.reg = { text, linewise: false };
      if (yankOnly) return;
      const head = L[s.y].slice(0, s.x);
      const tail = L[e.y].slice(e.x);
      L.splice(s.y, e.y - s.y + 1, head + tail);
      this.cy = s.y;
      this.cx = s.x;
    }
    put(before) {
      const r = this.reg;
      if (!r) return this.setMsg('E353: Nothing in register "', true);
      this.snap();
      const L = this.lines;
      if (r.linewise) {
        const at = before ? this.cy : this.cy + 1;
        L.splice(at, 0, ...r.lines);
        this.cy = at;
        this.cx = Math.max(0, L[at].search(/\S/));
      } else {
        const parts = r.text.split('\n');
        const line = L[this.cy];
        const at = before ? this.cx : Math.min(line.length, this.cx + 1);
        if (parts.length === 1) {
          L[this.cy] = line.slice(0, at) + r.text + line.slice(at);
          this.cx = at + r.text.length - 1;
        } else {
          const tail = line.slice(at);
          L[this.cy] = line.slice(0, at) + parts[0];
          L.splice(this.cy + 1, 0, ...parts.slice(1, -1), parts[parts.length - 1] + tail);
          this.cy++;
        }
      }
    }
    enterInsert() {
      this.snap();
      this.mode = 'insert';
      this.setMsg('');
    }
    /* ---------- key handling ---------- */
    onKey(e) {
      if (e.metaKey) return;
      let k = e.key;
      if (k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'CapsLock' || k === 'Meta') return;
      if (e.ctrlKey) k = '^' + k.toLowerCase();
      e.preventDefault();
      e.stopPropagation();
      if (this.mode === 'insert' || this.mode === 'replace') this.keyInsert(k);
      else if (this.mode === 'cmdline' || this.mode === 'search') this.keyCmdline(k);
      else this.keyNormal(k);
      if (!this.closed) {
        this.clampX(this.mode === 'insert');
        this.render();
        this.emit(k);
      }
    }
    keyInsert(k) {
      const L = this.lines;
      const line = L[this.cy];
      if (k === 'Escape' || k === '^[' || k === '^c') {
        this.mode = 'normal';
        this.cx = Math.max(0, this.cx - 1);
        return;
      }
      if (k === 'Enter') {
        const indent = this.opts.autoindent ? /^\s*/.exec(line)[0] : '';
        L.splice(this.cy + 1, 0, indent + line.slice(this.cx));
        L[this.cy] = line.slice(0, this.cx);
        this.cy++;
        this.cx = indent.length;
        return;
      }
      if (k === 'Backspace' || k === '^h') {
        if (this.cx > 0) {
          L[this.cy] = line.slice(0, this.cx - 1) + line.slice(this.cx);
          this.cx--;
        } else if (this.cy > 0) {
          this.cx = L[this.cy - 1].length;
          L[this.cy - 1] += line;
          L.splice(this.cy, 1);
          this.cy--;
        }
        return;
      }
      if (k === 'Delete') {
        if (this.cx < line.length) L[this.cy] = line.slice(0, this.cx) + line.slice(this.cx + 1);
        else if (this.cy < L.length - 1) {
          L[this.cy] += L[this.cy + 1];
          L.splice(this.cy + 1, 1);
        }
        return;
      }
      if (k === 'ArrowLeft') return void (this.cx = Math.max(0, this.cx - 1));
      if (k === 'ArrowRight') return void (this.cx = Math.min(line.length, this.cx + 1));
      if (k === 'ArrowUp') return void (this.cy = Math.max(0, this.cy - 1));
      if (k === 'ArrowDown') return void (this.cy = Math.min(L.length - 1, this.cy + 1));
      if (k === 'Home') return void (this.cx = 0);
      if (k === 'End') return void (this.cx = line.length);
      if (k === 'Tab') k = '\t';
      if (k === '^w') {
        const before = line.slice(0, this.cx).replace(/\w+\s*$|\W\s*$/, '');
        L[this.cy] = before + line.slice(this.cx);
        this.cx = before.length;
        return;
      }
      if (k.length !== 1) return;
      if (this.mode === 'replace' && this.cx < line.length) L[this.cy] = line.slice(0, this.cx) + k + line.slice(this.cx + 1);
      else L[this.cy] = line.slice(0, this.cx) + k + line.slice(this.cx);
      this.cx++;
    }
    keyCmdline(k) {
      if (k === 'Escape' || k === '^c') {
        this.mode = 'normal';
        this.cmd = '';
        return;
      }
      if (k === 'Enter') {
        const c = this.cmd;
        const m = this.mode;
        this.mode = 'normal';
        this.cmd = '';
        if (m === 'search') return this.doSearch(c, this.searchDir === '/' ? 1 : -1, true);
        this.history.push(c);
        return this.ex(c);
      }
      if (k === 'Backspace') {
        if (!this.cmd) this.mode = 'normal';
        this.cmd = this.cmd.slice(0, -1);
        return;
      }
      if (k === 'ArrowUp' && this.history.length) {
        this.cmd = this.history[this.history.length - 1];
        return;
      }
      if (k === 'Tab') return;
      if (k.length === 1) this.cmd += k;
    }
    doSearch(pat, dir, fresh) {
      if (pat) {
        try {
          const ic = this.opts.ignorecase && !/[A-Z]/.test(pat);
          this.search = { pat, re: new RegExp(SIM.toJsRegex ? SIM.toJsRegex(pat, false) : pat, ic ? 'i' : ''), dir };
        } catch (e) {
          return this.setMsg('E486: Pattern not found: ' + pat, true);
        }
      }
      if (!this.search) return this.setMsg('E35: No previous regular expression', true);
      const re = this.search.re;
      const d = fresh ? dir : dir * this.search.dir;
      const L = this.lines;
      const n = L.length;
      for (let i = 0; i <= n; i++) {
        const y = (this.cy + d * i + n * 2) % n;
        const line = L[y];
        const g = new RegExp(re.source, 'g' + (re.ignoreCase ? 'i' : ''));
        let m;
        const hits = [];
        while ((m = g.exec(line))) {
          hits.push(m.index);
          if (!m[0]) g.lastIndex++;
        }
        let hit;
        if (d > 0) hit = hits.find((x) => i > 0 || x > this.cx);
        else hit = hits.reverse().find((x) => i > 0 || x < this.cx);
        if (hit !== undefined) {
          if ((d > 0 && (y < this.cy || (y === this.cy && i > 0))) || (d < 0 && (y > this.cy || (y === this.cy && i > 0)))) this.setMsg(d > 0 ? 'search hit BOTTOM, continuing at TOP' : 'search hit TOP, continuing at BOTTOM', true);
          else this.setMsg((d > 0 ? '/' : '?') + this.search.pat);
          this.cy = y;
          this.cx = hit;
          return;
        }
      }
      this.setMsg('E486: Pattern not found: ' + this.search.pat, true);
    }
    keyNormal(k) {
      const L = this.lines;
      // pending single-char argument (r, f, t, F, T, m)
      if (this.pending === 'r') {
        this.pending = '';
        if (k.length === 1 && L[this.cy].length) {
          this.snap();
          const n = Math.max(1, +this.count || 1);
          const line = L[this.cy];
          if (this.cx + n <= line.length) L[this.cy] = line.slice(0, this.cx) + k.repeat(n) + line.slice(this.cx + n);
          this.cx += n - 1;
          this.lastChange = { keys: ['r', k] };
        }
        this.count = '';
        return;
      }
      if (/^[fFtT]$/.test(this.pending) && !/^[dcy]/.test(this.pendingOp || '')) {
        const p = this.pending;
        this.pending = '';
        this.findChar(p, k);
        this.count = '';
        return;
      }
      if (/^\d$/.test(k) && !(k === '0' && !this.count) && !this.pending.startsWith('Z')) {
        this.count += k;
        return;
      }
      const n = Math.max(1, parseInt(this.count || '1', 10));
      // operators
      if (this.pending === 'd' || this.pending === 'y' || this.pending === 'c' || this.pending === '>' || this.pending === '<') {
        const op = this.pending;
        this.pending = '';
        if (k === 'Escape') {
          this.count = '';
          return;
        }
        if (k === op) {
          // dd yy cc >> <<
          const a = { y: this.cy, x: 0 };
          const b = { y: Math.min(L.length - 1, this.cy + n - 1), x: 0 };
          if (op === '>' || op === '<') {
            this.snap();
            for (let y = a.y; y <= b.y; y++) L[y] = op === '>' ? '\t' + L[y] : L[y].replace(/^(\t| {1,8})/, '');
          } else if (op === 'y') {
            this.deleteRange(a, b, true, true);
            if (n > 1) this.setMsg(`${n} lines yanked`);
          } else {
            this.snap();
            if (op === 'c') {
              this.reg = { lines: L.slice(a.y, b.y + 1), linewise: true };
              L.splice(a.y, b.y - a.y + 1, '');
              this.cy = a.y;
              this.cx = 0;
              this.mode = 'insert';
            } else {
              this.deleteRange(a, b, true);
              if (n >= 3) this.setMsg(`${n} fewer lines`);
            }
          }
          this.count = '';
          this.lastChange = { keys: [op, op], n };
          return;
        }
        if (k === 'g') {
          this.pending = op + 'g';
          return;
        }
        let mk = k;
        if (op === 'c' && k === 'w') mk = 'e';
        if (op === 'c' && k === 'W') mk = 'E';
        const mo = this.motion(mk, n);
        if (!mo) {
          this.count = '';
          return;
        }
        this.applyOp(op, mo, k);
        this.count = '';
        return;
      }
      if (this.pending && this.pending.endsWith('g') && this.pending.length === 2) {
        const op = this.pending[0];
        this.pending = '';
        if (k === 'g') this.applyOp(op, this.motion('gg', n), 'gg');
        this.count = '';
        return;
      }
      if (this.pending === 'g') {
        this.pending = '';
        if (k === 'g') {
          const mo = this.motion('gg', n);
          this.cy = mo.y;
          this.cx = 0;
        } else if (k === 'J') this.join(n, false);
        else if (k === 'u' || k === 'U') {
          this.pending = 'g' + k;
          return;
        }
        this.count = '';
        return;
      }
      if (this.pending === 'Z') {
        this.pending = '';
        if (k === 'Z') return this.ex('x');
        if (k === 'Q') return this.ex('q!');
        return;
      }
      switch (k) {
        case 'i':
          this.enterInsert();
          break;
        case 'a':
          this.enterInsert();
          this.cx = Math.min(L[this.cy].length, this.cx + 1);
          break;
        case 'I':
          this.enterInsert();
          this.cx = Math.max(0, L[this.cy].search(/\S/));
          if (L[this.cy].search(/\S/) < 0) this.cx = L[this.cy].length;
          break;
        case 'A':
          this.enterInsert();
          this.cx = L[this.cy].length;
          break;
        case 'o':
          this.enterInsert();
          L.splice(this.cy + 1, 0, '');
          this.cy++;
          this.cx = 0;
          break;
        case 'O':
          this.enterInsert();
          L.splice(this.cy, 0, '');
          this.cx = 0;
          break;
        case 'R':
          this.enterInsert();
          this.mode = 'replace';
          break;
        case 'v':
        case 'V':
          this.setMsg('(visual mode is not simulated — use operators like dw, d$, 3dd, yy)', true);
          break;
        case 'x':
        case 'Delete':
          if (L[this.cy].length) {
            this.snap();
            const line = L[this.cy];
            this.reg = { text: line.slice(this.cx, this.cx + n), linewise: false };
            L[this.cy] = line.slice(0, this.cx) + line.slice(this.cx + n);
            this.lastChange = { keys: ['x'], n };
          }
          break;
        case 'X':
          if (this.cx > 0) {
            this.snap();
            const line = L[this.cy];
            const s = Math.max(0, this.cx - n);
            this.reg = { text: line.slice(s, this.cx), linewise: false };
            L[this.cy] = line.slice(0, s) + line.slice(this.cx);
            this.cx = s;
          }
          break;
        case 'D':
          this.applyOp('d', { y: this.cy, x: L[this.cy].length, inclusive: false }, '$');
          break;
        case 'C':
          this.applyOp('c', { y: this.cy, x: L[this.cy].length, inclusive: false }, '$');
          break;
        case 's':
          this.snap();
          this.reg = { text: L[this.cy].slice(this.cx, this.cx + n), linewise: false };
          L[this.cy] = L[this.cy].slice(0, this.cx) + L[this.cy].slice(this.cx + n);
          this.mode = 'insert';
          break;
        case 'S':
          this.snap();
          this.reg = { lines: [L[this.cy]], linewise: true };
          L[this.cy] = '';
          this.cx = 0;
          this.mode = 'insert';
          break;
        case 'Y':
          this.deleteRange({ y: this.cy, x: 0 }, { y: Math.min(L.length - 1, this.cy + n - 1), x: 0 }, true, true);
          break;
        case 'd':
        case 'y':
        case 'c':
        case '>':
        case '<':
          this.pending = k;
          return;
        case 'g':
        case 'Z':
        case 'r':
        case 'f':
        case 'F':
        case 't':
        case 'T':
          this.pending = k;
          return;
        case 'p':
          for (let i = 0; i < n; i++) this.put(false);
          this.lastChange = { keys: ['p'] };
          break;
        case 'P':
          for (let i = 0; i < n; i++) this.put(true);
          break;
        case 'u':
          for (let i = 0; i < n; i++) this.undo();
          break;
        case '^r':
          for (let i = 0; i < n; i++) this.redoOne();
          break;
        case 'J':
          this.join(Math.max(2, n), true);
          break;
        case '~': {
          this.snap();
          const line = L[this.cy];
          let s = '';
          for (let i = this.cx; i < Math.min(line.length, this.cx + n); i++) s += line[i] === line[i].toUpperCase() ? line[i].toLowerCase() : line[i].toUpperCase();
          L[this.cy] = line.slice(0, this.cx) + s + line.slice(this.cx + s.length);
          this.cx = Math.min(line.length - 1, this.cx + s.length);
          break;
        }
        case ':':
          this.mode = 'cmdline';
          this.cmd = this.count ? `.,.+${n - 1}` : '';
          break;
        case '/':
        case '?':
          this.mode = 'search';
          this.searchDir = k;
          this.cmd = '';
          break;
        case 'n':
          this.doSearch(null, 1, false);
          break;
        case 'N':
          this.doSearch(null, -1, false);
          break;
        case '*':
        case '#': {
          const m = /\w+/.exec(L[this.cy].slice(this.cx)) || /\w+/.exec(L[this.cy]);
          if (m) {
            this.search = null;
            this.doSearch('\\<' + m[0] + '\\>', k === '*' ? 1 : -1, true);
          }
          break;
        }
        case '.':
          if (this.lastChange) {
            const keys = this.lastChange.keys;
            const c = this.lastChange.n ? String(this.lastChange.n) : '';
            this.count = c;
            for (const kk of keys) this.keyNormal(kk);
          }
          break;
        case '^f':
        case 'PageDown':
          this.cy = Math.min(L.length - 1, this.cy + this.rows() - 2);
          this.top = Math.min(Math.max(0, L.length - 1), this.top + this.rows() - 2);
          break;
        case '^b':
        case 'PageUp':
          this.cy = Math.max(0, this.cy - this.rows() + 2);
          this.top = Math.max(0, this.top - this.rows() + 2);
          break;
        case '^d':
          this.cy = Math.min(L.length - 1, this.cy + Math.floor(this.rows() / 2));
          break;
        case '^u':
          this.cy = Math.max(0, this.cy - Math.floor(this.rows() / 2));
          break;
        case '^g':
          this.setMsg(`"${this.opts.filename || '[No Name]'}"${this.modified ? ' [Modified]' : ''} ${L.length} lines --${Math.round(((this.cy + 1) / L.length) * 100)}%--`);
          break;
        case 'Escape':
          if (!this.count) this.setMsg('');
          break;
        case 'q':
          this.setMsg('(q starts macro recording in vim — type :q to quit)', true);
          break;
        default: {
          const mo = this.motion(k, n);
          if (mo) {
            this.cy = mo.y;
            this.cx = mo.first ? Math.max(0, L[mo.y].search(/\S/)) : mo.x;
            if (mo.linewise && !mo.first) this.cx = Math.min(this.wantX !== undefined ? this.wantX : this.cx, Math.max(0, L[this.cy].length - 1));
          }
        }
      }
      if (!/^[jk]$|^Arrow(Up|Down)$/.test(k)) this.wantX = this.cx;
      this.count = '';
    }
    findChar(p, ch) {
      const line = this.lines[this.cy];
      if (p === 'f' || p === 't') {
        const i = line.indexOf(ch, this.cx + 1);
        if (i >= 0) this.cx = p === 'f' ? i : i - 1;
      } else {
        const i = line.lastIndexOf(ch, this.cx - 1);
        if (i >= 0) this.cx = p === 'F' ? i : i + 1;
      }
    }
    applyOp(op, mo, key) {
      const L = this.lines;
      const a = { y: this.cy, x: this.cx };
      if (mo.linewise) {
        if (op !== 'y') this.snap();
        this.deleteRange(a, mo, true, op === 'y');
        if (op === 'c') {
          L.splice(Math.min(a.y, mo.y), 0, '');
          this.cy = Math.min(a.y, mo.y);
          this.cx = 0;
          this.mode = 'insert';
        }
        if (op === 'y') this.cy = Math.min(a.y, mo.y);
        this.lastChange = { keys: [op, key] };
        return;
      }
      let b = { y: mo.y, x: mo.x };
      if (mo.inclusive) b.x++;
      // dw at end of line stops at end of line
      if ((key === 'w' || key === 'W') && b.y > a.y) b = { y: a.y, x: L[a.y].length };
      if (op !== 'y') this.snap();
      this.deleteRange(a, b, false, op === 'y');
      if (op === 'y') {
        this.cy = Math.min(a.y, b.y);
        this.cx = a.y === b.y ? Math.min(a.x, b.x) : a.x;
      }
      if (op === 'c') this.mode = 'insert';
      this.lastChange = { keys: [op, key] };
    }
    join(n, spaces) {
      const L = this.lines;
      if (this.cy >= L.length - 1) return;
      this.snap();
      for (let i = 1; i < n && this.cy < L.length - 1; i++) {
        const next = L[this.cy + 1];
        this.cx = L[this.cy].length;
        L[this.cy] = spaces ? L[this.cy].replace(/\s+$/, '') + (next.trim() ? ' ' : '') + next.replace(/^\s+/, '') : L[this.cy] + next;
        L.splice(this.cy + 1, 1);
      }
    }
    undo() {
      const s = this.undoStack.pop();
      if (!s) return this.setMsg('Already at oldest change');
      this.redoStack.push({ lines: this.lines.slice(), cy: this.cy, cx: this.cx });
      this.lines = s.lines;
      this.cy = Math.min(s.cy, this.lines.length - 1);
      this.cx = s.cx;
      this.setMsg('1 change; before #' + (this.undoStack.length + 1));
    }
    redoOne() {
      const s = this.redoStack.pop();
      if (!s) return this.setMsg('Already at newest change');
      this.undoStack.push({ lines: this.lines.slice(), cy: this.cy, cx: this.cx });
      this.lines = s.lines;
      this.cy = Math.min(s.cy, this.lines.length - 1);
      this.cx = s.cx;
      this.setMsg('1 change; after #' + this.undoStack.length);
    }
    parseRange(s) {
      // returns [start, end, rest]
      const L = this.lines;
      const addr = (t) => {
        if (t === '.' || t === '') return this.cy;
        if (t === '$') return L.length - 1;
        let m = /^([.$]|\d+)?([+-]\d*)?$/.exec(t);
        if (!m) return null;
        let base = m[1] === undefined || m[1] === '.' ? this.cy : m[1] === '$' ? L.length - 1 : +m[1] - 1;
        if (m[2]) base += m[2].length === 1 ? (m[2] === '+' ? 1 : -1) : +m[2];
        return base;
      };
      if (s.startsWith('%')) return [0, L.length - 1, s.slice(1)];
      const m = /^([.$]|\d+)?([+-]\d*)?(?:,([.$]|\d+)?([+-]\d*)?)?/.exec(s);
      if (!m || !m[0]) return [null, null, s];
      const a = addr((m[1] || '') + (m[2] || ''));
      const b = m[0].indexOf(',') >= 0 ? addr((m[3] || '') + (m[4] || '')) : a;
      return [a, b, s.slice(m[0].length)];
    }
    ex(c) {
      const L = this.lines;
      c = c.trim();
      this.lastEx = c;
      if (!c) return;
      let [a, b, rest] = this.parseRange(c);
      const hasRange = a !== null;
      const cmd = rest.trim();
      if (hasRange && !cmd) {
        this.cy = Math.max(0, Math.min(L.length - 1, b));
        this.cx = Math.max(0, L[this.cy].search(/\S/));
        return;
      }
      let m;
      if ((m = /^s(.)(.*)$/.exec(cmd)) && !/^set/.test(cmd)) {
        const d = m[1];
        const parts = [];
        let cur = '';
        for (let i = 0; i < m[2].length; i++) {
          const ch = m[2][i];
          if (ch === '\\' && m[2][i + 1] === d) {
            cur += d;
            i++;
          } else if (ch === d && parts.length < 2) {
            parts.push(cur);
            cur = '';
          } else cur += ch;
        }
        parts.push(cur);
        const [pat, rep = '', flags = ''] = parts;
        const p = pat || (this.search && this.search.pat) || '';
        let re;
        try {
          re = new RegExp(SIM.toJsRegex ? SIM.toJsRegex(p, false) : p, 'g' + (flags.indexOf('i') >= 0 ? 'i' : ''));
        } catch (e) {
          return this.setMsg('E486: Pattern not found: ' + p, true);
        }
        if (!hasRange) a = b = this.cy;
        this.snap();
        let count = 0;
        let lines = 0;
        for (let y = a; y <= b; y++) {
          let did = false;
          L[y] = L[y].replace(re, (...mm) => {
            if (flags.indexOf('g') < 0 && did) return mm[0];
            did = true;
            count++;
            return rep.replace(/\\(\d)|&|\\&|\\n|\\t/g, (x, g) => (x === '&' ? mm[0] : x === '\\&' ? '&' : x === '\\n' ? '\n' : x === '\\t' ? '\t' : mm[+g] || ''));
          });
          if (did) {
            lines++;
            this.cy = y;
          }
        }
        // expand inserted newlines
        for (let y = L.length - 1; y >= 0; y--) if (L[y].indexOf('\n') >= 0) L.splice(y, 1, ...L[y].split('\n'));
        if (!count) {
          this.undoStack.pop();
          return this.setMsg('E486: Pattern not found: ' + p, true);
        }
        this.cx = 0;
        this.search = { pat: p, re: new RegExp(re.source, re.ignoreCase ? 'i' : ''), dir: 1 };
        if (count > 1 || lines > 1) this.setMsg(`${count} substitution${count > 1 ? 's' : ''} on ${lines} line${lines > 1 ? 's' : ''}`);
        return;
      }
      if (/^d(elete)?$/.test(cmd)) {
        if (!hasRange) a = b = this.cy;
        this.snap();
        this.deleteRange({ y: a, x: 0 }, { y: b, x: 0 }, true);
        return;
      }
      if (/^(y|yank)$/.test(cmd)) {
        if (!hasRange) a = b = this.cy;
        this.deleteRange({ y: a, x: 0 }, { y: b, x: 0 }, true, true);
        return;
      }
      if ((m = /^(m|co|t)\s*([.$]|\d+)$/.exec(cmd))) {
        if (!hasRange) a = b = this.cy;
        const dest = m[2] === '$' ? L.length - 1 : m[2] === '.' ? this.cy : +m[2] - 1;
        this.snap();
        const block = L.slice(a, b + 1);
        if (m[1] === 'm') {
          L.splice(a, b - a + 1);
          const at = dest >= b ? dest - (b - a) : dest;
          L.splice(at + 1, 0, ...block);
          this.cy = at + block.length;
        } else {
          L.splice(dest + 1, 0, ...block);
          this.cy = dest + block.length;
        }
        return;
      }
      if ((m = /^(w|write|wq|x|xit|exit|wq!|w!|x!)(?:\s+(.+))?$/.exec(cmd))) {
        const force = /!/.test(m[1]);
        const name = m[2];
        if (this.opts.readonly && !force && !name) return this.setMsg("E45: 'readonly' option is set (add ! to override)", true);
        if (/^x/.test(m[1]) && !this.modified && !name) return this.quit();
        let text = (hasRange ? L.slice(a, b + 1) : L).join('\n') + '\n';
        const r = this.opts.save ? this.opts.save(text, name) : { message: 'written' };
        if (r && r.error) return this.setMsg(r.error, true);
        if (!hasRange) this.saved = this.text;
        this.setMsg(r && r.message ? r.message : 'written');
        this.wrote = true;
        if (/^(wq|x)/.test(m[1])) return this.quit(r && r.message);
        return;
      }
      if ((m = /^(q|quit)(!)?$/.exec(cmd)) || (m = /^(qa|qall)(!)?$/.exec(cmd))) {
        if (this.modified && !m[2]) return this.setMsg('E37: No write since last change (add ! to override)', true);
        return this.quit();
      }
      if (/^e!$/.test(cmd)) {
        this.snap();
        this.lines = this.saved.split('\n');
        this.cy = Math.min(this.cy, this.lines.length - 1);
        this.setMsg(`"${this.opts.filename}" ${this.lines.length}L reverted`);
        return;
      }
      if ((m = /^e(dit)?\s+(.+)$/.exec(cmd))) return this.setMsg('(opening other files is not simulated — quit with :q and run vi ' + m[2] + ')', true);
      if ((m = /^se(t)?\s+(.+)$/.exec(cmd))) {
        for (const o of m[2].split(/\s+/)) {
          if (o === 'nu' || o === 'number') this.num = true;
          else if (o === 'nonu' || o === 'nonumber') this.num = false;
          else if (o === 'ic' || o === 'ignorecase') this.opts.ignorecase = true;
          else if (o === 'noic' || o === 'noignorecase') this.opts.ignorecase = false;
          else if (o === 'ai' || o === 'autoindent') this.opts.autoindent = true;
          else if (o === 'noai' || o === 'noautoindent') this.opts.autoindent = false;
          else if (o === 'hlsearch' || o === 'hls' || o === 'nohlsearch' || o === 'nohls' || /^(ts|tabstop|sw|shiftwidth)=/.test(o) || o === 'list' || o === 'nolist' || o === 'paste' || o === 'nopaste') {
            /* accepted */
          } else return this.setMsg('E518: Unknown option: ' + o, true);
        }
        return;
      }
      if (/^noh(lsearch)?$/.test(cmd)) {
        this.search = this.search ? { ...this.search, re: null, keep: this.search.re } : null;
        if (this.search) this.search.re = null;
        return;
      }
      if ((m = /^r(ead)?\s+(.+)$/.exec(cmd))) {
        const sh = this.opts.shell;
        if (!sh) return;
        try {
          const t = m[2].startsWith('!') ? sh.capture(m[2].slice(1)).out : sh.fs.readFile(m[2], sh.cwd);
          this.snap();
          const ins = t.replace(/\n$/, '').split('\n');
          L.splice(this.cy + 1, 0, ...ins);
          this.cy++;
        } catch (e) {
          this.setMsg(`E484: Can't open file ${m[2]}`, true);
        }
        return;
      }
      if ((m = /^!(.*)$/.exec(cmd))) {
        const sh = this.opts.shell;
        if (!sh) return this.setMsg('E: no shell', true);
        if (hasRange) {
          // filter lines through command, e.g. :%!sort
          const input = L.slice(a, b + 1).join('\n') + '\n';
          let out = '';
          sh.run(m[1], { stdin: new SIM.Stream(input), out: (s) => (out += s), err: (s) => (out += s) });
          this.snap();
          L.splice(a, b - a + 1, ...out.replace(/\n$/, '').split('\n'));
          this.setMsg(`${b - a + 1} lines filtered`);
          return;
        }
        const r = sh.capture(m[1]);
        this.setMsg((r.out + r.err).replace(/\n+$/, '').replace(/\n/g, ' ⏎ ').slice(0, 200) || `(shell returned ${r.status})`);
        return;
      }
      if (/^h(elp)?$/.test(cmd)) return this.setMsg('i insert · Esc normal · :w save · :q quit · :wq save+quit · :q! discard · dd yy p u · /search n', false);
      if (/^\d+$/.test(cmd)) {
        this.cy = Math.min(L.length - 1, +cmd - 1);
        return;
      }
      this.setMsg(`E492: Not an editor command: ${cmd}`, true);
    }
    quit(msg) {
      this.closed = true;
      this.emit('quit');
      if (this.opts.onQuit) this.opts.onQuit(msg);
    }
  }
  SIM.ViEditor = ViEditor;

  /* =========================== nano =========================== */
  class NanoEditor {
    constructor(root, opts = {}) {
      this.root = root;
      this.opts = opts;
      this.saved = opts.text || '';
      this.cut = '';
      root.innerHTML = `<div class="nano"><div class="nano-head"><span>GNU nano 7.2</span><span class="nano-name"></span><span class="nano-mod"></span></div><textarea class="nano-text" spellcheck="false"></textarea><div class="nano-status"></div><div class="nano-keys"><span><b>^G</b> Help</span><span><b>^O</b> Write Out</span><span><b>^W</b> Where Is</span><span><b>^K</b> Cut</span><span><b>^U</b> Paste</span><span><b>^C</b> Location</span><span><b>^X</b> Exit</span><span><b>M-U</b> Undo</span></div></div>`;
      this.ta = root.querySelector('.nano-text');
      this.status = root.querySelector('.nano-status');
      this.nameEl = root.querySelector('.nano-name');
      this.modEl = root.querySelector('.nano-mod');
      this.ta.value = opts.text || '';
      this.nameEl.textContent = opts.filename || 'New Buffer';
      this.history = [this.ta.value];
      this.setStatus(opts.isNew ? '[ New File ]' : opts.readonly ? '[ File is read-only ]' : `[ Read ${this.ta.value.split('\n').length - (this.ta.value.endsWith('\n') ? 1 : 0)} lines ]`);
      this.ta.addEventListener('keydown', (e) => this.onKey(e));
      this.ta.addEventListener('input', () => {
        this.modEl.textContent = this.modified ? 'Modified' : '';
        this.history.push(this.ta.value);
        if (this.history.length > 100) this.history.shift();
        if (opts.onChange) opts.onChange({ text: this.ta.value, modified: this.modified });
      });
      setTimeout(() => this.ta.focus(), 0);
    }
    get modified() {
      return this.ta.value !== this.saved;
    }
    setStatus(t, prompt) {
      this.status.innerHTML = '';
      if (prompt) {
        const label = document.createElement('span');
        label.textContent = t;
        const inp = document.createElement('input');
        inp.className = 'nano-prompt';
        inp.value = prompt.value || '';
        this.status.append(label, inp);
        setTimeout(() => {
          inp.focus();
          inp.select();
        }, 0);
        inp.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            prompt.done(inp.value);
          } else if (e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
            e.preventDefault();
            this.setStatus('[ Cancelled ]');
            this.ta.focus();
          } else if (prompt.keys && prompt.keys(e)) e.preventDefault();
        });
      } else this.status.textContent = t;
    }
    write(cb) {
      this.setStatus('File Name to Write: ', {
        value: this.opts.filename || '',
        done: (name) => {
          const r = this.opts.save ? this.opts.save(this.ta.value, name && name !== this.opts.filename ? name : undefined) : {};
          if (r && r.error) this.setStatus('[ Error writing: ' + r.error + ' ]');
          else {
            this.saved = this.ta.value;
            this.modEl.textContent = '';
            if (name) {
              this.opts.filename = name;
              this.nameEl.textContent = name;
            }
            this.setStatus(`[ Wrote ${this.ta.value.split('\n').length - (this.ta.value.endsWith('\n') ? 1 : 0)} lines ]`);
            if (cb) return cb();
          }
          this.ta.focus();
        },
      });
    }
    lineBounds() {
      const v = this.ta.value;
      const p = this.ta.selectionStart;
      const s = v.lastIndexOf('\n', p - 1) + 1;
      let e = v.indexOf('\n', p);
      if (e < 0) e = v.length;
      return [s, e];
    }
    onKey(e) {
      const k = e.key.toLowerCase();
      if (e.altKey && k === 'u') {
        e.preventDefault();
        if (this.history.length > 1) {
          this.history.pop();
          this.ta.value = this.history[this.history.length - 1];
        }
        return;
      }
      if (!e.ctrlKey) return;
      const v = this.ta.value;
      switch (k) {
        case 'o':
          e.preventDefault();
          this.write();
          break;
        case 's':
          e.preventDefault();
          this.write();
          break;
        case 'x':
          e.preventDefault();
          if (!this.modified) return this.close();
          this.setStatus('Save modified buffer?  Y Yes   N No   ^C Cancel ', {
            value: '',
            done: (a) => {
              if (/^y/i.test(a)) this.write(() => this.close());
              else if (/^n/i.test(a)) this.close();
            },
            keys: (ev) => {
              if (/^[yY]$/.test(ev.key)) {
                this.write(() => this.close());
                return true;
              }
              if (/^[nN]$/.test(ev.key)) {
                this.close();
                return true;
              }
              return false;
            },
          });
          break;
        case 'k': {
          e.preventDefault();
          const [s, en] = this.lineBounds();
          this.cut = v.slice(s, Math.min(v.length, en + 1));
          this.ta.value = v.slice(0, s) + v.slice(Math.min(v.length, en + 1));
          this.ta.setSelectionRange(s, s);
          this.ta.dispatchEvent(new Event('input'));
          break;
        }
        case 'u': {
          e.preventDefault();
          const [s] = this.lineBounds();
          this.ta.value = v.slice(0, s) + this.cut + v.slice(s);
          this.ta.setSelectionRange(s + this.cut.length, s + this.cut.length);
          this.ta.dispatchEvent(new Event('input'));
          break;
        }
        case 'w':
          e.preventDefault();
          this.setStatus('Search: ', {
            value: this.lastSearch || '',
            done: (q) => {
              this.lastSearch = q;
              const i = v.indexOf(q, this.ta.selectionEnd);
              const j = i < 0 ? v.indexOf(q) : i;
              if (j < 0) this.setStatus(`[ "${q}" not found ]`);
              else {
                this.ta.focus();
                this.ta.setSelectionRange(j, j + q.length);
                this.setStatus(i < 0 ? '[ Search Wrapped ]' : '');
              }
              this.ta.focus();
            },
          });
          break;
        case 'c': {
          e.preventDefault();
          const before = v.slice(0, this.ta.selectionStart);
          const line = before.split('\n').length;
          const col = before.length - before.lastIndexOf('\n');
          this.setStatus(`[ line ${line}/${v.split('\n').length}, col ${col}, char ${before.length}/${v.length} ]`);
          break;
        }
        case 'g':
          e.preventDefault();
          this.setStatus('nano help: ^O save, ^X exit, ^K cut line, ^U paste, ^W search, ^C cursor position, M-U undo');
          break;
        case '_':
          e.preventDefault();
          this.setStatus('Enter line number: ', {
            done: (n) => {
              const lines = v.split('\n');
              let pos = 0;
              for (let i = 0; i < Math.min(lines.length, +n - 1); i++) pos += lines[i].length + 1;
              this.ta.focus();
              this.ta.setSelectionRange(pos, pos);
              this.setStatus('');
            },
          });
          break;
      }
    }
    close() {
      this.closed = true;
      if (this.opts.onQuit) this.opts.onQuit();
    }
  }
  SIM.NanoEditor = NanoEditor;
})(typeof window !== 'undefined' ? window : globalThis);
