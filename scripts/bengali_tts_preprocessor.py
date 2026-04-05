#!/usr/bin/env python3
"""
Bengali TTS Text Preprocessor
==============================
Fixes inherent vowel (অ-কার) dropping in Bengali TTS engines.

Problem: TTS reads "কর" as "kor" instead of "koro"
Fix: Adds explicit ো-কার to verb forms before TTS generation.

Uses word-boundary-aware regex to avoid breaking compound words.
"""

import re

# ── Exact word replacements (whole word match only) ──────────────────────────
# Format: bare_form → vowel_marked_form
WORD_FIXES: dict[str, str] = {
    # Imperative verbs (তুমি form)
    'কর': 'করো',
    'বল': 'বলো',
    'দেখ': 'দেখো',
    'শোন': 'শোনো',
    'পড়': 'পড়ো',
    'ধর': 'ধরো',
    'রাখ': 'রাখো',
    'চল': 'চলো',
    'লেখ': 'লেখো',
    'খোল': 'খোলো',
    'ফের': 'ফেরো',
    'মান': 'মানো',

    # Simple past (তুমি/সে form)
    'বলল': 'বললো',
    'করল': 'করলো',
    'হল': 'হলো',
    'চলল': 'চললো',
    'গেল': 'গেলো',
    'দিল': 'দিলো',
    'নিল': 'নিলো',
    'এল': 'এলো',
    'ফিরল': 'ফিরলো',
    'পড়ল': 'পড়লো',
    'ফেলল': 'ফেললো',
    'রইল': 'রইলো',
    'ছিল': 'ছিলো',
    'হইল': 'হইলো',
    'থাকল': 'থাকলো',
    'আসল': 'আসলো',
    'দেখল': 'দেখলো',
    'ধরল': 'ধরলো',
    'বসল': 'বসলো',
    'উঠল': 'উঠলো',
    'নামল': 'নামলো',
    'পেল': 'পেলো',
    'কাটল': 'কাটলো',
    'মরল': 'মরলো',
    'জানল': 'জানলো',
    'শুনল': 'শুনলো',
    'বুঝল': 'বুঝলো',
    'রাখল': 'রাখলো',
    'পাঠাল': 'পাঠালো',
    'পৌঁছল': 'পৌঁছলো',

    # Future (আমি form)
    'করব': 'করবো',
    'বলব': 'বলবো',
    'দেখব': 'দেখবো',
    'পারব': 'পারবো',
    'যাব': 'যাবো',
    'আসব': 'আসবো',
    'থাকব': 'থাকবো',
    'দিব': 'দিবো',
    'পাব': 'পাবো',
    'হব': 'হবো',
    'রাখব': 'রাখবো',
    'চাইব': 'চাইবো',
    'খাব': 'খাবো',
    'নেব': 'নেবো',
    'শুনব': 'শুনবো',
    'বুঝব': 'বুঝবো',
    'জানব': 'জানবো',
    'মানব': 'মানবো',
    'ফিরব': 'ফিরবো',
    'ধরব': 'ধরবো',
    'পড়ব': 'পড়বো',
    'লিখব': 'লিখবো',
}

# ── Suffix-based patterns (match word endings) ──────────────────────────────
# These catch verb conjugations we didn't list explicitly
SUFFIX_PATTERNS: list[tuple[str, str]] = [
    # Past tense -ল endings (preceded by vowel signs)
    (r'(িল)\b', r'িলো'),      # -ilo → -ilo (already has vowel, but add ো)
    # Future -ব endings
    (r'([^ো])ব\b', r'\1বো'),   # -b → -bo (only if not already োব)
]

# Bengali punctuation and word boundary chars
_PUNCT = r'[\s।,;:\'"\(\)\[\]\{\}\-\—\–!?\u200C\u200D]'
_WORD_BOUNDARY = rf'(?:^|(?<={_PUNCT[1:-1]})|(?<=\s))'
_WORD_END = rf'(?=$|{_PUNCT})'


def preprocess_bengali_tts(text: str) -> str:
    """
    Preprocess Bengali text for TTS to fix inherent vowel pronunciation.
    Uses whole-word matching to avoid breaking compound words.
    """
    # Apply exact word replacements
    for original, replacement in WORD_FIXES.items():
        # Whole-word match using Bengali word boundaries
        pattern = rf'(?<![অ-ঔক-হড়ঢ়য়ৎংঃঁ]){re.escape(original)}(?![অ-ঔা-ৌক-হড়ঢ়য়ৎংঃঁ্])'
        text = re.sub(pattern, replacement, text)

    return text


def get_fix_stats(texts: list[str]) -> dict[str, int]:
    """Count how many texts would be modified."""
    modified = 0
    total_replacements = 0
    for text in texts:
        fixed = preprocess_bengali_tts(text)
        if fixed != text:
            modified += 1
            # Count individual word changes
            orig_words = text.split()
            fixed_words = fixed.split()
            for o, f in zip(orig_words, fixed_words):
                if o != f:
                    total_replacements += 1
    return {"modified_texts": modified, "total_replacements": total_replacements}


if __name__ == "__main__":
    # Test with sample verses
    test_cases = [
        "আমাদেরকে সরল সঠিক পথ প্রদর্শন কর",
        "বলল, আমি জানি যা তোমরা জান না",
        "তুমি কর এবং ধৈর্য ধর",
        "সে বলল আমি করব এবং যাব",
        "তারা ছিল পথভ্রষ্ট",
        "কেউ কোন অন্যায় করল",
    ]

    for text in test_cases:
        fixed = preprocess_bengali_tts(text)
        if text != fixed:
            print(f"  {text}")
            print(f"→ {fixed}")
            print()
        else:
            print(f"  {text} (no change)")
            print()

    # Stats on full Quran
    import sqlite3
    import os
    db_path = os.path.join(os.path.dirname(__file__), '..', 'assets', 'data', 'quran.db')
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        rows = conn.execute("SELECT text_bengali FROM ayahs").fetchall()
        texts = [r[0] for r in rows]
        stats = get_fix_stats(texts)
        print(f"\n📊 Full Quran stats:")
        print(f"   Ayahs modified: {stats['modified_texts']}/{len(texts)}")
        print(f"   Total word replacements: {stats['total_replacements']}")
        conn.close()
