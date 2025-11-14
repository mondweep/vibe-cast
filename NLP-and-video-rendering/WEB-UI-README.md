# Web UI - eLearning Automation Tool 🚀

A beautiful, intuitive web interface for transforming PowerPoint and Word documents into SCORM-compliant eLearning modules.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Netlify](https://img.shields.io/badge/deploy-netlify-00C7B7)

## ✨ Features

### User Interface
- **Drag & Drop Upload**: Simply drag PowerPoint or Word files
- **Real-time Progress**: Watch each processing step in real-time
- **Beautiful Design**: Modern, gradient-based UI with smooth animations
- **Mobile Responsive**: Works on all devices
- **Instant Download**: Get your SCORM package immediately

### Processing Pipeline
1. **Document Parsing** - Extracts content and speaker notes
2. **AI Enhancement** - Claude AI generates objectives and questions
3. **Interactive Content** - Creates quizzes and activities
4. **SCORM Packaging** - Builds LMS-ready ZIP file

### User Experience
- Clear visual feedback at every step
- Estimated completion time
- Detailed results summary
- One-click download
- Helpful error messages

## 🎨 Screenshots

### Upload Screen
- Clean, modern interface
- Drag & drop or browse
- File validation
- Feature highlights

### Processing Screen
- Step-by-step progress
- Animated indicators
- Time estimates
- Real-time updates

### Complete Screen
- Success animation
- Detailed statistics
- Download button
- Next steps guide

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev:server

# Open browser
open http://localhost:8888
```

### Deploy to Netlify

```bash
# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## 📦 What Gets Generated

Upload a document with speaker notes and get:

✅ **SCORM 1.2/2004 Package** (ZIP file)
✅ **Learning Objectives** (AI-generated)
✅ **Assessment Questions** (MCQ, scenarios)
✅ **Interactive Activities** (Flashcards, drag-drop)
✅ **Progress Tracking** (LMS integration)
✅ **Mobile-Responsive** (Works everywhere)

## 🎯 Supported File Types

| Format | Extension | Requirements |
|--------|-----------|--------------|
| PowerPoint | `.pptx` | Must include speaker notes |
| Word | `.docx` | Must include comments |
| Max Size | 50MB | For optimal performance |

## 🔧 Technology Stack

### Frontend
- **HTML5** - Semantic, accessible markup
- **CSS3** - Modern styling with gradients & animations
- **JavaScript (ES6+)** - Vanilla JS, no frameworks
- **Web APIs** - File, Fetch, Blob APIs

### Backend
- **Netlify Functions** - Serverless processing
- **Node.js** - TypeScript compilation
- **Lambda** - AWS Lambda runtime

### Processing
- **Claude AI** - Content enhancement
- **TypeScript** - Type-safe code
- **Node.js 18+** - Runtime environment

## 📱 Mobile Optimization

The UI is fully responsive with breakpoints for:
- 📱 Mobile (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large screens (1920px+)

## ⚡ Performance

- **Initial Load**: < 1s
- **Upload Validation**: Instant
- **Processing Time**: 2-5 minutes (AI processing)
- **Download**: Immediate after processing

## 🔐 Security

- HTTPS only (enforced by Netlify)
- File type validation
- Size limits (50MB)
- No data retention
- Temporary file cleanup

## 🎨 Customization

### Branding

Edit `/public/index.html`:
```html
<div class="logo">
    <!-- Add your logo -->
    <h1>Your Brand Name</h1>
</div>
```

### Colors

Edit `/public/assets/css/styles.css`:
```css
:root {
    --primary: #667eea;  /* Your primary color */
    --secondary: #764ba2; /* Your secondary color */
}
```

### Features

Edit `/public/index.html` - Features section:
```html
<div class="features">
    <!-- Add/edit feature cards -->
</div>
```

## 🐛 Troubleshooting

> **📚 Full Troubleshooting Guide**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for comprehensive debugging information.

### File Won't Upload

**Problem**: File is rejected

**Solutions**:
- Check file extension (.pptx or .docx)
- Verify file size (< 50MB)
- Ensure file isn't corrupted
- Try re-saving from PowerPoint/Word

### Processing Fails (500 Internal Server Error)

**Problem**: Error during processing or function returns 500 error

**Solutions**:
- **Check Environment Variables**: Ensure `ANTHROPIC_API_KEY` is set in Netlify
- **Check Netlify Plan**: Background functions require Netlify Pro
- **Check Function Logs**: Netlify UI → Functions → View Logs
- **Verify Build**: Ensure TypeScript compiled (`dist` folder exists)
- **Test Locally**: Run `netlify dev` to test locally
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed debugging steps

### Download Doesn't Work

**Problem**: Can't download SCORM package

**Solutions**:
- Check browser allows downloads
- Disable popup blockers
- Try different browser
- Check console for errors

### Common Error Messages

- **"Blob storage not available"**: Not running in Netlify environment, use `netlify dev` or deploy
- **"API key not configured"**: Set `ANTHROPIC_API_KEY` in Netlify environment variables
- **"Job not found"**: Job may have expired (1 hour TTL) or background function hasn't started
- **"Processing timed out"**: Document too complex, try CLI tool: `npm start your-file.pptx`

## 📊 Analytics

Track usage in Netlify Dashboard:
- Function invocations
- Bandwidth usage
- Error rates
- Response times

## 🔄 Updates

### Deploying Updates

```bash
# Make changes to code
git add .
git commit -m "Update: description"
git push

# Netlify auto-deploys from main branch
# Or manually:
netlify deploy --prod
```

### Version Control

Tag releases:
```bash
git tag -a v1.0.0 -m "Web UI Release"
git push --tags
```

## 🤝 User Feedback

### Collecting Feedback

Add to `/public/index.html`:
```html
<div class="feedback-section">
    <h3>Help us improve!</h3>
    <a href="your-feedback-form-url">Share Feedback</a>
</div>
```

### Analytics Integration

Add Google Analytics to `</head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 📝 Sample Content

Test the tool with sample files in `/examples`:
- `sample-presentation.pptx` - Healthcare training presentation
- `sample-document.docx` - Medical procedures document

## 🌐 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest 2 | ✅ Fully supported |
| Firefox | Latest 2 | ✅ Fully supported |
| Safari | Latest 2 | ✅ Fully supported |
| Edge | Latest 2 | ✅ Fully supported |
| IE 11 | - | ❌ Not supported |

## 🎓 For Users

### How to Use

1. **Upload** - Drag or browse for your file
2. **Wait** - Processing takes 2-5 minutes
3. **Download** - Get your SCORM package
4. **Deploy** - Upload to your LMS

### What to Prepare

Before uploading:
- ✅ Add speaker notes to all slides/sections
- ✅ Use clear, descriptive headings
- ✅ Include examples and explanations
- ✅ Review for accuracy
- ✅ Keep file size reasonable (< 50MB)

### After Download

1. Unzip the SCORM package (optional, for preview)
2. Log into your LMS
3. Upload the ZIP file (don't unzip)
4. Configure settings
5. Test before publishing
6. Publish to learners

## 🔗 Resources

- [User Guide](docs/USER-GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture](docs/SPARC-ARCHITECTURE.md)
- [Main README](README.md)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/vibe-cast/issues)
- **Docs**: [Documentation](docs/)
- **Email**: support@yourdomain.com

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ using Claude AI**

🌟 **Star this repo** if you find it useful!
