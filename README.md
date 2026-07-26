<div align="center">

<img src="./docs/readme/readme-banner.svg" alt="Privacy Browser" width="100%">

# Privacy Browser

### A Firefox-based browser with per-container fingerprint customization and isolation

[![Firefox Base](https://img.shields.io/badge/Based%20on-Firefox%20154-FF7139?logo=firefox&logoColor=white)](https://firefox-source-docs.mozilla.org/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)]()
[![License](https://img.shields.io/badge/License-MPL%202.0-green)](https://www.mozilla.org/en-US/MPL/)

</div>

---

> **Not your average privacy browser.** Instead of forcing every user into the *same* fingerprint, Privacy Browser gives each container its **own customizable, randomizable, cross-session-stable fingerprint** — so you can be a MacBook user in Tokyo for one site, and a Linux desktop in Berlin for another, with **zero data leakage** between them.

---

## Table of Contents

- [Why This Project?](#why-this-project)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Why This Project?

Traditional privacy browsers (Tor Browser, LibreWolf with RFP) pursue a **uniform fingerprint** — every user looks identical. But this approach has limitations:

- **Entropy paradox** — the rarer the uniform profile, the easier it is to identify as a privacy-conscious user.
- **No per-site control** — you can't present different identities to different websites.
- **No isolation** — cookies, cache, and storage are shared across all browsing.

**Privacy Browser takes the opposite approach:**

| Traditional RFP | Privacy Browser |
|:---:|:---:|
| One fingerprint for everyone | One fingerprint **per container** |
| Hardcoded timezone (`Atlantic/Reykjavik`) | Choose timezone per container |
| Hardcoded UA (`Windows NT 10.0`) | Real device pools (Mac / Linux / Windows) |
| Shared storage across tabs | **Full storage isolation** by `userContextId` |
| Binary on/off switch | Two modes: **Normal** vs **Privacy Mode** |

Each container gets its own **device fingerprint, location, and noise seed** — persisted across sessions, isolated at the process level.

---

## Key Features

### Per-Container Fingerprinting

Each container carries an independent `FingerprintProfile` with a complete device fingerprint:

<details>
<summary><b>Device Layer</b> — Hardware fingerprint (click to expand)</summary>

| Surface | Example | Source |
|---|---|---|
| User Agent | `Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5...)` | `profile.device.userAgent` |
| Platform | `MacIntel` / `Win32` / `Linux x86_64` | `profile.device.platform` |
| OS CPU | `Intel Mac OS X 14.5` | `profile.device.oscpu` |
| Screen | `2560 × 1440`, `pixelDepth: 30` | `profile.device.screen` |
| Hardware Concurrency | `8` / `10` / `12` / `16` | `profile.device.hardwareConcurrency` |
| Touch Points | `0` (desktop) / `5` / `10` (mobile) | `profile.device.maxTouchPoints` |
| Device Pixel Ratio | `2.0` (Retina) / `1.0` / `1.25` | `profile.device.devicePixelRatio` |
| WebGL Vendor | `Google Inc. (Apple)` | `profile.device.webglVendor` |
| WebGL Renderer | `Apple GPU` | `profile.device.webglRenderer` |
| Font Set | 18 macOS fonts / 22 Linux fonts | `profile.device.fontSet` |
| Media Devices | Microphone, Camera, Speakers | `profile.device.mediaDevices` |
| Audio Sample Rate | `44100` / `48000` | `profile.device.audioSampleRate` |

</details>

<details>
<summary><b>Location Layer</b> — Language & timezone (click to expand)</summary>

| Country | Timezone | Language |
|---|---|---|
| 🇺🇸 US | `America/New_York` | `en-US` |
| 🇬🇧 GB | `Europe/London` | `en-GB` |
| 🇯🇵 JP | `Asia/Tokyo` | `ja-JP` |
| 🇩🇪 DE | `Europe/Berlin` | `de-DE` |
| 🇨🇳 CN | `Asia/Shanghai` | `zh-CN` |
| 🇫🇷 FR | `Europe/Paris` | `fr-FR` |
| 🇰🇷 KR | `Asia/Seoul` | `ko-KR` |
| 🇧🇷 BR | `America/Sao_Paulo` | `pt-BR` |
| 🇮🇳 IN | `Asia/Kolkata` | `en-IN` |
| 🇸🇬 SG | `Asia/Singapore` | `en-SG` |

*12 locations available; each container picks one independently of device.*

</details>

<details>
<summary><b>Noise Layer</b> — Randomized Canvas/WebGL seeds (click to expand)</summary>

- **Canvas Seed** — Persistent per-container random seed injected into `toDataURL()` / `getImageData()` output
- **WebGL Seed** — Persistent per-container random seed injected into WebGL rendering
- Seeds are **stable across sessions** (persisted to disk) — they act as container identifiers, not privacy leaks
- Reuses RFP's existing `RandomizePixels` / `GenerateKey` infrastructure, bucketed by `OriginAttributes`

</details>

### Storage Isolation

Built on Firefox's native **Containers** (`ContextualIdentityService`):

- Each container has a unique `userContextId`
- **Cookies, localStorage, IndexedDB, cache, network cache** — all partitioned by `userContextId`
- Content processes are isolated by container (Fission-compatible)
- Geolocation API returns `PERMISSION_DENIED` in Privacy Mode

### Two Modes, Not One

| Mode | Behavior |
|---|---|
| **Normal Mode** | Standard Firefox — no container fingerprinting, no isolation |
| **Privacy Mode** | Containers active, each with its own fingerprint profile |

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
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  BrowsingContext Override (Lang / UA / Platform / Timezone)  │
│  + Navigator / nsScreen / MediaDevices / AudioContext API    │
└──────────────────────────────────────────────────────────────┘
```

**Design principles:**
- Profile generation & UI in **JS layer** (easy to maintain)
- Fingerprint interception in **C++ layer** (performance-critical)
- **Thin Adapter** isolates Firefox internal API changes
- **Zero IPC overhead** after initial profile sync (local cache in content process)

---

## Getting Started

### Prerequisites

- **macOS 11+** (Apple Silicon or Intel), **Linux**, or **Windows 10+**
- [Mozilla build dependencies](https://firefox-source-docs.mozilla.org/setup/macos_build.html)
- Python 3.8+, Rust toolchain, Ninja
- ~20 GB free disk space

### Build

```bash
# Clone the repository
git clone <your-repo-url> Privacy-Browser
cd Privacy-Browser/firefox-main

# Bootstrap dependencies (first time only)
./mach bootstrap

# Create a Mozconfig (first time only)
echo 'ac_add_options --enable-application=browser' > mozconfig
echo 'ac_add_options --disable-debug' >> mozconfig
echo 'ac_add_options --enable-optimize' >> mozconfig
echo 'ac_add_options --enable-audit-allocs' >> mozconfig

# Build (first build takes ~30-60 min; incremental builds are faster)
./mach build

# Run
./mach run
```

### Quick Build (JS-only changes)

```bash
# After modifying .js/.sys.mjs/.css files — no C++ rebuild needed
./mach build faster
```

### Run with Purged Cache

When JS files don't seem to update, purge the startup cache:

```bash
./mach run --purgecaches
# or
obj-*/dist/Nightly.app/Contents/MacOS/firefox --purgecaches
```

---

## How It Works

### 1. Container Creation

When a user creates a container via the panel UI:

1. `ContainerEditor.mjs` calls `ContextualIdentityService.create(name, icon, color)`
2. A new `userContextId` is assigned (monotonically increasing)
3. `FingerprintProfileStore.generateProfile()` creates a 3-layer profile:
   - **Device**: randomly picked from `DEVICE_DATABASE` (25 real device variants across Mac/Linux/Windows)
   - **Location**: randomly picked from `LOCATION_DATABASE` (12 countries)
   - **Noise**: fresh random seeds for Canvas/WebGL
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

| API | Interception Point | Reads From |
|---|---|---|
| `navigator.userAgent` | `Navigator.cpp:275` | `profile.device.userAgent` |
| `navigator.platform` | `Navigator.cpp:437` | `profile.device.platform` |
| `navigator.languages` | `Navigator.cpp:417` | `profile.location.languages` |
| `screen.width/height` | `nsScreen.cpp` | `profile.device.screen` |
| `Canvas.toDataURL()` | `nsCanvasRenderingContext2D.cpp` | `profile.noise.canvasSeed` |
| `WebGL.getParameter()` | `ClientWebGLContext.cpp` | `profile.noise.webglSeed` |
| `AudioContext.sampleRate` | `AudioContext.cpp` | `profile.device.audioSampleRate` |
| `Intl.DateTimeFormat` | `BrowsingContext.cpp:3827` | `profile.location.timezone` |
| `MediaDevices.enumerateDevices()` | `MediaDevices.cpp` | `profile.device.mediaDevices` |

---

## Configuration

### Key Preferences

| Preference | Default | Description |
|---|---|---|
| `privacy.browser.containerMode` | `false` | Master switch for Privacy Mode |
| `privacy.userContext.enabled` | `false` | Enable Firefox container tabs |
| `privacy.userContext.ui.enabled` | `false` | Show container UI in new-tab button |
| `privacy.fingerprint.profileMode` | `false` | Enable per-container fingerprint spoofing |
| `privacy.userContext.newTabContainerOnLeftClick.enabled` | `false` | Left-click new-tab button opens container menu |

### Toggle via `about:config`

```
privacy.browser.containerMode = true
privacy.userContext.enabled = true
privacy.userContext.ui.enabled = true
privacy.fingerprint.profileMode = true
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
│   │   └── nsRFPService.{h,cpp}         # Fingerprint interception (C++)
│   └── fingerprintprofile/              # NEW: Profile store & adapters
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
│   │   └── WindowGlobalTypes.ipdlh      # ProfileArgs / FingerprintDeviceArgs structs
│   └── chrome-webidl/
│       └── FingerprintProfile.webidl    # WebIDL dictionary definitions
├── docshell/base/
│   └── BrowsingContext.{h,cpp}          # Lang/UA/Platform/Timezone overrides
└── docs/                                # Architecture documentation
    ├── PRIVACY_BROWSER_PLAN.md
    └── firefox/
        ├── containers.md
        ├── canvas.md
        ├── webgl.md
        ├── audio.md
        └── ... (12 surface docs)
```

---

## Documentation

Comprehensive architecture docs live in [`docs/`](./docs):

| Doc | Description |
|---|---|
| [`PRIVACY_BROWSER_PLAN.md`](./docs/PRIVACY_BROWSER_PLAN.md) | Master design document |
| [`firefox/containers.md`](./docs/firefox/containers.md) | Container isolation (ContextualIdentityService) |
| [`firefox/rfp.md`](./docs/firefox/rfp.md) | Resist Fingerprinting framework |
| [`firefox/ipc.md`](./docs/firefox/ipc.md) | PWindowGlobal profile sync |
| [`firefox/browsingcontext.md`](./docs/firefox/browsingcontext.md) | Field-level overrides |
| [`firefox/canvas.md`](./docs/firefox/canvas.md) | Canvas noise injection |
| [`firefox/webgl.md`](./docs/firefox/webgl.md) | WebGL spoofing |
| [`firefox/audio.md`](./docs/firefox/audio.md) | AudioContext fingerprinting |
| [`firefox/navigator.md`](./docs/firefox/navigator.md) | Navigator properties |
| [`firefox/screen.md`](./docs/firefox/screen.md) | Screen dimensions |
| [`firefox/fonts.md`](./docs/firefox/fonts.md) | Font enumeration |
| [`firefox/mediadevices.md`](./docs/firefox/mediadevices.md) | Media device enumeration |
| [`firefox/geolocation.md`](./docs/firefox/geolocation.md) | Geolocation API |
| [`firefox/webrtc.md`](./docs/firefox/webrtc.md) | WebRTC IP leak prevention |
| [`firefox/locale.md`](./docs/firefox/locale.md) | Language/locale spoofing |
| [`firefox/extensions.md`](./docs/firefox/extensions.md) | Extension allow-listing |
| [`firefox/storage.md`](./docs/firefox/storage.md) | Storage partitioning |
| [`firefox/build.md`](./docs/firefox/build.md) | Build system reference |
| [`firefox/prefs.md`](./docs/firefox/prefs.md) | Preference system |
| [`firefox/spidermonkey.md`](./docs/firefox/spidermonkey.md) | JS engine hooks |

---

## Contributing

This project builds on Firefox (Mozilla codebase). To contribute:

1. **Read the [architecture docs](./docs)** first — the codebase is large and the design is non-obvious.
2. **Use `./mach build faster`** for JS/CSS-only changes (avoids full C++ rebuild).
3. **Run with `--purgecaches`** if JS changes don't seem to take effect.
4. **Check the Browser Console** (Cmd+Shift+J) — logging is extensive under `[ContainerButton]` and `[ContainerStatusUI]` prefixes.
5. **Follow existing conventions** — see [project memory](./docs/PRIVACY_BROWSER_PLAN.md) for hard constraints (e.g., `nsTHashMap` entries must use `UniquePtr` for large structs).

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

---

## License

This project is licensed under the **Mozilla Public License 2.0 (MPL 2.0)**, inheriting from Firefox.

See [LICENSE](./LICENSE) (if present) or the [MPL 2.0 text](https://www.mozilla.org/en-US/MPL/).

---

<div align="center">

**Built on [Firefox](https://firefox.com/) · Powered by [Mozilla](https://mozilla.org/)**

*Privacy isn't about blending in — it's about controlling who you appear to be.*

</div>
