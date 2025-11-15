#!/bin/bash

# Vibe-Cast Quick Start Script
# Sets up the environment and runs basic checks

set -e

echo "=================================================="
echo "  VIBE-CAST QUICK START"
echo "=================================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3.10 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment found"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"

# Check if requirements are installed
echo ""
echo "Checking dependencies..."
if ! python -c "import torch" 2>/dev/null; then
    echo "Installing PyTorch..."
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
fi

if ! python -c "import librosa" 2>/dev/null; then
    echo "Installing dependencies from requirements.txt..."
    pip install -r requirements.txt
fi

echo "✓ Dependencies installed"

# Check GPU
echo ""
echo "Checking GPU availability..."
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"

# Check tools
echo ""
echo "Checking installed tools..."

if command -v ffmpeg &> /dev/null; then
    echo "✓ FFmpeg found"
else
    echo "✗ FFmpeg not found - please install: sudo apt install ffmpeg"
fi

if python -c "import yt_dlp" 2>/dev/null; then
    echo "✓ yt-dlp found"
else
    echo "✗ yt-dlp not found - installing..."
    pip install yt-dlp
fi

if python -c "import demucs" 2>/dev/null; then
    echo "✓ Demucs found"
else
    echo "✗ Demucs not found - installing..."
    pip install demucs
fi

# Check .env file
echo ""
if [ -f ".env" ]; then
    echo "✓ .env file found"
else
    echo "⚠ .env file not found"
    echo "  Creating from .env.example..."
    cp .env.example .env
    echo "  Please edit .env and add your ANTHROPIC_API_KEY"
fi

# Show next steps
echo ""
echo "=================================================="
echo "  SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Edit .env and add your ANTHROPIC_API_KEY"
echo "  2. Review RESEARCH_FINDINGS.md for ethical guidelines"
echo "  3. Review TECHNICAL_IMPLEMENTATION_GUIDE.md for detailed instructions"
echo ""
echo "Quick test:"
echo "  python scripts/extract_audio.py <youtube_url>"
echo ""
echo "Full pipeline:"
echo "  python scripts/complete_pipeline.py <youtube_url> <lyrics_file>"
echo ""
echo "=================================================="
