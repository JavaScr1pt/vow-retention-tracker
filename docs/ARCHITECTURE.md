# Architecture

Vow is a **framework-free ES-module app** built with Vite and wrapped for
iOS/Android with Capacitor. All data lives on the device in `localStorage`.

```
             index.html  (meta, pre-paint theme script, #root)
                  │
             src/main.js ── boot order: theme → mount shell → bind events
                  │          → load state → subscribe → router → first-run flows
     ┌────────────┼──────────────────────────────┐
  screens/     features/                       ui/
  (tab pages)  (modal flows)                   (actions, modal, router,
     │            │                             toast, theme, particles)
     └─────┬──────┘
           ▼
   domain/ (pure rules)  ◄── tested in tests/*.test.js
           │
   state/store.js ── localStorage (key `vow_v1`)
           │
   services/ (billing, leaderboard API, notifications, demo data)
           │
   config/ (env-driven settings + product constants)
```

## Layers

| Layer | Folder | Rule of thumb |
|---|---|---|
| **Config** | `src/config/` | `app.js` reads `import.meta.env` with safe defaults; `constants.js` is pure product data (levels, badges, pricing, copy tables). |
| **Lib** | `src/lib/` | Tiny, dependency-free helpers: local-time dates, DOM/escaping, PIN hashing, platform detection. |
| **State** | `src/state/store.js` | One plain object. `store.update(fn)` mutates, persists, and notifies. `migrate()` upgrades old saves. |
| **Domain** | `src/domain/` | **Pure functions** of `(state, now)`: streaks, trial, XP/quests/badges, insights, forecast. No DOM, no storage. This is where the business logic and the tests live. |
| **Services** | `src/services/` | Side-effecting integrations behind small interfaces, mocked where the backend doesn't exist yet. |
| **UI infra** | `src/ui/` | Event delegation, accessible modals, routing, toasts, theme, particles. |
| **Screens** | `src/screens/` | The four tabs. Each exports `xTemplate()` (static markup) and `renderX(state)` (targeted DOM updates) and registers its actions. |
| **Features** | `src/features/` | Cross-screen flows that live in modals: onboarding, relapse, urge log, paywall, PIN lock, share card, and `progress.js` (rewards). |
| **Styles** | `src/styles/` | `tokens` → `base` → `components` → `screens` → `overlays`. Theme is pure CSS via `[data-theme]`. |

## Key flows

**Events.** Markup declares intent (`data-action="pledge"`, `data-change="toggle-pin"`).
`ui/actions.js` has one delegated listener per event type that looks up the handler
registered under that name. Handler errors become a `vow:error` event, so the user
sees a calm toast and the console keeps the stack.

**Rendering.** On every `store.update()`, `main.js` re-renders the *visible* screen
only, then queues `syncProgress()`. That function is idempotent: it grants any
milestone XP, streak freezes or badges now due, then exits. Features never need
to remember to "check badges".

**Routing.** Hash-based (`#/home`, `#/insights`, `#/profile`, `#/settings`), so
deep links and the back button work in browsers and in the Capacitor WebView.
Entering Insights is the only time the leaderboard is fetched, so routine updates
don't flash a loading skeleton.

**Modals.** `ui/modal.js` keeps a stack. It moves focus into a dialog on open
and back to the trigger on close, traps Tab, and closes on Escape or backdrop
click unless `data-dismissible="false"` (the PIN lock, onboarding and reflection).
`confirmDialog()` gives a promise-based confirm used for all destructive actions.

**Boot order** (`main.js`): theme → mount → events/modals/PIN listener/particles →
load state (corrupt saves are set aside, not lost) → subscribe → router → **lock
screen → onboarding → day-3 upsell** → reminders → midnight rollover timer.

## Data model (schema v2)

See `defaultState()` in `src/state/store.js`; every field is commented. Notable:

- Dates are **local** `YYYY-MM-DD` strings. v3.0 used UTC dates, which rolled
  the day over in the evening for users west of UTC.
- `urges[].at` (timestamp) is new in v3.1. It powers "riskiest hour" insights
  and smart reminders. Older entries without it are still counted everywhere else.
- `relapsesLogged` is a lifetime counter, so deleting history entries can't
  reset the free trial.
- `migrate()` upgrades schema-1 saves (v3.0) in place: milestone flags,
  pledge dates, share badge, legacy PIN hash. Covered by `tests/store.test.js`.

## Native (Capacitor)

`npm run build` writes `dist/`. `capacitor.config.json` points `webDir` at it, and
`npx cap sync` copies it into `android/` and `ios/`. The only native-aware code is
`lib/platform.js` and `services/notifications.js`, which lazy-loads
`@capacitor/local-notifications` and schedules real repeating OS notifications.
On the web it falls back to the Notification API, which only fires while the
app is open. See `docs/NATIVE.md`.
