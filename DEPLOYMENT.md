# 🚀 Deployment Guide

This guide covers deploying Weather Game to production environments.

## Architecture Overview

Weather Game is a full-stack application:
- **Frontend**: React + Vite (deploys to Netlify)
- **Backend**: Express.js + Node.js (deploys to Heroku, Railway, Render, or Vercel Functions)

## 📱 Frontend Deployment (Netlify)

### Prerequisites
- Netlify account (free tier available)
- GitHub repository connected to Netlify

### Deployment Steps

1. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Select GitHub repository
   - Choose branch: `claude/weather-game-multiplayer-bkkLj`

2. **Configure Build Settings**:
   - Base directory: Leave empty (Netlify will use netlify.toml)
   - Build command: Defined in netlify.toml
   - Publish directory: `client/dist`

3. **Set Environment Variables** in Netlify:
   ```
   VITE_API_URL=https://weather-game-api.herokuapp.com/api
   ```
   (Replace with your actual backend URL)

4. **Deploy**:
   - Netlify automatically deploys on every push to the branch
   - View deployment at: `https://your-site-name.netlify.app`

### Environment Variables
Create in Netlify dashboard (Site settings → Build & deploy → Environment):
```
VITE_API_URL=https://your-backend-url/api
```

## 🖥️ Backend Deployment Options

### Option 1: Heroku (Recommended for Express.js)

1. **Create Heroku app**:
   ```bash
   heroku create weather-game-backend
   heroku addons:create heroku-postgresql:hobby-dev
   ```

2. **Deploy**:
   ```bash
   git push heroku claude/weather-game-multiplayer-bkkLj:main
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set WEATHER_API_KEY=your_api_key
   heroku config:set NODE_ENV=production
   ```

4. **View logs**:
   ```bash
   heroku logs --tail
   ```

### Option 2: Railway

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Deploy**:
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Environment variables** via Railway dashboard

4. **Get deployment URL**:
   ```bash
   railway open
   ```

### Option 3: Render

1. **Connect GitHub repository**:
   - Go to [render.com](https://render.com)
   - Click "New Web Service"
   - Connect GitHub account
   - Select repository

2. **Configure**:
   - Environment: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Root directory: Leave empty

3. **Add environment variables**:
   ```
   NODE_ENV=production
   WEATHER_API_KEY=your_api_key
   PORT=3000
   ```

### Option 4: Docker Deployment (Any Cloud)

1. **Create Dockerfile** (already compatible):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY . .
   RUN npm install && npm run client:install
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Deploy to cloud platform**:
   - Google Cloud Run
   - AWS ECS
   - DigitalOcean App Platform
   - Azure Container Instances

## 🔗 Connecting Frontend to Backend

After deploying both, update the frontend environment variable:

**Netlify Dashboard:**
1. Site settings → Build & deploy → Environment
2. Add/update `VITE_API_URL`:
   ```
   https://your-backend-url.herokuapp.com/api
   ```

3. Trigger redeploy (or push new commit)

## ✅ Verification Checklist

### Frontend (Netlify)
- [ ] App loads without errors
- [ ] Geolocation permission prompt appears
- [ ] Can create game room
- [ ] Can join with Session ID

### Backend
- [ ] Server starts successfully
- [ ] `/health` endpoint returns `{status: "ok"}`
- [ ] `/api/game/session` POST endpoint works
- [ ] `/api/weather/current` endpoint returns weather data
- [ ] WebSocket connections establish

### Integration
- [ ] Frontend can reach backend API
- [ ] Game creation succeeds
- [ ] Player joins game
- [ ] Challenges load
- [ ] Answers submit and score updates
- [ ] Leaderboard updates in real-time

## 📊 Monitoring & Logs

### Netlify
- **Build logs**: Deploy log in Netlify dashboard
- **Runtime logs**: Edge Functions logs (Functions tab)
- **Analytics**: Analytics dashboard

### Backend (Example: Heroku)
```bash
# View logs
heroku logs --tail

# View errors
heroku logs --tail --source app

# Monitor dyno
heroku ps
```

## 🔐 Security

### Production Configuration
1. **HTTPS**: Enforced automatically on Netlify
2. **Environment variables**: Never commit `.env`
3. **CORS**: Configure for your domain
4. **Rate limiting**: Enabled in production
5. **API keys**: Store in environment variables

### Update CORS in Production
Edit `server/index.js`:
```javascript
app.use(cors({
  origin: 'https://your-netlify-site.netlify.app',
  credentials: true
}));
```

## 🆘 Troubleshooting

### Frontend shows "Cannot reach API"
- Check `VITE_API_URL` environment variable
- Verify backend is running
- Check browser console for CORS errors
- Verify API URL is correct with `/api` path

### Backend gives 504 errors
- Check Heroku dyno type (free sleeps after 30 min)
- Upgrade to hobby tier for production
- Monitor logs for timeout errors

### WebSocket connection fails
- Ensure backend supports WebSocket
- Check firewall rules
- Verify wss:// protocol in production

### Build fails on Netlify
- Check Node version (18+ required)
- Verify all dependencies listed in package.json
- Check build logs for specific errors
- Ensure client/package.json exists

## 📈 Performance Tips

### Frontend
- Vite automatically optimizes bundles
- Netlify Edge caching enabled
- CSS and JS minified in production

### Backend
- Enable caching (5 min default for weather)
- Use connection pooling
- Monitor active sessions
- Scale workers as needed

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Netlify
on:
  push:
    branches:
      - claude/weather-game-multiplayer-bkkLj

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install && npm run client:install
      - run: npm run build
      - uses: nflaig/deploy-to-netlify@main
        with:
          build-dir: ./client/dist
          functions-dir: ./functions
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 📞 Support

For deployment issues:
1. Check Netlify documentation: https://docs.netlify.com
2. Check backend platform docs (Heroku, Railway, etc.)
3. Review application logs
4. Check GitHub Issues in the repository

## 🎯 Next Steps

1. Deploy backend to your chosen platform
2. Get backend URL
3. Connect Netlify repository
4. Add backend URL to Netlify environment variables
5. Deploy and test game flow

---

**Happy deploying!** 🚀
