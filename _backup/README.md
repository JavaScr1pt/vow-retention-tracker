# `_backup/`: original files, untouched

These are the files exactly as they were before the v3.1 restructure (16 Oct 2026).
Nothing in here is used by the app. They're kept for reference and recovery.

| Folder | Came from | Notes |
|---|---|---|
| `documents-copy/` | `Documents\Vow - Retention Tracker\` (the git repo) | Moved here with `git mv`, so `git log --follow` still shows their history. Newest app logic: relapse-only trial and the "trial ended" banner. |
| `desktop-copy/` | `OneDrive\Desktop\Vow - Retention Tracker\` (not in git) | Older HTML, but **its tail is longer**: it contains the particle animation, PWA manifest and most of the init code that the Documents copy is missing. Also has the logo SVG and the longer Capacitor setup guide. |

## What was wrong with the originals

Both `Vow — Retention Tracker v3.html` files are **truncated at exactly 127,231 bytes**.
They stop partway through a statement, so the final `<script>` block is a
syntax error. Theme, PIN lock, onboarding and init never ran, and the app
couldn't start properly. The Android project's `www/index.html` was built from
the same truncated file.

v3.1 rebuilt the app from **both** copies: the Documents copy's logic, plus the
Desktop copy's particle/init code. The last few missing lines (the end of the
startup sequence) were reconstructed. See `docs/DECISIONS.md` (D1).

Other untouched copies still exist outside this repo:
- `Documents\Vow - Retention Tracker\` (the original git checkout, including `node_modules/` and `android/`)
- `OneDrive\Desktop\Vow - Retention Tracker\`
- Git branch `legacy-v3` = `main` before the restructure
