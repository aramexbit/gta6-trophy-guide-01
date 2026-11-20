/* Leonida Legends — trophy checklist logic.
   Loads the trophy data, renders the grid, roadmap and grade tiles,
   and keeps the user's checklist in localStorage. No network beyond
   the local data file. */

(function () {
  "use strict";

  var DATA_URL = "data/trophies.json";
  var STORE_KEY = "leonida-legends-earned-v1";
  var SPOILER_KEY = "leonida-legends-spoiler-v1";

  var KIND_LABELS = {
    story: "Story",
    missable: "Missable",
    collectibles: "Collectibles",
    activities: "Activities",
    online: "Online"
  };

  var GRADE_LABELS = {
    platinum: "Platinum",
    gold: "Gold",
    silver: "Silver",
    bronze: "Bronze"
  };

  var STAGES = [
    { n: 1, title: "First Steps in Leonida", desc: "Settle in, learn the map, and bank the easy early trophies while the story is still fresh." },
    { n: 2, title: "Story Momentum", desc: "Push through the middle chapters and grab the partner-heist trophies along the way." },
    { n: 3, title: "Side Stories & Strangers", desc: "Clear the character strands — and handle the one missable trophy before it can slip away." },
    { n: 4, title: "Mastery & Mayhem", desc: "Late story, combat feats, races, and the big robbery set-pieces." },
    { n: 5, title: "Completionist Grind", desc: "Collectibles, money goals, and the seven trophies whose methods are still unconfirmed." },
    { n: 6, title: "Legend Status", desc: "The final mission, 100% completion, and the Platinum itself." }
  ];

  var trophies = [];
  var earned = {};
  var spoilerOn = false;
  var revealed = {};
  var filters = { kind: "all", grade: "all", state: "all", search: "" };

  var grid, roadmapList, gradeStrip, resultCount, emptyNote;
  var ringFill, ringNumber, earnedLine, percentLine;
  var searchInput, spoilerToggle, detailOverlay, detailBody;

  function $(id) { return document.getElementById(id); }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) earned = JSON.parse(raw) || {};
    } catch (e) { earned = {}; }
    try {
      spoilerOn = localStorage.getItem(SPOILER_KEY) === "1";
    } catch (e) { spoilerOn = false; }
  }

  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(earned)); } catch (e) {}
    try { localStorage.setItem(SPOILER_KEY, spoilerOn ? "1" : "0"); } catch (e) {}
  }

  function earnedCount() {
    var n = 0;
    trophies.forEach(function (t) { if (earned[t.id]) n++; });
    return n;
  }

  function gradeTotals() {
    var out = {};
    Object.keys(GRADE_LABELS).forEach(function (g) { out[g] = { total: 0, got: 0 }; });
    trophies.forEach(function (t) {
      out[t.grade].total++;
      if (earned[t.id]) out[t.grade].got++;
    });
    return out;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function badge(text, cls) { return el("span", "badge " + cls, text); }

  function trophyMatches(t) {
    if (filters.kind !== "all" && t.kind !== filters.kind) return false;
    if (filters.grade !== "all" && t.grade !== filters.grade) return false;
    if (filters.state === "earned" && !earned[t.id]) return false;
    if (filters.state === "missing" && earned[t.id]) return false;
    if (filters.state === "unconfirmed" && !t.unconfirmed) return false;
    if (filters.search) {
      var hay = (t.name + " " + t.description + " " + t.guide + " " + KIND_LABELS[t.kind]).toLowerCase();
      if (hay.indexOf(filters.search) === -1) return false;
    }
    return true;
  }

  function renderProgress() {
    var total = trophies.length;
    var got = earnedCount();
    var pct = total ? Math.round((got / total) * 100) : 0;
    var circ = 477.5;
    ringFill.style.strokeDashoffset = String(circ * (1 - got / total));
    ringNumber.textContent = pct + "%";
    earnedLine.textContent = got + " of " + total + " trophies earned";
    percentLine.textContent = pct + "% complete";

    var totals = gradeTotals();
    gradeStrip.innerHTML = "";
    Object.keys(GRADE_LABELS).forEach(function (g) {
      var tile = el("div", "grade-tile");
      var h = el("h3");
      h.appendChild(el("span", "grade-dot dot-" + g));
      h.appendChild(document.createTextNode(GRADE_LABELS[g]));
      tile.appendChild(h);
      tile.appendChild(el("div", "grade-count", totals[g].got + " / " + totals[g].total));
      var bar = el("div", "grade-bar");
      var fill = el("i");
      fill.style.width = totals[g].total ? Math.round((totals[g].got / totals[g].total) * 100) + "%" : "0%";
      bar.appendChild(fill);
      tile.appendChild(bar);
      gradeStrip.appendChild(tile);
    });
  }

  function renderRoadmap() {
    roadmapList.innerHTML = "";
    STAGES.forEach(function (stage) {
      var members = trophies.filter(function (t) { return t.stage === stage.n; });
      var done = members.filter(function (t) { return earned[t.id]; }).length;
      var li = el("li", "roadmap-stage");
      li.appendChild(el("div", "stage-num", String(stage.n)));
      var body = el("div");
      body.appendChild(el("h3", null, "Stage " + stage.n + " — " + stage.title));
      body.appendChild(el("p", "stage-desc", stage.desc));
      var chips = el("div", "stage-trophies");
      members.forEach(function (t) {
        var chip = el("button", "stage-trophy" + (earned[t.id] ? " earned" : ""), t.name);
        chip.type = "button";
        chip.addEventListener("click", function () { openDetail(t.id); });
        chips.appendChild(chip);
      });
      body.appendChild(chips);
      body.appendChild(el("div", "stage-progress", done + " of " + members.length + " earned in this stage"));
      li.appendChild(body);
      roadmapList.appendChild(li);
    });
  }

  function guideNode(t, inDetail) {
    var wrap = document.createElement("div");
    if (spoilerOn && !revealed[t.id]) {
      var hidden = el("p", "guide spoiler-hidden", t.guide);
      hidden.addEventListener("click", function () {
        revealed[t.id] = true;
        renderGrid();
        if (inDetail) openDetail(t.id);
      });
      wrap.appendChild(hidden);
      wrap.appendChild(el("p", "spoiler-hint", "Guide hidden by spoiler mode — tap the blurred text to reveal it."));
    } else {
      wrap.appendChild(el("p", "guide-label", "How to earn it"));
      wrap.appendChild(el("p", "guide", t.guide));
    }
    return wrap;
  }

  function renderGrid() {
    grid.innerHTML = "";
    var shown = 0;
    trophies.forEach(function (t) {
      if (!trophyMatches(t)) return;
      shown++;
      var card = el("article", "trophy-card" + (earned[t.id] ? " earned" : "") + (t.unconfirmed ? " unconfirmed-card" : ""));
      card.dataset.trophyId = String(t.id);

      var top = el("div", "card-top");
      var check = el("button", "check", earned[t.id] ? "✓" : "");
      check.type = "button";
      check.setAttribute("aria-label", (earned[t.id] ? "Mark not earned: " : "Mark earned: ") + t.name);
      check.addEventListener("click", function (ev) {
        ev.stopPropagation();
        toggleEarned(t.id);
      });
      top.appendChild(check);
      var titleBox = el("div", "card-title");
      titleBox.appendChild(el("h3", null, t.name));
      titleBox.appendChild(el("p", "trophy-desc", t.description));
      top.appendChild(titleBox);
      card.appendChild(top);

      var badges = el("div", "badge-row");
      badges.appendChild(badge(GRADE_LABELS[t.grade], "badge-" + t.grade));
      if (t.missable) badges.appendChild(badge("Missable", "badge-missable"));
      else badges.appendChild(badge(KIND_LABELS[t.kind], "badge-kind"));
      if (t.unconfirmed) badges.appendChild(badge("Unconfirmed", "badge-unconfirmed"));
      card.appendChild(badges);

      card.appendChild(guideNode(t, false));

      var foot = el("div", "card-foot");
      foot.appendChild(el("p", "sources", "Sources: " + t.sources.join(" · ")));
      var details = el("button", "details-link", "Details →");
      details.type = "button";
      details.addEventListener("click", function (ev) {
        ev.stopPropagation();
        openDetail(t.id);
      });
      foot.appendChild(details);
      card.appendChild(foot);

      card.addEventListener("click", function () { openDetail(t.id); });
      grid.appendChild(card);
    });
    resultCount.textContent = shown + " of " + trophies.length + " trophies shown";
    emptyNote.hidden = shown !== 0;
  }

  function renderAll() {
    renderProgress();
    renderRoadmap();
    renderGrid();
  }

  function toggleEarned(id) {
    if (earned[id]) delete earned[id]; else earned[id] = true;
    saveStore();
    renderAll();
  }

  function openDetail(id) {
    var t = null;
    trophies.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return;
    detailBody.innerHTML = "";
    var badges = el("div", "badge-row");
    badges.appendChild(badge(GRADE_LABELS[t.grade], "badge-" + t.grade));
    if (t.missable) badges.appendChild(badge("Missable", "badge-missable"));
    else badges.appendChild(badge(KIND_LABELS[t.kind], "badge-kind"));
    if (t.unconfirmed) badges.appendChild(badge("Unconfirmed", "badge-unconfirmed"));
    detailBody.appendChild(badges);
    detailBody.appendChild(el("h2", null, t.name));
    detailBody.id = "detailBody";
    detailBody.appendChild(el("p", "trophy-desc", t.description));
    detailBody.appendChild(guideNode(t, true));
    detailBody.appendChild(el("p", "sources", "Sources: " + t.sources.join(" · ")));
    var meta = el("p", "detail-meta");
    meta.innerHTML = "Roadmap stage: <b>" + t.stage + " — " + STAGES[t.stage - 1].title + "</b> &nbsp;·&nbsp; Status: <b>" +
      (earned[t.id] ? "Earned" : "Not yet earned") + "</b>" +
      (t.missable ? " &nbsp;·&nbsp; <b>Missable — do this before the story moves on.</b>" : "") +
      (t.unconfirmed ? " &nbsp;·&nbsp; <b>Unconfirmed — method not yet verified.</b>" : "");
    detailBody.appendChild(meta);
    var toggle = el("button", "chip", earned[t.id] ? "Mark as not earned" : "Mark as earned");
    toggle.type = "button";
    toggle.style.marginTop = "14px";
    toggle.addEventListener("click", function () {
      toggleEarned(t.id);
      openDetail(t.id);
    });
    detailBody.appendChild(toggle);
    detailOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeDetail() {
    detailOverlay.hidden = true;
    document.body.style.overflow = "";
    if (window.location.hash.indexOf("#trophy-") === 0) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  function setFilter(group, value, buttons) {
    filters[group] = value;
    buttons.forEach(function (b) { b.classList.toggle("active", b.dataset[group] === value); });
    renderGrid();
  }

  function bindFilters(containerId, group, key) {
    var container = $(containerId);
    var buttons = Array.prototype.slice.call(container.querySelectorAll("button"));
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { setFilter(group, b.dataset[key], buttons); });
    });
  }

  function exportChecklist() {
    var payload = {
      app: "Leonida Legends",
      exportedAt: new Date().toISOString(),
      earned: Object.keys(earned).map(Number).sort(function (a, b) { return a - b; })
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "leonida-legends-checklist.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function importChecklist(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        var ids = Array.isArray(data) ? data : data.earned;
        if (!Array.isArray(ids)) throw new Error("bad file");
        var next = {};
        ids.forEach(function (id) {
          if (trophies.some(function (t) { return t.id === id; })) next[id] = true;
        });
        earned = next;
        saveStore();
        renderAll();
      } catch (e) {
        alert("That file could not be imported. It should be a checklist JSON exported from this guide.");
      }
    };
    reader.readAsText(file);
  }

  function applyHash() {
    var hash = window.location.hash;
    if (hash.indexOf("#trophy-") === 0) {
      var id = parseInt(hash.slice(8), 10);
      if (!isNaN(id)) openDetail(id);
    } else if (hash === "#roadmap") {
      var section = $("roadmap");
      if (section) section.scrollIntoView();
    } else if (hash === "#spoiler") {
      spoilerOn = true;
      spoilerToggle.checked = true;
      saveStore();
      renderGrid();
    }
  }

  function init() {
    grid = $("trophyGrid");
    roadmapList = $("roadmapList");
    gradeStrip = $("gradeStrip");
    resultCount = $("resultCount");
    emptyNote = $("emptyNote");
    ringFill = $("ringFill");
    ringNumber = $("ringNumber");
    earnedLine = $("earnedLine");
    percentLine = $("percentLine");
    searchInput = $("searchInput");
    spoilerToggle = $("spoilerToggle");
    detailOverlay = $("detailOverlay");
    detailBody = $("detailBody");

    loadStore();
    spoilerToggle.checked = spoilerOn;

    searchInput.addEventListener("input", function () {
      filters.search = searchInput.value.trim().toLowerCase();
      renderGrid();
    });
    spoilerToggle.addEventListener("change", function () {
      spoilerOn = spoilerToggle.checked;
      saveStore();
      renderGrid();
    });
    bindFilters("kindFilters", "kind", "kind");
    bindFilters("gradeFilters", "grade", "grade");
    bindFilters("stateFilters", "state", "state");

    $("exportBtn").addEventListener("click", exportChecklist);
    $("importBtn").addEventListener("click", function () { $("importFile").click(); });
    $("importFile").addEventListener("change", function (ev) {
      if (ev.target.files && ev.target.files[0]) importChecklist(ev.target.files[0]);
      ev.target.value = "";
    });
    $("resetBtn").addEventListener("click", function () {
      if (window.confirm("Clear every tick on your checklist?")) {
        earned = {};
        saveStore();
        renderAll();
      }
    });
    $("detailClose").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", function (ev) {
      if (ev.target === detailOverlay) closeDetail();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !detailOverlay.hidden) closeDetail();
    });
    window.addEventListener("hashchange", applyHash);

    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("trophy data failed to load");
        return res.json();
      })
      .then(function (data) {
        trophies = data.trophies.slice().sort(function (a, b) { return a.id - b.id; });
        renderAll();
        applyHash();
      })
      .catch(function (err) {
        grid.innerHTML = "";
        emptyNote.hidden = false;
        emptyNote.textContent = "The trophy data could not be loaded. Please reload the page.";
        if (window.console) console.error(err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
