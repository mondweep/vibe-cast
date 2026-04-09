# Troubleshooting Guide

Common issues and solutions for Pi Network Explorer.

## Getting Help

1. Check this guide first
2. Check API.md for endpoint details
3. Check DEPLOYMENT.md for setup issues
4. Review error messages and logs
5. Check GitHub Issues: https://github.com/mondweep/vibe-cast/issues

## Development Issues

### Build Fails with TypeScript Errors

**Error:** `npm run build` fails with type errors

**Solutions:**
1. Run `npm run type-check` to see all errors
2. Ensure `@types/node` is installed: `npm install --save-dev @types/node`
3. Clear build cache: `rm -rf dist node_modules && npm install`
4. Check TypeScript version: `npm list typescript`

### Dev Server Won't Start

**Error:** `npm run dev` shows connection errors

**Solutions:**
1. Check port 5173 is not in use: `lsof -i :5173`
2. Kill process on port 5173: `killall node`
3. Try different port: `npm run dev -- --port 5174`
4. Clear node_modules: `rm -rf node_modules && npm install`

### PubNub Connection Fails

**Error:** "No subscribe key found" in browser console

**Solutions:**
1. Check `.env` file exists: `ls -la | grep .env`
2. Verify `REACT_APP_PUBNUB_SUBSCRIBE_KEY` is set
3. Ensure key is valid (not truncated or with spaces)
4. Check PubNub account at https://admin.pubnub.com
5. Verify PubNub free tier is enabled

**Example `.env` check:**
```bash
grep PUBNUB .env
# Should output:
# PUBNUB_PUBLISH_KEY=your_key
# PUBNUB_SUBSCRIBE_KEY=your_key
# REACT_APP_PUBNUB_SUBSCRIBE_KEY=your_key
```

### API Key Not Working

**Error:** "Invalid API key" or 401 errors

**Solutions:**
1. Verify API key at https://pi.ruv.io
2. Check key hasn't expired
3. Generate new key if necessary
4. Ensure no leading/trailing whitespace in `.env`
5. Check sessionStorage in browser DevTools: `sessionStorage.getItem('piNetworkApiKey')`

**To generate new key:**
1. Go to https://pi.ruv.io
2. Navigate to API settings
3. Generate new key
4. Update `.env` locally and redeploy

## Runtime Issues

### "Search failed" or API errors

**Error:** Search returns error without details

**Debugging steps:**
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Network tab
3. Trigger a search
4. Check `/api/search` request:
   - Status code (should be 200)
   - Headers (should have `x-api-key` and `x-session-id`)
   - Response (check error message)
5. Check Console tab for errors

**Common API errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| INVALID_API_KEY | API key is invalid/expired | Generate new key at pi.ruv.io |
| RATE_LIMITED | Too many requests | Wait 1 minute, retry (auto-retries 2x) |
| TIMEOUT | Network too slow | Try again, check internet connection |
| SEARCH_FAILED | Pi network issue | Check https://status.pi.ruv.io |

### PubNub Results Not Arriving

**Error:** Search completes but results don't appear

**Debugging steps:**
1. Open DevTools Console
2. Look for messages like `[PubNub] Message received...`
3. If no messages, check:
   - Session ID: `sessionStorage.getItem('sessionId')`
   - Subscribe key: Should be set from `.env`
   - Channel name: Should be `search_results_[sessionId]`

**Solutions:**
1. Reload page (refreshes PubNub connection)
2. Clear sessionStorage: `sessionStorage.clear()`
3. Check PubNub status at https://status.pubnub.com
4. Verify no firewall blocking WebSocket connections

**Monitor PubNub:**
```javascript
// In browser console
sessionStorage.getItem('sessionId')  // Check session ID
// Look for [PubNub] log messages
```

### Contribution Not Appearing

**Error:** Contribution submitted but no confirmation

**Debugging steps:**
1. Check Network tab for `/api/contribute` request
2. Check response status (should be 200)
3. Check browser console for PubNub messages
4. Verify contribution is in network (search for title)

**Solutions:**
1. Reload page
2. Check PubNub channel: `sessionStorage.getItem('sessionId')`
3. Verify API key has write permissions at pi.ruv.io
4. Try submitting again (may be network hiccup)

## Deployment Issues

### Functions Not Deploying

**Error:** Deploy succeeds but functions not available

**Solutions:**
1. Check `netlify.toml` has `functions = "functions"` path
2. Verify function files exist: `ls functions/api/`
3. Check function names match:
   - `functions/api/search.ts` → `api-search`
   - `functions/api/contribute.ts` → `api-contribute`
   - `functions/api/vote.ts` → `api-vote`
4. Redeploy: `netlify deploy --prod`

### Environment Variables Not Set

**Error:** Functions working locally but failing in production

**Solutions:**
1. Set environment variables in Netlify:
   ```bash
   netlify env:set PUBNUB_PUBLISH_KEY "your_key"
   netlify env:set PUBNUB_SUBSCRIBE_KEY "your_key"
   netlify env:set PI_NETWORK_API_URL "https://pi.ruv.io"
   ```

2. Or set via Netlify dashboard:
   - Site settings → Build & deploy → Environment
   - Add each variable

3. After setting, trigger new deploy:
   - Wait for auto-deploy, or
   - `netlify deploy --prod`

4. Verify variables are set:
   ```bash
   netlify env:list
   ```

### Netlify Functions Have High Latency

**Error:** Requests take >5 seconds to complete

**Debugging:**
1. Check function logs: `netlify functions:invoke api-search`
2. Monitor pi.ruv.io API status
3. Check PubNub message delivery latency

**Solutions:**
1. Verify pi.ruv.io is responsive
2. Reduce timeout tolerance
3. Upgrade Netlify plan for better performance
4. Optimize function code (remove loops, etc.)

### 404 on /api/* Endpoints

**Error:** POST /api/search returns 404

**Solutions:**
1. Ensure Netlify Functions are deployed
2. Check status in Netlify dashboard: Functions section
3. Verify `netlify.toml` redirect rule:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```
4. Redeploy: `netlify deploy --prod`

## Mobile Issues

### Touch Events Not Working

**Error:** Buttons unresponsive on mobile

**Solutions:**
1. Clear browser cache
2. Check viewport meta tag in `index.html`
3. Test in Chrome DevTools mobile emulation
4. Try different mobile browser (Chrome, Safari)

### Responsive Layout Broken

**Error:** Layout looks wrong on small screen

**Solutions:**
1. Clear browser cache: Cmd+Shift+Delete (Chrome) or Cmd+Option+E (Safari)
2. Check device viewport width
3. Test in DevTools with different screen sizes
4. Check CSS media queries in component files

## Performance Issues

### Slow Initial Load

**Error:** Page takes >3 seconds to load

**Debugging:**
1. Check Lighthouse score: DevTools → Lighthouse
2. Check bundle size: Check `npm run build` output
3. Monitor Network tab: Look for slow requests

**Solutions:**
1. Check network speed (WiFi vs cellular)
2. Check JavaScript bundle size (should be <200KB gzipped)
3. Enable browser caching
4. Use CDN (Netlify does this automatically)

**Optimize:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Rebuild: `npm run build`
- Check bundle analysis: `npm run build -- --analyze` (if configured)

### Slow Search Results

**Error:** Search takes >3 seconds to complete

**Debugging:**
1. Monitor Network tab for `/api/search` duration
2. Check Netlify function logs
3. Verify pi.ruv.io API status

**Solutions:**
1. Use more specific search query
2. Filter by domain to narrow results
3. Check pi.ruv.io performance at https://status.pi.ruv.io
4. Try again (may be temporary network issue)

## Authentication Issues

### API Key Lost

**Error:** "API key not found" after refresh

**Solutions:**
1. API keys stored in `sessionStorage` (cleared on browser close)
2. Re-enter API key when prompted
3. API keys are never saved locally (by design)

### Session Expired

**Error:** "Session ID not found"

**Solutions:**
1. Reload page (generates new session)
2. Clear sessionStorage: `sessionStorage.clear()`
3. Close and reopen browser

**Check session:**
```javascript
// In browser console
sessionStorage.getItem('sessionId')  // Should return session_xxxxx_timestamp
```

## Browser Compatibility

### Not Working in Internet Explorer

**Error:** Page doesn't load in IE

**Solution:**
- IE is not supported (uses ES2020+ features)
- Use modern browser: Chrome, Firefox, Safari, Edge

### Strange behavior in Safari

**Debugging:**
1. Check Safari version (should be 13+)
2. Check DevTools → Develop → Show Page Resources
3. Try clearing Safari cache: Develop → Empty Caches

**Solutions:**
1. Update Safari to latest version
2. Disable Safari extensions
3. Test in Chrome/Firefox to verify issue is Safari-specific
4. File GitHub issue with Safari version

## Server Errors

### 500 Internal Server Error

**Error:** API returns 500 status

**Debugging:**
1. Check function logs: `netlify functions:invoke api-search`
2. Check Netlify dashboard: Functions → Logs
3. Look for error messages

**Solutions:**
1. Check API key is valid
2. Verify pi.ruv.io is accessible
3. Check network connectivity
4. Redeploy: `netlify deploy --prod`

### 502 Bad Gateway

**Error:** "502 Bad Gateway" from Netlify

**Solutions:**
1. This is a Netlify infrastructure issue
2. Netlify automatically retries
3. Wait a few minutes and retry
4. Check https://status.netlify.com

## Data Issues

### Data Not Persisting

**Error:** Search results disappear after refresh

**Note:** This is expected behavior
- PubNub messages are real-time, not persistent
- Search results only show in current session
- To persist data, would need database (not in MVP)

### Duplicate Results

**Error:** Same result appears multiple times

**Solutions:**
1. This shouldn't happen; file GitHub issue
2. Workaround: Filter by result ID
3. Clear browser cache and retry

## Getting Support

### Create GitHub Issue

1. Go to https://github.com/mondweep/vibe-cast/issues
2. Click "New issue"
3. Describe:
   - What you were doing
   - What happened
   - Expected behavior
   - Browser and OS
   - Error messages (from console)
4. Attach screenshots if helpful

### Debug Information to Include

Include when reporting issues:

```javascript
// Run in browser console to copy debug info
console.log({
  userAgent: navigator.userAgent,
  sessionId: sessionStorage.getItem('sessionId'),
  apiKeySet: !!sessionStorage.getItem('piNetworkApiKey'),
  timestamp: new Date().toISOString(),
  builtVersion: 'Check package.json version'
});
```

## FAQ

**Q: Why are results cleared when I refresh?**
A: PubNub is real-time only; use database for persistence (future feature).

**Q: Can I use this offline?**
A: No, requires connection to pi.ruv.io and PubNub.

**Q: Why is my API key not saved?**
A: Security feature; API keys are never stored permanently (sessionStorage only).

**Q: Can I search with regular expressions?**
A: No, use natural language queries instead.

**Q: What's the maximum contribution size?**
A: Content limited to 5000 characters per SPEC-001.

**Q: Can I delete my contributions?**
A: Not in MVP; planned for Phase 2.

**Q: Is my data encrypted?**
A: All communications use HTTPS; pi.ruv.io handles data encryption.

## Still Having Issues?

1. Review this entire troubleshooting guide
2. Check API.md and DEPLOYMENT.md
3. Review code comments in relevant files
4. Open GitHub issue with debug information
5. Check GitHub issues for similar problems
6. Review BHIL specifications (PRD-001, SPEC-001)
