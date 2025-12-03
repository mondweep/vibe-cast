#!/usr/bin/env python3
"""
Deploy RuVector Engine to Google Cloud Run

This script:
1. Uploads source code to Cloud Storage
2. Triggers Cloud Build to create container
3. Deploys to Cloud Run
"""

import json
import urllib.request
import urllib.error
import urllib.parse
import os
import tarfile
import io
import base64
import time
import sys

PROJECT_ID = "agentics-foundation25lon-1899"
REGION = "us-central1"
SERVICE_NAME = "ruvector-engine"
BUCKET_NAME = f"{PROJECT_ID}-ruvector"

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

    # Create tarball in memory
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode='w:gz') as tar:
        for root, dirs, files in os.walk(source_dir):
            # Skip node_modules and other unnecessary dirs
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__']]

            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                tar.add(file_path, arcname=arcname)

    tar_data = tar_buffer.getvalue()
    print(f"  Archive size: {len(tar_data) / 1024:.1f} KB")

    # Upload to GCS
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
        result = json.loads(resp.read().decode())

    return f"gs://{BUCKET_NAME}/{object_name}"

def trigger_cloud_build(access_token, source_uri):
    """Trigger Cloud Build to build and deploy"""
    print("Triggering Cloud Build...")

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
                "args": ["build", "-t", f"gcr.io/{PROJECT_ID}/{SERVICE_NAME}:latest", "."]
            },
            {
                "name": "gcr.io/cloud-builders/docker",
                "args": ["push", f"gcr.io/{PROJECT_ID}/{SERVICE_NAME}:latest"]
            },
            {
                "name": "gcr.io/google.com/cloudsdktool/cloud-sdk",
                "entrypoint": "gcloud",
                "args": [
                    "run", "deploy", SERVICE_NAME,
                    "--image", f"gcr.io/{PROJECT_ID}/{SERVICE_NAME}:latest",
                    "--region", REGION,
                    "--platform", "managed",
                    "--allow-unauthenticated",
                    "--memory", "1Gi",
                    "--cpu", "1",
                    "--min-instances", "0",
                    "--max-instances", "10",
                    "--set-env-vars", f"GCP_PROJECT_ID={PROJECT_ID},GCS_BUCKET={BUCKET_NAME}"
                ]
            }
        ],
        "images": [f"gcr.io/{PROJECT_ID}/{SERVICE_NAME}:latest"],
        "timeout": "1200s"
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

def wait_for_build(access_token, build_id, timeout=600):
    """Wait for build to complete"""
    print("Waiting for build to complete...")

    url = f"https://cloudbuild.googleapis.com/v1/projects/{PROJECT_ID}/builds/{build_id}"
    start_time = time.time()

    while time.time() - start_time < timeout:
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            status = result.get("status")

            if status == "SUCCESS":
                print("  ✓ Build completed successfully!")
                return True
            elif status in ["FAILURE", "INTERNAL_ERROR", "TIMEOUT", "CANCELLED"]:
                print(f"  ✗ Build failed with status: {status}")
                if result.get("statusDetail"):
                    print(f"    Detail: {result['statusDetail']}")
                return False
            else:
                elapsed = int(time.time() - start_time)
                print(f"    Status: {status} ({elapsed}s elapsed)", end="\r")

        time.sleep(10)

    print("  ✗ Build timed out")
    return False

def get_service_url(access_token):
    """Get the deployed service URL"""
    url = f"https://run.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/services/{SERVICE_NAME}"

    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {access_token}"}
    )

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            return result.get("status", {}).get("url")
    except:
        return None

def main():
    source_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    print("=" * 60)
    print("RuVector Engine - Cloud Run Deployment")
    print("=" * 60)
    print(f"Project: {PROJECT_ID}")
    print(f"Region: {REGION}")
    print(f"Service: {SERVICE_NAME}")
    print(f"Source: {source_dir}")
    print("=" * 60)

    # Get token
    access_token = get_access_token()
    print("✓ Authenticated\n")

    # Upload source
    source_uri = upload_source(access_token, source_dir)
    print(f"✓ Source uploaded: {source_uri}\n")

    # Trigger build
    build_id = trigger_cloud_build(access_token, source_uri)
    if not build_id:
        print("Failed to start build")
        sys.exit(1)

    # Wait for completion
    print()
    if wait_for_build(access_token, build_id):
        print()
        service_url = get_service_url(access_token)
        if service_url:
            print("=" * 60)
            print("✓ Deployment successful!")
            print(f"\nService URL: {service_url}")
            print(f"\nAPI endpoints:")
            print(f"  Health:    {service_url}/api/v1/health")
            print(f"  Init:      POST {service_url}/api/v1/initialize")
            print(f"  Recommend: GET {service_url}/api/v1/recommendations/:userId")
            print("=" * 60)
        else:
            print("Deployment may still be in progress. Check Cloud Console.")
    else:
        print("\nDeployment failed. Check Cloud Build logs in the console:")
        print(f"https://console.cloud.google.com/cloud-build/builds?project={PROJECT_ID}")
        sys.exit(1)

if __name__ == "__main__":
    main()
