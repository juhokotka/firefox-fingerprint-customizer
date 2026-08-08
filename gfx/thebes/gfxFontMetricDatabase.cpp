/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gfxFontMetricDatabase.h"

#include "mozilla/UniquePtr.h"
#include "mozilla/StaticMutex.h"
#include "nsCOMPtr.h"
#include "nsDirectoryServiceDefs.h"
#include "nsIFile.h"
#include "nsIInputStream.h"
#include "nsNetUtil.h"
#include "nsPrintfCString.h"
#include "nsServiceManagerUtils.h"
#include "nsStreamUtils.h"
#include "nsThreadUtils.h"
#include "nsXULAppAPI.h"

namespace mozilla {
namespace gfx {

// ---------------------------------------------------------------------------
// Font family cross-OS mapping table
// ---------------------------------------------------------------------------

// Maps font families that exist on one OS to their metric-equivalent on
// another OS. When spoofing, we look up the target OS's font that matches
// the requested family.
struct FontMapping {
  const char* generic;       // CSS generic family (nullptr if not generic)
  const char* macos;
  const char* windows;
  const char* linux;
};

// Fonts that are cross-platform (same name on all OSes) don't need mapping.
// We only map fonts whose names differ across OSes or are platform-exclusive.
static const FontMapping kFontMappings[] = {
    // Generic families → OS default UI fonts
    {"sans-serif", "Helvetica Neue", "Segoe UI", "Liberation Sans"},
    {"serif", "Times", "Times New Roman", "Liberation Serif"},
    {"monospace", "Menlo", "Consolas", "Liberation Mono"},
    {"cursive", "Apple Chancery", "Comic Sans MS", "DejaVu Sans"},
    {"fantasy", "Papyrus", "Impact", "DejaVu Sans"},

    // macOS-exclusive → equivalents on other OSes
    {nullptr, "Helvetica Neue", "Arial", "Liberation Sans"},
    {nullptr, "Helvetica", "Arial", "Liberation Sans"},
    {nullptr, "Menlo", "Consolas", "Liberation Mono"},
    {nullptr, "Monaco", "Consolas", "Liberation Mono"},
    {nullptr, "Avenir", "Segoe UI", "Liberation Sans"},
    {nullptr, "Avenir Next", "Segoe UI", "Liberation Sans"},
    {nullptr, "Geneva", "Tahoma", "Liberation Sans"},
    {nullptr, "Optima", "Segoe UI", "Liberation Sans"},
    {nullptr, "Palatino", "Palatino Linotype", "Liberation Serif"},
    {nullptr, "Times", "Times New Roman", "Liberation Serif"},

    // Windows-exclusive → equivalents on other OSes
    {nullptr, "Segoe UI", "Segoe UI", "Liberation Sans"},
    {nullptr, "Consolas", "Consolas", "Liberation Mono"},
    {nullptr, "Calibri", "Calibri", "Carlito"},
    {nullptr, "Cambria", "Cambria", "Liberation Serif"},
    {nullptr, "Candara", "Candara", "Carlito"},
    {nullptr, "Corbel", "Corbel", "Carlito"},
    {nullptr, "Franklin Gothic Medium", "Franklin Gothic Medium", "Liberation Sans"},
    {nullptr, "Gabriola", "Gabriola", "Liberation Serif"},
    {nullptr, "Gadugi", "Gadugi", "Liberation Sans"},
    {nullptr, "Microsoft Sans Serif", "Microsoft Sans Serif", "Liberation Sans"},
    {nullptr, "MS Gothic", "MS Gothic", "Noto Sans"},
    {nullptr, "Nirmala UI", "Nirmala UI", "Noto Sans"},
    {nullptr, "Segoe Print", "Segoe Print", "Liberation Sans"},
    {nullptr, "Segoe Script", "Segoe Script", "Liberation Sans"},
    {nullptr, "Segoe UI Emoji", "Segoe UI Emoji", "Noto Sans"},
    {nullptr, "Segoe UI Historic", "Segoe UI Historic", "Noto Sans"},
    {nullptr, "Segoe UI Symbol", "Segoe UI Symbol", "Noto Sans"},
    {nullptr, "SimSun", "SimSun", "Noto Sans"},
    {nullptr, "Sylfaen", "Sylfaen", "Liberation Serif"},
    {nullptr, "Tahoma", "Tahoma", "Liberation Sans"},

    // Linux-exclusive → equivalents on other OSes
    {nullptr, "Ubuntu", "Segoe UI", "Ubuntu"},
    {nullptr, "Ubuntu Condensed", "Segoe UI", "Ubuntu Condensed"},
    {nullptr, "Ubuntu Mono", "Consolas", "Ubuntu Mono"},
    {nullptr, "Cantarell", "Segoe UI", "Cantarell"},
    {nullptr, "DejaVu Sans", "Arial", "DejaVu Sans"},
    {nullptr, "DejaVu Sans Mono", "Menlo", "DejaVu Sans Mono"},
    {nullptr, "DejaVu Serif", "Times New Roman", "DejaVu Serif"},
    {nullptr, "Noto Sans", "Arial", "Noto Sans"},
    {nullptr, "Noto Serif", "Times New Roman", "Noto Serif"},
    {nullptr, "FreeSans", "Arial", "FreeSans"},
    {nullptr, "FreeSerif", "Times New Roman", "FreeSerif"},
    {nullptr, "FreeMono", "Courier New", "FreeMono"},

    // Metric-compatible open-source fonts (used as substitutes)
    {nullptr, "Carlito", "Calibri", "Carlito"},
    {nullptr, "Gelasio", "Georgia", "Gelasio"},
    {nullptr, "Liberation Sans", "Arial", "Liberation Sans"},
    {nullptr, "Liberation Serif", "Times New Roman", "Liberation Serif"},
    {nullptr, "Liberation Mono", "Courier New", "Liberation Mono"},
};

// ---------------------------------------------------------------------------
// TargetOS conversion
// ---------------------------------------------------------------------------

// static
gfxFontMetricDatabase::TargetOS gfxFontMetricDatabase::PlatformToOS(
    const nsACString& aPlatform) {
  if (aPlatform.EqualsLiteral("MacIntel") ||
      aPlatform.EqualsLiteral("Macintosh")) {
    return TargetOS::MacOS;
  }
  if (aPlatform.EqualsLiteral("Win32") || aPlatform.EqualsLiteral("Win64") ||
      aPlatform.EqualsLiteral("Windows")) {
    return TargetOS::Windows;
  }
  if (aPlatform.LowerCaseEqualsLiteral("linux x86_64") ||
      aPlatform.LowerCaseEqualsLiteral("linux i686") ||
      aPlatform.LowerCaseEqualsLiteral("linux aarch64") ||
      aPlatform.LowerCaseEqualsASCII("linux")) {
    return TargetOS::Linux;
  }
  return TargetOS::None;
}

// ---------------------------------------------------------------------------
// Font family mapping
// ---------------------------------------------------------------------------

// static
nsCString gfxFontMetricDatabase::MapFontFamily(const nsACString& aFamily,
                                                TargetOS aTarget) {
  if (aTarget == TargetOS::None) {
    return nsCString(aFamily);
  }

  // Look up in the mapping table
  for (const auto& m : kFontMappings) {
    const char* targetName = nullptr;
    const char* sourceName = nullptr;

    switch (aTarget) {
      case TargetOS::MacOS:
        targetName = m.macos;
        break;
      case TargetOS::Windows:
        targetName = m.windows;
        break;
      case TargetOS::Linux:
        targetName = m.linux;
        break;
      default:
        break;
    }

    // Check if the requested family matches any of the source names
    if (aFamily.Equals(m.macos, nsCaseInsensitiveCStringComparator)) {
      sourceName = m.macos;
    } else if (aFamily.Equals(m.windows, nsCaseInsensitiveCStringComparator)) {
      sourceName = m.windows;
    } else if (aFamily.Equals(m.linux, nsCaseInsensitiveCStringComparator)) {
      sourceName = m.linux;
    } else if (m.generic && aFamily.LowerCaseEqualsASCII(m.generic)) {
      sourceName = m.generic;
    }

    if (sourceName && targetName) {
      return nsCString(targetName);
    }
  }

  // No mapping found — return the original family name.
  // The caller will check if the target OS has metrics for it.
  return nsCString(aFamily);
}

// ---------------------------------------------------------------------------
// Metric database storage and loading
// ---------------------------------------------------------------------------

static StaticMutex gDatabaseMutex;

struct DatabaseState {
  bool macosLoaded = false;
  bool windowsLoaded = false;
  bool linuxLoaded = false;
  nsTHashMap<nsCStringHashKey, gfxFontMetricDatabase::FontData> macosFonts;
  nsTHashMap<nsCStringHashKey, gfxFontMetricDatabase::FontData> windowsFonts;
  nsTHashMap<nsCStringHashKey, gfxFontMetricDatabase::FontData> linuxFonts;
};

static DatabaseState& GetState() {
  static DatabaseState sState;
  return sState;
}

// Simple JSON parser for our specific metric file format.
// We parse manually to avoid pulling in a full JSON library dependency
// at the gfx layer.
struct MetricFileParser {
  // The JSON structure is:
  // { "fonts": { "FontName": { "unitsPerEm": 1000, "advanceWidths": {
  // "65": 667 } } } }

  static bool Parse(const nsCString& aJSON,
                    gfxFontMetricDatabase::TargetOS aOS) {
    auto& state = GetState();
    nsTHashMap<nsCStringHashKey, gfxFontMetricDatabase::FontData>* fontMap =
        nullptr;
    switch (aOS) {
      case gfxFontMetricDatabase::TargetOS::MacOS:
        fontMap = &state.macosFonts;
        break;
      case gfxFontMetricDatabase::TargetOS::Windows:
        fontMap = &state.windowsFonts;
        break;
      case gfxFontMetricDatabase::TargetOS::Linux:
        fontMap = &state.linuxFonts;
        break;
      default:
        return false;
    }

    return ParseJSON(aJSON, *fontMap);
  }

 private:
  static bool ParseJSON(const nsCString& aJSON,
                        nsTHashMap<nsCStringHashKey,
                                   gfxFontMetricDatabase::FontData>& aFontMap) {
    // Very simple JSON parser tailored to our file format.
    // This is not a general-purpose JSON parser.
    size_t pos = 0;
    SkipWhitespace(aJSON, pos);

    if (!MatchChar(aJSON, pos, '{')) return false;

    while (pos < aJSON.Length()) {
      SkipWhitespace(aJSON, pos);
      if (MatchChar(aJSON, pos, '}')) break;

      nsCString key;
      if (!ParseString(aJSON, pos, key)) return false;

      SkipWhitespace(aJSON, pos);
      if (!MatchChar(aJSON, pos, ':')) return false;
      SkipWhitespace(aJSON, pos);

      if (key.EqualsLiteral("fonts")) {
        if (!ParseFontsObject(aJSON, pos, aFontMap)) return false;
      } else {
        if (!SkipValue(aJSON, pos)) return false;
      }

      SkipWhitespace(aJSON, pos);
      MatchChar(aJSON, pos, ',');  // optional comma
    }

    return true;
  }

  static bool ParseFontsObject(
      const nsCString& aJSON, size_t& pos,
      nsTHashMap<nsCStringHashKey, gfxFontMetricDatabase::FontData>& aFontMap) {
    if (!MatchChar(aJSON, pos, '{')) return false;

    while (pos < aJSON.Length()) {
      SkipWhitespace(aJSON, pos);
      if (MatchChar(aJSON, pos, '}')) break;

      nsCString fontName;
      if (!ParseString(aJSON, pos, fontName)) return false;

      SkipWhitespace(aJSON, pos);
      if (!MatchChar(aJSON, pos, ':')) return false;
      SkipWhitespace(aJSON, pos);

      gfxFontMetricDatabase::FontData fontData;
      if (!ParseFontObject(aJSON, pos, fontData)) return false;

      aFontMap.InsertOrUpdate(fontName, std::move(fontData));

      SkipWhitespace(aJSON, pos);
      MatchChar(aJSON, pos, ',');
    }

    return true;
  }

  static bool ParseFontObject(const nsCString& aJSON, size_t& pos,
                              gfxFontMetricDatabase::FontData& aData) {
    if (!MatchChar(aJSON, pos, '{')) return false;

    while (pos < aJSON.Length()) {
      SkipWhitespace(aJSON, pos);
      if (MatchChar(aJSON, pos, '}')) break;

      nsCString key;
      if (!ParseString(aJSON, pos, key)) return false;

      SkipWhitespace(aJSON, pos);
      if (!MatchChar(aJSON, pos, ':')) return false;
      SkipWhitespace(aJSON, pos);

      if (key.EqualsLiteral("unitsPerEm")) {
        int64_t val;
        if (!ParseNumber(aJSON, pos, val)) return false;
        aData.unitsPerEm = (uint32_t)val;
      } else if (key.EqualsLiteral("ascender")) {
        int64_t val;
        if (!ParseNumber(aJSON, pos, val)) return false;
        aData.ascender = (int32_t)val;
      } else if (key.EqualsLiteral("descender")) {
        int64_t val;
        if (!ParseNumber(aJSON, pos, val)) return false;
        aData.descender = (int32_t)val;
      } else if (key.EqualsLiteral("lineGap")) {
        int64_t val;
        if (!ParseNumber(aJSON, pos, val)) return false;
        aData.lineGap = (int32_t)val;
      } else if (key.EqualsLiteral("xHeight")) {
        int64_t val;
        if (!ParseNumber(aJSON, pos, val)) return false;
        aData.xHeight = (int32_t)val;
      } else if (key.EqualsLiteral("capHeight")) {
        int64_t val;
        if (!ParseNumber(aJSON, pos, val)) return false;
        aData.capHeight = (int32_t)val;
      } else if (key.EqualsLiteral("advanceWidths")) {
        if (!ParseAdvanceWidths(aJSON, pos, aData)) return false;
      } else {
        if (!SkipValue(aJSON, pos)) return false;
      }

      SkipWhitespace(aJSON, pos);
      MatchChar(aJSON, pos, ',');
    }

    return true;
  }

  static bool ParseAdvanceWidths(const nsCString& aJSON, size_t& pos,
                                 gfxFontMetricDatabase::FontData& aData) {
    if (!MatchChar(aJSON, pos, '{')) return false;

    while (pos < aJSON.Length()) {
      SkipWhitespace(aJSON, pos);
      if (MatchChar(aJSON, pos, '}')) break;

      nsCString codepointStr;
      if (!ParseString(aJSON, pos, codepointStr)) return false;

      SkipWhitespace(aJSON, pos);
      if (!MatchChar(aJSON, pos, ':')) return false;
      SkipWhitespace(aJSON, pos);

      int64_t advance;
      if (!ParseNumber(aJSON, pos, advance)) return false;

      uint32_t codepoint = (uint32_t)strtoul(codepointStr.get(), nullptr, 10);
      aData.advanceWidths.InsertOrUpdate(codepoint, (int32_t)advance);

      SkipWhitespace(aJSON, pos);
      MatchChar(aJSON, pos, ',');
    }

    return true;
  }

  // --- JSON primitive parsers ---

  static void SkipWhitespace(const nsCString& aJSON, size_t& pos) {
    while (pos < aJSON.Length() &&
           (aJSON[pos] == ' ' || aJSON[pos] == '\n' || aJSON[pos] == '\r' ||
            aJSON[pos] == '\t')) {
      pos++;
    }
  }

  static bool MatchChar(const nsCString& aJSON, size_t& pos, char ch) {
    if (pos < aJSON.Length() && aJSON[pos] == ch) {
      pos++;
      return true;
    }
    return false;
  }

  static bool ParseString(const nsCString& aJSON, size_t& pos,
                          nsCString& aOut) {
    if (!MatchChar(aJSON, pos, '"')) return false;
    aOut.Truncate();
    while (pos < aJSON.Length() && aJSON[pos] != '"') {
      if (aJSON[pos] == '\\' && pos + 1 < aJSON.Length()) {
        pos++;
        char esc = aJSON[pos];
        switch (esc) {
          case 'n':
            aOut.Append('\n');
            break;
          case 't':
            aOut.Append('\t');
            break;
          case 'r':
            aOut.Append('\r');
            break;
          case '\\':
            aOut.Append('\\');
            break;
          case '"':
            aOut.Append('"');
            break;
          case '/':
            aOut.Append('/');
            break;
          case 'u':
            // \uXXXX — parse 4 hex digits
            if (pos + 4 < aJSON.Length()) {
              char hex[5] = {aJSON[pos + 1], aJSON[pos + 2], aJSON[pos + 3],
                             aJSON[pos + 4], 0};
              uint32_t cp = strtoul(hex, nullptr, 16);
              if (cp < 0x80) {
                aOut.Append((char)cp);
              } else if (cp < 0x800) {
                aOut.Append((char)(0xC0 | (cp >> 6)));
                aOut.Append((char)(0x80 | (cp & 0x3F)));
              } else {
                aOut.Append((char)(0xE0 | (cp >> 12)));
                aOut.Append((char)(0x80 | ((cp >> 6) & 0x3F)));
                aOut.Append((char)(0x80 | (cp & 0x3F)));
              }
              pos += 4;
            }
            break;
          default:
            aOut.Append(esc);
            break;
        }
        pos++;
      } else {
        aOut.Append(aJSON[pos]);
        pos++;
      }
    }
    return MatchChar(aJSON, pos, '"');
  }

  static bool ParseNumber(const nsCString& aJSON, size_t& pos,
                          int64_t& aOut) {
    bool negative = false;
    if (pos < aJSON.Length() && aJSON[pos] == '-') {
      negative = true;
      pos++;
    }
    int64_t val = 0;
    bool hasDigit = false;
    while (pos < aJSON.Length() && aJSON[pos] >= '0' && aJSON[pos] <= '9') {
      val = val * 10 + (aJSON[pos] - '0');
      hasDigit = true;
      pos++;
    }
    // Skip fractional part if present (we use integer design units)
    if (pos < aJSON.Length() && aJSON[pos] == '.') {
      pos++;
      while (pos < aJSON.Length() && aJSON[pos] >= '0' && aJSON[pos] <= '9') {
        pos++;
      }
    }
    // Skip exponent if present
    if (pos < aJSON.Length() && (aJSON[pos] == 'e' || aJSON[pos] == 'E')) {
      pos++;
      if (pos < aJSON.Length() && (aJSON[pos] == '+' || aJSON[pos] == '-')) {
        pos++;
      }
      while (pos < aJSON.Length() && aJSON[pos] >= '0' && aJSON[pos] <= '9') {
        pos++;
      }
    }
    if (!hasDigit) return false;
    aOut = negative ? -val : val;
    return true;
  }

  static bool SkipValue(const nsCString& aJSON, size_t& pos) {
    SkipWhitespace(aJSON, pos);
    if (pos >= aJSON.Length()) return false;
    char ch = aJSON[pos];
    if (ch == '"') {
      nsCString dummy;
      return ParseString(aJSON, pos, dummy);
    } else if (ch == '{') {
      int depth = 0;
      do {
        if (pos >= aJSON.Length()) return false;
        if (aJSON[pos] == '{') depth++;
        else if (aJSON[pos] == '}') depth--;
        else if (aJSON[pos] == '"') {
          nsCString dummy;
          if (!ParseString(aJSON, pos, dummy)) return false;
          continue;
        }
        pos++;
      } while (depth > 0);
      return true;
    } else if (ch == '[') {
      int depth = 0;
      do {
        if (pos >= aJSON.Length()) return false;
        if (aJSON[pos] == '[') depth++;
        else if (aJSON[pos] == ']') depth--;
        else if (aJSON[pos] == '"') {
          nsCString dummy;
          if (!ParseString(aJSON, pos, dummy)) return false;
          continue;
        }
        pos++;
      } while (depth > 0);
      return true;
    } else {
      int64_t dummy;
      return ParseNumber(aJSON, pos, dummy);
    }
  }
};

// static
void gfxFontMetricDatabase::LoadOSData(TargetOS aOS, const char* aFilename) {
  // Resolve the file from NS_GRE_DIR. On macOS the files end up under
  // browser/fonts/, on Windows/Linux under fonts/. Try both.
  nsCOMPtr<nsIProperties> dirSvc =
      do_GetService(NS_DIRECTORY_SERVICE_CONTRACTID);
  if (!dirSvc) return;

  nsCOMPtr<nsIFile> greDir;
  nsresult rv =
      dirSvc->Get(NS_GRE_DIR, NS_GET_IID(nsIFile), getter_AddRefs(greDir));
  if (NS_FAILED(rv) || !greDir) return;

  // Try "fonts/<filename>" first (Windows/Linux layout)
  nsCOMPtr<nsIFile> fontFile;
  rv = greDir->Clone(getter_AddRefs(fontFile));
  if (NS_FAILED(rv)) return;
  fontFile->AppendNative("fonts"_ns);
  fontFile->AppendNative(nsDependentCString(aFilename));

  bool exists = false;
  fontFile->Exists(&exists);
  if (!exists) {
    // Try "browser/fonts/<filename>" (macOS layout)
    rv = greDir->Clone(getter_AddRefs(fontFile));
    if (NS_FAILED(rv)) return;
    fontFile->AppendNative("browser"_ns);
    fontFile->AppendNative("fonts"_ns);
    fontFile->AppendNative(nsDependentCString(aFilename));
    fontFile->Exists(&exists);
    if (!exists) return;
  }

  nsCOMPtr<nsIInputStream> stream;
  rv = NS_NewLocalFileInputStream(getter_AddRefs(stream), fontFile);
  if (NS_FAILED(rv)) return;

  nsCString data;
  rv = NS_ConsumeStream(stream, UINT32_MAX, data);
  stream->Close();
  if (NS_FAILED(rv)) return;

  MetricFileParser::Parse(data, aOS);
}

// static
void gfxFontMetricDatabase::EnsureLoaded() {
  StaticMutexAutoLock lock(gDatabaseMutex);
  auto& state = GetState();

  if (!state.macosLoaded) {
    LoadOSData(TargetOS::MacOS, "font_metrics_macos.json");
    state.macosLoaded = true;
  }
  if (!state.windowsLoaded) {
    LoadOSData(TargetOS::Windows, "font_metrics_windows.json");
    state.windowsLoaded = true;
  }
  if (!state.linuxLoaded) {
    LoadOSData(TargetOS::Linux, "font_metrics_linux.json");
    state.linuxLoaded = true;
  }
}

// static
nsTHashMap<nsCStringHashKey, gfxFontMetricDatabase::FontData>&
gfxFontMetricDatabase::GetFontMap(TargetOS aOS) {
  auto& state = GetState();
  switch (aOS) {
    case TargetOS::MacOS:
      return state.macosFonts;
    case TargetOS::Windows:
      return state.windowsFonts;
    case TargetOS::Linux:
      return state.linuxFonts;
    default:
      MOZ_CRASH("Unexpected OS");
  }
}

// static
mozilla::Maybe<int32_t> gfxFontMetricDatabase::GetAdvanceWidth(
    TargetOS aOS, const nsACString& aFamily, uint32_t aCodepoint,
    uint32_t* aUnitsPerEm) {
  if (aOS == TargetOS::None) {
    return mozilla::Nothing();
  }

  StaticMutexAutoLock lock(gDatabaseMutex);
  auto& fontMap = GetFontMap(aOS);

  // Try exact match first, then case-insensitive
  const FontData* data = nullptr;
  auto entry = fontMap.Lookup(aFamily);
  if (entry) {
    data = &entry.Data();
  } else {
    nsAutoCString lowerFamily(aFamily);
    ToLowerCase(lowerFamily);
    for (auto iter = fontMap.Iter(); !iter.Done(); iter.Next()) {
      nsAutoCString lowerKey(iter.Key());
      ToLowerCase(lowerKey);
      if (lowerKey.Equals(lowerFamily)) {
        data = &iter.Data();
        break;
      }
    }
  }
  if (!data) {
    return mozilla::Nothing();
  }

  if (aUnitsPerEm) {
    *aUnitsPerEm = data->unitsPerEm;
  }

  auto advanceEntry = data->advanceWidths.Lookup(aCodepoint);
  if (!advanceEntry) {
    return mozilla::Nothing();
  }
  return mozilla::Some(advanceEntry.Data());
}

// static
mozilla::Maybe<gfxFontMetricDatabase::FontMetrics>
gfxFontMetricDatabase::GetFontMetrics(TargetOS aOS, const nsACString& aFamily) {
  if (aOS == TargetOS::None) {
    return mozilla::Nothing();
  }

  StaticMutexAutoLock lock(gDatabaseMutex);
  auto& fontMap = GetFontMap(aOS);

  const FontData* data = nullptr;
  auto entry = fontMap.Lookup(aFamily);
  if (entry) {
    data = &entry.Data();
  } else {
    nsAutoCString lowerFamily(aFamily);
    ToLowerCase(lowerFamily);
    for (auto iter = fontMap.Iter(); !iter.Done(); iter.Next()) {
      nsAutoCString lowerKey(iter.Key());
      ToLowerCase(lowerKey);
      if (lowerKey.Equals(lowerFamily)) {
        data = &iter.Data();
        break;
      }
    }
  }
  if (!data) {
    return mozilla::Nothing();
  }

  FontMetrics metrics;
  metrics.unitsPerEm = data->unitsPerEm;
  metrics.ascender = data->ascender;
  metrics.descender = data->descender;
  metrics.lineGap = data->lineGap;
  metrics.xHeight = data->xHeight;
  metrics.capHeight = data->capHeight;
  return mozilla::Some(metrics);
}

}  // namespace gfx
}  // namespace mozilla
