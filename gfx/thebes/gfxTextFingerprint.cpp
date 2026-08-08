/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gfxTextFingerprint.h"

#include "gfxFontMetricDatabase.h"
#include "mozilla/StaticMutex.h"
#include "nsTHashMap.h"
#include "nsHashKeys.h"

using namespace mozilla;

static StaticMutex gTextFpLock MOZ_UNANNOTATED;

struct ContainerTextState {
  uint32_t seedHash = 0;
  nsCString targetPlatform;
};

static nsTHashMap<nsUint32HashKey, ContainerTextState>* gStateMap = nullptr;

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
  gStateMap->InsertOrUpdate(aUserContextId, std::move(state));
}

/* static */
void gfxTextFingerprint::ClearSeed(uint32_t aUserContextId) {
  StaticMutexAutoLock lock(gTextFpLock);
  if (gStateMap) {
    gStateMap->Remove(aUserContextId);
  }
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
bool gfxTextFingerprint::GetSpoofedVerticalMetrics(
    uint32_t aUserContextId, const nsACString& aFontFamily,
    const nsACString& aEntryName, float aFontSize, VerticalMetrics& aOut) {
  if (aUserContextId == 0 || aFontFamily.IsEmpty() || aFontSize <= 0) {
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
