# Production Deployment Guide - Real SCORM Generation on Netlify

This guide shows you how to enable **real SCORM package generation** on your Netlify URL so users can upload documents and get actual packages.

## The Challenge

Document processing takes **2-5 minutes**, but Netlify has timeout limits:
- **Free tier**: 10 seconds ❌
- **Pro tier**: 26 seconds (still too short) ❌
- **Background functions**: 15 minutes ✅ (Pro only)

## Solution Options

### Option 1: Netlify Pro with Background Functions (Recommended)

**Cost**: $19/month
**Processing Time**: Up to 15 minutes
**User Experience**: Upload → Get job ID → Poll for completion → Download

#### Step 1: Upgrade to Netlify Pro

1. Go to your Netlify dashboard
2. Click **Upgrade** → **Pro** ($19/month)
3. Complete payment

#### Step 2: Enable Background Functions

Background functions are already implemented in your codebase:
- `netlify/functions/process-document-background.js`

However, they require additional setup with status storage (Redis/Blob storage).

**Simplified Alternative**: Use Netlify's extended timeout (26s) for smaller documents:

```javascript
// In netlify.toml (already configured)
[functions]
  timeout = 26  # Maximum for Pro
```

### Option 2: AWS Lambda + S3 + API Gateway (Best for Production)

**Cost**: Pay-per-use (~$5-20/month for moderate use)
**Processing Time**: Up to 15 minutes
**Scalability**: Unlimited

#### Why AWS?

- ✅ No timeouts for async processing
- ✅ S3 for storing generated packages
- ✅ SQS for queue-based processing
- ✅ More control and scalability

#### Quick Setup:

1. **Create Lambda Function** (same code as Netlify function)
2. **Add S3 Bucket** for storing SCORM packages
3. **Add API Gateway** for HTTP endpoint
4. **Update frontend** to call Lambda endpoint instead

### Option 3: Dedicated Server (Most Reliable)

**Cost**: $5-10/month (DigitalOcean, Linode)
**Processing Time**: Unlimited
**Control**: Full

#### Deploy to DigitalOcean:

```bash
# 1. Create droplet (Node.js)
# 2. Clone repository
git clone https://github.com/your-repo/vibe-cast.git
cd vibe-cast/NLP-and-video-rendering

# 3. Install dependencies
npm install

# 4. Set up environment
echo "ANTHROPIC_API_KEY=your-key" > .env
echo "PORT=3000" >> .env

# 5. Start server
npm install -g pm2
pm2 start src/server.js --name elearning-tool
pm2 startup
pm2 save
```

Create `src/server.js`:

```javascript
const express = require('express');
const multer = require('multer');
const { getParser } = require('./parsers');
const { NLPOrchestrator } = require('./nlp/NLPOrchestrator');
const { ActivityFactory } = require('./interactive/ActivityFactory');
const { SCORMPackageBuilder } = require('./scorm/SCORMPackageBuilder');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/api/process', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;

        // Process document
        const parser = getParser(filePath);
        const parsedContent = await parser.parse(filePath);

        const nlpOrchestrator = new NLPOrchestrator({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        const enrichedContent = await nlpOrchestrator.process(parsedContent);

        const activityFactory = new ActivityFactory();
        const interactiveContent = activityFactory.generate(enrichedContent);

        const scormBuilder = new SCORMPackageBuilder({
            version: '1.2',
            masteryScore: 80,
            enableBookmarking: true,
            enableTracking: true
        });

        const outputPath = path.join('output', `scorm-${Date.now()}.zip`);
        await scormBuilder.build(enrichedContent, interactiveContent, null, outputPath);

        // Send file
        res.download(outputPath, 'scorm-package.zip', async (err) => {
            // Cleanup
            await fs.unlink(filePath);
            await fs.unlink(outputPath);
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

Then point your domain to the droplet IP.

### Option 4: Vercel with Edge Functions

**Cost**: Free tier available
**Processing Time**: 60 seconds (Pro tier)
**Similar to**: Netlify but with better timeout

Deploy to Vercel instead of Netlify - similar setup but longer timeouts.

## Recommended Approach for You

Given your requirements (share link with users for real generation), here's what I recommend:

### Immediate Solution (Today)

**Run locally with ngrok** to create a public URL:

```bash
# Terminal 1: Start local server
cd NLP-and-video-rendering
export ANTHROPIC_API_KEY=your-key
npm run dev:server

# Terminal 2: Expose with ngrok
ngrok http 8888
```

You'll get a public URL like: `https://abc123.ngrok.io`

Share this with users! It works exactly like the Netlify site but without timeouts.

**Pros**:
- ✅ Works immediately
- ✅ Real processing (no demo mode)
- ✅ Free
- ✅ Public URL to share

**Cons**:
- ❌ Your computer must stay on
- ❌ URL changes each time you restart ngrok (pay for permanent URL)
- ❌ Not suitable for permanent deployment

### Short-term Solution (This Week)

**Deploy to Railway.app** (similar to Heroku):

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway init
railway up

# 4. Add environment variable
railway variables set ANTHROPIC_API_KEY=your-key
```

You'll get a permanent URL: `https://your-app.railway.app`

**Pros**:
- ✅ Free tier: $5 credit/month
- ✅ No timeout limits
- ✅ Permanent URL
- ✅ Easy deployment

**Cons**:
- ❌ Need to add server code (I can help)
- ❌ May exceed free tier with heavy use

### Long-term Solution (Production)

**AWS Lambda + S3 + CloudFront**

Most professional and scalable. I can help set this up if needed.

## Quick Decision Matrix

| Solution | Cost | Setup Time | Reliability | Best For |
|----------|------|------------|-------------|----------|
| **ngrok** | Free* | 5 min | Medium | Testing/demos |
| **Railway.app** | $5/mo | 30 min | High | Small-medium use |
| **DigitalOcean** | $5-10/mo | 1 hour | High | Full control |
| **AWS Lambda** | Pay-per-use | 2-3 hours | Very High | Production |
| **Netlify Pro** | $19/mo | Complex | Medium** | If already on Netlify |

\* ngrok free tier changes URL each restart; permanent URL is $8/month
\** Requires background function implementation

## What I Recommend for You

**Today/Demo**: Use **ngrok** (5 minutes setup)
**Production**: Deploy to **Railway.app** (best cost/benefit)

## Next Steps

Would you like me to:

1. **Set up ngrok** for immediate public URL? (5 min)
2. **Add server code** for Railway.app deployment? (30 min)
3. **Deploy to Railway.app** with permanent URL? (30 min)
4. **Implement background functions** for Netlify Pro? (complex, 2-3 hours)

Let me know which direction you'd like to go and I'll help you set it up!

## Testing Locally First

Before deploying anywhere, test that it works locally:

```bash
cd NLP-and-video-rendering
export ANTHROPIC_API_KEY=sk-ant-your-key-here
npm run dev:server

# Open http://localhost:8888
# Upload your PowerPoint file
# Watch it process (2-5 minutes)
# Download real SCORM package
```

If this works perfectly, then we know deployment will work too!
