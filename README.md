<div align="center">

# Firefox Fingerprint Customizer

### Per-container fingerprint customization & isolation for Firefox

![Firefox Base](https://img.shields.io/badge/Based%20on-Firefox-FF7139?logo=firefox\&logoColor=white)

![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)

![Release](https://img.shields.io/github/v/release/juhokotka/firefox-fingerprint-customizer?label=Release\&color=success)

![License](https://img.shields.io/badge/License-MPL%202.0-green)

![Status](https://img.shields.io/badge/Status-Active%20Development-orange)

</div>

---

> **Not your average privacy browser.** Instead of forcing every user into the *same* fingerprint, Firefox Fingerprint Customizer gives each container its **own customizable, randomizable, cross-session-stable fingerprint** — so you can be a Mac user in Tokyo for one site, and a Linux desktop in Berlin for another, with leakage between them **minimized by design**.

---

## Table of Contents

- [Why This Project?](#why-this-project)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Why This Project?

Traditional privacy browsers (Tor Browser, LibreWolf with RFP) pursue a **uniform fingerprint** — every user looks identical. But this approach has limitations:

- **Entropy paradox** — the rarer the uniform profile, the easier it is to identify as a privacy-conscious user.
- **No per-site control** — you can't present different identities to different websites.
- **No isolation** — cookies, cache, and storage are shared across all browsing.

**Firefox Fingerprint Customizer takes the opposite approach:**

|              Traditional RFP              |       Firefox Fingerprint Customizer       |
| :---------------------------------------: | :----------------------------------------: |
|        One fingerprint for everyone       |      One fingerprint **per container**     |
| Hardcoded timezone (`Atlantic/Reykjavik`) |        Choose timezone per container       |
|      Hardcoded UA (`Windows NT 10.0`)     |  Real device pools (Mac / Linux / Windows) |
|         Shared storage across tabs        | **Storage partitioned** by `userContextId` |
|            Binary on/off switch           |  Two modes: **Normal** vs **Privacy Mode** |

Each container gets its own **device fingerprint, location, and noise seed (Canvas/WebGL/Text)** — persisted across sessions, isolated at the process level.

---

## Key Features

### Per-Container Fingerprinting

Each container carries an independent `FingerprintProfile` with a complete device fingerprint:

<details>

<summary><b>Device Layer</b> — Hardware fingerprint (click to expand)</summary>

  


| Surface              | Example                                           | Source                               |
| -------------------- | ------------------------------------------------- | ------------------------------------ |
| User Agent           | `Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5...)` | `profile.device.userAgent`           |
| Platform             | `MacIntel` / `Win32` / `Linux x86_64`             | `profile.device.platform`            |
| OS CPU               | `Intel Mac OS X 14.5`                             | `profile.device.oscpu`               |
| Screen               | `2560 × 1440`, `pixelDepth: 30`                   | `profile.device.screen`              |
| Hardware Concurrency | `8` / `10` / `12` / `16`                          | `profile.device.hardwareConcurrency` |
| Touch Points         | `0` (desktop) / `5` / `10` (mobile)               | `profile.device.maxTouchPoints`      |
| Device Pixel Ratio   | `2.0` (Retina) / `1.0` / `1.25`                   | `profile.device.devicePixelRatio`    |
| WebGL Vendor         | `Google Inc. (Apple)`                             | `profile.device.webglVendor`         |
| WebGL Renderer       | `Apple GPU`                                       | `profile.device.webglRenderer`       |
| Font Set             | 18 macOS fonts / 22 Linux fonts                   | `profile.device.fontSet`             |
| Media Devices        | Microphone, Camera, Speakers                      | `profile.device.mediaDevices`        |
| Audio Sample Rate    | `44100` / `48000`                                 | `profile.device.audioSampleRate`     |

</details>

<details>

<summary><b>Location Layer</b> — Language & timezone (click to expand)</summary>

  


| Country | Timezone            | Language |
| ------- | ------------------- | -------- |
| US      | `America/New_York`  | `en-US`  |
| GB      | `Europe/London`     | `en-GB`  |
| JP      | `Asia/Tokyo`        | `ja-JP`  |
| DE      | `Europe/Berlin`     | `de-DE`  |
| CN      | `Asia/Shanghai`     | `zh-CN`  |
| FR      | `Europe/Paris`      | `fr-FR`  |
| KR      | `Asia/Seoul`        | `ko-KR`  |
| BR      | `America/Sao_Paulo` | `pt-BR`  |
| IN      | `Asia/Kolkata`      | `en-IN`  |
| SG      | `Asia/Singapore`    | `en-SG`  |

*12 locations available; each container picks one independently of device.*

</details>

<details>

<summary><b>Noise Layer</b> — Randomized Canvas/WebGL/Text seeds (click to expand)</summary>

  

- **Canvas Seed** — Persistent per-container random seed injected into `toDataURL()` / `getImageData()` output
- **WebGL Seed** — Persistent per-container random seed injected into WebGL rendering
- **Text Seed** — Persistent per-container random seed injected into glyph advance widths at the HarfBuzz shaping layer, perturbing `measureText()`, `getBoundingClientRect()`, `offsetWidth`, and all text-metric surfaces **simultaneously and consistently**
- Seeds are **stable across sessions** (persisted to disk) — they are persistent per-container and not intended to be used as cross-site identifiers
- Reuses RFP's existing `RandomizePixels` / `GenerateKey` infrastructure, bucketed by `OriginAttributes`

</details>

### Text Metric Perturbation

Unlike Canvas/WebGL noise (which randomizes pixel output), the **Text Seed** modifies glyph advance widths **at the shaping layer** (`gfxHarfBuzzShaper::ShapeText`), upstream of all text-metric consumers. This ensures cross-surface consistency: `measureText()`, `getBoundingClientRect()`, and `offsetWidth` all return the **same** perturbed values.

**How it defeats fingerprinting:**

- **Per-glyph deltas** — Each glyph receives a deterministic ±0.05px perturbation derived from `textSeedHash ^ glyphCodepoint`, not a uniform offset. This defeats linear-regression attacks that can crack a constant-offset scheme (like Camoufox's approach).
- **Per-container isolation** — The `textSeed` is unique per container (`userContextId`), so different containers produce different metric values. The word cache (`WordCacheKey`) includes `userContextId` in its hash to prevent cross-container cache leakage.
- **Cross-surface consistency** — Because perturbation happens at the HarfBuzz shaping layer (before any API consumes the metrics), all downstream surfaces (`CanvasRenderingContext2D.measureText()`, `Element.getBoundingClientRect()`, `Element.offsetWidth`, layout reflow) see identical perturbed values.
- **No anomalous values** — Perturbations are small (±0.05px) and deterministic, so the reported metrics remain plausible and don't trigger anomaly detection in risk engines.

### Font Metric Spoofing (OS Masking)

Text perturbation alone hides the *exact* machine metrics but preserves the host OS's metric *patterns* — enough for an advanced detector to infer the real platform. To achieve **true OS masking** (e.g. a macOS host presenting as Windows), this project layers **real target-OS metric substitution** on top of per-glyph perturbation.

**Two-layer architecture:**

1. **OS metric substitution (primary)** — When a container targets a different OS, glyph advance widths and font-level vertical metrics (ascent, descent, xHeight, capHeight, zero-width) are replaced with the **target OS's real values** from a metric database. This makes `measureText()`, CSS `ch`/`ex`, and `TextMetrics` vertical fields report the target OS's actual values, not the host's.
2. **Per-glyph perturbation (fallback/overlay)** — When target-OS data is unavailable for a font/codepoint, the `textSeed` perturbation from the layer above kicks in as a fallback. When both are active, perturbation adds a small per-container variation on top of the substituted values.

**Metric data sources:**

| Target OS  | Source                                                                          |
| ---------- | ------------------------------------------------------------------------------- |
| **macOS**  | Generated locally at build time from the host's system fonts via `fonttools` (no Apple font data committed to the repo) |
| **Windows**| Open-source metric-compatible fonts (Carlito → Calibri, Liberation → Arial/Times, etc.) |
| **Linux**  | Open-source metric-compatible fonts (Liberation, Noto, etc.)                   |

**Cross-OS font mapping** — A name-mapping table (`gfxFontMetricDatabase::MapFontFamily`) translates between equivalent family names across platforms (e.g. `Segoe UI` ↔ `Helvetica Neue` ↔ `DejaVu Sans`), so a request for "Segoe UI" on a macOS host resolves to the correct target-OS metric record.

**Font enumeration consistency (Gap 3)** — Advanced detectors probe `@font-face { src: local('Segoe UI') }` and `document.fonts.check()` to enumerate the *installed* font roster. To keep "font exists" and "font metrics" in sync:

- When a container spoofs a non-host OS and a `local()` probe names a font that doesn't exist on the host, `CoreTextFontList::LookupLocalFont` substitutes a metric-compatible macOS font (e.g. Helvetica Neue) but **labels the entry with the original probe name** (e.g. "Segoe UI"). This makes the probe resolve successfully while the metric hooks below look up the target-OS metrics.
- All four metric-spoofing call sites (shaping advance widths, `gfxFont::Measure`, `gfxTextRun` CSS units, Canvas `TextMetrics`) key off the font's **entry name** (`gfxFontEntry::Name()`, which holds the original probe name) as a fallback when the family name (overwritten to the `@font-face` alias) doesn't map in the DB. This ensures aliased probes like `@font-face { font-family: "probe"; src: local("Segoe UI") }` resolve to spoofed Segoe UI metrics, not the substitute's real Mac metrics.

### Storage Isolation

Built on Firefox's native **Containers** (`ContextualIdentityService`):

- Each container has a unique `userContextId`
- **Cookies, localStorage, IndexedDB, cache, network cache** — all partitioned by `userContextId`
- Content processes are isolated by container (Fission-compatible)
- Geolocation API returns `PERMISSION_DENIED` in Privacy Mode

### Two Modes, Not One

|       Mode       | Behavior                                                     |
| :--------------: | ------------------------------------------------------------ |
|  **Normal Mode** | Standard Firefox — no container fingerprinting, no isolation |
| **Privacy Mode** | Containers active, each with its own fingerprint profile     |

Switch instantly via the **container button** next to the URL bar.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend UI (Container Panel next to URL bar)               │
│  - Create containers with device + location selection        │
│  - "Regenerate Fingerprint" & "Detailed Edit" per container  │
│  - Active container shown in toolbar button                  │
└────────────────────────────┬─────────────────────────────────┘
                             │ Write
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  FingerprintProfileStore (JS Runtime, Parent Process)        │
│  - Stores Profile by userContextId (JSON, persisted to disk) │
│  - 3-layer random generator: Device DB + Location DB + Noise │
│  - Noise: canvasSeed + webglSeed + textSeed (16 bytes each)  │
│  - Generated once at container creation, fixed across sessions│
│  - Depends only on Adapter interfaces (no direct Firefox API)│
└────────────────────────────┬─────────────────────────────────┘
                             │ Call Firefox internals via Adapter
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  Adapter Layer (thin JS adapters)                            │
│  - ContainerAdapter  → ContextualIdentityService             │
│  - StorageAdapter    → IOUtils (disk read/write)             │
│  - ProfileSyncAdapter → PWindowGlobal IPC trigger            │
└────────────────────────────┬─────────────────────────────────┘
                             │ Sync via PWindowGlobal IPC
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  Content Process Local Cache + nsRFPService Interception     │
│  - Profile cached per-BrowsingContext (zero IPC on hot path) │
│  - GetSpoofed* reads Profile in profileMode                  │
│  - Canvas/WebGL noise via existing per-OA key mechanism      │
│  - Text seed registered with gfxTextFingerprint (per-OA)     │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  gfxHarfBuzzShaper (Two-Layer Font Metric Spoofing)          │
│  - Layer 1: OS metric substitution (primary)                 │
│    advance widths & vertical metrics from target-OS DB       │
│  - Layer 2: Per-glyph ±0.05px delta from textSeedHash        │
│    (fallback when no target-OS data; overlay when both)      │
│  - WordCacheKey includes userContextId (cache isolation)     │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  gfxFontMetricDatabase (Target-OS Metric DB)                 │
│  - font_metrics_{macos,windows,linux}.json (generated)       │
│  - MapFontFamily: cross-OS name equivalence                  │
│  - GetAdvanceWidth / GetFontMetrics (design-unit → px)       │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  CoreTextFontList::LookupLocalFont (Gap 3: Font Enumeration) │
│  - local('Segoe UI') probe → substitute macOS font           │
│  - Entry labeled with original probe name (metric sync)      │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  BrowsingContext Override (Lang / UA / Platform / Timezone)  │
│  + Navigator / nsScreen / MediaDevices / AudioContext API    │
│  + measureText() / getBoundingClientRect() / offsetWidth     │
│  + @font-face local() probes / document.fonts.check()        │
└──────────────────────────────────────────────────────────────┘
```

**Design principles:**

| Principle                   | Implementation                                                              |
| --------------------------- | --------------------------------------------------------------------------- |
| **Separation of concerns**  | Profile generation & UI in JS layer; fingerprint interception in C++ layer  |
| **Adapter pattern**         | Thin adapters isolate Firefox internal API changes from profile logic       |
| **Zero IPC overhead**       | After initial profile sync, content process uses local cache                |
| **Cross-session stability** | Seeds persist to disk per container, not intended as cross-site identifiers |

---

## Getting Started

There are two ways to get Firefox Fingerprint Customizer running:

- **Download a prebuilt binary** — recommended for most users. Every release is compiled automatically by GitHub Actions, so you don't need a toolchain or a terminal.
- **Build from source** — intended for contributors who want to modify the code.

---

### Option 1: Download a Prebuilt Binary (Recommended)

Prebuilt binaries are produced automatically by GitHub Actions for every release tag (`v*`). Three platforms are built in parallel and published together on a single GitHub Release.

1. Go to the [Releases page](https://github.com/juhokotka/firefox-fingerprint-customizer/releases).
2. Under the latest release, download the archive that matches your platform:
   | Platform    | Download file                                               | Architecture                |
   | ----------- | ----------------------------------------------------------- | --------------------------- |
   | **macOS**   | `Firefox-Fingerprint-Customizer-vX.Y.Z-macos-arm64.zip`     | Apple Silicon (M1/M2/M3/M4) |
   | **Linux**   | `Firefox-Fingerprint-Customizer-vX.Y.Z-linux-x86_64.tar.xz` | x86_64                      |
   | **Windows** | `Firefox-Fingerprint-Customizer-vX.Y.Z-windows-x86_64.zip`  | x86_64                      |
3. *(Optional)* Download the matching `.sha256sum` file to verify the download (see below).
4. Extract and launch:

   **macOS** — Unzip the archive, then drag the `.app` bundle into your Applications folder. **Apple Silicon only.**

   **Linux** — Extract the tarball and run the binary inside:
   ```bash
   tar -xf Firefox-Fingerprint-Customizer-vX.Y.Z-linux-x86_64.tar.xz
   cd firefox
   ./firefox
   ```
   **Windows** — Unzip the archive and double-click `firefox.exe`.

#### Verifying the Download (Optional)

Each release ships a `.sha256sum` file alongside every archive. To verify integrity:

```bash
# macOS / Linux
shasum -a 256 <downloaded-archive>
# Compare the output with the contents of the matching .sha256sum file

# Windows (PowerShell)
Get-FileHash <downloaded-archive> -Algorithm SHA256
```

> **Note on platform coverage:** The macOS build targets **Apple Silicon only**. Intel Mac users, as well as anyone who wants to tweak the code, should follow the source-build path below. The Windows build is cross-compiled on Linux with clang-cl (MSVC ABI) — a Tier-1 supported Mozilla configuration — so no Windows toolchain is required on your machine to *use* it.

---

### Option 2: Build from Source (Contributors)

Building from source is the way to go if you want to modify the code, debug, or contribute back.

#### Prerequisites

- **macOS 11+** (Apple Silicon or Intel), **Linux**, or **Windows 10+**
- [Mozilla build dependencies](https://firefox-source-docs.mozilla.org/setup/macos_build.html)
- Python 3.8+, Rust toolchain, Ninja
- ~20 GB free disk space

#### Build

```bash
# Clone the repository
git clone https://github.com/juhokotka/firefox-fingerprint-customizer.git
cd firefox-fingerprint-customizer/firefox-main

# Bootstrap dependencies (first time only)
./mach bootstrap

# Create a Mozconfig (first time only)
cat > mozconfig << 'EOF'
ac_add_options --enable-application=browser
ac_add_options --disable-debug
ac_add_options --enable-optimize
ac_add_options --enable-audit-allocs
EOF

# Build (first build takes ~30-60 min; incremental builds are faster)
./mach build

# Run
./mach run
```

#### Quick Build (JS-only changes)

```bash
# After modifying .js/.sys.mjs/.css files — no C++ rebuild needed
./mach build faster
```

#### Run with Purged Cache

When JS files don't seem to update, purge the startup cache:

```bash
./mach run --purgecaches
# or
obj-*/dist/Nightly.app/Contents/MacOS/firefox --purgecaches
```

> **For maintainers — cutting a release:** The CI workflow in `.github/workflows/build.yml` is triggered by pushing a `v*` tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`). It builds all three platforms, generates SHA256 checksums, and publishes a GitHub Release with the archives attached. Manual runs are also possible from the Actions tab (`workflow_dispatch`).

---

## How It Works

### 1. Container Creation

When a user creates a container via the panel UI:

1. `ContainerEditor.mjs` calls `ContextualIdentityService.create(name, icon, color)`
2. A new `userContextId` is assigned (monotonically increasing)
3. `FingerprintProfileStore.generateProfile()` creates a 3-layer profile:
   - **Device**: randomly picked from `DEVICE_DATABASE` (25 real device variants across Mac/Linux/Windows)
   - **Location**: randomly picked from `LOCATION_DATABASE` (12 countries)
   - **Noise**: fresh random seeds for Canvas/WebGL/Text
4. Profile is persisted to disk (`containers.json` + profile store)

### 2. Profile Sync (Parent → Content Process)

When a container tab is opened:

1. `ContainerProfileSync.syncToTab(tab)` reads the profile from `FingerprintProfileStore`
2. Calls `WindowGlobalParent.updateProfile(profile)` (WebIDL)
3. Profile is converted to `ProfileArgs` IPDL struct and sent via `PWindowGlobal::Msg_UpdateProfile`
4. Content process caches it in `nsTHashMap<uint32_t, UniquePtr<ProfileArgs>>` (keyed by `userContextId`)
5. **All subsequent fingerprint reads use the local cache — zero IPC overhead**

### 3. Fingerprint Interception

In Privacy Mode, `nsRFPService::ShouldResistFingerprinting()` returns `true` for all surfaces. The `GetSpoofed*` methods then read from the cached profile instead of hardcoded values:

| API                               | Interception Point               | Reads From                       |
| --------------------------------- | -------------------------------- | -------------------------------- |
| `navigator.userAgent`             | `Navigator.cpp`                  | `profile.device.userAgent`       |
| `navigator.platform`              | `Navigator.cpp`                  | `profile.device.platform`        |
| `navigator.languages`             | `Navigator.cpp`                  | `profile.location.languages`     |
| `screen.width/height`             | `nsScreen.cpp`                   | `profile.device.screen`          |
| `Canvas.toDataURL()`              | `nsCanvasRenderingContext2D.cpp` | `profile.noise.canvasSeed`       |
| `WebGL.getParameter()`            | `ClientWebGLContext.cpp`         | `profile.noise.webglSeed`        |
| `CanvasRenderingContext2D.measureText()` | `gfxHarfBuzzShaper.cpp`   | `profile.noise.textSeed` + OS metric DB         |
| `Element.getBoundingClientRect()` | `gfxHarfBuzzShaper.cpp`          | `profile.noise.textSeed` + OS metric DB         |
| `Element.offsetWidth`             | `gfxHarfBuzzShaper.cpp`          | `profile.noise.textSeed` + OS metric DB         |
| `TextMetrics` vertical fields     | `gfxFont.cpp` / `CanvasRenderingContext2D.cpp` | OS metric DB (ascent/descent/xHeight) |
| CSS `ch` / `ex` units             | `gfxTextRun.cpp`                 | OS metric DB (zeroWidth / xHeight)              |
| `@font-face { src: local() }`     | `CoreTextFontList.cpp`           | Font roster substitution (Gap 3)                |
| `document.fonts.check()`          | `CoreTextFontList.cpp`           | Font roster substitution (Gap 3)                |
| `AudioContext.sampleRate`         | `AudioContext.cpp`               | `profile.device.audioSampleRate` |
| `Intl.DateTimeFormat`             | `BrowsingContext.cpp`            | `profile.location.timezone`      |
| `MediaDevices.enumerateDevices()` | `MediaDevices.cpp`               | `profile.device.mediaDevices`    |

---

## Configuration

### Key Preferences

| Preference                                               | Default | Description                                    |
| -------------------------------------------------------- | ------- | ---------------------------------------------- |
| `privacy.browser.containerMode`                          | `false` | Master switch for Privacy Mode                 |
| `privacy.userContext.enabled`                            | `false` | Enable Firefox container tabs                  |
| `privacy.userContext.ui.enabled`                         | `false` | Show container UI in new-tab button            |
| `privacy.fingerprint.profileMode`                        | `false` | Enable per-container fingerprint spoofing      |
| `privacy.userContext.newTabContainerOnLeftClick.enabled` | `false` | Left-click new-tab button opens container menu |

### Toggle via `about:config`

```
privacy.browser.containerMode         = true
privacy.userContext.enabled           = true
privacy.userContext.ui.enabled        = true
privacy.fingerprint.profileMode       = true
```

---

## Project Structure

```
firefox-main/
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
│   │   └── preferences/dialogs/
│   │       └── containers.xhtml         # Settings → Containers section
│   └── themes/shared/usercontext/
│       └── container-editor.css         # Panel & editor styling
├── toolkit/components/
│   ├── contextualidentity/
│   │   └── ContextualIdentityService.sys.mjs  # Container registry (containers.json)
│   ├── resistfingerprinting/
│   │   ├── nsRFPService.{h,cpp}         # Fingerprint interception (C++)
│   │   └── FontVisibilityProvider.h     # GetUserContextId() for per-container font substitution
│   └── fingerprintprofile/              # Profile store & adapters
│       ├── FingerprintProfileStore.sys.mjs
│       └── adapters/
│           ├── ContainerAdapter.sys.mjs
│           ├── StorageAdapter.sys.mjs
│           └── ProfileSyncAdapter.sys.mjs
├── dom/
│   ├── ipc/
│   │   ├── PWindowGlobal.ipdl           # UpdateProfile IPC message
│   │   ├── WindowGlobalParent.cpp       # Parent-side profile cache (UniquePtr)
│   │   ├── WindowGlobalChild.cpp        # Child-side profile cache (UniquePtr)
│   │   └── WindowGlobalTypes.ipdlh      # ProfileArgs / FingerprintDeviceArgs / FingerprintNoiseArgs structs
│   └── chrome-webidl/
│       └── FingerprintProfile.webidl    # WebIDL dictionary definitions (incl. textSeed)
├── gfx/thebes/
│   ├── gfxTextFingerprint.{h,cpp}       # Per-container text seed storage (FNV-1a hash, thread-safe)
│   ├── gfxHarfBuzzShaper.cpp            # Two-layer metric spoofing: OS substitution + per-glyph perturbation
│   ├── gfxFontMetricDatabase.{h,cpp}    # Target-OS metric DB + cross-OS font name mapping
│   ├── CoreTextFontList.cpp             # Gap 3: local() probe substitution (font enumeration consistency)
│   ├── gfxFont.h                        # userContextId threading (gfxShapedText, WordCacheKey)
│   ├── gfxFont.cpp                      # Vertical metric spoofing (gfxFont::Measure)
│   ├── gfxTextRun.{h,cpp}               # userContextId propagation + CSS ch/ex spoofing
│   ├── gfxPlatformFontList.cpp          # Profile fontSet whitelist (IsFontAllowedByProfile)
│   ├── font_metrics_{macos,windows,linux}.json  # Generated target-OS metric data (not committed)
│   └── moz.build                        # Build config (gfxTextFingerprint + gfxFontMetricDatabase added)
├── layout/base/
│   └── nsPresContext.{h,cpp}            # GetUserContextId() override (reads BrowsingContext OriginAttributes)
├── tools/fonts/
│   └── extract_font_metrics.py          # Build-time macOS metric extraction (fonttools)
└── docshell/base/
    └── BrowsingContext.{h,cpp}          # Lang/UA/Platform/Timezone overrides
```

---

## Contributing

This project builds on Firefox (Mozilla codebase). To contribute:

1. **Fork & clone** the repository
2. **Use `./mach build faster`** for JS/CSS-only changes (avoids full C++ rebuild)
3. **Run with `--purgecaches`** if JS changes don't seem to take effect
4. **Check the Browser Console** (Cmd+Shift+J) — logging is extensive under `[ContainerButton]` and `[ContainerStatusUI]` prefixes
5. **Follow existing conventions** — `nsTHashMap` entries must use `UniquePtr` for large structs (255-byte limit)

### Build Verification

```bash
# Syntax check JS files before building
node -c browser/base/content/browser-init.js
node -c browser/base/content/browser.js

# Build JS/CSS only (fast)
./mach build faster

# Full C++ rebuild (after modifying .cpp/.h/.ipdl)
./mach build binaries
```

### Key Engineering Notes

<details>

<summary><b>Important constraints (click to expand)</b></summary>

  


- **`nsTHashMap` entry size limit** — Entries must not exceed 255 bytes. Store large structs (e.g., `ProfileArgs`) behind `UniquePtr`.
- **XUL event handling** — `oncommand` attribute is unreliable for lazy-loaded modules. Use `addEventListener('click')` instead.
- **XUL hbox click events** — `hbox` elements in panels have unreliable click events. Use `toolbarbutton` elements instead.
- **Static imports in xpcshell tests** — `import` with `moz-src:///` URLs don't resolve; use `ChromeUtils.defineESModuleGetters` with `resource://gre/modules/` URLs.
- **Container tab binding** — Tabs are permanently bound to their container at creation. Switching containers opens a new tab (Firefox architectural constraint).
- **Text perturbation hook point** — Perturbation must happen at `gfxHarfBuzzShaper::ShapeText` (the shaping layer), not at individual API surfaces (`measureText`, `getBoundingClientRect`). Hooking at the API level would break cross-surface consistency.
- **Word cache isolation** — `WordCacheKey` must include `userContextId` in its hash (`aUserContextId * 0x1000000`). Without this, shaped words from one container leak into another's cache, breaking per-container isolation.
- **Per-glyph vs. uniform perturbation** — A uniform offset (Camoufox's approach) is detectable via linear regression on `measureText` widths. Per-glyph deltas derived from `seedHash ^ codepoint` defeat this attack.
- **Two-layer font metric spoofing** — OS metric substitution (Layer 1) is the primary mechanism for OS masking; per-glyph perturbation (Layer 2) is a fallback when target-OS data is missing and an overlay adding per-container variation when both are active. Substitution must use *real* target-OS values (not synthetic noise) to avoid anomaly detection.
- **Vertical metric call sites** — `gfxFont::Metrics` is computed once at font init from platform APIs (`CTFontGetAscent`, DWrite, FreeType) and cached, so it cannot be modified per-container at the cached struct level. Vertical spoofing must copy and override at each of the 3 call sites: `gfxTextRun::GetMetricsForCSSUnits` (CSS `ch`/`ex`), `CanvasRenderingContext2D::DrawOrMeasureText` (TextMetrics vertical), and `gfxFont::Measure` (`actualBoundingBoxAscent/Descent`). Derived metrics (`emAscent`, `emDescent`, `maxHeight`, `internalLeading`) must be recomputed after overriding `maxAscent`/`maxDescent`.
- **Gap 3: local() probe metric sync** — When `@font-face { src: local() }` resolves via font substitution, `gfxUserFontSet` overwrites the entry's `FamilyName()` with the `@font-face` family name (often an arbitrary alias). Metric hooks must fall back to `gfxFontEntry::Name()` (the original probe name) when `FamilyName()` doesn't map in the target-OS DB, otherwise "font exists" (Windows) and "font metrics" (Mac) would disagree.

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
