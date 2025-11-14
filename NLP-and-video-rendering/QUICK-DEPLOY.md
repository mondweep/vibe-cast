# 🚀 Quick Deploy to Netlify - 5 Minutes

Get your eLearning automation tool live in 5 minutes!

## Step 1: Create Netlify Account (30 seconds)

1. Go to [netlify.com](https://netlify.com)
2. Click "Sign up"
3. Choose "Sign up with GitHub"

## Step 2: Deploy Site (2 minutes)

### Option A: Via Netlify UI (Easiest)

1. In Netlify dashboard, click **"Add new site"** → **"Import an existing project"**

2. Choose **GitHub** and authorize Netlify

3. Select your repository: **`mondweep/vibe-cast`**

4. Configure build settings:
   ```
   Base directory: NLP-and-video-rendering
   Build command: npm run build
   Publish directory: NLP-and-video-rendering/public
   Functions directory: NLP-and-video-rendering/netlify/functions
   ```

5. Click **"Deploy site"**

### Option B: Via Deploy Button (Fastest)

Click this button:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mondweep/vibe-cast)

## Step 3: Add API Key (1 minute)

1. In Netlify dashboard, go to: **Site settings** → **Environment variables**

2. Click **"Add a variable"**

3. Add:
   ```
   Key: ANTHROPIC_API_KEY
   Value: sk-ant-your-api-key-here
   ```

4. Click **"Create variable"**

5. Go to **Deploys** → **Trigger deploy** → **Deploy site**

## Step 4: Test Your Site (1 minute)

1. Click on your site URL (e.g., `https://random-name-12345.netlify.app`)

2. Try uploading a test document

3. Watch the processing steps

4. Download your SCORM package

## Step 5: Share with Users ✨

Your site is live! Share the URL:

```
https://your-site-name.netlify.app
```

## 🎨 Customize (Optional)

### Change Site Name

1. **Site settings** → **General** → **Site details**
2. Click **"Change site name"**
3. Enter your preferred name (e.g., `elearning-automation`)
4. Your new URL: `https://elearning-automation.netlify.app`

### Add Custom Domain

1. **Domain settings** → **Add custom domain**
2. Enter your domain (e.g., `learn.yourdomain.com`)
3. Follow DNS configuration instructions
4. SSL certificate auto-configures

## ⚡ Important Notes

### Function Timeout

**Free tier**: 10 second timeout
**Issue**: Document processing takes 2-5 minutes

**Solutions**:

1. **Upgrade to Pro** ($19/month) - Get 26 second timeout
2. **Use locally** - Run `npm run dev:server` for full processing
3. **Implement queue** - Use background processing (see DEPLOYMENT.md)

### Recommended Setup

For production use:
- ✅ Netlify Pro ($19/month)
- ✅ Background functions
- ✅ Custom domain
- ✅ Analytics enabled

## 📊 Monitor Usage

**View Function Logs:**
1. Netlify Dashboard → **Functions**
2. Click **process-document**
3. View real-time logs and errors

**Check Analytics:**
- Netlify Dashboard → **Analytics**
- See function invocations
- Monitor bandwidth

## 🐛 Troubleshooting

### "Function execution timed out"

**Problem**: Processing takes > 10 seconds

**Solutions**:
1. Upgrade to Netlify Pro
2. Use background functions
3. Run locally for testing

### "API key not set"

**Problem**: Missing environment variable

**Solutions**:
1. Add ANTHROPIC_API_KEY in settings
2. Redeploy after adding variable

### Build fails

**Problem**: TypeScript compilation error

**Solutions**:
```bash
# Test locally
cd NLP-and-video-rendering
npm install
npm run build
```

## 🎯 What Users Get

Users visiting your URL can:
1. ✅ Upload PowerPoint (.pptx) or Word (.docx) files
2. ✅ See real-time processing progress
3. ✅ Download SCORM-compliant packages
4. ✅ Use immediately in their LMS

## 📱 Test on Different Devices

- **Desktop**: Full features
- **Tablet**: Optimized layout
- **Mobile**: Touch-friendly upload

## 🔒 Security Built-in

- ✅ HTTPS (automatic)
- ✅ File validation
- ✅ Size limits (50MB)
- ✅ No data retention
- ✅ Temporary file cleanup

## 📈 Scaling

**Free tier includes:**
- 125,000 function requests/month
- 100 GB bandwidth/month
- Unlimited sites

**When to upgrade:**
- More than 10,000 conversions/month
- Need background processing
- Want priority support

## 🆘 Need Help?

1. **Check logs**: Netlify Dashboard → Functions → Logs
2. **Read docs**: [DEPLOYMENT.md](docs/DEPLOYMENT.md)
3. **GitHub Issues**: Create an issue with error details

## ✅ Deployment Checklist

- [ ] Netlify account created
- [ ] Site deployed from GitHub
- [ ] ANTHROPIC_API_KEY added
- [ ] Test upload successful
- [ ] Custom domain configured (optional)
- [ ] Site name customized
- [ ] URL shared with users

## 🎉 Congratulations!

Your eLearning automation tool is live!

**Next Steps:**
1. Share URL with beta testers
2. Gather feedback
3. Monitor usage in Netlify dashboard
4. Iterate based on user needs

---

**Your Live Site**: https://your-site-name.netlify.app

Ready to transform documents into eLearning! 🚀
