#!/usr/bin/env python3
"""
Extract font metric data (advance widths) from font files for cross-platform
font metric spoofing.

Usage:
    python3 extract_font_metrics.py --os macos --output font_metrics_macos.json
    python3 extract_font_metrics.py --os windows --font-dir ./metric-compat-fonts --output font_metrics_windows.json
    python3 extract_font_metrics.py --os linux --font-dir ./metric-compat-fonts --output font_metrics_linux.json

The output JSON has the structure:
{
  "os": "macos",
  "fonts": {
    "Helvetica Neue": {
      "unitsPerEm": 1000,
      "ascender": 951,
      "descender": -212,
      "lineGap": 0,
      "xHeight": 517,
      "capHeight": 714,
      "advanceWidths": {
        "32": 277,   // space
        "65": 667,   // 'A'
        ...
      }
    },
    ...
  }
}

For macOS: reads from system font directories (/System/Library/Fonts, /Library/Fonts).
For Windows/Linux: reads from a specified directory of bundled open-source
metric-compatible fonts (Carlito, Liberation, etc.).
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
except ImportError:
    print("ERROR: fonttools not installed. Run: pip install fonttools", file=sys.stderr)
    sys.exit(1)


# Unicode ranges to extract (Basic Latin, Latin-1 Supplement, Latin Extended,
# common punctuation, digits). We don't need CJK for basic fingerprinting.
CODEPOINT_RANGES = [
    range(0x0020, 0x007F),   # Basic Latin
    range(0x00A0, 0x00FF),   # Latin-1 Supplement
    range(0x0100, 0x017F),   # Latin Extended-A
    range(0x2000, 0x206F),   # General Punctuation
    range(0x20A0, 0x20CF),   # Currency Symbols
    range(0x2200, 0x22FF),   # Mathematical Operators
]

# Target codepoints: all printable ASCII + Latin-1 + common punctuation
TARGET_CODEPOINTS = set()
for r in CODEPOINT_RANGES:
    for cp in r:
        TARGET_CODEPOINTS.add(cp)

# Common font family names used in fingerprinting probes
# We extract metrics for these when found, plus any other fonts in the directory
FINGERPRINT_FONT_NAMES = {
    # Cross-platform
    "Arial", "Arial Black", "Arial Narrow", "Comic Sans MS",
    "Courier New", "Georgia", "Impact", "Lucida Console",
    "Lucida Sans Unicode", "Palatino Linotype", "Tahoma",
    "Times New Roman", "Trebuchet MS", "Verdana",
    # macOS-specific
    "Avenir", "Avenir Next", "Geneva", "Helvetica", "Helvetica Neue",
    "Menlo", "Monaco", "Optima", "Palatino", "Times",
    # Windows-specific
    "Calibri", "Cambria", "Candara", "Consolas", "Constantia", "Corbel",
    "Franklin Gothic Medium", "Gabriola", "Gadugi", "Javanese Text",
    "Leelawadee UI", "Malgun Gothic", "Microsoft Sans Serif",
    "MS Gothic", "MV Boli", "Nirmala UI", "Segoe Print", "Segoe Script",
    "Segoe UI", "Segoe UI Emoji", "Segoe UI Historic", "Segoe UI Symbol",
    "SimSun", "Sylfaen",
    # Linux-specific
    "Bitstream Charter", "Bitstream Vera Sans", "Bitstream Vera Sans Mono",
    "Bitstream Vera Serif", "Courier 10 Pitch", "DejaVu Sans",
    "DejaVu Sans Mono", "DejaVu Serif", "FreeMono", "FreeSans", "FreeSerif",
    "Liberation Mono", "Liberation Sans", "Liberation Serif",
    "Noto Sans", "Noto Serif", "Ubuntu", "Ubuntu Condensed", "Ubuntu Mono",
    "Cantarell",
    # Metric-compatible open-source fonts (used as substitutes)
    "Carlito", "Gelasio",
}

# Metric-compatible font aliases: when generating JSON for a target OS,
# metric-compatible fonts are also published under the proprietary font
# names they are metric-compatible with. This lets the C++ metric database
# look up real OS font names and get correct (or closely approximated)
# advance widths without bundling proprietary font files.
#
# Format: { target_os: { source_family: [output_family_names] } }
# - Exact metric-compatible pairs (e.g., Carlito↔Calibri) produce identical
#   advance widths.
# - Proxy entries (e.g., Liberation Sans → "Segoe UI") provide a plausible
#   approximation when no exact metric-compatible font exists.
METRIC_FONT_ALIASES = {
    "windows": {
        # Exact metric-compatible pairs
        "Carlito":          ["Calibri"],
        "Gelasio":          ["Georgia"],
        "Liberation Sans":  ["Arial"],
        "Liberation Serif": ["Times New Roman"],
        "Liberation Mono":  ["Courier New"],
        # Proxy entries: no exact metric-compatible font exists, so we use
        # the closest available sans/serif/mono font as an approximation.
        # These produce plausible Windows-like metrics without the real font.
        # (Liberation Sans also serves as proxy for Segoe UI, Tahoma, etc.)
        # We use a separate marker to avoid duplicate extraction.
        "_proxy_windows": {
            "Liberation Sans":  ["Segoe UI", "Tahoma", "Microsoft Sans Serif",
                                  "Segoe UI Historic", "Segoe UI Symbol"],
            "Liberation Serif": ["Palatino Linotype", "Cambria"],
            "Liberation Mono":  ["Consolas", "Lucida Console"],
            "Carlito":          ["Candara", "Corbel"],
        },
    },
    "linux": {
        # Liberation/Carlito/Gelasio are real Linux fonts — no aliasing needed.
        # But we also provide proxy entries for common Linux fonts we don't have
        # font files for, using the closest available metric-compatible font.
        "_proxy_linux": {
            "Liberation Sans":  ["DejaVu Sans", "Noto Sans", "FreeSans",
                                  "Ubuntu", "Cantarell"],
            "Liberation Serif": ["DejaVu Serif", "Noto Serif", "FreeSerif"],
            "Liberation Mono":  ["DejaVu Sans Mono", "FreeMono", "Ubuntu Mono"],
        },
    },
    "macos": {
        # macOS metrics are extracted from real system fonts — no aliasing.
    },
}


def get_font_family_name(ttfont):
    """Extract the preferred font family name from the name table."""
    name_table = ttfont["name"]
    # Try preferred family name (nameID 16) first, then font family (nameID 1)
    for name_id in (16, 1):
        for platform_id in (3, 1):  # Windows, Mac
            for encoding_id in ((1, 0), (0, 0)):  # Unicode BMP, Mac Roman
                try:
                    name = name_table.getDebugName(name_id)
                    if name:
                        return name
                except Exception:
                    pass
    return None


def get_font_metrics(ttfont, codepoints):
    """Extract advance widths for the given codepoints from a font."""
    cmap = ttfont.getBestCmap()
    hmtx = ttfont["hmtx"]
    head = ttfont["head"]
    os2 = ttfont.get("OS/2")
    hhea = ttfont.get("hhea")

    units_per_em = head.unitsPerEm

    # OS/2 and hhea metrics
    ascender = os2.sTypoAscender if os2 else (hhea.ascent if hhea else 0)
    descender = os2.sTypoDescender if os2 else (hhea.descent if hhea else 0)
    line_gap = os2.sTypoLineGap if os2 else (hhea.lineGap if hhea else 0)

    # xHeight and capHeight from OS/2
    x_height = getattr(os2, "sxHeight", 0) if os2 else 0
    cap_height = getattr(os2, "sCapHeight", 0) if os2 else 0

    advance_widths = {}
    for cp in codepoints:
        if cp in cmap:
            glyph_name = cmap[cp]
            try:
                advance = hmtx[glyph_name][0]  # (advanceWidth, lsb)
                advance_widths[str(cp)] = advance
            except KeyError:
                pass  # Glyph not in hmtx, skip

    return {
        "unitsPerEm": units_per_em,
        "ascender": ascender,
        "descender": descender,
        "lineGap": line_gap,
        "xHeight": x_height,
        "capHeight": cap_height,
        "advanceWidths": advance_widths,
    }


def scan_font_directory(directory, target_family_names=None):
    """Scan a directory for font files and extract metrics."""
    results = {}
    font_extensions = {".ttf", ".otf", ".ttc"}

    for root, dirs, files in os.walk(directory):
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in font_extensions:
                continue

            filepath = os.path.join(root, filename)
            try:
                # For .ttc (TrueType Collection), try each font in the collection
                if ext == ".ttc":
                    ttfont = TTFont(filepath, fontNumber=0)
                    num_fonts = ttfont.reader.numFonts
                else:
                    ttfont = TTFont(filepath)
                    num_fonts = 1

                for i in range(num_fonts):
                    try:
                        if num_fonts > 1:
                            ttfont = TTFont(filepath, fontNumber=i)

                        family_name = get_font_family_name(ttfont)
                        if not family_name:
                            continue

                        # If we have a target list, only extract for those
                        if target_family_names and family_name not in target_family_names:
                            continue

                        # Skip duplicates (same family already extracted)
                        if family_name in results:
                            continue

                        metrics = get_font_metrics(ttfont, TARGET_CODEPOINTS)
                        if metrics["advanceWidths"]:
                            results[family_name] = metrics
                            print(f"  Extracted: {family_name} "
                                  f"({len(metrics['advanceWidths'])} glyphs) "
                                  f"from {filename}")

                    except Exception as e:
                        # Skip this font in the collection, continue with others
                        pass

            except Exception as e:
                print(f"  WARNING: Could not read {filepath}: {e}", file=sys.stderr)

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Extract font metrics for cross-platform font spoofing"
    )
    parser.add_argument(
        "--os",
        required=True,
        choices=["macos", "windows", "linux"],
        help="Target OS label for the output data",
    )
    parser.add_argument(
        "--font-dir",
        action="append",
        help="Directory to scan for fonts (can be specified multiple times). "
             "If not given, uses system defaults for the host OS.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output JSON file path",
    )
    parser.add_argument(
        "--all-fonts",
        action="store_true",
        help="Extract all fonts found (not just fingerprint-relevant ones)",
    )
    args = parser.parse_args()

    # Determine font directories
    if args.font_dir:
        font_dirs = args.font_dir
    else:
        if sys.platform == "darwin":
            font_dirs = [
                "/System/Library/Fonts",
                "/Library/Fonts",
                os.path.expanduser("~/Library/Fonts"),
            ]
        elif sys.platform.startswith("linux"):
            font_dirs = [
                "/usr/share/fonts",
                "/usr/local/share/fonts",
                os.path.expanduser("~/.fonts"),
                os.path.expanduser("~/.local/share/fonts"),
            ]
        elif sys.platform == "win32":
            font_dirs = [os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")]
        else:
            print(f"ERROR: Unknown platform {sys.platform}", file=sys.stderr)
            sys.exit(1)

    # Filter to fingerprint-relevant fonts unless --all-fonts
    target_names = None if args.all_fonts else FINGERPRINT_FONT_NAMES

    print(f"Extracting font metrics for OS: {args.os}")
    print(f"Font directories: {font_dirs}")
    print(f"Target families: {'ALL' if args.all_fonts else f'{len(target_names)} families'}")
    print()

    all_fonts = {}
    for font_dir in font_dirs:
        if not os.path.isdir(font_dir):
            print(f"  WARNING: Directory not found: {font_dir}", file=sys.stderr)
            continue
        print(f"Scanning: {font_dir}")
        fonts = scan_font_directory(font_dir, target_names)
        all_fonts.update(fonts)

    # Apply metric-compatible font aliases: publish extracted metrics under
    # the target OS's real font names (e.g., Carlito → Calibri for Windows).
    aliases = METRIC_FONT_ALIASES.get(args.os, {})
    proxies = aliases.pop(f"_proxy_{args.os}", {}) if f"_proxy_{args.os}" in aliases else {}
    alias_count = 0
    for source_family, output_names in aliases.items():
        if source_family in all_fonts:
            metrics = all_fonts[source_family]
            for output_name in output_names:
                if output_name not in all_fonts:
                    all_fonts[output_name] = json.loads(json.dumps(metrics))
                    alias_count += 1
                    print(f"  Alias: {source_family} → {output_name}")
    for source_family, output_names in proxies.items():
        if source_family in all_fonts:
            metrics = all_fonts[source_family]
            for output_name in output_names:
                if output_name not in all_fonts:
                    all_fonts[output_name] = json.loads(json.dumps(metrics))
                    alias_count += 1
                    print(f"  Proxy: {source_family} → {output_name}")
    if alias_count:
        print(f"  Added {alias_count} alias/proxy entries")

    output = {
        "os": args.os,
        "codepointRanges": [[r.start, r.stop] for r in CODEPOINT_RANGES],
        "fontCount": len(all_fonts),
        "fonts": all_fonts,
    }

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nExtracted {len(all_fonts)} fonts → {args.output}")
    print(f"File size: {os.path.getsize(args.output) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
