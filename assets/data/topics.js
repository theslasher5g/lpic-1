/* LPIC-1 v5.0 structure (exams 101-500 and 102-500). */
(function (G) {
  'use strict';
  const LPIC = (G.LPIC = {
    exams: [
      { id: '101', code: '101-500', title: 'Exam 101', subtitle: 'System Architecture · Installation & Packages · GNU/Unix Commands · Filesystems', topics: ['101', '102', '103', '104'] },
      { id: '102', code: '102-500', title: 'Exam 102', subtitle: 'Shells & Scripting · Interfaces · Administration · Services · Networking · Security', topics: ['105', '106', '107', '108', '109', '110'] },
    ],
    topics: {
      101: { title: 'System Architecture', icon: '🖥️' },
      102: { title: 'Linux Installation and Package Management', icon: '📦' },
      103: { title: 'GNU and Unix Commands', icon: '⌨️' },
      104: { title: 'Devices, Linux Filesystems, Filesystem Hierarchy Standard', icon: '🗂️' },
      105: { title: 'Shells and Shell Scripting', icon: '🐚' },
      106: { title: 'User Interfaces and Desktops', icon: '🪟' },
      107: { title: 'Administrative Tasks', icon: '👥' },
      108: { title: 'Essential System Services', icon: '⚙️' },
      109: { title: 'Networking Fundamentals', icon: '🌐' },
      110: { title: 'Security', icon: '🔐' },
    },
    objectives: [],
    byId: {},
    labs: {},
    add(o) {
      o.topic = o.id.split('.')[0];
      o.exam = +o.topic <= 104 ? '101' : '102';
      o.quiz = (o.quiz || []).map((q, i) => Object.assign({ id: o.id + '#' + i, obj: o.id }, q));
      this.objectives.push(o);
      this.byId[o.id] = o;
    },
    // extra question sets (assets/data/q1xx.js) continue the numbering of an objective
    addQuiz(id, qs) {
      const o = this.byId[id];
      if (!o) throw new Error('unknown objective ' + id);
      const start = o.quiz.length;
      qs.forEach((q, i) => o.quiz.push(Object.assign({ id: id + '#' + (start + i), obj: id }, q)));
    },
    // German explanations ({ 'obj#n': text }) and German summaries per objective
    deSummary: {},
    addDe(map) {
      for (const [qid, text] of Object.entries(map)) {
        const [oid, n] = qid.split('#');
        const q = this.byId[oid] && this.byId[oid].quiz[+n];
        if (!q) throw new Error('unknown question ' + qid);
        q.de = text;
      }
    },
    addSummaryDe(map) {
      Object.assign(this.deSummary, map);
    },
    sorted() {
      const k = (id) => id.split('.').map((x) => x.padStart(3, '0')).join('.');
      return this.objectives.slice().sort((a, b) => (k(a.id) < k(b.id) ? -1 : 1));
    },
    ofTopic(t) {
      return this.sorted().filter((o) => o.topic === String(t));
    },
    ofExam(e) {
      return this.sorted().filter((o) => o.exam === String(e));
    },
    allQuestions() {
      return this.sorted().flatMap((o) => o.quiz);
    },
  });
})(window);
