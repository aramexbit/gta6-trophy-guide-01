// Leonida Legends v5 — tracker, filters, spoiler mode, roadmap, detail dialog.
// Data: app/data/trophies.json (the official 55-trophy list, guides in our own words).
// Progress is kept in localStorage only; nothing leaves the browser.

const STORE_KEY = 'leonida-legends-v5';
const params = new URLSearchParams(location.search);
const DEMO_IDS = [2, 3, 4, 5, 8, 9, 10, 15, 16, 21, 44, 46];

const GRADE_COLOR = { platinum: '#bfe9ff', gold: '#ffd166', silver: '#c9d4e3', bronze: '#e09a5f' };
const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const CATS = [
  ['all', 'All', null],
  ['story', 'Story', 13],
  ['missable', 'Missable', 1],
  ['collectibles', 'Collectibles', 6],
  ['activities', 'Activities', 34],
  ['online', 'Online', 0],
];
const STAGES = [
  { n: 1, title: 'Story First — Vice City, Baby!', note: 'Play the story straight through. Every chapter and mission trophy lands here, plus the 100% gold.' },
  { n: 2, title: 'Friends in Low Places', note: 'Stranger strands across Leonida — finish all 7, including the 8-strand silver.' },
  { n: 3, title: 'Skills & Challenges', note: 'Shooting-range golds, stunts, races and odd jobs. The longest grind lives here.' },
  { n: 4, title: 'Heat & Heists', note: 'Vaults, trucks, gangs and wanted levels — bring a getaway car.' },
  { n: 5, title: 'Every Corner of Leonida', note: 'Cards, WAiNK spots, vehicles — and the ONE missable trophy. Do the meditation spots early.' },
  { n: 6, title: 'Money & Clean-Up', note: 'Launder, spend, own — then the platinum pops.' },
];

let trophies = [];
let checked = new Set();
let spoiler = false;
let catFilter = 'all';
let gradeFilter = 'all';
let query = '';

function loadChecked() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) checked = new Set(JSON.parse(raw).filter((id) => Number.isInteger(id)));
  } catch { checked = new Set(); }
  if (params.get('demo') === '1') {
    checked = new Set(DEMO_IDS);
    const note = document.getElementById('demoNote');
    if (note) note.hidden = false;
  }
}
function saveChecked() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...checked].sort((a, b) => a - b))); } catch { /* private mode */ }
}

function cup(color) {
  return `<svg class="t-icon" viewBox="0 0 52 52" aria-hidden="true">
    <path d="M14 6h24v6a12 12 0 0 1-24 0V6z" fill="${color}"/>
    <path d="M14 10H6a8 8 0 0 0 8 10M38 10h8a8 8 0 0 1-8 10" fill="none" stroke="${color}" stroke-width="3"/>
    <rect x="24" y="24" width="4" height="10" fill="${color}"/>
    <rect x="16" y="34" width="20" height="5" rx="2" fill="${color}"/>
    <rect x="12" y="41" width="28" height="5" rx="2" fill="${color}"/></svg>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderTiles() {
  const box = document.getElementById('gradeTiles');
  box.innerHTML = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = trophies.filter((t) => t.grade === g);
    const done = all.filter((t) => checked.has(t.id)).length;
    return `<div class="grade-tile ${g}">
      <div class="g-name">${GRADE_LABEL[g]}</div>
      <div class="g-nums">${done}<small> / ${all.length}</small></div>
    </div>`;
  }).join('');
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => checked.has(t.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('doneCount').textContent = done;
  document.getElementById('totalCount').textContent = total;
  document.getElementById('ringText').textContent = pct + '%';
  document.getElementById('ringFg').style.strokeDashoffset = String(326.7 * (1 - done / Math.max(total, 1)));
  document.getElementById('progressNote').textContent =
    done === 0 ? 'Tick trophies as you earn them — progress is saved in your browser.'
    : done === total ? 'Leonida Legend — every trophy earned. The platinum is yours.'
    : `${total - done} to go. The missable trophy is in Stage 5 — do it early.`;
}

function renderChips() {
  const box = document.getElementById('catChips');
  box.innerHTML = CATS.map(([key, label, count]) =>
    `<button class="chip" type="button" data-cat="${key}" aria-pressed="${catFilter === key}">${label}${count === null ? '' : ' ' + count}</button>`
  ).join('');
  box.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    catFilter = b.dataset.cat;
    renderChips();
    renderList();
  }));
}

function visible(t) {
  if (catFilter === 'missable' && !t.missable) return false;
  if (catFilter === 'online') return false; // No online trophies on this list — every trophy is earnable solo.
  if (catFilter !== 'all' && catFilter !== 'missable' && t.category !== catFilter) return false;
  if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
  if (query) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function renderList() {
  const list = document.getElementById('trophyList');
  const shown = trophies.filter(visible);
  document.getElementById('listCount').textContent = `— showing ${shown.length} of ${trophies.length}`;
  document.getElementById('emptyState').hidden = shown.length > 0;
  list.innerHTML = shown.map((t) => {
    const done = checked.has(t.id);
    const tags = [
      `<span class="tag grade-${t.grade}">${GRADE_LABEL[t.grade]}</span>`,
      t.category === t.grade ? '' : `<span class="tag">${esc(t.category)}</span>`,
      `<span class="tag">Stage ${t.stage}</span>`,
      t.missable ? '<span class="tag missable">⚠ Missable</span>' : '',
      t.unconfirmed ? '<span class="tag unconfirmed">? Unconfirmed</span>' : '',
    ].join('');
    return `<article class="trophy grade-${t.grade}${done ? ' done' : ''}" data-id="${t.id}">
      <input class="t-check" type="checkbox" ${done ? 'checked' : ''} aria-label="Mark ${esc(t.name)} as earned">
      ${cup(GRADE_COLOR[t.grade])}
      <div class="t-body">
        <h3 class="t-name">${esc(t.name)}</h3>
        <p class="t-desc">${esc(t.description)}</p>
        <div class="t-tags">${tags}</div>
        <p class="t-guide" data-spoiler>${esc(t.guide)}</p>
        <ol class="t-steps" data-spoiler>${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <p class="t-sources">Sources: ${t.sources.map(esc).join(' · ')}</p>
      </div>
      <button class="t-open" type="button">Guide →</button>
    </article>`;
  }).join('');
  list.querySelectorAll('.trophy').forEach((card) => {
    const id = Number(card.dataset.id);
    card.querySelector('.t-check').addEventListener('change', (e) => {
      if (e.target.checked) checked.add(id); else checked.delete(id);
      saveChecked();
      renderTiles();
      renderProgress();
      card.classList.toggle('done', e.target.checked);
    });
    card.querySelector('.t-open').addEventListener('click', () => openDetail(id));
    card.querySelectorAll('[data-spoiler]').forEach((el) => el.addEventListener('click', () => {
      if (spoiler) el.classList.toggle('revealed');
    }));
  });
}

function renderRoadmap() {
  const grid = document.getElementById('roadmapGrid');
  grid.innerHTML = STAGES.map((s) => {
    const members = trophies.filter((t) => t.stage === s.n);
    return `<article class="stage">
      <div class="stage-num">${s.n}</div>
      <h3>Stage ${s.n} — ${esc(s.title)}</h3>
      <p class="s-count">${members.length} trophies · ${members.filter((t) => checked.has(t.id)).length} earned</p>
      <p class="s-note">${esc(s.note)}</p>
      <div class="s-trophies">${members.map((t) =>
        `<span class="${t.missable ? 'hot' : ''}">${t.missable ? '⚠ ' : ''}${esc(t.name)}</span>`).join('')}</div>
    </article>`;
  }).join('');
}

function miniSunset() {
  return `<svg viewBox="0 0 880 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="dSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#160a2e"/><stop offset=".5" stop-color="#a32a6e"/>
        <stop offset=".8" stop-color="#ff7a59"/><stop offset="1" stop-color="#ffc46b"/>
      </linearGradient>
      <linearGradient id="dSea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8a3a7d"/><stop offset="1" stop-color="#0b1e33"/>
      </linearGradient>
    </defs>
    <rect width="880" height="120" fill="url(#dSky)"/>
    <circle cx="440" cy="78" r="34" fill="#ffd166"/>
    <g fill="#54247a" opacity=".8">
      <rect x="0" y="66" width="60" height="20"/><rect x="70" y="52" width="40" height="34"/>
      <rect x="120" y="60" width="55" height="26"/><rect x="185" y="44" width="36" height="42"/>
      <rect x="230" y="58" width="60" height="28"/><rect x="300" y="48" width="42" height="38"/>
      <rect x="560" y="54" width="48" height="32"/><rect x="620" y="44" width="38" height="42"/>
      <rect x="668" y="60" width="56" height="26"/><rect x="734" y="50" width="44" height="36"/>
      <rect x="788" y="62" width="52" height="24"/><rect x="850" y="56" width="30" height="30"/>
    </g>
    <rect x="0" y="86" width="880" height="34" fill="url(#dSea)"/>
    <rect x="410" y="86" width="60" height="34" fill="#ffb347" opacity=".35"/>
    <g fill="#150a26">
      <rect x="330" y="30" width="52" height="56"/><rect x="340" y="20" width="32" height="12"/>
      <rect x="498" y="34" width="46" height="52"/><rect x="508" y="24" width="26" height="12"/>
    </g>
    <text x="356" y="58" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="11" font-weight="900" fill="#ff5e78">VICE CITY</text>
    <text x="521" y="60" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="11" font-weight="900" fill="#2ee6c8">LEONIDA</text>
  </svg>`;
}

function openDetail(id) {
  const t = trophies.find((x) => x.id === id);
  if (!t) return;
  const body = document.getElementById('detailBody');
  const tags = [
    `<span class="tag grade-${t.grade}">${GRADE_LABEL[t.grade]}</span>`,
    `<span class="tag">${esc(t.category)}</span>`,
    `<span class="tag">Stage ${t.stage} of 6</span>`,
    t.missable ? '<span class="tag missable">⚠ Missable — do it early</span>' : '',
    t.unconfirmed ? '<span class="tag unconfirmed">? Unconfirmed — community still verifying</span>' : '',
  ].join('');
  body.innerHTML = `
    <div class="d-hero">${miniSunset()}<p class="d-kicker">Leonida Legends · Trophy ${t.id} of 55</p></div>
    <div class="d-main">
      <h2>${esc(t.name)}</h2>
      <p class="t-desc">${esc(t.description)}</p>
      <div class="t-tags">${tags}</div>
      <h3>How to earn it</h3>
      <p class="t-guide">${esc(t.guide)}</p>
      <ol>${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <p class="t-sources">Sources: ${t.sources.map(esc).join(' · ')} — guides are written in our own words; the official name and description are shown as PlayStation publishes them.</p>
      <label class="d-check"><input type="checkbox" id="detailCheck" ${checked.has(t.id) ? 'checked' : ''}> Mark as earned</label>
    </div>`;
  body.querySelector('#detailCheck').addEventListener('change', (e) => {
    if (e.target.checked) checked.add(t.id); else checked.delete(t.id);
    saveChecked();
    renderTiles();
    renderProgress();
    renderList();
    renderRoadmap();
  });
  const dlg = document.getElementById('detail');
  if (!dlg.open) dlg.showModal();
}

function setSpoiler(on) {
  spoiler = on;
  document.body.classList.toggle('spoiler', on);
  const btn = document.getElementById('spoilerToggle');
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? '🙈 Spoiler mode: on' : '🙈 Spoiler mode: off';
  document.getElementById('spoilerBanner').hidden = !on;
  if (!on) document.querySelectorAll('.revealed').forEach((el) => el.classList.remove('revealed'));
}

function exportJSON() {
  const payload = { app: 'leonida-legends-v5', exported_at: new Date().toISOString(), earned: [...checked].sort((a, b) => a - b) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-legends-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      checked = new Set(ids.filter((id) => Number.isInteger(id) && trophies.some((t) => t.id === id)));
      saveChecked();
      renderTiles();
      renderProgress();
      renderList();
      renderRoadmap();
    } catch { alert('That file is not a Leonida Legends progress export.'); }
  };
  reader.readAsText(file);
}

async function init() {
  loadChecked();
  const res = await fetch('data/trophies.json');
  const data = await res.json();
  trophies = data.trophies;
  renderTiles();
  renderProgress();
  renderChips();
  renderList();
  renderRoadmap();

  document.getElementById('search').addEventListener('input', (e) => {
    query = e.target.value.trim().toLowerCase();
    renderList();
  });
  document.getElementById('gradeFilter').addEventListener('change', (e) => {
    gradeFilter = e.target.value;
    renderList();
  });
  document.getElementById('spoilerToggle').addEventListener('click', () => setSpoiler(!spoiler));
  document.getElementById('exportBtn').addEventListener('click', exportJSON);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', (e) => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    checked = new Set();
    saveChecked();
    renderTiles();
    renderProgress();
    renderList();
    renderRoadmap();
  });
  document.getElementById('closeDetail').addEventListener('click', () => document.getElementById('detail').close());
  document.getElementById('detail').addEventListener('click', (e) => {
    if (e.target.id === 'detail') e.target.close();
  });
  document.getElementById('missableLink').addEventListener('click', () => openDetail(28));

  // Deep links used by the screenshot views.
  const view = params.get('view');
  if (view === 'roadmap') document.body.dataset.view = 'roadmap';
  if (view === 'spoiler') {
    document.body.dataset.view = 'spoiler';
    setSpoiler(true);
  }
  if (view === 'detail') {
    const id = Number(params.get('id')) || 28;
    openDetail(id);
  }
}

init();
