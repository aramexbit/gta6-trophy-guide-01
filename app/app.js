// Leonida Legends — GTA VI trophy guide & tracker (offline, localStorage).
// Loads app/data/trophies.json, renders the checklist, roadmap and filters,
// and keeps earned ticks in the browser with export/import.
const KEY = 'gta6-trophy-guide-01-progress-v1';
const SPOILER_KEY = 'gta6-trophy-guide-01-spoiler-v1';
const grid = document.getElementById('grid');
const search = document.getElementById('search');
const gradeSel = document.getElementById('grade');
const hideEarned = document.getElementById('hideEarned');
const spoilerToggle = document.getElementById('spoilerToggle');
const countLine = document.getElementById('countLine');
const params = new URLSearchParams(location.search);

let earned = new Set();
try { earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { earned = new Set(); }
if (params.get('demo') === '1' && !localStorage.getItem(KEY)) {
  // Sample progress for screenshots / trying the tracker: 14 earned, incl. story.
  earned = new Set(['Just Like Paradise', 'Paradise Lost', 'Trust', 'Break the Bank', 'Cunning Stunts', 'Master of None', 'Stick Fiddler', 'Baited My Tackle', 'Top Fun', 'Whip It Good', 'On the Spot', 'Treat Yo Self', 'In The Beginning…', 'Let’s Go Bowling']);
  save();
}
let spoiler = localStorage.getItem(SPOILER_KEY) === '1' || params.get('spoiler') === '1';
spoilerToggle.checked = spoiler;
let kind = 'all';

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const sourceMap = doc.sources ?? {};

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
}

function saveSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoiler ? '1' : '0');
}

function isSpoilerHidden(t) {
  // Spoiler mode hides the name, description and guide of story trophies until earned.
  return spoiler && t.kind === 'story' && !earned.has(t.name);
}

function sourceLinks(t) {
  return (t.sources ?? []).map((name) => {
    const url = sourceMap[name];
    const label = url && /^https?:\/\//.test(url) ? `<a href="${url}" target="_blank" rel="noopener">${name}</a>` : name;
    return label;
  }).join(' &middot; ');
}

function renderRoadmap() {
  const strip = document.getElementById('roadmapStrip');
  strip.replaceChildren();
  for (const s of doc.roadmap ?? []) {
    const done = trophies.filter((t) => t.roadmap === s.stage && earned.has(t.name)).length;
    const total = trophies.filter((t) => t.roadmap === s.stage).length;
    const div = document.createElement('div');
    div.className = 'stage';
    const b = document.createElement('b');
    b.textContent = `Stage ${s.stage} — ${s.title}`;
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = `${done}/${total} earned`;
    const p = document.createElement('p');
    p.textContent = s.text;
    div.append(b, n, p);
    strip.append(div);
  }
}

function renderMissable() {
  const miss = trophies.filter((t) => t.missable);
  const el = document.getElementById('missableText');
  el.textContent = miss.length
    ? `${miss.map((t) => t.name).join(', ')} — meditate at every spot the moment you find it. One Chapter 1 spot (Lucia's balcony) disappears after that chapter, and guides report no mission replay, so keep a manual save at the start of every chapter. Every other trophy can be earned after the story.`
    : 'No trophy in this list is flagged missable.';
}

function renderStats() {
  const total = trophies.length;
  const pct = Math.round((earned.size / total) * 100);
  document.getElementById('earnedCount').textContent = earned.size;
  document.getElementById('progressBar').style.width = `${pct}%`;
  document.getElementById('progressText').textContent = `${pct}% to the Platinum · Vice Got a Price!`;
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? { done: 0, total: 0 };
    byGrade[t.grade].total += 1;
    if (earned.has(t.name)) byGrade[t.grade].done += 1;
  }
  document.getElementById('gradeCounts').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `<b>${byGrade[g].done}/${byGrade[g].total}</b> ${g}`)
    .join(' &middot; ');
}

function matchesKind(t) {
  if (kind === 'all') return true;
  if (kind === 'missable') return t.missable;
  if (kind === 'online') return false; // No online trophies: all 55 are single-player.
  return t.kind === kind;
}

function render() {
  renderStats();
  renderRoadmap();
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  grid.replaceChildren();
  for (const t of trophies) {
    if (!matchesKind(t)) continue;
    if (gradeSel.value !== 'all' && t.grade !== gradeSel.value) continue;
    if (hideEarned.checked && earned.has(t.name)) continue;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) continue;
    shown += 1;
    const card = document.createElement('article');
    card.className = 'card' + (earned.has(t.name) ? ' earned' : '') + (t.missable ? ' missable' : '');
    card.id = `trophy-${t.id}`;
    const top = document.createElement('div');
    top.className = 'top';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      save();
      render();
    });
    const head = document.createElement('div');
    const h = document.createElement('h3');
    const desc = document.createElement('p');
    desc.className = 'desc';
    if (isSpoilerHidden(t)) {
      h.textContent = '🔒 Hidden story trophy';
      desc.textContent = 'Spoiler-free mode is on. Earn this trophy to reveal its name and description.';
    } else {
      h.textContent = t.name;
      desc.textContent = `“${t.description}”`;
    }
    head.append(h, desc);
    top.append(box, head);
    const badges = document.createElement('div');
    badges.className = 'badges';
    const gradeBadge = document.createElement('span');
    gradeBadge.className = `badge ${t.grade}`;
    gradeBadge.textContent = t.grade;
    badges.append(gradeBadge);
    const kindBadge = document.createElement('span');
    kindBadge.className = 'badge kind';
    kindBadge.textContent = t.kind;
    badges.append(kindBadge);
    const stageBadge = document.createElement('span');
    stageBadge.className = 'badge stage';
    stageBadge.textContent = `Roadmap stage ${t.roadmap}`;
    badges.append(stageBadge);
    if (t.hidden) {
      const hb = document.createElement('span');
      hb.className = 'badge hidden';
      hb.textContent = 'Hidden on PSN';
      badges.append(hb);
    }
    if (t.missable) {
      const mb = document.createElement('span');
      mb.className = 'badge miss';
      mb.textContent = '⚠ Missable';
      badges.append(mb);
    }
    card.append(top, badges);
    if (isSpoilerHidden(t)) {
      const p = document.createElement('p');
      p.className = 'locked';
      p.textContent = 'Guide hidden until earned — no spoilers here.';
      card.append(p);
    } else {
      const g = document.createElement('p');
      g.className = 'guide';
      g.textContent = t.guide;
      const src = document.createElement('p');
      src.className = 'src';
      src.innerHTML = `Sources: ${sourceLinks(t)}`;
      card.append(g, src);
    }
    grid.append(card);
  }
  if (shown === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = kind === 'online'
      ? 'No online trophies — all 55 trophies are single-player, per GTABase and the trophy lists. Nothing to filter here; try Story, Collectibles or Activities.'
      : 'No trophies match these filters. Clear the search or pick another kind or grade.';
    grid.append(empty);
  }
  countLine.textContent = `Showing ${shown} of ${trophies.length} trophies · ${earned.size} earned · ${trophies.filter((t) => t.missable).length} missable · ${trophies.filter((t) => t.hidden).length} hidden on PSN`;
}

function renderSources() {
  const el = document.getElementById('sourceList');
  el.innerHTML = 'Sources used in this guide: ' + Object.entries(sourceMap).map(([name, url]) => {
    const label = url && /^https?:\/\//.test(url) ? `<a href="${url}" target="_blank" rel="noopener">${name}</a>` : name;
    return label;
  }).join(' &middot; ') + '.';
}

document.getElementById('kindFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-kind]');
  if (!btn) return;
  kind = btn.dataset.kind;
  for (const b of document.querySelectorAll('#kindFilters button')) b.classList.toggle('active', b === btn);
  render();
});
search.addEventListener('input', render);
gradeSel.addEventListener('change', render);
hideEarned.addEventListener('change', render);
spoilerToggle.addEventListener('change', () => {
  spoiler = spoilerToggle.checked;
  saveSpoiler();
  render();
});
document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned] }, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    const valid = new Set(trophies.map((t) => t.name));
    earned = new Set((names ?? []).filter((n) => valid.has(n)));
    save();
    render();
    countLine.textContent = `Imported ${earned.size} earned trophies from ${file.name}.`;
  } catch {
    countLine.textContent = 'That file could not be imported — it is not a progress export from this guide.';
  }
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned ticks?')) {
    earned = new Set();
    save();
    render();
  }
});

renderMissable();
renderSources();
render();
if (params.get('open')) {
  const el = document.getElementById(`trophy-${params.get('open')}`);
  if (el) el.scrollIntoView({ block: 'center' });
}
