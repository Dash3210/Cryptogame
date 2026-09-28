#!/usr/bin/env python3
"""
Board text normaliser for BrainCipher cryptograms.

BrainCipher is a React Native cryptogram puzzle game.
Non-alphabetic characters are treated as literal punctuation cells on the board.
To maintain playable, high-quality boards, text must satisfy the board-safe
character allowlist:
  letters A-Z a-z, space, period, comma, apostrophe, hyphen. Nothing else.

This module is the single source of truth for text cleaning.
Python standard library only.
"""

from __future__ import annotations

import re

ALLOWLIST = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .,'-")
ALLOWLIST_RE = re.compile(r"^[A-Za-z .,'-]+$")
TIERS = [(151, "Epic"), (101, "Long"), (60, "Medium"), (0, "Short")]
ALPHA_RE = re.compile(r"[A-Za-z]")

# Apparatus prefixes for rule 2(b)
APPARATUS_PREFIXES = [
    "as", "e.g.", "e.g", "i.e.", "i.e", "cf.", "cf", "also",
    "called also", "sometimes", "formerly", "now", "pl.", "sing.", "syn.", "syn"
]

# Trailing dangling connectors for rule 7
CONNECTOR_RE = re.compile(r"(?i)\b(the name of|and|or|of|the|etc\.?|as|but|with|for)$")

# Domain words and phrases for WordNet domain label detection
DOMAIN_WORDS = {
    "psychology", "psychoanalysis", "psychiatry", "botany", "zoology",
    "biology", "anatomy", "astronomy", "chemistry", "physics", "geology",
    "geography", "mathematics", "computing", "computer science", "medicine",
    "law", "military", "nautical", "heraldry", "architecture", "music",
    "economics", "grammar", "logic", "rhetoric", "philosophy", "theology",
    "printing", "mining", "surgery", "linguistics", "genetics", "physiology",
    "electronics",
}
DOMAIN_PHRASES = {"computer science", "civil law", "organic chemistry"}
DOMAIN_QUALIFIERS = {"and", "or", "in", "of", "with", "especially", "usually", "chiefly", "originally", "by", "as"}

ONES = {
    0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
    11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen",
    16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen"
}
TENS = {
    2: "twenty", 3: "thirty", 4: "forty", 5: "fifty",
    6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety"
}

ONES_ORD = {
    1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth",
    6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth",
    11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth", 15: "fifteenth",
    16: "sixteenth", 17: "seventeenth", 18: "eighteenth", 19: "nineteenth"
}
TENS_ORD = {
    2: "twentieth", 3: "thirtieth", 4: "fortieth", 5: "fiftieth",
    6: "sixtieth", 7: "seventieth", 8: "eightieth", 9: "ninetieth"
}


def cardinal_word(n: int) -> str:
    """Convert integer 0-999 into English words."""
    if n < 20:
        return ONES[n]
    if n < 100:
        t, r = divmod(n, 10)
        return TENS[t] if r == 0 else f"{TENS[t]}-{ONES[r]}"
    if n < 1000:
        h, r = divmod(n, 100)
        prefix = f"{ONES[h]} hundred"
        return prefix if r == 0 else f"{prefix} {cardinal_word(r)}"
    return str(n)


def ordinal_word(n: int) -> str:
    """Convert ordinal integer 1-999 into English ordinal words."""
    if n < 20:
        return ONES_ORD.get(n, str(n))
    if n < 100:
        t, r = divmod(n, 10)
        return TENS_ORD[t] if r == 0 else f"{TENS[t]}-{ONES_ORD[r]}"
    if n < 1000:
        h, r = divmod(n, 100)
        if r == 0:
            return f"{ONES[h]} hundredth"
        return f"{ONES[h]} hundred {ordinal_word(r)}"
    return str(n)


def match_case(orig: str, word: str) -> str:
    """Preserve capitalization style of original token."""
    if orig.isupper():
        return word.upper()
    if orig[0].isupper():
        return word[0].upper() + word[1:]
    return word


def normalize_numbers_to_words(text: str) -> tuple[str, bool]:
    """Convert cardinals (0-999), ordinals (1st-999th), and percentages (e.g. 1%)
    to English words, leaving complex math / scientific notation approximate.

    Returns:
        (transformed_text, replaced_flag)
    """
    replaced = False

    # 1. Percentages: e.g. 1% -> one percent
    def repl_pct(m: re.Match) -> str:
        nonlocal replaced
        n = int(m.group(1))
        if 0 <= n <= 999:
            replaced = True
            w = f"{cardinal_word(n)} percent"
            return match_case(m.group(0), w)
        return m.group(0)

    text = re.sub(r"(?<![A-Za-z0-9])(\d+)\s*%", repl_pct, text)

    # 2. Ordinals: e.g. 1st -> first, 19th -> nineteenth
    def repl_ord(m: re.Match) -> str:
        nonlocal replaced
        n = int(m.group(1))
        if 1 <= n <= 999:
            replaced = True
            w = ordinal_word(n)
            return match_case(m.group(0), w)
        return m.group(0)

    text = re.sub(r"(?<![A-Za-z0-9])(\d+)(?:st|nd|rd|th)\b", repl_ord, text, flags=re.IGNORECASE)

    # 3. Cardinals: isolated 0-999 (excluding fractions like 1/2, decimals, exponents)
    def repl_card(m: re.Match) -> str:
        nonlocal replaced
        n = int(m.group(1))
        if 0 <= n <= 999:
            replaced = True
            w = cardinal_word(n)
            return match_case(m.group(0), w)
        return m.group(0)

    text = re.sub(r"(?<![\d/^-])(?<![-–—])(?<!\d\.)\b(\d+)\b(?!\.\d)(?![\d/^]|[-–—]\d)", repl_card, text)
    return text, replaced


def alpha_count(text: str) -> int:
    """Return count of alphabetic letters [A-Za-z]."""
    return len(ALPHA_RE.findall(text or ""))


def char_count(text: str) -> int:
    """Return total character length."""
    return len(text or "")


def tier_for(text: str) -> str:
    """Classify difficulty tier using letter bands:
    Short < 60, Medium 60-100, Long 101-150, Epic > 150 alphabetic letters.
    """
    n = alpha_count(text)
    for threshold, name in TIERS:
        if n >= threshold:
            return name
    return "Short"


def is_apparatus(inner: str) -> bool:
    """Determine whether bracketed inner text is dictionary apparatus.
    Apparatus if:
      (a) starts with an abbreviation of 1 to 6 letters followed by a period,
          e.g. (Astron.) (Bot.) (Obs.) (n.) (R.)
      (b) starts with one of: as, e.g. i.e. cf. also 'called also' sometimes formerly now pl. sing. Syn.
    """
    s = inner.strip()
    if not s:
        return True

    # (a) Abbreviation followed by period
    if re.match(r"^[A-Za-z]{1,6}\.", s):
        return True

    # (b) Listed apparatus indicators
    s_lower = s.lower()
    for p in APPARATUS_PREFIXES:
        if s_lower == p or re.match(r"^" + re.escape(p) + r"[\s,;:.]", s_lower):
            return True

    return False


def is_domain_label(inner: str, prefix_text: str, suffix_text: str) -> bool:
    """Determine whether bracketed inner text is a WordNet or dictionary domain label.

    Domain label if:
      (a) 1-3 lowercase words naming a domain (e.g. psychology, astronomy, computer science),
          excluding grammatical qualifiers.
      (b) 1 lowercase word at the start of a definition.
      (c) 1-3 lowercase words at the start of a sentence or clause followed immediately by a lowercase word.
    """
    inner_clean = inner.strip()
    words = inner_clean.split()
    if not words or len(words) > 3:
        return False
    if not all(re.match(r"^[A-Za-z]+(?:-[A-Za-z]+)*$", w) for w in words):
        return False
    is_lower = all(w.islower() for w in words)
    inner_lower = inner_clean.lower()
    words_lower = [w.lower() for w in words]

    # (a) Explicit domain name or phrase
    if (inner_lower in DOMAIN_WORDS or inner_lower in DOMAIN_PHRASES or any(w in DOMAIN_WORDS for w in words_lower)) and not any(w in DOMAIN_QUALIFIERS for w in words_lower):
        return True

    # (b) Single lowercase word at start of definition is always a domain label
    is_at_start = not re.search(r"[A-Za-z]", prefix_text)
    if is_at_start and len(words) == 1 and is_lower:
        return True

    # (c) 1-3 lowercase words at sentence or clause start followed by a lowercase word
    is_at_clause_start = is_at_start or bool(re.search(r"[.;:]\s*$", prefix_text))
    is_followed_by_lower = bool(re.match(r"^\s*[a-z]", suffix_text))
    if is_at_clause_start and is_lower and is_followed_by_lower:
        return True

    return False


def clean_for_board(text: str, term: str | None = None) -> tuple[str, list[str]]:
    """Clean raw prose into board-safe cryptogram text.

    Args:
        text: Raw definition text to clean.
        term: Optional headword term being defined, used to drop compound-headword tails.

    Returns:
        (cleaned_text, warnings)
        warnings contains short machine-readable tags such as:
        apparatus_removed, domain_label_removed, unwrapped, digits_removed,
        illegal_chars_removed, headword_tail_removed, trailing_connector_trimmed,
        empty_result.
    """
    warnings: list[str] = []
    if not text or not text.strip():
        return "", ["empty_result"]

    # 1. Normalise unicode
    # Curly single quotes & backticks to ASCII apostrophe
    for ch in ("\u2018", "\u2019", "\u201a", "\u201b", "\x60"):
        if ch in text:
            text = text.replace(ch, "'")

    # Curly double quotes to ASCII apostrophe
    for ch in ("\u201c", "\u201d", "\u201e", "\u201f", "\u00ab", "\u00bb"):
        if ch in text:
            text = text.replace(ch, "'")

    # Em dash and en dash to hyphen
    for ch in ("\u2014", "\u2013", "\u2015", "\u2012"):
        if ch in text:
            text = text.replace(ch, "-")

    # Ellipsis to period
    if "\u2026" in text:
        text = text.replace("\u2026", ".")
    text = re.sub(r"\.{3,}", ".", text)

    # 2. Handle bracketed spans: ( ) and [ ]
    apparatus_removed = False
    domain_label_removed = False
    unwrapped = False

    # Process innermost brackets outwards
    bracket_pat = re.compile(r"\(([^()\[\]]*)\)|\[([^()\[\]]*)\]")
    while True:
        m = bracket_pat.search(text)
        if not m:
            break
        inner = m.group(1) if m.group(1) is not None else m.group(2)
        if is_apparatus(inner):
            apparatus_removed = True
            text = text[:m.start()] + " " + text[m.end():]
        elif is_domain_label(inner, text[:m.start()], text[m.end():]):
            domain_label_removed = True
            text = text[:m.start()] + " " + text[m.end():]
        else:
            unwrapped = True
            text = text[:m.start()] + " " + inner + " " + text[m.end():]

    # Clean any unmatched brackets
    if any(b in text for b in "()[]"):
        unwrapped = True
        for b in "()[]":
            text = text.replace(b, " ")

    if apparatus_removed:
        warnings.append("apparatus_removed")
    if domain_label_removed:
        warnings.append("domain_label_removed")
    if unwrapped:
        warnings.append("unwrapped")

    # 3. Convert semicolon to comma. Convert colon to period. Convert a double hyphen to comma.
    text = text.replace(";", ",")
    text = text.replace(":", ".")
    text = re.sub(r"--+", ",", text)

    # Defect 2: Delete example introducer "as," (e.g. ", as, " or " as, " introducing an example)
    # Leaves genuine grammar intact (e.g. "as contrasted with", "as well as", "as a result")
    text = re.sub(r"(?i)(?:,\s*)?\bas,\s*", ", ", text)

    # 4. Handle numbers and digits
    # Strip leading sense enumerations like "1." "2)" "3 ." at definition or clause start
    digits_stripped = False
    if re.search(r"^\s*\d+\s*[\.\)]\s*", text) or re.search(r"(?<=[,.;])\s*\d+\s*[\.\)]\s*", text):
        digits_stripped = True
        text = re.sub(r"^\s*\d+\s*[\.\)]\s*", " ", text)
        text = re.sub(r"(?<=[,.;])\s*\d+\s*[\.\)]\s*", " ", text)

    # Number-to-words normalisation BEFORE digit stripping
    text, num_replaced = normalize_numbers_to_words(text)
    if num_replaced:
        warnings.append("number_replaced")

    # Strip any remaining digits
    if re.search(r"\d", text):
        digits_stripped = True
        text = re.sub(r"\d+", "", text)

    if digits_stripped:
        warnings.append("digits_removed")

    # Collapse basic whitespace and doubled punctuation before sentence handling
    text = re.sub(r"\s+([,.-])", r"\1", text)
    text = re.sub(r",(\s*,)+", ",", text)
    text = re.sub(r",\s*\.", ".", text)
    text = re.sub(r"\.\s*,", ".", text)
    text = re.sub(r"\.{2,}", ".", text)
    text = re.sub(r"([,.])(?=[A-Za-z])", r"\1 ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"^[,.\s-]+", "", text)

    # Protect abbreviations from premature sentence splitting
    temp_text = text
    temp_text = re.sub(r"(?i)\billust\.", "illust\x00", temp_text)
    temp_text = re.sub(r"(?i)\bcf\.", "cf\x00", temp_text)
    temp_text = re.sub(r"(?i)\bobs\.", "obs\x00", temp_text)
    temp_text = re.sub(r"(?i)\bsyn\.", "syn\x00", temp_text)
    temp_text = re.sub(r"(?i)\be\.g\.", "e\x00g\x00", temp_text)
    temp_text = re.sub(r"(?i)\bi\.e\.", "i\x00e\x00", temp_text)
    temp_text = re.sub(r"(?i)\besp\.", "esp\x00", temp_text)

    raw_sentences = [s.strip() for s in re.split(r"(?<=\.)\s+", temp_text) if s.strip()]

    apparatus_label_removed = False
    sense_marker_removed = False
    short_sentence_removed = False
    kept_sentences: list[str] = []

    for s in raw_sentences:
        sent = s.replace("\x00", ".").strip()
        if not sent:
            continue

        # Rule 2: Delete any sentence that starts with "See " or that contains "Illust."
        if re.search(r"(?i)\billust\.", sent) or re.match(r"(?i)^see\s+", sent) or re.match(r"(?i)^see\b[.,;:-]?$", sent):
            apparatus_label_removed = True
            continue

        # Rule 2: Delete cross-reference and apparatus labels wherever they start a sentence or segment
        while True:
            m = re.match(r"(?i)^(?:See also|See|Note|Obs|Syn|Cf|Illust)\b[.,;:-]?\s*", sent)
            if m:
                apparatus_label_removed = True
                sent = sent[m.end():].strip()
            else:
                break

        # Also within sentence segments
        sub_sent, count = re.subn(r"(?i)(?<=[,;-])\s*(?:See also|See|Note|Obs|Syn|Cf|Illust)\b[.,;:-]?\s*", " ", sent)
        if count > 0:
            apparatus_label_removed = True
            sent = sub_sent.strip()

        if not sent:
            continue

        # Rule 3: Delete lone sense markers: single lowercase letter a-e, or single digit, at sentence start immediately followed by capitalized word
        m = re.match(r"^[a-e0-9][\.\)]?\s+(?=[A-Z])", sent)
        if m:
            sense_marker_removed = True
            sent = sent[m.end():].strip()

        if not sent:
            continue

        # Rule 4: Delete any sentence with fewer than 4 words
        words = [w for w in re.findall(r"\b[A-Za-z0-9'-]+\b", sent) if any(c.isalnum() for c in w)]
        if len(words) < 4:
            short_sentence_removed = True
            continue

        # Ensure sentence starts with capital letter if lowercase
        if sent and sent[0].islower():
            sent = sent[0].upper() + sent[1:]

        if not re.search(r"[.?!]$", sent):
            sent = sent + "."
        kept_sentences.append(sent)

    # Defect 3: Drop trailing compound-headword tail sentences whose first word equals the term or term's first word
    headword_tail_removed = False
    if term and len(kept_sentences) > 1:
        term_clean = term.strip().lower()
        term_tokens = re.findall(r"\b[A-Za-z0-9'-]+\b", term_clean)
        if term_tokens:
            headword_targets = {term_clean, term_tokens[0]}
            while len(kept_sentences) > 1:
                last_sent = kept_sentences[-1]
                last_sent_tokens = re.findall(r"\b[A-Za-z0-9'-]+\b", last_sent.lower())
                if last_sent_tokens and last_sent_tokens[0] in headword_targets:
                    kept_sentences.pop()
                    headword_tail_removed = True
                else:
                    break

    if apparatus_label_removed:
        warnings.append("apparatus_label_removed")
    if sense_marker_removed:
        warnings.append("sense_marker_removed")
    if short_sentence_removed:
        warnings.append("short_sentence_removed")
    if headword_tail_removed:
        warnings.append("headword_tail_removed")

    text = " ".join(kept_sentences)

    # 5. Drop any remaining character not in the allowlist
    disallowed = [c for c in text if c not in ALLOWLIST]
    if disallowed:
        warnings.append("illegal_chars_removed")
        text = "".join(c for c in text if c in ALLOWLIST)

    # Collapse whitespace and doubled punctuation
    text = re.sub(r"\s+([,.-])", r"\1", text)
    text = re.sub(r",(\s*,)+", ",", text)
    text = re.sub(r",\s*\.", ".", text)
    text = re.sub(r"\.\s*,", ".", text)
    text = re.sub(r"\.{2,}", ".", text)
    text = re.sub(r"([,.])(?=[A-Za-z])", r"\1 ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"^[,.\s-]+", "", text)

    # Trim trailing dangling connectors, case-insensitively and repeatedly:
    # and, or, of, the, "the name of", etc, as, but, with, for.
    connector_trimmed = False
    while True:
        text = re.sub(r"\s+", " ", text).strip(" ,.-")
        m = CONNECTOR_RE.search(text)
        if m:
            connector_trimmed = True
            text = text[:m.start()].strip(" ,.-")
        else:
            break

    if connector_trimmed:
        warnings.append("trailing_connector_trimmed")

    # Complete the sentence with a period if non-empty and ending with an alphabetic character
    if text and re.search(r"[A-Za-z]$", text):
        text = text + "."

    if not text:
        warnings.append("empty_result")

    # Deduplicate warnings preserving order
    seen: set[str] = set()
    ordered_warnings: list[str] = []
    for w in warnings:
        if w not in seen:
            seen.add(w)
            ordered_warnings.append(w)

    return text, ordered_warnings


if __name__ == "__main__":
    raw_1 = (
        "A figure or trope by which a part of a thing is put for the whole "
        "(as, fifty sail for fifty ships), or the whole for a part "
        "(as, the smiling year for spring), the species for the genus "
        "(as, cutthroat for assassin), the genus for the species "
        "(as, a creature for a man), the name of"
    )
    target_1 = (
        "A figure or trope by which a part of a thing is put for the whole, "
        "or the whole for a part, the species for the genus, or the genus for the species."
    )

    raw_2 = (
        "1. (Astron.) The hiding of a heavenly body from sight by the "
        "intervention of some other of the heavenly bodies; -- applied "
        "especially to eclipses of stars and planets by the moon, and to the "
        "eclipses of satellites of planets by their primaries"
    )
    target_2 = (
        "The hiding of a heavenly body from sight by the intervention of some other of the heavenly bodies, "
        "applied especially to eclipses of stars and planets by the moon, and to the eclipses of satellites "
        "of planets by their primaries."
    )

    raw_hawser = (
        "A large rope made of three strands each containing many yarns. "
        "Note: Three hawsers twisted together make a cable; but it nautical usage "
        "the distinction between cable and hawser is often one of size rather than of manufacture"
    )

    raw_outline = (
        "1. (a) The line which marks the outer limits of an object or figure; "
        "the exterior line or edge; contour. (b) In art: A line drawn by pencil, "
        "pen, graver, or the like, by which the boundary of a figure is indicated"
    )

    raw_signification = (
        "1. The act of signifying; a making known by signs or other means. "
        "A signification of being pleased. Landor. All speaking or signification of "
        "one's mind implies an act or addres of one man to another"
    )

    clean_1, warn_1 = clean_for_board(raw_1)
    clean_2, warn_2 = clean_for_board(raw_2)
    clean_hawser, warn_hawser = clean_for_board(raw_hawser)
    clean_outline, warn_outline = clean_for_board(raw_outline)
    clean_signification, warn_signification = clean_for_board(raw_signification)

    print("=" * 72)
    print("BOARD TEXT NORMALISER SELF-TEST")
    print("=" * 72)

    print("\nROW 1 (Synecdoche):")
    print(f"  RAW:    {raw_1}")
    print(f"  TARGET: {target_1}")
    print(f"  ACTUAL: {clean_1}")
    print(f"  WARNS:  {warn_1}")
    assert ALLOWLIST_RE.match(clean_1), f"Row 1 output violated allowlist: {clean_1}"
    print("  [PASS] Matches allowlist regex ^[A-Za-z .,'-]+$")

    print("\nROW 2 (Occultation):")
    print(f"  RAW:    {raw_2}")
    print(f"  TARGET: {target_2}")
    print(f"  ACTUAL: {clean_2}")
    print(f"  WARNS:  {warn_2}")
    assert ALLOWLIST_RE.match(clean_2), f"Row 2 output violated allowlist: {clean_2}"
    print("  [PASS] Matches allowlist regex ^[A-Za-z .,'-]+$")
    assert clean_2 == target_2, "Row 2 should match target exactly"
    print("  [PASS] Row 2 exactly matches target!")

    print("\nDEFECT ROW 1 (Hawser - colon to period, apparatus note stripped):")
    print(f"  RAW:    {raw_hawser}")
    print(f"  ACTUAL: {clean_hawser}")
    print(f"  WARNS:  {warn_hawser}")
    assert ALLOWLIST_RE.match(clean_hawser), f"Hawser violated allowlist: {clean_hawser}"
    assert "Note" not in clean_hawser, f"Residual 'Note' in hawser: {clean_hawser}"
    print("  [PASS] Hawser clean and matches allowlist regex ^[A-Za-z .,'-]+$")

    print("\nDEFECT ROW 2 (Outline - stray sense markers and context label stripped):")
    print(f"  RAW:    {raw_outline}")
    print(f"  ACTUAL: {clean_outline}")
    print(f"  WARNS:  {warn_outline}")
    assert ALLOWLIST_RE.match(clean_outline), f"Outline violated allowlist: {clean_outline}"
    assert " a The " not in clean_outline and " b In " not in clean_outline, f"Stray markers in outline: {clean_outline}"
    print("  [PASS] Outline clean and matches allowlist regex ^[A-Za-z .,'-]+$")

    print("\nDEFECT ROW 3 (Signification - citation surname Landor stripped):")
    print(f"  RAW:    {raw_signification}")
    print(f"  ACTUAL: {clean_signification}")
    print(f"  WARNS:  {warn_signification}")
    assert ALLOWLIST_RE.match(clean_signification), f"Signification violated allowlist: {clean_signification}"
    assert "Landor" not in clean_signification, f"Residual 'Landor' in signification: {clean_signification}"
    print("  [PASS] Signification clean and matches allowlist regex ^[A-Za-z .,'-]+$")

    raw_psychology = "(psychology) an urge to withdraw or avoid a situation or an object"
    target_psychology = "An urge to withdraw or avoid a situation or an object."
    clean_psychology, warn_psychology = clean_for_board(raw_psychology)

    raw_hydraulic = (
        "Of or pertaining to hydraulics, or to fluids in motion; conveying, or acting by, water; "
        "as, an hydraulic clock, crane, or dock. Hydraulic accumulator, an accumulator for hydraulic "
        "machinery of any kind"
    )
    clean_hydraulic, warn_hydraulic = clean_for_board(raw_hydraulic, term="hydraulic")

    raw_overseer = (
        "One who oversees; a superintendent; a supervisor; as, an overseer of a mill; "
        "specifically, one or certain public officers; as, an overseer of the poor"
    )
    clean_overseer, warn_overseer = clean_for_board(raw_overseer, term="overseer")

    print("\nDEFECT ROW 4 (Domain-label WordNet leak stripped & capitalized):")
    print(f"  RAW:    {raw_psychology}")
    print(f"  TARGET: {target_psychology}")
    print(f"  ACTUAL: {clean_psychology}")
    print(f"  WARNS:  {warn_psychology}")
    assert ALLOWLIST_RE.match(clean_psychology), f"Psychology violated allowlist: {clean_psychology}"
    assert "domain_label_removed" in warn_psychology, f"Missing domain_label_removed warning: {warn_psychology}"
    assert clean_psychology == target_psychology, f"Expected {target_psychology!r}, got {clean_psychology!r}"
    print("  [PASS] Matches allowlist regex ^[A-Za-z .,'-]+$ and equals target.")

    print("\nDEFECT ROW 5 (Hydraulic - example introducer 'as,' and compound-headword tail stripped):")
    print(f"  RAW:    {raw_hydraulic}")
    print(f"  ACTUAL: {clean_hydraulic}")
    print(f"  WARNS:  {warn_hydraulic}")
    assert ALLOWLIST_RE.match(clean_hydraulic), f"Hydraulic violated allowlist: {clean_hydraulic}"
    assert ", as, " not in clean_hydraulic, f"Residual ', as, ' in hydraulic: {clean_hydraulic}"
    assert "Hydraulic accumulator" not in clean_hydraulic, f"Residual headword tail in hydraulic: {clean_hydraulic}"
    assert "headword_tail_removed" in warn_hydraulic, f"Missing headword_tail_removed warning: {warn_hydraulic}"
    print("  [PASS] Hydraulic clean, no 'as, ', headword tail dropped.")

    print("\nDEFECT ROW 6 (Overseer - example introducer 'as,' stripped):")
    print(f"  RAW:    {raw_overseer}")
    print(f"  ACTUAL: {clean_overseer}")
    print(f"  WARNS:  {warn_overseer}")
    assert ALLOWLIST_RE.match(clean_overseer), f"Overseer violated allowlist: {clean_overseer}"
    assert ", as, " not in clean_overseer, f"Residual ', as, ' in overseer: {clean_overseer}"
    print("  [PASS] Overseer clean, no 'as, '.")

    print("\nNUMBER NORMALISATION TESTS (cardinals, ordinals, percentages):")
    num_test_cases = [
        ("the end of the 19th century", "the end of the nineteenth century"),
        ("about 1% of the speed of light", "about one percent of the speed of light"),
        ("factors of 10", "factors of ten"),
    ]
    for raw_num, target_num in num_test_cases:
        norm_res, replaced = normalize_numbers_to_words(raw_num)
        print(f"  RAW:    {raw_num}")
        print(f"  TARGET: {target_num}")
        print(f"  ACTUAL: {norm_res}")
        assert norm_res == target_num, f"Expected {target_num!r}, got {norm_res!r}"
        assert replaced is True, f"Expected replaced=True for {raw_num!r}"
        print(f"  [PASS] Number normalisation matches: {norm_res}")

    # Also test end-to-end through clean_for_board
    clean_num1, warn_num1 = clean_for_board("the end of the 19th century")
    assert clean_num1 == "The end of the nineteenth century."
    assert "number_replaced" in warn_num1
    assert ALLOWLIST_RE.match(clean_num1)

    clean_num2, warn_num2 = clean_for_board("about 1% of the speed of light")
    assert clean_num2 == "About one percent of the speed of light."
    assert "number_replaced" in warn_num2
    assert ALLOWLIST_RE.match(clean_num2)

    clean_num3, warn_num3 = clean_for_board("Calculated in factors of 10.")
    assert clean_num3 == "Calculated in factors of ten."
    assert "number_replaced" in warn_num3
    assert ALLOWLIST_RE.match(clean_num3)
    print("  [PASS] End-to-end clean_for_board tests passed for number cases.")

    print("\n" + "=" * 72)
    print("ALL SELF-TESTS PASSED!")
    print("=" * 72)


