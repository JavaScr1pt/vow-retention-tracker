# Native apps (Capacitor 6)

Vow's web build (`dist/`) runs inside a native WebView via
[Capacitor](https://capacitorjs.com/). This guide replaces the v3.0 setup README
(kept in `_backup/`). The old `scripts/build.js` copy step is gone: Vite builds
straight to `dist/`, and Capacitor auto-injects its bridge.

## Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Node.js | ≥ 18 (tested on 24) | everything |
| Android Studio | 2023+ (with an SDK + emulator) | Android |
| JDK | 17 (bundled with Android Studio) | Android |
| Xcode + CocoaPods | 15+ (macOS only) | iOS |

## Android

The `android/` project from v3.0 was copied into this folder. It's git-ignored
(generated code), so a fresh clone needs `npx cap add android` instead.

```bash
npm install
npm run android        # = vite build → npx cap sync → opens Android Studio
```

Press ▶ Run in Android Studio, choosing an emulator or a USB device with developer mode on.

**Release build:** Build ▸ Generate Signed Bundle / APK ▸ Android App Bundle →
create or choose a keystore (back it up; losing it means you can't ship updates)
→ upload the `.aab` to the Google Play Console.

## iOS (needs a Mac)

```bash
npx cap add ios        # first time only
npm run ios            # build → sync → opens Xcode
```

In Xcode, set your Team under *Signing & Capabilities* and the Bundle Identifier.
Then use **Product ▸ Archive** to distribute via App Store Connect.

## App ID

`capacitor.config.json` → `appId: "com.yourcompany.vow"` is a **placeholder**.
Change it (and `applicationId` in `android/app/build.gradle`) before the first
store upload. It can't be changed after publishing.

## Icons & splash

Generate every size from one source image:

```bash
npm install -D @capacitor/assets
# put files in ./assets/:
#   icon-only.png        1024×1024  (export public/icons/vow-logo.svg)
#   icon-foreground.png  1024×1024  (Android adaptive foreground)
#   icon-background.png  1024×1024  (solid #1A1A1C)
#   splash.png           2732×2732  (logo centred on #1A1A1C)
npx @capacitor/assets generate
```

## What's native-aware in the code

| Feature | Web | Native |
|---|---|---|
| Daily / smart reminders | Fire only while the tab is open (checked each minute) | Real OS-scheduled, repeating local notifications (`@capacitor/local-notifications`) |
| Data storage | `localStorage` | `localStorage` inside the WebView (persists; cleared on uninstall) |
| Safe areas / notch | `env(safe-area-inset-*)` | same |
| Status bar | `theme-color` meta | `StatusBar` plugin config (`DARK`, `#1A1A1C`) |
| "Add to home screen" help | shown | hidden |

Notification icon: Android uses the app icon by default. To use a monochrome
status-bar icon, add `res/drawable/ic_stat_vow.png` and set
`plugins.LocalNotifications.smallIcon` in `capacitor.config.json`. (v3.0
referenced a sample icon and a `beep.wav` that didn't exist; both were removed.)

## Store submission

| Store | Guide |
|---|---|
| App Store | https://developer.apple.com/distribute/ |
| Google Play | https://play.google.com/console/about/guides/ |

Both stores require in-app purchase for digital subscriptions. See DECISIONS D6.
