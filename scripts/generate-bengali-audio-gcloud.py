#!/usr/bin/env python3
"""
Google Cloud TTS Bengali Quran Generator
==========================================
Uses Chirp3-HD (latest Google AI voice) with pronunciation preprocessing.
Voice: bn-IN-Chirp3-HD-Enceladus (Male)

Usage:
  python3 scripts/generate-bengali-audio-gcloud.py                  # Full run
  python3 scripts/generate-bengali-audio-gcloud.py --surah 1        # Single surah
  python3 scripts/generate-bengali-audio-gcloud.py --resume         # Skip existing
  python3 scripts/generate-bengali-audio-gcloud.py --dry-run        # Count only
"""

import argparse
import asyncio
import base64
import json
import os
import re
import sqlite3
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# Add scripts dir to path for preprocessor
sys.path.insert(0, str(Path(__file__).parent))
from bengali_tts_preprocessor import preprocess_bengali_tts

# ── Config ──────────────────────────────────────────────────────────────────

API_KEY = os.environ.get("GOOGLE_TTS_API_KEY", "")
if not API_KEY:
    raise ValueError("Set GOOGLE_TTS_API_KEY environment variable")
VOICE = "bn-IN-Chirp3-HD-Enceladus"
LANGUAGE_CODE = "bn-IN"
SPEAKING_RATE = 0.90
OUTPUT_DIR = Path("assets/audio/bn-translation-gcloud")
DB_PATH = Path("assets/data/quran.db")
API_URL = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={API_KEY}"

SURAH_OFFSETS = [
    0, 7, 293, 493, 669, 789, 954, 1160,
    1235, 1364, 1473, 1596, 1707, 1750, 1802, 1901,
    2029, 2140, 2250, 2348, 2483, 2595, 2673, 2791,
    2855, 2932, 3159, 3252, 3340, 3409, 3469, 3503,
    3533, 3606, 3660, 3705, 3788, 3970, 4058, 4133,
    4218, 4272, 4325, 4414, 4473, 4510, 4545, 4583,
    4612, 4630, 4675, 4735, 4784, 4846, 4901, 4979,
    5075, 5104, 5126, 5150, 5163, 5177, 5188, 5199,
    5217, 5229, 5241, 5271, 5323, 5375, 5419, 5447,
    5475, 5495, 5551, 5591, 5622, 5672, 5712, 5758,
    5800, 5829, 5848, 5884, 5909, 5931, 5948, 5967,
    5993, 6023, 6043, 6058, 6079, 6090, 6098, 6106,
    6125, 6130, 6138, 6146, 6157, 6168, 6176, 6179,
    6188, 6193, 6197, 6204, 6207, 6213, 6216, 6221,
    6225, 6230,
]


def get_sequential_number(surah_id: int, verse_number: int) -> int:
    return SURAH_OFFSETS[surah_id - 1] + verse_number


def load_ayahs(surah_ids: list[int] | None = None) -> list[dict]:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    if surah_ids:
        placeholders = ",".join("?" * len(surah_ids))
        rows = conn.execute(
            f"SELECT a.id, a.surah_id, a.verse_number, a.text_bengali, s.name_bengali as surah_name "
            f"FROM ayahs a JOIN surahs s ON s.id = a.surah_id "
            f"WHERE a.surah_id IN ({placeholders}) ORDER BY a.surah_id, a.verse_number",
            surah_ids
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT a.id, a.surah_id, a.verse_number, a.text_bengali, s.name_bengali as surah_name "
            "FROM ayahs a JOIN surahs s ON s.id = a.surah_id ORDER BY a.surah_id, a.verse_number"
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def clean_text(text: str) -> str:
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    text = preprocess_bengali_tts(text)
    return text


MAX_CHARS = 300  # Google Chirp3-HD Bengali limit (conservative)


def split_text(text: str) -> list[str]:
    """Split long text at sentence boundaries (।, ,) to stay under API limit."""
    if len(text) <= MAX_CHARS:
        return [text]

    chunks: list[str] = []
    current = ""
    # Split on Bengali sentence enders and commas
    parts = re.split(r'(।|,\s)', text)

    for part in parts:
        if len(current) + len(part) <= MAX_CHARS:
            current += part
        else:
            if current.strip():
                chunks.append(current.strip())
            current = part

    if current.strip():
        chunks.append(current.strip())

    # Fallback: if any chunk still exceeds limit, split on spaces
    final: list[str] = []
    for chunk in chunks:
        if len(chunk) <= MAX_CHARS:
            final.append(chunk)
        else:
            words = chunk.split()
            sub = ""
            for w in words:
                if len(sub) + len(w) + 1 <= MAX_CHARS:
                    sub = f"{sub} {w}" if sub else w
                else:
                    if sub:
                        final.append(sub)
                    sub = w
            if sub:
                final.append(sub)

    return final if final else [text]


def synthesize_single(text: str, retries: int = 3) -> bytes | None:
    """Synthesize text and return raw MP3 bytes."""
    payload = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": LANGUAGE_CODE, "name": VOICE},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": SPEAKING_RATE},
    }).encode("utf-8")

    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                API_URL, data=payload,
                headers={"Content-Type": "application/json"}, method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            if "audioContent" in data:
                return base64.b64decode(data["audioContent"])
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            if e.code == 429:
                wait = min(2 ** (attempt + 2), 30)
                print(f"  ⚠ Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  ✗ HTTP {e.code}: {body[:120]}")
                if attempt < retries - 1:
                    time.sleep(2)
        except Exception as e:
            print(f"  ✗ Error: {e}")
            if attempt < retries - 1:
                time.sleep(2)
    return None


def synthesize(text: str, output_path: Path, retries: int = 3) -> bool:
    chunks = split_text(text)
    audio_parts: list[bytes] = []

    for chunk in chunks:
        audio = synthesize_single(chunk, retries)
        if audio is None:
            return False
        audio_parts.append(audio)

    # Concatenate MP3 parts (MP3 is concatenatable)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        for part in audio_parts:
            f.write(part)
    return True


def main():
    parser = argparse.ArgumentParser(description="Generate Bengali Quran Audio (Google Cloud TTS)")
    parser.add_argument("--surah", type=int, action="append", help="Specific surah(s)")
    parser.add_argument("--resume", action="store_true", help="Skip existing files")
    parser.add_argument("--dry-run", action="store_true", help="Count only")
    parser.add_argument("--output", type=str, default=str(OUTPUT_DIR))
    args = parser.parse_args()

    output_dir = Path(args.output)

    print(f"📖 Loading ayahs from {DB_PATH}...")
    ayahs = load_ayahs(args.surah)
    print(f"   Found {len(ayahs)} ayahs")

    if args.dry_run:
        total_chars = sum(len(clean_text(a["text_bengali"])) for a in ayahs)
        print(f"\n📊 Dry run:")
        print(f"   Ayahs: {len(ayahs)}")
        print(f"   Characters: {total_chars:,}")
        print(f"   Voice: {VOICE}")
        return

    print(f"\n🎙️  Voice: {VOICE}")
    print(f"📁 Output: {output_dir}")
    if args.resume:
        print(f"🔄 Resume mode")
    print(f"\n🚀 Starting...\n")

    output_dir.mkdir(parents=True, exist_ok=True)
    stats = {"generated": 0, "skipped": 0, "failed": 0}
    start = time.time()
    total = len(ayahs)

    for i, ayah in enumerate(ayahs):
        seq = get_sequential_number(ayah["surah_id"], ayah["verse_number"])
        filepath = output_dir / f"{seq}.mp3"

        if args.resume and filepath.exists() and filepath.stat().st_size > 0:
            stats["skipped"] += 1
            done = stats["generated"] + stats["skipped"]
            if done % 100 == 0:
                print(f"  ⏭ {done}/{total} (skipping)")
            continue

        text = clean_text(ayah["text_bengali"])
        if not text:
            stats["failed"] += 1
            continue

        ok = synthesize(text, filepath)
        if ok:
            stats["generated"] += 1
        else:
            stats["failed"] += 1

        done = stats["generated"] + stats["skipped"]
        if done % 50 == 0 or done == total:
            elapsed = time.time() - start
            rate = done / elapsed if elapsed > 0 else 0
            remaining = (total - done) / rate if rate > 0 else 0
            print(f"  ✓ {done}/{total} ({done * 100 // total}%) ~{remaining:.0f}s remaining")

        # Small delay to respect rate limits
        if stats["generated"] % 10 == 0:
            time.sleep(0.1)

    elapsed = time.time() - start
    print(f"\n{'='*50}")
    print(f"✅ Done in {elapsed:.0f}s!")
    print(f"   Generated: {stats['generated']}")
    print(f"   Skipped:   {stats['skipped']}")
    print(f"   Failed:    {stats['failed']}")

    # Manifest
    manifest = {
        "voice": VOICE,
        "engine": "Google Cloud Text-to-Speech (Chirp3-HD)",
        "language": LANGUAGE_CODE,
        "preprocessing": "bengali_tts_preprocessor (inherent vowel fix)",
        "total_ayahs": len(ayahs),
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "license": "Freely distributable (Google Cloud TTS output)",
    }
    with open(output_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"📋 Manifest saved")


if __name__ == "__main__":
    main()
