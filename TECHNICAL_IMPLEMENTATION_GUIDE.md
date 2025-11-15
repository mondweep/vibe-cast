# Technical Implementation Guide: Assamese to English Song Translation with Voice Cloning

## Overview
This guide provides step-by-step instructions for implementing a voice translation pipeline for songs using open-source tools and AI models.

---

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Environment Setup](#environment-setup)
3. [Pipeline Components](#pipeline-components)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Code Examples](#code-examples)
6. [Troubleshooting](#troubleshooting)

---

## 1. System Requirements

### Hardware Requirements
- **GPU**: NVIDIA GPU with 8GB+ VRAM (RTX 3060 or better recommended)
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 50GB+ free space
- **CPU**: Multi-core processor (Intel i7/AMD Ryzen 7 or better)

### Software Requirements
- **OS**: Linux (Ubuntu 20.04+), Windows 10/11, or macOS
- **Python**: 3.9 or 3.10 (3.11 may have compatibility issues)
- **CUDA**: 11.8+ (for NVIDIA GPUs)
- **FFmpeg**: Latest version

---

## 2. Environment Setup

### 2.1 Install System Dependencies

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y python3.10 python3-pip python3-venv
sudo apt install -y ffmpeg git build-essential
sudo apt install -y portaudio19-dev python3-pyaudio
```

#### macOS
```bash
brew install python@3.10 ffmpeg portaudio
```

#### Windows
- Install Python 3.10 from python.org
- Install FFmpeg from ffmpeg.org
- Install Git from git-scm.com

### 2.2 Create Python Virtual Environment

```bash
# Create project directory
mkdir -p ~/vibe-cast
cd ~/vibe-cast

# Create virtual environment
python3.10 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# OR
venv\Scripts\activate  # Windows
```

### 2.3 Install PyTorch with CUDA Support

```bash
# For CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# For CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# For CPU only (not recommended for production)
pip install torch torchvision torchaudio
```

### 2.4 Verify GPU Setup

```python
# test_gpu.py
import torch

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"GPU device: {torch.cuda.get_device_name(0)}")
    print(f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
```

---

## 3. Pipeline Components

### 3.1 Component Architecture

```
[YouTube URL]
    ↓
[Audio Extraction (yt-dlp)]
    ↓
[Voice Isolation (UVR5/Demucs)]
    ↓
[Clean Vocal Track] ──→ [Voice Model Training (RVC)]
                              ↓
[Lyrics Translation] ──→ [Voice Synthesis]
    ↓                         ↓
[Phonetic Alignment] ─→ [Generated Audio]
```

### 3.2 Required Tools

1. **yt-dlp**: YouTube audio extraction
2. **UVR5 or Demucs**: Vocal isolation
3. **RVC or SO-VITS-SVC**: Voice conversion
4. **Gradio**: Web interface (optional)

---

## 4. Step-by-Step Implementation

### Step 1: Install Audio Extraction Tools

```bash
# Install yt-dlp
pip install yt-dlp

# Test yt-dlp
yt-dlp --version
```

### Step 2: Extract Audio from YouTube

```python
# extract_audio.py
import yt_dlp
import os

def download_audio(youtube_url, output_path='./audio'):
    """
    Download audio from YouTube URL

    Args:
        youtube_url: YouTube video URL
        output_path: Directory to save audio file
    """
    os.makedirs(output_path, exist_ok=True)

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f'{output_path}/%(title)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'postprocessor_args': [
            '-ar', '44100',  # Sample rate
            '-ac', '2',      # Stereo
        ],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            filename = ydl.prepare_filename(info)
            base_filename = os.path.splitext(filename)[0]
            wav_filename = f"{base_filename}.wav"
            print(f"Downloaded: {wav_filename}")
            return wav_filename
    except Exception as e:
        print(f"Error downloading audio: {e}")
        return None

# Example usage
if __name__ == "__main__":
    url = "YOUR_YOUTUBE_URL_HERE"  # Replace with actual URL
    audio_file = download_audio(url)
    print(f"Audio saved to: {audio_file}")
```

### Step 3: Install Vocal Isolation Tool (UVR5)

```bash
# Install demucs (lighter alternative)
pip install demucs

# Or use UVR5 (more powerful, GUI-based)
# Download from: https://github.com/Anjok07/ultimatevocalremovergui
```

### Step 4: Isolate Vocals

```python
# isolate_vocals.py
import subprocess
import os

def isolate_vocals_demucs(audio_file, output_dir='./separated'):
    """
    Use Demucs to isolate vocals from audio file

    Args:
        audio_file: Path to audio file
        output_dir: Output directory for separated tracks
    """
    os.makedirs(output_dir, exist_ok=True)

    # Run demucs
    cmd = [
        'demucs',
        '--two-stems=vocals',  # Only extract vocals
        '-n', 'htdemucs',       # Use htdemucs model
        '--out', output_dir,
        audio_file
    ]

    try:
        subprocess.run(cmd, check=True)
        print(f"Vocals isolated to: {output_dir}")

        # Find the vocals file
        base_name = os.path.splitext(os.path.basename(audio_file))[0]
        vocals_path = os.path.join(output_dir, 'htdemucs', base_name, 'vocals.wav')
        return vocals_path
    except subprocess.CalledProcessError as e:
        print(f"Error isolating vocals: {e}")
        return None

# Example usage
if __name__ == "__main__":
    audio_file = "./audio/your_song.wav"
    vocals = isolate_vocals_demucs(audio_file)
    print(f"Vocals saved to: {vocals}")
```

### Step 5: Install RVC (Retrieval-based Voice Conversion)

```bash
# Clone RVC repository
git clone https://github.com/IAHispano/Applio.git
cd Applio

# Install dependencies
pip install -r requirements.txt

# Download pre-trained models
# This will be handled by the application on first run
```

### Step 6: Prepare Training Data

```python
# prepare_training_data.py
import librosa
import soundfile as sf
import numpy as np
import os

def preprocess_audio(input_file, output_dir='./training_data',
                     target_sr=40000, segment_length=10):
    """
    Preprocess audio for RVC training

    Args:
        input_file: Path to vocals file
        output_dir: Directory to save processed segments
        target_sr: Target sample rate (40kHz for RVC)
        segment_length: Length of each segment in seconds
    """
    os.makedirs(output_dir, exist_ok=True)

    # Load audio
    audio, sr = librosa.load(input_file, sr=target_sr, mono=True)

    # Normalize audio
    audio = audio / np.max(np.abs(audio))

    # Remove silence
    audio_trimmed, _ = librosa.effects.trim(audio, top_db=20)

    # Split into segments
    segment_samples = segment_length * target_sr
    num_segments = len(audio_trimmed) // segment_samples

    for i in range(num_segments):
        start = i * segment_samples
        end = start + segment_samples
        segment = audio_trimmed[start:end]

        # Save segment
        output_file = os.path.join(output_dir, f'segment_{i:04d}.wav')
        sf.write(output_file, segment, target_sr)

    print(f"Created {num_segments} training segments in {output_dir}")
    return num_segments

# Example usage
if __name__ == "__main__":
    vocals_file = "./separated/htdemucs/your_song/vocals.wav"
    num_segments = preprocess_audio(vocals_file)
    print(f"Training data prepared: {num_segments} segments")
```

### Step 7: Train RVC Model

```bash
# Navigate to RVC directory
cd Applio

# Launch Gradio interface
python app.py

# In the web interface:
# 1. Go to "Train" tab
# 2. Set model name (e.g., "assamese_singer")
# 3. Upload training data folder
# 4. Set training parameters:
#    - Epochs: 200-500 (more is better, but diminishing returns)
#    - Batch size: 8-16 (depending on GPU memory)
#    - Sample rate: 40kHz
# 5. Start training
```

### Step 8: Translate Lyrics

```python
# translate_lyrics.py
from anthropic import Anthropic
import os

def translate_lyrics(assamese_lyrics, api_key=None):
    """
    Translate Assamese lyrics to English using Claude AI

    Args:
        assamese_lyrics: Original Assamese lyrics
        api_key: Anthropic API key (optional, uses env variable if not provided)
    """
    if api_key is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")

    client = Anthropic(api_key=api_key)

    prompt = f"""Please translate these Assamese song lyrics to English.
Maintain the poetic structure, syllable count, and emotional tone as much as possible.
Keep the rhythm and rhyme scheme similar for musical adaptation.

Original Assamese lyrics:
{assamese_lyrics}

Provide:
1. Direct English translation
2. Singable English adaptation (maintaining syllable count and rhythm)
3. Phonetic pronunciation guide for English lyrics
"""

    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=2000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return message.content[0].text

# Example usage
if __name__ == "__main__":
    assamese_lyrics = """
    [Insert original Assamese lyrics here]
    """

    english_translation = translate_lyrics(assamese_lyrics)
    print("Translation:")
    print(english_translation)

    # Save to file
    with open('./lyrics_translation.txt', 'w', encoding='utf-8') as f:
        f.write(english_translation)
```

### Step 9: Generate Singing with Translated Lyrics

```python
# generate_singing.py
import torch
import numpy as np
from scipy.io import wavfile

def generate_singing_voice(
    text,
    reference_audio,
    model_path,
    output_path='./output/generated.wav'
):
    """
    Generate singing voice with translated lyrics

    Note: This is a simplified example. Actual implementation
    depends on the specific RVC or TTS model being used.

    Args:
        text: Translated lyrics
        reference_audio: Path to original vocals (for timing/melody)
        model_path: Path to trained RVC model
        output_path: Where to save generated audio
    """
    # This is a placeholder - actual implementation requires:
    # 1. Loading the trained RVC model
    # 2. Extracting melody/timing from reference audio
    # 3. Generating TTS or singing voice synthesis
    # 4. Applying voice conversion with RVC model

    print("Generating singing voice...")
    print(f"Text: {text}")
    print(f"Reference: {reference_audio}")
    print(f"Model: {model_path}")

    # For actual implementation, you would:
    # - Use a TTS or SVS system to generate base vocals
    # - Apply RVC voice conversion to match target voice
    # - Align with original melody and timing

    return output_path

# Example usage
if __name__ == "__main__":
    english_lyrics = "Your translated English lyrics here"
    reference_vocals = "./separated/htdemucs/your_song/vocals.wav"
    rvc_model = "./models/assamese_singer.pth"

    output = generate_singing_voice(
        english_lyrics,
        reference_vocals,
        rvc_model
    )
    print(f"Generated audio: {output}")
```

### Step 10: Complete Pipeline Script

```python
# complete_pipeline.py
import os
from extract_audio import download_audio
from isolate_vocals import isolate_vocals_demucs
from prepare_training_data import preprocess_audio
from translate_lyrics import translate_lyrics

def run_pipeline(youtube_url, assamese_lyrics, output_dir='./output'):
    """
    Complete pipeline from YouTube URL to translated singing voice

    Args:
        youtube_url: YouTube video URL
        assamese_lyrics: Original Assamese lyrics
        output_dir: Output directory for all files
    """
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("STEP 1: Downloading audio from YouTube")
    print("=" * 60)
    audio_file = download_audio(youtube_url, f"{output_dir}/audio")
    if not audio_file:
        print("Failed to download audio")
        return

    print("\n" + "=" * 60)
    print("STEP 2: Isolating vocals")
    print("=" * 60)
    vocals_file = isolate_vocals_demucs(audio_file, f"{output_dir}/separated")
    if not vocals_file:
        print("Failed to isolate vocals")
        return

    print("\n" + "=" * 60)
    print("STEP 3: Preparing training data")
    print("=" * 60)
    num_segments = preprocess_audio(vocals_file, f"{output_dir}/training_data")
    print(f"Created {num_segments} training segments")

    print("\n" + "=" * 60)
    print("STEP 4: Translating lyrics")
    print("=" * 60)
    english_lyrics = translate_lyrics(assamese_lyrics)

    # Save translation
    with open(f"{output_dir}/translation.txt", 'w', encoding='utf-8') as f:
        f.write(f"Original Assamese:\n{assamese_lyrics}\n\n")
        f.write(f"English Translation:\n{english_lyrics}")

    print("\n" + "=" * 60)
    print("STEP 5: Train RVC model (Manual step)")
    print("=" * 60)
    print(f"Training data is ready in: {output_dir}/training_data")
    print("Please run 'python Applio/app.py' and train the model using the web interface")
    print(f"Use the audio files from: {output_dir}/training_data")

    print("\n" + "=" * 60)
    print("Pipeline complete!")
    print("=" * 60)
    print(f"Original audio: {audio_file}")
    print(f"Isolated vocals: {vocals_file}")
    print(f"Training data: {output_dir}/training_data")
    print(f"Translation: {output_dir}/translation.txt")

    return {
        'audio': audio_file,
        'vocals': vocals_file,
        'training_data': f"{output_dir}/training_data",
        'translation': f"{output_dir}/translation.txt"
    }

# Example usage
if __name__ == "__main__":
    # IMPORTANT: Replace these with actual values
    # Make sure you have permission to use the YouTube video!

    youtube_url = "YOUR_YOUTUBE_URL"  # Replace with actual URL

    assamese_lyrics = """
    [Insert original Assamese lyrics here]
    """

    results = run_pipeline(youtube_url, assamese_lyrics)
    print("\nPipeline results:", results)
```

---

## 5. Code Examples

### 5.1 Batch Processing Multiple Songs

```python
# batch_process.py
from complete_pipeline import run_pipeline

def batch_process_songs(songs_list):
    """
    Process multiple songs in batch

    Args:
        songs_list: List of dictionaries with 'url' and 'lyrics' keys
    """
    for i, song in enumerate(songs_list, 1):
        print(f"\n{'=' * 60}")
        print(f"Processing song {i}/{len(songs_list)}")
        print(f"{'=' * 60}\n")

        output_dir = f"./output/song_{i:02d}"
        run_pipeline(song['url'], song['lyrics'], output_dir)

# Example usage
if __name__ == "__main__":
    songs = [
        {
            'url': 'YOUTUBE_URL_1',
            'lyrics': 'Assamese lyrics for song 1...'
        },
        {
            'url': 'YOUTUBE_URL_2',
            'lyrics': 'Assamese lyrics for song 2...'
        },
    ]

    batch_process_songs(songs)
```

### 5.2 Voice Quality Analysis

```python
# analyze_voice.py
import librosa
import numpy as np
import matplotlib.pyplot as plt

def analyze_voice_quality(original_file, generated_file):
    """
    Analyze and compare voice quality metrics

    Args:
        original_file: Path to original vocals
        generated_file: Path to generated vocals
    """
    # Load audio files
    orig_audio, orig_sr = librosa.load(original_file, sr=None)
    gen_audio, gen_sr = librosa.load(generated_file, sr=None)

    # Extract features
    orig_mfcc = librosa.feature.mfcc(y=orig_audio, sr=orig_sr, n_mfcc=13)
    gen_mfcc = librosa.feature.mfcc(y=gen_audio, sr=gen_sr, n_mfcc=13)

    # Compute similarity
    similarity = np.corrcoef(
        orig_mfcc.flatten(),
        gen_mfcc.flatten()
    )[0, 1]

    # Plot comparison
    fig, axes = plt.subplots(2, 1, figsize=(12, 8))

    librosa.display.specshow(orig_mfcc, x_axis='time', ax=axes[0])
    axes[0].set_title('Original Voice MFCC')
    axes[0].set_ylabel('MFCC Coefficients')

    librosa.display.specshow(gen_mfcc, x_axis='time', ax=axes[1])
    axes[1].set_title('Generated Voice MFCC')
    axes[1].set_ylabel('MFCC Coefficients')

    plt.tight_layout()
    plt.savefig('./voice_comparison.png')

    print(f"Voice similarity: {similarity:.4f}")
    return similarity

# Example usage
if __name__ == "__main__":
    original = "./separated/htdemucs/song/vocals.wav"
    generated = "./output/generated.wav"

    similarity = analyze_voice_quality(original, generated)
    print(f"Similarity score: {similarity:.2%}")
```

---

## 6. Troubleshooting

### 6.1 Common Issues

**Issue: CUDA Out of Memory**
```python
# Solution: Reduce batch size or use gradient accumulation
# In RVC training settings:
batch_size = 4  # Reduce from 8 or 16
```

**Issue: Poor Voice Quality**
```
Solutions:
1. Use more training data (30+ seconds minimum)
2. Ensure clean vocal isolation (no background music)
3. Increase training epochs (500-1000)
4. Use higher quality source audio (44.1kHz or 48kHz)
```

**Issue: Lyrics Don't Match Timing**
```
Solutions:
1. Use forced alignment tools (Montreal Forced Aligner)
2. Manually adjust phoneme timing
3. Use reference audio for timing extraction
```

### 6.2 Performance Optimization

```python
# Use mixed precision training for faster training
# Add to RVC training config:
fp16_run = True

# Enable CUDA optimizations
torch.backends.cudnn.benchmark = True
torch.backends.cudnn.enabled = True

# Use DataLoader with multiple workers
num_workers = 4  # Adjust based on CPU cores
```

---

## 7. Next Steps

1. **Obtain Ethical Clearance**: Contact artist for permission
2. **Collect Quality Data**: Ensure clean, high-quality audio source
3. **Train Models**: Use prepared data to train RVC model
4. **Generate Outputs**: Create English singing voice
5. **Evaluate Quality**: Use metrics and human evaluation
6. **Iterate**: Refine based on results

---

## 8. Additional Resources

### Documentation
- RVC Documentation: https://github.com/IAHispano/Applio/wiki
- Demucs: https://github.com/facebookresearch/demucs
- Librosa: https://librosa.org/doc/latest/

### Community
- RVC Discord: Join for support and updates
- AI Voice Conversion subreddit: r/AIVoiceConversion
- Hugging Face discussions

### Pre-trained Models
- Hugging Face: https://huggingface.co/models?search=rvc
- CIVITAI: https://civitai.com/models

---

**Last Updated**: November 15, 2025
**Status**: Ready for Implementation
**Prerequisites**: Ethical clearance and consent from voice owner
