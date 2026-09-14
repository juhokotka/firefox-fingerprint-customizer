/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Per-OS font rosters (the `device.fontSet` whitelist).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS FILE IS GENERATED — DO NOT HAND-EDIT.
 *
 *   macOS:  tools/gen_font_roster.py --os macos
 *   others: tools/gen_font_roster.py --os <windows|linux>
 *
 * Purpose
 * -------
 * `fontSet` is the single source of truth for "which font families a machine of
 * this OS is expected to expose". It is consumed in two places:
 *
 *   1. Visibility — `FontVisibilityProvider::IsFontAllowedByProfile()` /
 *      `IsFontInTargetRoster()`. A family that is not listed is reported to the
 *      page as NOT INSTALLED.
 *   2. Rendering — a listed family is usable for layout, and its metrics are
 *      substituted from the target-OS metric database (font_metrics_*.json).
 *
 * Baseline (must stay explicit, otherwise the list silently drifts)
 * ----------------------------------------------------------------
 *   A stock <OS> install with an en-US locale, i.e. what the OS image ships,
 *   EXCLUDING fonts that are downloaded on demand.
 *
 *   For macOS that means:
 *     include  /System/Library/Fonts/**            (base image)
 *              /System/Library/Fonts/Supplemental/** (default-installed extras)
 *     exclude  /System/Library/AssetsV2/com_apple_MobileAsset_Font<version>/**
 *              (the on-demand asset bundles, e.g. com_apple_MobileAsset_Font8)
 *
 *   The on-demand set (PingFang, Kaiti, Yuanti, Xingkai, Baoli, Hanzipen,
 *   Weibei, Wawa, Yuppy, LingWai, LiSong/LiHei Pro, Hei, SimSong, STXihei,
 *   Osaka, Kyokasho, Nanum*, BIZ_UD*, ToppanBunkyu*, Tsukushi*, ...) is
 *   locale/region-triggered: a real Mac only has it after the OS (or an app)
 *   pulled it in, so it must NOT appear as "stock".
 *
 *   NOTE: "Songti" is NOT part of that on-demand set. Songti SC/TC ship
 *   preinstalled in /System/Library/Fonts/Supplemental/Songti.ttc, so they
 *   belong in the roster. Only the SimSun (Songti) variants delivered as
 *   assets (SimSong.ttc, LiSongPro.ttf) are on-demand.
 *
 * Invariants the generator enforces
 * --------------------------------
 *   - Every entry must exist on the host for the same-OS case, so that
 *     "listed" implies "renderable".
 *   - Entries must be Firefox's family names (as reported by the font list),
 *     not font-file names. File names differ for plenty of entries
 *     ("STHeiti Medium.ttc" -> "Heiti SC"/"Heiti TC",
 *      a Japanese-named .ttc -> "Hiragino Kaku Gothic ProN", ...).
 *   - A family that exists on the target OS only as an on-demand asset must be
 *     excluded (see the baseline above).
 */

/**
 * macOS — base image + Supplemental, minus on-demand assets.
 *
 * Regenerate with `tools/gen_font_roster.py --os macos`. Includes the CJK
 * families every Mac ships (Hiragino Sans GB, Heiti SC/TC, Hiragino Kaku
 * Gothic/Mincho ProN, Apple SD Gothic Neo, Songti SC/TC), and excludes the
 * locale/region-triggered on-demand assets (PingFang, Kaiti, Yuanti, ...), so
 * the list matches a stock en-US install rather than a machine that happened to
 * pull those fonts in.
 */
export const MACOS_ROSTER = [
  "Academy Engraved LET",
  "Al Bayan",
  "Al Nile",
  "Al Tarikh",
  "American Typewriter",
  "Andale Mono",
  "Apple Braille",
  "Apple Chancery",
  "Apple Color Emoji",
  "Apple SD Gothic Neo",
  "Apple Symbols",
  "AppleGothic",
  "AppleMyungjo",
  "Arial",
  "Arial Black",
  "Arial Hebrew",
  "Arial Hebrew Scholar",
  "Arial Narrow",
  "Arial Rounded MT Bold",
  "Arial Unicode MS",
  "Athelas",
  "Avenir",
  "Avenir Next",
  "Avenir Next Condensed",
  "Ayuthaya",
  "Baghdad",
  "Bangla MN",
  "Bangla Sangam MN",
  "Baskerville",
  "Beirut",
  "Big Caslon",
  "Bodoni 72",
  "Bodoni 72 Oldstyle",
  "Bodoni 72 Smallcaps",
  "Bodoni Ornaments",
  "Bradley Hand",
  "Brush Script MT",
  "Chalkboard",
  "Chalkboard SE",
  "Chalkduster",
  "Charter",
  "Cochin",
  "Comic Sans MS",
  "Copperplate",
  "Corsiva Hebrew",
  "Courier",
  "Courier New",
  "Damascus",
  "DecoType Naskh",
  "Devanagari MT",
  "Devanagari Sangam MN",
  "Didot",
  "DIN Alternate",
  "DIN Condensed",
  "Diwan Kufi",
  "Diwan Thuluth",
  "Euphemia UCAS",
  "Farah",
  "Farisi",
  "Futura",
  "Galvji",
  "GB18030 Bitmap",
  "Geeza Pro",
  "Geneva",
  "Georgia",
  "Gill Sans",
  "Grantha Sangam MN",
  "Gujarati MT",
  "Gujarati Sangam MN",
  "Gurmukhi MN",
  "Gurmukhi MT",
  "Gurmukhi Sangam MN",
  "Heiti SC",
  "Heiti TC",
  "Helvetica",
  "Helvetica Neue",
  "Herculanum",
  "Hiragino Kaku Gothic Pro",
  "Hiragino Kaku Gothic ProN",
  "Hiragino Kaku Gothic Std",
  "Hiragino Kaku Gothic StdN",
  "Hiragino Maru Gothic Pro",
  "Hiragino Maru Gothic ProN",
  "Hiragino Mincho Pro",
  "Hiragino Mincho ProN",
  "Hiragino Sans",
  "Hiragino Sans GB",
  "Hoefler Text",
  "Impact",
  "InaiMathi",
  "Iowan Old Style",
  "ITF Devanagari",
  "ITF Devanagari Marathi",
  "Kailasa",
  "Kannada MN",
  "Kannada Sangam MN",
  "Kefa III",
  "Khmer MN",
  "Khmer Sangam MN",
  "Kohinoor Bangla",
  "Kohinoor Devanagari",
  "Kohinoor Gujarati",
  "Kohinoor Telugu",
  "Kokonor",
  "Krungthep",
  "KufiStandardGK",
  "Lao MN",
  "Lao Sangam MN",
  "Lucida Grande",
  "Luminari",
  "Malayalam MN",
  "Malayalam Sangam MN",
  "Marion",
  "Marker Felt",
  "Menlo",
  "Microsoft Sans Serif",
  "Mishafi",
  "Mishafi Gold",
  "Monaco",
  "Mshtakan",
  "Mukta Mahee",
  "Muna",
  "Myanmar MN",
  "Myanmar Sangam MN",
  "Nadeem",
  "New Peninim MT",
  "Noteworthy",
  "Noto Nastaliq Urdu",
  "Noto Sans Adlam",
  "Noto Sans Armenian",
  "Noto Sans Avestan",
  "Noto Sans Bamum",
  "Noto Sans Bassa Vah",
  "Noto Sans Batak",
  "Noto Sans Bhaiksuki",
  "Noto Sans Brahmi",
  "Noto Sans Buginese",
  "Noto Sans Buhid",
  "Noto Sans Canadian Aboriginal",
  "Noto Sans Carian",
  "Noto Sans Caucasian Albanian",
  "Noto Sans Chakma",
  "Noto Sans Cham",
  "Noto Sans Coptic",
  "Noto Sans Cuneiform",
  "Noto Sans Cypriot",
  "Noto Sans Duployan",
  "Noto Sans Egyptian Hieroglyphs",
  "Noto Sans Elbasan",
  "Noto Sans Glagolitic",
  "Noto Sans Gothic",
  "Noto Sans Gunjala Gondi",
  "Noto Sans Hanifi Rohingya",
  "Noto Sans Hanunoo",
  "Noto Sans Hatran",
  "Noto Sans Imperial Aramaic",
  "Noto Sans Inscriptional Pahlavi",
  "Noto Sans Inscriptional Parthian",
  "Noto Sans Javanese",
  "Noto Sans Kaithi",
  "Noto Sans Kannada",
  "Noto Sans Kayah Li",
  "Noto Sans Kharoshthi",
  "Noto Sans Khojki",
  "Noto Sans Khudawadi",
  "Noto Sans Lepcha",
  "Noto Sans Limbu",
  "Noto Sans Linear A",
  "Noto Sans Linear B",
  "Noto Sans Lisu",
  "Noto Sans Lycian",
  "Noto Sans Lydian",
  "Noto Sans Mahajani",
  "Noto Sans Mandaic",
  "Noto Sans Manichaean",
  "Noto Sans Marchen",
  "Noto Sans Masaram Gondi",
  "Noto Sans Meetei Mayek",
  "Noto Sans Mende Kikakui",
  "Noto Sans Meroitic",
  "Noto Sans Miao",
  "Noto Sans Modi",
  "Noto Sans Mongolian",
  "Noto Sans Mro",
  "Noto Sans Multani",
  "Noto Sans Myanmar",
  "Noto Sans Nabataean",
  "Noto Sans Nag Mundari",
  "Noto Sans New Tai Lue",
  "Noto Sans Newa",
  "Noto Sans NKo",
  "Noto Sans Ol Chiki",
  "Noto Sans Old Hungarian",
  "Noto Sans Old Italic",
  "Noto Sans Old North Arabian",
  "Noto Sans Old Permic",
  "Noto Sans Old Persian",
  "Noto Sans Old South Arabian",
  "Noto Sans Old Turkic",
  "Noto Sans Oriya",
  "Noto Sans Osage",
  "Noto Sans Osmanya",
  "Noto Sans Pahawh Hmong",
  "Noto Sans Palmyrene",
  "Noto Sans Pau Cin Hau",
  "Noto Sans PhagsPa",
  "Noto Sans Phoenician",
  "Noto Sans Psalter Pahlavi",
  "Noto Sans Rejang",
  "Noto Sans Samaritan",
  "Noto Sans Saurashtra",
  "Noto Sans Sharada",
  "Noto Sans Siddham",
  "Noto Sans Sora Sompeng",
  "Noto Sans Sundanese",
  "Noto Sans Syloti Nagri",
  "Noto Sans Syriac",
  "Noto Sans Tagalog",
  "Noto Sans Tagbanwa",
  "Noto Sans Tai Le",
  "Noto Sans Tai Tham",
  "Noto Sans Tai Viet",
  "Noto Sans Takri",
  "Noto Sans Thaana",
  "Noto Sans Tifinagh",
  "Noto Sans Tirhuta",
  "Noto Sans Ugaritic",
  "Noto Sans Vai",
  "Noto Sans Wancho",
  "Noto Sans Warang Citi",
  "Noto Sans Yi",
  "Noto Sans Zawgyi",
  "Noto Serif Ahom",
  "Noto Serif Balinese",
  "Noto Serif Hmong Nyiakeng",
  "Noto Serif Myanmar",
  "Noto Serif Yezidi",
  "Optima",
  "Oriya MN",
  "Oriya Sangam MN",
  "Palatino",
  "Papyrus",
  "Party LET",
  "Phosphate",
  "Plantagenet Cherokee",
  "PT Mono",
  "PT Sans",
  "PT Sans Caption",
  "PT Sans Narrow",
  "PT Serif",
  "PT Serif Caption",
  "Raanana",
  "Rockwell",
  "Sana",
  "Sathu",
  "Savoye LET",
  "Seravek",
  "Shree Devanagari 714",
  "SignPainter",
  "Silom",
  "Sinhala MN",
  "Sinhala Sangam MN",
  "Skia",
  "Snell Roundhand",
  "Songti SC",
  "Songti TC",
  "STIX Two Math",
  "STIX Two Text",
  "STIXGeneral",
  "STIXIntegralsD",
  "STIXIntegralsSm",
  "STIXIntegralsUp",
  "STIXIntegralsUpD",
  "STIXIntegralsUpSm",
  "STIXNonUnicode",
  "STIXSizeFiveSym",
  "STIXSizeFourSym",
  "STIXSizeOneSym",
  "STIXSizeThreeSym",
  "STIXSizeTwoSym",
  "STIXVariants",
  "STSong",
  "Sukhumvit Set",
  "Superclarendon",
  "Symbol",
  "System Font",
  "Tahoma",
  "Tamil MN",
  "Tamil Sangam MN",
  "Telugu MN",
  "Telugu Sangam MN",
  "Thonburi",
  "Times",
  "Times New Roman",
  "Trattatello",
  "Trebuchet MS",
  "Verdana",
  "Waseem",
  "Webdings",
  "Wingdings",
  "Wingdings 2",
  "Wingdings 3",
  "Zapf Dingbats",
  "Zapfino",
];

/**
 * Linux — stock desktop (Debian/Ubuntu-ish) families.
 *
 * TODO: same treatment as macOS — needs to be generated from a reference
 * install. In particular the CJK families the target distribution actually
 * ships (e.g. Noto Sans CJK) are NOT listed yet, so CJK fallback on a
 * Linux-target container has nothing to resolve to.
 */
export const LINUX_ROSTER = [
  "Bitstream Charter",
  "Bitstream Vera Sans",
  "Bitstream Vera Sans Mono",
  "Bitstream Vera Serif",
  "Courier 10 Pitch",
  "DejaVu Sans",
  "DejaVu Sans Mono",
  "DejaVu Serif",
  "FreeMono",
  "FreeSans",
  "FreeSerif",
  "Liberation Mono",
  "Liberation Sans",
  "Liberation Serif",
  "Noto Sans",
  "Noto Serif",
  "Ubuntu",
  "Ubuntu Condensed",
  "Ubuntu Mono",
];

/**
 * Linux — Fedora / GNOME variant.
 *
 * Rosters vary by distribution, not only by OS: Fedora ships Cantarell as its
 * UI font and does not install the Ubuntu font family, so the Fedora device
 * entry must not inherit the Ubuntu roster. Devices therefore pick the roster
 * matching the distro named in their UA string.
 *
 * TODO: same generator treatment as macOS.
 */
export const LINUX_ROSTER_FEDORA = [
  "Bitstream Charter",
  "Bitstream Vera Sans",
  "Bitstream Vera Sans Mono",
  "Bitstream Vera Serif",
  "Courier 10 Pitch",
  "DejaVu Sans",
  "DejaVu Sans Mono",
  "DejaVu Serif",
  "FreeMono",
  "FreeSans",
  "FreeSerif",
  "Liberation Mono",
  "Liberation Sans",
  "Liberation Serif",
  "Noto Sans",
  "Noto Serif",
  "Cantarell",
];

/**
 * Windows — stock Windows 10/11 families, including the CJK ones Windows
 * ships (MS Gothic / SimSun / Malgun Gothic) and the scripts Windows covers
 * out of the box.
 */
export const WINDOWS_ROSTER = [
  "Arial",
  "Calibri",
  "Cambria",
  "Candara",
  "Comic Sans MS",
  "Consolas",
  "Constantia",
  "Corbel",
  "Courier New",
  "Ebrima",
  "Franklin Gothic Medium",
  "Gabriola",
  "Gadugi",
  "Georgia",
  "Impact",
  "Javanese Text",
  "Leelawadee UI",
  "Lucida Console",
  "Lucida Sans Unicode",
  "Malgun Gothic",
  "Microsoft Sans Serif",
  "Mongolian Baiti",
  "MS Gothic",
  "MV Boli",
  "Nirmala UI",
  "Palatino Linotype",
  "Segoe Print",
  "Segoe Script",
  "Segoe UI",
  "Segoe UI Emoji",
  "Segoe UI Historic",
  "Segoe UI Symbol",
  "SimSun",
  "Sylfaen",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];
