# WASM Image Filters

A hands-on WebAssembly learning project — building image processing filters with Rust.

## Learning Path

| Level | Filters | Concepts |
|-------|---------|----------|
| 1 | Grayscale | Memory layout, pixel iteration, RGBA format |
| 2 | Brightness, Contrast, Invert | Clamping, arithmetic on channels |
| 3 | Blur | Convolution kernels, neighbor pixels |
| 4 | Edge Detection | Sobel operator, gradients |

## Project Structure

```
wasm-tinkering/
├── Cargo.toml          # Rust dependencies
├── src/
│   └── lib.rs          # Filter implementations (the learning happens here!)
├── www/
│   ├── index.html      # Browser test harness
│   └── pkg/            # Built WASM (generated)
└── build.sh            # Build script
```

## Prerequisites

```bash
# Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
cargo install wasm-pack
```

## Build & Run

```bash
# Build the WASM module
./build.sh

# Start local server
cd www && python3 -m http.server 8080

# Open browser
open http://localhost:8080
```

## How It Works

### Image Data in WASM

Browser's `ImageData` is a flat array of bytes in RGBA order:

```
[R, G, B, A, R, G, B, A, R, G, B, A, ...]
 └─pixel 0─┘  └─pixel 1─┘  └─pixel 2─┘
```

We pass this directly to Rust via `wasm-bindgen`, modify it in place, and the browser sees the changes immediately.

### The Grayscale Formula

```rust
let gray = 0.299 * r + 0.587 * g + 0.114 * b;
```

These magic numbers match human eye sensitivity (we see green best, blue worst).

## Next Steps

1. ✅ Basic filters (grayscale, brightness, contrast, invert)
2. 🔲 Convolution filters (blur, sharpen)
3. 🔲 Edge detection (Sobel)
4. 🔲 Performance comparison with pure JS

---

*Part of the Claude-Flow V3 learning initiative*
