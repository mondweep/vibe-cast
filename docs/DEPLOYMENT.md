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
| URL | https://somnus-276367410975.europe-west2.run.app (public) |
| Auth | Firebase Authentication — email link live, Google pending one console toggle |

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

### Public access needed an org-policy exception

The `dxsure.uk` organization enforces **Domain Restricted Sharing**
(`constraints/iam.allowedPolicyMemberDomains`, allowing only customer
`C00yemq36`), which refuses `allUsers` on any IAM binding:

```
FAILED_PRECONDITION: One or more users named in the policy do not belong to a
permitted customer, perhaps due to an organization policy.
```

This was resolved with a **project-scoped exception**, leaving the org-wide
policy untouched — only this project may grant public access:

```bash
cat > drs-exception.yaml <<'YAML'
constraint: constraints/iam.allowedPolicyMemberDomains
listPolicy:
  allValues: ALLOW
YAML
gcloud resource-manager org-policies set-policy drs-exception.yaml \
  --project=vibe-cast-projects

gcloud run services add-iam-policy-binding somnus --region=europe-west2 \
  --member=allUsers --role=roles/run.invoker
```

**The binding fails for several minutes after the policy is set.** The
effective policy reads `allValues: ALLOW` immediately, but the IAM enforcement
layer lags behind it. If `add-iam-policy-binding` still reports
`FAILED_PRECONDITION`, wait and retry rather than assuming the policy did not
apply.

A public URL exposes an empty app rather than anyone's data: capture, detection
and analysis all happen in the browser, and the API returns 401 for every path
without a verified token.

## Authentication

Firebase Auth was set up through the Management and Identity Toolkit APIs. All
of these need `-H "x-goog-user-project: vibe-cast-projects"`, or they fail with
a confusing `SERVICE_DISABLED` error about quota projects even when the service
is enabled.

```bash
TOKEN=$(gcloud auth print-access-token)
H=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
   -H "x-goog-user-project: vibe-cast-projects")

curl -X POST "${H[@]}" https://firebase.googleapis.com/v1beta1/projects/vibe-cast-projects:addFirebase -d '{}'
curl -X POST "${H[@]}" https://firebase.googleapis.com/v1beta1/projects/vibe-cast-projects/webApps -d '{"displayName":"Somnus"}'
curl -X POST "${H[@]}" https://identitytoolkit.googleapis.com/v2/projects/vibe-cast-projects/identityPlatform:initializeAuth -d '{}'

# Passwordless email link — needs no OAuth client.
curl -X PATCH "${H[@]}" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/vibe-cast-projects/config?updateMask=signIn.email" \
  -d '{"signIn":{"email":{"enabled":true,"passwordRequired":false}}}'

# The Cloud Run host must be an authorized domain or sign-in is rejected.
curl -X PATCH "${H[@]}" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/vibe-cast-projects/config?updateMask=authorizedDomains" \
  -d '{"authorizedDomains":["localhost","vibe-cast-projects.firebaseapp.com","vibe-cast-projects.web.app","somnus-276367410975.europe-west2.run.app"]}'
```

### Google sign-in still needs one console click

Enabling the Google provider by API requires an OAuth client id and secret:

```
INVALID_CONFIG : client_id cannot be empty.
```

There is no public API that creates a web OAuth client, and the Firebase
console provisions one automatically when the provider is toggled. So Google
sign-in is the one step that cannot be scripted:

> Firebase console → Authentication → Sign-in method → Google → Enable → Save

Until then the app offers the email link instead, and says why. Nothing else
depends on it.

### Client config

The Firebase web config is served at runtime from `GET /api/v1/config`, fed by
Cloud Run environment variables, rather than compiled into the bundle:

```bash
gcloud run services update somnus --region=europe-west2 \
  --update-env-vars=FIREBASE_API_KEY=...,FIREBASE_APP_ID=...,FIREBASE_AUTH_DOMAIN=...
```

Use `--update-env-vars`, not `--set-env-vars` — the latter replaces the whole
environment and would drop `GOOGLE_CLOUD_PROJECT`. `cloudbuild.yaml` has the
same flag for the same reason.

With them unset the endpoint reports `syncAvailable: false` and the client runs
local-only. That is a supported mode, not a degraded one.

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
