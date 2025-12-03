#!/usr/bin/env python3
"""
Deploy GPU-enabled RuVector Engine to Google Cloud Run

Cloud Run GPU requirements:
- Region: us-central1, europe-west4, or asia-northeast1
- GPU: NVIDIA L4 (nvidia-l4)
- Min instances must be 0 or 1
- Container must use CUDA-compatible base image
"""

import json
import urllib.request
import urllib.error
import urllib.parse
import os
import tarfile
import io
import time
import sys

PROJECT_ID = "agentics-foundation25lon-1899"
REGION = "us-central1"  # GPU available region
SERVICE_NAME = "ruvector-engine-gpu"
BUCKET_NAME = f"{PROJECT_ID}-ruvector"
IMAGE_NAME = f"gcr.io/{PROJECT_ID}/{SERVICE_NAME}:latest"

def get_access_token():
    """Get fresh access token"""
    creds_path = os.path.expanduser("~/.config/gcloud/application_default_credentials.json")
    with open(creds_path) as f:
        creds = json.load(f)

    data = {
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "refresh_token": creds["refresh_token"],
        "grant_type": "refresh_token"
    }

    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=urllib.parse.urlencode(data).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())["access_token"]

def upload_source(access_token, source_dir):
    """Create tarball and upload to GCS"""
    print("Creating source archive...")

    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode='w:gz') as tar:
        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__']]
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                tar.add(file_path, arcname=arcname)

    tar_data = tar_buffer.getvalue()
    print(f"  Archive size: {len(tar_data) / 1024:.1f} KB")

    object_name = f"source/{SERVICE_NAME}-{int(time.time())}.tar.gz"
    url = f"https://storage.googleapis.com/upload/storage/v1/b/{BUCKET_NAME}/o?uploadType=media&name={urllib.parse.quote(object_name)}"

    req = urllib.request.Request(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/gzip"
        },
        data=tar_data
    )

    print(f"Uploading to gs://{BUCKET_NAME}/{object_name}...")
    with urllib.request.urlopen(req) as resp:
        json.loads(resp.read().decode())

    return f"gs://{BUCKET_NAME}/{object_name}"

def trigger_cloud_build(access_token, source_uri):
    """Build GPU-enabled container"""
    print("Triggering Cloud Build (GPU image)...")

    build_config = {
        "source": {
            "storageSource": {
                "bucket": BUCKET_NAME,
                "object": source_uri.replace(f"gs://{BUCKET_NAME}/", "")
            }
        },
        "steps": [
            {
                "name": "gcr.io/cloud-builders/docker",
                "args": ["build", "-f", "Dockerfile.gpu", "-t", IMAGE_NAME, "."]
            },
            {
                "name": "gcr.io/cloud-builders/docker",
                "args": ["push", IMAGE_NAME]
            }
        ],
        "images": [IMAGE_NAME],
        "timeout": "1800s"  # 30 min for larger GPU image
    }

    url = f"https://cloudbuild.googleapis.com/v1/projects/{PROJECT_ID}/builds"

    req = urllib.request.Request(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        data=json.dumps(build_config).encode()
    )

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            build_id = result.get("metadata", {}).get("build", {}).get("id")
            print(f"  Build started: {build_id}")
            return build_id
    except urllib.error.HTTPError as e:
        error = json.loads(e.read().decode())
        print(f"Error: {error}")
        return None

def wait_for_build(access_token, build_id, timeout=1800):
    """Wait for build to complete"""
    print("Waiting for build to complete (this may take several minutes for GPU image)...")

    url = f"https://cloudbuild.googleapis.com/v1/projects/{PROJECT_ID}/builds/{build_id}"
    start_time = time.time()

    while time.time() - start_time < timeout:
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})

        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            status = result.get("status")

            if status == "SUCCESS":
                print("\n  ✓ Build completed successfully!")
                return True
            elif status in ["FAILURE", "INTERNAL_ERROR", "TIMEOUT", "CANCELLED"]:
                print(f"\n  ✗ Build failed with status: {status}")
                return False
            else:
                elapsed = int(time.time() - start_time)
                print(f"    Status: {status} ({elapsed}s elapsed)    ", end="\r")

        time.sleep(15)

    print("\n  ✗ Build timed out")
    return False

def deploy_to_cloudrun_with_gpu(access_token):
    """Deploy to Cloud Run with GPU using v2 API"""
    print("\nDeploying to Cloud Run with GPU...")

    # Cloud Run v2 API for GPU support
    url = f"https://run.googleapis.com/v2/projects/{PROJECT_ID}/locations/{REGION}/services?serviceId={SERVICE_NAME}"

    service_config = {
        "template": {
            "containers": [{
                "image": IMAGE_NAME,
                "ports": [{"containerPort": 8080}],
                "env": [
                    {"name": "NODE_ENV", "value": "production"},
                    {"name": "GCP_PROJECT_ID", "value": PROJECT_ID},
                    {"name": "GCS_BUCKET", "value": BUCKET_NAME}
                ],
                "resources": {
                    "limits": {
                        "cpu": "4",
                        "memory": "16Gi",
                        "nvidia.com/gpu": "1"  # Request 1 GPU
                    }
                }
            }],
            "scaling": {
                "minInstanceCount": 1,  # GPU requires min 1 for warmup
                "maxInstanceCount": 3
            },
            "timeout": "300s",
            "serviceAccount": f"{PROJECT_ID}@appspot.gserviceaccount.com"
        },
        "traffic": [{"type": "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST", "percent": 100}]
    }

    # First try to create, if exists then update
    req = urllib.request.Request(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        data=json.dumps(service_config).encode()
    )

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            print("  Service creation initiated...")
            return wait_for_service_ready(access_token, result.get("name"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        if e.code == 409:  # Already exists, update instead
            print("  Service exists, updating...")
            return update_cloudrun_service(access_token, service_config)
        else:
            print(f"Error creating service: {e.code}")
            print(error_body)
            return None

def update_cloudrun_service(access_token, service_config):
    """Update existing Cloud Run service"""
    url = f"https://run.googleapis.com/v2/projects/{PROJECT_ID}/locations/{REGION}/services/{SERVICE_NAME}"

    req = urllib.request.Request(
        url,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        data=json.dumps(service_config).encode()
    )

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            return wait_for_service_ready(access_token, result.get("name"))
    except urllib.error.HTTPError as e:
        print(f"Error updating service: {e.code}")
        print(e.read().decode())
        return None

def wait_for_service_ready(access_token, operation_name, timeout=600):
    """Wait for Cloud Run service to be ready"""
    print("  Waiting for service deployment...")

    url = f"https://run.googleapis.com/v2/projects/{PROJECT_ID}/locations/{REGION}/services/{SERVICE_NAME}"
    start_time = time.time()

    while time.time() - start_time < timeout:
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})

        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read().decode())
                conditions = result.get("terminalCondition", {})

                if conditions.get("type") == "Ready" and conditions.get("state") == "CONDITION_SUCCEEDED":
                    return result.get("uri")

                elapsed = int(time.time() - start_time)
                state = conditions.get("state", "PENDING")
                print(f"    Deployment status: {state} ({elapsed}s)    ", end="\r")

        except urllib.error.HTTPError:
            pass

        time.sleep(10)

    print("\n  ✗ Deployment timed out")
    return None

def set_iam_policy(access_token):
    """Allow unauthenticated access"""
    print("Setting IAM policy for public access...")

    url = f"https://run.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/services/{SERVICE_NAME}:setIamPolicy"

    policy = {
        "policy": {
            "bindings": [{"role": "roles/run.invoker", "members": ["allUsers"]}]
        }
    }

    req = urllib.request.Request(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        data=json.dumps(policy).encode()
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print("  ✓ Public access enabled")
            return True
    except urllib.error.HTTPError as e:
        print(f"  Warning: Could not set IAM policy: {e.code}")
        return False

def main():
    source_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    print("=" * 70)
    print("RuVector Engine - GPU-Enabled Cloud Run Deployment")
    print("=" * 70)
    print(f"Project:  {PROJECT_ID}")
    print(f"Region:   {REGION}")
    print(f"Service:  {SERVICE_NAME}")
    print(f"GPU:      NVIDIA L4 (1 GPU)")
    print(f"Source:   {source_dir}")
    print("=" * 70)

    access_token = get_access_token()
    print("✓ Authenticated\n")

    # Upload source
    source_uri = upload_source(access_token, source_dir)
    print(f"✓ Source uploaded\n")

    # Build GPU image
    build_id = trigger_cloud_build(access_token, source_uri)
    if not build_id:
        print("Failed to start build")
        sys.exit(1)

    if not wait_for_build(access_token, build_id):
        print("\nBuild failed. Check Cloud Build logs:")
        print(f"https://console.cloud.google.com/cloud-build/builds/{build_id}?project={PROJECT_ID}")
        sys.exit(1)

    # Deploy with GPU
    service_url = deploy_to_cloudrun_with_gpu(access_token)

    if service_url:
        set_iam_policy(access_token)

        print("\n" + "=" * 70)
        print("✓ GPU Deployment Successful!")
        print("=" * 70)
        print(f"\nService URL: {service_url}")
        print(f"\nGPU Test Endpoint:")
        print(f"  curl {service_url}/api/v1/gpu-test")
        print(f"\nHealth Check:")
        print(f"  curl {service_url}/api/v1/health")
        print("=" * 70)
    else:
        print("\nDeployment failed. Check Cloud Console for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()
