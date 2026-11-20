# Leonida Legends

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/aramexbit/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/aramexbit/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An unofficial, fully offline trophy guide for **Grand Theft Auto VI** on PlayStation 5 — all 55 official trophies, from the opening mission in Vice City to the Platinum that crowns the run.

## What it does

- **All 55 official trophies** with their exact names, descriptions, and grades (1 Platinum, 2 Gold, 6 Silver, 46 Bronze).
- **Original guides** for every trophy, each naming the community sources it leans on (GTABase, KeenGamer, PowerPyx, Exophase, PSNProfiles, Rockstar).
- **Checklist tracker** — tick trophies as they pop; progress is saved in the browser and survives reloads. Export the checklist as JSON and import it back later.
- **Filters** by trophy type (story, missable, collectibles, activities, online), by grade, by earned state, plus free-text search.
- **Spoiler mode** — blurs every guide paragraph until the reader taps to reveal it.
- **Six-stage roadmap to Platinum**, showing which trophies belong to each stage and how far along each stage is.
- **Progress by grade** and a big overall progress ring in the header.
- **Missable warning** — exactly one trophy, *Positive Mental Attitude*, can be missed; the guide says so loudly and early.
- **Seven unconfirmed trophies** are flagged clearly: *Personal Best*, *Actions Speak Louder*, *Bad Luck, I Guess*, *The Truth Is Out There*, *Ten Pin*, *In The Beginning…*, and *Capital Offense*. Their unlock methods have not been reliably verified yet, so those guides are best current guesses, not promises.

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 (use `node serve.ts --port 8081` for another port). The app is static and makes no network requests.

## Screenshots

```sh
node shots.mjs
```

This serves the app, drives the installed headless Chromium, and captures four real renders at 1280×800 into `screenshots/` (checklist, trophy detail, roadmap, spoiler mode).

## Build the entry bundle

```sh
node main.ts
```

Copies `app/` and `screenshots/` into `out/` (or `$MAKEFUN_OUTPUT_DIR`) and writes `out/dossier.json`.

## License

MIT — see [LICENSE](LICENSE).

This is an unofficial fan-made guide. It is not affiliated with, endorsed by, or connected to Rockstar Games or Take-Two Interactive. No Rockstar logos or artwork are used.

<sub>Entered on [make.fun](https://make.fun/?ref=rrcbfccn&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
