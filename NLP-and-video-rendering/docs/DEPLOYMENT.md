# Deployment Guide - eLearning Automation Tool

## 🚀 Deploying to Netlify

This guide will help you deploy the eLearning automation tool to Netlify so users can access it via a public URL.

### Prerequisites

1. **GitHub account** (or GitLab/Bitbucket)
2. **Netlify account** (free tier works fine)
3. **Anthropic API key** (from https://console.anthropic.com/)

### Option 1: Deploy via Netlify UI (Recommended)

#### Step 1: Push to GitHub

```bash
# Ensure all changes are committed
git add .
git commit -m "Add web UI for eLearning automation tool"
git push origin main
```

#### Step 2: Connect to Netlify

1. Go to [Netlify](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose your Git provider (GitHub/GitLab/Bitbucket)
4. Select the `vibe-cast` repository
5. Configure build settings:
   - **Base directory**: `NLP-and-video-rendering`
   - **Build command**: `npm run build`
   - **Publish directory**: `NLP-and-video-rendering/public`
   - **Functions directory**: `NLP-and-video-rendering/netlify/functions`

#### Step 3: Add Environment Variables

1. In Netlify dashboard, go to: Site settings → Environment variables
2. Add the following variable:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: Your Anthropic API key (starts with `sk-ant-`)

#### Step 4: Deploy

1. Click "Deploy site"
2. Wait for build to complete (2-3 minutes)
3. Your site will be live at: `https://[random-name].netlify.app`

#### Step 5: Custom Domain (Optional)

1. Go to Domain settings
2. Add custom domain
3. Follow DNS configuration instructions

### Option 2: Deploy via CLI

```bash
# Navigate to project directory
cd NLP-and-video-rendering

# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Set environment variable
netlify env:set ANTHROPIC_API_KEY your-api-key-here

# Deploy
netlify deploy --prod
```

### Important Notes

#### ⚠️ Function Timeout Limitations

Netlify Functions have timeout limits:
- **Free tier**: 10 seconds
- **Pro tier**: 26 seconds
- **Background functions**: 15 minutes (requires Pro)

Since document processing takes 2-5 minutes, you have two options:

**Option A: Use Netlify Background Functions (Recommended for Production)**

Update `netlify/functions/process-document.js` to use background functions:

```javascript
// Rename file to: process-document-background.js
exports.handler = async (event, context) => {
    // Add to start of function
    if (event.httpMethod === 'POST') {
        // Return immediately with job ID
        const jobId = Date.now().toString();

        // Process in background
        processInBackground(jobId, event);

        return {
            statusCode: 202,
            body: JSON.stringify({ jobId, status: 'processing' })
        };
    }
};
```

**Option B: Local Processing with Web UI (Current Setup)**

For demo/testing purposes:
1. Users can download and run the tool locally
2. Use the web UI locally via `npm run dev:server`
3. Access at `http://localhost:8888`

### Testing Your Deployment

1. Visit your Netlify URL
2. Upload a test PowerPoint or Word file
3. Watch the processing steps
4. Download the generated SCORM package
5. Test in SCORM Cloud or your LMS

### Monitoring & Logs

**View Function Logs:**
1. Netlify Dashboard → Functions
2. Click on `process-document`
3. View real-time logs

**Monitor Usage:**
- Netlify Dashboard → Analytics
- Check function invocations
- Monitor bandwidth usage

### Cost Considerations

**Netlify Free Tier Includes:**
- 125,000 function requests/month
- 100 GB bandwidth/month
- 300 build minutes/month
- Automatic HTTPS
- Custom domains

**When to Upgrade:**
- Need longer function timeouts (> 10s)
- Higher traffic (> 125k requests/month)
- Background function processing
- Advanced analytics

### Troubleshooting

#### Build Fails

```bash
# Check build logs in Netlify dashboard
# Common issues:

# 1. Missing dependencies
npm install

# 2. TypeScript errors
npm run build

# 3. Check node version (should be 18+)
node --version
```

#### Function Timeout

```
Error: Function execution timed out
```

**Solutions:**
1. Upgrade to Netlify Pro for 26s timeout
2. Use background functions
3. Implement queue-based processing
4. Use external services (AWS Lambda, Google Cloud Functions)

#### API Key Not Working

```
Error: Server configuration error: API key not set
```

**Solutions:**
1. Check environment variable is set correctly
2. Redeploy after adding env vars
3. Verify API key is valid

#### Large File Upload Fails

```
Error: Payload too large
```

**Solutions:**
1. Netlify has a 6MB synchronous payload limit
2. Use asynchronous processing
3. Implement chunked upload
4. Use external storage (S3, Cloudinary)

### Alternative Deployment Options

If Netlify doesn't meet your needs, consider:

#### Vercel
- Similar to Netlify
- 10s timeout (60s for Pro)
- Good for Next.js apps

#### AWS Lambda + S3 + CloudFront
- Longer timeouts (15 minutes)
- More control
- Higher complexity
- Pay-per-use pricing

#### Google Cloud Run
- Container-based
- No timeout limits
- Scales to zero
- Pay only when running

#### Heroku
- Dyno-based hosting
- 30s request timeout
- Good for long-running processes
- Simple deployment

### Production Recommendations

For a production-ready deployment:

1. **Use Background Processing**
   - Implement job queue (Redis/SQS)
   - Store files in S3/Cloud Storage
   - Send email notifications when complete

2. **Add Authentication**
   - Implement user login
   - Rate limiting
   - API key management

3. **Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring (New Relic)
   - Uptime monitoring (Pingdom)

4. **Caching**
   - CDN for static assets
   - Cache processed results
   - Redis for session storage

5. **Security**
   - HTTPS only
   - Input validation
   - File virus scanning
   - Rate limiting

### Example Deployment Workflow

```bash
# 1. Development
npm run dev:server
# Test locally at http://localhost:8888

# 2. Preview deployment
netlify deploy
# Get preview URL for testing

# 3. Production deployment
netlify deploy --prod
# Live at your production URL

# 4. Monitor
netlify functions:log process-document
```

### Next Steps

1. ✅ Deploy to Netlify
2. ✅ Test with real documents
3. 🔄 Gather user feedback
4. 🔄 Implement improvements
5. 🔄 Scale based on usage

### Support

For deployment issues:
- [Netlify Support](https://answers.netlify.com/)
- [Netlify Documentation](https://docs.netlify.com/)
- Create an issue in this repository

### Quick Commands Reference

```bash
# Local development
npm run dev:server

# Build for production
npm run build

# Deploy preview
npm run deploy:preview

# Deploy production
npm run deploy

# View logs
netlify functions:log process-document

# Check deployment status
netlify status
```

## 🌐 Your Deployed URL

Once deployed, share this URL with users:

```
https://your-site-name.netlify.app
```

Users can:
1. Upload PowerPoint/Word files
2. Generate SCORM packages
3. Download and use in their LMS

---

**Congratulations! Your eLearning automation tool is now live! 🎉**
