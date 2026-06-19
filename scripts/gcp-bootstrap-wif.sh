#!/usr/bin/env bash
#
# One-time bootstrap for keyless GitHub Actions -> Cloud Run deploys via
# Workload Identity Federation (no service-account keys). Run this YOURSELF,
# authenticated as the owner of the GCP project (gcloud auth login). It never
# needs to run inside CI or be shared with anyone.
#
# Usage:
#   ./scripts/gcp-bootstrap-wif.sh <PROJECT_ID> [REGION]
#
# Then add the four GCP_* values it prints as GitHub repo *Variables*
# (Settings -> Secrets and variables -> Actions -> Variables). See
# docs/DEPLOY-CICD.md.

set -euo pipefail

PROJECT_ID="${1:-}"
REGION="${2:-europe-west2}"
GITHUB_REPO="${GITHUB_REPO:-mondweep/vibe-cast}"
GITHUB_OWNER="${GITHUB_REPO%%/*}"

POOL_ID="github-pool"
PROVIDER_ID="github-provider"
SA_NAME="skywatch-deployer"
AR_REPO="skywatch"

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: provide your GCP project id: $0 <PROJECT_ID> [REGION]" >&2
  exit 1
fi
command -v gcloud >/dev/null || { echo "ERROR: gcloud CLI not found." >&2; exit 1; }

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo ">> Project=$PROJECT_ID  Region=$REGION  Repo=$GITHUB_REPO"

echo ">> Enabling APIs..."
gcloud services enable \
  run.googleapis.com artifactregistry.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  --project "$PROJECT_ID"

echo ">> Artifact Registry repo ($AR_REPO)..."
gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker --location="$REGION" \
  --description="SkyWatch images" --project "$PROJECT_ID" 2>/dev/null \
  || echo "   (already exists)"

echo ">> Deployer service account..."
gcloud iam service-accounts create "$SA_NAME" \
  --display-name="SkyWatch Cloud Run deployer" --project "$PROJECT_ID" 2>/dev/null \
  || echo "   (already exists)"

echo ">> Granting roles to $SA_EMAIL..."
for ROLE in roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" --role="$ROLE" \
    --condition=None --quiet >/dev/null
done

echo ">> Workload Identity pool + GitHub OIDC provider..."
gcloud iam workload-identity-pools create "$POOL_ID" \
  --location=global --display-name="GitHub pool" --project "$PROJECT_ID" 2>/dev/null \
  || echo "   (pool already exists)"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --location=global --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='${GITHUB_OWNER}'" \
  --project "$PROJECT_ID" 2>/dev/null \
  || echo "   (provider already exists)"

POOL_NAME="$(gcloud iam workload-identity-pools describe "$POOL_ID" \
  --location=global --project "$PROJECT_ID" --format='value(name)')"

echo ">> Allowing only ${GITHUB_REPO} to impersonate the deployer SA..."
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project "$PROJECT_ID" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${GITHUB_REPO}" \
  --quiet >/dev/null

PROVIDER_NAME="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --location=global --workload-identity-pool="$POOL_ID" \
  --project "$PROJECT_ID" --format='value(name)')"

# --- Optional: OpenSky OAuth2 secret -----------------------------------------
# Run with OPENSKY_CLIENT_SECRET=xxx ./scripts/gcp-bootstrap-wif.sh ... to store
# the OpenSky client secret in Secret Manager and let the Cloud Run runtime read
# it. (The client *id* is non-secret and goes in a repo Variable.)
if [[ -n "${OPENSKY_CLIENT_SECRET:-}" ]]; then
  echo ">> Configuring OpenSky secret in Secret Manager..."
  gcloud services enable secretmanager.googleapis.com --project "$PROJECT_ID"
  if gcloud secrets describe opensky-client-secret --project "$PROJECT_ID" >/dev/null 2>&1; then
    printf '%s' "$OPENSKY_CLIENT_SECRET" | \
      gcloud secrets versions add opensky-client-secret --data-file=- --project "$PROJECT_ID" >/dev/null
  else
    printf '%s' "$OPENSKY_CLIENT_SECRET" | \
      gcloud secrets create opensky-client-secret --data-file=- --project "$PROJECT_ID" >/dev/null
  fi
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  gcloud secrets add-iam-policy-binding opensky-client-secret \
    --project "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role=roles/secretmanager.secretAccessor --quiet >/dev/null
  echo "   Secret 'opensky-client-secret' ready; runtime SA granted access."
fi

cat <<EOF

====================================================================
 Bootstrap complete. Add these as GitHub repo *Variables*
 (Settings -> Secrets and variables -> Actions -> Variables tab):
--------------------------------------------------------------------
 GCP_PROJECT_ID   = ${PROJECT_ID}
 GCP_REGION       = ${REGION}
 GCP_DEPLOY_SA    = ${SA_EMAIL}
 GCP_WIF_PROVIDER = ${PROVIDER_NAME}
====================================================================

 Then push to 'aircraft-tracking' (or run the "Deploy (Cloud Run)"
 workflow manually) and it will build + deploy. The service URL is
 printed in the workflow run summary.
EOF

if [[ -n "${OPENSKY_CLIENT_SECRET:-}" ]]; then
  cat <<'EOF'

 OpenSky OAuth2 enabled — also add these repo Variables:
   GCP_OPENSKY_SECRET = opensky-client-secret
   OPENSKY_CLIENT_ID  = <your OpenSky client id>
EOF
fi
