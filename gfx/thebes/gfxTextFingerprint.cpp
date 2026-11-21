/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gfxTextFingerprint.h"

#include <algorithm>
#include <cstdio>
#include <cstring>

#include "gfxFontMetricDatabase.h"
#include "mozilla/Atomics.h"
#include "mozilla/Preferences.h"
#include "mozilla/StaticMutex.h"
#include "nsTHashMap.h"
#include "nsTHashSet.h"
#include "nsHashKeys.h"

using namespace mozilla;
using namespace mozilla::gfx;  // for gfxFontMetricDatabase (unified-build safe)

static StaticMutex gTextFpLock MOZ_UNANNOTATED;

struct ContainerTextState {
  uint32_t seedHash = 0;
  nsCString targetPlatform;
  // Full 128-bit key material derived from the profile's textSeed.
  uint8_t textSeed[16] = {0};
  bool hasSeed = false;
};

static nsTHashMap<nsUint32HashKey, ContainerTextState>* gStateMap = nullptr;

// profile revision per container, bumped on every SetSeed/ClearSeed.
static nsTHashMap<nsUint32HashKey, uint32_t>* gEpochMap = nullptr;
static uint32_t gNextEpoch = 1;

static void BumpEpochLocked(uint32_t aUserContextId) {
  if (!gEpochMap) {
    gEpochMap = new nsTHashMap<nsUint32HashKey, uint32_t>();
  }
  gEpochMap->InsertOrUpdate(aUserContextId, gNextEpoch++);
}

// Rate-limiting state for DebugLogOnce(). Guarded by gTextFpLock; capped so a
// page that probes thousands of families cannot flood stderr.
static nsTHashSet<nsCString>* gDebugLogged = nullptr;
static constexpr uint32_t kDebugLogCap = 500;

static uint32_t ComputeSeedHash(const nsTArray<uint8_t>& aSeed) {
  // Simple but well-distributed hash (FNV-1a variant).
  uint32_t hash = 2166136261u;
  for (uint8_t b : aSeed) {
    hash ^= b;
    hash *= 16777619u;
  }
  // Ensure 0 is reserved for "no seed".
  return hash == 0 ? 1 : hash;
}

// ---------------------------------------------------------------------------
// SipHash-2-4 (Aumasson & Bernstein), keyed PRF used to derive per-glyph
// residuals from the full 128-bit textSeed. Self-contained to avoid depending
// on MFBT internals; input sizes here are tiny (family + codepoint).
// ---------------------------------------------------------------------------

static inline uint64_t Rotl64(uint64_t aX, int aShift) {
  return (aX << aShift) | (aX >> (64 - aShift));
}

#define SIPROUND(v0, v1, v2, v3)          \
  do {                                    \
    (v0) += (v1);                         \
    (v1) = Rotl64((v1), 13);              \
    (v1) ^= (v0);                         \
    (v0) = Rotl64((v0), 32);              \
    (v2) += (v3);                         \
    (v3) = Rotl64((v3), 16);              \
    (v3) ^= (v2);                         \
    (v0) += (v3);                         \
    (v3) = Rotl64((v3), 21);              \
    (v3) ^= (v0);                         \
    (v2) += (v1);                         \
    (v1) = Rotl64((v1), 17);              \
    (v1) ^= (v2);                         \
    (v2) = Rotl64((v2), 32);              \
  } while (0)

static uint64_t SipHash24(const uint8_t* aData, size_t aLen, uint64_t aK0,
                          uint64_t aK1) {
  uint64_t v0 = aK0 ^ 0x736f6d6570736575ULL;
  uint64_t v1 = aK1 ^ 0x646f72616e646f6dULL;
  uint64_t v2 = aK0 ^ 0x6c7967656e657261ULL;
  uint64_t v3 = aK1 ^ 0x7465646279746573ULL;

  size_t i = 0;
  for (; i + 8 <= aLen; i += 8) {
    uint64_t m = 0;
    for (int b = 0; b < 8; b++) {
      m |= uint64_t(aData[i + b]) << (8 * b);
    }
    v3 ^= m;
    SIPROUND(v0, v1, v2, v3);
    SIPROUND(v0, v1, v2, v3);
    v0 ^= m;
  }

  uint64_t b = uint64_t(aLen & 0xff) << 56;
  for (size_t j = 0; i + j < aLen; j++) {
    b |= uint64_t(aData[i + j]) << (8 * j);
  }
  v3 ^= b;
  SIPROUND(v0, v1, v2, v3);
  SIPROUND(v0, v1, v2, v3);
  v0 ^= b;
  v2 ^= 0xff;
  SIPROUND(v0, v1, v2, v3);
  SIPROUND(v0, v1, v2, v3);
  SIPROUND(v0, v1, v2, v3);
  SIPROUND(v0, v1, v2, v3);
  return v0 ^ v1 ^ v2 ^ v3;
}

#undef SIPROUND

// Expand an arbitrary-length profile seed into the 16 bytes of key material
// the PRF uses. Seeds of 16+ bytes feed directly (first 16 bytes); shorter
// seeds are XORed over a keyed 128-bit expansion so every byte of key material
// depends on the whole seed. The entropy bound is the original seed length
// either way; this only avoids weak low-entropy key layout.
static void DeriveTextSeed(const nsTArray<uint8_t>& aSeed, uint8_t aOut[16]) {
  std::memset(aOut, 0, 16);
  size_t n = std::min<size_t>(aSeed.Length(), 16);
  const uint8_t* data = aSeed.Elements();
  uint64_t h0 = SipHash24(data, aSeed.Length(), 0x9e3779b97f4a7c15ULL,
                          0xc2b2ae3d27d4eb4fULL);
  uint64_t h1 = SipHash24(data, aSeed.Length(), 0x85ebca6b2f7c7c1dULL,
                          0x27d4eb2f165667c5ULL);
  for (int i = 0; i < 8; i++) {
    aOut[i] = uint8_t(h0 >> (8 * i));
    aOut[8 + i] = uint8_t(h1 >> (8 * i));
  }
  for (size_t i = 0; i < n; i++) {
    aOut[i] ^= data[i];
  }
}

/* static */
void gfxTextFingerprint::SetSeed(uint32_t aUserContextId,
                                 const nsTArray<uint8_t>& aSeed,
                                 const nsACString& aTargetPlatform) {
  if (aSeed.IsEmpty() && aTargetPlatform.IsEmpty()) {
    ClearSeed(aUserContextId);
    return;
  }
  uint32_t hash = aSeed.IsEmpty() ? 0 : ComputeSeedHash(aSeed);
  StaticMutexAutoLock lock(gTextFpLock);
  if (!gStateMap) {
    gStateMap = new nsTHashMap<nsUint32HashKey, ContainerTextState>();
  }
  ContainerTextState state;
  state.seedHash = hash;
  state.targetPlatform = aTargetPlatform;
  if (!aSeed.IsEmpty()) {
    DeriveTextSeed(aSeed, state.textSeed);
    state.hasSeed = true;
  }
  gStateMap->InsertOrUpdate(aUserContextId, std::move(state));
  BumpEpochLocked(aUserContextId);
}

/* static */
void gfxTextFingerprint::ClearSeed(uint32_t aUserContextId) {
  StaticMutexAutoLock lock(gTextFpLock);
  if (gStateMap) {
    gStateMap->Remove(aUserContextId);
  }
  BumpEpochLocked(aUserContextId);
}

/* static */
uint32_t gfxTextFingerprint::GetSeedHash(uint32_t aUserContextId) {
  StaticMutexAutoLock lock(gTextFpLock);
  if (!gStateMap) {
    return 0;
  }
  auto entry = gStateMap->Lookup(aUserContextId);
  return entry ? entry.Data().seedHash : 0;
}

/* static */
nsCString gfxTextFingerprint::GetTargetPlatform(uint32_t aUserContextId) {
  StaticMutexAutoLock lock(gTextFpLock);
  if (!gStateMap) {
    return ""_ns;
  }
  auto entry = gStateMap->Lookup(aUserContextId);
  return entry ? nsCString(entry.Data().targetPlatform) : ""_ns;
}

/* static */
gfxTextFingerprint::ProfileState gfxTextFingerprint::GetProfileState(
    uint32_t aUserContextId) {
  ProfileState state;
  StaticMutexAutoLock lock(gTextFpLock);
  if (!gStateMap) {
    return state;
  }
  auto entry = gStateMap->Lookup(aUserContextId);
  if (entry) {
    state.seedHash = entry.Data().seedHash;
    state.targetPlatform = entry.Data().targetPlatform;
    state.hasSeed = entry.Data().hasSeed;
    if (state.hasSeed) {
      std::memcpy(state.textSeed, entry.Data().textSeed,
                  sizeof(state.textSeed));
    }
  }
  return state;
}

/* static */
int32_t gfxTextFingerprint::GetAdvanceJitterDU(const ProfileState& aState,
                                               const nsACString& aFontFamily,
                                               uint32_t aCodepoint,
                                               uint32_t aUnitsPerEm,
                                               uint32_t aStyleSalt) {
  if (!aState.hasSeed || aUnitsPerEm == 0) {
    return 0;
  }

  // PRF input: normalised family name, a separator, the codepoint and the
  // coarse style discriminator, all little-endian. Family names compare
  // case-insensitively, so fold case to keep one residual per family
  // regardless of how it was spelled.
  nsAutoCString msg;
  msg.Assign(aFontFamily);
  // ASCII case-fold: family names compare case-insensitively, so the residual
  // must not depend on how the family happened to be spelled.
  for (uint32_t i = 0; i < msg.Length(); i++) {
    char c = msg.CharAt(i);
    if (c >= 'A' && c <= 'Z') {
      msg.SetCharAt(i, char(c + ('a' - 'A')));
    }
  }
  msg.Append('\x1f');
  uint8_t tail[8] = {uint8_t(aCodepoint),      uint8_t(aCodepoint >> 8),
                     uint8_t(aCodepoint >> 16), uint8_t(aCodepoint >> 24),
                     uint8_t(aStyleSalt),      uint8_t(aStyleSalt >> 8),
                     uint8_t(aStyleSalt >> 16), uint8_t(aStyleSalt >> 24)};
  msg.Append(reinterpret_cast<const char*>(tail), sizeof(tail));

  uint64_t k0 = 0;
  uint64_t k1 = 0;
  for (int i = 0; i < 8; i++) {
    k0 |= uint64_t(aState.textSeed[i]) << (8 * i);
    k1 |= uint64_t(aState.textSeed[8 + i]) << (8 * i);
  }
  uint64_t h = SipHash24(reinterpret_cast<const uint8_t*>(msg.get()),
                         msg.Length(), k0, k1);

  // Keep the residual on the em's design-unit grid and scale it with the font
  // size: about +-1/256 em, so roughly the same on-screen magnitude as the
  // old fixed 0.05px offset at typical sizes, but without breaking
  // W(2s) == 2W(s).
  int32_t range = int32_t(aUnitsPerEm / 256);
  if (range < 1) {
    range = 1;
  }
  uint32_t span = uint32_t(2 * range + 1);
  return int32_t(h % span) - range;
}

/* static */
uint32_t gfxTextFingerprint::GetProfileEpoch(uint32_t aUserContextId) {
  StaticMutexAutoLock lock(gTextFpLock);
  if (!gEpochMap) {
    return 0;
  }
  auto entry = gEpochMap->Lookup(aUserContextId);
  return entry ? entry.Data() : 0;
}

/* static */
bool gfxTextFingerprint::GetSpoofedVerticalMetrics(
    uint32_t aUserContextId, const nsACString& aFontFamily,
    const nsACString& aEntryName, float aFontSize, VerticalMetrics& aOut) {
  if (aFontFamily.IsEmpty() || aFontSize <= 0) {
    return false;
  }

  nsCString targetPlatform = GetTargetPlatform(aUserContextId);
  if (targetPlatform.IsEmpty()) {
    return false;
  }

  auto targetOS = gfxFontMetricDatabase::PlatformToOS(targetPlatform);
  if (targetOS == gfxFontMetricDatabase::TargetOS::None) {
    return false;
  }

  // Map the font family name to the target OS equivalent. For substitute
  // local() fonts (Gap 3), aFontFamily is the @font-face family name, which
  // may be an arbitrary alias that won't map. Fall back to the entry name,
  // which holds the original local() probe name (e.g. "Segoe UI"), so that
  // "font exists" and "font metrics" stay in sync.
  nsCString mappedFamily =
      gfxFontMetricDatabase::MapFontFamily(aFontFamily, targetOS);
  if (mappedFamily.Equals(aFontFamily, nsCaseInsensitiveCStringComparator) &&
      !aEntryName.IsEmpty()) {
    nsCString mappedFromName =
        gfxFontMetricDatabase::MapFontFamily(aEntryName, targetOS);
    if (!mappedFromName.Equals(aEntryName,
                               nsCaseInsensitiveCStringComparator)) {
      mappedFamily = mappedFromName;
    }
  }

  // Get font-level metrics from the database (ascender, descender, xHeight,
  // capHeight, unitsPerEm — all in font design units)
  auto dbMetrics =
      gfxFontMetricDatabase::GetFontMetrics(targetOS, mappedFamily);
  if (dbMetrics.isNothing() || dbMetrics.ref().unitsPerEm == 0) {
    return false;
  }

  // Convert design units → device pixels:
  //   devicePx = (designUnits / unitsPerEm) * fontSize
  float conv = aFontSize / (float)dbMetrics.ref().unitsPerEm;

  aOut.maxAscent = (float)dbMetrics.ref().ascender * conv;
  // descender is negative in OS/2; maxDescent should be positive
  aOut.maxDescent = (float)(-dbMetrics.ref().descender) * conv;
  aOut.xHeight = (float)dbMetrics.ref().xHeight * conv;
  aOut.capHeight = (float)dbMetrics.ref().capHeight * conv;

  // Get advance width for '0' (codepoint 48) for the 'ch' CSS unit
  auto zeroAdvance = gfxFontMetricDatabase::GetAdvanceWidth(
      targetOS, mappedFamily, uint32_t('0'));
  if (zeroAdvance.isSome()) {
    aOut.zeroWidth = (float)zeroAdvance.ref() * conv;
  } else {
    aOut.zeroWidth = -1.0f;  // no '0' glyph in DB
  }

  return true;
}

// Cached read of the diagnostics pref. Returns true only when
// privacy.fingerprint.debugFontProfile is enabled.
static bool DebugPrefEnabled() {
  // Read by name rather than through StaticPrefs: adding an entry to
  // StaticPrefList.yaml does not necessarily regenerate the generated
  // StaticPrefList_*.h in an existing objdir, which makes the accessor miss at
  // compile time. Cached per process (-1 = not read yet) because this is called
  // from the shaping loop; changing the pref therefore needs a restart.
  static mozilla::Atomic<int32_t> sEnabled(-1);
  int32_t enabled = sEnabled;
  if (enabled < 0) {
    enabled = Preferences::GetBool("privacy.fingerprint.debugFontProfile",
                                   false)
                  ? 1
                  : 0;
    sEnabled = enabled;
  }
  return enabled == 1;
}

/* static */
bool gfxTextFingerprint::DiagnosticsEnabled() { return DebugPrefEnabled(); }

/* static */
void gfxTextFingerprint::DebugLogOnce(const char* aKind,
                                      uint32_t aUserContextId,
                                      const nsACString& aDetail) {
  if (!DebugPrefEnabled()) {
    return;
  }

  // Key on (kind, container, family) so each distinct conclusion is reported
  // once rather than once per family lookup.
  nsCString key(aKind);
  key.Append(':');
  key.AppendInt(aUserContextId);
  key.Append(':');
  key.Append(aDetail);

  StaticMutexAutoLock lock(gTextFpLock);
  if (!gDebugLogged) {
    gDebugLogged = new nsTHashSet<nsCString>();
  }
  if (gDebugLogged->Count() >= kDebugLogCap || gDebugLogged->Contains(key)) {
    return;
  }
  gDebugLogged->Insert(key);

  // Copy first: get() on a temporary nsCString is always NUL-terminated,
  // whereas the input may be a non-terminated substring.
  nsCString detail(aDetail);
  fprintf(stderr, "[FONTSPOOF] %s uc=%u fam=%s\n", aKind, aUserContextId,
          detail.get());
}
