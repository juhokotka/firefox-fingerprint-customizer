<div align="center">

# Firefox Fingerprint Customizer

### Per-container fingerprint customization & isolation for Firefox

![Firefox Base](https://img.shields.io/badge/Based%20on-Firefox-FF7139?logo=firefox\&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)
![Release](https://img.shields.io/github/v/release/juhokotka/firefox-fingerprint-customizer?include_prereleases\&label=Release\&color=success)
![License](https://img.shields.io/badge/License-MPL%202.0-green)
![Status](https://img.shields.io/badge/Status-Active%20Development-orange)

</div>

---

> Instead of forcing every user into the *same* fingerprint, Firefox Fingerprint Customizer gives each container its **own customizable, randomizable, cross-session-stable fingerprint** — a stable pseudonym per container, not one uniform profile for every user.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Quick Start](#quick-start)
- [Threat Model & Non-goals](#threat-model--non-goals)
- [How It Works](#how-it-works)
- [Fingerprint Surfaces](#fingerprint-surfaces)
- [Configuration](#configuration)
- [Build from Source](#build-from-source)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Appendix: Downstream Changes](#appendix-downstream-changes)
- [License](#license)

---

## What It Does

Traditional privacy browsers (Tor Browser, LibreWolf with RFP) present one **uniform fingerprint** to every site. That has limits: the rarer the uniform profile, the easier it is to spot a privacy-conscious user; every site sees the same identity; and UA, platform, timezone, WebGL and fonts stay global even though storage can be isolated per first party.

This project takes the opposite approach: **one profile per Firefox container**.

| Uniform RFP (Tor / LibreWolf) | Firefox Fingerprint Customizer |
| :--- | :--- |
| One global identity, identical for every user | One identity **per container**, chosen per site |
| One global profile, stable across sessions | Per-container profile, persisted and stable across sessions |
| Timezone forced to UTC, language to `en-US` | Timezone and language chosen per container |
| Platform token forced to Windows on every host | Realistic, platform-appropriate UA per emulated device |
| Binary on/off; no per-site configuration | Device / location / noise configured independently per container |
| Storage isolated per first party (FPI), same fingerprint everywhere | Container partitioning plus a per-container fingerprint |

The comparison is about the **identity model**, not storage granularity: first-party isolation is finer-grained than container partitioning, and this project does not claim stronger storage isolation. The difference is per-site identity selection plus cross-session stability: each container is a **stable pseudonym** — linkable to itself over time, isolated from the others.

Each container gets its own **device fingerprint (hardware + storage estimate), location, and noise seed (Canvas/WebGL/Text)** — persisted across sessions, with cookies, storage and cache partitioned per container.

---

## Quick Start

### 1. Download a prebuilt binary

Prebuilt binaries are produced automatically by GitHub Actions for every release tag (`v*`). Three platforms are published together on a single GitHub Release.

1. Open the [Releases page](https://github.com/juhokotka/firefox-fingerprint-customizer/releases).
2. Download the archive for your platform:

   | Platform | Download file | Architecture |
   | --- | --- | --- |
   | **macOS** | `Firefox-Fingerprint-Customizer-vX.Y.Z-macos-arm64.zip` | Apple Silicon (M-series) |
   | **Linux** | `Firefox-Fingerprint-Customizer-vX.Y.Z-linux-x86_64.tar.xz` | x86_64 |
   | **Windows** | `Firefox-Fingerprint-Customizer-vX.Y.Z-windows-x86_64.zip` | x86_64 |

3. Extract and launch:

   **macOS** — unzip, then drag the `.app` bundle into Applications.

   **Linux** — extract the tarball and run the binary inside:

   ```bash
   tar -xf Firefox-Fingerprint-Customizer-vX.Y.Z-linux-x86_64.tar.xz
   cd firefox
   ./firefox
   ```

   **Windows** — unzip and double-click `firefox.exe`.

<details>

<summary>Verify the download (optional)</summary>

Each release ships a `.sha256sum` file alongside every archive.

```bash
# macOS / Linux
shasum -a 256 <downloaded-archive>

# Windows (PowerShell)
Get-FileHash <downloaded-archive> -Algorithm SHA256
```

Compare the output with the contents of the matching `.sha256sum` file.

</details>

> **Platform coverage:** the macOS build is **Apple Silicon only**. Intel Mac users, and anyone who wants to modify the code, should follow [Build from Source](#build-from-source).

### 2. Enable Privacy Mode

Set the four preferences listed in [Configuration](#configuration), then click the **container button** next to the URL bar to create a container. Each container gets its own generated profile; use **Regenerate Fingerprint** or **Detailed Edit** in the panel to change it.

---

## Threat Model & Non-goals

This project reduces **web-visible fingerprint linkability between containers**. It is not an anonymity system: a container profile is a **stable pseudonym** — linkable to itself over time, not anonymous.

### Assumed adversary

A website running JavaScript and reading standard Web APIs; a passive network observer; a fingerprinting service correlating page-level signals. We do **not** assume a browser 0-day, a malicious extension, or OS-level compromise.

### In scope

- Device surfaces: UA/oscpu/platform, screen geometry, hardware concurrency, touch points, `devicePixelRatio`, media devices, audio sample rate.
- Graphics and text: WebGL vendor/renderer, canvas/WebGL noise, font roster, font metrics and text-metric perturbation.
- Locale and time: timezone, `navigator.languages`, `Accept-Language`.
- Storage estimate `quota` (Firefox best-effort semantics). `usage` stays per-origin and real.
- Per-container isolation of the above, with seeds that persist across sessions.

### Non-goals

- **Network anonymity.** No proxy or Tor is bundled. All containers share the host's public IP unless the user configures a proxy; the exit is the user's responsibility. Align `location.timezone` / `languages` with the exit IP region — timezone vs IP geolocation is the easiest cross-check.
- **Transport and traffic analysis.** TLS, TCP/IP and HTTP/2 fingerprints, packet timing and sizes are untouched.
- **DNS and other side channels** beyond what the browser already normalizes.
- **Compromised components.** Malicious extensions, browser exploits, a compromised OS, or user-installed fonts and input methods can expose far more than this project can mask.
- **Cross-device and account-level correlation.** Logging into the same account from two containers, or using the same device offline, links them regardless of fingerprint settings.
- **Guarantees under active probing.** A site that deliberately compares storage across origins, or cross-checks locale against IP, can still detect misconfiguration.
- **CAPTCHA / bot-detection evasion**, or making logged-in accounts anonymous.
- **`webrtcHideIP` scope.** It hides local/private ICE candidates; the public IP is unchanged.

### Operational notes

- One container = one persona. Avoid reusing an account across containers.
- Keep timezone, languages and `Accept-Language` coherent with the exit IP.
- Clearing or regenerating a profile resets the pseudonym and loses cross-session stability.

---

## How It Works

```text
┌──────────────────────────────────────────────────────────────┐
│  Container panel UI (browser-init.js / ContainerEditor.mjs)  │
└───────────────────────────┬──────────────────────────────────┘
                            │ generate / edit
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  FingerprintProfileStore (parent process, JS)                │
│  Device + Location + Noise · persisted per userContextId     │
│  Adapters: Container / Storage / ProfileSync                 │
└───────────────────────────┬──────────────────────────────────┘
                            │ PWindowGlobal IPC (one sync per tab)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Content-process profile cache (zero IPC on reads)           │
└───────────────────────────┬──────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  nsRFPService + platform interception                        │
│  DOM APIs · Canvas/WebGL · storage estimate                  │
│  gfx text shaping + target-OS font metric DB                 │
└──────────────────────────────────────────────────────────────┘
```

### 1. Container creation

1. `ContainerEditor.mjs` calls `ContextualIdentityService.create(name, icon, color)`.
2. A new `userContextId` is assigned.
3. `FingerprintProfileStore.generateProfile()` creates a 3-layer profile:
   - **Device** — picked from `DEVICE_DATABASE`, applying the built-in vs. external screen policy.
   - **Location** — picked from `LOCATION_DATABASE`.
   - **Noise** — fresh Canvas, WebGL and Text seeds.
4. The profile is persisted to disk (`containers.json` + profile store).

### 2. Profile sync (parent → content process)

1. `ContainerProfileSync.syncToTab(tab)` reads the profile from `FingerprintProfileStore`.
2. `WindowGlobalParent.updateProfile(profile)` converts it to the `ProfileArgs` IPDL struct.
3. It is sent via `PWindowGlobal::Msg_UpdateProfile`.
4. Content caches it in `nsTHashMap<uint32_t, UniquePtr<ProfileArgs>>`, keyed by `userContextId`.
5. All subsequent reads use the local cache — zero IPC on the hot path.

### 3. Fingerprint interception

In Privacy Mode, `nsRFPService::ShouldResistFingerprinting()` returns `true` for the covered surfaces, and the `GetSpoofed*` helpers read the cached profile instead of hardcoded values:

| API | Interception point | Reads from |
| --- | --- | --- |
| `navigator.userAgent` | `Navigator.cpp` | `profile.device.userAgent` |
| `navigator.platform` | `Navigator.cpp` | `profile.device.platform` |
| `navigator.languages` | `Navigator.cpp` | `profile.location.languages` |
| `screen.width/height` | `nsScreen.cpp` | `profile.device.screen` |
| `Canvas.toDataURL()` | `nsCanvasRenderingContext2D.cpp` | `profile.noise.canvasSeed` |
| `WebGL.getParameter()` | `ClientWebGLContext.cpp` | `profile.noise.webglSeed` |
| `CanvasRenderingContext2D.measureText()` | `gfxHarfBuzzShaper.cpp` | `profile.noise.textSeed` + OS metric DB |
| `Element.getBoundingClientRect()` | `gfxHarfBuzzShaper.cpp` | `profile.noise.textSeed` + OS metric DB |
| `Element.offsetWidth` | `gfxHarfBuzzShaper.cpp` | `profile.noise.textSeed` + OS metric DB |
| `TextMetrics` vertical fields | `gfxFont.cpp` / `CanvasRenderingContext2D.cpp` | OS metric DB (ascent/descent/xHeight) |
| CSS `ch` / `ex` units | `gfxTextRun.cpp` | OS metric DB (zeroWidth / xHeight) |
| `@font-face { src: local() }` | `gfxPlatformFontList.cpp` | Font roster substitution (Gap 3) |
| `document.fonts.check()` | `gfxPlatformFontList.cpp` | Font roster substitution (Gap 3) |
| `navigator.storage.estimate()` | `StorageManager.cpp` | `profile.storage.quota` (usage real) |
| `AudioContext.sampleRate` | `AudioContext.cpp` | `profile.device.audioSampleRate` |
| `Intl.DateTimeFormat` | `browser.js` (`_applyOverrides`) | `profile.location.timezone` |
| `MediaDevices.enumerateDevices()` | `MediaDevices.cpp` | `profile.device.mediaDevices` |

Profile generation and UI stay in JS; interception stays in C++. Thin adapters isolate Firefox API changes, and seeds persist per container for cross-session stability.

---

## Fingerprint Surfaces

A profile is generated once at container creation. The authoritative value sets are `DEVICE_DATABASE`, `LOCATION_DATABASE` and `EXTERNAL_DISPLAYS` in `FingerprintProfileStore.sys.mjs`; the values below are representative examples.

### Device layer

<details>

<summary>Hardware fingerprint (click to expand)</summary>

| Surface | Example | Source |
| --- | --- | --- |
| User Agent | `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0` | `profile.device.userAgent` |
| Platform | `MacIntel` / `Win32` / `Linux x86_64` | `profile.device.platform` |
| OS CPU | `Intel Mac OS X 10.15` | `profile.device.oscpu` |
| Screen | `2560 × 1600`, `pixelDepth: 30` (laptop: fixed; desktop: randomized) | `profile.device.screen` |
| Hardware Concurrency | `8` / `10` / `12` / `14` / `16` / `24` | `profile.device.hardwareConcurrency` |
| Touch Points | `0` (every bundled device is a laptop or desktop) | `profile.device.maxTouchPoints` |
| Device Pixel Ratio | `2.0` (Retina) / `1.5` / `1.25` / `1.0` | `profile.device.devicePixelRatio` |
| WebGL Vendor | `Google Inc. (Apple)` on macOS; `Google Inc. (NVIDIA / AMD / Intel)` elsewhere | `profile.device.webglVendor` |
| WebGL Renderer | `Apple GPU` on macOS; platform `ANGLE (...)` strings on Windows/Linux | `profile.device.webglRenderer` |
| Font Set | Per-OS stock roster (see `FontRosterData.sys.mjs`) | `profile.device.fontSet` |
| Media Devices | Microphone, Camera, Speakers | `profile.device.mediaDevices` |
| Audio Sample Rate | `44100` / `48000` | `profile.device.audioSampleRate` |
| Disk Size | `256` / `500` / `512` / `1000` / `1024` / `2000` GB | `profile.device.diskSizeGB` |
| Storage Estimate | `10 GiB` quota / real per-origin usage | `profile.storage.quota` |

The claimed **Firefox version** is pinned in each device profile — the current data reports `Firefox/160.0`. An out-of-date UA is itself a fingerprint signal: it triggers "your browser is out of date" detection and makes the profile statistically rare. When the engine baseline moves, update the device UA strings together with the device database instead of leaving them frozen at an older release.

**Storage estimate** — `navigator.storage.estimate()` reports Firefox's real best-effort `quota`: `min(10% of the device's disk, 10 GiB)`, which is a constant **10 GiB** for every device in the pool and matches what Firefox reports on real hardware. `usage` is **not spoofed**: the API is scoped to the current origin group, so the real (already container-partitioned) value is passed through; a container-wide constant would be detectable by writing a few bytes and re-reading it. Results are consistent between main thread and workers.

</details>

### Location layer

<details>

<summary>Language & timezone (click to expand)</summary>

| Country | Timezone | Language |
| --- | --- | --- |
| US | `America/New_York` | `en-US` |
| GB | `Europe/London` | `en-GB` |
| JP | `Asia/Tokyo` | `ja-JP` |
| DE | `Europe/Berlin` | `de-DE` |
| CN | `Asia/Shanghai` | `zh-CN` |
| FR | `Europe/Paris` | `fr-FR` |
| CA | `America/Toronto` | `en-CA` |
| AU | `Australia/Sydney` | `en-AU` |
| KR | `Asia/Seoul` | `ko-KR` |
| BR | `America/Sao_Paulo` | `pt-BR` |
| IN | `Asia/Kolkata` | `en-IN` |
| SG | `Asia/Singapore` | `en-SG` |

*12 locations available; each container picks one independently of its device.*

The HTTP **`Accept-Language`** header is generated from the profile's language list with proper `q`-values (via `PrepareAcceptLanguages`), so `["en-GB", "en"]` becomes `Accept-Language: en-GB,en;q=0.5` — matching a real browser's header instead of a bare language list.

</details>

### Noise layer

<details>

<summary>Randomized Canvas / WebGL / Text seeds (click to expand)</summary>

- **Canvas Seed** — persistent per-container seed injected into `toDataURL()` / `getImageData()` output.
- **WebGL Seed** — persistent per-container seed injected into WebGL rendering.
- **Text Seed** — persistent per-container seed injected into glyph advance widths at the HarfBuzz shaping layer, perturbing `measureText()`, `getBoundingClientRect()`, `offsetWidth` and all text-metric surfaces simultaneously and consistently.
- Seeds are **stable across sessions** (persisted to disk) and are not intended as cross-site identifiers.
- Reuses RFP's existing `RandomizePixels` / `GenerateKey` infrastructure, bucketed by `OriginAttributes`.

</details>

### Text & font spoofing

<details>

<summary>Metric perturbation and target-OS substitution (click to expand)</summary>

**Text metric perturbation** — unlike Canvas/WebGL noise (which randomizes pixel output), the **Text Seed** modifies glyph advance widths **at the shaping layer** (`gfxHarfBuzzShaper::ShapeText`), upstream of all text-metric consumers. This ensures cross-surface consistency: `measureText()`, `getBoundingClientRect()` and `offsetWidth` all return the **same** perturbed values.

- **Per-glyph residuals** — each `(font family, codepoint, style)` tuple receives a deterministic residual in **integer font design units**, produced by SipHash-2-4 keyed with the container's full 128-bit text seed. The residual sits on the em's integer grid and scales with font size, so measurements stay linear (`W(2s) == 2W(s)`) instead of gaining a size-independent pixel offset, and it cannot be recovered from a 32-bit hash.
- **Per-container isolation** — the `textSeed` is unique per container (`userContextId`); the word cache (`WordCacheKey`) includes `userContextId` in its hash to prevent cross-container leakage.
- **Cross-surface consistency** — perturbation happens before any API consumes the metrics, so canvas text, DOM geometry, layout reflow and `offsetWidth` see identical values.
- **No anomalous values** — residuals are bounded to roughly ±1/256 em and deterministic, so reported metrics remain plausible.

**Font metric spoofing (OS masking)** — perturbation alone still preserves the host OS's metric *patterns*. To mask the host OS (e.g. a macOS host presenting as Windows), the project layers **real target-OS metric substitution** on top:

1. **OS metric substitution (primary)** — glyph advance widths and font-level vertical metrics (ascent, descent, xHeight, capHeight, zero-width) are replaced with the target OS's real values from a metric database.
2. **Per-glyph perturbation (fallback/overlay)** — when target-OS data is unavailable for a font/codepoint, the text seed supplies the residual; when both are active, perturbation adds a small per-container variation on top of the substituted values.

**Metric data sources**

| Target OS | Source |
| --- | --- |
| **macOS** | Checked-in `browser/fonts/font_metrics_macos.json`, generated from the host's system fonts with `tools/extract_font_metrics.py` (fonttools). Regenerate on macOS when the target font set changes. |
| **Windows** | Open-source metric-compatible fonts (Carlito → Calibri, Liberation → Arial/Times, etc.). |
| **Linux** | Open-source metric-compatible fonts (Liberation, Noto, etc.). |

**Font roster baseline** — `device.fontSet` is the list of families a machine of the target OS is expected to expose. It decides both what the page can **see** and what may be **rendered**: a stock OS install with an en-US locale, excluding fonts downloaded on demand. On macOS that means `/System/Library/Fonts/**` plus `Supplemental/**`, *minus* `/System/Library/AssetsV2/com_apple_MobileAsset_Font*/**` (PingFang, Kaiti, Yuanti, Xingkai, Baoli, Hanzipen, Weibei, Wawa, Yuppy, LingWai, …). Those on-demand families are locale/region-triggered: listing them would misrepresent a stock Mac and leak the machine's region, while omitting the base set — including the CJK families every Mac ships — would make pages fall back to `.notdef` boxes. The rosters live in a generated module, `FontRosterData.sys.mjs` (`tools/gen_font_roster.py`), not hand-written.

**Cross-OS font mapping** — `gfxFontMetricDatabase::MapFontFamily` translates between equivalent family names across platforms (e.g. `Segoe UI` ↔ `Helvetica Neue` ↔ `DejaVu Sans`), so a request for "Segoe UI" on a macOS host resolves to the correct target-OS metric record.

**Visibility is stricter than mapping** — `IsFontAllowedByProfile` delegates to `IsFontInTargetRoster`, a strict membership test against `device.fontSet`. Unlike metric mapping, the visibility path deliberately does **not** map host families into the target OS, so a `local()` probe cannot enumerate a font that a real machine of the spoofed OS would not have.

**Font enumeration consistency (Gap 3)** — detectors probe `@font-face { src: local('Segoe UI') }` and `document.fonts.check()` to enumerate the installed roster. To keep "font exists" and "font metrics" in sync:

- When a container spoofs a non-host OS and a `local()` probe names a font that doesn't exist on the host, `gfxPlatformFontList::LookupLocalFont` substitutes a metric-compatible host font (e.g. `Segoe UI` → Helvetica Neue, `Consolas` → Menlo) but **labels the entry with the original probe name**. The probe resolves, while the metric hooks look up the target-OS metrics.
- All four metric-spoofing call sites (shaping advance widths, `gfxFont::Measure`, `gfxTextRun` CSS units, Canvas `TextMetrics`) key off the font's **entry name** (`gfxFontEntry::Name()`) as a fallback when the family name (overwritten to the `@font-face` alias) doesn't map in the DB.

</details>

### Screen resolution

<details>

<summary>Built-in vs. external display policy (click to expand)</summary>

| Device category | Examples | Screen resolution |
| --- | --- | --- |
| Laptops | MacBook Air/Pro, Linux/Windows laptops | **Fixed** per model — every unit ships with identical display hardware |
| All-in-ones | iMac 24-inch | **Fixed** per model — built-in display |
| Desktops (no display) | Mac mini, Mac Studio, Mac Pro, Linux/Windows desktops | **Randomized** per profile — real users connect different external monitors |

A MacBook Air M1 has the same 2560×1600 screen whether it is in Tokyo or Berlin; randomizing it would produce a combination that exists on **no real device**. A Mac mini, by contrast, has no built-in display, so fixing one resolution would narrow its fingerprint population unrealistically.

During profile generation, `_deviceToDict` checks `deviceHasBuiltInDisplay()` (name-based: MacBook/iMac/Laptop → true). For desktops, a random entry is picked from `EXTERNAL_DISPLAYS` (per-OS pool with matching `devicePixelRatio`, `pixelDepth` and `colorDepth`), and the `availTop` / `availHeight` chrome is computed from the OS (macOS/Linux top bar = 23–24 px, Windows taskbar = 40 px). The `screen` and `devicePixelRatio` fields in `DEVICE_DATABASE` for desktop entries are fallback defaults only.

</details>

### Storage isolation

Built on Firefox's native **Containers** (`ContextualIdentityService`):

- Each container has a unique `userContextId`.
- **Cookies, localStorage, IndexedDB, cache and network cache** are partitioned by `userContextId`.
- Process isolation follows Firefox's site isolation (Fission); a container is not a separate process boundary by itself.
- Geolocation is denied with `PERMISSION_DENIED` for profiles whose `geolocation` field is `blocked` (the default for new containers; the editor can switch it to `allowed`).

### Two modes, not one

| Mode | Behavior |
| :---: | --- |
| **Normal Mode** | Standard Firefox — no container fingerprinting, no isolation |
| **Privacy Mode** | Containers active, each with its own fingerprint profile |

Switch instantly via the **container button** next to the URL bar.

---

## Configuration

| Preference | Default | Description |
| --- | --- | --- |
| `privacy.browser.containerMode` | `false` | Master switch for Privacy Mode |
| `privacy.userContext.enabled` | `false` | Enable Firefox container tabs |
| `privacy.userContext.ui.enabled` | `false` | Show container UI in the URL bar |
| `privacy.fingerprint.profileMode` | `false` | Enable per-container fingerprint spoofing |
| `privacy.userContext.newTabContainerOnLeftClick.enabled` | `false` | Left-click new-tab button opens container menu |

To enable Privacy Mode, set these in `about:config`:

```text
privacy.browser.containerMode         = true
privacy.userContext.enabled           = true
privacy.userContext.ui.enabled        = true
privacy.fingerprint.profileMode       = true
```

`privacy.userContext.newTabContainerOnLeftClick.enabled` is optional. Other product-level defaults — data submission, telemetry, experiments, recommendations and AI surfaces — live in the `Privacy Browser: downstream defaults` block at the end of `browser/app/profile/firefox.js`.

---

## Build from Source

Building from source is the way to go if you want to modify the code, debug, or contribute back.

### Prerequisites

- **macOS 10.15+** (Intel) or **macOS 11+** (Apple Silicon), **Linux**, or **Windows 10+**
- [Mozilla build dependencies](https://firefox-source-docs.mozilla.org/setup/macos_build.html)
- Python 3.10+, Rust toolchain, Ninja
- ~35 GB free disk space (the full build, including debug info, can exceed this)

### Build

```bash
# Clone the repository
git clone https://github.com/juhokotka/firefox-fingerprint-customizer.git
cd firefox-fingerprint-customizer

# Bootstrap dependencies (first time only)
./mach bootstrap

# Review the mozconfig shipped with the repository. It already disables the
# crash reporter; only edit it if you need a different build configuration.
cat mozconfig

# Build (first build takes ~30-60 min; incremental builds are faster)
./mach build

# Run
./mach run
```

### JS/CSS-only changes

```bash
# `build faster` is also REQUIRED (not just a speed-up) in two cases where
# `build binaries` silently does nothing:
#   - after adding a JS module: it installs EXTRA_JS_MODULES into
#     dist/bin/modules and into the app bundle. `build binaries` does not, so
#     `resource://gre/modules/<new-module>.mjs` fails to load at runtime.
#   - after adding a pref to StaticPrefList.yaml: it regenerates the
#     StaticPrefList_*.h headers. `build binaries` does not, so
#     `StaticPrefs::<newPref>()` does not exist and compilation fails.
./mach build faster
```

### Purge the startup cache

When JS files don't seem to update:

```bash
./mach run --purgecaches
# or
obj-*/dist/Nightly.app/Contents/MacOS/firefox --purgecaches
```

<details>

<summary>For maintainers: cutting a release</summary>

The CI workflow in `.github/workflows/build.yml` is triggered by pushing a `v*` tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`). It builds all three platforms, generates SHA256 checksums, and publishes a GitHub Release with the archives attached. Manual runs are also possible from the Actions tab (`workflow_dispatch`).

</details>

---

## Project Structure

<details>

<summary>Repository layout (click to expand)</summary>

```text
firefox-fingerprint-customizer/
├── browser/
│   ├── base/content/
│   │   ├── browser-init.js              # Container panel UI & switching logic
│   │   ├── browser.js                   # ContainerStatusUI, ContainerProfileSync
│   │   └── main-popupset.inc.xhtml      # Panel XUL definitions
│   ├── components/
│   │   ├── contextualidentity/content/
│   │   │   └── ContainerEditor.mjs      # Container creation/editing form
│   │   ├── fingerprintprofile/content/
│   │   │   └── fingerprint-detailed-editor.{js,xhtml}
│   │   └── preferences/config/
│   │       └── containers.mjs           # Settings → Containers section
│   ├── themes/shared/usercontext/
│   │   └── container-editor.css         # Panel & editor styling
│   └── fonts/
│       ├── font_metrics_{macos,windows,linux}.json  # Target-OS metric DB (installed via moz.build)
│       └── metric-compat/               # Open-source metric-compatible fonts (Carlito, Liberation)
├── toolkit/components/
│   ├── contextualidentity/
│   │   └── ContextualIdentityService.sys.mjs  # Container registry (containers.json)
│   ├── resistfingerprinting/
│   │   ├── nsRFPService.{h,cpp}         # Fingerprint interception (C++)
│   │   └── FontVisibilityProvider.h     # GetUserContextId() for per-container font substitution
│   └── fingerprintprofile/              # Profile store & adapters
│       ├── FingerprintProfileStore.sys.mjs
│       ├── FontRosterData.sys.mjs       # Generated per-OS font rosters (device.fontSet)
│       └── adapters/
│           ├── ContainerAdapter.sys.mjs
│           ├── StorageAdapter.sys.mjs
│           └── ProfileSyncAdapter.sys.mjs
├── dom/
│   ├── ipc/
│   │   ├── PWindowGlobal.ipdl           # UpdateProfile IPC message
│   │   ├── WindowGlobalParent.cpp       # Parent-side profile cache (UniquePtr)
│   │   ├── WindowGlobalChild.cpp        # Child-side profile cache (UniquePtr)
│   │   └── WindowGlobalTypes.ipdlh      # ProfileArgs / FingerprintDeviceArgs / FingerprintStorageArgs structs
│   ├── quota/
│   │   └── StorageManager.cpp           # Storage estimate spoofing (RequestResolver hook)
│   └── chrome-webidl/
│       └── FingerprintProfile.webidl    # WebIDL dictionary definitions (incl. textSeed + storage)
├── gfx/thebes/
│   ├── gfxTextFingerprint.{h,cpp}       # Per-container text seed store (128-bit, thread-safe)
│   ├── gfxHarfBuzzShaper.cpp            # Two-layer metric spoofing: OS substitution + per-glyph perturbation
│   ├── gfxFontMetricDatabase.{h,cpp}    # Target-OS metric DB + cross-OS font name mapping
│   ├── CoreTextFontList.cpp             # macOS font lookup backend (LookupLocalFontInternal)
│   ├── gfxFont.h                        # userContextId threading (gfxShapedText, WordCacheKey)
│   ├── gfxFont.cpp                      # Vertical metric spoofing (gfxFont::Measure)
│   ├── gfxTextRun.{h,cpp}               # userContextId propagation + CSS ch/ex spoofing
│   ├── gfxPlatformFontList.cpp          # Visibility gate + local() probe substitution (Gap 3)
│   └── moz.build                        # Build config (gfxTextFingerprint + gfxFontMetricDatabase added)
├── layout/base/
│   └── nsPresContext.{h,cpp}            # GetUserContextId() override (reads BrowsingContext OriginAttributes)
├── tools/
│   ├── extract_font_metrics.py          # Metric-DB extraction from font files (fonttools)
│   └── gen_font_roster.py               # Generates FontRosterData.sys.mjs from a stock OS
└── docshell/base/
    └── BrowsingContext.{h,cpp}          # Lang/UA/Platform/Timezone overrides
```

</details>

---

## Contributing

This project builds on Firefox (Mozilla codebase). To contribute:

1. **Fork & clone** the repository.
2. **Fast builds** — use `./mach build faster` for JS/CSS-only changes and `--purgecaches` when JS changes don't seem to take effect (see [Build from Source](#build-from-source)).
3. **Check the Browser Console** (Cmd+Shift+J) — logging is extensive under `[ContainerButton]` and `[ContainerStatusUI]` prefixes.
4. **Follow existing conventions** — `nsTHashMap` entries must use `UniquePtr` for large structs (255-byte limit).

### Build verification

```bash
# Syntax check JS files before building
node -c browser/base/content/browser-init.js
node -c browser/base/content/browser.js

# Full C++ rebuild (after modifying .cpp/.h/.ipdl)
./mach build binaries
```

JS/CSS-only changes only need `./mach build faster`.

### Key engineering notes

<details>

<summary>Notes for maintainers (click to expand)</summary>

- **`nsTHashMap` entry size limit** — entries must not exceed 255 bytes. Store large structs (e.g. `ProfileArgs`) behind `UniquePtr`.
- **XUL event handling** — the `oncommand` attribute is unreliable for lazy-loaded modules. Use `addEventListener('click')` instead.
- **XUL hbox click events** — `hbox` elements in panels have unreliable click events. Use `toolbarbutton` elements instead.
- **Static imports in xpcshell tests** — `import` with `moz-src:///` URLs doesn't resolve; use `ChromeUtils.defineESModuleGetters` with `resource://gre/modules/` URLs.
- **Container tab binding** — tabs are permanently bound to their container at creation. Switching containers opens a new tab (Firefox architectural constraint).
- **Vertical metric call sites** — `gfxFont::Metrics` is computed once at font init from platform APIs (`CTFontGetAscent`, DWrite, FreeType) and cached, so it cannot be modified per-container at the cached struct level. Vertical spoofing must copy and override at each of the 3 call sites: `gfxTextRun::GetMetricsForCSSUnits` (CSS `ch`/`ex`), `CanvasRenderingContext2D::DrawOrMeasureText` (TextMetrics vertical), and `gfxFont::Measure` (`actualBoundingBoxAscent/Descent`). Derived metrics (`emAscent`, `emDescent`, `maxHeight`, `internalLeading`) must be recomputed after overriding `maxAscent`/`maxDescent`.
- **Storage quota worker consistency** — `navigator.storage.estimate()` is callable from both main thread and Web Workers. The `userContextId` must be extracted from the principal (`BasePrincipal::Cast(principal)->OriginAttributesRef().mUserContextId`) and passed to `RequestResolver` at creation time. For workers, the principal is captured at spawn time in `WorkerPrivate::mLoadInfo` and remains immutable for the worker's lifetime — even for detached workers whose original document is gone. Never fall back to `userContextId = 0` for a container: that would hand it the default profile (or real values) and create a detectable main-thread-vs-worker inconsistency.
- **Don't re-`Construct()` already-built Optional members** — `mStorageEstimate.mUsage`/`mQuota` are `Optional<uint64_t>` that the stock quota-result code already `Construct()`s before the profile override runs. Overwriting them via `.Value()` (never `.Construct()` again) avoids tripping `MOZ_RELEASE_ASSERT(!isSome())`, which silently crashed the content process on sites that call `navigator.storage.estimate()` (e.g. amiunique.org).
- **Storage quota on profile-cache miss** — leave the real `quota`/`usage` untouched instead of inventing a fallback. The previous 50 MB / 100 GB pair was itself a Chrome-style signal; with Firefox semantics the real quota is `min(10% disk, 10 GiB)`, i.e. 10 GiB on any realistic host, so there is nothing to hide.
- **Storage quota semantics** — use Firefox's formula, `min(10% of disk, 10 GiB)`, not a fraction of disk, and never inject a per-container `usage`: `estimate().usage` is scoped to the current origin, so a constant baseline is detectable by writing a few bytes and re-reading it.

</details>

---

## Appendix: Downstream Changes

This tree is not a stock Firefox build. Features that do not serve the per-container fingerprint use case are removed at the module level, and the removal list is kept here so it can be re-applied when the tree is rebased onto a newer Firefox release.

The design rule is simple: delete whole features, not individual lines. A removal may touch a small, fixed set of "seams" (build registration and a handful of compatibility shims), but it must not scatter edits across unrelated upstream files.

<details>

<summary>Removal list, pending work, and porting checklist (click to expand)</summary>

### Removed in this tree

| Feature | Removed paths | Why | Seams left behind |
| --- | --- | --- | --- |
| New Tab Page (Activity Stream) | `browser/extensions/newtab` (15 MB)<br>`browser/components/newtab` implementation files | Default recommendations, sponsored tiles, remote feeds, its own telemetry ping and a privileged about: page that loaded on every new tab. | `browser/components/newtab` keeps seven small files: `AboutNewTabRedirector.sys.mjs` (resolves `about:newtab` / `about:home` to the blank tab), `AboutHomeStartupCache.sys.mjs` (no-op), `AboutNewTabResourceMapping.sys.mjs` (no-op add-on version used by ASRouter targeting), `AboutNewTabComponents.sys.mjs` and `SponsorProtection.sys.mjs` (still imported by the address bar and search UI), plus `components.conf` / `moz.build`.<br>`browser/modules/AboutNewTab.sys.mjs` is now a neutral shim.<br>`browser/actors/{moz.build,BrowserProcessChild.sys.mjs}` no longer reference the removed actors. |
| Normandy | `toolkit/components/normandy` | Remote configuration and experiment delivery; not used by this product. | `toolkit/components/moz.build`, `browser/moz.configure` (`MOZ_NORMANDY = False`), `toolkit/components/glean/metrics_index.py`.<br>Nimbus and FirstStartup still referenced Normandy internals, so their UUID fallback now uses `Services.uuid` and the first-startup hook no longer calls Normandy: `toolkit/components/utils/ClientEnvironment.sys.mjs`, `toolkit/components/nimbus/lib/ExperimentManager.sys.mjs`, `browser/components/nimbus/AboutStudies.sys.mjs`, `toolkit/modules/FirstStartup.sys.mjs`. |
| Crash reporter | build configuration only | No crash submission to Mozilla. | `mozconfig`: `ac_add_options --disable-crashreporter`. Note: local minidumps are no longer written, so keep this off only if you do not need native crash debugging. |
| Background reporting and recommendations | preferences only | Disables data submission, experiments, region lookups, MITM priming, Contile, Merino, Firefox Suggest, AI and Smart Window surfaces. | The `Privacy Browser: downstream defaults` block at the end of `browser/app/profile/firefox.js`. |

New Tab removal changes the default startup page:

```text
browser.startup.homepage = about:blank
browser.newtabpage.enabled = false
```

### Pending: ASRouter / about:welcome and AI / Smart Window

These two feature families are intentionally left for a separate pass. They are coupled to more than twenty upstream files (`browser.js`, `browser-sync.js`, `panelUI.js`, `PageActions`, Firefox View, Sanitizer, built-in themes, and the `genai` link-preview code), so removing them together with New Tab would have turned this change into a large, hard-to-audit patch.

Until that pass lands, they are disabled by the downstream defaults above:

```text
browser.aboutwelcome.enabled = false
app.normandy.enabled = false
browser.ml.chat.enabled = false
browser.ml.linkPreview.enabled = false
browser.smartwindow.enabled = false
browser.tabs.groups.smart.enabled = false
```

The intended follow-up is to delete `browser/components/asrouter`, `browser/components/aboutwelcome`, `browser/components/aiwindow`, `browser/components/genai` and the two built-in AI themes, keeping only the minimum no-op shims that the browser chrome still imports.

### Porting this list to a newer Firefox

1. Replace the source tree with the new release.
2. Delete the paths listed above, in the same order.
3. Copy the remaining shim files from this repository back into place.
4. Re-apply the build and preference changes (`mozconfig`, `moz.configure`, `toolkit/components/moz.build`, `metrics_index.py`, `firefox.js`).
5. Run `./mach build faster` and fix only the seams listed in the table.
6. Verify:
   - a fresh profile opens `about:blank` for both startup and new tabs;
   - `about:config` shows the downstream defaults;
   - `about:networking#dns` no longer resolves Contile, Merino or the region service;
   - `./mach build` completes.

Keep this table as the single source of truth. If a removal needs edits in more than a handful of unrelated files, it is a sign that the feature should be disabled by preference instead of deleted.

</details>

---

## License

This project is licensed under the **Mozilla Public License 2.0 (MPL 2.0)**, inheriting from Firefox.

See the [MPL 2.0 license text](https://www.mozilla.org/en-US/MPL/) for full terms.

---

<div align="center">

**Built on [Firefox](https://firefox.com/) · Powered by [Mozilla](https://mozilla.org/)**

*Privacy isn't about blending in — it's about controlling who you appear to be.*

</div>
