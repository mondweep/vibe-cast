"""
Simple JEPA Implementation - Learning by Doing
A minimal example to understand Joint-Embedding Predictive Architecture
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
from pathlib import Path


# ============================================================================
# 1. PATCH ENCODER - Convert images to patch embeddings
# ============================================================================

class PatchEncoder(nn.Module):
    """Extracts patches from images and embeds them"""

    def __init__(self, patch_size=4, in_channels=3, embed_dim=64):
        super().__init__()
        self.patch_size = patch_size
        self.patch_embedding = nn.Conv2d(
            in_channels, embed_dim,
            kernel_size=patch_size, stride=patch_size
        )

    def forward(self, x):
        # x shape: (batch, channels, height, width)
        patches = self.patch_embedding(x)  # (batch, embed_dim, h_patches, w_patches)
        patches = patches.flatten(2)  # (batch, embed_dim, num_patches)
        patches = patches.transpose(1, 2)  # (batch, num_patches, embed_dim)
        return patches


# ============================================================================
# 2. MASKING STRATEGY - Randomly mask patches
# ============================================================================

class RandomMasking:
    """Apply random masking to patches"""

    def __init__(self, mask_ratio=0.5):
        self.mask_ratio = mask_ratio

    def __call__(self, patches):
        """
        patches: (batch, num_patches, embed_dim)
        returns: (batch, num_patches, embed_dim), (batch, num_patches) mask
        """
        batch_size, num_patches, embed_dim = patches.shape
        num_mask = int(num_patches * self.mask_ratio)

        # Create random mask
        mask = torch.ones(batch_size, num_patches)
        for b in range(batch_size):
            mask_indices = torch.randperm(num_patches)[:num_mask]
            mask[b, mask_indices] = 0

        # Apply mask to patches
        masked_patches = patches.clone()
        masked_patches[mask == 0] = 0  # Zero out masked patches

        return masked_patches, mask


# ============================================================================
# 3. PREDICTOR - Predict masked patch embeddings
# ============================================================================

class SimplePredictor(nn.Module):
    """Predicts masked patch embeddings from visible ones"""

    def __init__(self, embed_dim=64, hidden_dim=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, embed_dim)
        )

    def forward(self, masked_patches):
        # masked_patches: (batch, num_patches, embed_dim)
        # Predict embeddings for all patches (we'll only use masked ones for loss)
        return self.net(masked_patches)


# ============================================================================
# 4. JEPA MODEL - Combining encoder and predictor
# ============================================================================

class SimpleJEPA(nn.Module):
    """Complete JEPA model"""

    def __init__(self, patch_size=4, embed_dim=64, hidden_dim=128, mask_ratio=0.5):
        super().__init__()
        self.encoder = PatchEncoder(patch_size=patch_size, embed_dim=embed_dim)
        self.predictor = SimplePredictor(embed_dim=embed_dim, hidden_dim=hidden_dim)
        self.masking = RandomMasking(mask_ratio=mask_ratio)

    def forward(self, x):
        # Encode patches
        patches = self.encoder(x)  # (batch, num_patches, embed_dim)

        # Apply masking
        masked_patches, mask = self.masking(patches)  # mask: 1 = visible, 0 = masked

        # Predict embeddings
        predicted_patches = self.predictor(masked_patches)

        return predicted_patches, patches, mask


# ============================================================================
# 5. LOSS FUNCTION - Compare predicted vs actual embeddings
# ============================================================================

def jepa_loss(predicted, target, mask):
    """
    JEPA loss: L2 distance between predicted and actual embeddings for masked patches

    predicted: (batch, num_patches, embed_dim)
    target: (batch, num_patches, embed_dim)
    mask: (batch, num_patches) where 0 = masked, 1 = visible
    """
    # Only compute loss on masked patches
    loss = ((predicted - target) ** 2).mean(dim=-1)  # (batch, num_patches)

    # Apply mask (1 - mask because 0 = masked patches we want to predict)
    masked_loss = loss * (1 - mask)

    return masked_loss.mean()


# ============================================================================
# 6. TRAINING LOOP
# ============================================================================

def train():
    print("=" * 60)
    print("Simple JEPA 101 - Learning by Doing")
    print("=" * 60)

    # Configuration
    batch_size = 32
    num_epochs = 10
    learning_rate = 1e-3
    patch_size = 4
    embed_dim = 64
    hidden_dim = 128
    mask_ratio = 0.5

    print(f"\n📊 Configuration:")
    print(f"  Patch size: {patch_size}x{patch_size}")
    print(f"  Embedding dimension: {embed_dim}")
    print(f"  Predictor hidden dimension: {hidden_dim}")
    print(f"  Masking ratio: {mask_ratio}")

    # Create synthetic data (random images for demo)
    print(f"\n📦 Creating synthetic dataset...")
    num_samples = 100
    images = torch.randn(num_samples, 3, 32, 32)  # 32x32 random images
    dataset = TensorDataset(images)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    # Initialize model
    print(f"\n🧠 Initializing model...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SimpleJEPA(
        patch_size=patch_size,
        embed_dim=embed_dim,
        hidden_dim=hidden_dim,
        mask_ratio=mask_ratio
    ).to(device)

    optimizer = optim.Adam(model.parameters(), lr=learning_rate)

    print(f"  Device: {device}")
    print(f"  Model parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Training loop
    print(f"\n🚀 Training for {num_epochs} epochs...\n")
    losses = []

    for epoch in range(num_epochs):
        epoch_loss = 0
        num_batches = 0

        for batch_idx, (images,) in enumerate(dataloader):
            images = images.to(device)

            # Forward pass
            predicted, target, mask = model(images)

            # Compute loss
            loss = jepa_loss(predicted, target, mask)

            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()
            num_batches += 1

        avg_loss = epoch_loss / num_batches
        losses.append(avg_loss)

        print(f"Epoch {epoch+1:2d}/{num_epochs} | Loss: {avg_loss:.6f}")

    # Summary
    print(f"\n✅ Training complete!")
    print(f"  Initial loss: {losses[0]:.6f}")
    print(f"  Final loss: {losses[-1]:.6f}")
    print(f"  Improvement: {(losses[0] - losses[-1]) / losses[0] * 100:.1f}%")

    # Save checkpoint
    save_path = Path("simple_jepa_checkpoint.pt")
    torch.save(model.state_dict(), save_path)
    print(f"\n💾 Model saved to: {save_path}")

    return model, losses


# ============================================================================
# 7. ANALYSIS - Understand what the model learned
# ============================================================================

def analyze_embeddings(model, device):
    """Visualize learned patch embeddings"""
    print("\n" + "=" * 60)
    print("Analyzing Learned Representations")
    print("=" * 60)

    # Generate test image
    test_image = torch.randn(1, 3, 32, 32).to(device)

    # Get embeddings
    with torch.no_grad():
        patches = model.encoder(test_image)

    print(f"\n📊 Embedding Statistics:")
    print(f"  Shape: {patches.shape}")
    print(f"  Mean: {patches.mean():.4f}")
    print(f"  Std: {patches.std():.4f}")
    print(f"  Min: {patches.min():.4f}")
    print(f"  Max: {patches.max():.4f}")

    # Analyze patch similarity
    print(f"\n🔍 Patch Similarity Analysis:")
    embeddings = patches[0]  # (num_patches, embed_dim)
    similarity_matrix = torch.matmul(embeddings, embeddings.T)  # (num_patches, num_patches)

    print(f"  Average cosine similarity between patches:")
    # Normalize for cosine similarity
    embeddings_norm = torch.nn.functional.normalize(embeddings, dim=1)
    cosine_sim = torch.matmul(embeddings_norm, embeddings_norm.T)

    # Exclude diagonal (self-similarity)
    mask = torch.eye(cosine_sim.shape[0], dtype=torch.bool)
    avg_similarity = cosine_sim[~mask].mean().item()

    print(f"    Average: {avg_similarity:.4f}")
    print(f"    Min: {cosine_sim[~mask].min():.4f}")
    print(f"    Max: {cosine_sim[~mask].max():.4f}")

    print(f"\n💡 What this means:")
    print(f"  - Low similarity → Model learns diverse representations")
    print(f"  - High similarity → Patches might be learning correlated features")


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print("\n🎓 Welcome to Simple JEPA 101!\n")

    # Train the model
    model, losses = train()

    # Analyze learned representations
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    analyze_embeddings(model, device)

    print("\n" + "=" * 60)
    print("🎉 Experiment Complete!")
    print("=" * 60)
    print("\n📝 Next Steps:")
    print("  1. Change mask_ratio to 0.25, 0.5, 0.75 and observe differences")
    print("  2. Modify the predictor architecture (add/remove layers)")
    print("  3. Try with real image datasets (CIFAR-10, ImageNet)")
    print("  4. Implement momentum encoder for stability")
    print("  5. Add visualization of learned patches")
    print("\n💡 Key Insight:")
    print("  JEPA learns by predicting - the model gets better at understanding")
    print("  image structure because it has to reconstruct hidden patches!\n")
