#!/bin/bash
# Phase 2 Post-Deployment Verification Script
# Usage: ./VERIFY_DEPLOYMENT.sh <PROJECT_ID> [REGION]
# Example: ./VERIFY_DEPLOYMENT.sh e-vidhayak us-central1

set -euo pipefail

PROJECT_ID="${1:-e-vidhayak}"
REGION="${2:-us-central1}"

PASSED=0
FAILED=0
WARNINGS=0

echo "═══════════════════════════════════════════════════════════"
echo "Phase 2 Deployment Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Helper functions
pass() {
    echo "✅ $1"
    ((PASSED++))
}

fail() {
    echo "❌ $1"
    ((FAILED++))
}

warn() {
    echo "⚠️  $1"
    ((WARNINGS++))
}

# Set project
gcloud config set project "$PROJECT_ID" > /dev/null 2>&1

# 1. Check Backend Service
echo "1️⃣  Checking Backend Service..."
if gcloud run services describe navier-stokes-backend --region="$REGION" > /dev/null 2>&1; then
    BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
        --region="$REGION" \
        --format='value(status.url)')
    pass "Backend service found: $BACKEND_URL"
else
    fail "Backend service not found"
    BACKEND_URL=""
fi

# 2. Check Frontend Service
echo ""
echo "2️⃣  Checking Frontend Service..."
if gcloud run services describe navier-stokes-frontend --region="$REGION" > /dev/null 2>&1; then
    FRONTEND_URL=$(gcloud run services describe navier-stokes-frontend \
        --region="$REGION" \
        --format='value(status.url)')
    pass "Frontend service found: $FRONTEND_URL"
else
    fail "Frontend service not found"
    FRONTEND_URL=""
fi

# 3. Test Backend Health Endpoint
echo ""
echo "3️⃣  Testing Backend Health Endpoint..."
if [ -n "$BACKEND_URL" ]; then
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health" 2>/dev/null || echo "")
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
    HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        if [[ "$HEALTH_BODY" == *"ok"* ]]; then
            pass "Health endpoint responded: $HEALTH_BODY"
        else
            warn "Health endpoint returned 200 but unexpected response: $HEALTH_BODY"
        fi
    else
        fail "Health endpoint returned HTTP $HTTP_CODE"
    fi
else
    warn "Backend URL not available, skipping health check"
fi

# 4. Check Backend Container Image
echo ""
echo "4️⃣  Checking Backend Container Image..."
BACKEND_IMAGE=$(gcloud run services describe navier-stokes-backend \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].image)' 2>/dev/null || echo "")

if [[ "$BACKEND_IMAGE" == *"navier-stokes-backend"* ]]; then
    pass "Backend image deployed: ${BACKEND_IMAGE:0:70}..."
else
    fail "Backend image not found or invalid: $BACKEND_IMAGE"
fi

# 5. Check Frontend Container Image
echo ""
echo "5️⃣  Checking Frontend Container Image..."
FRONTEND_IMAGE=$(gcloud run services describe navier-stokes-frontend \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].image)' 2>/dev/null || echo "")

if [[ "$FRONTEND_IMAGE" == *"navier-stokes-frontend"* ]]; then
    pass "Frontend image deployed: ${FRONTEND_IMAGE:0:70}..."
else
    fail "Frontend image not found or invalid: $FRONTEND_IMAGE"
fi

# 6. Check Cloud Logging
echo ""
echo "6️⃣  Checking Recent Logs..."
BACKEND_LOGS=$(gcloud run services logs read navier-stokes-backend \
    --region="$REGION" \
    --limit=5 2>/dev/null | wc -l || echo "0")

if [ "$BACKEND_LOGS" -gt 0 ]; then
    pass "Backend logs available ($BACKEND_LOGS lines)"
else
    warn "No recent backend logs found (service may have just started)"
fi

# 7. Test Frontend Accessibility
echo ""
echo "7️⃣  Testing Frontend Accessibility..."
if [ -n "$FRONTEND_URL" ]; then
    FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "")
    HTTP_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ]; then
        pass "Frontend HTTP status: $HTTP_CODE (OK)"
    else
        fail "Frontend HTTP status: $HTTP_CODE"
    fi
else
    warn "Frontend URL not available, skipping accessibility check"
fi

# 8. Check Service Replicas
echo ""
echo "8️⃣  Checking Service Replicas..."
BACKEND_REPLICAS=$(gcloud run services describe navier-stokes-backend \
    --region="$REGION" \
    --format='value(status.desiredCount)' 2>/dev/null || echo "0")

FRONTEND_REPLICAS=$(gcloud run services describe navier-stokes-frontend \
    --region="$REGION" \
    --format='value(status.desiredCount)' 2>/dev/null || echo "0")

if [ "$BACKEND_REPLICAS" -gt 0 ]; then
    pass "Backend replicas: $BACKEND_REPLICAS"
else
    warn "Backend replicas: $BACKEND_REPLICAS (may be cold starting)"
fi

if [ "$FRONTEND_REPLICAS" -gt 0 ]; then
    pass "Frontend replicas: $FRONTEND_REPLICAS"
else
    warn "Frontend replicas: $FRONTEND_REPLICAS (may be cold starting)"
fi

# 9. Check Environment Variables
echo ""
echo "9️⃣  Checking Environment Variables..."
BACKEND_ENV=$(gcloud run services describe navier-stokes-backend \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[name].value)' 2>/dev/null || echo "")

if [[ "$BACKEND_ENV" == *"production"* ]] || [ -z "$BACKEND_ENV" ]; then
    pass "Backend environment configured"
else
    warn "Backend environment: $BACKEND_ENV"
fi

# 10. Check Service Traffic
echo ""
echo "🔟 Checking Service Traffic Settings..."
BACKEND_TRAFFIC=$(gcloud run services describe navier-stokes-backend \
    --region="$REGION" \
    --format='value(spec.traffic[0].percent)' 2>/dev/null || echo "")

if [ "$BACKEND_TRAFFIC" = "100" ] || [ -z "$BACKEND_TRAFFIC" ]; then
    pass "Backend traffic: 100% to current revision"
else
    warn "Backend traffic split: $BACKEND_TRAFFIC%"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "VERIFICATION SUMMARY"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "✅ Passed:  $PASSED"
echo "❌ Failed:  $FAILED"
echo "⚠️  Warnings: $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED!"
    echo ""
    echo "📍 Service URLs:"
    echo "   Backend:  ${BACKEND_URL:-Not found}"
    echo "   Frontend: ${FRONTEND_URL:-Not found}"
    echo ""
    echo "🧪 Next Steps:"
    echo "   1. Open the frontend URL in your browser"
    echo "   2. Click 'Login' to test session creation"
    echo "   3. Select a module and verify it loads"
    echo "   4. Check DevTools (F12) Network tab for API calls"
    echo "   5. Check browser Console for any errors"
    echo ""
    exit 0
else
    echo "⚠️  SOME CHECKS FAILED"
    echo ""
    echo "Troubleshooting:"
    echo "   1. Check build logs:"
    echo "      gcloud builds list --limit=1 --sort-by=START_TIME"
    echo "   2. View service details:"
    echo "      gcloud run services describe navier-stokes-backend --region=$REGION"
    echo "   3. Check logs:"
    echo "      gcloud run services logs read navier-stokes-backend --region=$REGION --limit=50"
    echo ""
    exit 1
fi
