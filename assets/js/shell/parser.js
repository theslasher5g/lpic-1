/* LPIC-1 Trainer — bash-like tokenizer and parser.
 * Produces an AST that interp.js executes. Words keep their raw text and are
 * expanded at execution time (so variables inside loops work). */
(function (G) {
  'use strict';
  const SIM = (G.SIM = G.SIM || {});

  class Incomplete extends Error {
    constructor(msg) {
      super(msg || 'incomplete');
      this.incomplete = true;
    }
  }
  class SyntaxErr extends Error {
    constructor(msg) {
      super(msg);
      this.syntax = true;
    }
  }
  SIM.Incomplete = Incomplete;
  SIM.SyntaxErr = SyntaxErr;

  const OPS = ['&&', '||', ';;', '|&', '|', ';', '&', '(', ')'];

  // scan to the closing paren of $( ... ) starting after "$(" ; returns index after ')'
  function scanParen(s, i) {
    let depth = 1;
    while (i < s.length) {
      const c = s[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === "'") {
        const j = s.indexOf("'", i + 1);
        if (j < 0) throw new Incomplete();
        i = j + 1;
        continue;
      }
      if (c === '"') {
        i = scanDq(s, i + 1);
        continue;
      }
      if (c === '(') depth++;
      else if (c === ')') {
        depth--;
        if (depth === 0) return i + 1;
      }
      i++;
    }
    throw new Incomplete();
  }
  // returns index after closing "
  function scanDq(s, i) {
    while (i < s.length) {
      const c = s[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '"') return i + 1;
      if (c === '$' && s[i + 1] === '(') {
        i = scanParen(s, i + 2);
        continue;
      }
      if (c === '`') {
        const j = scanBacktick(s, i + 1);
        i = j;
        continue;
      }
      i++;
    }
    throw new Incomplete();
  }
  function scanBacktick(s, i) {
    while (i < s.length) {
      if (s[i] === '\\') {
        i += 2;
        continue;
      }
      if (s[i] === '`') return i + 1;
      i++;
    }
    throw new Incomplete();
  }
  function scanBrace(s, i) {
    let depth = 1;
    while (i < s.length) {
      const c = s[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return i + 1;
      }
      i++;
    }
    throw new Incomplete();
  }
  SIM.scanParen = scanParen;
  SIM.scanDq = scanDq;
  SIM.scanBacktick = scanBacktick;
  SIM.scanBrace = scanBrace;

  /* ---------------- tokenizer ---------------- */
  function tokenize(src) {
    const toks = [];
    const pendingHeredocs = [];
    let i = 0;
    const n = src.length;
    const isSpace = (c) => c === ' ' || c === '\t';
    let dbl = false; // inside [[ ... ]]
    while (i < n) {
      const c = src[i];
      if (isSpace(c)) {
        i++;
        continue;
      }
      if (dbl && c !== '\n') {
        const m2 = /^(&&|\|\||[()<>!]|=~)(?=[\s]|$)/.exec(src.slice(i, i + 3));
        if (m2) {
          toks.push({ t: 'w', v: m2[1] });
          i += m2[1].length;
          continue;
        }
        const w = readWord(true);
        if (w === ']]') dbl = false;
        toks.push({ t: 'w', v: w });
        continue;
      }
      if (src.startsWith('[[', i) && /\s/.test(src[i + 2] || '')) {
        dbl = true;
        toks.push({ t: 'w', v: '[[' });
        i += 2;
        continue;
      }
      if (c === '\\' && src[i + 1] === '\n') {
        i += 2;
        continue;
      }
      if (c === '\n') {
        toks.push({ t: 'nl' });
        i++;
        // read heredoc bodies
        while (pendingHeredocs.length) {
          const h = pendingHeredocs.shift();
          const lines = [];
          let found = false;
          while (i <= n) {
            let e = src.indexOf('\n', i);
            if (e < 0) e = n;
            let line = src.slice(i, e);
            i = e + 1;
            const cmp = h.strip ? line.replace(/^\t+/, '') : line;
            if (cmp === h.delim) {
              found = true;
              break;
            }
            lines.push(h.strip ? cmp : line);
            if (e >= n) break;
          }
          if (!found) throw new Incomplete('heredoc');
          h.tok.body = lines.length ? lines.join('\n') + '\n' : '';
        }
        continue;
      }
      if (c === '#') {
        // comment: only at start of a word
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      // redirections
      let m = /^(\d*)(>>|>&|>\||>|<<<|<<-|<<|<&|<>|<|&>>|&>)/.exec(src.slice(i, i + 6));
      if (m && (m[1] === '' || true)) {
        // a leading number only counts if directly attached to operator and at word start
        const fd = m[1] === '' ? null : parseInt(m[1], 10);
        let op = m[2];
        i += m[0].length;
        while (i < n && isSpace(src[i])) i++;
        if (op === '<<' || op === '<<-') {
          // heredoc delimiter
          let j = i;
          while (j < n && !/[\s;|&<>()]/.test(src[j])) j++;
          let raw = src.slice(i, j);
          const quoted = /['"\\]/.test(raw);
          const delim = raw.replace(/['"\\]/g, '');
          i = j;
          const tok = { t: 'redir', op: '<<', fd: fd === null ? 0 : fd, quoted, delim, body: null };
          pendingHeredocs.push({ delim, strip: op === '<<-', tok });
          toks.push(tok);
          if (i >= n) throw new Incomplete('heredoc');
          continue;
        }
        if ((op === '>&' || op === '<&') && /\d|-/.test(src[i] || '')) {
          let j = i;
          while (j < n && /[\d-]/.test(src[j])) j++;
          toks.push({ t: 'redir', op: 'dup', fd: fd === null ? (op === '>&' ? 1 : 0) : fd, to: src.slice(i, j) });
          i = j;
          continue;
        }
        const w = readWord();
        if (w === '') throw new SyntaxErr("syntax error near unexpected token `newline'");
        if (op === '>&') op = '&>';
        toks.push({ t: 'redir', op, fd, target: w });
        continue;
      }
      // operators
      let op = null;
      for (const o of OPS) {
        if (src.startsWith(o, i)) {
          op = o;
          break;
        }
      }
      if (op) {
        toks.push({ t: 'op', v: op });
        i += op.length;
        continue;
      }
      const w = readWord();
      toks.push({ t: 'w', v: w });
    }
    if (pendingHeredocs.length) throw new Incomplete('heredoc');
    return toks;

    function readWord(inDbl) {
      const start = i;
      while (i < n) {
        const c = src[i];
        if (isSpace(c) || c === '\n') break;
        if (!inDbl && (c === ';' || c === '&' || c === '|' || c === '<' || c === '>' || c === ')')) break;
        if (inDbl && c === ';') break;
        if (c === '(' && !inDbl) break;
        if (c === '\\') {
          if (i + 1 >= n) throw new Incomplete();
          i += 2;
          continue;
        }
        if (c === "'") {
          const j = src.indexOf("'", i + 1);
          if (j < 0) throw new Incomplete('quote');
          i = j + 1;
          continue;
        }
        if (c === '"') {
          i = scanDq(src, i + 1);
          continue;
        }
        if (c === '`') {
          i = scanBacktick(src, i + 1);
          continue;
        }
        if (c === '$' && src[i + 1] === '(') {
          i = scanParen(src, i + 2);
          continue;
        }
        if (c === '$' && src[i + 1] === '{') {
          i = scanBrace(src, i + 2);
          continue;
        }
        i++;
      }
      return src.slice(start, i);
    }
  }
  SIM.tokenize = tokenize;

  /* ---------------- parser ---------------- */
  const RESERVED = new Set(['if', 'then', 'elif', 'else', 'fi', 'for', 'in', 'do', 'done', 'while', 'until', 'case', 'esac', 'function', '{', '}', '!']);

  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const next = () => toks[p++];
    const isW = (v, t = peek()) => t && t.t === 'w' && t.v === v;
    const isOp = (v, t = peek()) => t && t.t === 'op' && t.v === v;
    const skipNl = () => {
      while (peek() && (peek().t === 'nl' || isOp(';'))) p++;
    };
    const skipNewlines = () => {
      while (peek() && peek().t === 'nl') p++;
    };
    const expectW = (v) => {
      skipNl();
      const t = peek();
      if (!t) throw new Incomplete();
      if (!isW(v)) throw new SyntaxErr(`syntax error near unexpected token \`${t.v || 'newline'}'`);
      p++;
    };

    function parseList(terms) {
      const items = [];
      skipNl();
      while (peek()) {
        const t = peek();
        if (t.t === 'w' && terms.has(t.v)) break;
        if (t.t === 'op' && (t.v === ')' || t.v === ';;') && terms.has(t.v)) break;
        if (t.t === 'op' && t.v === ')' && !terms.has(')')) throw new SyntaxErr("syntax error near unexpected token `)'");
        const node = parseAndOr();
        let bg = false;
        if (isOp('&')) {
          bg = true;
          p++;
        } else if (isOp(';')) p++;
        items.push({ node, bg });
        skipNewlines();
        while (isOp(';')) p++;
        skipNewlines();
      }
      if (terms.size && !peek()) throw new Incomplete();
      return { type: 'list', items };
    }
    function parseAndOr() {
      const first = parsePipe();
      const rest = [];
      while (isOp('&&') || isOp('||')) {
        const op = next().v;
        skipNewlines();
        if (!peek()) throw new Incomplete();
        rest.push({ op, node: parsePipe() });
      }
      return rest.length ? { type: 'andor', first, rest } : first;
    }
    function parsePipe() {
      let neg = false;
      if (isW('!')) {
        neg = true;
        p++;
      }
      const cmds = [parseCommand()];
      while (isOp('|') || isOp('|&')) {
        const o = next().v;
        if (o === '|&') cmds[cmds.length - 1].stderrToPipe = true;
        skipNewlines();
        if (!peek()) throw new Incomplete();
        cmds.push(parseCommand());
      }
      return cmds.length === 1 && !neg ? cmds[0] : { type: 'pipe', cmds, neg };
    }
    function parseRedirs(node) {
      while (peek() && peek().t === 'redir') node.redirs.push(next());
      return node;
    }
    function parseCommand() {
      const t = peek();
      if (!t) throw new Incomplete();
      if (t.t === 'op' && t.v === '(') {
        p++;
        const body = parseList(new Set([')']));
        if (!isOp(')')) throw new Incomplete();
        p++;
        return parseRedirs({ type: 'subshell', body, redirs: [] });
      }
      if (t.t === 'w') {
        switch (t.v) {
          case '{': {
            p++;
            const body = parseList(new Set(['}']));
            expectW('}');
            return parseRedirs({ type: 'group', body, redirs: [] });
          }
          case 'if':
            return parseIf();
          case 'for':
            return parseFor();
          case 'while':
          case 'until':
            return parseWhile();
          case 'case':
            return parseCase();
          case 'function': {
            p++;
            const name = next();
            if (!name) throw new Incomplete();
            if (isOp('(')) {
              p++;
              if (!isOp(')')) throw new SyntaxErr('syntax error');
              p++;
            }
            skipNewlines();
            const body = parseCommand();
            return { type: 'func', name: name.v, body };
          }
        }
        // name() { ... }
        const t2 = toks[p + 1];
        const t3 = toks[p + 2];
        if (t2 && t2.t === 'op' && t2.v === '(' && t3 && t3.t === 'op' && t3.v === ')' && /^[\w.:-]+$/.test(t.v)) {
          p += 3;
          skipNewlines();
          if (!peek()) throw new Incomplete();
          const body = parseCommand();
          return { type: 'func', name: t.v, body };
        }
      }
      return parseSimple();
    }
    function parseSimple() {
      const node = { type: 'cmd', assigns: [], words: [], redirs: [] };
      while (peek()) {
        const t = peek();
        if (t.t === 'redir') {
          node.redirs.push(next());
          continue;
        }
        if (t.t !== 'w') break;
        if (!node.words.length && /^[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\+?=/.test(t.v)) {
          node.assigns.push(next().v);
          continue;
        }
        if (node.words.length === 0 && (t.v === '}' || t.v === 'then' || t.v === 'do' || t.v === 'done' || t.v === 'fi' || t.v === 'else' || t.v === 'elif' || t.v === 'esac')) {
          if (!node.assigns.length && !node.redirs.length)
            throw new SyntaxErr(`syntax error near unexpected token \`${t.v}'`);
          break;
        }
        node.words.push(next().v);
      }
      if (!node.words.length && !node.assigns.length && !node.redirs.length) {
        const t = peek();
        throw new SyntaxErr(`syntax error near unexpected token \`${t ? t.v || t.op : 'newline'}'`);
      }
      return node;
    }
    function parseIf() {
      p++; // if
      const clauses = [];
      let cond = parseList(new Set(['then']));
      expectW('then');
      let body = parseList(new Set(['elif', 'else', 'fi']));
      clauses.push({ cond, body });
      let elseBody = null;
      for (;;) {
        if (isW('elif')) {
          p++;
          cond = parseList(new Set(['then']));
          expectW('then');
          body = parseList(new Set(['elif', 'else', 'fi']));
          clauses.push({ cond, body });
          continue;
        }
        if (isW('else')) {
          p++;
          elseBody = parseList(new Set(['fi']));
        }
        break;
      }
      expectW('fi');
      return parseRedirs({ type: 'if', clauses, else: elseBody, redirs: [] });
    }
    function parseFor() {
      p++; // for
      const v = next();
      if (!v) throw new Incomplete();
      let words = null;
      skipNewlines();
      if (isW('in')) {
        p++;
        words = [];
        while (peek() && peek().t === 'w') words.push(next().v);
      }
      skipNl();
      expectW('do');
      const body = parseList(new Set(['done']));
      expectW('done');
      return parseRedirs({ type: 'for', var: v.v, words, body, redirs: [] });
    }
    function parseWhile() {
      const until = next().v === 'until';
      const cond = parseList(new Set(['do']));
      expectW('do');
      const body = parseList(new Set(['done']));
      expectW('done');
      return parseRedirs({ type: 'while', until, cond, body, redirs: [] });
    }
    function parseCase() {
      p++;
      const w = next();
      if (!w) throw new Incomplete();
      skipNewlines();
      expectW('in');
      const items = [];
      skipNl();
      while (peek() && !isW('esac')) {
        if (isOp('(')) p++;
        const pats = [];
        for (;;) {
          const t = next();
          if (!t) throw new Incomplete();
          pats.push(t.v);
          if (isOp('|')) {
            p++;
            continue;
          }
          break;
        }
        if (!isOp(')')) throw new SyntaxErr('syntax error in case pattern');
        p++;
        const body = parseList(new Set([';;', 'esac']));
        if (isOp(';;')) p++;
        items.push({ pats, body });
        skipNl();
      }
      expectW('esac');
      return parseRedirs({ type: 'case', word: w.v, items, redirs: [] });
    }

    const ast = parseList(new Set());
    if (p < toks.length) {
      const t = toks[p];
      throw new SyntaxErr(`syntax error near unexpected token \`${t.v || t.op || 'newline'}'`);
    }
    return ast;
  }
  SIM.parse = parse;
  SIM.RESERVED = RESERVED;
})(typeof window !== 'undefined' ? window : globalThis);
