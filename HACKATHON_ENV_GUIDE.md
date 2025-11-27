# GCP Setup for Agentics Hackathon

To allow the AI agent to programmatically access Google Cloud Platform (GCP) and build your hackathon project, follow these steps.

## 1. Create a Service Account
1.  Log in to the [Google Cloud Console](https://console.cloud.google.com/) as `devstar1899@gcplab.me`.
2.  Select your project.
3.  Navigate to **IAM & Admin** > **Service Accounts**.
4.  Click **+ CREATE SERVICE ACCOUNT**.
5.  Name it (e.g., `hackathon-builder`).
6.  Grant permissions:
    *   **Editor** (for broad access during hackathon)
    *   Or specific roles like **Vertex AI User**, **Cloud Run Admin**, **Storage Admin**.

## 2. Generate Key
1.  Click on the newly created service account.
2.  Go to the **Keys** tab.
3.  Click **ADD KEY** > **Create new key**.
4.  Select **JSON**.
5.  The file will download automatically.

## 3. Configure Project
1.  Move the downloaded JSON file to your project root and rename it to `gcp-key.json`.
2.  **IMPORTANT:** Add `gcp-key.json` to your `.gitignore` file to prevent leaking secrets!
3.  Create a `.env` file with the following content:

```env
# GCP Configuration
GOOGLE_PROJECT_ID=your-project-id-here
GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json
GOOGLE_REGION=us-central1

# Optional: Agentics Hackathon Token (if provided via CLI login)
# AGENTICS_TOKEN=...
```

## 4. Verify Access
Run the following to check if the agent can see your bucket or resources:
```bash
# Verify auth
gcloud auth activate-service-account --key-file=gcp-key.json
```

## Option B: User Credentials (ADC)
*Use this if you do not have permission to create Service Accounts.*

1.  **Install gcloud CLI**: Ensure the Google Cloud SDK is installed.
2.  **Login**: Run the following command in your terminal:
    ```bash
    gcloud auth application-default login
    ```
3.  **Authenticate**: A browser window will open. Log in with `devstar1899@gcplab.me` and allow access.
4.  **Configure Project**:
    ```bash
    gcloud config set project <your-project-id>
    ```
5.  **Update .env**:
    You only need to set the Project ID. The libraries will automatically find your user credentials.
    ```env
    GOOGLE_PROJECT_ID=your-project-id-here
    # GOOGLE_APPLICATION_CREDENTIALS is NOT needed for ADC
    ```
