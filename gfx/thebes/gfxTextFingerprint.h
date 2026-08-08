/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GFX_TEXT_FINGERPRINT_H
#define GFX_TEXT_FINGERPRINT_H

#include <cstdint>
#include "nsString.h"
#include "nsTArray.h"

/**
 * Per-container text-metric spoofing state management.
 *
 * Two pieces of state are registered per container (userContextId):
 * 1. textSeed — a random seed for per-glyph perturbation (real-value-hiding)
 * 2. targetPlatform — the navigator.platform string from the fingerprint
 *    profile (e.g., "MacIntel", "Win32", "Linux x86_64"), which determines
 *    which OS's font metrics to substitute (OS-masking)
 *
 * The HarfBuzz shaper queries this state to:
 *  - Substitute glyph advance widths with the target OS's real metric values
 *  - Apply per-glyph perturbation on top (when metric data is unavailable)
 *
 * gfxFont::Metrics spoofing (Gap 1/Gap 2):
 *  - Substitutes maxAscent, maxDescent, xHeight, capHeight, zeroWidth
 *  - Covers Canvas TextMetrics vertical fields and CSS ch/ex units
 *  - Derived metrics (emAscent, emDescent, maxHeight) are recomputed
 *
 * Thread-safe: shaping may happen on worker threads (offscreen canvas).
 */
class gfxTextFingerprint {
 public:
  /**
   * Vertical font metrics that can be spoofed from the metric database.
   * Values are in device pixels (same units as gfxFont::Metrics).
   * Fields set to negative values are not available and should be preserved.
   */
  struct VerticalMetrics {
    float maxAscent = -1.0f;
    float maxDescent = -1.0f;
    float xHeight = -1.0f;
    float capHeight = -1.0f;
    float zeroWidth = -1.0f;  // -1 means "no '0' glyph in DB"
  };

  /**
   * Register a text-metric perturbation seed and target platform for a
   * container. Called from the content process when a profile is received.
   */
  static void SetSeed(uint32_t aUserContextId, const nsTArray<uint8_t>& aSeed,
                      const nsACString& aTargetPlatform = ""_ns);

  /**
   * Remove the state for a container (profile cleared).
   */
  static void ClearSeed(uint32_t aUserContextId);

  /**
   * Get a 32-bit hash of the seed for a container, or 0 if none is set.
   */
  static uint32_t GetSeedHash(uint32_t aUserContextId);

  /**
   * Get the target platform string for a container (e.g., "MacIntel").
   * Returns empty string if no profile is active.
   */
  static nsCString GetTargetPlatform(uint32_t aUserContextId);

  /**
   * Get spoofed vertical metrics for a font, based on the container's target
   * platform. Converts design units from the metric DB to device pixels using
   * the font size.
   *
   * @param aUserContextId Container identity
   * @param aFontFamily Font family name (will be cross-OS mapped)
   * @param aEntryName Font entry name; used as a fallback when aFontFamily
   *                   doesn't map (e.g. an @font-face alias). For substitute
   *                   local() fonts this holds the original probe name such
   *                   as "Segoe UI", keeping "font exists" and "font metrics"
   *                   in sync (Gap 3).
   * @param aFontSize Font size in device pixels (gfxFont::GetAdjustedSize)
   * @param aOut Output: spoofed vertical metrics (only valid if returns true)
   * @return true if spoofing was applied, false if no profile or no data
   */
  static bool GetSpoofedVerticalMetrics(uint32_t aUserContextId,
                                        const nsACString& aFontFamily,
                                        const nsACString& aEntryName,
                                        float aFontSize,
                                        VerticalMetrics& aOut);

 private:
  gfxTextFingerprint() = delete;
};

#endif  // GFX_TEXT_FINGERPRINT_H
