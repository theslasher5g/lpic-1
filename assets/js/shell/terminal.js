/* LPIC-1 Trainer — browser terminal front end for SIM.Shell. */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // ANSI SGR -> HTML spans
  SIM.ansiToHtml = function (text) {
    let out = '';
    let open = 0;
    const parts = text.split(/(\x1b\[[0-9;]*m)/);
    for (const p of parts) {
      const m = /^\x1b\[([0-9;]*)m$/.exec(p);
      if (!m) {
        out += esc(p);
        continue;
      }
      const codes = m[1].split(';').filter(Boolean).map(Number);
      if (!codes.length || codes.indexOf(0) >= 0) {
        out += '</span>'.repeat(open);
        open = 0;
        if (!codes.length || codes.every((x) => x === 0)) continue;
      }
      const cls = [];
      for (const c of codes) {
        if (c === 1) cls.push('a-b');
        else if (c === 2) cls.push('a-dim');
        else if (c === 4) cls.push('a-u');
        else if (c === 7) cls.push('a-inv');
        else if (c >= 30 && c <= 37) cls.push('a-f' + (c - 30));
        else if (c >= 40 && c <= 47) cls.push('a-bg' + (c - 40));
        else if (c >= 90 && c <= 97) cls.push('a-f' + (c - 90) + ' a-b');
      }
      if (cls.length) {
        out += `<span class="${cls.join(' ')}">`;
        open++;
      }
    }
    return out + '</span>'.repeat(open);
  };

  class Terminal {
    constructor(root, opts = {}) {
      this.root = root;
      this.opts = opts;
      this.lineBuf = '';
      this.histIdx = -1;
      this.busy = false;
      root.classList.add('term');
      root.innerHTML = '<div class="term-out" aria-live="polite"></div><div class="term-line"><span class="term-prompt"></span><input class="term-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="shell input"></div>';
      this.outEl = root.querySelector('.term-out');
      this.promptEl = root.querySelector('.term-prompt');
      this.input = root.querySelector('.term-input');
      this.sh = this.makeShell();
      this.input.addEventListener('keydown', (e) => this.onKey(e));
      root.addEventListener('click', (e) => {
        if (window.getSelection && String(window.getSelection())) return;
        if (!this.overlay) this.input.focus();
      });
      if (!opts.quiet) this.banner();
      this.updatePrompt();
    }
    makeShell(fresh) {
      const persist = this.opts.persist;
      let saved = !fresh && persist ? persist.load() : null;
      const common = {
        promptFn: (q, secret) => this.ask(q, secret),
        onEvent: (t, d) => this.onEvent(t, d),
      };
      let sh;
      if (saved && saved.fs) {
        try {
          sh = new SIM.Shell(Object.assign({ fs: SIM.VFS.fromJSON(saved.fs), state: saved.state, user: 'student' }, common));
          sh.history = saved.history || [];
          if (saved.cwd && sh.fs.tryLookup(saved.cwd, '/')) sh.cwd = sh.vars.PWD = saved.cwd;
        } catch (e) {
          console.warn('could not restore sandbox', e);
          sh = null;
        }
      }
      if (!sh) sh = new SIM.Shell(Object.assign({}, common, this.opts.shellOpts || {}));
      if (this.opts.setup) this.opts.setup(sh);
      return sh;
    }
    banner() {
      const motd = this.sh.fs.tryLookup('/etc/motd', '/');
      this.print(`\x1b[1;32mDebian GNU/Linux 12 lpic-lab pts/0\x1b[0m\n${motd ? motd.node.data : ''}`);
    }
    save() {
      if (!this.opts.persist) return;
      clearTimeout(this._saveT);
      this._saveT = setTimeout(() => {
        try {
          // always persist the base (student) session, not a nested su/sudo -i shell
          const base = this.sh.userStack.length ? this.sh.userStack[0] : null;
          this.opts.persist.save({ fs: this.sh.fs.toJSON(), state: this.sh.state, history: this.sh.history.slice(-500), cwd: base ? base.cwd : this.sh.cwd, v: 1 });
        } catch (e) {
          console.warn('sandbox save failed', e);
        }
      }, 400);
    }
    print(text) {
      if (!text) return;
      const span = document.createElement('span');
      span.innerHTML = SIM.ansiToHtml(text);
      this.outEl.appendChild(span);
      const max = 4000;
      while (this.outEl.childNodes.length > max) this.outEl.removeChild(this.outEl.firstChild);
      this.scroll();
    }
    scroll() {
      const sc = this.opts.scrollEl || this.root;
      sc.scrollTop = sc.scrollHeight;
    }
    clear() {
      this.outEl.innerHTML = '';
    }
    updatePrompt(ps2) {
      const p = ps2 ? this.sh.vars.PS2 || '> ' : this.sh.prompt();
      const u = this.sh.username;
      // colourise like Debian's default bashrc
      const m = /^([^@]+)@([^:]+):(.*?)([#$] )$/.exec(p);
      if (!ps2 && m) this.promptEl.innerHTML = `<span class="${u === 'root' ? 'p-root' : 'p-user'}">${esc(m[1])}@${esc(m[2])}</span>:<span class="p-dir">${esc(m[3])}</span>${esc(m[4])}`;
      else this.promptEl.textContent = p;
    }
    ask(q, secret) {
      if (this.opts.askFn) return this.opts.askFn(q, secret);
      if (typeof window === 'undefined' || !window.prompt) return null;
      const r = window.prompt(q + (secret ? '\n(simulated: any password is accepted)' : ''), '');
      if (q && !secret) this.print(`${q} ${r === null ? '' : r}\n`);
      else if (q) this.print(`${q}\n`);
      return r;
    }
    focus() {
      this.input.focus();
    }
    // execute a command line as if typed
    exec(line, opts = {}) {
      if (this.busy || this.overlay) return;
      if (opts.typed) this.input.value = line;
      this.submit(line);
    }
    expandHistory(line) {
      const h = this.sh.history;
      if (line.indexOf('!') < 0 && line[0] !== '^') return line;
      let changed = false;
      const m0 = /^\^([^^]*)\^([^^]*)\^?$/.exec(line);
      if (m0) {
        const last = h[h.length - 1] || '';
        if (last.indexOf(m0[1]) < 0) throw new Error(':s' + m0[1] + '^' + m0[2] + ': substitution failed');
        return last.replace(m0[1], m0[2]);
      }
      let inQ = false;
      let out = '';
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === "'") inQ = !inQ;
        if (c !== '!' || inQ || i + 1 >= line.length || /[\s=(]/.test(line[i + 1])) {
          out += c;
          continue;
        }
        const rest = line.slice(i + 1);
        let m;
        let rep = null;
        let len = 0;
        if (rest[0] === '!') {
          rep = h[h.length - 1];
          len = 1;
        } else if (rest[0] === '$') {
          const last = h[h.length - 1] || '';
          rep = last.trim().split(/\s+/).pop();
          len = 1;
        } else if (rest[0] === '*') {
          rep = (h[h.length - 1] || '').trim().split(/\s+/).slice(1).join(' ');
          len = 1;
        } else if ((m = /^-?\d+/.exec(rest))) {
          const n = +m[0];
          rep = n < 0 ? h[h.length + n] : h[n - 1];
          len = m[0].length;
        } else if ((m = /^[^\s;|&]+/.exec(rest))) {
          for (let k = h.length - 1; k >= 0; k--)
            if (h[k].startsWith(m[0])) {
              rep = h[k];
              break;
            }
          len = m[0].length;
        }
        if (rep === null || rep === undefined) throw new Error(`!${rest.slice(0, len || 1)}: event not found`);
        out += rep;
        i += len;
        changed = true;
      }
      return changed ? out : line;
    }
    submit(raw) {
      const ps = this.lineBuf ? this.sh.vars.PS2 || '> ' : null;
      this.print((ps !== null ? ps : this.promptEl.textContent) + raw + '\n');
      this.input.value = '';
      this.histIdx = -1;
      let line = raw;
      if (!this.lineBuf) {
        try {
          const ex = this.expandHistory(raw);
          if (ex !== raw) {
            this.print(ex + '\n');
            line = ex;
          }
        } catch (e) {
          this.print(`bash: ${e.message}\n`);
          this.updatePrompt();
          return;
        }
      }
      const src = this.lineBuf ? this.lineBuf + '\n' + line : line;
      if (!src.trim()) {
        this.lineBuf = '';
        this.after();
        return;
      }
      const io = { stdin: null, out: (s) => this.print(s), err: (s) => this.print(s) };
      io.tty = io.out;
      this.busy = true;
      this.sh.steps = 0;
      const r = this.sh.run(src, io);
      this.busy = false;
      if (r.incomplete) {
        this.lineBuf = src;
        this.updatePrompt(true);
        return;
      }
      this.lineBuf = '';
      const hc = this.sh.vars.HISTCONTROL || '';
      const h = this.sh.history;
      const skipSpace = /ignore(space|both)/.test(hc) && /^\s/.test(src);
      const skipDup = /ignore(dups|both)/.test(hc) && h[h.length - 1] === src;
      if (!skipSpace && !skipDup) h.push(src.replace(/\n/g, '; ').replace(/(do|then|else|\{);/g, '$1'));
      if (r.exit) this.handleExit(r.status);
      if (this.opts.onCommand) this.opts.onCommand(src, r.status, this);
      this.after();
    }
    handleExit(code) {
      const sh = this.sh;
      if (sh.userStack.length) {
        this.print('logout\n');
        sh.popUser();
        sh.status = code;
      } else {
        this.print('logout\n\x1b[2m(the session ended — a new login shell was started)\x1b[0m\n\n');
        sh.login('student');
      }
    }
    after() {
      const notes = this.sh.reapJobs();
      if (notes.length) this.print(notes.join('\n') + '\n');
      const sd = this.sh.state.shutdown;
      if (sd && sd.at <= Date.now()) {
        this.sh.state.shutdown = null;
        this.onEvent('power', { kind: sd.kind, target: this.sh.state.target });
      }
      this.updatePrompt();
      this.save();
      this.scroll();
    }
    onEvent(type, data) {
      switch (type) {
        case 'clear':
          this.clear();
          break;
        case 'note':
          this.print(`\x1b[2m${data}\x1b[0m\n`);
          break;
        case 'echoInput':
          break;
        case 'resetSandbox':
          if (typeof window !== 'undefined' && window.confirm && !window.confirm('Reset the sandbox to its factory state? All your files and changes in the simulator will be lost.')) return;
          this.sh = this.makeShell(true);
          this.clear();
          this.banner();
          this.save();
          break;
        case 'pager':
          this.openPager(data.name, data.text);
          break;
        case 'edit':
          this.openEditor(data);
          break;
        case 'power':
          this.power(data);
          break;
        case 'fdisk':
          if (this.opts.onFdisk) this.opts.onFdisk(data);
          break;
      }
    }
    power(d) {
      const lines =
        d.kind === 'reboot'
          ? ['[  OK  ] Stopped target Graphical Interface.', '[  OK  ] Stopped OpenBSD Secure Shell server.', '[  OK  ] Unmounted /boot/efi.', '[  OK  ] Reached target System Reboot.', '', 'reboot: Restarting system', '', 'UEFI firmware (EDK II) ... POST OK', 'GRUB loading.', 'Booting `Debian GNU/Linux\'', 'Loading Linux 6.1.0-18-amd64 ...', 'Loading initial ramdisk ...', '[    1.512309] EXT4-fs (sda2): mounted filesystem with ordered data mode.', '[  OK  ] Started Journal Service.', '[  OK  ] Reached target Local File Systems.', '[  OK  ] Started OpenBSD Secure Shell server.', `[  OK  ] Reached target ${d.target === 'multi-user.target' ? 'Multi-User System' : 'Graphical Interface'}.`, '', 'Debian GNU/Linux 12 lpic-lab tty1', '', 'lpic-lab login: student (automatic login in the simulator)', '']
          : ['[  OK  ] Stopped target Graphical Interface.', '[  OK  ] Reached target Power-Off.', '', 'reboot: Power down', '', '\x1b[2m(the machine is off — pressing the virtual power button...)\x1b[0m', '', 'Debian GNU/Linux 12 lpic-lab tty1', ''];
      this.print(lines.map((l) => l.replace('[  OK  ]', '[\x1b[1;32m  OK  \x1b[0m]')).join('\n') + '\n');
      while (this.sh.userStack.length) this.sh.popUser();
      this.sh.login('student');
      this.updatePrompt();
    }
    /* ---------- pager (less / man) ---------- */
    openPager(name, text) {
      const ov = document.createElement('div');
      ov.className = 'term-overlay pager';
      ov.tabIndex = 0;
      ov.innerHTML = `<pre class="pager-body"></pre><div class="pager-status"></div>`;
      const body = ov.querySelector('.pager-body');
      const status = ov.querySelector('.pager-status');
      body.innerHTML = SIM.ansiToHtml(text);
      status.textContent = `${name}  —  q: quit · space/b: page · /: search · g/G: top/bottom`;
      this.root.appendChild(ov);
      this.overlay = ov;
      ov.focus();
      let searching = false;
      let query = '';
      const close = () => {
        ov.remove();
        this.overlay = null;
        this.input.focus();
        this.print(`\x1b[2m(${name} closed)\x1b[0m\n`);
      };
      const find = (q) => {
        body.innerHTML = SIM.ansiToHtml(text);
        if (!q) return;
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        let first = null;
        for (const n of nodes) {
          const idx = n.data.toLowerCase().indexOf(q.toLowerCase());
          if (idx < 0) continue;
          const r = document.createRange();
          r.setStart(n, idx);
          r.setEnd(n, idx + q.length);
          const mark = document.createElement('mark');
          r.surroundContents(mark);
          if (!first) first = mark;
        }
        if (first) first.scrollIntoView({ block: 'center' });
        else status.textContent = 'Pattern not found  (press q to quit)';
      };
      ov.addEventListener('keydown', (e) => {
        if (searching) {
          if (e.key === 'Enter') {
            searching = false;
            find(query);
            if (status.textContent.indexOf('not found') < 0) status.textContent = `/${query}  —  n: next · q: quit`;
          } else if (e.key === 'Escape') searching = false;
          else if (e.key === 'Backspace') query = query.slice(0, -1);
          else if (e.key.length === 1) query += e.key;
          if (searching) status.textContent = '/' + query;
          e.preventDefault();
          return;
        }
        const k = e.key;
        if (k === 'q' || k === 'Escape') close();
        else if (k === ' ' || k === 'f' || k === 'PageDown') ov.scrollTop += ov.clientHeight - 40;
        else if (k === 'b' || k === 'PageUp') ov.scrollTop -= ov.clientHeight - 40;
        else if (k === 'j' || k === 'ArrowDown' || k === 'Enter') ov.scrollTop += 20;
        else if (k === 'k' || k === 'ArrowUp') ov.scrollTop -= 20;
        else if (k === 'g' || k === 'Home') ov.scrollTop = 0;
        else if (k === 'G' || k === 'End') ov.scrollTop = ov.scrollHeight;
        else if (k === '/') {
          searching = true;
          query = '';
          status.textContent = '/';
        } else if (k === 'n') {
          const marks = [...body.querySelectorAll('mark')];
          const next = marks.find((m) => m.offsetTop > ov.scrollTop + ov.clientHeight / 2 + 5);
          if (next) next.scrollIntoView({ block: 'center' });
        } else return;
        e.preventDefault();
      });
    }
    /* ---------- editors ---------- */
    openEditor(d) {
      const ov = document.createElement('div');
      ov.className = 'term-overlay editor-host';
      this.root.appendChild(ov);
      this.overlay = ov;
      const done = (msg) => {
        ov.remove();
        this.overlay = null;
        if (msg) this.print(msg + '\n');
        this.updatePrompt();
        this.save();
        this.input.focus();
        if (this.opts.onCommand) this.opts.onCommand('#editor-closed', 0, this);
      };
      const Ed = d.mode === 'nano' ? SIM.NanoEditor : SIM.ViEditor;
      const ed = new Ed(ov, {
        text: d.text,
        filename: d.path ? d.path.split('/').pop() : d.title,
        title: d.title,
        readonly: d.readonly,
        isNew: d.isNew,
        save: (t, as) => d.save(t, as),
        onQuit: (msg) => done(msg),
        shell: this.sh,
      });
      this.editor = ed;
    }
    /* ---------- keyboard ---------- */
    onKey(e) {
      const inp = this.input;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.searchMode) return this.endSearch(true);
        this.submit(inp.value);
        return;
      }
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'c') {
          if (inp.selectionStart !== inp.selectionEnd) return; // allow copy
          e.preventDefault();
          if (this.searchMode) this.endSearch(false);
          this.print((this.lineBuf ? '> ' : this.promptEl.textContent) + inp.value + '^C\n');
          inp.value = '';
          this.lineBuf = '';
          this.updatePrompt();
          return;
        }
        if (k === 'l') {
          e.preventDefault();
          this.clear();
          return;
        }
        if (k === 'd') {
          e.preventDefault();
          if (!inp.value) {
            this.print(this.promptEl.textContent + '\n');
            this.handleExit(0);
            this.after();
          }
          return;
        }
        if (k === 'a') {
          e.preventDefault();
          inp.setSelectionRange(0, 0);
          return;
        }
        if (k === 'e') {
          e.preventDefault();
          inp.setSelectionRange(inp.value.length, inp.value.length);
          return;
        }
        if (k === 'u') {
          e.preventDefault();
          this.killBuf = inp.value.slice(0, inp.selectionStart);
          inp.value = inp.value.slice(inp.selectionStart);
          inp.setSelectionRange(0, 0);
          return;
        }
        if (k === 'k') {
          e.preventDefault();
          this.killBuf = inp.value.slice(inp.selectionStart);
          inp.value = inp.value.slice(0, inp.selectionStart);
          return;
        }
        if (k === 'w') {
          e.preventDefault();
          const pos = inp.selectionStart;
          const before = inp.value.slice(0, pos).replace(/\S+\s*$/, '');
          this.killBuf = inp.value.slice(before.length, pos);
          inp.value = before + inp.value.slice(pos);
          inp.setSelectionRange(before.length, before.length);
          return;
        }
        if (k === 'y') {
          e.preventDefault();
          if (this.killBuf) {
            const p = inp.selectionStart;
            inp.value = inp.value.slice(0, p) + this.killBuf + inp.value.slice(p);
          }
          return;
        }
        if (k === 'r') {
          e.preventDefault();
          this.startSearch();
          return;
        }
        if (k === 'z') {
          e.preventDefault();
          this.print(this.promptEl.textContent + inp.value + '^Z\n\x1b[2m(Ctrl+Z suspends the foreground job — in the simulator start background jobs with "&", e.g. sleep 300 &)\x1b[0m\n');
          inp.value = '';
          return;
        }
      }
      if (this.searchMode) {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.endSearch(false);
        }
        setTimeout(() => this.updateSearch(), 0);
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const h = this.sh.history;
        if (!h.length) return;
        if (this.histIdx === -1) this.draft = inp.value;
        if (e.key === 'ArrowUp') this.histIdx = this.histIdx === -1 ? h.length - 1 : Math.max(0, this.histIdx - 1);
        else this.histIdx = this.histIdx === -1 ? -1 : this.histIdx + 1;
        if (this.histIdx >= h.length) this.histIdx = -1;
        inp.value = this.histIdx === -1 ? this.draft || '' : h[this.histIdx];
        setTimeout(() => inp.setSelectionRange(inp.value.length, inp.value.length), 0);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        this.complete();
        return;
      }
    }
    startSearch() {
      this.searchMode = true;
      this.searchSaved = this.input.value;
      this.input.value = '';
      this.promptEl.textContent = "(reverse-i-search)`': ";
    }
    updateSearch() {
      const q = this.input.value;
      const h = this.sh.history;
      let hit = '';
      for (let i = h.length - 1; i >= 0; i--)
        if (q && h[i].indexOf(q) >= 0) {
          hit = h[i];
          break;
        }
      this.searchHit = hit;
      this.promptEl.textContent = `(reverse-i-search)\`${q}': ${hit}  ⏎ `;
    }
    endSearch(run) {
      this.searchMode = false;
      const hit = this.searchHit || '';
      this.updatePrompt();
      this.input.value = run ? hit : this.searchSaved || '';
      if (run && hit) this.input.value = hit;
    }
    complete() {
      const inp = this.input;
      const pos = inp.selectionStart;
      const before = inp.value.slice(0, pos);
      const after = inp.value.slice(pos);
      const m = /(\S*)$/.exec(before);
      const word = m[1];
      const isCmd = /^\s*(sudo\s+)?\S*$/.test(before) && word.indexOf('/') < 0;
      const sh = this.sh;
      let cands = [];
      if (word.startsWith('$')) {
        cands = Object.keys(sh.vars).filter((k) => ('$' + k).startsWith(word)).map((k) => '$' + k);
      } else if (isCmd) {
        const set = new Set([...Object.keys(SIM.builtins), ...Object.keys(sh.aliases), ...Object.keys(sh.funcs)]);
        for (const d of (sh.vars.PATH || '').split(':')) {
          const r = sh.fs.tryLookup(d, '/');
          if (r && r.node.t === 'd') for (const n of Object.keys(r.node.ents)) set.add(n);
        }
        cands = [...set].filter((c) => c.startsWith(word)).sort();
      } else {
        let w = word.replace(/^~(?=\/|$)/, sh.vars.HOME);
        const slash = w.lastIndexOf('/');
        const dir = slash >= 0 ? w.slice(0, slash + 1) || '/' : '';
        const base = slash >= 0 ? w.slice(slash + 1) : w;
        const r = sh.fs.tryLookup(dir || '.', sh.cwd);
        if (r && r.node.t === 'd' && sh.fs.can(r.node, 4)) {
          cands = Object.keys(r.node.ents)
            .filter((n) => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.')))
            .sort()
            .map((n) => {
              const node = sh.fs.tryLookup((dir || '') + n, sh.cwd);
              return (word.slice(0, word.length - base.length)) + n + (node && node.node.t === 'd' ? '/' : '');
            });
        }
      }
      if (!cands.length) return;
      if (cands.length === 1) {
        const c = cands[0];
        const add = c.endsWith('/') ? '' : ' ';
        inp.value = before.slice(0, before.length - word.length) + c + add + after;
        const np = before.length - word.length + c.length + add.length;
        inp.setSelectionRange(np, np);
        return;
      }
      // common prefix
      let pre = cands[0];
      for (const c of cands) while (!c.startsWith(pre)) pre = pre.slice(0, -1);
      if (pre.length > word.length) {
        inp.value = before.slice(0, before.length - word.length) + pre + after;
        const np = before.length - word.length + pre.length;
        inp.setSelectionRange(np, np);
        return;
      }
      const names = cands.map((c) => c.replace(/\/$/, '').split('/').pop() + (c.endsWith('/') ? '/' : ''));
      this.print(this.promptEl.textContent + inp.value + '\n' + SIM.columns(names.slice(0, 200), names.slice(0, 200)) + (names.length > 200 ? `... (${names.length} possibilities)\n` : ''));
    }
  }
  SIM.Terminal = Terminal;
})(typeof window !== 'undefined' ? window : globalThis);
