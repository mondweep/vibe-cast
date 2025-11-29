FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    git \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone RVC (Retrieval-based Voice Conversion)
# We use the official repo. You might want to pin a specific commit for stability.
RUN git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI.git .

# Install Python dependencies
# We install torch first to ensure CUDA support
RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
RUN pip3 install -r requirements.txt
RUN pip3 install flask google-cloud-storage gunicorn

# Copy the training server wrapper
COPY server.py .

# Environment variables for RVC
ENV RVC_ROOT=/app

# Download Pretrained Models (Required for RVC)
RUN mkdir -p assets/hubert assets/pretrained_v2

# Hubert
RUN curl -L -o assets/hubert/hubert_base.pt https://huggingface.co/lj1995/VoiceConversionWebUI/resolve/main/hubert_base.pt

# RVC v2 Pretrained
RUN curl -L -o assets/pretrained_v2/f0G40k.pth https://huggingface.co/lj1995/VoiceConversionWebUI/resolve/main/pretrained_v2/f0G40k.pth
RUN curl -L -o assets/pretrained_v2/f0D40k.pth https://huggingface.co/lj1995/VoiceConversionWebUI/resolve/main/pretrained_v2/f0D40k.pth

# Expose port
ENV PORT 8080

# Start the server
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 3600 server:app
