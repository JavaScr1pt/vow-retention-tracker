<p align="center"><img src="public/icons/vow-logo.svg" width="96" alt="Vow logo"></p>

# Vow: Retention Tracker

A private, gamified daily streak tracker. Track your streak, make a morning
pledge, reflect each evening, log urges and their triggers, and watch your
patterns, with XP, quests, badges and streak freezes to keep you going.
Everything stays on your device.

**Stack:** Vite 6 · vanilla JS (ES modules) · CSS · Vitest · Capacitor 6 (Android/iOS)

---

## ▶ Resume from here

**Status (16 Oct 2026): working prototype, v3.1.** Runs locally, all 28 tests
pass, the Android project syncs. Ready to demo. Not yet store-ready (see *Next steps*).

### Where you stopped last time (June 2026)
You'd built v3 as a single 127 KB HTML file, wrapped it in Capacitor, and added
the Android platform. The last commit was "Add HTML app, fix build script filename".
**The HTML file was cut off at 127,231 bytes in both copies**, partway through the
particle animation. The final `<script>` block was a syntax error, so theme,
PIN lock, onboarding and startup never ran. Your Android build packaged that
broken file. Details in [`_backup/README.md`](_backup/README.md).

### What changed in this session
- Rebuilt the app from **both** copies (Documents = newer logic, Desktop = the missing tail), restructured into modules
- Fixed real bugs: UTC dates rolling over in the evening, an XSS hole in history/reflections, random forecast jitter, weekly-pledge quest counting the wrong thing, trial reset by deleting history, a toast overflowing on small screens, Stripe placeholder links that went nowhere
- Added: lock on launch, salted PIN hashing, real native notification scheduling, keyboard and screen-reader support, empty/loading/error states, demo tools, a mock API, and tests

### Next steps
1. Try the [60-second demo](#-60-second-demo) and note anything that feels off
2. Decide the [open questions](docs/DECISIONS.md#open-questions-for-the-owner), especially the **app ID** and the **trial model**
3. Make icons and run on a real phone: [`docs/NATIVE.md`](docs/NATIVE.md)
4. Work through the rest of the [roadmap](docs/ROADMAP.md)

---

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:5180**. Port 5173 was taken on the dev machine; if 5180
is busy too, Vite picks the next free port and prints it.

No `.env` is needed. Every setting has a default. To customise, copy
`.env.example` to `.env`.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload at **http://localhost:5180** |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build at http://localhost:4180 |
| `npm test` | Run all tests once (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run android` / `ios` | Build → `cap sync` → open Android Studio / Xcode |
| `npm run cap:sync` | Build and copy into the native projects |

Requires Node 18+ (tested on Node 24).

---

## 🎬 60-second demo

1. `npm run dev` → open http://localhost:5180 in a phone-sized window (DevTools → device toolbar).
2. **Onboarding:** enter a name, pick "Boredom / screen time", write a reason, then **Enter Vow**.
3. **Settings ▸ Developer ▸ Load demo data.** This loads two weeks of realistic history: a 12-day streak, urges, reviews and XP.
4. **Home:** see the streak ring and your reason. Tap **I pledge to win today** to get the XP toast and pledge streak.
5. Tap **+** → *Yes* → *Boredom* → **Log it**.
6. **Insights:** the heatmap, a difficulty forecast, pattern insights ("your riskiest hour is around 10 PM"), triggers, and the leaderboard loading from the mock API.
7. **Profile:** claim a quest (**Claim +100**) and watch the XP bar move. Check your badges.
8. **Home ▸ 🔗:** your shareable streak card.
9. **Trial chip ▸ Get Vow Pro:** demo checkout → **PRO**.
10. Bonus: **Settings ▸ App lock**, set a PIN, reload, and you're locked.

---

## Folder map

```
Vow/
├── index.html                 Entry HTML: meta tags, pre-paint theme script, #root
├── src/
│   ├── main.js                Boot: mounts the shell, wires events, loads state, runs first-run flows
│   ├── config/
│   │   ├── app.js             Env-driven settings (with defaults) + storage keys
│   │   └── constants.js       Product data: levels, badges, milestones, plans, triggers, copy
│   ├── lib/                   Small helpers: dates.js (local time), dom.js (escape, $), pin.js, platform.js
│   ├── state/store.js         State shape, persistence, schema migration, subscribe/update
│   ├── domain/                Pure business rules (unit-tested)
│   │   ├── streak.js          Streak, milestones, freezes, pledge streak
│   │   ├── trial.js           Free-trial rules
│   │   ├── progression.js     XP levels, quests, badges
│   │   └── insights.js        Urge stats, heatmap, forecast, pattern insights
│   ├── services/              Integrations (mocked where there's no backend yet)
│   │   ├── billing.js         Stripe Payment Links or demo checkout
│   │   ├── leaderboard.js     Real API if VITE_API_BASE_URL, else seeded mock
│   │   ├── notifications.js   Capacitor local notifications / Web Notification API
│   │   └── demo-data.js       Seed data for demos
│   ├── ui/                    App infrastructure
│   │   ├── actions.js         data-action event delegation
│   │   ├── modal.js           Accessible modals + confirmDialog()
│   │   ├── router.js          Hash routing between tabs
│   │   ├── toast.js, theme.js, particles.js
│   ├── screens/               The four tabs: home, insights, profile, settings
│   ├── features/              Modal flows: onboarding, relapse, urge-log, paywall,
│   │                          pin-lock, share-card, progress (XP/badges/freezes)
│   └── styles/                tokens → base → components → screens → overlays
├── public/                    Copied as-is: icons/vow-logo.svg, manifest.webmanifest
├── tests/                     Vitest: dates, domain rules, store migration, jsdom smoke test
├── docs/
│   ├── ARCHITECTURE.md        Layers, data flow, data model
│   ├── DECISIONS.md           Why things are the way they are + open questions
│   ├── ROADMAP.md             Done / next / later
│   └── NATIVE.md              Android & iOS build, icons, store submission
├── _backup/                   Original files, untouched (see its README)
├── android/                   Capacitor Android project (git-ignored, regenerable)
├── capacitor.config.json      App ID, webDir = dist, plugin config
├── vite.config.js             Dev port, relative base for Capacitor, test config
├── .env.example               All settings, documented
└── package.json
```

---

## Architecture in brief

- **No framework, on purpose.** A few screens with simple state don't need one.
  Templates are strings, and updates are targeted DOM writes.
- **One store.** `store.update(fn)` mutates, saves to `localStorage` (`vow_v1`,
  the same key as v3.0, so existing data carries over), and re-renders the
  visible screen. Rewards (milestones, freezes, badges) are granted by an
  idempotent `syncProgress()` after each change.
- **Pure domain layer.** All the rules are pure functions of `(state, now)` in
  `src/domain/`, which is what the tests cover.
- **Services hide the backend gap.** Leaderboard, billing and notifications each
  have a small interface with a mock or web fallback, so wiring in a real
  backend later changes one file each.
- **Accessible by default.** Real buttons, ARIA roles on tabs, radios, switches
  and dialogs, focus management, Escape, a skip link, live regions for toasts,
  and `prefers-reduced-motion`.

Full detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Rationale: [`docs/DECISIONS.md`](docs/DECISIONS.md)

## Configuration

See [`.env.example`](.env.example). Highlights:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | *(empty → mock)* | Leaderboard backend |
| `VITE_STRIPE_LINK_*` | *(empty → demo checkout)* | Real checkout links per plan |
| `VITE_EVENING_HOUR` | `20` | When the evening review unlocks (set `0` for demos) |
| `VITE_REMINDER_HOUR` | `9` | Daily pledge reminder |
| `VITE_ENABLE_DEMO_TOOLS` | `false` | Show developer tools in production builds (always on in dev) |

## Git

| Branch | Contents |
|---|---|
| `restructure` | This v3.1 prototype |
| `main` / `legacy-v3` | The original single-file v3 (`legacy-v3` is a frozen snapshot) |

> ⚠️ This folder lives in OneDrive. `node_modules/` syncing can be slow, and
> files can occasionally get locked. If you see `EBUSY` errors, pause OneDrive
> sync or move the project out of OneDrive.

## Privacy

Vow has no accounts and no analytics. Data stays in this browser or on this
device unless you export it or join the leaderboard, which shares only a random
ID and your streak count. The PIN is a privacy screen, not encryption.
