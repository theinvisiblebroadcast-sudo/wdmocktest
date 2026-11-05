/* ═══════════════════════════════════════════════════════════
   Workday Pro Mock Exam Studio — Application Logic
   ═══════════════════════════════════════════════════════════ */
'use strict';

const DATA = window.WD_DATA || { 'pro-hcm': [], 'hcm-data-loading': [] };

/* ───────────────────────── Exam meta ───────────────────────── */
const EXAMS = {
  'pro-hcm': {
    id: 'pro-hcm',
    name: 'Pro HCM Services',
    short: 'Pro HCM',
    title: 'Workday Pro: Human Capital Management Core Services',
    desc: 'Supervisory organizations, staffing models, job profiles, security framework, business processes, compensation and reporting — the full Pro HCM Services scope.',
    tag: 'HCM Core Services',
    iconClass: 'icon-hcm',
    accent: '#0b5cad',
  },
  'hcm-data-loading': {
    id: 'hcm-data-loading',
    name: 'HCM Data Loading Services',
    short: 'HCM Data Loading',
    title: 'Workday Pro: HCM Data Loading Services',
    desc: 'Foundation tenants, Advanced Load, iLoad, EIBs, implementation suites, reference IDs, WDSetup, configuration catalogs and migration tooling.',
    tag: 'Data Loading & Migration',
    iconClass: 'icon-dl',
    accent: '#0e9f8a',
  },
};
const EXAM_IDS = Object.keys(EXAMS);
const TIME_LIMIT_SECONDS = 2 * 60 * 60; // 2 hours per exam
const MAX_QUESTIONS = 55;
const MIN_QUESTIONS = 1;
const PASS_MARK = 70; // %

/* ───────────────────────── Storage ───────────────────────── */
const LS = {
  history: (exam) => `wdmock.history.${exam}`,
  inProgress: 'wdmock.inprogress',
};
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  remove(key) { try { localStorage.removeItem(key); } catch {} },
};
function getHistory(exam) { return store.get(LS.history(exam)) || []; }
function pushHistory(exam, entry) {
  const list = [entry, ...getHistory(exam)].slice(0, 25);
  store.set(LS.history(exam), list);
}
function clearHistory(exam) { store.remove(LS.history(exam)); }

/* ───────────────────────── Helpers ───────────────────────── */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
};
const fmtDate = (iso) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const bankFor = (exam) => DATA[exam] || [];
const byId = (exam, id) => bankFor(exam).find(q => q.id === id);
const examStats = (exam) => {
  const bank = bankFor(exam);
  return {
    total: bank.length,
    multi: bank.filter(q => q.multi).length,
    repeated: bank.filter(q => q.repeatCount >= 2).length,
    explained: bank.filter(q => q.explanation).length,
  };
};

const ICON = {
  arrowRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  chevronRight: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  list: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none"/></svg>',
  flame: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3s5 4.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 1-3.5s.5 1.5 2 1.5c0-3-1-8 2-8Z"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  flag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/></svg>',
  book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5V5.5"/></svg>',
  shield: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6.5v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10v-5L12 3Z"/><path d="m9.5 12 2 2 3.5-4"/></svg>',
  database: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
  info: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  alert: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4M12 17h.01"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg>',
  target: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  zap: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
  award: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="m8.8 14-1.6 8 4.8-2.6L16.8 22l-1.6-8"/></svg>',
};

/* ───────────────────────── Modal & Toast ───────────────────────── */
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalStats = document.getElementById('modalStats');
const modalActions = document.getElementById('modalActions');
const modalIcon = document.getElementById('modalIcon');
let modalCleanup = null;

function showModal({ title, text, stats, icon = 'info', actions }) {
  modalTitle.textContent = title;
  modalText.innerHTML = text || '';
  if (stats && stats.length) {
    modalStats.hidden = false;
    modalStats.innerHTML = stats.map(s => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('');
  } else {
    modalStats.hidden = true;
    modalStats.innerHTML = '';
  }
  modalIcon.className = 'modal-icon' + (icon === 'danger' ? ' danger' : icon === 'info' ? ' info' : '');
  modalIcon.innerHTML = icon === 'danger' ? ICON.alert : icon === 'warn' ? ICON.alert : ICON.info;
  modalActions.innerHTML = '';
  const cleanupFns = [];
  (actions || [{ label: 'Close', kind: 'btn-ghost' }]).forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.kind || 'btn-ghost');
    b.innerHTML = esc(a.label);
    b.addEventListener('click', () => { if (a.onClick) a.onClick(); if (a.close !== false) hideModal(); });
    modalActions.appendChild(b);
  });
  modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  const onEsc = (e) => { if (e.key === 'Escape') hideModal(); };
  document.addEventListener('keydown', onEsc);
  cleanupFns.push(() => document.removeEventListener('keydown', onEsc));
  modalCleanup = () => cleanupFns.forEach(f => f());
  const firstBtn = modalActions.querySelector('button');
  if (firstBtn) firstBtn.focus();
}
function hideModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = '';
  if (modalCleanup) { modalCleanup(); modalCleanup = null; }
}
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) hideModal(); });

const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
}

/* ═══════════════════════════════════════════════════════════
   VIEWS
   ═══════════════════════════════════════════════════════════ */
const app = document.getElementById('app');
let lastResult = null; // holds the most recent graded exam for the result view
let testTimer = null;

const setTakingTest = (on) => document.body.classList.toggle('taking-test', !!on);

function examCardHTML(exam) {
  const e = EXAMS[exam];
  const s = examStats(exam);
  const icon = exam === 'pro-hcm' ? ICON.shield : ICON.database;
  return `
  <article class="card exam-card">
    <div class="exam-card-top">
      <div class="exam-icon ${e.iconClass}" aria-hidden="true">${icon}</div>
      <span class="chip chip-blue">${esc(e.tag)}</span>
    </div>
    <h3>${esc(e.name)}</h3>
    <div class="exam-tag"><span class="chip chip-gray">${esc(e.title)}</span></div>
    <p class="desc">${esc(e.desc)}</p>
    <div class="exam-meta">
      <div><b>${s.total}</b><span>Practice Qs</span></div>
      <div><b>${s.repeated}</b><span>Repeated</span></div>
      <div><b>2h</b><span>Time Limit</span></div>
    </div>
    <div class="exam-actions">
      <a class="btn btn-ghost" href="#/exam/${exam}/repeated">${ICON.flame} Most Repeated</a>
      <a class="btn btn-primary" href="#/exam/${exam}/setup">${ICON.zap} Take Mock Test</a>
    </div>
  </article>`;
}

/* ── Home ── */
function viewHome() {
  setTakingTest(false);
  const pro = examStats('pro-hcm');
  const dl = examStats('hcm-data-loading');
  const totalQ = pro.total + dl.total;
  const sample = bankFor('pro-hcm').find(q => q.repeatCount >= 2) || bankFor('pro-hcm')[0];

  app.innerHTML = `
  <section class="hero">
    <div class="hero-grid-bg" aria-hidden="true"></div>
    <div class="hero-inner">
      <div>
        <span class="hero-eyebrow">Workday Pro Certification Prep</span>
        <h1>Pass your <em>Workday Pro</em> exams with confidence.</h1>
        <p class="lede">Timed, exam-style mock tests for <strong>HCM Core Services</strong> and <strong>HCM Data Loading Services</strong> — built from consolidated real-world question banks, with instant scoring and full answer review.</p>
        <div class="hero-ctas">
          <a class="btn btn-accent btn-lg" href="#/mock">${ICON.zap} Start a Mock Test ${ICON.arrowRight}</a>
          <a class="btn btn-light btn-lg" href="#/repeated">${ICON.flame} Most Repeated Questions</a>
        </div>
        <div class="hero-badges">
          <div class="hstat"><b>${totalQ}</b><span>Total Questions</span></div>
          <div class="hstat"><b>${pro.total}</b><span>Pro HCM Services</span></div>
          <div class="hstat"><b>${dl.total}</b><span>HCM Data Loading</span></div>
          <div class="hstat"><b>2:00:00</b><span>Per Timed Test</span></div>
        </div>
      </div>
      <aside class="hero-card" aria-hidden="true">
        <div class="hero-card-head"><span>Sample · Most Repeated</span><b>${esc(sample.source.split(' (')[0])}</b></div>
        <div class="mini-q">
          <p>${esc(sample.question)}</p>
          <div class="mini-opts">
            ${sample.options.map((o, i) => `<div class="mini-opt${sample.answers.includes(i) ? ' is-correct' : ''}"><span class="dot">${sample.answers.includes(i) ? '✓' : ''}</span>${esc(o)}</div>`).join('')}
          </div>
        </div>
        <div class="mini-q" style="margin-bottom:0">
          <p style="color:#8fd0c4">Answers stay hidden until you submit — just like the real exam.</p>
          <div class="mini-opts">
            <div class="mini-opt"><span class="dot">1</span>Set your question count (1–55)</div>
            <div class="mini-opt"><span class="dot">2</span>Race the 2-hour timer</div>
            <div class="mini-opt"><span class="dot">3</span>Review every answer after submitting</div>
          </div>
        </div>
      </aside>
    </div>
  </section>

  <section class="container page">
    <span class="eyebrow">Choose Your Exam</span>
    <h2 class="section-title">Two Workday Pro tracks, one studio</h2>
    <p class="section-sub">Each exam offers the same two study modes: a curated <strong>Most Repeated</strong> drill drawn from cross-bank frequency analysis, and a randomized, timed <strong>Mock Test</strong> graded like the real thing.</p>
    <div class="exam-grid">
      ${examCardHTML('pro-hcm')}
      ${examCardHTML('hcm-data-loading')}
    </div>
  </section>
  <section class="container" style="padding-bottom:56px">
    <div class="card" style="padding:26px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
      <div style="display:flex;gap:13px;align-items:flex-start">
        <div class="so-icon so-repeated" style="width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ICON.flame}</div>
        <div><b style="color:var(--navy-900);font-size:14px">Ranked by frequency</b><p style="color:var(--text-muted);font-size:12.5px;margin-top:3px">Questions appearing across multiple source banks are surfaced first — the ones most likely to show up on exam day.</p></div>
      </div>
      <div style="display:flex;gap:13px;align-items:flex-start">
        <div class="so-icon so-test" style="width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ICON.clock}</div>
        <div><b style="color:var(--navy-900);font-size:14px">Strictly time-boxed</b><p style="color:var(--text-muted);font-size:12.5px;margin-top:3px">Two full hours per attempt. Answers stay hidden until you submit, and the test auto-submits when the clock runs out.</p></div>
      </div>
      <div style="display:flex;gap:13px;align-items:flex-start">
        <div class="so-icon" style="width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--success-soft);color:var(--success)">${ICON.award}</div>
        <div><b style="color:var(--navy-900);font-size:14px">Graded &amp; explained</b><p style="color:var(--text-muted);font-size:12.5px;margin-top:3px">Instant scoring, question-by-question review with correct answers, your picks, and source-grounded explanations.</p></div>
      </div>
    </div>
  </section>`;
  setActiveNav('/');
}

/* ── Mock exam select (two exams) ── */
function viewMock() {
  setTakingTest(false);
  app.innerHTML = `
  <section class="container page">
    <span class="eyebrow">Mock Exams</span>
    <h1 class="section-title">Select your Workday Pro exam</h1>
    <p class="section-sub">Pick a track to study its most repeated questions or launch a full timed mock test. Each attempt pulls a fresh randomized set from the bank.</p>
    <div class="select-grid">
      ${EXAM_IDS.map((exam, i) => {
        const e = EXAMS[exam];
        const s = examStats(exam);
        const icon = exam === 'pro-hcm' ? ICON.shield : ICON.database;
        return `
        <article class="card select-card" data-num="0${i + 1}">
          <div class="exam-icon ${e.iconClass}" style="width:60px;height:60px" aria-hidden="true">${icon}</div>
          <h3>${esc(e.name)}</h3>
          <p class="desc" style="color:var(--text-muted);font-size:13.5px">${esc(e.desc)}</p>
          <div class="exam-meta" style="margin:16px 0 0">
            <div><b>${s.total}</b><span>Questions</span></div>
            <div><b>${s.repeated}</b><span>Repeated</span></div>
            <div><b>${s.multi}</b><span>Multi-select</span></div>
          </div>
          <div class="select-cta">
            <a class="select-option" href="#/exam/${exam}/repeated">
              <span class="so-icon so-repeated">${ICON.flame}</span>
              <span><b>Most Repeated Questions</b><span>Study the high-frequency set with answers &amp; explanations</span></span>
              <span class="arrow" style="margin-left:auto">${ICON.chevronRight}</span>
            </a>
            <a class="select-option" href="#/exam/${exam}/setup">
              <span class="so-icon so-test">${ICON.clock}</span>
              <span><b>Take Mock Test</b><span>2 hours · 1–55 questions · answers revealed after submit</span></span>
              <span class="arrow" style="margin-left:auto">${ICON.chevronRight}</span>
            </a>
          </div>
        </article>`;
      }).join('')}
    </div>
  </section>`;
  setActiveNav('/mock');
}

/* ── Exam hub ── */
function viewExamHub(exam) {
  setTakingTest(false);
  const e = EXAMS[exam];
  const s = examStats(exam);
  const history = getHistory(exam);
  const icon = exam === 'pro-hcm' ? ICON.shield : ICON.database;
  app.innerHTML = `
  <section class="container page">
    <span class="eyebrow">${esc(e.tag)}</span>
    <h1 class="section-title">${esc(e.name)}</h1>
    <p class="section-sub">${esc(e.desc)}</p>
    <div class="hub-grid">
      <div class="card hub-panel">
        <h2>How would you like to study?</h2>
        <p class="sub">Two modes — same gold-standard question bank.</p>
        <div class="hub-options">
          <a class="hub-option" href="#/exam/${exam}/repeated">
            <span class="so-icon so-repeated" style="width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ICON.flame}</span>
            <span>
              <h4>Most Repeated Questions</h4>
              <p>Browse the ${s.repeated} high-frequency questions with correct answers, explanations and source banks — perfect for focused revision.</p>
            </span>
            <span class="arrow">${ICON.chevronRight}</span>
          </a>
          <a class="hub-option" href="#/exam/${exam}/setup">
            <span class="so-icon so-test" style="width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ICON.clock}</span>
            <span>
              <h4>Take Mock Test</h4>
              <p>Timed 2-hour exam · choose 1–55 questions · no answers until you submit · instant grading with per-question review.</p>
            </span>
            <span class="arrow">${ICON.chevronRight}</span>
          </a>
        </div>
        <div style="margin-top:18px">
          <a href="#/mock" class="link-btn">← Back to exam selection</a>
        </div>
      </div>
      <div class="card hub-panel">
        <h2>Bank overview</h2>
        <p class="sub">Question bank statistics for this track</p>
        <div class="stat-list">
          <div class="stat-row"><span>Total practice questions</span><b>${s.total}</b></div>
          <div class="stat-row"><span>Multi-select questions</span><b>${s.multi}</b></div>
          <div class="stat-row"><span>Questions seen in 2+ source banks</span><b>${s.repeated}</b></div>
          <div class="stat-row"><span>Questions with explanations</span><b>${s.explained}</b></div>
          <div class="stat-row"><span>Time limit per mock test</span><b>2 hours</b></div>
          <div class="stat-row"><span>Maximum questions per attempt</span><b>${MAX_QUESTIONS}</b></div>
          <div class="stat-row"><span>Pass mark</span><b>${PASS_MARK}%</b></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px">
          <h2 style="margin:0">Your recent attempts</h2>
          ${history.length ? `<button class="link-btn" id="clearHistoryBtn">Clear history</button>` : ''}
        </div>
        <div class="history-list">
          ${history.length ? history.slice(0, 6).map(h => `
            <div class="history-item">
              <div class="score ${h.pct >= PASS_MARK ? 'pass' : 'fail'}">${h.pct}%</div>
              <div><b>${h.score} / ${h.total} correct</b><small>${fmtDate(h.date)} · ${h.count} questions</small></div>
            </div>`).join('') : '<div class="empty-note">No attempts yet — take your first mock test.</div>'}
        </div>
      </div>
    </div>
  </section>`;
  const clearBtn = document.getElementById('clearHistoryBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    showModal({
      title: 'Clear attempt history?',
      text: 'This removes all saved scores for this exam from this browser. This cannot be undone.',
      icon: 'danger',
      actions: [
        { label: 'Cancel', kind: 'btn-ghost' },
        { label: 'Clear history', kind: 'btn-danger', onClick: () => { clearHistory(exam); viewExamHub(exam); toast('Attempt history cleared.'); } },
      ],
    });
  });
  setActiveNav('/mock');
}

/* ── Most Repeated Questions ── */
const REPEAT_BATCH = 15;
let repeatState = { exam: 'all', query: '', shown: REPEAT_BATCH };

function repeatPool(examFilter) {
  let pool = [];
  EXAM_IDS.forEach(id => {
    if (examFilter !== 'all' && examFilter !== id) return;
    pool = pool.concat(bankFor(id).map(q => ({ ...q, examId: id })));
  });
  return pool
    .filter(q => q.repeatCount >= 2)
    .sort((a, b) => b.repeatCount - a.repeatCount || b.sources.length - a.sources.length || a.question.localeCompare(b.question));
}

function repeatItemHTML(q, rank) {
  const letters = 'ABCDEFGH';
  const examLabel = q.examId === 'pro-hcm' ? 'Pro HCM' : 'Data Loading';
  return `
  <article class="card repeat-item">
    <div class="repeat-head">
      <div class="repeat-rank">#${rank}</div>
      <div class="q-title">${esc(q.question)}${q.multi ? ' <span class="q-multi-note">Select all that apply</span>' : ''}</div>
      <div class="repeat-badges">
        <span class="chip chip-amber" title="Found in ${q.repeatCount} independent source banks">${ICON.flame.replace('width="18" height="18"','width="12" height="12"')} ${q.repeatCount}× repeated</span>
        <span class="chip chip-gray">${examLabel}</span>
      </div>
    </div>
    <div class="repeat-opts">
      ${q.options.map((o, i) => `<div class="repeat-opt${q.answers.includes(i) ? ' correct' : ''}"><span class="key">${letters[i]}.</span><span>${esc(o)}</span></div>`).join('')}
    </div>
    <div class="repeat-srcs"><b>Source banks (${q.sources.length}):</b> ${esc(q.sources.join(' · '))}</div>
  </article>`;
}

function viewRepeated(examParam) {
  setTakingTest(false);
  const examFilter = examParam && EXAMS[examParam] ? examParam : 'all';
  repeatState = { exam: examFilter, query: '', shown: REPEAT_BATCH };
  const title = examFilter === 'all' ? 'Most Repeated Questions' : `Most Repeated · ${EXAMS[examFilter].name}`;

  app.innerHTML = `
  <section class="container page">
    <span class="eyebrow">High-Frequency Drill</span>
    <h1 class="section-title">${esc(title)}</h1>
    <p class="section-sub">Ranked by how many independent source banks contain each question. Correct answers are highlighted — use this as a focused revision pass before your mock test.</p>

    <div class="toolbar">
      <div class="seg" role="tablist" aria-label="Filter by exam">
        <button role="tab" data-exam="all" class="${examFilter === 'all' ? 'active' : ''}">All Exams</button>
        <button role="tab" data-exam="pro-hcm" class="${examFilter === 'pro-hcm' ? 'active' : ''}">Pro HCM Services</button>
        <button role="tab" data-exam="hcm-data-loading" class="${examFilter === 'hcm-data-loading' ? 'active' : ''}">HCM Data Loading</button>
      </div>
      <div class="search-box">
        ${ICON.search}
        <input type="text" id="repeatSearch" placeholder="Search questions or keywords…" aria-label="Search repeated questions">
      </div>
    </div>

    <div class="repeat-list" id="repeatList"></div>
    <div class="show-more-wrap"><button class="btn btn-ghost" id="showMoreBtn">Show more questions</button></div>
    <p class="section-sub" id="repeatEmpty" hidden style="margin-top:20px;text-align:center">No questions match that filter.</p>
  </section>`;

  const listEl = document.getElementById('repeatList');
  const showMoreBtn = document.getElementById('showMoreBtn');
  const emptyEl = document.getElementById('repeatEmpty');
  const searchInput = document.getElementById('repeatSearch');

  function render() {
    const q = repeatState.query.trim().toLowerCase();
    let pool = repeatPool(repeatState.exam);
    if (q) pool = pool.filter(item => item.question.toLowerCase().includes(q) || item.options.some(o => o.toLowerCase().includes(q)));
    const slice = pool.slice(0, repeatState.shown);
    listEl.innerHTML = slice.map((item, i) => repeatItemHTML(item, i + 1)).join('');
    showMoreBtn.style.display = pool.length > repeatState.shown ? '' : 'none';
    emptyEl.hidden = pool.length !== 0;
  }

  els('.seg button', app).forEach(btn => btn.addEventListener('click', () => {
    repeatState.exam = btn.dataset.exam;
    repeatState.shown = REPEAT_BATCH;
    els('.seg button', app).forEach(b => b.classList.toggle('active', b === btn));
    render();
  }));
  searchInput.addEventListener('input', () => { repeatState.query = searchInput.value; repeatState.shown = REPEAT_BATCH; render(); });
  showMoreBtn.addEventListener('click', () => { repeatState.shown += REPEAT_BATCH; render(); });

  render();
  setActiveNav('/repeated');
}

/* ── Mock test setup (choose 1–55 questions) ── */
function viewSetup(exam) {
  setTakingTest(false);
  const e = EXAMS[exam];
  const s = examStats(exam);
  const cap = Math.min(MAX_QUESTIONS, s.total);
  const inProg = store.get(LS.inProgress);
  const resumable = inProg && inProg.exam === exam;

  app.innerHTML = `
  <section class="container page setup-wrap">
    <span class="eyebrow">${esc(e.tag)} · Mock Test</span>
    <h1 class="section-title">Configure your ${esc(e.short)} attempt</h1>
    <p class="section-sub">Choose how many questions you want to attempt. The full test allows up to ${MAX_QUESTIONS} questions within a 2-hour window — answers remain hidden until you submit.</p>

    <div class="card setup-card">
      <div class="count-display">
        <span class="num" id="countNum">${cap}</span>
        <span class="of">/ ${MAX_QUESTIONS}<br>questions</span>
      </div>
      <div class="stepper" aria-label="Question count stepper">
        <button id="decBtn" aria-label="Decrease question count">−</button>
        <input type="number" id="countInput" min="${MIN_QUESTIONS}" max="${cap}" value="${cap}" inputmode="numeric" aria-label="Number of questions">
        <button id="incBtn" aria-label="Increase question count">+</button>
      </div>
      <div class="range-row">
        <span class="range-end">${MIN_QUESTIONS}</span>
        <input type="range" id="countRange" min="${MIN_QUESTIONS}" max="${cap}" value="${cap}" aria-label="Question count slider">
        <span class="range-end">${cap}</span>
      </div>
      <div class="quick-chips" id="quickChips">
        ${[10, 25, 40, 55].filter(n => n <= cap).map(n => `<button data-n="${n}" class="${n === cap ? 'active' : ''}">${n} questions</button>`).join('')}
        <button data-n="${cap}" class="${cap !== 10 && cap !== 25 && cap !== 40 && cap !== 55 ? 'active' : ''}">Max (${cap})</button>
      </div>
      <p class="field-error" id="countError">Enter a number between ${MIN_QUESTIONS} and ${cap}.</p>

      <div class="setup-info">
        <div class="info-cell">${ICON.clock}<span></span><div><b>2 hours</b><span>Hard time limit · auto-submits at 00:00:00</span></div></div>
        <div class="info-cell">${ICON.shield}<span></span><div><b>Hidden answers</b><span>No feedback until you submit — exam conditions</span></div></div>
        <div class="info-cell">${ICON.award}<span></span><div><b>Pass at ${PASS_MARK}%</b><span>Detailed review of every question after submit</span></div></div>
      </div>

      <div class="setup-rules">
        <strong>Before you begin</strong>
        <ul>
          <li>Questions and options are randomized on every attempt — memorizing positions won't help you.</li>
          <li>Multi-select questions require <em>all</em> correct options to be chosen for credit.</li>
          <li>Use “Mark for review” to flag questions and jump back to them any time.</li>
          <li>Your progress is saved locally; you can resume an interrupted attempt.</li>
        </ul>
      </div>

      <div class="setup-actions">
        <a class="btn btn-ghost" href="#/exam/${exam}">← Back</a>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${resumable ? `<button class="btn btn-ghost" id="discardResumeBtn">Discard saved attempt</button>` : ''}
          <button class="btn btn-primary btn-lg" id="startTestBtn">${ICON.zap} ${resumable ? 'Resume Saved Test' : 'Start Mock Test'} ${ICON.arrowRight}</button>
        </div>
      </div>
    </div>
  </section>`;

  const input = document.getElementById('countInput');
  const range = document.getElementById('countRange');
  const num = document.getElementById('countNum');
  const error = document.getElementById('countError');
  const chips = els('#quickChips button');
  const clampVal = (v) => Math.max(MIN_QUESTIONS, Math.min(cap, isNaN(v) ? MIN_QUESTIONS : Math.round(v)));
  const sync = (v, source) => {
    const c = clampVal(v);
    num.textContent = c;
    if (source !== input) input.value = c;
    if (source !== range) range.value = c;
    chips.forEach(ch => ch.classList.toggle('active', Number(ch.dataset.n) === c));
    error.style.display = 'none';
    return c;
  };
  input.addEventListener('input', () => { const v = Number(input.value); if (!isNaN(v) && v >= MIN_QUESTIONS && v <= cap) sync(v, input); });
  input.addEventListener('change', () => { input.value = sync(Number(input.value), input); });
  range.addEventListener('input', () => sync(Number(range.value), range));
  document.getElementById('decBtn').addEventListener('click', () => sync(Number(input.value || MIN_QUESTIONS) - 1));
  document.getElementById('incBtn').addEventListener('click', () => sync(Number(input.value || MIN_QUESTIONS) + 1));
  chips.forEach(ch => ch.addEventListener('click', () => sync(Number(ch.dataset.n))));

  document.getElementById('startTestBtn').addEventListener('click', () => {
    const v = Number(input.value);
    if (isNaN(v) || v < MIN_QUESTIONS || v > cap) {
      error.style.display = 'block';
      input.focus();
      return;
    }
    if (resumable) {
      resumeTest();
    } else {
      startTest(exam, clampVal(v));
    }
  });
  const discardBtn = document.getElementById('discardResumeBtn');
  if (discardBtn) discardBtn.addEventListener('click', () => {
    store.remove(LS.inProgress);
    viewSetup(exam);
    toast('Saved attempt discarded.');
  });
  setActiveNav('/mock');
}

/* ═══════════ TEST RUNNER ═══════════ */
function persistTest(t) { store.set(LS.inProgress, t); }

function startTest(exam, count) {
  const bank = bankFor(exam);
  const picked = shuffle(bank).slice(0, Math.min(count, bank.length));
  const test = {
    exam,
    questionIds: picked.map(q => q.id),
    // randomize option order per question, keeping correct-index mapping
    optionOrders: Object.fromEntries(picked.map(q => [q.id, shuffle(q.options.map((_, i) => i))])),
    answers: {},
    marks: {},
    current: 0,
    startedAt: Date.now(),
    endTime: Date.now() + TIME_LIMIT_SECONDS * 1000,
  };
  persistTest(test);
  renderTest(test);
}

function resumeTest() {
  const t = store.get(LS.inProgress);
  if (!t) { toast('No saved attempt found.'); return; }
  if (Date.now() >= t.endTime) {
    // time expired while away — grade what exists
    finishTest(t, true);
    return;
  }
  renderTest(t);
  toast('Resumed your saved attempt.');
}

function renderTest(test) {
  setTakingTest(true);
  const e = EXAMS[test.exam];
  const total = test.questionIds.length;
  const answeredCount = () => test.questionIds.filter(id => (test.answers[id] || []).length > 0).length;
  const markedCount = () => test.questionIds.filter(id => test.marks[id]).length;

  app.innerHTML = `
  <div class="test-shell">
    <div class="test-topbar" role="region" aria-label="Exam controls">
      <div class="test-exam-name">${esc(e.title)}</div>
      <div class="timer" id="timerDisplay" aria-live="off" aria-label="Time remaining">${ICON.clock.replace('width="18" height="18"','width="20" height="20"')} <span id="timerText">${fmtTime((test.endTime - Date.now()) / 1000)}</span></div>
      <div class="test-top-actions">
        <span class="chip chip-gray" id="answeredChip" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#dce8f4">0 / ${total} answered</span>
        <button class="btn btn-danger" id="submitTestBtn">${ICON.check} Submit Exam</button>
      </div>
    </div>
    <div class="progress-line" aria-hidden="true"><i id="progressFill"></i></div>

    <div class="test-layout">
      <form class="card q-panel" id="questionPanel" autocomplete="off"></form>

      <aside class="card palette" aria-label="Question navigator">
        <h3>Navigator <span id="markedCount">0 marked</span></h3>
        <div class="palette-grid" id="paletteGrid"></div>
        <div class="pal-legend">
          <div><span class="lg lg-current"></span> Current question</div>
          <div><span class="lg lg-answered"></span> Answered</div>
          <div><span class="lg lg-marked"></span> Marked for review</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="exitTestBtn" style="width:100%;justify-content:center;margin-top:12px">${ICON.x} Exit (progress saved)</button>
      </aside>
    </div>
  </div>`;

  const panel = document.getElementById('questionPanel');
  const paletteGrid = document.getElementById('paletteGrid');
  const timerText = document.getElementById('timerText');
  const timerDisplay = document.getElementById('timerDisplay');
  const progressFill = document.getElementById('progressFill');
  const answeredChip = document.getElementById('answeredChip');
  const markedCountEl = document.getElementById('markedCount');

  function currentQuestion() { return byId(test.exam, test.questionIds[test.current]); }

  function updateChrome() {
    const answered = answeredCount();
    answeredChip.textContent = `${answered} / ${total} answered`;
    markedCountEl.textContent = `${markedCount()} marked`;
    progressFill.style.width = `${(answered / total) * 100}%`;
    els('.pal-btn', paletteGrid).forEach((btn, i) => {
      const id = test.questionIds[i];
      btn.classList.toggle('current', i === test.current);
      btn.classList.toggle('answered', (test.answers[id] || []).length > 0);
      btn.classList.toggle('marked', !!test.marks[id]);
      btn.setAttribute('aria-current', i === test.current ? 'true' : 'false');
    });
  }

  function renderQuestion() {
    const q = currentQuestion();
    if (!q) { panel.innerHTML = '<p>Question not found.</p>'; return; }
    const order = test.optionOrders[q.id] || q.options.map((_, i) => i);
    const selected = test.answers[q.id] || [];
    const letters = 'ABCDEFGH';
    const marked = !!test.marks[q.id];

    panel.innerHTML = `
      <div class="q-meta">
        <span class="q-count">Question ${test.current + 1} of ${total}</span>
        <span class="chip chip-blue">${q.multi ? 'Multi-select' : 'Single answer'}</span>
        ${q.repeatCount >= 2 ? `<span class="chip chip-amber">High frequency</span>` : ''}
      </div>
      <h2 class="q-text">${esc(q.question)}</h2>
      ${q.multi ? '<p class="q-multi-note" style="display:inline-block;margin-top:8px">Select ALL correct options</p>' : ''}
      <div class="options" role="group" aria-label="Answer options">
        ${order.map((origIdx, displayIdx) => {
          const pressed = selected.includes(origIdx);
          return `<button type="button" class="option${q.multi ? ' multi' : ''}" data-orig="${origIdx}" aria-pressed="${pressed}">
            <span class="marker">${pressed ? '✓' : letters[displayIdx]}</span>
            <span>${esc(q.options[origIdx])}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="q-foot">
        <button type="button" class="mark-toggle${marked ? ' on' : ''}" id="markToggle" aria-pressed="${marked}">${ICON.flag} ${marked ? 'Marked for review' : 'Mark for review'}</button>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button type="button" class="link-btn" id="clearAnswerBtn">Clear selection</button>
          <div class="q-nav">
            <button type="button" class="btn btn-ghost btn-sm" id="prevQBtn" ${test.current === 0 ? 'disabled' : ''}>← Previous</button>
            <button type="button" class="btn btn-primary btn-sm" id="nextQBtn">${test.current === total - 1 ? 'Finish' : 'Next →'}</button>
          </div>
        </div>
      </div>`;

    els('.option', panel).forEach(btn => btn.addEventListener('click', () => {
      const orig = Number(btn.dataset.orig);
      let sel = test.answers[q.id] || [];
      if (q.multi) {
        sel = sel.includes(orig) ? sel.filter(x => x !== orig) : [...sel, orig];
      } else {
        sel = sel.includes(orig) ? [] : [orig];
      }
      test.answers[q.id] = sel;
      persistTest(test);
      // lightweight re-render of pressed state
      els('.option', panel).forEach(b => {
        const o = Number(b.dataset.orig);
        const pressed = sel.includes(o);
        b.setAttribute('aria-pressed', String(pressed));
        b.querySelector('.marker').textContent = pressed ? '✓' : (letters[order.indexOf(o)]);
      });
      updateChrome();
    }));

    document.getElementById('markToggle').addEventListener('click', () => {
      test.marks[q.id] = !test.marks[q.id];
      persistTest(test);
      renderQuestion();
      updateChrome();
    });
    document.getElementById('clearAnswerBtn').addEventListener('click', () => {
      delete test.answers[q.id];
      persistTest(test);
      renderQuestion();
      updateChrome();
    });
    document.getElementById('prevQBtn').addEventListener('click', () => {
      if (test.current > 0) { test.current -= 1; persistTest(test); renderQuestion(); updateChrome(); panel.focus({ preventScroll: true }); }
    });
    document.getElementById('nextQBtn').addEventListener('click', () => {
      if (test.current < total - 1) { test.current += 1; persistTest(test); renderQuestion(); updateChrome(); panel.focus({ preventScroll: true }); }
      else openSubmitModal(test);
    });
    panel.focus({ preventScroll: true });
  }

  function renderPalette() {
    paletteGrid.innerHTML = test.questionIds.map((id, i) =>
      `<button class="pal-btn" data-idx="${i}" aria-label="Go to question ${i + 1}">${i + 1}</button>`
    ).join('');
    els('.pal-btn', paletteGrid).forEach(btn => btn.addEventListener('click', () => {
      test.current = Number(btn.dataset.idx);
      persistTest(test);
      renderQuestion();
      updateChrome();
    }));
  }

  renderPalette();
  renderQuestion();
  updateChrome();

  /* timer */
  clearInterval(testTimer);
  testTimer = setInterval(() => {
    const remain = (test.endTime - Date.now()) / 1000;
    if (remain <= 0) {
      timerText.textContent = '00:00:00';
      clearInterval(testTimer);
      finishTest(test, true);
      return;
    }
    timerText.textContent = fmtTime(remain);
    timerDisplay.classList.toggle('warn', remain <= 15 * 60 && remain > 5 * 60);
    timerDisplay.classList.toggle('danger', remain <= 5 * 60);
  }, 500);

  document.getElementById('submitTestBtn').addEventListener('click', () => openSubmitModal(test));
  document.getElementById('exitTestBtn').addEventListener('click', () => {
    persistTest(test);
    clearInterval(testTimer);
    showModal({
      title: 'Leave the exam?',
      text: 'Your progress and remaining time are saved on this device. You can resume the attempt from the exam setup screen.',
      icon: 'info',
      actions: [
        { label: 'Keep testing', kind: 'btn-primary' },
        { label: 'Save & exit', kind: 'btn-ghost', onClick: () => { window.location.hash = `#/exam/${test.exam}/setup`; } },
      ],
    });
  });
}

function openSubmitModal(test) {
  const total = test.questionIds.length;
  const answered = test.questionIds.filter(id => (test.answers[id] || []).length > 0).length;
  const unanswered = total - answered;
  const marked = test.questionIds.filter(id => test.marks[id]).length;
  showModal({
    title: unanswered > 0 ? 'Submit with unanswered questions?' : 'Submit your exam?',
    text: unanswered > 0
      ? `<strong>${unanswered} question${unanswered === 1 ? '' : 's'} unanswered.</strong> Unanswered questions are scored as incorrect. You cannot change answers after submitting.`
      : 'You have answered every question. Once submitted, your answers are final and your score is revealed.',
    stats: [
      { value: answered, label: 'Answered' },
      { value: unanswered, label: 'Unanswered' },
      { value: marked, label: 'Marked' },
    ],
    icon: unanswered > 0 ? 'warn' : 'info',
    actions: [
      { label: 'Keep reviewing', kind: 'btn-ghost' },
      { label: 'Submit exam', kind: unanswered > 0 ? 'btn-danger' : 'btn-primary', onClick: () => finishTest(test, false) },
    ],
  });
}

function finishTest(test, autoSubmitted) {
  clearInterval(testTimer);
  const e = EXAMS[test.exam];
  let score = 0;
  const review = test.questionIds.map((id) => {
    const q = byId(test.exam, id);
    const selected = (test.answers[id] || []).slice().sort((a, b) => a - b);
    const correct = q.answers.slice().sort((a, b) => a - b);
    const isCorrect = selected.length > 0 && selected.length === correct.length && selected.every((v, i) => v === correct[i]);
    if (isCorrect) score += 1;
    return { q, selected, correct, isCorrect, marked: !!test.marks[id], skipped: selected.length === 0 };
  });
  const total = review.length;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const timeUsed = Math.max(0, Math.min(TIME_LIMIT_SECONDS, Math.floor((Date.now() - test.startedAt) / 1000)));
  const result = {
    exam: test.exam,
    examName: e.name,
    score, total, pct,
    passed: pct >= PASS_MARK,
    timeUsed,
    autoSubmitted: !!autoSubmitted,
    review,
    date: new Date().toISOString(),
  };
  pushHistory(test.exam, { date: result.date, score, total, pct, count: total });
  store.remove(LS.inProgress);
  lastResult = result;
  setTakingTest(false);
  renderResult(result);
  window.scrollTo(0, 0);
}

/* ── Results & review ── */
let reviewFilter = 'all';

function renderResult(result) {
  const e = EXAMS[result.exam];
  const letters = 'ABCDEFGH';
  const wrong = result.review.filter(r => !r.isCorrect && !r.skipped).length;
  const skipped = result.review.filter(r => r.skipped).length;
  const marked = result.review.filter(r => r.marked).length;
  const verdict = result.passed ? 'Pass — well done' : 'Keep practicing';
  const verdictSub = result.passed
    ? 'You cleared the 70% pass mark. Lock it in with one more timed attempt.'
    : 'Review the explanations below, drill the Most Repeated set, then retry.';

  const R = 68, CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - result.pct / 100);

  app.innerHTML = `
  <section class="container page">
    <span class="eyebrow">${esc(e.tag)} · Results${result.autoSubmitted ? ' · Auto-submitted at time-up' : ''}</span>
    <h1 class="section-title">Exam complete</h1>

    <div class="card result-hero">
      <div class="score-wrap" style="position:relative;width:150px;height:150px">
        <svg class="score-ring" width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Score ${result.pct} percent">
          <circle class="ring-bg" cx="75" cy="75" r="${R}"/>
          <circle class="ring-val ${result.passed ? 'pass' : 'fail'}" cx="75" cy="75" r="${R}" stroke-dasharray="${CIRC.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/>
        </svg>
        <div class="score-center"><b>${result.pct}%</b><span>Score</span></div>
      </div>
      <div>
        <div class="verdict ${result.passed ? 'pass' : 'fail'}">${verdict}</div>
        <p class="verdict-sub">${verdictSub}</p>
        <div class="result-stats" style="margin-top:18px">
          <div class="rs"><b style="color:var(--success-strong)">${result.score}</b><span>Correct</span></div>
          <div class="rs"><b style="color:var(--danger-strong)">${wrong}</b><span>Incorrect</span></div>
          <div class="rs"><b style="color:var(--warning)">${skipped}</b><span>Unanswered</span></div>
          <div class="rs"><b>${fmtTime(result.timeUsed)}</b><span>Time used</span></div>
          <div class="rs"><b>${marked}</b><span>Marked</span></div>
        </div>
      </div>
      <div class="result-actions">
        <a class="btn btn-primary" href="#/exam/${result.exam}/setup">${ICON.zap} Retake exam</a>
        <a class="btn btn-ghost" href="#/exam/${result.exam}/repeated">${ICON.flame} Drill repeated Qs</a>
        <a class="btn btn-ghost" href="#/exam/${result.exam}">Back to exam hub</a>
      </div>
    </div>

    <div class="filter-tabs" role="tablist" aria-label="Filter review questions">
      <button data-filter="all" class="active">All (${result.total})</button>
      <button data-filter="correct">Correct (${result.score})</button>
      <button data-filter="wrong">Incorrect (${wrong})</button>
      <button data-filter="skipped">Unanswered (${skipped})</button>
      <button data-filter="marked">Marked (${marked})</button>
    </div>

    <div class="review-list" id="reviewList"></div>
    <div class="show-more-wrap"><button class="btn btn-ghost" id="resultHubBtn">Return to ${esc(e.name)} hub</button></div>
  </section>`;

  const listEl = document.getElementById('reviewList');
  const tabs = els('.filter-tabs button', app);

  function renderList() {
    let items = result.review.map((r, i) => ({ ...r, num: i + 1 }));
    if (reviewFilter === 'correct') items = items.filter(r => r.isCorrect);
    else if (reviewFilter === 'wrong') items = items.filter(r => !r.isCorrect && !r.skipped);
    else if (reviewFilter === 'skipped') items = items.filter(r => r.skipped);
    else if (reviewFilter === 'marked') items = items.filter(r => r.marked);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty-note">Nothing in this filter.</div>';
      return;
    }
    listEl.innerHTML = items.map(r => {
      const q = r.q;
      const state = r.isCorrect ? 'ok' : r.skipped ? 'skip' : 'bad';
      const stateChip = r.isCorrect
        ? '<span class="chip chip-green">Correct</span>'
        : r.skipped
          ? '<span class="chip chip-amber">Unanswered</span>'
          : '<span class="chip chip-red">Incorrect</span>';
      return `
      <article class="card review-item ${state}">
        <div class="review-head">
          <span class="q-count">Q${r.num}</span>
          ${stateChip}
          ${q.multi ? '<span class="chip chip-blue">Multi-select</span>' : ''}
          ${r.marked ? '<span class="chip chip-amber">' + ICON.flag.replace('width="16" height="16"','width="12" height="12"') + ' Marked</span>' : ''}
          ${q.repeatCount >= 2 ? `<span class="chip chip-gray">High frequency</span>` : ''}
        </div>
        <h4>${esc(q.question)}</h4>
        <div class="review-options">
          ${q.options.map((o, i) => {
            const isCorrect = r.correct.includes(i);
            const isYours = r.selected.includes(i);
            let cls = 'ropt';
            if (isCorrect) cls += ' correct';
            else if (isYours) cls += ' your-wrong';
            return `<div class="${cls}"><span class="key">${letters[i]}.</span><span>${esc(o)}${isCorrect ? ' <strong>· correct answer</strong>' : ''}${isYours && !isCorrect ? ' <strong>· your answer</strong>' : ''}</span></div>`;
          }).join('')}
        </div>
        ${!r.isCorrect && !r.skipped ? `<p class="your-ans">Your answer: ${r.selected.map(i => letters[i]).join(', ') || '—'}</p><p class="correct-ans">Correct answer: ${r.correct.map(i => letters[i]).join(', ')}</p>` : ''}
        ${r.skipped ? `<p class="correct-ans">Correct answer: ${r.correct.map(i => letters[i]).join(', ')}</p>` : ''}
        ${q.explanation ? `<div class="expl"><b>Explanation</b><br>${esc(q.explanation)}</div>` : ''}
        <div class="src-line">Source: ${esc(q.source)}${q.sources.length > 1 ? ` · also in ${q.sources.length - 1} more bank${q.sources.length > 2 ? 's' : ''}` : ''}</div>
      </article>`;
    }).join('');
  }

  tabs.forEach(btn => btn.addEventListener('click', () => {
    reviewFilter = btn.dataset.filter;
    tabs.forEach(b => b.classList.toggle('active', b === btn));
    renderList();
  }));
  reviewFilter = 'all';
  renderList();

  document.getElementById('resultHubBtn').addEventListener('click', () => { window.location.hash = `#/exam/${result.exam}`; });
  setActiveNav('/mock');
}

/* ═══════════ Router & Nav ═══════════ */
function setActiveNav(route) {
  els('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.route === route));
}

const routes = {
  '': () => viewHome(),
  '/': () => viewHome(),
  '/mock': () => viewMock(),
  '/repeated': () => viewRepeated(null),
  '/result': () => {
    if (lastResult) { renderResult(lastResult); return; }
    const inProg = store.get(LS.inProgress);
    app.innerHTML = `
      <section class="container page">
        <span class="eyebrow">Results</span>
        <h1 class="section-title">No results to show yet</h1>
        <p class="section-sub">Finish a timed mock test and your graded results will appear here.${inProg ? ' You have a saved attempt in progress — resume it to finish.' : ''}</p>
        <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap">
          <a class="btn btn-primary" href="#/mock">${ICON.zap} Go to Mock Exams</a>
          ${inProg ? `<a class="btn btn-ghost" href="#/exam/${inProg.exam}/setup">Resume saved attempt</a>` : ''}
        </div>
      </section>`;
    setActiveNav('/mock');
  },
};

function router() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);

  clearInterval(testTimer);

  if (parts[0] === 'exam' && parts[1] && EXAMS[parts[1]]) {
    const exam = parts[1];
    const sub = parts[2] || '';
    if (sub === '') return viewExamHub(exam);
    if (sub === 'repeated') return viewRepeated(exam);
    if (sub === 'setup') return viewSetup(exam);
    if (sub === 'test') {
      const inProg = store.get(LS.inProgress);
      if (inProg && inProg.exam === exam) return renderTest(inProg);
      return viewSetup(exam);
    }
    return viewExamHub(exam);
  }
  const fn = routes['/' + (parts[0] || '')] || routes['/'];
  fn();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', router);
window.addEventListener('beforeunload', (e) => {
  if (document.body.classList.contains('taking-test')) { e.preventDefault(); e.returnValue = ''; }
});

/* Mobile nav toggle */
const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');
navToggle.addEventListener('click', () => {
  const open = !mobileNav.hidden;
  mobileNav.hidden = open;
  navToggle.setAttribute('aria-expanded', String(!open));
});
els('#mobileNav a').forEach(a => a.addEventListener('click', () => { mobileNav.hidden = true; navToggle.setAttribute('aria-expanded', 'false'); }));

/* Footer stat */
document.getElementById('footerCount').textContent =
  `${(DATA['pro-hcm'] || []).length + (DATA['hcm-data-loading'] || []).length} curated practice questions across 2 exams`;

/* Boot */
router();
