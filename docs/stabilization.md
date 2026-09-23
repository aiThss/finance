# Android and web stabilization — 24 September 2026

## v1.0.2 follow-up (supersedes backend/version requirements below)

The user requested publication and personal on-device Gemini configuration. Version is now **1.0.2 / Android code 3**. An external backend is no longer required for APK acceptance: Android calls Google directly with the user's key. `LocalGeminiPlugin.java` encrypts it with an Android Keystore AES-GCM key, stores only ciphertext/IV, provides no key-read bridge method, restricts network requests to fixed Google HTTPS endpoints without redirects, and never returns raw API error bodies. Capacitor logging is disabled. Key removal is explicit; Android backups are already disabled. Web personal keys are memory-only and disappear on reload. The optional web proxy remains available. Credential scanning still rejects embedded keys, while allowing the intentional Google API hostname.

Settings adds save/delete/check-key controls and a short Google AI Studio guide, plus an explicit APK update check. Update results use numeric version comparison, accept only stable releases and the official `aiThss/finance` APK asset, and handle offline/rate-limit/errors without claiming success. Downloads open externally for Android's installation confirmation; the app never silently installs an APK or removes itself.

Local v1.0.2 checks: **37 unit/server tests, 19 browser E2E tests, lint, production build, credential/version gates, dependency audit (0 vulnerabilities), Capacitor sync and SDK 36 debug/release assembly passed**. Personal-key network tests use fabricated credentials and mocked Google responses; no successful real Gemini generation is claimed without a user's key. The original emulator and performance findings below remain applicable; physical-device limitations remain disclosed in release notes.

The older paragraphs below record the original stabilization stage and its then-required backend deployment. Those backend blockers are superseded by the user's local-key decision; they do not block this release.

Implementation and local verification are recorded below. Release acceptance remains open: the deployed HTTPS backend URL has not been supplied, so its live health/CORS/AI configuration cannot be verified. No release, tag, version bump or production signing-key change was made. App ID remains `com.aithss.finance`, version 1.0.1 / code 2, compile and target SDK 36. Existing IndexedDB migrations and data are preserved.

## 1. Android top inset

Viewport configuration differed between the initial HTML and runtime mutation, while native inset handling and CSS safe-area rules could both contribute spacing. The viewport is now consistently `viewport-fit=cover`; SystemBars owns native inset handling and CSS uses only `env(safe-area-inset-*, 0px)` without parallel custom variables or fixed status-bar padding. EdgeToEdge is enabled after `super.onCreate`.

Actual installed-APK testing exposed another cause: Capacitor 8.5.2 SystemBars resets the decor background when applying icon style. With Android 15 / WebView 124, native inset padding exposed a white Android window above a dark page. A small local plugin restores the semantic page background after SystemBars applies its style and persists that UI-only color across activity recreation. It does not calculate or add insets. Screenshot pixel checks verify the gutter is continuous through the status bar and header in both themes; window flags verify icon contrast.

Exact inset/background files: `index.html`, `src/main.tsx`, `capacitor.config.ts`, `src/styles/index.css`, `src/styles/tokens.css`, `src/app/NativeSystemBars.tsx`, `android/app/src/main/java/com/aithss/finance/MainActivity.java`, `android/app/src/main/java/com/aithss/finance/WindowAppearancePlugin.java`, `android/app/src/main/res/values/styles.xml`.

## 2. Sticky underline and controls

Generic anchor hover decoration leaked into navigation and choice links, including the more-specific More rows. Touch browsers can retain hover after a tap. Hover effects now require a fine pointer with hover capability, and choice/navigation selectors explicitly disable decoration. Keyboard focus remains visible. `SelectField.tsx` wraps a real native select with a consistent chevron, appearance reset and padding. Home spacing is tighter; 320px navigation columns fit the labels without shrinking text. Fixed bottom navigation has an opaque theme background and no backdrop blur.

## 3. Native and PWA separation

`PwaUpdateManager.tsx` mounts only on web. Vite PWA automatic injection is disabled; web registration still uses the update hook and existing offline/update flow. Native bootstrap unregisters legacy workers and reloads once when necessary to detach an existing controller, without touching IndexedDB. An installed debug WebView test both checks zero registrations and deliberately installs a worker to verify upgrade cleanup. Web offline lifecycle remains covered by E2E.

## 4. Gemini backend

`src/lib/api-base.ts` enforces an external HTTPS base for native calls and rejects credentials, query strings and fragments. Web can retain same-origin requests. AI client and Settings health check share this policy, with timeout/offline/configuration errors and manual entry remaining available. No Gemini key is added to the frontend.

`scripts/validate-android-release.mjs` requires `VITE_API_BASE_URL`, requests `/api/health` with origin `https://localhost`, disallows redirects, and checks health, AI configuration and the CORS response. The release workflow obtains the URL from the repository variable `VITE_API_BASE_URL` before building. Backend `ALLOWED_ORIGINS` must include `https://localhost` along with the deployed web origin. Secrets stay on the server. Run `npm run build:android:release` after configuring the real URL; no example URL is considered a successful deployment test. The local validation gate correctly rejects the missing URL. GitHub CLI is not authenticated here, so repository variables could not be read.

## 5. Performance and structure

The shell no longer subscribes to the full finance snapshot. `src/db/queries.tsx` scopes table subscriptions to routes; Settings and AI draft entry perform zero transaction-history reads, verified at IndexedDB object-store/index operations. AI insights request their bounded history only when opened. Privacy is observed once at the root and defaults hidden until loaded.

Account balances now accumulate BigInt deltas in one transaction pass plus one account pass: O(A + T), replacing repeated O(A × T) scans. The total sums the balance map. Active-account totals exclude archived accounts while history remains available. Breakdown uses BigInt map accumulation without repeated growing-array copies, then one sort: O(T + K log K). Safe-number checks occur at the boundary. Dashboard/accounts memoize derived data. Transaction save avoids rewriting an unchanged last-account preference.

`AppRouter`, `MobileHeader`, `BottomNavigation`, `MorePage`, `NativeSystemBars` and `PwaUpdateManager` separate shell responsibilities. Routes render immediately with a 160ms opacity/transform entrance; there is no exit timer blocking a tap. Development-only deterministic 1k/5k/10k fixtures refuse to overwrite a nonempty database.

## 6. Local results

- ESLint passed; 33 unit/server tests passed, including reference balance comparisons, transfers, overflow and archived accounts.
- TypeScript/Vite production build, credential/PWA verification and version verification passed.
- All 16 browser E2E tests passed: financial lifecycle/edit/delete/restore, backup, offline, AI review, privacy/form navigation, touch decoration, native selects, focus, widths 320/360/390/412 and desktop, small-screen sheets, scoped queries and history load.
- Final browser timings (milliseconds, developer machine under concurrent emulator load; not physical-phone benchmarks):

| Transactions | Home | Open Add | Save | Transactions | Reports |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 134 | 114 | 482 | 407 | 1,098 |
| 5,000 | 247 | 120 | 547 | 449 | 707 |
| 10,000 | 453 | 91 | 639 | 463 | 743 |

- Capacitor sync and Gradle debug/release assembly passed. The actual debug APK was installed and launched on an Android 15 API 35 Pixel 6 emulator with WebView 124. Theme/icon/inset, tab navigation, transaction sheet, keyboard and Back smoke passed. Installed-WebView checks confirmed native platform, cover viewport, no underline, no blur and legacy-worker removal.
- The release APK was separately aligned, signed with the local debug test key, installed and launched on the same disposable emulator. It passed native smoke including Save reachability with the IME open. Screenshots below come from that release build. This signature is only for local testing; it is not the production signature and must not be used to update a user's release installation.
- CI now installs and launches APKs on an emulator and uploads screenshots/diagnostics. The release job tests the APK signed by its existing persistent signing procedure before publication. This workflow has not been run remotely in this session.

## 7. Reproduction and artifacts

Use a disposable emulator; the smoke script intentionally creates synthetic account data and refuses physical-device serials. It never clears app data.

```sh
npm ci
npm run lint
npm test
npm run build
npm run verify:build
npm run verify:version
npm run test:e2e
npx cap sync android
cd android
./gradlew assembleDebug assembleRelease
cd ..
node scripts/android-smoke.mjs android/app/build/outputs/apk/debug/app-debug.apk
node scripts/android-webview-check.mjs
```

Native evidence is retained in `docs/screenshots/android/`; complete local diagnostics are in ignored `artifacts/android-smoke/` and `artifacts/android-release-smoke/`. Browser screenshots are in `docs/screenshots/`. Native checks use OS screenshots/accessibility, not a desktop browser pretending to be Android. Debug-only WebView inspection supplements those checks.

## 8. Remaining acceptance

Supply the deployed backend HTTPS URL to verify live `/api/health`, CORS and a real Gemini request before a production release. Local APKs built without that URL intentionally show a configuration error for AI; they are not production-ready artifacts.

A physical device still needs signed v1.0.1 in-place upgrade/data-preservation verification with the existing production key, OEM/cutout and rotation checks, gesture and three-button navigation, modern WebView behavior, keyboard variants, native share/filesystem and splash/cold-start inspection. The previously connected phone disconnected; it was not used to claim native acceptance. Never uninstall a data-bearing app to test an upgrade.

Release minification remains disabled: plugin functionality has not been exhaustively verified with R8, and enabling it speculatively would weaken the release gate. Version and signing identity remain unchanged. A real release requires a new synchronized version/code/tag, release notes and all outstanding acceptance checks.
