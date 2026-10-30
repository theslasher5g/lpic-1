/* LPIC-1 Trainer — application: routing, views, quiz engine, labs, terminal drawer. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = (s) => MD.inline(s || '');
  const pct = (x) => Math.round(x * 100);
  const shuffle = (a) => {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  };
  const view = $('#view');
  let cleanup = [];
  const onLeave = (fn) => cleanup.push(fn);

  function toast(msg, ms = 2200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  function modal(html, onOpen) {
    const m = $('#modal');
    $('#modalBody').innerHTML = html;
    m.hidden = false;
    if (onOpen) onOpen($('#modalBody'));
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#modalBody').innerHTML = '';
  }
  $('#modalX').onclick = closeModal;
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });

  /* =================== progress / mastery =================== */
  function quizScore(o) {
    if (!o.quiz.length) return 0;
    let ok = 0;
    for (const q of o.quiz) {
      const s = Store.data.questions[q.id];
      if (s && s.last) ok++;
    }
    return ok / o.quiz.length;
  }
  function labScore(o) {
    const lab = LPIC.labs[o.id];
    if (!lab) return null;
    const done = Object.keys(Store.obj(o.id).labs || {}).length;
    return Math.min(1, done / lab.tasks.length);
  }
  function mastery(o) {
    const st = Store.data.objectives[o.id] || {};
    const read = st.read ? 1 : 0;
    const qs = quizScore(o);
    const ls = labScore(o);
    if (ls === null) return 0.25 * read + 0.75 * qs;
    return 0.15 * read + 0.6 * qs + 0.25 * ls;
  }
  function readiness(list) {
    let w = 0;
    let s = 0;
    for (const o of list) {
      w += o.weight;
      s += o.weight * mastery(o);
    }
    return w ? s / w : 0;
  }
  function answeredStats() {
    let n = 0;
    let ok = 0;
    let seen = 0;
    for (const q of Object.values(Store.data.questions)) {
      n += q.n;
      ok += q.ok;
      seen++;
    }
    return { n, ok, seen, acc: n ? ok / n : 0 };
  }
  function dueQuestions() {
    const now = Date.now();
    return LPIC.allQuestions().filter((q) => {
      const s = Store.data.questions[q.id];
      return s && s.n && (s.last === false || s.due <= now);
    });
  }

  /* =================== theme / sync badge =================== */
  function applyTheme() {
    const t = Store.data.settings.theme || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
  $('#themeBtn').onclick = () => {
    const order = ['auto', 'dark', 'light'];
    const cur = Store.data.settings.theme || 'auto';
    const next = order[(order.indexOf(cur) + 1) % 3];
    Store.setSetting('theme', next);
    applyTheme();
    toast('Theme: ' + next);
  };
  /* calm mode: only the current task is visible (no sidebar, search, badges, extras) */
  const zenOn = () => !!Store.data.settings.zen;
  function applyZen() {
    document.body.classList.toggle('zen', zenOn());
    $('#zenExit').hidden = !zenOn();
    $('#zenBtn').classList.toggle('on', zenOn());
    if (zenOn()) closeDrawer && closeDrawer();
  }
  function setZen(v) {
    Store.setSetting('zen', v);
    applyZen();
    toast(v ? 'Calm mode on — press Z or Esc to leave' : 'Calm mode off');
  }
  $('#zenBtn').onclick = () => setZen(!zenOn());
  $('#zenExit').onclick = () => setZen(false);
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || document.activeElement.closest('.term') || document.activeElement.isContentEditable) return;
    if (e.key === 'z' || e.key === 'Z') setZen(!zenOn());
    else if (e.key === 'Escape' && zenOn()) setZen(false);
  });
  function syncBadge() {
    const b = $('#syncBadge');
    const s = Store.status;
    b.className = 'sync ' + s;
    b.textContent = s === 'server' ? '● saved to server' : s === 'local' ? 'browser storage' : s === 'offline' ? 'server offline' : 'sync error';
    b.title = s === 'server' ? 'Progress is stored in the SQLite database of the LPIC-1 Trainer server (Docker volume).' : 'Progress is stored in this browser (localStorage). Run the Docker container to keep it in a database.';
  }

  /* =================== sidebar =================== */
  const openTopics = new Set();
  let sideMoreOpen = false;
  function renderSidebar() {
    const sb = $('#sidebar');
    const cur = location.hash;
    const link = (href, icon, label, extra = '') => `<a class="nav-a ${cur === href || (href !== '#/' && cur.startsWith(href)) ? 'active' : ''}" href="${href}">${icon} <span class="grow">${label}</span>${extra}</a>`;
    const more = [
      ['#/quiz', '❓', 'Quiz center'],
      ['#/weak', '📉', 'Weak spots'],
      ['#/cards', '🃏', 'Flashcards'],
      ['#/cheat', '📝', 'Cheatsheets'],
      ['#/sims', '🧪', 'Simulations'],
      ['#/commands', '📖', 'Command reference'],
    ];
    const moreOpen = sideMoreOpen || more.some(([hr]) => cur.startsWith(hr) || (hr === '#/sims' && cur.startsWith('#/sim/')));
    let h = `<div class="nav-sec">
      ${link('#/', '🏠', 'Today')}
      ${link('#/plan', '🗓️', 'Study plan')}
      ${link('#/review', '🔁', 'Review', '<span class="badge warn" id="dueBadge"></span>')}
      ${link('#/exam', '⏱️', 'Exam simulator')}
      ${link('#/scenarios', '🛠️', 'Troubleshooting')}
      ${link('#/shell', '⌨️', 'Sandbox shell')}
      <details class="nav-more" ${moreOpen ? 'open' : ''}><summary class="nav-a">⋯ <span class="grow">More tools</span></summary>${more.map(([hr, ic, lb]) => link(hr, ic, lb)).join('')}</details>
    </div>`;
    for (const ex of LPIC.exams) {
      const r = readiness(LPIC.ofExam(ex.id));
      h += `<div class="nav-sec"><div class="nav-h">${ex.title} · ${ex.code} · ${pct(r)}%</div>`;
      for (const t of ex.topics) {
        const objs = LPIC.ofTopic(t);
        const tr = readiness(objs);
        const isOpen = openTopics.has(t) || cur.startsWith('#/obj/' + t + '.') || cur === '#/topic/' + t;
        h += `<div class="nav-a nav-topic ${isOpen ? 'open' : ''}" data-topic="${t}"><span class="chev">▶</span><span class="nav-id">${t}</span><span class="grow">${esc(LPIC.topics[t].title)}</span><span class="ring ${tr >= 0.999 ? 'done' : ''}" style="--p:${pct(tr)}"></span></div><div class="nav-objs">`;
        for (const o of objs) {
          const m = mastery(o);
          h += `<a class="nav-a nav-obj ${cur.startsWith('#/obj/' + o.id + '/') || cur === '#/obj/' + o.id ? 'active' : ''}" href="#/obj/${o.id}"><span class="nav-id">${o.id}</span><span class="grow">${esc(o.title)}</span><span class="ring ${m >= 0.999 ? 'done' : ''}" style="--p:${pct(m)}" title="${pct(m)}% mastered"></span></a>`;
        }
        h += `</div>`;
      }
      h += `</div>`;
    }
    h += `<div class="nav-sec"><a class="nav-a ${cur.startsWith('#/settings') ? 'active' : ''}" href="#/settings">⚙️ <span class="grow">Settings & backup</span></a></div>`;
    sb.innerHTML = h;
    const due = dueQuestions().length;
    $('#dueBadge').textContent = due ? due : '';
    const nm = $('.nav-more', sb);
    if (nm) nm.addEventListener('toggle', () => (sideMoreOpen = nm.open));
    $$('.nav-topic', sb).forEach((el) =>
      el.addEventListener('click', () => {
        const t = el.dataset.topic;
        el.classList.toggle('open');
        if (el.classList.contains('open')) openTopics.add(t);
        else openTopics.delete(t);
      })
    );
    const act = $('.nav-obj.active', sb);
    if (act && !renderSidebar.scrolled) {
      act.scrollIntoView({ block: 'center' });
      renderSidebar.scrolled = true;
    }
  }
  $('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
  $('#sidebar').addEventListener('click', (e) => {
    if (e.target.closest('a')) document.body.classList.remove('nav-open');
  });

  /* =================== terminal drawer =================== */
  let term = null;
  function ensureTerm() {
    if (term) return term;
    term = new SIM.Terminal($('#drawerTerm'), {
      persist: Store.sandboxPersist(),
      onCommand: () => {
        if (location.hash.startsWith('#/obj/')) {
          /* labs use their own terminal */
        }
      },
    });
    return term;
  }
  function openDrawer(max) {
    ensureTerm();
    document.body.classList.add('drawer-open');
    document.body.classList.toggle('drawer-max', !!max);
    setTimeout(() => term.focus(), 60);
  }
  function closeDrawer() {
    document.body.classList.remove('drawer-open', 'drawer-max');
  }
  function toggleDrawer() {
    if (document.body.classList.contains('drawer-open')) closeDrawer();
    else openDrawer();
  }
  $('#termBtn').onclick = toggleDrawer;
  $('#drawerClose').onclick = closeDrawer;
  $('#drawerMax').onclick = () => document.body.classList.toggle('drawer-max');
  // drag to resize
  (() => {
    const bar = $('#drawerBar');
    let startY = 0;
    let startH = 0;
    const move = (e) => {
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const h = Math.max(140, Math.min(window.innerHeight - 80, startH + (startY - y)));
      document.documentElement.style.setProperty('--drawer-h', h + 'px');
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    bar.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      startY = e.clientY;
      startH = $('#drawer').getBoundingClientRect().height;
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  })();
  function runInSandbox(cmds) {
    openDrawer();
    const list = Array.isArray(cmds) ? cmds : [cmds];
    let i = 0;
    const next = () => {
      if (i >= list.length) return;
      const c = list[i++];
      if (term.overlay) return;
      term.exec(c);
      setTimeout(next, 120);
    };
    setTimeout(next, 80);
  }

  // code block buttons (delegated)
  document.addEventListener('click', (e) => {
    const run = e.target.closest('[data-run]');
    if (run) {
      e.preventDefault();
      runInSandbox(JSON.parse(run.dataset.run));
      return;
    }
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      e.preventDefault();
      const txt = copy.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
        () => toast('Copied'),
        () => {
          const ta = document.createElement('textarea');
          ta.value = txt;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          toast('Copied');
        }
      );
      return;
    }
    const line = e.target.closest('.c-run');
    if (line && !window.getSelection().toString()) {
      runInSandbox(line.dataset.cmd);
      return;
    }
    const man = e.target.closest('[data-man]');
    if (man) {
      e.preventDefault();
      showMan(man.dataset.man);
    }
  });
  function showMan(name) {
    const page = SIM.manPage(name);
    if (!page) return toast('No manual page for ' + name);
    modal(`<h2 style="margin-top:0">man ${esc(name)}</h2><div class="man">${SIM.ansiToHtml(page)}</div><div class="row" style="margin-top:.8rem"><button class="btn btn-sm" data-run='${esc(JSON.stringify(['man ' + name]))}'>Open in sandbox</button><a class="btn btn-sm" href="#/search?q=${encodeURIComponent(name)}">Search wiki for “${esc(name)}”</a></div>`);
  }

  /* =================== keyboard shortcuts =================== */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && (e.key === '`' || e.key === 'Dead' || e.code === 'Backquote')) || (e.altKey && e.key.toLowerCase() === 't')) {
      e.preventDefault();
      toggleDrawer();
      return;
    }
    if (e.key === 'Escape' && !$('#modal').hidden) {
      closeModal();
      return;
    }
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag) && !document.activeElement.closest('.term,.vi,.vi-train')) {
      e.preventDefault();
      $('#searchInput').focus();
    }
  });
  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#searchInput').value.trim();
    if (q) location.hash = '#/search?q=' + encodeURIComponent(q);
  });

  /* =================== router =================== */
  const routes = [];
  const route = (re, fn) => routes.push([re, fn]);
  function render() {
    cleanup.forEach((f) => {
      try {
        f();
      } catch (e) {
        /* */
      }
    });
    cleanup = [];
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    const params = new URLSearchParams(qs || '');
    for (const [re, fn] of routes) {
      const m = re.exec(path);
      if (m) {
        view.innerHTML = '';
        fn(m, params);
        renderSidebar();
        if (!h.includes('#')) window.scrollTo(0, 0);
        view.focus({ preventScroll: true });
        return;
      }
    }
    view.innerHTML = '<h1>Not found</h1><p><a href="#/">Back to the dashboard</a></p>';
  }
  window.addEventListener('hashchange', render);

  /* =================== study plan =================== */
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const parseYmd = (t) => {
    const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(t || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const fmtDay = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const objDone = (o) => !!(Store.data.objectives[o.id] || {}).read && mastery(o) >= 0.6;
  // estimated effort of an objective in hours: reading, typing the examples, lab, quiz
  const objHours = (o) => 0.5 + 0.4 * o.weight + (LPIC.labs[o.id] ? 0.25 : 0);
  // schedule for the exams that have a date; study weeks start today (102 starts after the 101 date)
  function buildPlan(cfg) {
    const today = dayStart(new Date());
    const hours = Math.max(1, +cfg.hours || 6);
    const exams = [];
    let startAt = today;
    for (const ex of ['101', '102']) {
      const date = parseYmd(cfg['d' + ex]);
      if (!date) continue;
      const start = ex === '102' && parseYmd(cfg.d101) && date > parseYmd(cfg.d101) ? new Date(Math.max(today, parseYmd(cfg.d101).getTime() + 86400000)) : today;
      const days = Math.ceil((date - start) / 86400000);
      if (days < 1) {
        exams.push({ ex, date, past: true, weeks: [] });
        continue;
      }
      const nWeeks = Math.max(1, Math.ceil(days / 7));
      const examWeeks = nWeeks >= 6 ? 2 : nWeeks >= 3 ? 1 : 0;
      const learnWeeks = nWeeks - examWeeks;
      const queue = LPIC.ofExam(ex).filter((o) => !objDone(o));
      const doneCount = LPIC.ofExam(ex).length - queue.length;
      const need = queue.reduce((a, o) => a + objHours(o), 0);
      const cap = hours * 0.75; // the rest of the time goes into the daily review
      const weeks = [];
      let qi = 0;
      for (let w = 0; w < nWeeks; w++) {
        const wStart = new Date(start.getTime() + w * 7 * 86400000);
        const wEnd = new Date(Math.min(wStart.getTime() + 6 * 86400000, date.getTime()));
        const wk = { n: w + 1, start: wStart, end: wEnd, objs: [], kind: 'learn', h: 0 };
        if (w < learnWeeks) {
          const last = w === learnWeeks - 1;
          while (qi < queue.length && (last || wk.h + objHours(queue[qi]) / 2 <= cap || !wk.objs.length)) {
            wk.objs.push(queue[qi]);
            wk.h += objHours(queue[qi]);
            qi++;
          }
        } else {
          wk.kind = w === nWeeks - 1 ? 'final' : 'exam';
        }
        weeks.push(wk);
      }
      const need_per_week = learnWeeks ? need / 0.75 / learnWeeks : Infinity;
      exams.push({ ex, date, start, days, nWeeks, learnWeeks, examWeeks, weeks, need, doneCount, total: LPIC.ofExam(ex).length, needPerWeek: need_per_week, tight: need_per_week > hours * 1.05, hours });
    }
    return { exams, hours, today };
  }
  // what to do today according to the plan (first unfinished objective of the current or an earlier week)
  function planToday() {
    const cfg = Store.data.settings.plan;
    if (!cfg || (!cfg.d101 && !cfg.d102)) return null;
    const plan = buildPlan(cfg);
    for (const e of plan.exams) {
      if (e.past) continue;
      const now = plan.today;
      const idx = Math.max(0, e.weeks.findIndex((w) => now <= w.end));
      const wk = e.weeks[idx] || e.weeks[e.weeks.length - 1];
      const open = e.weeks.slice(0, idx + 1).flatMap((w) => w.objs).filter((o) => !objDone(o));
      const daysLeft = Math.ceil((e.date - now) / 86400000);
      return { e, wk, idx, next: open[0] || null, behind: e.weeks.slice(0, idx).flatMap((w) => w.objs).filter((o) => !objDone(o)).length, daysLeft };
    }
    return null;
  }
  route(/^\/plan$/, () => {
    const cfg = Object.assign({ hours: 6, d101: '', d102: '' }, Store.data.settings.plan || {});
    const plan = cfg.d101 || cfg.d102 ? buildPlan(cfg) : null;
    const wkHtml = (e) =>
      e.past
        ? `<div class="card"><b>Exam ${e.ex}-500</b>: the date ${fmtDay(e.date)} has passed — set a new date above.</div>`
        : `<div class="card plan-head"><div class="row"><h2 style="margin:0">Exam ${e.ex}-500</h2><span class="spacer"></span><span class="badge ${e.tight ? 'bad' : 'good'}">${e.days} days left</span></div>
          <p class="muted" style="margin:.4rem 0 0">${e.nWeeks} weeks until ${fmtDay(e.date)}: ${e.learnWeeks} weeks of learning, ${e.examWeeks} of exam training. ${e.doneCount}/${e.total} objectives already done.</p>
          ${e.tight ? `<div class="callout warn" style="margin-top:.7rem"><div class="ct">Tight schedule</div><p>The remaining material needs about <b>${Math.ceil(e.needPerWeek)} hours per week</b> but you plan ${e.hours}. Increase the hours, move the date later or accept that the low-weight objectives get less time.</p></div>` : ''}</div>
          ${e.weeks
            .map((w) => {
              const cur = plan.today <= w.end && plan.today >= w.start;
              const body =
                w.kind === 'learn'
                  ? w.objs.length
                    ? `<ul class="plan-list">${w.objs.map((o) => `<li class="${objDone(o) ? 'done' : ''}"><a href="#/obj/${o.id}"><b>${o.id}</b> ${esc(o.title)}</a> <span class="badge w">w${o.weight}</span><span class="muted"> ~${(Math.round(objHours(o) * 2) / 2).toFixed(1)} h</span></li>`).join('')}</ul>`
                    : '<p class="muted">Nothing left in this week — use the time for the review and weak spots.</p>'
                  : w.kind === 'exam'
                    ? `<ul class="plan-list"><li><a href="#/weak">Weak spots</a>: practise the 20 weakest questions, twice this week</li><li><a href="#/exam/${e.ex}">One full exam simulation</a> (60 questions, 90 minutes) — then work through <b>every</b> wrong answer</li><li><a href="#/cheat">Cheatsheets</a> of your three weakest topics</li><li>Redo the labs and troubleshooting scenarios of those topics</li></ul>`
                    : `<ul class="plan-list"><li><a href="#/exam/${e.ex}">Second exam simulation</a> — aim for more than 75 %</li><li>Go through the <a href="#/cheat">cheatsheets</a> once; wrong answers → <a href="#/review">Review</a></li><li>Last two days: only light review, no new material. Sleep well before the exam.</li></ul>`;
              return `<details class="card plan-week ${cur ? 'cur' : ''}" ${cur ? 'open' : ''}><summary><b>Week ${w.n}</b> <span class="muted">${fmtDay(w.start)} – ${fmtDay(w.end)}</span>${cur ? ' <span class="badge good">this week</span>' : ''}<span class="muted" style="margin-left:auto">${w.kind === 'learn' ? (w.objs.length ? Math.round(w.h * 2) / 2 + ' h new material' : 'review') : w.kind === 'exam' ? 'exam training' : 'final week'}</span></summary>${body}<p class="plan-daily">Every day: <a href="#/review">15 minutes review</a> (spaced repetition)</p></details>`;
            })
            .join('')}`;
    view.innerHTML = `<h1>🗓️ Study plan</h1><p class="muted">Enter your exam dates and how much time you have per week. The plan covers every objective, goes through the topics in order and ends with exam training. It is recalculated every day: finished objectives are skipped and the rest moves forward.</p>
      <form class="card plan-form" id="planForm"><label>Exam 101-500 on<input type="date" class="inp" name="d101" value="${esc(cfg.d101)}"></label><label>Exam 102-500 on<input type="date" class="inp" name="d102" value="${esc(cfg.d102)}"></label><label>Hours per week<input type="number" class="inp" name="hours" min="1" max="40" step="0.5" value="${esc(cfg.hours)}"></label><button class="btn btn-primary" type="submit">Save plan</button>${plan ? '<button class="btn btn-ghost" type="button" id="planClear">Remove</button>' : ''}</form>
      <p class="muted" style="font-size:.88rem">Leave a date empty if you do not plan that exam yet. If both dates are set, the 102 plan starts after the 101 exam.</p>
      ${plan ? plan.exams.map(wkHtml).join('') : '<div class="card"><p>No plan yet. Pick at least one date. A rule of thumb: <b>8–10 hours a week</b> are enough for one exam in about 6–8 weeks.</p></div>'}`;
    $('#planForm').onsubmit = (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      Store.setSetting('plan', { d101: f.get('d101') || '', d102: f.get('d102') || '', hours: +f.get('hours') || 6 });
      toast('Plan saved');
      render();
    };
    const clr = $('#planClear');
    if (clr)
      clr.onclick = () => {
        Store.setSetting('plan', null);
        render();
      };
  });

  /* =================== dashboard =================== */
  route(/^\/$/, () => {
    const all = LPIC.sorted();
    const r101 = readiness(LPIC.ofExam('101'));
    const r102 = readiness(LPIC.ofExam('102'));
    const st = answeredStats();
    const due = dueQuestions().length;
    const readCount = all.filter((o) => (Store.data.objectives[o.id] || {}).read).length;
    const pt = planToday();
    const next = (pt && pt.next) || all.find((o) => !objDone(o)) || all[0];
    const ost = Store.obj(next.id);
    const lab = LPIC.labs[next.id];
    const labDone = lab ? Object.keys(ost.labs || {}).length : 0;
    const qDone = next.quiz.filter((q) => (Store.data.questions[q.id] || {}).n).length;
    const step = (ok, text, href) => `<a class="today-step ${ok ? 'ok' : ''}" href="${href}"><span class="tick">${ok ? '✓' : '○'}</span> ${text}</a>`;
    let h = `<h1>Today</h1>`;
    // one clear next step
    h += `<div class="card today"><div class="muted" style="font-size:.88rem">${pt ? `Week ${pt.idx + 1} of ${pt.e.nWeeks} · exam ${pt.e.ex}-500 in ${pt.daysLeft} day${pt.daysLeft === 1 ? '' : 's'}${pt.behind ? ` · <b style="color:var(--warn)">${pt.behind} objective${pt.behind > 1 ? 's' : ''} behind</b>` : ''}` : 'Your next step'}</div>
      ${pt && !pt.next ? `<h2 style="margin:.3rem 0 .6rem">This week's material is done 🎉</h2><p class="muted">Use the time for the review, the weak spots and the exam simulation.</p><div class="row"><a class="btn btn-primary" href="#/weak">Weak spots</a><a class="btn" href="#/exam/${pt.e.ex}">Exam simulation</a></div>` : `<h2 style="margin:.3rem 0 .8rem">${next.id} ${esc(next.title)}</h2>
      <div class="today-steps">${step(ost.read, 'Read', `#/obj/${next.id}`)}${lab ? step(labDone === lab.tasks.length, `Lab (${labDone}/${lab.tasks.length})`, `#/obj/${next.id}/lab`) : ''}${step(qDone >= Math.min(10, next.quiz.length), `Quiz (${qDone}/${next.quiz.length})`, `#/obj/${next.id}/quiz`)}</div>
      <a class="btn btn-primary btn-lg" href="#/obj/${next.id}">▶ ${ost.read ? 'Continue' : 'Start'} ${next.id}</a>`}</div>`;
    h += `<div class="today-row">`;
    h += due ? `<a class="card today-mini" href="#/review"><b>${due}</b><span>questions to review</span></a>` : `<div class="card today-mini muted"><b>0</b><span>reviews due</span></div>`;
    h += `<a class="card today-mini" href="#/plan"><b>🗓️</b><span>${pt ? 'Study plan' : 'Set up a study plan'}</span></a>`;
    h += `<a class="card today-mini" href="#/exam"><b>⏱️</b><span>Exam simulator</span></a></div>`;
    h += `<p class="muted today-stats">${readCount}/${all.length} objectives studied · ${st.seen} questions answered${st.n ? ' · ' + pct(st.acc) + '% correct' : ''} · ${Store.streak()} day streak 🔥</p>`;
    // everything else is one click away
    h += `<details class="card overview"><summary><b>All topics</b> <span class="muted">Exam 101 ${pct(r101)}% · Exam 102 ${pct(r102)}%</span></summary><div class="grid grid-2" style="margin-top:.8rem">`;
    for (const ex of LPIC.exams) {
      h += `<div><div class="row"><b>${ex.title}</b> <span class="muted">(${ex.code})</span><span class="spacer"></span><span class="badge good">${pct(readiness(LPIC.ofExam(ex.id)))}%</span></div>`;
      for (const t of ex.topics) {
        const objs = LPIC.ofTopic(t);
        const r = readiness(objs);
        h += `<a href="#/topic/${t}" style="display:block;color:inherit;margin:.5rem 0"><div class="row" style="font-size:.9rem"><span>${LPIC.topics[t].icon} <b>${t}</b> ${esc(LPIC.topics[t].title)}</span><span class="spacer"></span><span class="muted">${pct(r)}%</span></div><div class="bar"><span style="width:${pct(r)}%"></span></div></a>`;
      }
      h += `</div>`;
    }
    h += `</div></details>`;
    const exams = Store.data.exams.slice(-3).reverse();
    if (exams.length) h += `<details class="card overview"><summary><b>Recent exam simulations</b> <a href="#/exam/history" class="muted">history →</a></summary><table style="margin-top:.6rem"><tr><th>Date</th><th>Exam</th><th>Score</th><th></th></tr>${exams.map((e) => `<tr><td>${new Date(e.date).toLocaleDateString()}</td><td>${e.exam}</td><td>${e.correct}/${e.total} (${pct(e.correct / e.total)}%)</td><td>${e.correct / e.total >= 0.65 ? '<span class="badge good">pass</span>' : '<span class="badge bad">fail</span>'}</td></tr>`).join('')}</table></details>`;
    view.innerHTML = h;
  });

  /* =================== topic page =================== */
  route(/^\/topic\/(\d+)$/, (m) => {
    const t = m[1];
    const objs = LPIC.ofTopic(t);
    if (!objs.length) return (view.innerHTML = '<h1>Unknown topic</h1>');
    let h = `<div class="crumbs"><a href="#/">Dashboard</a> › Exam ${objs[0].exam}</div><h1>${LPIC.topics[t].icon} Topic ${t}: ${esc(LPIC.topics[t].title)}</h1>
      <div class="row"><span class="badge good">${pct(readiness(objs))}% mastered</span><span class="badge w">total weight ${objs.reduce((a, o) => a + o.weight, 0)}</span><a class="btn btn-sm" href="#/quiz?scope=topic:${t}&auto=1">Quiz this topic</a></div><div class="grid grid-auto" style="margin-top:1.2rem">`;
    for (const o of objs) {
      const mm = mastery(o);
      h += `<a class="card sim-card" href="#/obj/${o.id}"><div class="row"><b>${o.id}</b><span class="badge w">weight ${o.weight}</span><span class="spacer"></span><span class="ring ${mm >= 0.999 ? 'done' : ''}" style="--p:${pct(mm)}"></span></div><h3>${esc(o.title)}</h3><p>${esc(o.desc)}</p><div class="bar" style="margin-top:auto"><span style="width:${pct(mm)}%"></span></div><p class="muted" style="font-size:.8rem">${o.quiz.length} questions${LPIC.labs[o.id] ? ' · lab with ' + LPIC.labs[o.id].tasks.length + ' tasks' : ''}</p></a>`;
    }
    view.innerHTML = h + '</div>';
  });

  /* =================== objective page =================== */
  route(/^\/obj\/([\d.]+)(?:\/(\w+))?$/, (m) => {
    const o = LPIC.byId[m[1]];
    if (!o) return (view.innerHTML = '<h1>Unknown objective</h1>');
    const tab = m[2] || 'learn';
    const lab = LPIC.labs[o.id];
    const list = LPIC.sorted();
    const idx = list.indexOf(o);
    const prev = list[idx - 1];
    const next = list[idx + 1];
    const st = Store.obj(o.id);
    const qOk = o.quiz.filter((q) => (Store.data.questions[q.id] || {}).last).length;
    const labDone = lab ? Object.keys(st.labs || {}).length : 0;
    view.innerHTML = `<div class="crumbs"><a href="#/">Dashboard</a> › <a href="#/topic/${o.topic}">Topic ${o.topic}: ${esc(LPIC.topics[o.topic].title)}</a></div>
      <h1>${o.id} ${esc(o.title)}</h1>
      <div class="row obj-badges"><span class="badge w">Weight ${o.weight}</span><span class="badge">Exam ${o.exam}-500</span><span class="badge ${st.read ? 'good' : ''}">${st.read ? '✓ studied' : 'not studied yet'}</span><span class="badge">${qOk}/${o.quiz.length} questions correct</span>${lab ? `<span class="badge">${labDone}/${lab.tasks.length} lab tasks</span>` : ''}<span class="spacer"></span><a class="muted" style="font-size:.85rem" target="_blank" rel="noopener" href="https://learning.lpi.org/de/learning-materials/${o.exam}-500/${o.topic}/${o.id}/" title="Official LPI Learning Materials for this objective">📘 LPI Learning Materials</a><span class="muted" style="font-size:.85rem">mastery ${pct(mastery(o))}%</span></div>
      <div class="tabs" role="tablist">
        <a class="tab ${tab === 'learn' ? 'active' : ''}" href="#/obj/${o.id}">📚 Learn</a>
        <a class="tab ${tab === 'quiz' ? 'active' : ''}" href="#/obj/${o.id}/quiz">❓ Quiz <span class="badge">${o.quiz.length}</span></a>
        ${lab ? `<a class="tab ${tab === 'lab' ? 'active' : ''}" href="#/obj/${o.id}/lab">🧪 Lab <span class="badge">${lab.tasks.length}</span></a>` : ''}
        ${(o.sims || []).length ? `<a class="tab ${tab === 'sims' ? 'active' : ''}" href="#/obj/${o.id}/sims">🎛 Simulations</a>` : ''}
        <a class="tab ${tab === 'notes' ? 'active' : ''}" href="#/obj/${o.id}/notes">📝 My notes${st.notes ? ' •' : ''}</a>
      </div><div id="tabBody"></div>
      <nav class="pager-nav">${prev ? `<a href="#/obj/${prev.id}"><small>← previous</small>${prev.id} ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="#/obj/${next.id}" style="text-align:right"><small>next →</small>${next.id} ${esc(next.title)}</a>` : '<span></span>'}</nav>`;
    const body = $('#tabBody');
    if (tab === 'learn') renderLearn(o, body);
    else if (tab === 'quiz') runQuiz(body, o.quiz, { title: `${o.id} practice`, mode: 'practice', retryHref: `#/obj/${o.id}/quiz` });
    else if (tab === 'lab' && lab) renderLab(o, lab, body);
    else if (tab === 'sims') renderObjSims(o, body);
    else if (tab === 'notes') {
      body.innerHTML = `<p class="muted">Personal notes for ${o.id} — saved automatically ${Store.server ? 'to the server database' : 'in your browser'}.</p><textarea class="notes" id="notes" placeholder="Write your own summary, mnemonics, commands to remember…">${esc(st.notes || '')}</textarea>`;
      const ta = $('#notes');
      let t;
      ta.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => Store.setNotes(o.id, ta.value), 400);
      });
    }
  });
  // focus mode: the wiki is shown one section at a time (Settings → "Show every wiki page in full" turns it off)
  const focusOn = () => Store.data.settings.focus !== false;
  function renderLearn(o, body) {
    const st = Store.obj(o.id);
    const r = MD.render(o.wiki || '', { idPrefix: 'w-' });
    const knownTerm = (t) => {
      const base = t.replace(/\s.*$/, '').replace(/[()]/g, '');
      return SIM.man[base] ? base : null;
    };
    // split the rendered wiki into sections at each <h2>
    const tmp = document.createElement('div');
    tmp.innerHTML = r.html;
    const sections = [];
    let curSec = null;
    for (const n of [...tmp.childNodes]) {
      if (n.nodeType === 1 && n.tagName === 'H2') {
        curSec = { id: n.id, title: n.textContent, nodes: [n] };
        sections.push(curSec);
      } else if (curSec) curSec.nodes.push(n);
      else {
        // text before the first heading belongs to the first section
        if (!sections.length) sections.push((curSec = { id: 'intro', title: 'Overview', nodes: [] }));
        curSec.nodes.push(n);
      }
    }
    const focus = focusOn() && sections.length > 1;
    const secHtml = sections.map((sec, i) => `<section class="wsec" data-i="${i}" id="sec-${i}">${sec.nodes.map((n) => (n.outerHTML !== undefined ? n.outerHTML : n.textContent)).join('')}</section>`).join('');
    const refs = `<details class="card ref"><summary>Official objective: description, key knowledge, terms</summary><p style="margin:.6rem 0 .6rem">${md(o.desc)}</p>
        <b>Key knowledge areas</b><ul class="ka">${o.knowledge.map((k) => `<li>${md(k)}</li>`).join('')}</ul>
        <b>Terms and utilities</b> <span class="muted" style="font-size:.85rem">(click for the manual page)</span><div class="chips" style="margin-top:.4rem">${o.terms.map((t) => `<span class="chip ${knownTerm(t) ? 'known' : ''}" data-term="${esc(t)}" title="${knownTerm(t) ? 'show manual page' : t.startsWith('/') || t.startsWith('~') ? 'show in the sandbox' : 'search'}">${esc(t)}</span>`).join('')}</div></details>`;
    const de = deOn() && LPIC.deSummary[o.id] ? `<details class="card de-sum" lang="de"><summary><span class="de-flag">DE</span> Kurzfassung auf Deutsch</summary>${MD.render(LPIC.deSummary[o.id]).html}</details>` : '';
    const doneCard = `<div class="card done-card"><div style="flex:1;min-width:200px"><b>Done reading?</b><div class="muted" style="font-size:.88rem">Mark the objective as studied, then test yourself.</div></div>
        <button class="btn ${st.read ? '' : 'btn-primary'}" id="readBtn">${st.read ? '✓ Studied (undo)' : '✓ Mark as studied'}</button><a class="btn" href="#/obj/${o.id}/quiz">Take the quiz →</a>${LPIC.labs[o.id] ? `<a class="btn" href="#/obj/${o.id}/lab">Open the lab →</a>` : ''}</div>`;
    body.innerHTML = `<div class="wiki ${focus ? 'focus' : ''}">
      ${focus ? `<div class="stepper no-print"><div class="steps">${sections.map((sec, i) => `<button class="step" data-go="${i}" title="${esc(sec.title)}">${i + 1}</button>`).join('')}</div><span class="muted step-title" id="stepTitle"></span><span class="spacer"></span><button class="btn btn-sm btn-ghost" id="showAll" title="Show the whole page at once">Show all</button></div>` : sections.length > 2 ? `<div class="card toc">${sections.map((x, i) => `<a href="#/obj/${o.id}" data-anchor="sec-${i}">${esc(x.title)}</a>`).join('')}</div>` : ''}
      ${secHtml}
      ${focus ? `<div class="step-nav no-print"><button class="btn" id="stepPrev">← Back</button><span class="spacer"></span><button class="btn btn-primary" id="stepNext">Next →</button></div>` : ''}
      <div class="wiki-extra">${refs}${de}</div>
      <div id="doneWrap" ${focus ? 'hidden' : ''}>${doneCard}</div></div>`;
    $('#readBtn').onclick = () => {
      Store.setRead(o.id, !st.read);
      render();
    };
    if (focus) {
      let cur = 0;
      const key = 'lpic1.step.' + o.id;
      try {
        cur = Math.min(sections.length - 1, +(sessionStorage.getItem(key) || 0));
      } catch (e) {
        cur = 0;
      }
      const seen = new Set();
      const go = (i, scroll = true) => {
        cur = Math.max(0, Math.min(sections.length - 1, i));
        seen.add(cur);
        $$('.wsec', body).forEach((el) => (el.hidden = +el.dataset.i !== cur));
        $$('.step', body).forEach((el, k) => {
          el.classList.toggle('cur', k === cur);
          el.classList.toggle('seen', seen.has(k) && k !== cur);
        });
        $('#stepTitle').textContent = `${cur + 1} / ${sections.length} · ${sections[cur].title}`;
        $('#stepPrev').disabled = cur === 0;
        $('#stepNext').textContent = cur === sections.length - 1 ? 'Finish ✓' : 'Next →';
        $('#doneWrap').hidden = cur !== sections.length - 1;
        $('.wiki-extra', body).hidden = cur !== 0 && cur !== sections.length - 1;
        try {
          sessionStorage.setItem(key, String(cur));
        } catch (e) {
          /* private mode */
        }
        if (scroll) $('#stepTitle').scrollIntoView({ block: 'start', behavior: 'smooth' });
      };
      $$('.step', body).forEach((el) => el.addEventListener('click', () => go(+el.dataset.go)));
      $('#stepPrev').onclick = () => go(cur - 1);
      $('#stepNext').onclick = () => {
        if (cur < sections.length - 1) go(cur + 1);
        else {
          if (!st.read) Store.setRead(o.id, true);
          location.hash = `#/obj/${o.id}/quiz`;
        }
      };
      $('#showAll').onclick = () => {
        Store.setSetting('focus', false);
        render();
      };
      const keyH = (e) => {
        if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || document.activeElement.closest('.term') || e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.key === 'ArrowRight') go(cur + 1);
        else if (e.key === 'ArrowLeft') go(cur - 1);
      };
      document.addEventListener('keydown', keyH);
      onLeave(() => document.removeEventListener('keydown', keyH));
      go(cur, false);
    } else if (sections.length > 1) {
      $$('[data-anchor]', body).forEach((a) =>
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const t = document.getElementById(a.dataset.anchor);
          if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        })
      );
      const tb = document.createElement('div');
      tb.className = 'row no-print';
      tb.style.margin = '.4rem 0';
      tb.innerHTML = '<button class="btn btn-sm btn-ghost" id="focusOn">Step by step</button>';
      body.querySelector('.wiki').insertBefore(tb, body.querySelector('.wiki').firstChild);
      $('#focusOn').onclick = () => {
        Store.setSetting('focus', true);
        render();
      };
    }
    $$('.chip', body).forEach((c) =>
      c.addEventListener('click', () => {
        const t = c.dataset.term;
        const k = knownTerm(t);
        if (k) return showMan(k);
        const p = t.replace(/\s.*$/, '');
        if (/^[/~]/.test(p) && !/\*/.test(p)) return runInSandbox(`ls -ld ${p}`);
        location.hash = '#/search?q=' + encodeURIComponent(t.replace(/[*()]/g, ''));
      })
    );
  }
  function renderObjSims(o, body) {
    body.innerHTML = `<div class="grid grid-auto">${(o.sims || [])
      .map((id) => SIMS.registry[id])
      .filter(Boolean)
      .map((s) => `<a class="card sim-card" href="#/sim/${s.id}"><span class="ico">${s.icon}</span><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></a>`)
      .join('')}</div>`;
  }

  /* =================== quiz engine =================== */
  const qType = (q) => (q.fill ? 'fill' : Array.isArray(q.a) ? 'multi' : 'single');
  const norm = (s) => String(s).trim().replace(/\s+/g, ' ');
  // optional German explanation (Settings → "Deutsche Erklärungen")
  const deOn = () => Store.data.settings.de !== false;
  const deText = (q, cls = '') => (deOn() && q.de ? `<div class="de-ex ${cls}" lang="de"><span class="de-flag" title="Deutsch">DE</span> ${md(q.de)}</div>` : '');
  function prepare(q) {
    const t = qType(q);
    if (t === 'fill') return { q, t, order: null };
    const idx = q.o.map((_, i) => i);
    const order = q.keep ? idx : shuffle(idx);
    return { q, t, order };
  }
  function isCorrect(p, ans) {
    const q = p.q;
    if (p.t === 'fill') {
      const v = norm(ans || '');
      return q.fill.some((f) => (q.ci ? norm(f).toLowerCase() === v.toLowerCase() : norm(f) === v));
    }
    if (p.t === 'multi') {
      const a = new Set(q.a);
      const sel = new Set(ans || []);
      return a.size === sel.size && [...a].every((x) => sel.has(x));
    }
    return ans === q.a;
  }
  function correctText(p) {
    const q = p.q;
    if (p.t === 'fill') return q.fill.map((f) => `<code>${esc(f)}</code>`).join(' or ');
    const a = Array.isArray(q.a) ? q.a : [q.a];
    return a.map((i) => md(q.o[i])).join('<br>');
  }
  function questionHtml(p, i, total, ans, reveal) {
    const q = p.q;
    const o = LPIC.byId[q.obj];
    let h = `<div class="q-head"><span>Question ${i + 1} / ${total}</span><span class="badge w">${q.obj}</span><span class="muted">${esc(o ? o.title : '')}</span></div><div class="q-text">${md(q.q)}</div>`;
    if (p.t === 'multi') h += `<div class="q-hint">Choose ${q.a.length} answers.</div>`;
    if (p.t === 'fill') {
      const right = reveal && isCorrect(p, ans);
      h += `<div class="fill"><input type="text" id="fillIn" spellcheck="false" autocomplete="off" placeholder="type your answer (exact command / file / value)" value="${esc(ans || '')}" ${reveal ? 'disabled' : ''} class="${reveal ? (right ? 'right' : 'wrong') : ''}"></div><div class="q-hint" style="margin-top:.4rem">Fill in the blank — answers are case-sensitive like on the real exam.</div>`;
    } else {
      p.order.forEach((oi, k) => {
        const letter = String.fromCharCode(65 + k);
        const checked = p.t === 'multi' ? (ans || []).indexOf(oi) >= 0 : ans === oi;
        let cls = checked ? 'sel' : '';
        if (reveal) {
          const isA = Array.isArray(q.a) ? q.a.indexOf(oi) >= 0 : q.a === oi;
          cls = isA && checked ? 'right' : isA ? 'missed right' : checked ? 'wrong' : '';
        }
        h += `<label class="opt ${cls}"><input type="${p.t === 'multi' ? 'checkbox' : 'radio'}" name="opt" value="${oi}" ${checked ? 'checked' : ''} ${reveal ? 'disabled' : ''}><span class="ol">${letter}</span><span>${md(q.o[oi])}</span></label>`;
      });
    }
    return h;
  }
  function readAnswer(p, root) {
    if (p.t === 'fill') return ($('#fillIn', root) || {}).value || '';
    const sel = $$('input[name=opt]:checked', root).map((x) => +x.value);
    return p.t === 'multi' ? sel : sel.length ? sel[0] : null;
  }
  function runQuiz(root, questions, opts) {
    if (!questions.length) {
      root.innerHTML = '<div class="card"><p>No questions for this selection.</p></div>';
      return;
    }
    const items = (opts.shuffle ? shuffle(questions) : questions).map(prepare);
    const answers = new Array(items.length).fill(undefined);
    const checked = new Array(items.length).fill(false);
    let cur = 0;
    root.innerHTML = '<div class="quiz card" id="quizCard"></div>';
    const card = $('#quizCard', root);
    const show = () => {
      const p = items[cur];
      const rev = checked[cur];
      const ok = rev && isCorrect(p, answers[cur]);
      let h = `<div class="bar" style="margin-bottom:.8rem"><span style="width:${pct(checked.filter(Boolean).length / items.length)}%"></span></div>` + questionHtml(p, cur, items.length, answers[cur], rev);
      if (rev)
        h += `<div class="feedback ${ok ? 'ok' : 'no'}"><b class="res">${ok ? '✓ Correct' : '✗ Not quite'}</b>${ok ? '' : `<div><b>Correct answer:</b> ${correctText(p)}</div>`}${p.q.e ? `<div style="margin-top:.4rem">${md(p.q.e)}</div>` : ''}${deText(p.q)}<div class="row" style="margin-top:.5rem"><a class="btn btn-sm btn-ghost" href="#/obj/${p.q.obj}">📚 Read ${p.q.obj}</a></div></div>`;
      h += `<div class="q-actions">${cur > 0 ? '<button class="btn" id="qPrev">← Back</button>' : ''}<span class="spacer"></span>${rev ? (cur < items.length - 1 ? '<button class="btn btn-primary" id="qNext">Next →</button>' : '<button class="btn btn-primary" id="qDone">See results</button>') : '<button class="btn" id="qSkip">Skip</button><button class="btn btn-primary" id="qCheck">Check answer</button>'}</div>`;
      card.innerHTML = h;
      const inp = $('#fillIn', card);
      if (inp && !rev) {
        inp.focus();
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') check();
        });
      }
      $$('input[name=opt]', card).forEach((x) =>
        x.addEventListener('change', () => {
          answers[cur] = readAnswer(p, card);
          $$('.opt', card).forEach((l) => l.classList.toggle('sel', $('input', l).checked));
        })
      );
      const on = (id, fn) => {
        const b = $('#' + id, card);
        if (b) b.onclick = fn;
      };
      on('qCheck', check);
      on('qSkip', () => {
        cur = (cur + 1) % items.length;
        show();
      });
      on('qNext', () => {
        cur++;
        show();
      });
      on('qPrev', () => {
        cur--;
        show();
      });
      on('qDone', results);
    };
    const check = () => {
      const p = items[cur];
      const a = readAnswer(p, card);
      if (a === null || (Array.isArray(a) && !a.length) || a === '') return toast('Choose an answer first');
      answers[cur] = a;
      checked[cur] = true;
      Store.answer(p.q.id, isCorrect(p, a));
      show();
    };
    const keyH = (e) => {
      const ae = document.activeElement;
      if (!document.body.contains(card)) return;
      if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || (ae.tagName === 'INPUT' && !/radio|checkbox/.test(ae.type)) || ae.closest('.term'))) return;
      const p = items[cur];
      if (!p || p.t === 'fill') return;
      const n = '1234567'.indexOf(e.key);
      const l = 'abcdefg'.indexOf(e.key.toLowerCase());
      const k = n >= 0 ? n : l >= 0 && !e.ctrlKey && !e.metaKey ? l : -1;
      if (k >= 0 && k < p.order.length && !checked[cur]) {
        const box = $$('input[name=opt]', card)[k];
        if (box) {
          box.checked = p.t === 'multi' ? !box.checked : true;
          box.dispatchEvent(new Event('change'));
        }
      } else if (e.key === 'Enter') {
        const b = $('#qNext', card) || $('#qDone', card) || $('#qCheck', card);
        if (b) b.click();
      }
    };
    document.addEventListener('keydown', keyH);
    onLeave(() => document.removeEventListener('keydown', keyH));
    const results = () => {
      const ok = items.filter((p, i) => checked[i] && isCorrect(p, answers[i])).length;
      const done = checked.filter(Boolean).length;
      const wrong = items.filter((p, i) => checked[i] && !isCorrect(p, answers[i])).map((p) => p.q);
      card.innerHTML = `<div class="result-hero"><div class="big-ring" style="--p:${pct(ok / items.length)}"><span>${pct(ok / items.length)}%<small>${ok}/${items.length}</small></span></div><div><h2 style="margin-top:0">${esc(opts.title || 'Quiz')} finished</h2><p class="muted">${done} of ${items.length} answered · ${ok} correct${wrong.length ? ` · ${wrong.length} to review` : ''}</p>
        <div class="row">${wrong.length ? '<button class="btn btn-primary" id="qRetryWrong">Retry the wrong ones</button>' : ''}<button class="btn" id="qAgain">Restart (shuffled)</button>${opts.backHref ? `<a class="btn" href="${opts.backHref}">Back</a>` : ''}</div></div></div>
        ${wrong.length ? `<h3>Review</h3>${wrong.map((q) => `<div class="feedback no" style="margin:.5rem 0"><div>${md(q.q)}</div><div style="margin-top:.3rem"><b>Answer:</b> ${correctText(prepare(q))}</div>${q.e ? `<div class="muted" style="margin-top:.3rem">${md(q.e)}</div>` : ''}${deText(q)}</div>`).join('')}` : ''}`;
      const a = $('#qAgain', card);
      if (a) a.onclick = () => runQuiz(root, questions, Object.assign({}, opts, { shuffle: true }));
      const r = $('#qRetryWrong', card);
      if (r) r.onclick = () => runQuiz(root, wrong, Object.assign({}, opts, { shuffle: true }));
      renderSidebar();
    };
    show();
  }

  /* =================== quiz center =================== */
  function scopeQuestions(scope) {
    if (!scope || scope === 'all') return LPIC.allQuestions();
    const [k, v] = scope.split(':');
    if (k === 'exam') return LPIC.ofExam(v).flatMap((o) => o.quiz);
    if (k === 'topic') return LPIC.ofTopic(v).flatMap((o) => o.quiz);
    if (k === 'obj') return v.split(',').flatMap((id) => (LPIC.byId[id] ? LPIC.byId[id].quiz : []));
    return [];
  }
  route(/^\/quiz$/, (m, params) => {
    if (params.get('auto')) {
      const qs = scopeQuestions(params.get('scope'));
      const n = +(params.get('n') || 20);
      view.innerHTML = `<div class="crumbs"><a href="#/quiz">Quiz center</a></div><h1>Quiz: ${esc(params.get('scope'))}</h1><div id="qz"></div>`;
      runQuiz($('#qz'), shuffle(qs).slice(0, n), { title: 'Quiz', shuffle: false, backHref: '#/quiz' });
      return;
    }
    const opts = LPIC.exams.map((ex) => `<option value="exam:${ex.id}">${ex.title} (${ex.code}) — all topics</option>` + ex.topics.map((t) => `<option value="topic:${t}">&nbsp;&nbsp;Topic ${t}: ${esc(LPIC.topics[t].title)}</option>`).join('')).join('');
    view.innerHTML = `<h1>❓ Quiz center</h1><p class="muted">Build a practice quiz. Answers are explained immediately; every answer updates your progress and the spaced-repetition schedule.</p>
      <div class="card" style="max-width:640px"><div class="field"><label>Scope</label><select id="qScope"><option value="all">Everything (101 + 102)</option>${opts}</select></div>
      <div class="field"><label>Questions</label><select id="qMode"><option value="all">all questions in scope</option><option value="new">only questions I have not answered yet</option><option value="wrong">only questions I got wrong last time</option></select></div>
      <div class="field"><label>Number of questions</label><input id="qN" type="number" value="20" min="1" max="500"></div>
      <button class="btn btn-primary" id="qStart">Start quiz</button> <span class="muted" id="qCount"></span></div>
      <h2>By objective</h2><div class="grid grid-auto" id="qObjs"></div>`;
    const count = () => {
      let qs = scopeQuestions($('#qScope').value);
      const mode = $('#qMode').value;
      if (mode === 'new') qs = qs.filter((q) => !Store.data.questions[q.id]);
      if (mode === 'wrong') qs = qs.filter((q) => (Store.data.questions[q.id] || {}).last === false);
      $('#qCount').textContent = `${qs.length} available`;
      return qs;
    };
    ['qScope', 'qMode'].forEach((id) => $('#' + id).addEventListener('change', count));
    count();
    $('#qStart').onclick = () => {
      const qs = count();
      const n = Math.max(1, +$('#qN').value || 20);
      view.innerHTML = `<div class="crumbs"><a href="#/quiz">Quiz center</a></div><h1>Practice quiz</h1><div id="qz"></div>`;
      runQuiz($('#qz'), shuffle(qs).slice(0, n), { title: 'Practice quiz', backHref: '#/quiz' });
    };
    $('#qObjs').innerHTML = LPIC.sorted()
      .map((o) => {
        const ok = o.quiz.filter((q) => (Store.data.questions[q.id] || {}).last).length;
        return `<a class="card sim-card" href="#/obj/${o.id}/quiz"><div class="row"><b>${o.id}</b><span class="spacer"></span><span class="badge ${ok === o.quiz.length && ok ? 'good' : ''}">${ok}/${o.quiz.length}</span></div><p>${esc(o.title)}</p></a>`;
      })
      .join('');
  });

  /* =================== exam simulator =================== */
  function buildExam(examId, total = 60) {
    const objs = LPIC.ofExam(examId);
    const W = objs.reduce((a, o) => a + o.weight, 0);
    let alloc = objs.map((o) => ({ o, n: Math.min(o.quiz.length, Math.round((total * o.weight) / W)) }));
    let sum = alloc.reduce((a, x) => a + x.n, 0);
    // adjust to exact total
    const byW = alloc.slice().sort((a, b) => b.o.weight - a.o.weight);
    let guard = 0;
    while (sum !== total && guard++ < 500) {
      // add to heavy objectives first; for short exams drop questions from light objectives first
      for (const x of sum < total ? byW : byW.slice().reverse()) {
        if (sum === total) break;
        if (sum < total && x.n < x.o.quiz.length) {
          x.n++;
          sum++;
        } else if (sum > total && x.n > 0) {
          x.n--;
          sum--;
        }
      }
    }
    return shuffle(alloc.flatMap((x) => shuffle(x.o.quiz).slice(0, x.n)));
  }
  // time-per-question summary of one exam attempt
  function examTimeHtml(items, budget) {
    const answered = items.filter((x) => x.s > 0);
    if (!answered.length) return '';
    const avg = answered.reduce((a, x) => a + x.s, 0) / answered.length;
    const slow = items.slice().sort((a, b) => b.s - a.s).slice(0, 5);
    const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);
    return `<h3>Time per question</h3><p>Average <b>${fmt(Math.round(avg))}</b> per question (budget in the real exam: ${fmt(Math.round(budget))}).${avg > budget ? ' <span class="badge warn">too slow</span>' : ''}</p>
      <p class="muted" style="font-size:.88rem;margin-bottom:.3rem">Questions you spent the most time on:</p><ol class="weak-list">${slow.map((x) => `<li><a href="#/obj/${x.q.obj}">${x.q.obj}</a> ${md(x.q.q)} <span class="muted">— ${fmt(x.s)} ${x.ok ? '✓' : '✗'}</span></li>`).join('')}</ol>`;
  }
  // SVG line chart of exam scores over time (one line per exam)
  function examTrendSvg(hist) {
    const W = 640;
    const H = 220;
    const P = 34;
    const pts = hist.map((e, i) => ({ x: P + (hist.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (hist.length - 1)), y: H - P - (e.correct / e.total) * (H - 2 * P), e }));
    const y65 = H - P - 0.65 * (H - 2 * P);
    const line = (exam) => {
      const p = pts.filter((q) => q.e.exam === exam);
      return p.length > 1 ? `<polyline fill="none" stroke="var(${exam === '101' ? '--accent' : '--blue'})" stroke-width="2.5" points="${p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')}"/>` : '';
    };
    return `<svg viewBox="0 0 ${W} ${H}" class="trend" role="img" aria-label="exam scores over time">
      ${[0, 25, 50, 75, 100].map((v) => { const y = H - P - (v / 100) * (H - 2 * P); return `<line x1="${P}" x2="${W - P}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${P - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${v}%</text>`; }).join('')}
      <line x1="${P}" x2="${W - P}" y1="${y65}" y2="${y65}" stroke="var(--warn)" stroke-dasharray="5 4"/><text x="${W - P}" y="${y65 - 5}" text-anchor="end" font-size="11" fill="var(--warn)">pass 65 %</text>
      ${line('101')}${line('102')}
      ${pts.map((q) => `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="5" fill="var(${q.e.exam === '101' ? '--accent' : '--blue'})"><title>${q.e.exam}-500 · ${new Date(q.e.date).toLocaleDateString()} · ${pct(q.e.correct / q.e.total)}%</title></circle>`).join('')}
    </svg><div class="row" style="font-size:.85rem"><span><span class="dot" style="background:var(--accent)"></span> 101-500</span><span><span class="dot" style="background:var(--blue)"></span> 102-500</span></div>`;
  }
  route(/^\/exam\/history$/, () => {
    const hist = Store.data.exams.slice();
    if (!hist.length) {
      view.innerHTML = '<div class="crumbs"><a href="#/exam">Exam simulator</a></div><h1>📈 Exam history</h1><p class="muted">No exam attempts yet — start one in the <a href="#/exam">exam simulator</a>.</p>';
      return;
    }
    // aggregate per topic over all attempts that recorded it
    const agg = {};
    for (const e of hist) for (const [t, v] of Object.entries(e.perTopic || {})) {
      const a = (agg[t] = agg[t] || { ok: 0, n: 0, last: null });
      a.ok += v.ok;
      a.n += v.n;
      a.last = v.ok / v.n;
    }
    const best = (ex) => Math.max(0, ...hist.filter((e) => e.exam === ex).map((e) => e.correct / e.total));
    const last = (ex) => hist.filter((e) => e.exam === ex).slice(-1)[0];
    const withTimes = hist.filter((e) => e.times && e.times.length);
    const avgTime = withTimes.length ? withTimes.reduce((a, e) => a + e.times.reduce((b, t) => b + t.s, 0) / e.times.length, 0) / withTimes.length : null;
    view.innerHTML = `<div class="crumbs"><a href="#/exam">Exam simulator</a></div><h1>📈 Exam history</h1>
      <div class="grid grid-3">${LPIC.exams.map((ex) => { const l = last(ex.id); return `<div class="card stat"><div class="v">${l ? pct(l.correct / l.total) + '%' : '–'}</div><div class="l">last ${ex.code} · best ${pct(best(ex.id))}% · ${hist.filter((e) => e.exam === ex.id).length} attempt(s)</div></div>`; }).join('')}<div class="card stat"><div class="v">${avgTime === null ? '–' : Math.round(avgTime) + ' s'}</div><div class="l">average time per question (budget 90 s)</div></div></div>
      <div class="card" style="margin-top:1rem"><h3 style="margin-top:0">Score trend</h3>${examTrendSvg(hist)}</div>
      <div class="card" style="margin-top:1rem"><h3 style="margin-top:0">Per topic (all attempts)</h3>${Object.keys(agg).length ? `<table><tr><th>Topic</th><th>Correct</th><th>Total</th><th style="width:35%"></th><th>Last attempt</th></tr>${Object.entries(agg).sort().map(([t, a]) => `<tr><td><a href="#/topic/${t}">${t}</a> ${esc(LPIC.topics[t].title)}</td><td>${a.ok}</td><td>${a.n}</td><td><div class="bar ${a.ok / a.n < 0.65 ? 'warn' : ''}"><span style="width:${pct(a.ok / a.n)}%"></span></div></td><td>${pct(a.last)}%</td></tr>`).join('')}</table>` : '<p class="muted">Per-topic results are recorded for new attempts.</p>'}</div>
      <div class="card" style="margin-top:1rem"><h3 style="margin-top:0">All attempts</h3><div class="tbl-wrap"><table><tr><th>Date</th><th>Exam</th><th>Result</th><th>Time</th><th>Ø per question</th><th>Weakest topics</th></tr>${hist.slice().reverse().map((e) => `<tr><td>${new Date(e.date).toLocaleString()}</td><td>${e.exam}</td><td>${e.correct}/${e.total} = <b>${pct(e.correct / e.total)}%</b> ${e.correct / e.total >= 0.65 ? '<span class="badge good">pass</span>' : '<span class="badge bad">fail</span>'}</td><td>${Math.floor(e.secs / 60)}:${String(e.secs % 60).padStart(2, '0')}</td><td>${e.times && e.times.length ? Math.round(e.times.reduce((a, t) => a + t.s, 0) / e.times.length) + ' s' : '–'}</td><td>${(e.weak || []).map((t) => `<a href="#/topic/${t}">${t}</a>`).join(', ')}</td></tr>`).join('')}</table></div></div>`;
  });
  route(/^\/exam$/, () => {
    const hist = Store.data.exams.slice().reverse();
    view.innerHTML = `<h1>⏱️ Exam simulator</h1><p class="muted">Like the real LPI exam: <b>60 questions</b>, <b>90 minutes</b>, questions drawn in proportion to the objective weights, mix of single choice, multiple choice and fill-in-the-blank. No feedback until you submit. Practice pass mark: <b>65 %</b> (LPI reports a scaled score of 200–800 with 500 to pass; the raw percentage behind it is not published, so aim higher).</p>
      <div class="grid grid-2">${LPIC.exams.map((ex) => `<div class="card"><h2 style="margin-top:0">${ex.title} <span class="muted" style="font-weight:500">${ex.code}</span></h2><p class="muted" style="font-size:.9rem">${esc(ex.subtitle)}</p><p style="font-size:.9rem">${LPIC.ofExam(ex.id).flatMap((o) => o.quiz).length} questions in the pool · readiness ${pct(readiness(LPIC.ofExam(ex.id)))}%</p><div class="row"><a class="btn btn-primary" href="#/exam/${ex.id}">Start ${ex.code}</a><a class="btn" href="#/exam/${ex.id}?n=20&min=30">Short (20 q / 30 min)</a></div></div>`).join('')}</div>
      <div class="row" style="margin-top:1.2rem"><h2 style="margin:0">History</h2><span class="spacer"></span>${hist.length ? '<a class="btn" href="#/exam/history">📈 Trend & per-topic analysis</a>' : ''}</div>${hist.length ? '<div class="tbl-wrap"><table><tr><th>Date</th><th>Exam</th><th>Result</th><th>Time</th><th>Weakest topics</th></tr>' + hist.map((e) => `<tr><td>${new Date(e.date).toLocaleString()}</td><td>${e.exam}</td><td>${e.correct}/${e.total} = <b>${pct(e.correct / e.total)}%</b> ${e.correct / e.total >= 0.65 ? '<span class="badge good">pass</span>' : '<span class="badge bad">fail</span>'}</td><td>${Math.floor(e.secs / 60)}:${String(e.secs % 60).padStart(2, '0')}</td><td>${esc((e.weak || []).join(', '))}</td></tr>`).join('') + '</table></div>' : '<p class="muted">No attempts yet.</p>'}`;
  });
  route(/^\/exam\/(101|102)$/, (m, params) => {
    const exam = m[1];
    const total = Math.min(60, +(params.get('n') || 60));
    const minutes = +(params.get('min') || 90);
    const qs = buildExam(exam, total).map(prepare);
    const answers = new Array(qs.length).fill(undefined);
    const flags = new Array(qs.length).fill(false);
    const spent = new Array(qs.length).fill(0); // ms spent on each question
    let cur = 0;
    let submitted = false;
    const t0 = Date.now();
    let shownAt = t0;
    let shownIdx = 0;
    const track = () => {
      const now = Date.now();
      if (!submitted) spent[shownIdx] += now - shownAt;
      shownAt = now;
      shownIdx = cur;
    };
    const end = t0 + minutes * 60000;
    view.innerHTML = `<div class="row"><h1 style="margin:0">Exam ${exam}-500 simulation</h1><span class="spacer"></span><span class="timer" id="timer"></span><button class="btn btn-danger" id="exSubmit">Submit exam</button></div><div class="qnav" id="qnav"></div><div class="quiz card" id="exCard"></div>`;
    const timerEl = $('#timer');
    const tick = () => {
      const left = Math.max(0, end - Date.now());
      const mm = Math.floor(left / 60000);
      const ss = Math.floor((left % 60000) / 1000);
      timerEl.textContent = `⏱ ${mm}:${String(ss).padStart(2, '0')}`;
      timerEl.classList.toggle('low', left < 5 * 60000);
      if (left <= 0 && !submitted) {
        toast('Time is up!');
        submit();
      }
    };
    const iv = setInterval(tick, 1000);
    onLeave(() => clearInterval(iv));
    tick();
    const leaveGuard = (e) => {
      if (!submitted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leaveGuard);
    onLeave(() => window.removeEventListener('beforeunload', leaveGuard));
    const nav = () => {
      $('#qnav').innerHTML = qs
        .map((p, i) => {
          const a = answers[i];
          const answered = a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && !a.length);
          let cls = answered ? 'answered' : '';
          if (submitted) cls = isCorrect(p, a) ? 'right' : 'wrong';
          return `<button class="${cls} ${flags[i] ? 'flag' : ''} ${i === cur ? 'cur' : ''}" data-i="${i}">${i + 1}</button>`;
        })
        .join('');
      $$('#qnav button').forEach((b) =>
        b.addEventListener('click', () => {
          save();
          cur = +b.dataset.i;
          show();
        })
      );
    };
    const save = () => {
      if (submitted) return;
      const a = readAnswer(qs[cur], $('#exCard'));
      answers[cur] = a;
    };
    const show = () => {
      track();
      const p = qs[cur];
      let h = questionHtml(p, cur, qs.length, answers[cur], submitted);
      if (submitted) {
        const ok = isCorrect(p, answers[cur]);
        h += `<div class="feedback ${ok ? 'ok' : 'no'}"><b class="res">${ok ? '✓ Correct' : '✗ Wrong'}</b>${ok ? '' : `<div><b>Correct answer:</b> ${correctText(p)}</div>`}${p.q.e ? `<div style="margin-top:.4rem">${md(p.q.e)}</div>` : ''}${deText(p.q)}</div>`;
      }
      h += `<div class="q-actions"><button class="btn" id="exPrev" ${cur === 0 ? 'disabled' : ''}>← Previous</button>${submitted ? '' : `<button class="btn" id="exFlag">${flags[cur] ? '⚑ Unflag' : '⚐ Flag for review'}</button>`}<span class="spacer"></span><button class="btn btn-primary" id="exNext" ${cur === qs.length - 1 ? 'disabled' : ''}>Next →</button></div>`;
      $('#exCard').innerHTML = h;
      $$('#exCard input[name=opt]').forEach((x) =>
        x.addEventListener('change', () => {
          save();
          $$('#exCard .opt').forEach((l) => l.classList.toggle('sel', $('input', l).checked));
          nav();
        })
      );
      const fi = $('#fillIn');
      if (fi) fi.addEventListener('input', () => {
        save();
        nav();
      });
      $('#exPrev').onclick = () => {
        save();
        cur--;
        show();
      };
      $('#exNext').onclick = () => {
        save();
        cur++;
        show();
      };
      const fl = $('#exFlag');
      if (fl)
        fl.onclick = () => {
          flags[cur] = !flags[cur];
          show();
        };
      nav();
    };
    const submit = () => {
      save();
      if (submitted) return;
      const unanswered = answers.filter((a) => a === undefined || a === null || a === '' || (Array.isArray(a) && !a.length)).length;
      if (Date.now() < end && unanswered && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
      track();
      submitted = true;
      clearInterval(iv);
      const secs = Math.round((Date.now() - t0) / 1000);
      let ok = 0;
      const perTopic = {};
      qs.forEach((p, i) => {
        const c = isCorrect(p, answers[i]);
        if (c) ok++;
        Store.q(p.q.id);
        const s = Store.data.questions[p.q.id];
        s.n++;
        if (c) s.ok++;
        s.last = c;
        s.box = c ? Math.min(5, (s.box || 0) + 1) : 0;
        s.due = Date.now() + (c ? [0, 1, 2, 4, 8, 16][s.box] * 86400000 : 0);
        const t = p.q.obj.split('.')[0];
        perTopic[t] = perTopic[t] || { ok: 0, n: 0 };
        perTopic[t].n++;
        if (c) perTopic[t].ok++;
      });
      const weak = Object.entries(perTopic)
        .sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)
        .slice(0, 2)
        .map(([t]) => t);
      const perObj = {};
      qs.forEach((p, i) => {
        const o = (perObj[p.q.obj] = perObj[p.q.obj] || { ok: 0, n: 0 });
        o.n++;
        if (isCorrect(p, answers[i])) o.ok++;
      });
      const times = qs.map((p, i) => ({ id: p.q.id, s: Math.round(spent[i] / 1000), ok: isCorrect(p, answers[i]) }));
      Store.addExam({ exam, date: Date.now(), correct: ok, total: qs.length, secs, weak, perTopic, perObj, times });
      const passed = ok / qs.length >= 0.65;
      view.insertAdjacentHTML(
        'afterbegin',
        `<div class="card" style="margin-bottom:1rem"><div class="result-hero"><div class="big-ring" style="--p:${pct(ok / qs.length)}"><span>${pct(ok / qs.length)}%<small>${ok}/${qs.length}</small></span></div><div style="flex:1"><h2 style="margin-top:0">${passed ? '🎉 Passed (practice mark 65 %)' : 'Not passed yet'}</h2><p class="muted">Time used: ${Math.floor(secs / 60)} min ${secs % 60} s. Click the numbers above to review every question with explanations.</p>
        <table><tr><th>Topic</th><th>Score</th><th></th></tr>${Object.entries(perTopic)
          .sort()
          .map(([t, v]) => `<tr><td>${t} ${esc(LPIC.topics[t].title)}</td><td>${v.ok}/${v.n}</td><td style="width:40%"><div class="bar ${v.ok / v.n < 0.65 ? 'warn' : ''}"><span style="width:${pct(v.ok / v.n)}%"></span></div></td></tr>`)
          .join('')}</table>${examTimeHtml(qs.map((p, i) => ({ q: p.q, s: Math.round(spent[i] / 1000), ok: isCorrect(p, answers[i]) })), minutes * 60 / qs.length)}<div class="row" style="margin-top:.8rem"><a class="btn btn-primary" href="#/exam">Back to the simulator</a><a class="btn" href="#/exam/history">Exam history</a><a class="btn" href="#/review">Review mistakes</a><a class="btn" href="#/weak">Weak spots</a></div></div></div></div>`
      );
      $('#exSubmit').remove();
      timerEl.textContent = '';
      show();
      renderSidebar();
    };
    $('#exSubmit').onclick = submit;
    show();
  });

  /* =================== troubleshooting scenarios =================== */
  const scenarioDone = (id) => Object.keys(Store.obj('sc:' + id).labs || {}).length;
  route(/^\/scenarios$/, () => {
    const list = Object.entries(LPIC.scenarios);
    const lv = { easy: 'good', medium: 'w', hard: 'bad' };
    view.innerHTML = `<h1>🛠️ Troubleshooting scenarios</h1><p class="muted">Something is broken — find the cause and fix it. Each scenario starts a fresh simulated system with a realistic fault and checks your fix automatically. Unlike the labs, the tasks lead you through a diagnosis: look, conclude, repair, verify.</p>
      <div class="grid grid-auto">${list.map(([id, sc]) => { const d = scenarioDone(id); return `<a class="card sim-card" href="#/scenario/${id}"><div class="row"><span class="badge ${lv[sc.level] || ''}">${sc.level}</span><span class="spacer"></span><span class="ring ${d === sc.tasks.length ? 'done' : ''}" style="--p:${pct(d / sc.tasks.length)}"></span></div><h3>${esc(sc.title)}</h3><p>${md(sc.story.split('. ')[0] + '.')}</p><div class="chips" style="margin-top:auto">${sc.obj.map((x) => `<span class="badge w">${x}</span>`).join('')}<span class="badge">${d}/${sc.tasks.length} tasks</span></div></a>`; }).join('')}</div>`;
  });
  route(/^\/scenario\/([\w-]+)$/, (m) => {
    const sc = LPIC.scenarios[m[1]];
    if (!sc) return (view.innerHTML = '<h1>Unknown scenario</h1>');
    view.innerHTML = `<div class="crumbs"><a href="#/scenarios">Troubleshooting</a> · ${sc.obj.map((x) => `<a href="#/obj/${x}">${x}</a>`).join(', ')}</div><h1>🛠️ ${esc(sc.title)}</h1><div id="scBody"></div>`;
    const lab = Object.assign({}, sc, { intro: `**The problem:** ${sc.story}`, motd: 'Something is broken on this machine. Investigate with the usual tools — the tasks on the right guide you.' });
    renderLab({ id: 'sc:' + m[1], title: sc.title }, lab, $('#scBody'));
  });

  /* =================== cheatsheets =================== */
  // "> EXAM: …" callouts of an objective's wiki, as plain markdown strings
  function examNotes(o) {
    const lines = (o.wiki || '').replace(/\$\\\{/g, '${').replace(/\\`/g, '`').split('\n');
    const notes = [];
    for (let i = 0; i < lines.length; i++) {
      const m = /^\s*>\s*EXAM:\s*(.*)$/.exec(lines[i]);
      if (!m) continue;
      let t = m[1];
      while (i + 1 < lines.length && /^\s*>\s?\S/.test(lines[i + 1]) && !/^\s*>\s*(TIP|WARN|NOTE|INFO|EXAM):/.test(lines[i + 1])) t += ' ' + lines[++i].replace(/^\s*>\s?/, '');
      notes.push(t.trim());
    }
    return notes;
  }
  function cheatTopicHtml(t) {
    const objs = LPIC.ofTopic(t);
    let h = `<section class="cheat-topic"><h2>${LPIC.topics[t].icon} ${t} ${esc(LPIC.topics[t].title)}</h2>`;
    for (const o of objs) {
      const cmds = [];
      const files = [];
      const other = [];
      for (const term of o.terms) {
        const base = term.replace(/\s.*$/, '').replace(/[()]/g, '');
        if (SIM.man[base]) cmds.push({ term, e: SIM.man[base] });
        else if (/^[/~]/.test(term)) files.push(term);
        else other.push(term);
      }
      const notes = examNotes(o);
      h += `<div class="cheat-obj"><h3>${o.id} ${esc(o.title)} <span class="badge w">w${o.weight}</span></h3>`;
      if (cmds.length) h += `<table class="cheat-tbl">${cmds.map((c) => `<tr><td><code>${esc(c.term)}</code></td><td>${esc(c.e.d)}${c.e.o.length ? `<div class="cheat-opts">${c.e.o.slice(0, 4).map((x) => (/\s{2,}/.test(x) ? `<code>${esc(x.split(/\s{2,}/)[0])}</code> ${esc(x.split(/\s{2,}/).slice(1).join(' '))}` : esc(x))).join(' · ')}</div>` : ''}</td></tr>`).join('')}</table>`;
      if (files.length) h += `<p class="cheat-files"><b>Files:</b> ${files.map((f) => `<code>${esc(f)}</code>`).join(' ')}</p>`;
      if (other.length) h += `<p class="cheat-files"><b>Terms:</b> ${other.map((f) => esc(f)).join(' · ')}</p>`;
      if (notes.length) h += `<ul class="cheat-notes">${notes.map((n) => `<li>${md(n)}</li>`).join('')}</ul>`;
      if (deOn() && LPIC.deSummary[o.id]) h += `<details class="cheat-de" lang="de"><summary><span class="de-flag">DE</span> Kurzfassung</summary>${MD.render(LPIC.deSummary[o.id]).html}</details>`;
      h += `</div>`;
    }
    return h + '</section>';
  }
  route(/^\/cheat(?:\/(\d+|101-500|102-500))?$/, (m) => {
    const sel = m[1];
    const topics = !sel ? null : sel === '101-500' ? LPIC.exams[0].topics : sel === '102-500' ? LPIC.exams[1].topics : [sel];
    const pick = `<div class="row no-print"><a class="btn btn-sm ${!sel ? 'btn-primary' : ''}" href="#/cheat">Overview</a>${LPIC.exams.map((ex) => `<a class="btn btn-sm ${sel === ex.code ? 'btn-primary' : ''}" href="#/cheat/${ex.code}">${ex.code} complete</a>`).join('')}${Object.keys(LPIC.topics).map((t) => `<a class="btn btn-sm ${sel === t ? 'btn-primary' : ''}" href="#/cheat/${t}">${t}</a>`).join('')}<span class="spacer"></span>${topics ? '<button class="btn" id="chPrint">🖨 Print / save as PDF</button>' : ''}</div>`;
    if (!topics) {
      view.innerHTML = `<h1>📝 Cheatsheets</h1><p class="muted">Compact, printable summaries for the last days before the exam: the commands of every objective with their key options, the files and terms from the official objective list, and all "Exam focus" notes from the wiki. Choose a topic or a whole exam, then print it or save it as PDF.</p>${pick}
        <div class="grid grid-auto" style="margin-top:1rem">${Object.keys(LPIC.topics).map((t) => `<a class="card sim-card" href="#/cheat/${t}"><span class="ico">${LPIC.topics[t].icon}</span><h3>${t} ${esc(LPIC.topics[t].title)}</h3><p>${LPIC.ofTopic(t).length} objectives</p></a>`).join('')}</div>`;
      return;
    }
    view.innerHTML = `<div class="crumbs no-print"><a href="#/cheat">Cheatsheets</a></div><h1 class="cheat-title">📝 LPIC-1 cheatsheet — ${sel.length === 3 ? 'Topic ' + sel + ': ' + esc(LPIC.topics[sel].title) : 'Exam ' + sel}</h1>${pick}<div class="cheat">${topics.map(cheatTopicHtml).join('')}</div>`;
    $('#chPrint').onclick = () => {
      $$('.cheat-de').forEach((d) => (d.open = true));
      window.print();
    };
  });

  /* =================== weak spots =================== */
  // Laplace-smoothed error rate, raised when the last answer was wrong and lowered by Leitner box
  function weakness(qs) {
    const s = Store.data.questions[qs.id];
    if (!s || !s.n) return null;
    return (s.n - s.ok + 1) / (s.n + 2) + (s.last === false ? 0.35 : 0) - (s.box || 0) * 0.06;
  }
  function weakQuestions(limit) {
    return LPIC.allQuestions()
      .map((q) => ({ q, w: weakness(q) }))
      .filter((x) => x.w !== null && (Store.data.questions[x.q.id].n > Store.data.questions[x.q.id].ok || Store.data.questions[x.q.id].last === false))
      .sort((a, b) => b.w - a.w)
      .slice(0, limit)
      .map((x) => x.q);
  }
  // commands, files and options that appear in questions answered wrong
  function weakTerms() {
    const count = {};
    for (const q of LPIC.allQuestions()) {
      const s = Store.data.questions[q.id];
      if (!s || s.n <= s.ok) continue;
      const wrong = s.n - s.ok;
      const src = [q.q].concat(q.fill ? q.fill.slice(0, 1) : [].concat(q.a).map((i) => q.o[i])).join(' ');
      const seen = new Set();
      for (const m of src.matchAll(/\{\{([^}]+?)\}\}/g)) {
        const t = m[1].trim().split(/\s+/)[0].replace(/[;,]$/, '');
        if (t.length < 2 || /^[-\d]/.test(t) && !/^-[a-zA-Z]/.test(t)) continue;
        if (seen.has(t)) continue;
        seen.add(t);
        count[t] = (count[t] || 0) + wrong;
      }
      for (const f of q.fill ? q.fill.slice(0, 1) : []) {
        const t = f.trim().split(/\s+/)[0];
        if (t && !seen.has(t)) {
          seen.add(t);
          count[t] = (count[t] || 0) + wrong;
        }
      }
    }
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24);
  }
  route(/^\/weak$/, () => {
    const answered = LPIC.allQuestions().filter((q) => (Store.data.questions[q.id] || {}).n);
    const rows = LPIC.sorted().map((o) => {
      let n = 0;
      let ok = 0;
      let seen = 0;
      for (const q of o.quiz) {
        const s = Store.data.questions[q.id];
        if (!s || !s.n) continue;
        seen++;
        n += s.n;
        ok += s.ok;
      }
      const acc = n ? ok / n : null;
      // priority: exam weight × how much is still missing (unknown questions count as 50 %)
      const cover = seen / o.quiz.length;
      const prio = o.weight * (1 - (acc || 0) * cover);
      return { o, n, ok, seen, acc, prio, m: mastery(o) };
    });
    const weakQs = weakQuestions(20);
    const terms = weakTerms();
    const byTopic = Object.keys(LPIC.topics).map((t) => {
      const r = rows.filter((x) => x.o.topic === t);
      const n = r.reduce((a, x) => a + x.n, 0);
      const ok = r.reduce((a, x) => a + x.ok, 0);
      return { t, n, acc: n ? ok / n : null };
    });
    const bar = (v, warn) => `<div class="bar ${warn ? 'warn' : ''}"><span style="width:${v === null ? 0 : pct(v)}%"></span></div>`;
    view.innerHTML = `<h1>📉 Weak spots</h1><p class="muted">Where you lose points: objectives, commands and single questions you answered wrong most often (quiz, review, flashcards and exam simulations all count). Practise these first — weighted by their exam weight.</p>
      ${answered.length ? '' : '<div class="callout note"><div class="ct">Not enough data yet</div><p>Answer some questions in the <a href="#/quiz">quiz center</a> or take an <a href="#/exam">exam simulation</a> — this page fills up automatically.</p></div>'}
      <div class="grid grid-3"><div class="card stat"><div class="v">${answered.length}</div><div class="l">questions answered (of ${LPIC.allQuestions().length})</div></div><div class="card stat"><div class="v">${weakQuestions(9999).length}</div><div class="l">questions with mistakes</div></div><div class="card stat"><div class="v">${pct(answered.length ? answered.reduce((a, q) => a + Store.data.questions[q.id].ok, 0) / answered.reduce((a, q) => a + Store.data.questions[q.id].n, 0) : 0)}%</div><div class="l">overall accuracy</div></div></div>
      <div class="card" style="margin-top:1rem"><div class="row"><h3 style="margin:0">Your 20 weakest questions</h3><span class="spacer"></span><button class="btn btn-primary" id="wkGo" ${weakQs.length ? '' : 'disabled'}>▶ Practise them now</button></div>
        ${weakQs.length ? `<ol class="weak-list">${weakQs.map((q) => { const s = Store.data.questions[q.id]; return `<li><a href="#/obj/${q.obj}/quiz">${q.obj}</a> ${md(q.q)} <span class="muted">— ${s.ok}/${s.n} correct${s.last === false ? ', last answer wrong' : ''}</span></li>`; }).join('')}</ol>` : '<p class="muted">No mistakes recorded yet.</p>'}</div>
      <div id="wkQuiz"></div>
      <div class="grid grid-2" style="margin-top:1rem">
        <div class="card"><h3 style="margin-top:0">Commands & files you miss most</h3>${terms.length ? `<div class="chips">${terms.map(([t, c]) => `<a class="chip ${SIM.man[t] ? 'known' : ''}" href="#/search?q=${encodeURIComponent(t)}" title="${c} wrong answer(s)">${esc(t)} <b>${c}</b></a>`).join('')}</div><p class="muted" style="font-size:.85rem">Click a term to find it in the wiki; known commands also have a manual page in the sandbox (<code>man NAME</code>).</p>` : '<p class="muted">Nothing yet.</p>'}</div>
        <div class="card"><h3 style="margin-top:0">Accuracy per topic</h3><table>${byTopic.map((x) => `<tr><td><a href="#/topic/${x.t}">${x.t}</a></td><td>${esc(LPIC.topics[x.t].title)}</td><td style="width:35%">${bar(x.acc, x.acc !== null && x.acc < 0.65)}</td><td class="muted">${x.acc === null ? '–' : pct(x.acc) + '%'}</td></tr>`).join('')}</table></div>
      </div>
      <div class="card" style="margin-top:1rem"><h3 style="margin-top:0">Objectives by priority</h3><p class="muted" style="font-size:.88rem">Priority = exam weight × what is still missing (accuracy and coverage). Work from the top.</p>
        <div class="tbl-wrap"><table><thead><tr><th>Objective</th><th>Weight</th><th>Questions tried</th><th>Accuracy</th><th>Mastery</th><th></th></tr></thead><tbody>${rows
          .sort((a, b) => b.prio - a.prio || b.o.weight - a.o.weight)
          .map((r) => `<tr><td><a href="#/obj/${r.o.id}">${r.o.id}</a> ${esc(r.o.title)}</td><td>${r.o.weight}</td><td>${r.seen}/${r.o.quiz.length}</td><td style="min-width:110px">${r.acc === null ? '<span class="muted">not tried</span>' : bar(r.acc, r.acc < 0.65) + `<span class="muted" style="font-size:.8rem">${pct(r.acc)}%</span>`}</td><td>${pct(r.m)}%</td><td><a class="btn btn-sm" href="#/obj/${r.o.id}/quiz">Quiz</a></td></tr>`)
          .join('')}</tbody></table></div></div>`;
    $('#wkGo').onclick = () => {
      runQuiz($('#wkQuiz'), weakQuestions(20), { title: 'Weak spots', backHref: '#/weak' });
      $('#wkQuiz').scrollIntoView({ behavior: 'smooth' });
    };
  });

  /* =================== review =================== */
  route(/^\/review$/, () => {
    const due = dueQuestions();
    const wrong = due.filter((q) => (Store.data.questions[q.id] || {}).last === false);
    view.innerHTML = `<h1>🔁 Review</h1><p class="muted">Spaced repetition (Leitner system): a correct answer moves a question up one box (due again after 1, 2, 4, 8, 16 days); a wrong answer sends it back to the start. Questions you got wrong are always due.</p>
      <div class="grid grid-3"><div class="card stat"><div class="v">${due.length}</div><div class="l">due now</div></div><div class="card stat"><div class="v">${wrong.length}</div><div class="l">answered wrong last time</div></div><div class="card stat"><div class="v">${Object.values(Store.data.questions).filter((q) => q.box >= 4).length}</div><div class="l">well known (box ≥ 4)</div></div></div><div id="rv" style="margin-top:1rem"></div>`;
    if (!due.length) $('#rv').innerHTML = '<div class="card"><p>Nothing due — great! Answer more questions in the <a href="#/quiz">quiz center</a> or take an <a href="#/exam">exam simulation</a>.</p></div>';
    else runQuiz($('#rv'), shuffle(due).slice(0, 30), { title: 'Review session', backHref: '#/review' });
  });

  /* =================== flashcards =================== */
  route(/^\/cards$/, (m, params) => {
    const scope = params.get('scope') || 'all';
    const kind = params.get('kind') || 'cmd';
    let cards = [];
    if (kind === 'cmd') {
      const objs = scope === 'all' ? LPIC.sorted() : scope.startsWith('exam:') ? LPIC.ofExam(scope.slice(5)) : LPIC.ofTopic(scope.slice(6));
      const seen = new Set();
      for (const o of objs)
        for (const t of o.terms) {
          const b = t.replace(/\s.*$/, '');
          const e = SIM.man[b];
          if (e && !seen.has(b)) {
            seen.add(b);
            cards.push({ front: `<code style="font-size:1.4rem">${esc(b)}</code>`, back: `<b>${esc(e.d)}</b><div class="muted" style="margin-top:.5rem;font-family:var(--mono);font-size:.85rem">${esc(e.s)}</div>${e.o.length ? `<ul style="font-size:.85rem;text-align:left">${e.o.slice(0, 6).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`, obj: o.id, id: 'cmd:' + b });
          }
        }
    } else {
      const qs = scopeQuestions(scope);
      cards = qs.map((q) => ({ front: md(q.q) + (q.o ? `<ol type="A" style="font-size:.9rem;font-weight:400;text-align:left">${q.o.map((x) => `<li>${md(x)}</li>`).join('')}</ol>` : ''), back: correctText(prepare(q)) + (q.e ? `<div class="muted" style="margin-top:.6rem;font-size:.9rem;font-weight:400">${md(q.e)}</div>` : '') + deText(q, 'small'), obj: q.obj, id: q.id }));
    }
    cards = shuffle(cards);
    let i = 0;
    let known = 0;
    const scopeOpts = `<option value="all">all</option>${LPIC.exams.map((ex) => `<option value="exam:${ex.id}">${ex.title}</option>` + ex.topics.map((t) => `<option value="topic:${t}">— ${t} ${esc(LPIC.topics[t].title)}</option>`).join('')).join('')}`;
    view.innerHTML = `<h1>🃏 Flashcards</h1><div class="row"><select class="inp" id="fcKind"><option value="cmd">Commands → what they do</option><option value="q">Exam questions → answers</option></select><select class="inp" id="fcScope">${scopeOpts}</select><span class="spacer"></span><span class="muted" id="fcPos"></span></div><div id="fc"></div>`;
    $('#fcKind').value = kind;
    $('#fcScope').value = scope;
    const go = () => (location.hash = `#/cards?kind=${$('#fcKind').value}&scope=${$('#fcScope').value}`);
    $('#fcKind').onchange = go;
    $('#fcScope').onchange = go;
    const show = () => {
      if (!cards.length) return ($('#fc').innerHTML = '<p>No cards.</p>');
      if (i >= cards.length) {
        $('#fc').innerHTML = `<div class="card" style="text-align:center;margin-top:1rem"><h2>Deck finished</h2><p>You knew ${known} of ${cards.length} cards.</p><button class="btn btn-primary" id="fcAgain">Shuffle & restart</button></div>`;
        $('#fcAgain').onclick = () => render();
        return;
      }
      const c = cards[i];
      $('#fcPos').textContent = `${i + 1} / ${cards.length} · ${c.obj}`;
      $('#fc').innerHTML = `<div class="flashcard" id="card"><div class="fc-inner"><div class="fc-face"><div class="k">${kind === 'cmd' ? 'What does this do?' : 'Question'} — click to flip</div><div class="t">${c.front}</div></div><div class="fc-face fc-back"><div class="k">Answer</div><div class="t">${c.back}</div></div></div></div>
        <div class="row" style="justify-content:center"><button class="btn" id="fcNo">✗ Didn't know</button><button class="btn" id="fcFlip">↻ Flip (space)</button><button class="btn btn-primary" id="fcYes">✓ Knew it</button></div>`;
      const card = $('#card');
      const fit = () => {
        const faces = $$('.fc-face', card);
        const h = Math.max(260, ...faces.map((f) => f.scrollHeight));
        $('.fc-inner', card).style.minHeight = h + 'px';
      };
      fit();
      card.onclick = () => card.classList.toggle('flipped');
      $('#fcFlip').onclick = () => card.classList.toggle('flipped');
      const rate = (ok) => {
        if (!c.id.startsWith('cmd:')) Store.answer(c.id, ok);
        else Store.tick();
        if (ok) known++;
        i++;
        show();
      };
      $('#fcYes').onclick = () => rate(true);
      $('#fcNo').onclick = () => rate(false);
    };
    const keyH = (e) => {
      if (!$('#card') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || document.activeElement.closest('.term')) return;
      if (e.key === ' ') {
        e.preventDefault();
        $('#card').classList.toggle('flipped');
      } else if (e.key === 'ArrowRight' || e.key === 'k') $('#fcYes').click();
      else if (e.key === 'ArrowLeft' || e.key === 'j') $('#fcNo').click();
    };
    document.addEventListener('keydown', keyH);
    onLeave(() => document.removeEventListener('keydown', keyH));
    show();
  });

  /* =================== labs =================== */
  function renderLab(o, lab, body) {
    const st = Store.obj(o.id);
    body.innerHTML = `<div class="lab"><div><div class="card" style="margin-bottom:.8rem">${MD.render(lab.intro || '').html}<p class="muted" style="font-size:.85rem;margin:.3rem 0 0">This lab runs in its own fresh simulated system (it does not change your sandbox). Tasks are checked automatically after every command. Click a hint's command to type it.</p></div><div class="inline-term" id="labTerm"></div></div>
      <div class="card"><div class="row"><b>Tasks</b><span class="spacer"></span><span class="badge" id="labCount"></span></div><ol class="tasks" id="tasks"></ol><div class="row" style="margin-top:.8rem"><button class="btn btn-sm" id="labReset">↺ Reset lab</button><button class="btn btn-sm btn-ghost" id="labHints">Show all hints</button></div></div></div>`;
    let lastCmd = '';
    let lastStatus = 0;
    const cmdLog = [];
    const t = new SIM.Terminal($('#labTerm'), {
      quiet: true,
      setup: (sh) => {
        if (lab.setup) lab.setup(sh, LABH);
        sh.history = [];
      },
      onCommand: (src, status) => {
        if (src !== '#editor-closed') {
          lastCmd = src;
          lastStatus = status;
          cmdLog.push(src);
        }
        evaluate();
      },
    });
    t.print(`\x1b[1;32m${o.id.startsWith("sc:") ? "Scenario" : "Lab " + o.id}: ${lab.title || o.title}\x1b[0m\n\x1b[2m${(lab.motd || 'Work through the tasks on the right. Type "help" for shell help.').replace(/\n/g, '\n')}\x1b[0m\n\n`);
    const done = new Set(Object.keys(st.labs || {}).map(Number));
    let showHints = false;
    const draw = () => {
      $('#tasks').innerHTML = lab.tasks
        .map(
          (task, i) =>
            `<li class="${done.has(i) ? 'done' : ''}"><div><div class="tt">${md(task.t)}</div>${task.hint && (showHints || done.has(i) || i === firstOpen()) ? `<div class="hint">💡 ${md(task.hint)}</div>` : ''}</div></li>`
        )
        .join('');
      $('#labCount').textContent = `${done.size}/${lab.tasks.length}`;
      $$('#tasks .hint code').forEach((c) =>
        c.addEventListener('click', () => {
          t.input.value = c.textContent;
          t.focus();
        })
      );
    };
    const firstOpen = () => lab.tasks.findIndex((_, i) => !done.has(i));
    const evaluate = () => {
      const ctx = { last: lastCmd, status: lastStatus, log: cmdLog, used: (re) => cmdLog.some((c) => re.test(c)) };
      let changed = false;
      lab.tasks.forEach((task, i) => {
        if (done.has(i)) return;
        let ok = false;
        try {
          ok = SIM.asRoot(t.sh, () => !!task.check(t.sh, ctx, LABH));
        } catch (e) {
          ok = false;
        }
        if (ok) {
          done.add(i);
          Store.labDone(o.id, i);
          changed = true;
          t.print(`\x1b[1;32m✓ Task ${i + 1} done:\x1b[0m ${task.t.replace(/\{\{|\}\}|\*\*/g, '')}\n`);
        }
      });
      if (changed) {
        draw();
        renderSidebar();
        if (done.size === lab.tasks.length) t.print('\n\x1b[1;32m🎉 All tasks completed — well done!\x1b[0m\n');
      }
    };
    draw();
    $('#labReset').onclick = () => render();
    $('#labHints').onclick = () => {
      showHints = !showHints;
      draw();
    };
    setTimeout(() => t.focus(), 50);
  }

  /* =================== simulations =================== */
  route(/^\/sims$/, () => {
    const list = Object.values(SIMS.registry);
    view.innerHTML = `<h1>🧪 Simulations</h1><p class="muted">Interactive tools to understand concepts that are hard to see in a terminal. Each one belongs to one or more exam objectives.</p><div class="grid grid-auto">${list
      .map((s) => `<a class="card sim-card" href="#/sim/${s.id}"><span class="ico">${s.icon}</span><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p><div class="chips" style="margin-top:auto">${s.obj.map((x) => `<span class="badge w">${x}</span>`).join('')}${(Store.data.sims || {})[s.id] ? '<span class="badge good">✓ tried</span>' : ''}</div></a>`)
      .join('')}</div>`;
  });
  route(/^\/sim\/([\w-]+)$/, (m) => {
    const s = SIMS.registry[m[1]];
    if (!s) return (view.innerHTML = '<h1>Unknown simulation</h1>');
    view.innerHTML = `<div class="crumbs"><a href="#/sims">Simulations</a> · ${s.obj.map((x) => `<a href="#/obj/${x}">${x}</a>`).join(', ')}</div><h1>${s.icon} ${esc(s.title)}</h1><p class="muted">${esc(s.desc)}</p><div class="sim" id="simBody"></div>`;
    Store.simDone(s.id);
    const off = s.render($('#simBody'), { toast, runInSandbox, md: MD, esc });
    if (typeof off === 'function') onLeave(off);
  });

  /* =================== sandbox page =================== */
  route(/^\/shell$/, () => {
    view.innerHTML = `<h1>⌨️ Sandbox shell</h1><p class="muted">A simulated Debian 12 system running entirely in your browser. Your files and changes are saved ${Store.server ? 'to the server database (Docker volume)' : 'in this browser'}; type <code>reset-sandbox</code> to start over.</p>
      <div class="grid grid-3"><div class="card"><b>Try</b><ul style="font-size:.9rem;padding-left:1.1rem;margin-bottom:0"><li><code>ls -la</code>, <code>cat notes.txt</code></li><li><code>sudo -i</code> then <code>exit</code></li><li><code>vi poem.txt</code> (real modal editing)</li><li><code>man find</code>, <code>apropos partition</code></li><li><code>ps aux</code>, <code>sleep 300 &amp;</code>, <code>jobs</code>, <code>kill %1</code></li><li><code>sudo apt install htop</code></li></ul></div>
      <div class="card"><b>Supported shell features</b><p style="font-size:.9rem;margin-bottom:0">Pipes, redirection (<code>&gt; &gt;&gt; &lt; 2&gt;&amp;1 &lt;&lt;EOF &lt;&lt;&lt;</code>), variables, <code>$( )</code>, arithmetic, globbing, brace expansion, aliases, functions, <code>if/for/while/case</code>, scripts, job control, history (<code>!!</code>, <code>!n</code>, <kbd>Ctrl</kbd>+<kbd>R</kbd>), <kbd>Tab</kbd> completion.</p></div>
      <div class="card"><b>The system</b><p style="font-size:.9rem;margin-bottom:0">Users <code>student</code> (sudo), <code>alice</code>, <code>bob</code>; disks <code>/dev/sda</code> (system) and an empty <code>/dev/sdb</code> for partitioning practice; systemd services, cron, CUPS, postfix, networking, apt/dpkg and rpm/yum/zypper databases.</p></div></div>
      <p><button class="btn btn-primary" id="openT">Open terminal (full height)</button></p>`;
    $('#openT').onclick = () => openDrawer(true);
    openDrawer(true);
    // the full-height terminal belongs to this page: leaving it closes the drawer again
    onLeave(() => {
      if (document.body.classList.contains('drawer-max')) closeDrawer();
    });
  });

  /* =================== command reference =================== */
  route(/^\/commands$/, (m, params) => {
    const entries = Object.entries(SIM.man).sort((a, b) => a[0].localeCompare(b[0]));
    const objOf = {};
    for (const o of LPIC.sorted()) for (const t of o.terms) {
      const b = t.replace(/\s.*$/, '');
      (objOf[b] = objOf[b] || []).push(o.id);
    }
    view.innerHTML = `<h1>📖 Command reference</h1><p class="muted">Condensed manual pages for ${entries.length} commands and files that matter for LPIC-1. Click a name for the full page.</p><input class="inp" id="cmdFilter" placeholder="filter… e.g. partition, user, sed" style="width:100%;max-width:420px" value="${esc(params.get('q') || '')}"><div class="tbl-wrap"><table class="cmd-table"><thead><tr><th>Name</th><th>Description</th><th>Objectives</th></tr></thead><tbody id="cmdRows"></tbody></table></div>`;
    const draw = () => {
      const f = $('#cmdFilter').value.toLowerCase();
      $('#cmdRows').innerHTML = entries
        .filter(([k, e]) => !f || k.toLowerCase().includes(f) || e.d.toLowerCase().includes(f))
        .map(([k, e]) => {
          const name = k.replace(/\.\d$/, '');
          return `<tr><td><a href="#" data-man="${esc(name)}">${esc(name)}</a>(${e.sec})</td><td>${esc(e.d)}</td><td>${(objOf[name] || []).map((x) => `<a href="#/obj/${x}">${x}</a>`).join(' ')}</td></tr>`;
        })
        .join('');
    };
    $('#cmdFilter').addEventListener('input', draw);
    draw();
  });

  /* =================== search =================== */
  let index = null;
  function buildIndex() {
    index = [];
    for (const o of LPIC.sorted()) {
      index.push({ href: `#/obj/${o.id}`, title: `${o.id} ${o.title}`, text: `${o.desc} ${o.knowledge.join(' ')} ${o.terms.join(' ')}`, boost: 3 });
      const parts = (o.wiki || '').split(/\n\s*(?=## )/);
      for (const part of parts) {
        const hm = /^\s*## (.*)/.exec(part);
        const title = hm ? hm[1].replace(/\{\{|\}\}/g, '') : o.title;
        index.push({ href: `#/obj/${o.id}`, anchor: hm ? 'w-' + MD.slug(hm[1]) : null, title: `${o.id} › ${title}`, text: MD.plain(part), boost: 1 });
      }
      for (const q of o.quiz) index.push({ href: `#/obj/${o.id}/quiz`, title: `Question (${o.id})`, text: MD.plain(q.q + ' ' + (q.e || '')), boost: 0.5 });
    }
    for (const [k, e] of Object.entries(SIM.man)) index.push({ man: k.replace(/\.\d$/, ''), title: `man ${k.replace(/\.\d$/, '')}(${e.sec})`, text: `${k} ${e.d} ${e.s} ${e.o.join(' ')}`, boost: 2 });
    for (const s of Object.values(SIMS.registry)) index.push({ href: `#/sim/${s.id}`, title: `Simulation: ${s.title}`, text: s.desc, boost: 2 });
  }
  route(/^\/search$/, (m, params) => {
    const q = (params.get('q') || '').trim();
    $('#searchInput').value = q;
    if (!index) buildIndex();
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = [];
    for (const e of index) {
      const tl = e.title.toLowerCase();
      const xl = e.text.toLowerCase();
      let score = 0;
      let all = true;
      for (const t of terms) {
        const inT = tl.includes(t);
        const c = xl.split(t).length - 1;
        if (!inT && !c) all = false;
        score += (inT ? 6 : 0) + Math.min(c, 8);
      }
      if (all && score) hits.push({ e, score: score * e.boost });
    }
    hits.sort((a, b) => b.score - a.score);
    const snip = (text) => {
      const l = text.toLowerCase();
      const i = Math.max(0, l.indexOf(terms[0]) - 80);
      let s = esc(text.slice(i, i + 260));
      for (const t of terms) s = s.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
      return (i > 0 ? '… ' : '') + s + ' …';
    };
    view.innerHTML = `<h1>Search: “${esc(q)}”</h1><p class="muted">${hits.length} results</p>${hits
      .slice(0, 60)
      .map(({ e }) => `<div class="search-hit"><div class="t">${e.man ? `<a href="#" data-man="${esc(e.man)}">${esc(e.title)}</a>` : `<a href="${e.href}" ${e.anchor ? `data-goto="${e.anchor}"` : ''}>${esc(e.title)}</a>`}</div><div class="s">${snip(e.text)}</div></div>`)
      .join('')}`;
    $$('[data-goto]').forEach((a) =>
      a.addEventListener('click', () => {
        const id = a.dataset.goto;
        setTimeout(() => {
          const t = document.getElementById(id);
          if (t) t.scrollIntoView({ block: 'start' });
        }, 80);
      })
    );
  });

  /* =================== settings =================== */
  route(/^\/settings$/, () => {
    const used = (() => {
      try {
        return Math.round((JSON.stringify(Store.data).length + JSON.stringify(Store.sandbox || {}).length) / 1024);
      } catch (e) {
        return 0;
      }
    })();
    view.innerHTML = `<h1>⚙️ Settings & backup</h1>
      <div class="card" style="max-width:720px"><h3 style="margin-top:0">Storage</h3><p>${Store.server ? '✅ Connected to the LPIC-1 Trainer server — progress and sandbox are stored in its <b>SQLite database</b> (Docker volume <code>lpic1-data</code>) and cached in this browser.' : 'ℹ️ No server detected — progress is stored in this browser only (localStorage). Start the Docker container (see README) to keep it in a persistent database.'}</p><p class="muted">Approx. ${used} KB of data.</p>
      <h3>Theme</h3><div class="row"><select class="inp" id="setTheme"><option value="auto">follow system</option><option value="dark">dark</option><option value="light">light</option></select></div>
      <h3>Layout</h3><label class="row" style="gap:.5rem;cursor:pointer"><input type="checkbox" id="setFocus"> <span><b>Step-by-step reading</b>: show one section of a wiki page at a time (recommended — less text at once).</span></label>
      <h3>Calm mode</h3><label class="row" style="gap:.5rem;cursor:pointer"><input type="checkbox" id="setZen"> <span><b>Calm mode</b>: hide the sidebar, search and all extras — only what you are working on stays. Toggle anytime with the <kbd>Z</kbd> key or the “Calm” button in the top bar.</span></label>
      <h3>Language</h3><label class="row" style="gap:.5rem;cursor:pointer"><input type="checkbox" id="setDe"> <span>Show <b>German explanations</b> for questions and a <b>German summary</b> on every objective page (Deutsche Erklärungen und Kurzfassungen anzeigen). Questions stay in English like in the exam.</span></label>
      <h3>Backup</h3><div class="row"><button class="btn" id="exp">⬇ Export progress (JSON)</button><label class="btn">⬆ Import<input type="file" id="imp" accept="application/json" hidden></label></div>
      <h3>Reset</h3><div class="row"><button class="btn btn-danger" id="rstSandbox">Reset sandbox filesystem</button><button class="btn btn-danger" id="rstAll">Reset all progress</button></div></div>
      <div class="card" style="max-width:720px;margin-top:1rem"><h3 style="margin-top:0">Keyboard shortcuts</h3><table><tr><td><kbd>/</kbd></td><td>search</td></tr><tr><td><kbd>Ctrl</kbd>+<kbd>\`</kbd> or <kbd>Alt</kbd>+<kbd>T</kbd></td><td>toggle the sandbox terminal</td></tr><tr><td><kbd>1</kbd>–<kbd>5</kbd> / <kbd>A</kbd>–<kbd>E</kbd>, <kbd>Enter</kbd></td><td>answer / check / next in quizzes</td></tr><tr><td><kbd>Space</kbd>, <kbd>←</kbd>/<kbd>→</kbd></td><td>flip / rate flashcards</td></tr><tr><td><kbd>Tab</kbd>, <kbd>↑</kbd>/<kbd>↓</kbd>, <kbd>Ctrl</kbd>+<kbd>R</kbd>, <kbd>Ctrl</kbd>+<kbd>L</kbd>, <kbd>Ctrl</kbd>+<kbd>C</kbd></td><td>terminal: completion, history, reverse search, clear, cancel</td></tr></table></div>`;
    $('#setTheme').value = Store.data.settings.theme || 'auto';
    $('#setZen').checked = zenOn();
    $('#setZen').onchange = (e) => setZen(e.target.checked);
    $('#setFocus').checked = focusOn();
    $('#setFocus').onchange = (e) => Store.setSetting('focus', e.target.checked);
    $('#setDe').checked = deOn();
    $('#setDe').onchange = (e) => {
      Store.setSetting('de', e.target.checked);
      toast(e.target.checked ? 'Deutsche Erklärungen an' : 'German explanations off');
    };
    $('#setTheme').onchange = (e) => {
      Store.setSetting('theme', e.target.value);
      applyTheme();
    };
    $('#exp').onclick = () => {
      const blob = new Blob([Store.export()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lpic1-progress-${Store.today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $('#imp').onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      f.text().then((t) => {
        try {
          Store.import(t);
          term = null;
          $('#drawerTerm').innerHTML = '';
          toast('Progress imported');
          render();
        } catch (err) {
          toast('Import failed: ' + err.message, 4000);
        }
      });
    };
    $('#rstSandbox').onclick = () => {
      if (!confirm('Reset the sandbox filesystem to its factory state?')) return;
      Store.resetSandbox();
      term = null;
      $('#drawerTerm').innerHTML = '';
      toast('Sandbox reset');
    };
    $('#rstAll').onclick = () => {
      if (!confirm('Delete ALL progress (answers, studied objectives, labs, exam history, notes)? This cannot be undone.')) return;
      Store.reset();
      toast('Progress reset');
      render();
    };
  });

  /* =================== boot =================== */
  Store.onChange(syncBadge);
  Store.init().then(() => {
    applyTheme();
    applyZen();
    syncBadge();
    render();
  });
})();
