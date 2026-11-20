// Leonida Legends — GTA VI trophy guide & tracker.
// Plain static app, fully offline: it fetches only app/data/trophies.json,
// renders the checklist, the roadmap and the filters, and keeps earned ticks
// in localStorage with export and import. No network, no artwork, no build step.
const PROGRESS_KEY = 'leonida-legends-v3-progress';
const SPOILER_KEY = 'leonida-legends-v3-spoiler';
const query = new URLSearchParams(location.search);

const cardsEl = document.getElementById('cards');
const qEl = document.getElementById('q');
const gradeEl = document.getElementById('gradePick');
const hideDoneEl = document.getElementById('hideDone');
const spoilerEl = document.getElementById('spoilerPick');
const statusEl = document.getElementById('statusLine');

const state = {
  trophies: [],
  roadmap: [],
  sources: {},
  earned: new Set(),
  spoiler: false,
  kind: 'all',
};

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '[]');
    if (Array.isArray(raw)) return new Set(raw.filter((n) => typeof n === 'string'));
  } catch { /* corrupted save: start empty */ }
  return new Set();
}

function persist() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...state.earned]));
}

function persistSpoiler() {
  localStorage.setItem(SPOILER_KEY, state.spoiler ? '1' : '0');
}

state.earned = readStored();
if (query.get('demo') === '1' && !localStorage.getItem(PROGRESS_KEY)) {
  // Sample progress for trying the tracker and for screenshots: 14 earned.
  // Round 3 keeps the same demo set as v2 so the four shots stay comparable.
  state.earned = new Set([
    'Just Like Paradise', 'Paradise Lost', 'Family Matters', 'Break the Bank',
    'Cunning Stunts', 'Master of None', 'Stick Fiddler', 'Baited My Tackle',
    'Top Fun', 'Whip It Good', 'On the Spot', 'Dime on the Dollar',
    'In The Beginning…', 'Let’s Go Bowling',
  ]);
  persist();
}
state.spoiler = localStorage.getItem(SPOILER_KEY) === '1' || query.get('spoiler') === '1';
spoilerEl.checked = state.spoiler;

const data = await (await fetch('data/trophies.json')).json();
state.trophies = data.trophies;
state.roadmap = data.roadmap ?? [];
state.sources = data.sources ?? {};

const byName = new Map(state.trophies.map((t) => [t.name, t]));
const isEarned = (t) => state.earned.has(t.name);
const isLocked = (t) => state.spoiler && t.kind === 'story' && !isEarned(t);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function sourceLine(t) {
  const p = el('p', 'src');
  p.append(document.createTextNode('Sources: '));
  (t.sources ?? []).forEach((name, i) => {
    if (i > 0) p.append(document.createTextNode(' · '));
    const url = state.sources[name];
    if (url && /^https?:\/\//.test(url)) {
      const a = el('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = name;
      p.append(a);
    } else {
      p.append(document.createTextNode(name));
    }
  });
  return p;
}

function paintProgress() {
  const total = state.trophies.length;
  const done = state.earned.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('earnedBig').textContent = done;
  document.getElementById('ringSub').textContent = `${pct}% to the Platinum · Vice Got a Price!`;
  const ring = document.getElementById('ringFill');
  const circ = 2 * Math.PI * 52;
  ring.style.strokeDasharray = String(circ);
  ring.style.strokeDashoffset = String(circ * (1 - done / total));
  const perGrade = {};
  for (const t of state.trophies) {
    perGrade[t.grade] = perGrade[t.grade] ?? { done: 0, total: 0 };
    perGrade[t.grade].total += 1;
    if (isEarned(t)) perGrade[t.grade].done += 1;
  }
  const gradesEl = document.getElementById('ringGrades');
  gradesEl.replaceChildren();
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    if (!perGrade[g]) continue;
    const b = el('b', undefined, `${perGrade[g].done}/${perGrade[g].total}`);
    gradesEl.append(b, document.createTextNode(` ${g} `));
  }
}

function paintRoadmap() {
  const list = document.getElementById('steps');
  list.replaceChildren();
  for (const s of state.roadmap) {
    const inStage = state.trophies.filter((t) => t.stage === s.stage);
    const done = inStage.filter(isEarned).length;
    const li = el('li', 'step');
    li.append(el('span', 'step-num', String(s.stage)));
    const body = el('div', 'step-body');
    const head = el('div', 'step-head');
    head.append(el('b', undefined, s.title));
    head.append(el('span', 'step-count', `${done}/${inStage.length} earned`));
    body.append(head, el('p', undefined, s.text));
    li.append(body);
    list.append(li);
  }
}

function paintMissable() {
  const miss = state.trophies.filter((t) => t.missable);
  const line = document.getElementById('missableLine');
  line.textContent = miss.length
    ? `${miss.map((t) => t.name).join(', ')} — meditate at every spot the moment you find it. PSNProfiles counts 18 spots, and one early-chapter spot may not be reachable later, with no confirmed mission replay — so keep a manual save at the start of every chapter. Every other trophy can be earned after the story.`
    : 'No trophy in this list is flagged missable.';
}

function kindMatches(t) {
  if (state.kind === 'all') return true;
  if (state.kind === 'missable') return t.missable === true;
  if (state.kind === 'online') return false; // All 55 trophies are single-player.
  return t.kind === state.kind;
}

function makeCard(t) {
  const card = el('article', 'card' + (isEarned(t) ? ' done' : '') + (t.missable ? ' miss' : ''));
  card.id = `trophy-${t.id}`;
  const head = el('div', 'card-head');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = isEarned(t);
  box.setAttribute('aria-label', `Mark ${t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) state.earned.add(t.name);
    else state.earned.delete(t.name);
    persist();
    paintAll();
  });
  const titles = el('div', 'card-titles');
  const name = el('h3');
  const desc = el('p', 'desc');
  if (isLocked(t)) {
    name.textContent = 'Locked story trophy';
    desc.textContent = 'Spoiler-free mode is on. Earn this trophy to reveal its name and description.';
  } else {
    name.textContent = t.name;
    desc.textContent = `“${t.description}”`;
  }
  titles.append(name, desc);
  head.append(box, titles);
  card.append(head);

  const chips = el('div', 'chips');
  chips.append(el('span', `chip ${t.grade}`, t.grade));
  chips.append(el('span', 'chip kind', t.kind));
  chips.append(el('span', 'chip stage', `Stage ${t.stage}`));
  if (t.target) chips.append(el('span', 'chip target', `Target ${t.target.toLocaleString('en-US')}`));
  if (t.hidden) chips.append(el('span', 'chip hidden', 'Hidden on PSN'));
  if (t.missable) chips.append(el('span', 'chip missable', 'Missable'));
  card.append(chips);

  if (isLocked(t)) {
    card.append(el('p', 'locked-note', 'Guide hidden until earned — no spoilers here.'));
  } else {
    card.append(el('p', 'guide', t.guide));
    card.append(sourceLine(t));
  }
  return card;
}

function paintCards() {
  const needle = qEl.value.trim().toLowerCase();
  let shown = 0;
  cardsEl.replaceChildren();
  for (const t of state.trophies) {
    if (!kindMatches(t)) continue;
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) continue;
    if (hideDoneEl.checked && isEarned(t)) continue;
    if (needle && !(t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind + ' stage ' + t.stage).toLowerCase().includes(needle)) continue;
    shown += 1;
    cardsEl.append(makeCard(t));
  }
  if (shown === 0) {
    const empty = el('div', 'empty');
    empty.textContent = state.kind === 'online'
      ? 'No online trophies — all 55 are single-player, per the official list. Nothing to filter here; try Story, Collectibles or Activities.'
      : 'No trophies match these filters. Clear the search or pick another kind or grade.';
    cardsEl.append(empty);
  }
  const missCount = state.trophies.filter((t) => t.missable).length;
  const hiddenCount = state.trophies.filter((t) => t.hidden).length;
  statusEl.textContent = `Showing ${shown} of ${state.trophies.length} trophies · ${state.earned.size} earned · ${missCount} missable · ${hiddenCount} hidden on PSN`;
}

function paintSources() {
  const line = document.getElementById('srcLine');
  line.replaceChildren();
  line.append(document.createTextNode('Sources used in this guide: '));
  Object.entries(state.sources).forEach(([name, url], i) => {
    if (i > 0) line.append(document.createTextNode(' · '));
    const a = el('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = name;
    line.append(a);
  });
  line.append(document.createTextNode('.'));
}

function paintAll() {
  paintProgress();
  paintRoadmap();
  paintCards();
}

document.getElementById('kindPills').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-kind]');
  if (!btn) return;
  state.kind = btn.dataset.kind;
  for (const b of document.querySelectorAll('#kindPills button')) b.classList.toggle('on', b === btn);
  paintCards();
});
qEl.addEventListener('input', paintCards);
gradeEl.addEventListener('change', paintCards);
hideDoneEl.addEventListener('change', paintCards);
spoilerEl.addEventListener('change', () => {
  state.spoiler = spoilerEl.checked;
  persistSpoiler();
  paintCards();
});
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...state.earned] }, null, 2)], { type: 'application/json' });
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    state.earned = new Set((names ?? []).filter((n) => byName.has(n)));
    persist();
    paintAll();
    statusEl.textContent = `Imported ${state.earned.size} earned trophies from ${file.name}.`;
  } catch {
    statusEl.textContent = 'That file could not be imported — it is not a progress export from this guide.';
  }
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Clear all earned ticks?')) {
    state.earned = new Set();
    persist();
    paintAll();
  }
});

paintMissable();
paintSources();
paintAll();
if (location.hash.startsWith('#trophy-')) {
  const target = document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView({ block: 'start' });
}
