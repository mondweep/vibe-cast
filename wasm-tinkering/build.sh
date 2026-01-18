#!/bin/bash
# Build WASM Image Filters

set -e

echo "🔨 Building WASM..."
wasm-pack build --target web --out-dir www/pkg

echo ""
echo "✅ Build complete!"
echo ""
echo "To run locally:"
echo "  cd www && python3 -m http.server 8080"
echo "  Then open http://localhost:8080"
