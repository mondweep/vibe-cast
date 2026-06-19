# Keyless CI/CD deploy to Cloud Run (Workload Identity Federation)

Push to deploy. GitHub Actions authenticates to Google Cloud using **Workload
Identity Federation (WIF)** — a short-lived OIDC token minted per run — so there
are **no service-account keys** stored anywhere, and no credentials ever leave
your control.

```
 push to aircraft-tracking ─► GitHub Actions
        │  (OIDC id-token, no keys)
        ▼
   Google STS ──verifies repo== mondweep/vibe-cast──► impersonate deployer SA
        │
        ▼
   build image ─► Artifact Registry ─► gcloud run deploy ─► public HTTPS URL
```

## One-time setup (you run this, as yourself)

**Prerequisites:** the `gcloud` CLI, a GCP project with **billing enabled**, and
`gcloud auth login` as the project owner.

1. **Bootstrap GCP** (creates the deployer SA, Artifact Registry repo, the WIF
   pool/provider, and scopes impersonation to *only* this repo):
   ```bash
   ./scripts/gcp-bootstrap-wif.sh YOUR_PROJECT_ID europe-west2
   ```
   It prints four values.

2. **Add them as GitHub repo _Variables_** (not secrets — none are sensitive):
   repo → **Settings → Secrets and variables → Actions → _Variables_ tab → New
   repository variable**:
   | Variable | Example |
   | --- | --- |
   | `GCP_PROJECT_ID` | `my-project` |
   | `GCP_REGION` | `europe-west2` |
   | `GCP_DEPLOY_SA` | `skywatch-deployer@my-project.iam.gserviceaccount.com` |
   | `GCP_WIF_PROVIDER` | `projects/123.../locations/global/workloadIdentityPools/github-pool/providers/github-provider` |

3. **Deploy:** push a change under `services/gateway/**` to `aircraft-tracking`,
   or run the **Deploy (Cloud Run)** workflow manually (Actions tab →
   *Run workflow*). The deployed **URL is printed in the run summary** — share it
   with your team. (Until the variables are set, the job skips cleanly.)

## What gets deployed
The `services/gateway` image (gateway API **+** browser front-end) to a Cloud Run
service `skywatch-gateway`, **public** (`--allow-unauthenticated`, per your
choice), warm (`--min-instances=1`), with the default observer + cache env vars.
Tweak these in [`.github/workflows/deploy-cloud-run.yml`](../.github/workflows/deploy-cloud-run.yml).

### Adding OpenSky credentials
Recommended for team traffic. Run the bootstrap with the secret in the
environment, which stores it in Secret Manager and grants the runtime SA access:
```bash
OPENSKY_CLIENT_SECRET='your-secret' ./scripts/gcp-bootstrap-wif.sh YOUR_PROJECT_ID europe-west2
```
Then add repo Variables `OPENSKY_CLIENT_ID=<id>` and
`GCP_OPENSKY_SECRET=opensky-client-secret`. The deploy step wires them in
automatically.

### Make it team-only (shared token)
To require a token on `GET /sky` (so a public URL isn't open to the world):
```bash
# create the token secret + let the runtime read it
printf '%s' "$(openssl rand -hex 24)" | \
  gcloud secrets create skywatch-api-token --data-file=- --project YOUR_PROJECT_ID
PN=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding skywatch-api-token \
  --member="serviceAccount:${PN}-compute@developer.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor --project YOUR_PROJECT_ID
```
Then add repo Variable `GCP_API_TOKEN_SECRET=skywatch-api-token` and redeploy.
Share the app as `https://<service-url>/?token=<the-token>`; point ESP32 devices
at the same token in their config portal. (Leave the Variable unset to stay
public.)

## Security properties
- **No keys**: WIF mints a short-lived token per workflow run; nothing long-lived
  is stored in GitHub.
- **Repo-scoped**: the deployer SA can be impersonated **only** by
  `mondweep/vibe-cast` (enforced by the `attribute.repository` binding and the
  provider's `repository_owner` condition).
- **Least privilege**: the deployer SA holds only `run.admin`,
  `iam.serviceAccountUser`, and `artifactregistry.writer`.
- To revoke at any time: delete the SA, or remove the
  `roles/iam.workloadIdentityUser` binding.

## Why not have the assistant deploy directly?
That would require putting a live token for your Google account into an ephemeral
cloud sandbox. WIF keeps deploys keyless and under your control — the assistant
only authors the workflow; **you** own the GCP setup and the credentials.
