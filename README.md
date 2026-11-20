# Leonida Legends — GTA VI Trophy Guide &amp; Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/aramexbit/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/aramexbit/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Legends is an offline guide and tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5. It carries the official name, description and grade of every trophy, a guide in our own words with its sources beside it, a six-stage roadmap to the Platinum, a warning for the one trophy that may be missable (Positive Mental Attitude), and a checklist that saves in your browser with export and import. Filters cover story, missable, collectibles and activities plus grade and search; spoiler-free mode hides story trophies until you earn them. No network, no Rockstar logo or artwork — everything here is original.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

## What's inside

- `app/index.html`, `app/app.js`, `app/style.css` — the guide itself (plain static files, no build step)
- `app/data/trophies.json` — the 55 official trophies with own-words guides, sources, kinds, roadmap stages and the missable flag
- `screenshots/` — four real renders of the guide at 1280×800: the checklist cover, the missable trophy's guide, the roadmap, and spoiler-free mode
- `main.ts` — hands the guide in as a make.fun entry (copies `app/` and `screenshots/`, writes `dossier.json`)
- `serve.ts` — tiny static server for local tries

Names, descriptions and grades come from the official PlayStation list (Exophase and PSNProfiles). Guides are written in our own words for this entry; where a method is not confirmed yet, the guide says so instead of inventing a location or a step. Round 3 rebuild, 21 November 2026 — every counted file was rewritten in the recorded session, including the screenshot manifest.

---

<sub>Entered on [make.fun](https://make.fun/?ref=rrcbfccn&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
