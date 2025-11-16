#!/bin/bash

# Setup RVC (Retrieval-based Voice Conversion) for voice cloning
# This script downloads and prepares RVC for training and inference

set -e

PROJECT_DIR="/workspaces/vibe-cast/output/pamne-moi-ghurai_20251116"
RVC_DIR="/workspaces/vibe-cast/rvc"

echo "=========================================================================="
echo "RVC SETUP - Voice Cloning Tool Installation"
echo "=========================================================================="
echo ""

# Check if RVC is already installed
if [ -d "$RVC_DIR" ]; then
    echo "✓ RVC already installed at: $RVC_DIR"
    echo ""
    echo "To run RVC Web UI:"
    echo "  cd $RVC_DIR"
    echo "  python infer-web.py"
    echo ""
    exit 0
fi

echo "Installing RVC (Retrieval-based Voice Conversion)..."
echo ""

# Clone RVC repository
echo "Cloning RVC repository..."
git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI.git "$RVC_DIR"

cd "$RVC_DIR"

echo ""
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

echo ""
echo "=========================================================================="
echo "✓ RVC Installation Complete!"
echo "=========================================================================="
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Download RVC models (first time only):"
echo "   cd $RVC_DIR"
echo "   python infer-web.py"
echo ""
echo "2. The web UI will open at http://localhost:7865"
echo ""
echo "3. In the Web UI:"
echo "   - Go to 'Training' tab"
echo "   - Create new model: 'pamne-moi-ghurai'"
echo "   - Upload: $PROJECT_DIR/training_data/vocals_full.wav"
echo "   - Set epochs: 300-500"
echo "   - Start training"
echo ""
echo "4. Once training is complete:"
echo "   - Go to 'Inference' tab"
echo "   - Select your trained model"
echo "   - Upload reference vocals"
echo "   - Generate English singing voice"
echo ""
echo "TRAINING TIME: ~2-6 hours (depending on GPU and epochs)"
echo ""
