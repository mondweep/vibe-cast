#!/bin/bash
# GCP Authentication Helper for RuVector Engine

export CLOUDSDK_ROOT_DIR="/tmp/google-cloud-sdk"
export CLOUDSDK_PYTHON="/tmp/google-cloud-sdk/platform/bundledpythonunix/bin/python3"
export PYTHONPATH="/tmp/google-cloud-sdk/lib"

cd /tmp/google-cloud-sdk

echo "Starting GCP authentication..."
echo "Please paste the verification code when prompted:"
echo ""

/tmp/google-cloud-sdk/platform/bundledpythonunix/bin/python3 lib/gcloud.py auth login --no-launch-browser

echo ""
echo "Listing available projects..."
/tmp/google-cloud-sdk/platform/bundledpythonunix/bin/python3 lib/gcloud.py projects list 2>/dev/null || echo "Projects listing may require additional permissions"
