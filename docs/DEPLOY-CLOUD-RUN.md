# Deploy SkyWatch to Google Cloud Run

Run the gateway (API **and** browser front-end) as one always-warm container on
Cloud Run and share a single HTTPS URL with your team. The same URL serves the
radar UI at `/` and feeds any ESP32 devices via `/sky`.

> **Access model:** this guide deploys **public / unauthenticated** (anyone with
> the URL can use it). That's fine for a small trusted team, but note it also
> spends *your* OpenSky API credits. To lock it down later, see
> [§ Locking it down](#locking-it-down).

## Why Cloud Run (vs Netlify/Vercel)
SkyWatch's `/sky` does live fetches + SGP4 over a satellite group (several
seconds) and relies on an **in-memory cache** to stay within OpenSky's rate
limits. That needs a long-running container with warm memory — not short,
stateless serverless functions. Cloud Run runs the container, keeps it warm with
`--min-instances=1`, gives free HTTPS, and scales for the whole team behind one
cache.

## Prerequisites
- A Google Cloud project with billing enabled.
- The `gcloud` CLI installed and authenticated: `gcloud auth login`.
- Enable the APIs (one-off):
  ```bash
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
    artifactregistry.googleapis.com secretmanager.googleapis.com
  ```
- Set defaults (pick a region near your team):
  ```bash
  gcloud config set project YOUR_PROJECT_ID
  gcloud config set run/region europe-west2
  ```

## One-command deploy (build from source)
From the repo root — Cloud Run builds the `services/gateway` Dockerfile for you:

```bash
gcloud run deploy skywatch-gateway \
  --source services/gateway \
  --allow-unauthenticated \
  --min-instances=1 --max-instances=3 \
  --cpu=1 --memory=512Mi --cpu-boost \
  --timeout=120 --concurrency=80 \
  --set-env-vars=OBSERVER_LAT=51.5074,OBSERVER_LON=-0.1278,OBSERVER_ALT_KM=0.03,FLIGHT_RANGE_KM=50,MIN_ELEVATION_DEG=10,SATELLITE_GROUP=visual,PASS_WINDOW_HOURS=6,CACHE_TTL_MS=30000
```

When it finishes, `gcloud` prints a **Service URL** like
`https://skywatch-gateway-xxxxx-nw.a.run.app`. Open it in a browser — that's the
front-end. Share that URL with your team.

### What the flags do
| Flag | Why |
| --- | --- |
| `--allow-unauthenticated` | Public URL (your chosen access model). |
| `--min-instances=1` | Keep one container **warm** so the TLE/snapshot cache survives and there are no cold-start re-fetches. (This is the one always-on cost.) |
| `--cpu=1 --memory=512Mi` | Enough for SGP4 over a satellite group. Bump `--memory=1Gi` for large groups (e.g. `starlink`). |
| `--cpu-boost` | Faster first response after a deploy. |
| `--timeout=120` | Comfortably covers the first (uncached) `/sky` compute. |
| `--concurrency=80` | One warm container serves the whole team; the cache dedupes their requests. |

> Cloud Run injects `PORT` (8080) and the gateway already listens on it — nothing
> to change.

## Add OpenSky credentials (recommended)
For team traffic, use OpenSky OAuth2 so you're not on anonymous limits. Keep the
secret in Secret Manager, not in plaintext env vars:

```bash
# Store the client secret
printf '%s' 'YOUR_OPENSKY_CLIENT_SECRET' | \
  gcloud secrets create opensky-client-secret --data-file=-

# Let Cloud Run's runtime service account read it
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding opensky-client-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor

# Wire it into the service
gcloud run services update skywatch-gateway \
  --set-env-vars=OPENSKY_CLIENT_ID=YOUR_OPENSKY_CLIENT_ID \
  --set-secrets=OPENSKY_CLIENT_SECRET=opensky-client-secret:latest
```

## Updating
Re-run the same `gcloud run deploy --source services/gateway …` command; Cloud
Run builds a new revision and shifts traffic to it. Roll back in the console or:
```bash
gcloud run services update-traffic skywatch-gateway --to-revisions=PREVIOUS=100
```

## Declarative option (infra-as-code)
Prefer YAML? Build/push an image to Artifact Registry, then apply
[`services/gateway/deploy/cloud-run.service.yaml`](../services/gateway/deploy/cloud-run.service.yaml)
(edit the `image:` and env first):
```bash
gcloud builds submit services/gateway \
  --tag europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/skywatch/gateway:latest
gcloud run services replace services/gateway/deploy/cloud-run.service.yaml
gcloud run services add-iam-policy-binding skywatch-gateway \
  --member=allUsers --role=roles/run.invoker   # public
```

## Point ESP32 devices at it
In each device's config portal, set **Gateway URL** to the Cloud Run Service URL
(`https://…run.app`). Cloud Run provides a valid TLS cert, so HTTPS just works.

## Cost
With `--min-instances=1` you pay for one small always-on instance (Cloud Run has
a monthly free tier that offsets much of this). Set `--min-instances=0` to scale
to zero and pay near-nothing — at the cost of cold starts that re-fetch TLEs on
the first request.

## Locking it down
Public was chosen here. If you later want it team-only, easiest paths:
- **Cloud Run IAM** — drop `--allow-unauthenticated` and grant specific Google
  accounts `roles/run.invoker` (users hit it via `gcloud`/IAP proxy).
- **Cloudflare Access / IAP** in front of the URL (Google SSO, no code change).
- **A shared token** in the gateway — ask and this can be added to `/sky` + the UI.
