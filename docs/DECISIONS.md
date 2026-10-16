# Decisions log

Short records of choices made, and the ones still open. Newest first.

---

### D9. Insights are rule-based and labelled honestly *(16 Oct 2026)*
v3.0 called them "🤖 AI Insights", but they are hand-written rules over the
user's own logs and run entirely on-device. v3.1 renames the card to
"✨ Pattern insights · from your logs, on this device" and the paywall bullet to
"Pattern insights & difficulty forecast". **Open:** if you want real AI (e.g. a
Claude API call), that needs a backend and a privacy decision. See ROADMAP.

### D8. Deterministic forecast *(16 Oct 2026)*
v3.0's 3-day "mood forecast" added `Math.random()` jitter, so it changed on
every render. v3.1 uses a least-squares line through the last 7 reviews,
clamped to 1–5. It's the same input → same output, and it's unit-tested.

### D7. Streak freezes: one per 30 consecutive days *(16 Oct 2026)*
v3.0 granted a freeze "30 days after install or the last freeze", checked only
when pressing Start. That was unpredictable and easy to miss. Now it's one
freeze per 30 days of the *current* streak, granted automatically.

### D6. Demo billing instead of fake Stripe links *(16 Oct 2026)*
v3.0 opened `buy.stripe.com/YOUR_MONTHLY` (a 404). Now, if `VITE_STRIPE_LINK_*`
is unset, checkout shows a clearly-labelled demo confirm and unlocks Pro locally.
No money moves. **Open:** real entitlements need server-side verification
(Stripe webhook → account), or RevenueCat / StoreKit / Play Billing for the
app stores, which require in-app purchase for digital goods.

### D5. PIN = SHA-256 + salt, still only a privacy screen *(16 Oct 2026)*
The djb2 hash was replaced with salted SHA-256 (WebCrypto). Legacy PINs still
verify and are upgraded on the next unlock. The lock now also applies on cold
start, not only on resume. It does **not** encrypt data at rest. See ROADMAP.

### D4. Trial counts lifetime relapses *(16 Oct 2026)*
Kept the Documents copy's rule (trial ends after 3 relapses, no time limit; the
Desktop copy also had a 7-day limit). Added `relapsesLogged` so deleting a
history entry doesn't give the trial back. **Open:** is "relapse count" the
right paywall trigger? It charges people at their lowest moment. A time- or
feature-based trial may convert better and feel kinder.

### D3. Local-time dates *(16 Oct 2026)*
Every date is computed in the device's time zone, and day differences go
through `Date.UTC` to stay correct across DST. Fixes v3.0's evening rollover bug.

### D2. Vite + vanilla JS, not a framework rewrite *(16 Oct 2026)*
Chosen with the owner. The UI is a handful of screens with simple state, so a
framework would add weight without solving a real problem. Splitting into
modules plus pure domain functions gets most of the maintainability benefit
for a fraction of the rewrite risk. Revisit if the screen count or shared
state grows a lot (React/Preact or Svelte would be the natural next steps).

### D1. Rebuild from *both* original copies *(16 Oct 2026)*
Both copies of `v3.html` were truncated at 127,231 bytes (see `_backup/README.md`).
The Documents copy had newer logic; the Desktop copy had the missing particle,
manifest and init code. v3.1 merges them, keeps the Documents behaviour where
the two disagreed, and reconstructs the final startup lines.

---

## Open questions for the owner

1. **App ID.** `com.yourcompany.vow` is a placeholder. Choose the real reverse-domain ID *before* the first store upload; it can't change afterwards.
2. **Trial model.** See D4.
3. **Pricing.** $4.99/mo · $29.99/yr · $59 lifetime is carried over from v3.0. Still right?
4. **Licence.** No `LICENSE` file was added; the repo is treated as proprietary (`"private": true`). Add one if you plan to open-source it.
5. **Branding.** Contact email `hello@vow.app`, privacy URL (placeholder `example.com`), and invite domain `vow.app` are placeholders in `.env.example`. Do you own `vow.app`?
6. **AI.** Keep rule-based insights, or add a real model (needs backend + consent)?
