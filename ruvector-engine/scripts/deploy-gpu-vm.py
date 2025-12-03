#!/usr/bin/env python3
"""
Deploy RuVector Engine on a Compute Engine VM with GPU

Alternative to Cloud Run when GPU quota is not available for Cloud Run.
Uses NVIDIA T4 GPU on a Compute Engine VM.
"""

import json
import urllib.request
import urllib.error
import urllib.parse
import os
import time

PROJECT_ID = "agentics-foundation25lon-1899"
ZONE = "us-central1-a"
INSTANCE_NAME = "ruvector-gpu-vm"
MACHINE_TYPE = "n1-standard-4"
GPU_TYPE = "nvidia-tesla-t4"
GPU_COUNT = 1
IMAGE_NAME = f"gcr.io/{PROJECT_ID}/ruvector-engine-gpu:latest"

def get_access_token():
    creds_path = os.path.expanduser("~/.config/gcloud/application_default_credentials.json")
    with open(creds_path) as f:
        creds = json.load(f)

    data = urllib.parse.urlencode({
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "refresh_token": creds["refresh_token"],
        "grant_type": "refresh_token"
    })

    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=data.encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())["access_token"]

def create_gpu_vm(access_token):
    """Create a Compute Engine VM with GPU"""

    startup_script = f'''#!/bin/bash
set -e

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install NVIDIA drivers and container toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt-get update
apt-get install -y nvidia-driver-535 nvidia-container-toolkit

# Configure Docker for NVIDIA
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

# Authenticate to GCR
gcloud auth configure-docker --quiet

# Pull and run the container
docker pull {IMAGE_NAME}
docker run -d --gpus all -p 80:8080 --restart always --name ruvector {IMAGE_NAME}

echo "RuVector GPU deployment complete!" > /var/log/ruvector-status.log
'''

    instance_config = {
        "name": INSTANCE_NAME,
        "machineType": f"zones/{ZONE}/machineTypes/{MACHINE_TYPE}",
        "guestAccelerators": [{
            "acceleratorType": f"zones/{ZONE}/acceleratorTypes/{GPU_TYPE}",
            "acceleratorCount": GPU_COUNT
        }],
        "scheduling": {
            "onHostMaintenance": "TERMINATE",
            "automaticRestart": True
        },
        "disks": [{
            "boot": True,
            "autoDelete": True,
            "initializeParams": {
                "sourceImage": "projects/debian-cloud/global/images/family/debian-11",
                "diskSizeGb": "50"
            }
        }],
        "networkInterfaces": [{
            "network": "global/networks/default",
            "accessConfigs": [{
                "type": "ONE_TO_ONE_NAT",
                "name": "External NAT"
            }]
        }],
        "metadata": {
            "items": [{
                "key": "startup-script",
                "value": startup_script
            }]
        },
        "serviceAccounts": [{
            "email": "default",
            "scopes": [
                "https://www.googleapis.com/auth/cloud-platform"
            ]
        }],
        "tags": {
            "items": ["http-server", "https-server"]
        }
    }

    url = f"https://compute.googleapis.com/compute/v1/projects/{PROJECT_ID}/zones/{ZONE}/instances"

    req = urllib.request.Request(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        data=json.dumps(instance_config).encode()
    )

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            return result.get("name")
    except urllib.error.HTTPError as e:
        error = json.loads(e.read().decode())
        if "already exists" in str(error):
            print("  VM already exists")
            return "exists"
        print(f"Error creating VM: {e.code}")
        print(json.dumps(error, indent=2))
        return None

def wait_for_operation(access_token, operation_name, timeout=300):
    """Wait for zone operation to complete"""
    url = f"https://compute.googleapis.com/compute/v1/projects/{PROJECT_ID}/zones/{ZONE}/operations/{operation_name}"
    start = time.time()

    while time.time() - start < timeout:
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})
        with urllib.request.urlopen(req) as resp:
            op = json.loads(resp.read().decode())
            status = op.get("status")

            if status == "DONE":
                if op.get("error"):
                    return False, op.get("error")
                return True, None

            elapsed = int(time.time() - start)
            print(f"    Operation status: {status} ({elapsed}s)", end="\r")

        time.sleep(5)

    return False, "Timeout"

def get_vm_ip(access_token):
    """Get the external IP of the VM"""
    url = f"https://compute.googleapis.com/compute/v1/projects/{PROJECT_ID}/zones/{ZONE}/instances/{INSTANCE_NAME}"

    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})

    try:
        with urllib.request.urlopen(req) as resp:
            instance = json.loads(resp.read().decode())
            interfaces = instance.get("networkInterfaces", [])
            if interfaces:
                access_configs = interfaces[0].get("accessConfigs", [])
                if access_configs:
                    return access_configs[0].get("natIP")
    except:
        pass
    return None

def create_firewall_rule(access_token):
    """Create firewall rule for HTTP traffic"""
    url = f"https://compute.googleapis.com/compute/v1/projects/{PROJECT_ID}/global/firewalls"

    rule = {
        "name": "allow-ruvector-http",
        "network": f"projects/{PROJECT_ID}/global/networks/default",
        "direction": "INGRESS",
        "priority": 1000,
        "targetTags": ["http-server"],
        "allowed": [{
            "IPProtocol": "tcp",
            "ports": ["80", "8080"]
        }],
        "sourceRanges": ["0.0.0.0/0"]
    }

    req = urllib.request.Request(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        data=json.dumps(rule).encode()
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print("  ✓ Firewall rule created")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print("  Firewall rule already exists")
        else:
            print(f"  Warning: Could not create firewall rule: {e.code}")

def main():
    print("=" * 70)
    print("RuVector Engine - GPU VM Deployment")
    print("=" * 70)
    print(f"Project:      {PROJECT_ID}")
    print(f"Zone:         {ZONE}")
    print(f"VM Name:      {INSTANCE_NAME}")
    print(f"Machine Type: {MACHINE_TYPE}")
    print(f"GPU:          {GPU_TYPE} x {GPU_COUNT}")
    print("=" * 70)

    access_token = get_access_token()
    print("✓ Authenticated\n")

    # Create firewall rule
    print("Creating firewall rule...")
    create_firewall_rule(access_token)

    # Create VM
    print("\nCreating GPU VM...")
    operation = create_gpu_vm(access_token)

    if not operation:
        print("Failed to create VM")
        return

    if operation != "exists":
        print(f"  Operation: {operation}")
        success, error = wait_for_operation(access_token, operation)

        if not success:
            print(f"\n  ✗ VM creation failed: {error}")
            return

        print("\n  ✓ VM created successfully!")

    # Get IP
    print("\nWaiting for VM to get IP address...")
    for _ in range(12):
        ip = get_vm_ip(access_token)
        if ip:
            break
        time.sleep(5)

    if not ip:
        print("  Could not get VM IP")
        return

    print(f"  External IP: {ip}")

    print("\n" + "=" * 70)
    print("GPU VM Deployment Initiated!")
    print("=" * 70)
    print(f"""
The VM is now being set up with:
- NVIDIA T4 GPU
- Docker with NVIDIA container toolkit
- RuVector Engine container

This will take 5-10 minutes for the startup script to complete.

Service URL (after startup completes):
  http://{ip}/api/v1/health
  http://{ip}/api/v1/gpu-test

To check startup status:
  1. SSH into the VM:
     gcloud compute ssh {INSTANCE_NAME} --zone={ZONE}

  2. Check startup log:
     cat /var/log/ruvector-status.log

  3. Check container:
     docker ps
     docker logs ruvector

To delete when done:
  gcloud compute instances delete {INSTANCE_NAME} --zone={ZONE}
""")
    print("=" * 70)

if __name__ == "__main__":
    main()
