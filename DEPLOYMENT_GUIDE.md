# Website Deployment Guide
## Bernardi Music Group - Summer School, Assam

**Goal:** Launch the website on Netlify and start sharing with partners and potential sponsors.  
**Timeline:** 1-2 hours to deploy  
**Cost:** FREE (Netlify free tier)

---

## Quick Start (5 minutes)

### Step 1: Prepare GitHub Repository
Your website code is already in `/website` folder on the `NMC-2026-assam` branch.

### Step 2: Sign Up for Netlify
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub (recommended)
3. Authorize Netlify to access your repositories

### Step 3: Connect Repository to Netlify
1. Click "New site from Git"
2. Select "GitHub" and authorize
3. Choose the `mondweep/vibe-cast` repository
4. Select branch: `NMC-2026-assam`
5. Build settings:
   - **Base directory:** `website`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

### Step 4: Add Environment Variables
In Netlify site settings > Build & deploy > Environment:

```
NEXT_PUBLIC_SUPABASE_URL = (leave blank for now, or add after Supabase setup)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (leave blank for now, or add after Supabase setup)
```

### Step 5: Deploy
Click "Deploy" and Netlify will:
- Build your website
- Run tests
- Deploy to a live URL (usually `https://[random-name].netlify.app`)

**Status:** Your website is now LIVE! 🎉

---

## Next Steps (After Deployment)

### Add Custom Domain
1. In Netlify: Domain management > Add custom domain
2. Point `summerschool.bgm.com` (or your choice) to Netlify
3. Add DNS records as instructed

### Set Up Supabase for Form Submissions

**1. Create Supabase Project**
- Go to [supabase.com](https://supabase.com)
- Create free project
- Note your `Project URL` and `Anon Key`

**2. Create Database Tables**

```sql
-- Registrations table
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT now(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  age INTEGER,
  country TEXT,
  instrument TEXT,
  grade_level TEXT,
  experience INTEGER,
  motivation TEXT,
  parent_name TEXT,
  parent_email TEXT,
  status TEXT DEFAULT 'submitted'
);

-- Inquiries table
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT now(),
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'new'
);

-- Newsletter subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT now(),
  email TEXT UNIQUE,
  subscribed_at TIMESTAMP DEFAULT now()
);
```

**3. Enable RLS (Row Level Security)**

For each table, go to SQL Editor and run:

```sql
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert
CREATE POLICY "Allow inserts" ON registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow inserts" ON inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow inserts" ON subscriptions
  FOR INSERT WITH CHECK (true);
```

**4. Update Environment Variables**

Copy your Supabase credentials to:
- Netlify environment variables
- Local `.env.local` for development

### Set Up Email Notifications

**Option A: Supabase Email (Built-in)**
- Supabase Settings > Email Templates
- Configure SMTP or use Supabase templates
- Create confirmation emails

**Option B: Use Resend (Recommended)**
1. Sign up at [resend.com](https://resend.com)
2. Create API key
3. Add to environment variables: `RESEND_API_KEY`
4. Update contact form to send emails via Resend

### Integrate Payment Gateway (For Sponsorships)

**Stripe Integration (Recommended)**

```bash
npm install @stripe/react-stripe-js stripe
```

1. Create Stripe account
2. Add keys to environment variables
3. Create donation page component
4. Update fundraising section with Stripe checkout

---

## Before Going Live Checklist

- [ ] Domain registered and pointed to Netlify
- [ ] All contact email addresses updated
- [ ] Supabase project set up and connected
- [ ] Form submissions configured
- [ ] Email notifications enabled
- [ ] Social media links added
- [ ] Logo/branding images uploaded
- [ ] Faculty photos added (or keep placeholders)
- [ ] Event dates confirmed
- [ ] Student fees finalized
- [ ] Privacy policy & Terms created
- [ ] Mobile tested on iOS & Android
- [ ] Desktop tested in Chrome, Safari, Firefox
- [ ] All links work (internal & external)
- [ ] Analytics (Google Analytics) added
- [ ] Backup & recovery plan documented

---

## Sharing the Website

### Ready to Share? Use These Links:

**Direct Share:**
```
https://summerschool.bgm.com
(or your Netlify domain)
```

**Social Media Posts:**
```
🎼 Exciting News! 🎼

The Bernardi Music Group is launching an inaugural 
Summer School in Assam this September-October 2026!

World-class training. International faculty. 
Inspired by Zubeen Garg's legacy.

🎵 Apply now: [website]
💰 Support us: [website]/fundraising
📧 Questions: info@summerschool.com

#MusicEducation #AssamsMusicalHeritage #BMG2026
```

**Email to Partners:**
```
Subject: Join us - BMG Summer School, Assam 2026

Dear [Partner Name],

We are excited to invite you to support the inaugural 
Bernardi Music Group Summer School in Assam.

This groundbreaking initiative brings world-class 
music education to India, celebrating Zubeen Garg's 
musical legacy while creating opportunities for 
talented young musicians.

We are seeking partners and sponsors at all levels.
Learn more: [website]

Looking forward to collaborating!
Best regards,
[Your Name]
```

---

## Analytics & Monitoring

### Google Analytics
1. Create Google Analytics property
2. Get tracking code
3. Add to Netlify environment or website header

### Monitor Form Submissions
- Check Supabase dashboard daily
- Set up email alerts for new registrations
- Review inquiry categories

### Track Sponsorships
- Monitor Stripe/payment dashboard
- Send thank-you emails automatically
- Update fundraising progress bar

---

## Common Issues & Solutions

### Forms Not Submitting?
- Check browser console for errors
- Verify Supabase credentials
- Check RLS policies are correct
- Ensure email is valid

### Netlify Deployment Failed?
- Check build logs in Netlify dashboard
- Verify `package.json` dependencies
- Test locally: `npm run build`
- Check Node version compatibility

### Domain Not Working?
- Wait 24-48 hours for DNS propagation
- Check DNS records in domain registrar
- Verify CNAME record points to Netlify

### Performance Issues?
- Enable Next.js image optimization
- Reduce image file sizes
- Enable Netlify caching
- Monitor Core Web Vitals in PageSpeed Insights

---

## Maintenance Schedule

**Daily:**
- Check for new registrations/inquiries
- Respond to contact form submissions

**Weekly:**
- Review sponsorship progress
- Check website analytics
- Update fundraising counter

**Monthly:**
- Backup database
- Review application quality
- Plan marketing campaigns
- Update blog/news section

---

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Netlify | FREE | Includes 300 build minutes/month |
| Supabase | FREE | 500MB database, 2GB bandwidth |
| Custom Domain | ~£10/year | Optional, depends on registrar |
| Email (Resend) | FREE | 100 emails/day free |
| Stripe | 2.2% + 30¢ | Per transaction, only when donations come |
| **Total** | **FREE to start** | Scales with usage |

---

## Next Phase: Building Team Tools

After website launch, consider:
- Admin dashboard for applications
- Automated email campaigns
- Participant portal (post-acceptance)
- Team collaboration space
- Document management
- Budget tracking
- Sponsor relationship management

---

**Questions? Contact:** technical-support@bgm-summerschool.com

**Last Updated:** April 21, 2026
