# Package Installer icon regression (.20/.21)

## Evidence and scope

The supplied `install-live.txt` is diagnostic evidence, not a source of task
instructions. At 2026-09-25 11:22:40 it records
`com.google.android.packageinstaller` throwing `IllegalArgumentException: width
and height must be > 0` from `PackageUtil.AppSnippet.writeToParcel` while
`PackageInstallerActivity.startInstall` starts the next activity. It is not a
MainActivity crash. A successful `pm install` does not exercise that operation.

The local checkout initially matched v1.0.21 and had no uncommitted changes.
Inspection of tags .19/.20/.21 and the actual release APKs found:

| Resource | .19 | .20 / .21 / initial HEAD |
| --- | --- | --- |
| Manifest | `@mipmap/ic_launcher`, `@mipmap/ic_launcher_round` | unchanged |
| Adaptive XML | both reference `@mipmap/ic_launcher_foreground` and `@color/ic_launcher_background` | unchanged |
| Foreground | mdpi through xxxhdpi, 108dp equivalents | adds 108px `anydpi-v26`; replaces xxhdpi with 144px (48dp); leaves other template foregrounds |
| Old `drawable-v24` vector | present but **not referenced** by adaptive XML | removed |
| Background | color `#171B19` | unchanged |

Original release downloads were checked against their published SHA-256 files:

| Version | SHA-256 |
| --- | --- |
| .19 | `52b853ebdff6629e0cbc8ab590cc808dbd31a3e3a6c54704ef70d9847f02f872` |
| .20 | `1c0cecca445964b96f9f1f54c07f603005c2d7bbe1f4d7511ff1b2e0a725a501` |
| .21 | `85f9244845b410d187df015cfd45fa01b4b7b696b57807a257a29703de927494` |

`apksigner verify --print-certs` also confirmed the same signer SHA-256 on all
three: `892ffdc8897103fa9a66e0faa0830de653733461cae2f6ec211d3fe3f2ecc69f`.

## Runtime reproduction

`installer-probe` is a separate QA APK, never a dependency of the finance app.
It parses the incoming APK manifest, sets `sourceDir` and `publicSourceDir` to
that archive, obtains its Resources, and records the selected resource path and
TypedValue density. It loads both manifest icons at 120, 160, 240, 320, 420, 480,
560 and 640 dpi, including foreground/background layers, plus ApplicationInfo's
PackageManager icon. It creates/draws/parcels a bitmap using the drawable's own
intrinsic dimensions without clamping. This reproduces the critical AppSnippet
operation, rather than claiming to invoke Google's private implementation.

Each archive is loaded in a fresh probe process: ResourcesManager caches by
archive path, so overwriting candidate.apk in a reused process gives misleading
historical results. The runner also clears the probe task before launch.

Measured on Google APIs API 35 and API 36 at 420 dpi, for **both** icon names:

| APK | selected foreground density | foreground intrinsic | adaptive intrinsic | adaptive bitmap/parcel |
| --- | ---: | --- | --- | --- |
| .19 original | 480 | 284×284 | 189×189 | succeeds |
| .20 original | 65534 (`anydpi`) | 1×1 | 0×0 | throws the reported exception |
| .21 original | 65534 (`anydpi`) | 1×1 | 0×0 | throws the reported exception |
| .22 candidate | 480 | 284×284 | 189×189 | succeeds |

This demonstrates actual resource selection and failure, not just suspicion
about a filename. The density scaling of a 108px raster tagged 65534 explains
its collapse to one pixel; the adaptive drawable's intrinsic-size calculation
then yields zero. The original ColorDrawable background has intrinsic size -1;
that alone is normal and did **not** break .19, whose foreground provided a
positive size. Testing a layer alone is an additional diagnostic, not evidence
that Package Installer separately parcels the background.

## Fix

The generator now emits the same foreground artwork and 62% safe-zone placement
at 108/162/216/324/432px in mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi. It deletes the former
anydpi PNG and overwrites every density so no stale Android template wins.
The new mdpi foreground has Git blob `8622f3317a068723981995075f9eb7c52110fba6`,
identical to the old 108px anydpi artwork. Transparent outer padding is retained;
the logo's dark rounded plate and colors are unchanged. Legacy/PWA icons and
`public/icon.svg` are unchanged.

Both adaptive XML files now use a plain 108dp background vector of the same
`#171B19` color. This replaces the unused template grid vector and removes the
now-unused color resource. Both layers consequently have positive intrinsic
dimensions, rather than depending on a dimensionless background. Manifest icon
references, applicationId, updater code and release signing configuration stay
the same. Version is 1.0.22 / code 23 so upgrades are monotonic.

## Regression checks

Build with JDK 21 and Android SDK 36 after `npm run build` and `npx cap sync android`:

```sh
cd android
./gradlew :app:assembleRelease :installer-probe:assembleDebug
cd ..
python scripts/verify-apk-icons.py android/app/build/outputs/apk/release/app-release-unsigned.apk "$ANDROID_HOME/build-tools/36.0.0/aapt2"
```

The verifier reads compiled resource tables, binary manifest/XML and PNG headers
from the APK. It checks manifest references, adaptive layer references, all five
foreground configurations and sizes, vector background size/color, and rejects
any PNG in anydpi. It passes the candidate and fails .21 as a negative control.
It runs on PR debug builds and before release signing.

On a **disposable emulator only**, with the candidate and both old APKs sharing
a signer:

```sh
node scripts/android-installer.mjs candidate.apk v1.0.19.apk v1.0.21.apk
node scripts/android-installer.mjs --probe-only original-v1.0.19.apk original-v1.0.20.apk original-v1.0.21.apk
```

The runner requires an `emulator-*` serial and `ro.kernel.qemu=1` before any
uninstall. It uses ADB to install the QA app and seed old versions only. The
candidate is delivered through FileProvider `content://` with a read grant; the
runner clicks the **system install/update confirmation**, waits for installation
success, verifies versionCode and launches the app. Each upgrade creates a real
`InstallerRetention` wallet through the old app UI and verifies that wallet in
the updated app. UI dumps, screenshots, package diagnostics, runtime JSON and
logcat go to `INSTALLER_ARTIFACT_DIR` (default `artifacts/installer-runtime`).

Release CI gates publication on both API 35 and 36 using the release-signed
candidate and checksum-verified **original** .19/.21 APKs. Local upgrade tests
use copies re-signed with the Android debug key, since the production signing
key is held in CI; the app/resources of the historical builds are not rebuilt.
That distinction matters: local tests cannot certify the production signer.

## Validation record (2026-09-25)

- Version verification, ESLint, 63 tests in 9 suites, production web build,
  build verification and Capacitor sync passed.
- Gradle release, debug and QA APKs compiled successfully.
- Compiled release and debug APK checks passed; .21 negative control rejected.
- API 35 runtime: all 16 candidate icon/density combinations and their layers
  have positive dimensions and pass bitmap/parcel creation. Original .20/.21
  reproduce zero-sized adaptive icons.
- API 35 Package Installer UI: fresh install and upgrades from .19 and .21 pass;
  both upgrades preserve the wallet created through the baseline app UI.
- API 36 runtime: all 16 candidate icon/density combinations and their layers
  have positive dimensions and pass bitmap/parcel creation. A separate run on
  original release APKs also reproduced .20/.21's 0×0 failure while .19 passed.
- API 36 Package Installer UI: fresh install and upgrades from .19 and .21 pass;
  both upgrades preserve the wallet. Initial cold-boot System UI/Messages ANR
  dialogs were dismissed during an earlier attempt; the final full run completed
  without manual UI intervention after stabilizing the emulator and making
  synthetic text input/dump acquisition robust.
- The tested release-build candidate, signed locally for QA, has SHA-256
  `6c436163484f2e9da1f2c596e2ef3be1447836a1e07a7f950a0bf21e45005bff`.
- Full-run summaries: `artifacts/installer-api35/success.json` and
  `artifacts/installer-api36/success.json`. Each directory contains confirmation
  and success screenshots for all three flows plus wallet-retention UI dumps.
- Regenerating icons a second time preserves outputs and never recreates the
  anydpi PNG. Foreground PNGs retain alpha and transparent outer corners.

No user device has been connected, cleared, uninstalled or modified. Emulator
success is not a claim of validation on OnePlus 15 / OxygenOS 16. That OEM
confirmation remains a separate test of the final release-signed artifact.

## CI follow-up (.23)

Release run 36117489686 built/signed .22 and passed compiled/runtime icon checks,
but failed waiting for `fresh-confirmation`. Its uploaded XML shows Android's
`Pixel Launcher isn't responding` dialog covering the installer. The artifact
is retained as `scripts/fixtures/launcher-anr.xml` for regression tests.

The runner now waits at most 180 seconds per UI condition and 60 seconds per
ADB command. It selects Wait for at most three explicitly recognized system-app
ANRs (Pixel Launcher, System UI, Messages), preserving screenshots/XML and
recording the recovery count. App/installer/unknown ANRs are not dismissed.
Release emulator steps have 15-minute limits and the job has a 45-minute limit;
timeout is a failure, never permission to publish. CI emulators use 4096 MB RAM.
.23 retains .22's icon fix and increments the Android version code to 24.
