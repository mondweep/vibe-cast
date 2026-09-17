# Deployment

Implements [ADR-005](adr/ADR-005-cloud-run-firestore.md).

## What is deployed

| | |
|---|---|
| Project | `vibe-cast-projects` |
| Region | `europe-west2` (London) — NFR-9 data residency |
| Service | Cloud Run `somnus`, min-instances 0, max 4, 512 MiB |
| Storage | Firestore Native mode, europe-west2 |
| Images | Artifact Registry `europe-west2-docker.pkg.dev/vibe-cast-projects/somnus` |
| URL | `https://somnus-276367410975.europe-west2.run.app` |

The PWA and the API are served from the same container and the same origin, so
there is one deploy and no CORS.

## Deploying

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SHA=$(git rev-parse --short HEAD) \
  --region=europe-west2
```

Cloud Build builds the image, pushes both the SHA and `latest` tags, and
deploys the SHA-tagged image to Cloud Run.

### One-time setup already done

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firestore.googleapis.com identitytoolkit.googleapis.com

gcloud firestore databases create --location=europe-west2
gcloud artifacts repositories create somnus --repository-format=docker --location=europe-west2

# Cloud Build's service account needs to be able to deploy to Cloud Run.
# Without these the image builds and pushes, then the deploy step fails with
# PERMISSION_DENIED on run.services.get.
SA=276367410975-compute@developer.gserviceaccount.com
gcloud projects add-iam-policy-binding vibe-cast-projects \
  --member="serviceAccount:$SA" --role=roles/run.admin --condition=None
gcloud projects add-iam-policy-binding vibe-cast-projects \
  --member="serviceAccount:$SA" --role=roles/iam.serviceAccountUser --condition=None
```

## Two things that will confuse you

### `/healthz` returns a Google 404

It never reaches the container. Every other path — static assets, the SPA
fallback, the authenticated API — is served normally, so this is something
upstream claiming that specific path rather than a problem with the app.

The health handler is therefore mounted at **`/_health`** and
**`/api/v1/health`** as well. Use those for monitoring and uptime checks.
`/api/v1/health` is registered before the authenticated router, so it stays
public.

### The service is not publicly reachable

The `dxsure.uk` organization enforces **Domain Restricted Sharing**
(`constraints/iam.allowedPolicyMemberDomains`, allowing only customer
`C00yemq36`). Granting `allUsers` the `run.invoker` role is refused:

```
FAILED_PRECONDITION: One or more users named in the policy do not belong to a
permitted customer, perhaps due to an organization policy.
```

This is a deliberate org-level guardrail, not a misconfiguration.

**To reach the app from a laptop right now**, without changing anything:

```bash
gcloud run services proxy somnus --region=europe-west2 --port=8080
# then open http://127.0.0.1:8080
```

**To reach it from a phone**, which is the actual use case, one of these has to
happen:

| Option | Effect | Cost |
|---|---|---|
| Project-scoped exception to the DRS policy for `vibe-cast-projects` | The URL becomes publicly reachable. The org-wide policy is untouched; only this project can grant public access. | free |
| HTTPS load balancer + Identity-Aware Proxy | Public URL, but only permitted Google accounts can open it. Strongest option. | ~£18/month for the load balancer, which breaks NFR-7 |
| Firebase Hosting in front of Cloud Run | May sidestep the constraint, but needs verifying | free tier |

Because the app holds nothing server-side until a user signs in — all capture
and analysis is local to the browser — a public URL exposes an empty app
rather than anyone's data. That is the argument for the first option; the
decision is still the org owner's.

## Verifying a deploy

```bash
gcloud run services proxy somnus --region=europe-west2 --port=8083 &
sleep 20
curl -s http://127.0.0.1:8083/_health          # {"status":"ok","analyserVersion":"1.0.0"}
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8083/api/v1/nights   # 401
```

A 401 on `/api/v1/nights` without a token is the correct answer, not a failure:
it confirms the auth middleware is live.

## Cost

Scale-to-zero means the bill is effectively nothing on days the app isn't
opened. Firestore holds a few hundred small documents per user. Expected spend
is well inside NFR-7's £5/month; the load-balancer option above is the one
thing that would break it.
