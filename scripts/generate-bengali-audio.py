#!/usr/bin/env python3
"""
Bengali Quran Translation TTS Generator
========================================
Generates ayah-by-ayah Bengali translation audio using Microsoft Edge Neural TTS.
This aims to be the first freely available Bengali Quran translation audio.

Output: 6,236 MP3 files named by sequential ayah number (1.mp3 to 6236.mp3)
        matching the AlQuran Cloud CDN convention.

Voices available:
  - bn-BD-NabanitaNeural  (Female, Bangladesh)
  - bn-BD-PradeepNeural   (Male, Bangladesh)
  - bn-IN-BashkarNeural   (Male, India)
  - bn-IN-TanishaaNeural  (Female, India)

Usage:
  python3 scripts/generate-bengali-audio.py                    # Full run (all 6236 ayahs)
  python3 scripts/generate-bengali-audio.py --surah 1          # Single surah
  python3 scripts/generate-bengali-audio.py --surah 1 --surah 2  # Multiple surahs
  python3 scripts/generate-bengali-audio.py --resume            # Resume from last generated
  python3 scripts/generate-bengali-audio.py --voice bn-BD-PradeepNeural  # Male voice
  python3 scripts/generate-bengali-audio.py --dry-run           # Count only, no generation

Requirements:
  pip install edge-tts
"""

import asyncio
import argparse
import json
import os
import sqlite3
import sys
import time
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("Error: edge-tts not installed. Run: pip install edge-tts")
    sys.exit(1)

# ── Config ──────────────────────────────────────────────────────────────────

DEFAULT_VOICE = "bn-BD-NabanitaNeural"  # Female, Bangladesh Bengali
RATE = "-8%"          # Slightly slower for Quran recitation clarity
VOLUME = "+0%"
PITCH = "+0Hz"

# Output directory
OUTPUT_DIR = Path("assets/audio/bn-translation")

# Database path
DB_PATH = Path("assets/data/quran.db")

# ── Surah Offsets (cumulative verse counts, 0-indexed) ──────────────────────
# SURAH_OFFSETS[i] = sequential number of the first ayah of surah (i+1) minus 1
# So ayah sequential = SURAH_OFFSETS[surah_id - 1] + verse_number
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


def load_ayahs(db_path: str, surah_ids: list[int] | None = None) -> list[dict]:
    """Load ayahs from SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    if surah_ids:
        placeholders = ",".join("?" * len(surah_ids))
        query = f"""
            SELECT a.id, a.surah_id, a.verse_number, a.text_bengali,
                   s.name_bengali as surah_name
            FROM ayahs a
            JOIN surahs s ON s.id = a.surah_id
            WHERE a.surah_id IN ({placeholders})
            ORDER BY a.surah_id, a.verse_number
        """
        rows = conn.execute(query, surah_ids).fetchall()
    else:
        rows = conn.execute("""
            SELECT a.id, a.surah_id, a.verse_number, a.text_bengali,
                   s.name_bengali as surah_name
            FROM ayahs a
            JOIN surahs s ON s.id = a.surah_id
            ORDER BY a.surah_id, a.verse_number
        """).fetchall()

    conn.close()
    return [dict(r) for r in rows]


def clean_text(text: str) -> str:
    """Clean Bengali text for TTS — remove HTML tags, fix pronunciation, normalize."""
    import re
    from bengali_tts_preprocessor import preprocess_bengali_tts
    # Remove HTML tags (some translations have <sup>, <b>, etc.)
    text = re.sub(r'<[^>]+>', '', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # Fix inherent vowel pronunciation (কর→করো, বলল→বললো, etc.)
    text = preprocess_bengali_tts(text)
    return text


async def generate_single(
    text: str,
    output_path: Path,
    voice: str,
    rate: str = RATE,
) -> bool:
    """Generate a single MP3 file from Bengali text."""
    try:
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate=rate,
            volume=VOLUME,
            pitch=PITCH,
        )
        await communicate.save(str(output_path))
        return True
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


async def generate_batch(
    ayahs: list[dict],
    output_dir: Path,
    voice: str,
    resume: bool = False,
    concurrency: int = 5,
) -> dict:
    """Generate audio for a batch of ayahs with concurrency control."""
    output_dir.mkdir(parents=True, exist_ok=True)

    stats = {"total": len(ayahs), "generated": 0, "skipped": 0, "failed": 0}
    semaphore = asyncio.Semaphore(concurrency)
    start_time = time.time()

    async def process_ayah(ayah: dict) -> None:
        seq_num = get_sequential_number(ayah["surah_id"], ayah["verse_number"])
        filepath = output_dir / f"{seq_num}.mp3"

        if resume and filepath.exists() and filepath.stat().st_size > 0:
            stats["skipped"] += 1
            return

        text = clean_text(ayah["text_bengali"])
        if not text:
            print(f"  ⚠ Empty text: {ayah['surah_id']}:{ayah['verse_number']}")
            stats["failed"] += 1
            return

        async with semaphore:
            ok = await generate_single(text, filepath, voice)
            if ok:
                stats["generated"] += 1
                done = stats["generated"] + stats["skipped"]
                if done % 50 == 0 or done == stats["total"]:
                    elapsed = time.time() - start_time
                    rate_val = done / elapsed if elapsed > 0 else 0
                    remaining = (stats["total"] - done) / rate_val if rate_val > 0 else 0
                    print(
                        f"  ✓ {done}/{stats['total']} "
                        f"({done * 100 // stats['total']}%) "
                        f"~{remaining:.0f}s remaining"
                    )
            else:
                stats["failed"] += 1
                # Retry once after a short delay
                await asyncio.sleep(2)
                ok2 = await generate_single(text, filepath, voice)
                if ok2:
                    stats["failed"] -= 1
                    stats["generated"] += 1

    # Process in chunks to avoid overwhelming the API
    chunk_size = 100
    for i in range(0, len(ayahs), chunk_size):
        chunk = ayahs[i:i + chunk_size]
        tasks = [process_ayah(a) for a in chunk]
        await asyncio.gather(*tasks)

    return stats


def generate_manifest(ayahs: list[dict], output_dir: Path, voice: str):
    """Generate a manifest.json with metadata about the audio files."""
    manifest = {
        "format": "mp3",
        "voice": voice,
        "engine": "Microsoft Edge Neural TTS",
        "language": "bn-BD",
        "type": "translation",
        "translation": "Muhiuddin Khan (মুহিউদ্দীন খান)",
        "total_ayahs": len(ayahs),
        "naming": "sequential (1-6236)",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "license": "Free for non-commercial use",
        "surahs": {},
    }

    for ayah in ayahs:
        sid = str(ayah["surah_id"])
        if sid not in manifest["surahs"]:
            manifest["surahs"][sid] = {
                "name": ayah["surah_name"],
                "first_ayah_seq": get_sequential_number(ayah["surah_id"], 1),
                "last_ayah_seq": get_sequential_number(ayah["surah_id"], ayah["verse_number"]),
                "verses": ayah["verse_number"],
            }
        else:
            manifest["surahs"][sid]["last_ayah_seq"] = get_sequential_number(
                ayah["surah_id"], ayah["verse_number"]
            )
            manifest["surahs"][sid]["verses"] = ayah["verse_number"]

    manifest_path = output_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\n📋 Manifest saved: {manifest_path}")


async def main():
    parser = argparse.ArgumentParser(
        description="Generate Bengali Quran Translation Audio (TTS)"
    )
    parser.add_argument(
        "--voice",
        default=DEFAULT_VOICE,
        help=f"TTS voice (default: {DEFAULT_VOICE})",
    )
    parser.add_argument(
        "--surah",
        type=int,
        action="append",
        help="Generate only specific surah(s). Can repeat: --surah 1 --surah 2",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip already-generated files",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without generating",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=5,
        help="Number of concurrent TTS requests (default: 5)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(OUTPUT_DIR),
        help=f"Output directory (default: {OUTPUT_DIR})",
    )

    args = parser.parse_args()
    output_dir = Path(args.output)

    if not DB_PATH.exists():
        print(f"✗ Database not found: {DB_PATH}")
        sys.exit(1)

    # Load ayahs
    print(f"📖 Loading ayahs from {DB_PATH}...")
    ayahs = load_ayahs(str(DB_PATH), args.surah)
    print(f"   Found {len(ayahs)} ayahs")

    if args.surah:
        print(f"   Surahs: {args.surah}")

    if args.dry_run:
        total_chars = sum(len(clean_text(a["text_bengali"])) for a in ayahs)
        print(f"\n📊 Dry run summary:")
        print(f"   Ayahs: {len(ayahs)}")
        print(f"   Total characters: {total_chars:,}")
        print(f"   Voice: {args.voice}")
        print(f"   Output: {output_dir}")
        # Estimate file sizes (~30KB per ayah based on test)
        est_size_mb = len(ayahs) * 30 / 1024
        print(f"   Estimated total size: ~{est_size_mb:.0f} MB")
        return

    print(f"\n🎙️  Voice: {args.voice}")
    print(f"📁 Output: {output_dir}")
    print(f"⚡ Concurrency: {args.concurrency}")
    if args.resume:
        print(f"🔄 Resume mode: skipping existing files")
    print(f"\n🚀 Starting generation...\n")

    stats = await generate_batch(
        ayahs, output_dir, args.voice,
        resume=args.resume,
        concurrency=args.concurrency,
    )

    elapsed = time.time()
    print(f"\n{'='*50}")
    print(f"✅ Generation complete!")
    print(f"   Generated: {stats['generated']}")
    print(f"   Skipped:   {stats['skipped']}")
    print(f"   Failed:    {stats['failed']}")
    print(f"   Total:     {stats['total']}")

    # Generate manifest
    generate_manifest(ayahs, output_dir, args.voice)

    # Show hosting instructions
    print(f"""
{'='*50}
📦 HOSTING INSTRUCTIONS
{'='*50}

Your audio files are in: {output_dir}/
File naming: 1.mp3 through 6236.mp3 (sequential ayah numbers)

To use in the app, host on any CDN and set the base URL:
  https://your-cdn.com/quran/audio/bn.translation/{{sequential_number}}.mp3

To contribute to AlQuran Cloud:
  1. Fork https://github.com/AhmedAlQuran/quran-api
  2. Add your audio as a new edition: bn.translation
  3. Submit a pull request

Suggested CDN options (free tier):
  - Cloudflare R2 (10GB free, no egress fees)
  - Backblaze B2 + Cloudflare (10GB free)
  - GitHub Releases (for smaller surahs)
""")


if __name__ == "__main__":
    asyncio.run(main())
