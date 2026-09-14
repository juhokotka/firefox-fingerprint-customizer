#!/usr/bin/env python3
"""
Generate the per-OS font rosters consumed as `device.fontSet`.

    tools/gen_font_roster.py --os macos              # rewrite MACOS_ROSTER
    tools/gen_font_roster.py --os macos --print      # show the list, no writes
    tools/gen_font_roster.py --os linux

WHY THIS EXISTS
---------------
`fontSet` is the single source of truth for "which font families a machine of
this OS is expected to expose". It is used both as the visibility gate
(`FontVisibilityProvider::IsFontAllowedByProfile` / `IsFontInTargetRoster`) and
as the set whose metrics get substituted from `font_metrics_*.json`.

Historically the arrays were hand-written from a *fingerprinting probe list*
(a set of family names that detectors commonly test for), which is not the same
thing as "what the OS actually ships". That produced a roster that was:

  * far too short, so the exposed font list looked synthetic, and
  * outright wrong in places (e.g. "Palatino Linotype", which is a Windows font
    that macOS has never shipped).

So the roster is generated from the OS itself instead of being typed by hand.

BASELINE (keep this explicit, or the list will silently drift again)
-------------------------------------------------------------------
A stock <OS> install with an en-US locale -- i.e. what the OS image ships,
EXCLUDING fonts that are downloaded on demand.

macOS:
    include  /System/Library/Fonts/**              (base image)
             /System/Library/Fonts/Supplemental/** (default-installed extras)
    exclude  /System/Library/AssetsV2/com_apple_MobileAsset_Font*/**

  The AssetsV2 set is the on-demand / locale-triggered one (PingFang, Kaiti,
  Yuanti, Xingkai, Baoli, Hanzipen, Weibei, Wawa, Yuppy, LingWai, LiSong/LiHei
  Pro, Hei, SimSong, STXihei, Osaka, Kyokasho, Nanum*, BIZ_UD*, ToppanBunkyu*,
  Tsukushi*, ...). A real Mac only has it after the OS or an app pulled it in,
  so it must NOT appear as "stock" -- and it is exactly the part that would
  reveal the machine's region.

  NOTE: "Songti" is NOT part of that on-demand set. Songti SC/TC ship
  preinstalled in /System/Library/Fonts/Supplemental/Songti.ttc, so they are
  correctly kept in the roster; only the SimSun (Songti) variants delivered as
  assets (SimSong.ttc, LiSongPro.ttf) are on-demand.

  Families whose name starts with "." are skipped: those are hidden system
  fonts that CSS cannot request anyway (the engine rejects a leading "." too).

Linux:
    include  /usr/share/fonts/** and /usr/local/share/fonts/**
    (run this on a reference install of the target distribution)

Windows: not supported here -- run it on a Windows machine is out of scope for
this script; the WINDOWS roster is maintained separately.

NOTE ON FAMILY NAMES
--------------------
The name recorded must be the *family* name that the engine and the page use,
not the font file name. Plenty of macOS files differ
("STHeiti Medium.ttc" -> "Heiti SC"/"Heiti TC",
 a Japanese-named .ttc -> "Hiragino Kaku Gothic ProN",
 "AppleSDGothicNeo.ttc" -> "Apple SD Gothic Neo"), which is the second reason
this is generated rather than typed.
"""

import argparse
import os
import re
import sys
from pathlib import Path

try:
    from fontTools.ttLib import TTFont, TTCollection
except ImportError:  # pragma: no cover
    print("ERROR: fonttools is not installed.", file=sys.stderr)
    print("       pip install fonttools", file=sys.stderr)
    sys.exit(1)

FONT_EXTS = {".ttf", ".otf", ".ttc", ".otc"}

REPO_ROOT = Path(__file__).resolve().parent.parent
ROSTER_MODULE = (
    REPO_ROOT / "toolkit" / "components" / "fingerprintprofile" / "FontRosterData.sys.mjs"
)

MACOS_INCLUDE_DIRS = [
    Path("/System/Library/Fonts"),
]
# Everything the OS image installs by default lives in Fonts/ or Fonts/Supplemental/.
MACOS_EXCLUDE_DIRS = [
    Path("/System/Library/AssetsV2"),
]

LINUX_INCLUDE_DIRS = [
    Path("/usr/share/fonts"),
    Path("/usr/local/share/fonts"),
]


def family_names(path):
    """Yield the family name(s) of a font file (all faces of a collection)."""
    names = set()
    try:
        if path.suffix.lower() in (".ttc", ".otc"):
            collection = TTCollection(str(path), lazy=True)
            fonts = collection.fonts
        else:
            fonts = [TTFont(str(path), fontNumber=0, lazy=True)]
    except Exception as exc:  # unreadable / unsupported font
        print(f"  WARN cannot read {path}: {exc}", file=sys.stderr)
        return names

    for font in fonts:
        try:
            name_table = font["name"]
        except Exception:
            continue
        # Prefer the typographic family (16), fall back to the family (1), so
        # the recorded name matches what the metric extractor uses.
        for name_id in (16, 1):
            value = name_table.getDebugName(name_id)
            if value:
                names.add(value.strip())
                break
    return names


def scan(dirs, exclude_dirs=()):
    """Return (families, per_family_source_path, skipped_files)."""
    families = {}
    skipped = 0
    for root_dir in dirs:
        if not root_dir.is_dir():
            print(f"  WARN not a directory: {root_dir}", file=sys.stderr)
            continue
        for root, _dirs, files in os.walk(root_dir):
            if any(str(Path(root)).startswith(str(ex)) for ex in exclude_dirs):
                continue
            for filename in files:
                path = Path(root) / filename
                if path.suffix.lower() not in FONT_EXTS:
                    continue
                found = family_names(path)
                if not found:
                    skipped += 1
                for family in found:
                    if family.startswith("."):
                        # Hidden system font; CSS cannot request it.
                        continue
                    families.setdefault(family, str(path))
    return families, skipped


def render_array(const_name, families, generated_by):
    """Render a `export const NAME = [ ... ];` block."""
    lines = [f"export const {const_name} = ["]
    for family in sorted(families, key=str.lower):
        escaped = family.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'  "{escaped}",')
    lines.append("];")
    return "\n".join(lines)


def write_roster(const_name, block, module_path):
    """Replace `export const <const_name> = [...];` in the data module."""
    source = module_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"export const " + re.escape(const_name) + r" = \[.*?\n\];",
        re.DOTALL,
    )
    if not pattern.search(source):
        print(
            f"ERROR: could not find `export const {const_name} = [...]` in {module_path}",
            file=sys.stderr,
        )
        return False
    updated = pattern.sub(block, source, count=1)
    module_path.write_text(updated, encoding="utf-8")
    print(f"wrote {const_name} ({len(block.splitlines()) - 2} families) -> {module_path}")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--os", required=True, choices=["macos", "linux"])
    parser.add_argument(
        "--print",
        dest="print_only",
        action="store_true",
        help="print the roster instead of writing it",
    )
    parser.add_argument(
        "--show-excluded",
        action="store_true",
        help="list families that were found only in the on-demand asset store",
    )
    parser.add_argument(
        "--output",
        default=str(ROSTER_MODULE),
        help="path of the data module to rewrite",
    )
    args = parser.parse_args()

    if args.os == "macos":
        const_name = "MACOS_ROSTER"
        include_dirs = MACOS_INCLUDE_DIRS
        exclude_dirs = MACOS_EXCLUDE_DIRS
    else:
        const_name = "LINUX_ROSTER"
        include_dirs = LINUX_INCLUDE_DIRS
        exclude_dirs = []

    print(f"scanning include dirs for {args.os}...")
    included, skipped = scan(include_dirs)

    excluded = {}
    if exclude_dirs:
        print("scanning on-demand asset store (exclusions)...")
        excluded, _ = scan(exclude_dirs, exclude_dirs=())
        # A family installed by default wins over the same name appearing in the
        # asset store (an asset may simply re-deliver a preinstalled family).
        overlap = sorted(set(included) & set(excluded), key=str.lower)
        for family in overlap:
            del excluded[family]
        if args.show_excluded:
            print(f"\n--- excluded ({len(excluded)}) ---")
            for family in sorted(excluded, key=str.lower):
                print(f"  {family}")
            print()

    roster = {f: included[f] for f in included}
    if excluded:
        for family in excluded:
            roster.pop(family, None)

    print(f"families passed the include filter : {len(included)}")
    if excluded:
        print(f"families removed as on-demand     : {len(excluded)}")
    print(f"final roster size                 : {len(roster)}")
    if skipped:
        print(f"unreadable font files skipped     : {skipped}")
    if not roster:
        print("ERROR: empty roster; refusing to write.", file=sys.stderr)
        return 1

    block = render_array(const_name, roster, args.os)

    if args.print_only:
        print()
        print(block)
        return 0

    return 0 if write_roster(const_name, block, Path(args.output)) else 1


if __name__ == "__main__":
    sys.exit(main())
