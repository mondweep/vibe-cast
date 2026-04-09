# Deployment Guide

Complete instructions for deploying Pi Network Explorer to Netlify.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git repository set up
- Netlify account (free tier available)
- Pi Network API key from https://pi.ruv.io
- PubNub account with free tier or paid plan

## Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast
git checkout claude/pi-tinkering-86sN1
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your actual keys:

```
PUBNUB_PUBLISH_KEY=your_pubnub_publish_key
PUBNUB_SUBSCRIBE_KEY=your_pubnub_subscribe_key
REACT_APP_PUBNUB_SUBSCRIBE_KEY=your_pubnub_subscribe_key
PI_NETWORK_API_URL=https://pi.ruv.io
DEBUG=false
```

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:5173 in your browser.

### 5. Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Deployment to Netlify

### Option A: Connect GitHub Repository (Recommended)

1. **Push code to GitHub**
   ```bash
   git remote add origin https://github.com/your-username/vibe-cast.git
   git push -u origin claude/pi-tinkering-86sN1
   ```

2. **Connect to Netlify**
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Select your GitHub repository
   - Choose branch: `claude/pi-tinkering-86sN1`
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Deploy"

3. **Set Environment Variables**
   - Go to Site settings → Build & deploy → Environment
   - Add environment variables:
     - `PUBNUB_PUBLISH_KEY`
     - `PUBNUB_SUBSCRIBE_KEY`
     - `PI_NETWORK_API_URL`
   - Trigger a new deploy for variables to take effect

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Connect to Netlify**
   ```bash
   netlify connect
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod
   ```

   Or with build:
   ```bash
   netlify deploy --prod --build
   ```

### Option C: Manual ZIP Upload

1. **Build locally**
   ```bash
   npm run build
   ```

2. **Upload to Netlify**
   - Go to https://app.netlify.com
   - Select your site
   - Drag and drop the `dist/` folder
   - Or use: `netlify deploy --prod --dir=dist`

## Post-Deployment Setup

### 1. Configure Netlify Functions

Ensure `netlify.toml` is correctly configured:

```toml
[build]
  command = "npm run build"
  functions = "functions"
  publish = "dist"
```

Verify functions are deployed:
- Go to Site settings → Functions
- You should see:
  - `api-search`
  - `api-contribute`
  - `api-vote`

### 2. Set Environment Variables (If Not Done)

```bash
netlify env:set PUBNUB_PUBLISH_KEY "your_key"
netlify env:set PUBNUB_SUBSCRIBE_KEY "your_key"
netlify env:set PI_NETWORK_API_URL "https://pi.ruv.io"
```

### 3. Test Deployment

1. Visit your Netlify URL (e.g., https://vibe-cast.netlify.app)
2. Enter your Pi Network API key
3. Search for knowledge
4. Submit a contribution
5. Vote on results

### 4. Enable HTTPS

- Netlify automatically enables HTTPS for all sites
- Go to Site settings → Domain management to verify SSL certificate

## Production Checklist

- [ ] Environment variables set correctly
- [ ] API keys are not in version control
- [ ] `npm run build` completes without errors
- [ ] `npm run type-check` passes
- [ ] All three API functions deployed and accessible
- [ ] PubNub keys configured and working
- [ ] HTTPS enabled
- [ ] Tested authentication flow
- [ ] Tested search functionality
- [ ] Tested contribution submission
- [ ] Tested vote submission
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing
- [ ] Monitor Netlify Functions for errors

## Monitoring & Troubleshooting

### Check Function Logs

```bash
netlify functions:list
netlify functions:invoke api-search
```

Or in Netlify dashboard:
- Site settings → Functions → Logs

### Monitor Performance

- **Lighthouse:** https://developers.google.com/web/tools/lighthouse
- **WebPageTest:** https://www.webpagetest.org/
- **Netlify Analytics:** Site settings → Analytics

### Common Issues

#### Issue: Functions returning 404

**Solution:**
- Verify `functions/` directory exists
- Check `netlify.toml` has correct `functions = "functions"` path
- Redeploy: `netlify deploy --prod`

#### Issue: API calls failing with 401

**Solution:**
- Verify PUBNUB_PUBLISH_KEY and PUBNUB_SUBSCRIBE_KEY are set
- Check keys are valid at https://admin.pubnub.com
- Restart functions: Trigger a new deploy

#### Issue: PubNub messages not received

**Solution:**
- Verify REACT_APP_PUBNUB_SUBSCRIBE_KEY is set in frontend
- Check browser console for PubNub connection errors
- Ensure PubNub account is active and has free tier enabled
- Monitor PubNub Console for message traffic

#### Issue: High latency on search

**Solution:**
- Check pi.ruv.io API status
- Monitor Netlify Function execution time in logs
- Consider upgrading PubNub plan for higher throughput
- Check network tab in browser DevTools

## Scaling Considerations

### Current Limits

- **Netlify Functions:** 10s timeout, 128MB memory (ample for MVP)
- **PubNub Free Tier:** 1M messages/month, 100 concurrent connections
- **Concurrent Users:** ~50-100 with current setup

### Scaling Steps

1. **Upgrade PubNub Plan:** If exceeding message quota
   - Pay-as-you-go: $1 per 10M messages
   - Or: Subscribe to Pro plan ($99/month)

2. **Upgrade Netlify Plan:** If exceeding function invocations
   - Pro: $19/month for higher limits
   - Business: Custom for enterprise

3. **Add Caching:** For frequently searched queries
   - Redis or in-memory cache on backend
   - Browser-side caching with Service Workers

4. **Database:** For user preferences and history
   - MongoDB Atlas for document storage
   - PostgreSQL for relational data

## Rollback Procedure

### Rollback to Previous Deploy

1. **Find previous deploy**
   ```bash
   netlify deploys:list
   ```

2. **Rollback**
   ```bash
   netlify deploy --alias=rollback
   ```

3. **Set as production**
   - In Netlify dashboard, go to Deploys
   - Right-click previous deploy
   - Select "Set as production deploy"

## CI/CD Integration

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [claude/pi-tinkering-86sN1]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run type-check
      - run: npm run build
      - uses: nwtour/netlify-cli-action@v1
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

Set secrets in GitHub:
- `NETLIFY_SITE_ID`: From Netlify site settings
- `NETLIFY_AUTH_TOKEN`: From Netlify user settings

## Maintenance

### Weekly

- Check Netlify analytics
- Monitor PubNub usage
- Review error logs

### Monthly

- Update dependencies: `npm update`
- Security audit: `npm audit`
- Performance review: Lighthouse score

### Quarterly

- Test disaster recovery
- Review and update documentation
- Plan scaling needs

## Support Resources

- **Netlify Docs:** https://docs.netlify.com/
- **PubNub Docs:** https://www.pubnub.com/docs/
- **Pi Network:** https://pi.ruv.io/
- **React Docs:** https://react.dev/
- **Vite Guide:** https://vitejs.dev/

## Contacts

- **Deployment Issues:** See TROUBLESHOOTING.md
- **Feature Requests:** GitHub Issues
- **Security Issues:** Do not open public issue, contact maintainers
