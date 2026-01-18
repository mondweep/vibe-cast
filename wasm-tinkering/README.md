# WASM Image Filters

A browser-based image processing tool built with Rust and WebAssembly. All processing runs locally on your device — no cloud, no AI inference, no data leaves your browser.

**Live Demo:** [wasm-tinkering.netlify.app](https://wasm-tinkering.netlify.app) *(update with your actual URL)*

## Why This Matters

- **Zero network round-trips** — instant processing, works offline
- **Privacy by architecture** — your images never leave your device
- **Sustainable computing** — no cloud GPU cycles for simple operations
- **Educational** — learn WASM through progressive complexity

## Implemented Filters

| Level | Filter | Status | Concepts |
|-------|--------|--------|----------|
| 1 | Grayscale | ✅ | Memory layout, pixel iteration, RGBA format |
| 2 | Brightness | ✅ | Channel arithmetic, clamping |
| 2 | Contrast | ✅ | Scaling around midpoint |
| 2 | Invert | ✅ | Simple value flip (255 - value) |
| 3 | Box Blur | ✅ | Convolution kernels, neighbor sampling |
| 3 | Gaussian Blur | ✅ | Weighted kernels, smoother output |
| 4 | Sharpen | ✅ | Edge enhancement kernel |
| 4 | Sobel Edge Detection | ✅ | Gradient detection, dual kernels |

## Project Structure

```
wasm-tinkering/
├── Cargo.toml              # Rust dependencies
├── src/
│   └── lib.rs              # Filter implementations (~330 lines)
├── www/
│   ├── index.html          # Interactive browser UI
│   └── pkg/                # Built WASM (generated)
├── netlify.toml            # Netlify deployment config
├── netlify-build.sh        # Build script for CI/CD
└── build.sh                # Local build script
```

## Local Development

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
cargo install wasm-pack
```

### Build & Run

```bash
# Build the WASM module
./build.sh

# Start local server
cd www && python3 -m http.server 8080

# Open http://localhost:8080
```

## How It Works

### Image Data Flow

```
Browser ImageData ──► WASM (Rust) ──► Modified in place ──► Render to canvas
     [R,G,B,A...]      box_blur()        [R',G',B',A...]
```

### Convolution Example (3x3 Gaussian Blur)

```
Kernel weights:          Applied to pixel neighborhood:
  [1] [2] [1]              [p1] [p2] [p3]
  [2] [4] [2]    ×         [p4] [p5] [p6]    ÷ 16 = new pixel value
  [1] [2] [1]              [p7] [p8] [p9]
```

### Key Rust Pattern

```rust
#[wasm_bindgen]
pub fn box_blur(pixels: &mut [u8], width: u32, height: u32, radius: u32) {
    let original = pixels.to_vec();  // Copy for reading neighbors
    // ... process each pixel using neighbor values from original
}
```

## Deployment

Deployed automatically via Netlify on push. The build:
1. Installs Rust toolchain + wasm32 target
2. Installs wasm-pack
3. Compiles Rust → WASM with optimizations
4. Serves static files from `www/`

## Performance

Typical results on a 400×400 image (~160,000 pixels):

| Filter | Time |
|--------|------|
| Grayscale | ~1-2ms |
| Box Blur (radius 5) | ~15-30ms |
| Sobel Edge Detection | ~10-20ms |

WASM provides 10-50x speedup over equivalent JavaScript for convolution operations.

## Roadmap

- [ ] WASM vs JavaScript performance comparison UI
- [ ] Real-time video/webcam filters
- [ ] Custom kernel designer
- [ ] Sepia and color tint filters
- [ ] Pixelate effect
- [ ] Emboss filter
- [ ] Adjustable Gaussian blur radius

## Built With

- **Rust** — systems language compiled to WASM
- **wasm-bindgen** — JS ↔ Rust interop
- **wasm-pack** — build toolchain
- **Netlify** — CI/CD and hosting

---

*Built through iterative human-AI pair programming with Claude Code*
