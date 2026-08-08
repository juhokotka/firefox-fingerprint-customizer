/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GFX_FONT_METRIC_DATABASE_H
#define GFX_FONT_METRIC_DATABASE_H

#include "mozilla/Maybe.h"
#include "nsTHashMap.h"
#include "nsString.h"
#include "nsTArray.h"
#include <cstdint>

namespace mozilla {
namespace gfx {

/**
 * gfxFontMetricDatabase stores per-OS, per-font-family advance width data
 * extracted from real font files. This enables cross-platform font metric
 * spoofing: when the fingerprint profile targets a different OS, we
 * substitute glyph advance widths with the target OS's real values.
 *
 * Data is loaded from three JSON files bundled in NS_GRE_DIR/fonts/:
 *   - font_metrics_macos.json
 *   - font_metrics_windows.json
 *   - font_metrics_linux.json
 *
 * Each JSON file contains advance widths (in font design units) for common
 * codepoints, plus unitsPerEm for scaling.
 */
class gfxFontMetricDatabase {
 public:
  enum class TargetOS : uint8_t {
    None = 0,    // No spoofing — use real metrics
    MacOS,
    Windows,
    Linux,
  };

  /**
   * Convert a navigator.platform string to a TargetOS enum.
   * "MacIntel" -> MacOS, "Win32" -> Windows, "Linux x86_64" -> Linux.
   */
  static TargetOS PlatformToOS(const nsACString& aPlatform);

  /**
   * Map a font family name to the target OS equivalent.
   * e.g., on macOS target: "Segoe UI" -> "Helvetica Neue"
   *       on Windows target: "Helvetica Neue" -> "Segoe UI"
   *       on Linux target: "Arial" -> "Liberation Sans"
   * Returns the mapped name, or the original if no mapping exists.
   */
  static nsCString MapFontFamily(const nsACString& aFamily, TargetOS aTarget);

  /**
   * Get the advance width (in font design units) for a codepoint in a
   * specific font on a specific OS.
   *
   * @param aOS Target operating system
   * @param aFamily Font family name (already mapped to target OS)
   * @param aCodepoint Unicode codepoint
   * @param aUnitsPerEm Output: units-per-em of the target font (for scaling)
   * @return Advance width in design units, or Nothing if not found
   */
  static mozilla::Maybe<int32_t> GetAdvanceWidth(
      TargetOS aOS, const nsACString& aFamily, uint32_t aCodepoint,
      uint32_t* aUnitsPerEm = nullptr);

  /**
   * Get font-level metrics (ascender, descender, xHeight, capHeight) for
   * a specific font on a specific OS.
   */
  struct FontMetrics {
    int32_t unitsPerEm = 0;
    int32_t ascender = 0;
    int32_t descender = 0;
    int32_t lineGap = 0;
    int32_t xHeight = 0;
    int32_t capHeight = 0;
  };

  static mozilla::Maybe<FontMetrics> GetFontMetrics(
      TargetOS aOS, const nsACString& aFamily);

  /**
   * Load the metric databases from bundled JSON resources.
   * Called once at startup (lazy-initialized on first access).
   */
  static void EnsureLoaded();

  // FontData is public so the JSON parser can populate it.
  struct FontData {
    uint32_t unitsPerEm = 0;
    int32_t ascender = 0;
    int32_t descender = 0;
    int32_t lineGap = 0;
    int32_t xHeight = 0;
    int32_t capHeight = 0;
    nsTHashMap<nsUint32HashKey, int32_t> advanceWidths;
  };

 private:
  gfxFontMetricDatabase() = delete;

  static nsTHashMap<nsCStringHashKey, FontData>& GetFontMap(TargetOS aOS);
  static void LoadOSData(TargetOS aOS, const char* aFilename);
};

}  // namespace gfx
}  // namespace mozilla

#endif  // GFX_FONT_METRIC_DATABASE_H
