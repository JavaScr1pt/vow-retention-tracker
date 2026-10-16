# Roadmap

## ✅ Done in v3.1 (restructure, 16 Oct 2026)
- Recovered the app from two truncated copies; it boots and runs end to end again
- Vite + ES-module structure, separate domain logic, 28 automated tests
- Local-time dates, deterministic forecast, fair freeze & trial rules
- Real notification scheduling on native; in-tab reminders on web
- Salted SHA-256 PIN with legacy migration; lock on launch
- Accessibility pass: focus management, keyboard support, ARIA roles/labels, reduced motion
- Empty / loading / error states; escaped all user text (fixes an XSS hole)
- Demo tools + seed data; mock leaderboard API; demo billing

## Next up (to reach a private beta)
- [ ] **Pick the real app ID & names** (DECISIONS → open questions 1, 5)
- [ ] **App icons & splash.** Export PNGs from `public/icons/vow-logo.svg`, then run `npx @capacitor/assets generate` (see NATIVE.md)
- [ ] **Run on a real Android device**: `npm run android`, check notifications, the status bar and the back button
- [ ] **Android back button**: close the top modal, otherwise go back a tab (`@capacitor/app` `backButton` listener)
- [ ] **Service worker** for offline web/PWA installs (e.g. `vite-plugin-pwa`)
- [ ] **Real billing**: RevenueCat (stores) or Stripe + server webhook (web) → verified `isPro`

## Later
- [ ] Backend for the leaderboard (contract is documented in `src/services/leaderboard.js`)
- [ ] Accountability buddy (invite links already generated)
- [ ] Encrypt data at rest (WebCrypto AES-GCM keyed from the PIN) or use native secure storage
- [ ] Cloud backup / multi-device sync (opt-in)
- [ ] Optional AI reflections (Claude API via backend, explicit consent)
- [ ] Localisation (copy is centralised in templates and `config/constants.js`)
- [ ] E2E tests in a real browser (Playwright) for the demo path
