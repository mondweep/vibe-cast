#!/usr/bin/env python3
"""Deploy a built directory to a Firebase Hosting site via the REST API.

Used for the initial deploy from a workstation. Routine deploys go through
GitHub Actions with Workload Identity Federation instead (ADR 0007).

Usage:
  python3 tools/deploy_hosting.py <site-id> <dist-dir> <gcp-project> <access-token>
"""
import gzip
import hashlib
import json
import mimetypes
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://firebasehosting.googleapis.com/v1beta1"


def request(method, url, token, project, body=None, raw=None, content_type=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "x-goog-user-project": project,
    }
    if raw is not None:
        data = raw
        headers["Content-Type"] = content_type or "application/octet-stream"
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    else:
        data = None

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            payload = response.read()
            return json.loads(payload) if payload and content_type is None else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise SystemExit(f"{method} {url}\n  HTTP {error.code}: {detail}") from None


def collect(dist: Path):
    """Gzip every file and index it by the sha256 of the compressed bytes."""
    by_path, by_hash = {}, {}
    for path in sorted(dist.rglob("*")):
        if not path.is_file():
            continue
        # mtime=0 so identical content always produces an identical hash.
        blob = gzip.compress(path.read_bytes(), mtime=0)
        digest = hashlib.sha256(blob).hexdigest()
        by_path["/" + str(path.relative_to(dist)).replace("\\", "/")] = digest
        by_hash[digest] = blob
    return by_path, by_hash


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    _, site, dist_dir, project, token = sys.argv
    dist = Path(dist_dir)
    if not dist.is_dir():
        sys.exit(f"not a directory: {dist}")

    by_path, by_hash = collect(dist)
    print(f"{len(by_path)} files to deploy to site '{site}'")

    version = request(
        "POST",
        f"{API}/sites/{site}/versions",
        token,
        project,
        body={
            "config": {
                # A single-page app: unknown paths serve index.html.
                "rewrites": [{"glob": "**", "path": "/index.html"}],
                "headers": [
                    {
                        "glob": "/assets/**",
                        "headers": {"Cache-Control": "public, max-age=31536000, immutable"},
                    },
                    {
                        "glob": "/index.html",
                        "headers": {"Cache-Control": "no-cache"},
                    },
                ],
            }
        },
    )
    version_name = version["name"]
    print(f"version {version_name}")

    populated = request(
        "POST", f"{API}/{version_name}:populateFiles", token, project, body={"files": by_path}
    )

    required = populated.get("uploadRequiredHashes", []) or []
    upload_url = populated.get("uploadUrl", "")
    print(f"{len(required)} file(s) need uploading")
    for digest in required:
        request(
            "POST", f"{upload_url}/{digest}", token, project,
            raw=by_hash[digest], content_type="application/octet-stream",
        )

    request(
        "PATCH", f"{API}/{version_name}?update_mask=status", token, project,
        body={"status": "FINALIZED"},
    )

    release = request(
        "POST", f"{API}/sites/{site}/releases?versionName={version_name}", token, project, body={}
    )
    print("released:", release.get("name", "?"))
    print(f"live at https://{site}.web.app")

    mimetypes.init()  # keep the import meaningful for future content-type work


if __name__ == "__main__":
    main()
