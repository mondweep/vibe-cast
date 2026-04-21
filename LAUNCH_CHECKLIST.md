# BMG Summer School Website - Launch Checklist

## IMMEDIATE (This Week)

### Finalize Event Details
- [ ] Confirm exact event dates (Sept 25-Oct 2? Adjust dates section)
- [ ] Confirm venue/location details (Royal Global University, Assam)
- [ ] Get contact person email(s) for responses
- [ ] Get phone numbers (UK & Assam)
- [ ] Confirm student fee structure
  - [ ] Grade 1-4 (Foundational)
  - [ ] Grade 5-8 (Intermediate/Advanced)
  - [ ] Diploma Preparation
  - [ ] Advanced/Professional

### Prepare Branding Assets
- [ ] Bernardi Music Group logo (high-res)
- [ ] Mount Carmel School logo
- [ ] Event logo/banner
- [ ] Faculty photos (if available, or use placeholders)
- [ ] Sample programme/schedule document
- [ ] Assam location photos

### Update Website Content
- [ ] Replace placeholder contact emails with real addresses
- [ ] Update phone numbers
- [ ] Add correct event dates to all sections
- [ ] Verify all partner names and descriptions
- [ ] Add Zubeen Garg background (from PDFs)
- [ ] Add programme curriculum details
- [ ] Set application deadline date

### Deploy Website
- [ ] Create Netlify account
- [ ] Connect GitHub repository
- [ ] Set build settings (base: `website`, build: `npm run build`)
- [ ] Deploy to live URL
- [ ] Test on mobile & desktop
- [ ] Add custom domain (optional)

### Test All Features
- [ ] Hero section displays correctly
- [ ] All navigation links work
- [ ] Sponsorship tiers display properly
- [ ] Student registration form:
  - [ ] All fields present
  - [ ] Validation works
  - [ ] Form submits (check browser console)
  - [ ] Success message displays
- [ ] Contact form works
- [ ] Forms are mobile-friendly
- [ ] Footer links work

---

## WEEK 1-2: Set Up Backend Infrastructure

### Supabase Setup
- [ ] Create Supabase account
- [ ] Create new project
- [ ] Create database tables:
  - [ ] `registrations` table
  - [ ] `inquiries` table
  - [ ] `subscriptions` table
- [ ] Enable RLS policies
- [ ] Test table inserts manually

### Connect Forms to Supabase
- [ ] Update environment variables (Supabase URL & Key)
- [ ] Test registration form submission
- [ ] Test contact form submission
- [ ] Check data appears in Supabase dashboard
- [ ] Set up automatic email confirmations (optional)

### Email System
- [ ] Set up Resend account (or SendGrid/Mailgun)
- [ ] Create email templates:
  - [ ] Application confirmation
  - [ ] Contact form acknowledgment
  - [ ] Welcome to newsletter
  - [ ] Sponsorship thank you
- [ ] Test email delivery
- [ ] Add DKIM/SPF records to domain

### Analytics
- [ ] Set up Google Analytics
- [ ] Track page views
- [ ] Monitor form submissions
- [ ] Set up conversion goals

---

## WEEK 2-3: Marketing Launch

### Social Media
- [ ] Create social media accounts:
  - [ ] Facebook Page
  - [ ] Instagram Account
  - [ ] LinkedIn Page
  - [ ] Twitter/X Account
- [ ] Create branded graphics for posts
- [ ] Post initial announcement
- [ ] Share website link
- [ ] Hashtags: #BMGSummerSchool #AssamMusic #ZubeenGargLegacy

### Partner Communication
- [ ] Email to Bernardi Music Group (UK)
- [ ] Email to Mount Carmel School
- [ ] Email to Royal Global University
- [ ] Email to music organizations/conservatories
- [ ] Email to potential sponsors
- [ ] Coordinate partner logo/link placement

### Press & Media
- [ ] Write press release
- [ ] Send to local Assam media
- [ ] Contact music publications
- [ ] Reach out to music bloggers/influencers
- [ ] Create media kit

### Sponsorship Outreach
- [ ] Create sponsor prospectus document
- [ ] Identify potential sponsors:
  - [ ] Music companies (instrument makers, etc.)
  - [ ] Local businesses in Assam
  - [ ] International music organizations
  - [ ] Foundations/NGOs focused on arts
  - [ ] Alumni networks
- [ ] Send sponsorship proposals
- [ ] Follow up on inquiries

---

## WEEK 3-4: Optimize & Refine

### Website Optimization
- [ ] Add high-quality images (replace placeholders)
- [ ] Optimize image sizes for web
- [ ] Add favicon
- [ ] Implement meta tags for social sharing
- [ ] Add structured data (schema.org)
- [ ] Test site speed (PageSpeed Insights)
- [ ] Enable caching

### Content Improvement
- [ ] Add more faculty bios (if available)
- [ ] Add testimonials/quotes
- [ ] Create FAQ page
- [ ] Add blog section with updates
- [ ] Write programme details/schedule
- [ ] Add travel & logistics information

### Admin Dashboard (Basic)
- [ ] Set up way to review applications
- [ ] Export registrations to CSV
- [ ] Track sponsorship amounts
- [ ] Manage email subscribers
- [ ] Create reports for partners

### SEO
- [ ] Submit sitemap to Google Search Console
- [ ] Verify domain ownership
- [ ] Set up Google My Business (if applicable)
- [ ] Optimize meta descriptions
- [ ] Add internal linking
- [ ] Build backlinks from partner sites

---

## MID-AUGUST: Finalization

### Close Applications
- [ ] Application deadline enforcement
- [ ] Send confirmation to all applicants
- [ ] Begin interview scheduling
- [ ] Notify selected candidates

### Fundraising Status
- [ ] Calculate sponsorship progress
- [ ] Follow up with potential sponsors
- [ ] Confirm all funding sources
- [ ] Update fundraising section on website
- [ ] Send thank-you messages to sponsors

### Operational Planning
- [ ] Confirm participant list
- [ ] Arrange travel logistics
- [ ] Book accommodations
- [ ] Arrange catering
- [ ] Create event schedule
- [ ] Brief all team members

### Website Maintenance Mode
- [ ] Update applications to "closed"
- [ ] Add participant information section
- [ ] Begin event countdown
- [ ] Post regular updates/news

---

## AUGUST-SEPTEMBER: Pre-Event

### Participant Communication
- [ ] Send welcome packets
- [ ] Share travel arrangements
- [ ] Provide accommodation details
- [ ] Share daily schedule
- [ ] Gather any additional information needed

### Marketing Amplification
- [ ] Daily social media updates
- [ ] Share faculty profiles
- [ ] Post behind-the-scenes preparation
- [ ] Create anticipation for the event
- [ ] Tag partners and sponsors

### Final Checks
- [ ] Confirm all faculty and staff
- [ ] Double-check accommodations
- [ ] Arrange transport
- [ ] Prepare welcome materials
- [ ] Test any live-streaming setup
- [ ] Create event photography plan

---

## During Event: September-October

- [ ] Daily social media updates with photos
- [ ] Live updates on website
- [ ] Participant testimonials/videos
- [ ] Real-time fundraising updates
- [ ] Sponsor recognition posts

---

## Post-Event: October

- [ ] Collect and share event photos/videos
- [ ] Gather participant feedback
- [ ] Write thank-you letters to sponsors
- [ ] Create impact report
- [ ] Plan for Year 2 programme
- [ ] Archive website content
- [ ] Update partnership agreements

---

## Contact Information Template

**Update These in Website Settings:**

```
Primary Contact: [Name]
Email: info@bgm-summerschool.com
Phone (UK): +44 [____]
Phone (Assam): +91 [____]

Website: summerschool.bgm.com
Location: Royal Global University, Assam, India
```

---

## File Checklist

Website files ready in `/website/` folder:
- [x] `package.json` - Dependencies
- [x] `next.config.js` - Next.js configuration  
- [x] `tailwind.config.ts` - Styling
- [x] `app/layout.tsx` - Root layout
- [x] `app/page.tsx` - Home page
- [x] `components/` - All components
- [x] `.env.example` - Environment template
- [x] `README.md` - Documentation

---

## Success Metrics

**Website Launch:**
- [ ] Site loads in < 3 seconds
- [ ] Mobile responsiveness verified
- [ ] All forms functional
- [ ] 100+ email signups in first week

**Sponsorship:**
- [ ] £2,000+ committed by end of May
- [ ] £10,000+ by end of July
- [ ] £15,000 target by mid-August

**Participant Interest:**
- [ ] 50+ applications by July
- [ ] 25-30 accepted for final programme
- [ ] 80%+ of places filled

**Engagement:**
- [ ] 1,000+ website visits in first month
- [ ] 100+ social media followers
- [ ] 30%+ email open rate

---

## Key Dates to Remember

| Date | Milestone |
|------|-----------|
| This Week | Website deployed |
| May 31 | Initial sponsorship fundraising deadline |
| June 30 | 50%+ of applications received |
| July 31 | Application deadline |
| August 1-15 | Final decisions made |
| August 15 | All planning must be complete |
| Sept 25 (approx) | Summer School begins |
| Oct 2 (approx) | Summer School ends |

---

## Notes & Questions

**For Andrew Bernardi / Team:**
- [ ] Confirm faculty availability for dates
- [ ] Confirm travel arrangements for faculty
- [ ] Provide detailed curriculum/schedule
- [ ] Authorize use of Bernardi Music Group materials

**For Royal Global University:**
- [ ] Finalize accommodation arrangements
- [ ] Confirm catering capabilities
- [ ] Arrange technical support
- [ ] Plan campus tour/orientation

**For Mount Carmel School:**
- [ ] Confirm partnership status
- [ ] Authorize use of name/logo
- [ ] Provide institutional contacts

**For Sponsors/Partners:**
- [ ] Confirm sponsorship interest
- [ ] Provide logo for website
- [ ] Authorize use of name
- [ ] Clarify reporting/recognition needs

---

**Website Deployment Owner:** [Your Name]  
**Project Lead:** [Project Manager]  
**Last Updated:** April 21, 2026  

Good luck with the launch! 🎵
