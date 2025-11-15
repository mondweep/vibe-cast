"""
Complete Pipeline for Song Translation
Orchestrates the entire process from YouTube URL to translated singing voice
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Import our modules
from extract_audio import download_audio
from isolate_vocals import isolate_vocals_demucs
from translate_lyrics import translate_lyrics


def run_pipeline(youtube_url, assamese_lyrics, output_dir='./output', project_name=None):
    """
    Complete pipeline from YouTube URL to translated singing voice

    Args:
        youtube_url: YouTube video URL
        assamese_lyrics: Original Assamese lyrics (string or file path)
        output_dir: Output directory for all files
        project_name: Optional project name (auto-generated if not provided)

    Returns:
        Dictionary with paths to all generated files
    """
    # Create project directory
    if project_name is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_name = f"song_{timestamp}"

    project_dir = Path(output_dir) / project_name
    project_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print(f"VIBE-CAST PIPELINE - {project_name}")
    print("=" * 70)
    print(f"Output directory: {project_dir}")
    print()

    results = {
        'project_dir': str(project_dir),
        'project_name': project_name
    }

    # Read lyrics if it's a file path
    if Path(assamese_lyrics).exists():
        print(f"Reading lyrics from file: {assamese_lyrics}")
        with open(assamese_lyrics, 'r', encoding='utf-8') as f:
            assamese_lyrics = f.read()
    else:
        print("Using provided lyrics text")

    # STEP 1: Download audio from YouTube
    print("\n" + "=" * 70)
    print("STEP 1/5: DOWNLOADING AUDIO FROM YOUTUBE")
    print("=" * 70)

    audio_dir = project_dir / "audio"
    audio_file = download_audio(youtube_url, str(audio_dir))

    if not audio_file:
        print("✗ Failed to download audio")
        return None

    results['audio'] = audio_file

    # STEP 2: Isolate vocals
    print("\n" + "=" * 70)
    print("STEP 2/5: ISOLATING VOCALS")
    print("=" * 70)

    separated_dir = project_dir / "separated"
    vocals_file = isolate_vocals_demucs(audio_file, str(separated_dir))

    if not vocals_file:
        print("✗ Failed to isolate vocals")
        return None

    results['vocals'] = vocals_file

    # STEP 3: Translate lyrics
    print("\n" + "=" * 70)
    print("STEP 3/5: TRANSLATING LYRICS")
    print("=" * 70)

    translation_file = project_dir / "translation.txt"
    english_translation = translate_lyrics(
        assamese_lyrics,
        output_file=str(translation_file)
    )

    if not english_translation:
        print("✗ Failed to translate lyrics")
        return None

    results['translation'] = str(translation_file)

    # STEP 4: Prepare training data
    print("\n" + "=" * 70)
    print("STEP 4/5: PREPARING TRAINING DATA")
    print("=" * 70)

    training_dir = project_dir / "training_data"
    training_dir.mkdir(parents=True, exist_ok=True)

    # Copy vocals to training directory for convenience
    import shutil
    training_vocals = training_dir / "vocals_full.wav"
    shutil.copy(vocals_file, training_vocals)
    print(f"✓ Training vocals copied to: {training_vocals}")

    results['training_data'] = str(training_dir)

    # STEP 5: Generate summary and instructions
    print("\n" + "=" * 70)
    print("STEP 5/5: GENERATING SUMMARY")
    print("=" * 70)

    summary_file = project_dir / "README.txt"
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(f"VIBE-CAST PROJECT: {project_name}\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Source: {youtube_url}\n\n")

        f.write("FILES GENERATED:\n")
        f.write("-" * 70 + "\n")
        f.write(f"1. Original Audio: {audio_file}\n")
        f.write(f"2. Isolated Vocals: {vocals_file}\n")
        f.write(f"3. Translation: {translation_file}\n")
        f.write(f"4. Training Data: {training_dir}\n\n")

        f.write("NEXT STEPS:\n")
        f.write("-" * 70 + "\n")
        f.write("1. Train RVC Model:\n")
        f.write("   - Install RVC: git clone https://github.com/IAHispano/Applio.git\n")
        f.write("   - Run: cd Applio && python app.py\n")
        f.write(f"   - Upload training data from: {training_dir}\n")
        f.write("   - Train for 300-500 epochs\n\n")

        f.write("2. Generate Singing Voice:\n")
        f.write("   - Use trained RVC model\n")
        f.write("   - Input: English lyrics from translation.txt\n")
        f.write("   - Reference: Original vocals for timing/melody\n\n")

        f.write("3. Post-Processing:\n")
        f.write("   - Mix with instrumental track\n")
        f.write("   - Add effects (reverb, EQ)\n")
        f.write("   - Export final audio\n\n")

        f.write("ETHICAL REMINDER:\n")
        f.write("-" * 70 + "\n")
        f.write("✓ Obtain consent from original artist\n")
        f.write("✓ Label as AI-generated content\n")
        f.write("✓ Use for research/educational purposes only\n")
        f.write("✓ Do not distribute without permission\n")

    print(f"✓ Summary saved to: {summary_file}")
    results['summary'] = str(summary_file)

    # Final summary
    print("\n" + "=" * 70)
    print("PIPELINE COMPLETE!")
    print("=" * 70)
    print(f"\nProject directory: {project_dir}")
    print(f"\nGenerated files:")
    print(f"  • Audio: {Path(audio_file).name}")
    print(f"  • Vocals: {Path(vocals_file).relative_to(project_dir)}")
    print(f"  • Translation: translation.txt")
    print(f"  • Training data: training_data/")
    print(f"  • Summary: README.txt")

    print("\n" + "=" * 70)
    print("NEXT STEPS")
    print("=" * 70)
    print("1. Review the translation in: translation.txt")
    print("2. Train RVC model using vocals in: training_data/")
    print("3. Generate English singing voice with trained model")
    print(f"\nSee {summary_file.name} for detailed instructions.")
    print()

    return results


def main():
    """Command-line interface"""
    if len(sys.argv) < 3:
        print("Usage: python complete_pipeline.py <youtube_url> <lyrics_file>")
        print("\nExample:")
        print("  python complete_pipeline.py https://youtube.com/... assamese_lyrics.txt")
        print("\nOptions:")
        print("  --output DIR    Output directory (default: ./output)")
        print("  --name NAME     Project name (default: auto-generated)")
        sys.exit(1)

    youtube_url = sys.argv[1]
    lyrics_file = sys.argv[2]

    # Parse optional arguments
    output_dir = './output'
    project_name = None

    for i, arg in enumerate(sys.argv):
        if arg == '--output' and i + 1 < len(sys.argv):
            output_dir = sys.argv[i + 1]
        elif arg == '--name' and i + 1 < len(sys.argv):
            project_name = sys.argv[i + 1]

    # Run pipeline
    results = run_pipeline(
        youtube_url,
        lyrics_file,
        output_dir=output_dir,
        project_name=project_name
    )

    if results:
        print("\n✓ Success!")
        sys.exit(0)
    else:
        print("\n✗ Pipeline failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
