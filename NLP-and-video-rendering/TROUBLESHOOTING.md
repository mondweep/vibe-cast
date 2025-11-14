# Troubleshooting Guide

## Common Issues and Solutions

### 500 Internal Server Error on Netlify Functions

#### Symptoms
- Browser console shows 500 errors from `/.netlify/functions/process-document-background`
- Browser console shows 500 errors from `/.netlify/functions/job-status`
- Polling fails after multiple attempts

#### Root Causes

1. **Missing Environment Variables**
   - `ANTHROPIC_API_KEY` not set in Netlify environment
   - Solution: Set environment variable in Netlify UI under Site Settings → Environment Variables

2. **Netlify Blobs Not Available**
   - Blob storage requires deployment to Netlify (not available locally without `netlify dev`)
   - Solution: Ensure you're testing with `netlify dev` or deployed to Netlify

3. **TypeScript Not Built**
   - The `dist` folder with compiled TypeScript doesn't exist
   - Solution: Ensure `npm run build` is run during deployment (configured in `netlify.toml`)

4. **Wrong Function Call Pattern**
   - Frontend calling `process-document-background` directly instead of `start-processing`
   - Solution: Fixed in latest code - frontend now calls `start-processing` first

#### Debugging Steps

1. **Check Netlify Function Logs**
   ```bash
   # In Netlify UI: Site → Functions → Select function → View logs
   ```

2. **Check Environment Variables**
   ```bash
   # In Netlify UI: Site Settings → Environment Variables
   # Ensure ANTHROPIC_API_KEY is set
   ```

3. **Test Locally with Netlify Dev**
   ```bash
   cd NLP-and-video-rendering
   npm install
   npm run build
   netlify dev
   # Access at http://localhost:8888
   ```

4. **Check Build Logs**
   ```bash
   # In Netlify UI: Site → Deploys → Select deploy → View logs
   # Ensure "npm run build" completes successfully
   ```

### Function Workflow

The correct workflow is:

```
User uploads file
     ↓
Frontend calls: /.netlify/functions/start-processing
     ↓
Returns 202 Accepted with jobId
     ↓
start-processing invokes: process-document-background
     ↓
Background function processes file (up to 15 min)
     ↓
Updates job status in Netlify Blobs
     ↓
Frontend polls: /.netlify/functions/job-status?jobId=xxx
     ↓
Returns current status (queued → processing → complete/error)
     ↓
Frontend downloads SCORM package
```

### Error Messages

#### "Blob storage not available"
- **Cause**: Not running in Netlify environment
- **Solution**: Deploy to Netlify or use `netlify dev` for local testing

#### "API key not configured"
- **Cause**: `ANTHROPIC_API_KEY` environment variable not set
- **Solution**: Set in Netlify UI → Site Settings → Environment Variables

#### "Job not found"
- **Cause**: Job status not yet initialized or expired (TTL: 1 hour)
- **Solution**:
  - If immediate: Background function may not have started yet (wait 2-3 seconds)
  - If after long time: Job status expired, retry upload

#### "Processing timed out after 15 minutes"
- **Cause**: Document too complex or API rate limiting
- **Solution**:
  - Simplify document
  - Check API key has sufficient quota
  - Use CLI tool locally: `npm start your-file.pptx`

### Netlify Plans and Limitations

#### Free Plan
- **Synchronous Functions**: 10 second timeout
- **Background Functions**: Not available
- **Recommendation**: Use CLI tool for processing, web UI for demo only

#### Pro Plan
- **Synchronous Functions**: 26 second timeout
- **Background Functions**: 15 minute timeout ✅
- **Recommendation**: Full web UI functionality available

### Local Development

#### Option 1: Netlify Dev (Full functionality)
```bash
npm install -g netlify-cli
cd NLP-and-video-rendering
npm install
npm run build
netlify dev
```

#### Option 2: CLI Tool (No web UI)
```bash
npm install
npm run build
npm start path/to/file.pptx
```

### Deployment Checklist

- [ ] `package.json` dependencies installed
- [ ] TypeScript compiled (`npm run build` creates `dist` folder)
- [ ] `ANTHROPIC_API_KEY` set in Netlify environment variables
- [ ] Netlify plan supports background functions (Pro required)
- [ ] `netlify.toml` correctly configured
- [ ] Functions directory is `netlify/functions`
- [ ] Build command is `npm run build`
- [ ] Publish directory is `public`

### Getting Help

1. **Check Function Logs**: Netlify UI → Functions → View Logs
2. **Check Browser Console**: Look for detailed error messages
3. **Check Build Logs**: Netlify UI → Deploys → View Logs
4. **Test Locally**: Use `netlify dev` to reproduce issues locally
5. **CLI Fallback**: Use `npm start file.pptx` as alternative

### Performance Tips

1. **Reduce file size**: Large files take longer to process
2. **Simplify content**: Fewer slides = faster processing
3. **Use speaker notes**: Better results when slides have detailed notes
4. **Monitor progress**: Check function logs for processing stages
5. **API quota**: Ensure Anthropic API key has sufficient quota

## Recent Fixes (Latest Commit)

### Fixed Issues
1. ✅ Frontend now calls `start-processing` instead of directly calling background function
2. ✅ Added comprehensive error logging to all functions
3. ✅ Added environment checks (NETLIFY, ANTHROPIC_API_KEY)
4. ✅ Better error messages for easier debugging
5. ✅ Proper error state storage in Netlify Blobs

### What Changed
- `public/assets/js/app.js`: Fixed function call pattern
- `netlify/functions/start-processing.js`: Added validation and logging
- `netlify/functions/job-status.js`: Added environment checks and logging
- `netlify/functions/process-document-background.js`: Enhanced error handling

## Next Steps

If you're still experiencing issues after following this guide:

1. Verify all fixes are deployed (check deploy ID in Netlify UI)
2. Clear browser cache and refresh
3. Check Netlify function logs for detailed error messages
4. Try processing a simple file first (2-3 slides)
5. Consider using CLI tool as temporary workaround
