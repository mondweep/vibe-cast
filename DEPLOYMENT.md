# Sequential Deployment Guide: Genomic One

Follow these steps in exact order to ensure your frontend can communicate with your Rust backend.

---

## Phase 1: Deploy the Backend (Render)
*We do this first so we can get the API URL for the frontend.*

1. Log in to [Render.com](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository (`mondweep/vibe-cast`).
4. On the configuration page, set:
   - **Name**: `genomic-one-api`
   - **Branch**: `genomics-exploration`
   - **Root Directory**: `genomic_one`
   - **Runtime**: `Rust`
   - **Build Command**: `cargo build --release`
   - **Start Command**: `./target/release/genomic_one --serve`
   - **Plan**: `Starter`
5. Click **Advanced** and add an **Environment Variable**:
   - `PORT`: `8080`
6. Click **Create Web Service**.
7. **Wait**: The first Rust build takes 5-10 minutes. Once the logs say **"Your service is live"**, copy the URL at the top of the page (e.g., `https://genomic-one-api.onrender.com`).

---

## Phase 2: Deploy the Frontend (Vercel)
*Now we connect the UI to the engine we just launched.*

1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New** > **Project**.
3. Import the `mondweep/vibe-cast` repository.
4. On the **Configure Project** screen:
   - **Project Name**: `genomic-one`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Select `genomic_one/frontend`.
5. Open the **Environment Variables** section and add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your Render Backend URL.
6. Click **Deploy**.

*Note: Since the repository is now clean, Vercel will automatically detect the `genomics-exploration` branch and the new `next.config.mjs` settings.*

---

## Phase 3: Verification
1. Open your Vercel URL.
2. Check the **K-mer Similarity** and **Disease Trajectory** cards.
3. If they load data, your "Sovereign Architecture" is fully integrated!

*Note: If the cards are blank, check your Browser Console (F12) for any CORS or timeout errors.*

---

## 4. Troubleshooting 404s on Sub-pages (Render)
If you can see the homepage but get a 404 when navigating to `/brain/simulate` or refreshing:
1. Go to your **Render Static Site Settings**.
2. Find the **Redirects/Rewrites** section.
3. Add a rule:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
This ensures the browser always loads your app even on deep links.
