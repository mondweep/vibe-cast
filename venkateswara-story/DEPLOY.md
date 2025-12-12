# Netlify Deployment Guide
## The Divine Story of Lord Venkateswara

---

## Quick Deploy (Recommended)

### Option 1: Deploy via Netlify UI

1. **Go to Netlify**: https://app.netlify.com
2. **Login/Signup** with GitHub, GitLab, or email
3. **Click "Add new site"** > "Import an existing project"
4. **Connect to Git provider** and select your repository
5. **Configure build settings**:
   - **Base directory**: `venkateswara-story`
   - **Build command**: (leave empty or `echo "Static site"`)
   - **Publish directory**: `venkateswara-story`
6. **Click "Deploy site"**

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Navigate to the story folder
cd venkateswara-story

# Deploy (creates new site or links existing)
netlify deploy --prod
```

### Option 3: Drag & Drop Deploy

1. Go to https://app.netlify.com/drop
2. Drag the entire `venkateswara-story` folder onto the page
3. Done! Get your URL instantly

---

## Project Structure

```
venkateswara-story/
├── index.html          # Main page (13 chapters)
├── styles.css          # All styling
├── script.js           # Animations & interactions
├── netlify.toml        # Netlify configuration
├── _headers            # HTTP headers for caching
├── _redirects          # URL redirects
├── images/             # Your generated images go here
│   ├── .gitkeep
│   ├── scene-01-vaikuntha.jpg
│   ├── scene-02-bhrigu-journey.jpg
│   └── ... (add your images)
├── README.md           # Project documentation
├── IMAGE-PROMPTS.md    # Gemini generation prompts
├── WIKIMEDIA-SOURCES.md# Public domain sources
└── DEPLOY.md           # This file
```

---

## Adding Your Images

### Step 1: Name Your Images

Use this naming convention for easy replacement:

| Scene | Filename |
|-------|----------|
| 1 | `scene-01-vaikuntha.jpg` |
| 2 | `scene-02-bhrigu-journey.jpg` |
| 3 | `scene-03-bhrigu-kick.jpg` |
| 4 | `scene-04-lakshmi-leaves.jpg` |
| 5 | `scene-05-vishnu-penance.jpg` |
| 6 | `scene-06-padmavathi-birth.jpg` |
| 7 | `scene-07-srinivasa-birth.jpg` |
| 8 | `scene-08-forest-meeting.jpg` |
| 9 | `scene-09-narada.jpg` |
| 10 | `scene-10-marriage-proposal.jpg` |
| 11 | `scene-11-kubera-loan.jpg` |
| 12 | `scene-12-wedding-procession.jpg` |
| 13 | `scene-13-wedding-ceremony.jpg` |
| 14 | `scene-14-tirumala-temple.jpg` |
| 15 | `scene-15-ramanujacharya.jpg` |
| 16 | `scene-16-krishnadevaraya.jpg` |
| 17 | `scene-17-suprabhatam.jpg` |
| 18 | `scene-18-venkateswara-darshan.jpg` |
| OG | `og-image.jpg` (1200x630 for social sharing) |

### Step 2: Place Images

```bash
# Copy your generated images to the images folder
cp ~/Downloads/generated-images/* venkateswara-story/images/
```

### Step 3: Update HTML (Replace Placeholders)

Find and replace placeholder divs with actual images:

```html
<!-- Replace this -->
<div class="image-placeholder" data-scene="vaikuntha">
    <div class="placeholder-icon">🏛️</div>
    <p class="placeholder-text">Vaikuntha - Vishnu's Heavenly Abode</p>
</div>

<!-- With this -->
<img src="images/scene-01-vaikuntha.jpg"
     alt="Vishnu reclining on Adishesha with Lakshmi in Vaikuntha"
     class="scene-image"
     loading="lazy">
```

---

## Custom Domain Setup

### Using a Custom Domain

1. **In Netlify Dashboard**: Site settings > Domain management
2. **Add custom domain**: e.g., `venkateswara-story.yourdomain.com`
3. **Update DNS** at your registrar:
   - **CNAME**: `venkateswara-story` → `your-site-name.netlify.app`
   - Or use Netlify DNS for automatic setup
4. **Enable HTTPS**: Automatic with Let's Encrypt

### Recommended Domain Names

- `venkateswara-story.yourdomain.com`
- `tirumala-story.yourdomain.com`
- `balaji-legend.yourdomain.com`

---

## Environment Configuration

### Update URLs After Deploy

Once you have your Netlify URL (e.g., `amazing-name-123.netlify.app`), update:

1. **Open Graph URLs** in `index.html`:
```html
<meta property="og:url" content="https://YOUR-SITE.netlify.app/">
<meta property="og:image" content="https://YOUR-SITE.netlify.app/images/og-image.jpg">
```

2. **Canonical URL**:
```html
<link rel="canonical" href="https://YOUR-SITE.netlify.app/">
```

3. **Twitter URLs**:
```html
<meta name="twitter:url" content="https://YOUR-SITE.netlify.app/">
<meta name="twitter:image" content="https://YOUR-SITE.netlify.app/images/og-image.jpg">
```

---

## Performance Optimization

### Image Optimization

Before uploading images:

```bash
# Using ImageMagick (recommended sizes)
# Scene images: max 1200px width
convert input.jpg -resize 1200x -quality 85 output.jpg

# OG Image: exactly 1200x630
convert input.jpg -resize 1200x630^ -gravity center -extent 1200x630 og-image.jpg
```

### WebP Conversion (Optional)

```bash
# Convert to WebP for smaller file sizes
cwebp -q 80 input.jpg -o output.webp
```

### Netlify Image CDN

Netlify automatically optimizes images. For manual control:

```html
<!-- Use Netlify Image CDN -->
<img src="/.netlify/images?url=/images/scene-01.jpg&w=800&q=80" alt="...">
```

---

## Build & Deploy Settings

### netlify.toml Settings

```toml
[build]
  publish = "."
  command = "echo 'Static site'"

[build.processing.images]
  compress = true
```

### Manual Trigger Redeploy

```bash
# Using Netlify CLI
netlify deploy --prod

# Or in dashboard: Deploys > Trigger deploy > Deploy site
```

---

## Monitoring & Analytics

### Enable Netlify Analytics

1. Site settings > Analytics
2. Enable (paid feature) for traffic insights

### Free Alternative: Add Plausible/Fathom

```html
<!-- Add before </head> -->
<script defer data-domain="your-site.netlify.app" src="https://plausible.io/js/script.js"></script>
```

---

## Troubleshooting

### Images Not Loading

1. Check file paths (case-sensitive on Netlify)
2. Ensure images are in `images/` folder
3. Clear Netlify cache: Deploys > "Clear cache and deploy site"

### Styles Not Updating

1. Hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`
2. Clear Netlify cache and redeploy

### 404 Errors

Check `_redirects` file is in root of publish directory

### Build Failures

1. Check deploy logs in Netlify dashboard
2. Ensure `netlify.toml` has no syntax errors

---

## Sharing Your Offering

Once deployed, share the sacred story:

### Social Media

```
🙏 The Divine Story of Lord Venkateswara

Experience the sacred legend of Kaliyuga Vaikuntha -
from Vishnu's penance to the divine wedding.

https://YOUR-SITE.netlify.app

#Venkateswara #Tirumala #TirupatiBalaij #HinduMythology
```

### QR Code

Generate a QR code for the URL to share during pilgrimage:
- https://www.qr-code-generator.com/

---

## Support

- **Netlify Docs**: https://docs.netlify.com
- **Netlify Community**: https://answers.netlify.com
- **Status**: https://www.netlifystatus.com

---

*Om Namo Venkateshaaya* 🙏
