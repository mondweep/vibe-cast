"""
Simple RVC inference script that bypasses fairseq initialization issues.
"""
import os
import sys
import torch
import torch.nn.functional as F
import numpy as np
import soundfile as sf
import faiss

# Set environment for M1 Mac
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
os.environ["PYTORCH_MPS_HIGH_WATERMARK_RATIO"] = "0.0"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_NUM_THREADS"] = "1"

from scipy import signal

def load_audio(file, sr):
    """Load and resample audio."""
    audio, orig_sr = sf.read(file)
    if len(audio.shape) > 1:
        audio = audio.mean(axis=1)
    if orig_sr != sr:
        audio = signal.resample(audio, int(len(audio) * sr / orig_sr))
    return audio.astype(np.float32)

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_path", type=str, required=True, help="Path to .pth model")
    parser.add_argument("--input_path", type=str, required=True, help="Input audio file")
    parser.add_argument("--output_path", type=str, required=True, help="Output audio file")
    parser.add_argument("--index_path", type=str, default="", help="FAISS index path")
    parser.add_argument("--f0_up_key", type=int, default=0, help="Pitch shift in semitones")
    parser.add_argument("--index_rate", type=float, default=0.75, help="Index influence (0-1)")
    args = parser.parse_args()

    device = "cpu"
    if torch.cuda.is_available():
        device = "cuda"

    print(f"Device: {device}")
    print(f"Loading model from {args.model_path}")

    # Load model
    cpt = torch.load(args.model_path, map_location="cpu", weights_only=False)

    # Extract model info
    tgt_sr = cpt.get("config", [40000])[-1] if isinstance(cpt.get("config"), list) else 40000
    version = cpt.get("version", "v2")
    if_f0 = cpt.get("f0", 1)

    print(f"Model version: {version}, Sample rate: {tgt_sr}, F0: {if_f0}")

    # Build synthesizer
    if version == "v1":
        from infer.lib.infer_pack.models import SynthesizerTrnMs256NSFsid as Synthesizer
    else:
        from infer.lib.infer_pack.models import SynthesizerTrnMs768NSFsid as Synthesizer

    # Get config
    config = cpt.get("config")
    if config:
        # Fix config - element 9 may be string '1' instead of int
        config = list(config)
        for i in range(len(config)):
            if isinstance(config[i], str) and config[i].isdigit():
                config[i] = int(config[i])
        print(f"Config: {config}")
        net_g = Synthesizer(*config, is_half=False)
    else:
        # Default config for v2
        net_g = Synthesizer(
            1025, 32, 192, 192, 768, 2, 6, 3, 0, 100, 1,
            gin_channels=256, sr=tgt_sr, is_half=False
        )

    del net_g.enc_q
    net_g.load_state_dict(cpt["weight"], strict=False)
    net_g.eval().to(device)

    print("Model loaded successfully")

    # Load audio
    print(f"Loading audio from {args.input_path}")
    audio = load_audio(args.input_path, 16000)

    # Extract F0 using RMVPE
    print("Extracting F0 with RMVPE...")
    from infer.lib.rmvpe import RMVPE
    rmvpe = RMVPE("assets/rmvpe/rmvpe.pt", is_half=False, device=device)
    f0 = rmvpe.infer_from_audio(audio, thred=0.03)

    # Apply pitch shift
    if args.f0_up_key != 0:
        f0 = f0 * 2 ** (args.f0_up_key / 12)

    # Prepare f0 tensors
    f0_mel = 1127 * np.log(1 + f0 / 700)
    f0_mel[f0_mel > 0] = (f0_mel[f0_mel > 0] - 1127 * np.log(1 + 50 / 700)) * 254 / (
        1127 * np.log(1 + 1100 / 700) - 1127 * np.log(1 + 50 / 700)
    ) + 1
    f0_mel[f0_mel <= 1] = 1
    f0_mel[f0_mel > 255] = 255
    f0_coarse = np.rint(f0_mel).astype(np.int32)

    # Extract HuBERT features
    print("Extracting HuBERT features...")
    try:
        hubert_path = "assets/hubert/hubert_base.pt"
        use_fairseq = False

        # Try to load fairseq HuBERT directly (bypass broken init)
        if os.path.exists(hubert_path):
            try:
                # Direct checkpoint loading without fairseq initialization
                from fairseq.models.hubert import HubertModel as FairseqHubert
                import fairseq

                models, cfg, task = fairseq.checkpoint_utils.load_model_ensemble_and_task(
                    [hubert_path], suffix=""
                )
                hubert = models[0].to(device).eval()
                use_fairseq = True
                print("Loaded fairseq HuBERT successfully")
            except Exception as e:
                print(f"Fairseq load failed: {e}, using transformers fallback")
                use_fairseq = False

        if not use_fairseq:
            from transformers import HubertModel
            hubert = HubertModel.from_pretrained("facebook/hubert-base-ls960")
            hubert = hubert.to(device).eval()
            print("Using transformers HuBERT with input normalization")

        # Prepare input
        feats = torch.from_numpy(audio).float()
        if feats.dim() == 1:
            feats = feats.unsqueeze(0)

        # Apply layer normalization to input (as fairseq HuBERT does)
        feats = F.layer_norm(feats, feats.shape)

        with torch.no_grad():
            if use_fairseq:
                # Fairseq HuBERT extraction
                padding_mask = torch.BoolTensor(feats.shape).fill_(False).to(device)
                inputs = {
                    "source": feats.to(device),
                    "padding_mask": padding_mask,
                    "output_layer": 12 if version == "v2" else 9,
                }
                logits = hubert.extract_features(**inputs)
                feats = logits[0]
            else:
                # Transformers HuBERT extraction
                outputs = hubert(feats.to(device), output_hidden_states=True)
                layer = 12 if version == "v2" else 9
                feats = outputs.hidden_states[layer]

        # Interpolate features 2x to match F0 frame rate (HuBERT is 20ms, F0 is 10ms)
        feats = F.interpolate(feats.permute(0, 2, 1), scale_factor=2).permute(0, 2, 1)
        feats = feats.squeeze(0).cpu().numpy()

        # Convert to float32
        feats = feats.astype(np.float32)

    except Exception as e:
        print(f"HuBERT extraction failed: {e}")
        import traceback
        traceback.print_exc()
        return

    # Apply index if provided
    if args.index_path and os.path.exists(args.index_path) and args.index_rate > 0:
        print(f"Loading index from {args.index_path}")
        index = faiss.read_index(args.index_path)

        # Load the original feature array (big_npy)
        index_dir = os.path.dirname(args.index_path)
        big_npy_path = os.path.join(index_dir, "total_fea.npy")

        if os.path.exists(big_npy_path):
            big_npy = np.load(big_npy_path)
            print(f"Loaded feature array: {big_npy.shape}")

            # Search and blend using big_npy for reconstruction
            npy = feats.copy()
            score, ix = index.search(npy, k=8)
            weight = np.square(1 / score)
            weight /= weight.sum(axis=1, keepdims=True)

            # Use big_npy to get actual feature vectors
            npy = np.sum(big_npy[ix] * weight[:, :, np.newaxis], axis=1)

            feats = args.index_rate * npy + (1 - args.index_rate) * feats
            feats = feats.astype(np.float32)
            print(f"Applied index with rate {args.index_rate}")
        else:
            print(f"Warning: {big_npy_path} not found, skipping index")

    # Prepare for synthesis
    p_len = min(feats.shape[0], len(f0_coarse))
    feats = feats[:p_len]
    f0_coarse = f0_coarse[:p_len]
    f0 = f0[:p_len]

    feats = torch.from_numpy(feats).unsqueeze(0).to(device)
    pitch = torch.LongTensor(f0_coarse).unsqueeze(0).to(device)
    pitchf = torch.FloatTensor(f0).unsqueeze(0).to(device)
    p_len_tensor = torch.LongTensor([p_len]).to(device)

    # Speaker embedding
    sid = torch.LongTensor([0]).to(device)

    # Synthesize
    print("Synthesizing audio...")
    with torch.no_grad():
        audio_out = net_g.infer(feats, p_len_tensor, pitch, pitchf, sid)[0][0, 0].cpu().numpy()

    # Normalize to target level (always normalize, not just when clipping)
    max_val = np.abs(audio_out).max()
    if max_val > 0:
        audio_out = audio_out / max_val * 0.95
    print(f"Audio normalized (max was {max_val:.4f})")

    # Save
    print(f"Saving to {args.output_path}")
    sf.write(args.output_path, audio_out, tgt_sr)
    print(f"Done! Output saved to {args.output_path}")

if __name__ == "__main__":
    main()
