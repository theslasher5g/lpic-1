/* LPIC-1 Trainer — minimal markdown renderer for the wiki content.
 * Syntax: ## / ### headings, ~~~ fenced blocks (~~~console runs in the sandbox,
 * ~~~file shows file content), {{inline code}}, **bold**, *italic*, [text](href),
 * - / 1. lists, | tables |, > TIP: / > EXAM: / > WARN: / > NOTE: callouts.
 * Escapes inside String.raw templates: $\{ -> ${ and \` -> ` */
(function (G) {
  'use strict';
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const unescapeSrc = (s) => s.replace(/\$\\\{/g, '${').replace(/\\`/g, '`');

  function inline(s) {
    // split out code spans first so their content is not formatted
    const parts = s.split(/(\{\{[\s\S]*?\}\})/);
    return parts
      .map((p) => {
        if (p.startsWith('{{') && p.endsWith('}}')) return '<code>' + esc(p.slice(2, -2)) + '</code>';
        let h = esc(p);
        h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,:;!?]|$)/g, '$1<em>$2</em>');
        h = h.replace(/\[([^\]]+)\]\(((?:#|https?:)[^)\s]+)\)/g, (m, t, href) => `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);
        h = h.replace(/&lt;kbd&gt;(.+?)&lt;\/kbd&gt;/g, '<kbd>$1</kbd>');
        return h;
      })
      .join('');
  }
  const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // "# cmd" lines are root commands: run them through sudo in the sandbox
  const asUser = (p, cmd) => {
    if (p !== '#' || /^(sudo|su|cd|export|umask|source|\.|exit|ulimit|set)\b/.test(cmd)) return cmd;
    // redirections and pipes must run inside the root shell too
    if (/[|<>;&]/.test(cmd)) return "sudo sh -c '" + cmd.replace(/'/g, "'\\''") + "'";
    return 'sudo ' + cmd;
  };
  function codeBlock(lang, lines) {
    const raw = lines.join('\n');
    if (lang === 'console' || lang === 'shell' || lang === 'sh-session') {
      const html = lines
        .map((l) => {
          let m = /^(\$|#) (.*)$/.exec(l);
          if (m) {
            const cmd = m[2];
            const runCmd = asUser(m[1], cmd);
            return `<span class="c-run" data-cmd="${esc(runCmd)}" title="click to run in the sandbox${runCmd !== cmd ? ' (via sudo)' : ''}"><span class="${m[1] === '#' ? 'c-root' : 'c-prompt'}">${m[1]} </span><span class="c-cmd">${esc(cmd).replace(/(\s#\s.*)$/, '<span class="c-com">$1</span>')}</span></span>`;
          }
          return `<span class="c-out">${esc(l)}</span>`;
        })
        .join('\n');
      const cmds = lines.filter((l) => /^(\$|#) /.test(l)).map((l) => asUser(l[0], l.slice(2)));
      return `<div class="codebox"><div class="cb-label">${cmds.length ? `<button class="cb-btn" data-run="${esc(JSON.stringify(cmds))}" title="Run these commands in the sandbox">▶ run</button>` : ''}<button class="cb-btn" data-copy="${esc(cmds.length ? cmds.join('\n') : raw)}">copy</button></div><pre>${html}</pre></div>`;
    }
    const isFile = lang === 'file' || lang === 'conf' || lang === 'ini' || lang === 'text';
    const body = esc(raw).replace(/^(\s*#(?!!).*)$/gm, '<span class="c-com">$1</span>');
    return `<div class="codebox ${isFile ? 'file' : ''}"><div class="cb-label"><button class="cb-btn" data-copy="${esc(raw)}">copy</button></div><pre>${body}</pre></div>`;
  }

  function render(src, opts = {}) {
    src = unescapeSrc(src || '').replace(/\r/g, '');
    const lines = src.split('\n');
    // strip common indentation
    const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)[0].length));
    const L = isFinite(ind) && ind > 0 ? lines.map((l) => l.slice(ind)) : lines;
    let out = '';
    const toc = [];
    let i = 0;
    let para = [];
    const flush = () => {
      if (para.length) {
        out += '<p>' + inline(para.join(' ')) + '</p>\n';
        para = [];
      }
    };
    while (i < L.length) {
      const line = L[i];
      if (/^~~~/.test(line)) {
        flush();
        const lang = line.slice(3).trim();
        const body = [];
        i++;
        while (i < L.length && !/^~~~\s*$/.test(L[i])) body.push(L[i++]);
        i++;
        out += codeBlock(lang, body);
        continue;
      }
      let m;
      if ((m = /^(#{2,4}) (.*)$/.exec(line))) {
        flush();
        const lvl = m[1].length;
        const text = inline(m[2]);
        const id = (opts.idPrefix || '') + slug(m[2]);
        if (lvl === 2) toc.push({ id, text: m[2].replace(/\{\{|\}\}/g, '') });
        out += `<h${lvl} id="${id}">${text}</h${lvl}>\n`;
        i++;
        continue;
      }
      if (/^>\s?/.test(line)) {
        flush();
        const body = [];
        while (i < L.length && /^>\s?/.test(L[i])) body.push(L[i++].replace(/^>\s?/, ''));
        let kind = 'note';
        let title = 'Note';
        const km = /^(TIP|EXAM|WARN|NOTE|INFO):\s*/.exec(body[0] || '');
        if (km) {
          kind = { TIP: 'tip', EXAM: 'exam', WARN: 'warn', NOTE: 'note', INFO: 'note' }[km[1]];
          title = { TIP: 'Tip', EXAM: 'Exam focus', WARN: 'Careful', NOTE: 'Note', INFO: 'Info' }[km[1]];
          body[0] = body[0].slice(km[0].length);
        }
        out += `<div class="callout ${kind}"><div class="ct">${title}</div>${render(body.join('\n'), { inner: true }).html}</div>\n`;
        continue;
      }
      if (/^\|.*\|\s*$/.test(line)) {
        flush();
        const rows = [];
        while (i < L.length && /^\|.*\|\s*$/.test(L[i])) rows.push(L[i++]);
        const cells = (r) => r.trim().slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
        let head = null;
        let body = rows;
        if (rows.length > 1 && /^\|[\s:|-]+\|$/.test(rows[1].trim())) {
          head = cells(rows[0]);
          body = rows.slice(2);
        }
        out += '<div class="tbl-wrap"><table>' + (head ? '<thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>' : '') + '<tbody>' + body.map((r) => '<tr>' + cells(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>\n';
        continue;
      }
      if (/^(\s*)([-*]|\d+\.) /.test(line)) {
        flush();
        const ordered = /^\s*\d+\. /.test(line);
        const items = [];
        while (i < L.length && (/^\s*([-*]|\d+\.) /.test(L[i]) || (/^\s{2,}\S/.test(L[i]) && items.length))) {
          if (/^\s*([-*]|\d+\.) /.test(L[i])) items.push(L[i].replace(/^\s*([-*]|\d+\.) /, ''));
          else items[items.length - 1] += ' ' + L[i].trim();
          i++;
        }
        const tag = ordered ? 'ol' : 'ul';
        out += `<${tag}>` + items.map((t) => `<li>${inline(t)}</li>`).join('') + `</${tag}>\n`;
        continue;
      }
      if (!line.trim()) {
        flush();
        i++;
        continue;
      }
      para.push(line.trim());
      i++;
    }
    flush();
    return { html: out, toc };
  }
  // plain text (for search index)
  function plain(src) {
    return unescapeSrc(src || '')
      .replace(/~~~[a-z]*\n?/g, '')
      .replace(/\{\{|\}\}/g, '')
      .replace(/[*#>|]/g, ' ')
      .replace(/\s+/g, ' ');
  }
  G.MD = { render, inline, plain, esc, slug };
})(window);
