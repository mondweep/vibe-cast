# Bernardi Music Group - Summer School, Assam (Website)

Official website for the 2026 Bernardi Music Group Summer School initiative in Assam, India.

## Overview

This is a Next.js-based website for promoting, fundraising, and managing registrations for the inaugural BMG Summer School in Assam, featuring world-class music education inspired by Zubeen Garg's legacy.

## Features

- **Modern, Responsive Design** - Works on all devices (mobile-first approach)
- **Fundraising Hub** - Multiple sponsorship tiers (Platinum £5k down to £25)
- **Student Registration** - Comprehensive application form
- **Faculty Profiles** - Meet the world-class instructors
- **Programme Information** - Complete details about the summer school
- **Contact & Inquiry Forms** - Easy ways for sponsors, students, and partners to reach out

## Tech Stack

- **Frontend**: Next.js 15 + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (for form submissions)
- **Hosting**: Netlify
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd website
npm install
```

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build & Deployment

```bash
npm run build
npm start
```

For Netlify deployment, connect your repository and set the build command to `npm run build`.

## Project Structure

```
website/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   ├── Header.tsx          # Navigation header
│   ├── Hero.tsx            # Hero section
│   ├── Vision.tsx          # About/vision section
│   ├── Programme.tsx       # Programme details
│   ├── Faculty.tsx         # Faculty profiles
│   ├── Fundraising.tsx     # Sponsorship tiers
│   ├── StudentRegistration.tsx  # Application form
│   ├── Contact.tsx         # Contact form & info
│   └── Footer.tsx          # Footer
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind configuration
└── next.config.js          # Next.js configuration
```

## Key Sections

### 1. Hero Section
- Event headline and key information
- Call-to-action buttons (Apply, Learn More)
- Date and location

### 2. Vision Section
- Initiative overview
- Partnership information
- Three key pillars (World-Class Training, Cultural Bridge, Learn-Perform-Belong)

### 3. Programme Section
- Detailed programme features
- Eligible instruments and age groups
- All-inclusive experience details

### 4. Faculty Section
- Profiles of international instructors
- Credentials and expertise
- Guest workshop information

### 5. Fundraising Section
- £15,000 funding target
- 6 sponsorship tiers with benefits:
  - Platinum (£5k) - 4 scholarships
  - Gold (£2k) - 2 scholarships
  - Silver (£1k) - 1 scholarship
  - Supporter (£500+)
  - Friend (£50+)
  - Contributor (£25+)

### 6. Student Registration
- Comprehensive application form
- Fields for age, instrument, experience, motivation
- Parent/guardian information for minors
- Real-time validation

### 7. Contact Section
- Multiple contact methods
- Inquiry form with categorization
- Quick info boxes for different query types

## Styling & Branding

Colors (from Bernardi Music Group):
- Primary Navy: `#1a365d`
- Secondary Blue: `#2c5aa0`
- Cream/Beige: `#f5f1e8`
- Gold Accent: `#b8860b`

Typography:
- Headings: Georgia (serif)
- Body: Helvetica/Arial (sans-serif)

## Forms & Submissions

Currently, forms are set up with client-side handling. To enable backend submissions:

1. **Set up Supabase project**
   - Create tables for registrations, sponsorships, inquiries
   - Add Row Level Security (RLS) policies

2. **Implement API routes**
   - Create `/api/submit-registration`
   - Create `/api/submit-inquiry`
   - Create `/api/submit-sponsorship`

3. **Add email notifications**
   - Configure Supabase email templates
   - Or integrate Resend/SendGrid

## SEO & Meta

- Meta description set for social sharing
- Open Graph tags for preview cards
- Responsive images and placeholder alt text
- Structured data ready for schema.org

## Mobile Responsiveness

- Mobile-first design approach
- Hamburger menu on smaller screens
- Touch-friendly buttons and forms
- Optimized image sizing

## Future Enhancements

- [ ] Supabase integration for form submissions
- [ ] Payment gateway (Stripe) for sponsorship donations
- [ ] Admin dashboard for managing applications
- [ ] Email confirmations and updates
- [ ] Blog section for updates and stories
- [ ] Image gallery from previous events
- [ ] Live chat support
- [ ] Multi-language support
- [ ] PDF brochures for download

## Support

For technical issues or questions:
- Contact: info@bgm-summerschool.com
- Issues: Create an issue in the repository

## License

© 2026 Bernardi Music Group - Summer School, Assam. All rights reserved.
