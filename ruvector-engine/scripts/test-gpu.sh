#!/bin/bash
# GPU Functionality Test Script
#
# Tests GPU availability on either:
# - Cloud Run GPU service
# - Compute Engine GPU VM

set -e

# Default to the VM IP, can be overridden
SERVICE_URL="${1:-http://34.10.29.27}"

echo "========================================"
echo "RuVector Engine - GPU Test"
echo "========================================"
echo "Target: $SERVICE_URL"
echo ""

# Test 1: Health Check
echo "1. Testing Health Endpoint..."
HEALTH=$(curl -s --max-time 10 "$SERVICE_URL/api/v1/health" 2>/dev/null || echo '{"error":"connection failed"}')
echo "   Response: $HEALTH"
echo ""

# Test 2: GPU Test Endpoint
echo "2. Testing GPU Detection..."
GPU_TEST=$(curl -s --max-time 30 "$SERVICE_URL/api/v1/gpu-test" 2>/dev/null || echo '{"error":"connection failed"}')

# Parse GPU detection result
GPU_DETECTED=$(echo "$GPU_TEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('gpu_detected', False))" 2>/dev/null || echo "false")
GPU_COUNT=$(echo "$GPU_TEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('gpus', [])))" 2>/dev/null || echo "0")

if [ "$GPU_DETECTED" = "True" ] || [ "$GPU_DETECTED" = "true" ]; then
    echo "   ✓ GPU DETECTED!"
    echo "   GPU Count: $GPU_COUNT"

    # Show GPU details
    echo ""
    echo "   GPU Details:"
    echo "$GPU_TEST" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for gpu in data.get('gpus', []):
    print(f\"      Name: {gpu.get('name', 'N/A')}\")
    print(f\"      Memory: {gpu.get('memory_total_mb', 'N/A')} MB\")
    print(f\"      Free: {gpu.get('memory_free_mb', 'N/A')} MB\")
    print(f\"      Utilization: {gpu.get('utilization_percent', 'N/A')}%\")
" 2>/dev/null || echo "      (Could not parse GPU details)"
else
    echo "   ✗ No GPU detected (running in CPU mode)"
    echo "   Response: $GPU_TEST"
fi

echo ""

# Test 3: Initialize Engine
echo "3. Initializing Recommendation Engine..."
INIT=$(curl -s --max-time 30 -X POST "$SERVICE_URL/api/v1/initialize" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null || echo '{"error":"connection failed"}')

SUCCESS=$(echo "$INIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null || echo "false")

if [ "$SUCCESS" = "True" ] || [ "$SUCCESS" = "true" ]; then
    echo "   ✓ Engine initialized successfully"
    NODES=$(echo "$INIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('numNodes', 'N/A'))" 2>/dev/null || echo "N/A")
    echo "   Nodes: $NODES"
else
    echo "   Response: $INIT"
fi

echo ""

# Test 4: Get Recommendations
echo "4. Testing Recommendations..."
RECS=$(curl -s --max-time 30 "$SERVICE_URL/api/v1/recommendations/user-alice?limit=3" 2>/dev/null || echo '{"error":"connection failed"}')
REC_COUNT=$(echo "$RECS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count', 0))" 2>/dev/null || echo "0")

if [ "$REC_COUNT" -gt 0 ]; then
    echo "   ✓ Got $REC_COUNT recommendations"
    echo ""
    echo "   Top recommendations:"
    echo "$RECS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for i, rec in enumerate(data.get('recommendations', [])[:3], 1):
    title = rec.get('metadata', {}).get('title', rec.get('id', 'N/A'))
    score = 1 - rec.get('distance', 0)
    print(f'      {i}. {title} (score: {score:.3f})')
" 2>/dev/null || echo "      (Could not parse recommendations)"
else
    echo "   Response: $RECS"
fi

echo ""
echo "========================================"
echo "Test Complete!"
echo "========================================"

# Summary
if [ "$GPU_DETECTED" = "True" ] || [ "$GPU_DETECTED" = "true" ]; then
    echo ""
    echo "✓ GPU is operational on $SERVICE_URL"
    echo "  GPU Type: $(echo "$GPU_TEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('gpus',[{}])[0].get('name','N/A'))" 2>/dev/null || echo "N/A")"
else
    echo ""
    echo "Note: GPU not detected. Service is running in CPU mode."
    echo "This is expected if the startup script is still running."
    echo ""
    echo "Try again in a few minutes, or check VM status with:"
    echo "  gcloud compute ssh ruvector-gpu-vm --zone=us-central1-a --command='cat /var/log/ruvector-status.log'"
fi
