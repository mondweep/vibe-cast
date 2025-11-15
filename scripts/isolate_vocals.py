"""
Vocal Isolation using Demucs
Separates vocals from background music
"""

import subprocess
import os
from pathlib import Path
import shutil


def isolate_vocals_demucs(audio_file, output_dir='./separated', model='htdemucs'):
    """
    Use Demucs to isolate vocals from audio file

    Args:
        audio_file: Path to audio file
        output_dir: Output directory for separated tracks
        model: Demucs model to use (htdemucs, htdemucs_ft, mdx_extra)

    Returns:
        Path to isolated vocals file or None if failed
    """
    audio_file = Path(audio_file)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not audio_file.exists():
        print(f"✗ Error: Audio file not found: {audio_file}")
        return None

    print(f"Isolating vocals from: {audio_file.name}")
    print(f"Using model: {model}")

    # Run demucs
    cmd = [
        'demucs',
        '--two-stems=vocals',  # Only extract vocals
        '-n', model,           # Use specified model
        '--out', str(output_dir),
        str(audio_file)
    ]

    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True
        )

        # Find the vocals file
        base_name = audio_file.stem
        vocals_path = output_dir / model / base_name / 'vocals.wav'

        if vocals_path.exists():
            print(f"✓ Vocals isolated to: {vocals_path}")
            return str(vocals_path)
        else:
            print(f"✗ Error: Vocals file not found at expected location")
            return None

    except subprocess.CalledProcessError as e:
        print(f"✗ Error running Demucs: {e}")
        if e.stderr:
            print(f"Error details: {e.stderr}")
        return None
    except FileNotFoundError:
        print("✗ Error: Demucs not found. Please install with: pip install demucs")
        return None


def main():
    """Example usage"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python isolate_vocals.py <audio_file> [model]")
        print("Models: htdemucs (default), htdemucs_ft, mdx_extra")
        print("Example: python isolate_vocals.py audio/song.wav htdemucs")
        sys.exit(1)

    audio_file = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else 'htdemucs'

    vocals = isolate_vocals_demucs(audio_file, model=model)

    if vocals:
        print(f"\nSuccess! Vocals saved to: {vocals}")
    else:
        print("\nFailed to isolate vocals")
        sys.exit(1)


if __name__ == "__main__":
    main()
