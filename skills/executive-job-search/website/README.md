# Mondweep Chakravorty - Personal Website

A clean, professional, and modern personal branding website showcasing enterprise AI transformation expertise, career achievements, and public projects.

## Features

- **Responsive Design** – Mobile-first approach, works seamlessly on all devices
- **Modern Aesthetics** – Clean typography, professional color scheme, smooth animations
- **Performance** – Optimized CSS, minimal dependencies, fast loading
- **Accessibility** – Semantic HTML, proper contrast ratios, smooth navigation
- **SEO-Ready** – Meta tags, structured content, clean URLs

## Structure

```
website/
├── index.html       # Main page (14KB)
├── styles.css      # All styling (14KB)
├── README.md       # This file
└── assets/         # (Optional) Images, icons, etc.
```

## Sections

1. **Navigation** – Fixed header with smooth scrolling
2. **Hero** – Eye-catching intro with key stats
3. **About** – Background, specialisation, sectors
4. **Highlights** – 6 career achievements
5. **Projects** – Public projects (Content Discovery, Vibe Cast)
6. **Expertise** – Skills grouped into 4 areas
7. **Contact** – Email, phone, social, organisation
8. **Footer** – Links and copyright

## Customisation

### Colors
Edit CSS variables in `styles.css` (top of file):
```css
:root {
    --primary: #1e40af;        /* Main blue */
    --accent: #0891b2;         /* Cyan accent */
    --text-dark: #1f2937;      /* Dark gray text */
    /* ... more */
}
```

### Content
Edit `index.html` to update:
- Name, tagline, and intro text
- Career highlights and numbers
- Project descriptions
- Expertise areas
- Contact information
- Social links

### Fonts
Currently using:
- **Body**: Inter (Google Fonts)
- **Headings**: Plus Jakarta Sans (Google Fonts)

Change in `<head>` section of `index.html`.

## Deployment to Netlify

### Option 1: GitHub Integration (Recommended)

1. Push files to a GitHub repository
2. Go to [netlify.com](https://netlify.com) → Sign in with GitHub
3. Click **"New site from Git"**
4. Select your repository
5. Configure:
   - **Build command**: (leave empty)
   - **Publish directory**: `website/`
6. Click **"Deploy site"**
7. Configure domain in **Site settings → Domain management**

### Option 2: Manual Upload

1. Go to [netlify.com](https://netlify.com) → Sign up
2. Drag and drop the `website/` folder to deploy
3. Netlify generates a temporary URL
4. Go to **Site settings → Domain management** to add your custom domain

### Option 3: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Navigate to website folder
cd website/

# Deploy
netlify deploy --prod
```

## Domain Setup

### Custom Domain (e.g., mondweep.com)

1. Register domain at GoDaddy, Namecheap, etc.
2. In Netlify **Site settings → Domain management**:
   - Click **"Add domain"**
   - Enter your domain
   - Follow DNS setup instructions
3. Typical DNS changes:
   - Point name servers to Netlify
   - Or add CNAME record

### Netlify Subdomain

Netlify auto-assigns: `name-123.netlify.app` (free SSL)

## Performance Optimisation

✅ **Current**
- No build process needed
- Minimal CSS (~14KB)
- No JavaScript dependencies
- Single HTTP request (HTML) + one CSS file

🚀 **Future Enhancements**
- Add blog section (Markdown)
- Contact form (Netlify Forms)
- Analytics (Netlify Analytics)
- Sitemap (auto-generated)

## Browser Support

- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Android Chrome)

## File Sizes

- `index.html` – 14 KB
- `styles.css` – 14 KB
- **Total** – 28 KB (< 1 second load)

## SEO

Meta tags included:
- Title: "Mondweep Chakravorty | Enterprise AI Architect"
- Description: Full elevator pitch
- Viewport: Mobile-responsive

Recommendations:
- Add `sitemap.xml` if using Netlify
- Enable Netlify Analytics
- Add Open Graph tags for social sharing

## Security

✅ **Secure by Default**
- No server-side code
- No database
- HTTPS enforced
- CSP headers recommended

Configure in Netlify **Site settings → Security → Headers**.

## Support & Updates

To update content:
1. Edit `index.html` and/or `styles.css`
2. Commit and push to GitHub
3. Netlify auto-deploys on push
4. Live within seconds

## License

© 2026 Mondweep Chakravorty. All rights reserved.

---

**Created:** February 2026  
**Last Updated:** February 2026
