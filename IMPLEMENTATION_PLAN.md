# Bernardi Music Group - Summer School, Assam
## Phase-Wise Website Implementation Plan

**Event Name:** Bernardi Music Group - Summer School, Assam  
**Tagline:** Inspired by Zubeen Garg  
**Timeline:** Planning deadline: Mid-August 2026 | Event: End September - Early October 2026  
**Hosting:** Netlify | Database: Supabase (Phase 2+)

---

## PHASE 1: MVP Website & Marketing (April-May 2026)
**Duration:** 4-5 weeks  
**Goal:** Launch marketing website with core information and basic registration  
**Feasibility:** HIGH - This is achievable with basic static site approach

### 1.1 Design & Branding
- [ ] Extract branding colors from Bernardi Music Group UK style
  - Primary: Navy Blue (#003366 or similar deep blue)
  - Secondary: Cream/Beige (#F5F1E8 or similar)
  - Accent: Gold/Bronze for highlights
- [ ] Design system: Typography, spacing, component library
- [ ]Favicon & logo optimization for web
- [ ] Create style guide document

### 1.2 Website Structure & Pages
**Tech Stack:** Next.js 14 + Tailwind CSS (optimized for Netlify)

**Core Pages:**
1. **Home/Hero Section**
   - Event headline & date
   - "Learn • Perform • Belong" tagline
   - Call-to-action button (Apply Now)
   - Key USPs highlighted

2. **About the Initiative**
   - Vision: National Music Conservatoire in India
   - Partnership overview (Bernardi Music Group, Mount Carmel, Zubeen Garg Trust)
   - "The IIT Model for Music" concept
   - Why Assam? Why Zubeen Garg's legacy?

3. **Programme Overview**
   - Duration & dates (provisional)
   - Location (Royal Global University, Assam)
   - Student profile (Ages 12-20)
   - Instruments offered (Strings, Piano, Voice)
   - Key features (World-class training, performance opportunities, accommodation included)

4. **Faculty**
   - Andrew Bernardi (Director, Violin)
   - Maria Marchant (Piano)
   - Jonathan Few (Cello)
   - Anando Mukerjee (Tenor & Vocals, India connection)
   - Profile cards with photos, credentials, expertise

5. **Zubeen Garg's Legacy**
   - Introduction to Zubeen Garg
   - Link to compositions (embed PDFs or audio where possible)
   - "Gaane Ki Aane" and "Mayabini" - significance
   - Cultural bridge: Western & Indian music

6. **How to Apply**
   - Application requirements
   - Selection criteria
   - Important dates (Application deadline, Interview dates, etc.)
   - Contact information

7. **FAQs**
   - Cost/fees structure
   - Accommodation details
   - Travel to Assam
   - What to bring
   - Visa information (for international applicants)
   - Scholarship/sponsorship info (Zubeen Garg Trust)

8. **Contact & Newsletter Signup**
   - Email signup for updates
   - Contact form
   - Social media links

### 1.3 Visual Assets
- [ ] High-quality hero images (music performance, Assam location, faculty)
- [ ] Faculty photographs (use from PDFs if available)
- [ ] Icons for key features (Learn, Perform, Belong)
- [ ] Zubeen Garg biographical images/compositions visual representation

### 1.4 Content Creation
- [ ] Homepage copy
- [ ] Programme description (use Summer School brochure as reference)
- [ ] Faculty bios (extracted from Summer School PDF)
- [ ] FAQ content
- [ ] Application instructions

### 1.5 Basic Form Setup
- [ ] Interest/Newsletter signup form (Supabase - simple setup)
- [ ] Contact form (email notifications)
- [ ] Early access request (to build email list)

### 1.6 SEO & Marketing Setup
- [ ] Meta descriptions, keywords
- [ ] Open Graph tags for social sharing
- [ ] Google Analytics setup
- [ ] Sitemap & robots.txt

**Deliverables:**
- Live website on Netlify
- Email list started (via Supabase)
- Social media assets ready to share
- Marketing copy finalized

---

## PHASE 2: Registration & Engagement (June-July 2026)
**Duration:** 6 weeks (overlap with Phase 1 final weeks)  
**Goal:** Enable full application process & participant engagement  
**Feasibility:** HIGH - Supabase provides simple no-code backend

### 2.1 Supabase Database Setup
```
Tables:
1. registrations
   - id, email, name, age, instrument, country, phone
   - application_status, submission_date, interview_date
   
2. email_list
   - id, email, signup_date, source
   
3. inquiries
   - id, name, email, message, created_at
```

### 2.2 Application Form
- [ ] Full registration form (6-8 questions)
  - Basic info (name, email, age, location)
  - Musical background (grade level, instrument, experience)
  - Motivation/essay
  - Upload performance recording (optional)
  - Parent/guardian info
  
- [ ] Form validation & error handling
- [ ] Auto-confirmation emails
- [ ] Application status tracking (submitted, under review, interview scheduled, accepted, waitlist)

### 2.3 Participant Dashboard (Authenticated)
- [ ] Login with email
- [ ] View application status
- [ ] Download acceptance letter
- [ ] Access to participant handbook/logistics info
- [ ] Message board for accepted students

### 2.4 Admin Panel (Backend)
- [ ] View all applications
- [ ] Filter & search applications
- [ ] Update application status
- [ ] Generate reports (demographics, instruments, regions)
- [ ] Email bulk messaging to applicants

### 2.5 Enhanced Email Communications
- [ ] Application confirmation email
- [ ] Status updates (Under Review, Interview Scheduled, Accepted/Waitlisted)
- [ ] Interview instructions
- [ ] Acceptance letter with next steps
- [ ] Logistics email (accommodation, travel, what to bring)
- [ ] Weekly countdown emails (post-acceptance)

**Deliverables:**
- Full application system live
- Participant dashboard functional
- Admin backend operational
- Email automation in place

---

## PHASE 3: Community & Logistics (July-August 2026)
**Duration:** 4-5 weeks  
**Goal:** Build community, finalize logistics, sponsor engagement  
**Feasibility:** HIGH - Extends existing platform

### 3.1 Community Features
- [ ] Participant forum (for accepted students to connect)
- [ ] Faculty bios with contact for questions
- [ ] Whatsapp group invite (link on site)
- [ ] Discord community server (optional)

### 3.2 Logistics Hub
- [ ] Accommodation details & photos
- [ ] Travel guides (getting to Assam, visa info)
- [ ] Daily schedule template
- [ ] Packing list
- [ ] COVID/health protocols
- [ ] Emergency contact procedures
- [ ] Participant code of conduct

### 3.3 Sponsor & Partner Portal
- [ ] Dedicated sponsor page
- [ ] Sponsorship benefits & recognition
- [ ] Sponsor logo showcase
- [ ] Impact stories from Phase 1 workshops
- [ ] Downloadable marketing materials for sponsors

### 3.4 Blog/News Section
- [ ] Updates on faculty arrivals
- [ ] Preparation tips for participants
- [ ] Stories about Zubeen Garg & compositions
- [ ] Mount Carmel School highlights
- [ ] Preview of summer activities

### 3.5 Analytics & Marketing Dashboard
- [ ] Track application numbers by region/instrument
- [ ] Conversion rates
- [ ] Email open rates
- [ ] Social media engagement

**Deliverables:**
- Community platform live
- Logistics hub complete
- Sponsor portal operational
- Marketing content updated regularly

---

## PHASE 4: Event Management & Live Features (August-September 2026)
**Duration:** 4-6 weeks  
**Goal:** Real-time updates, participant engagement during event  
**Feasibility:** MEDIUM - Requires active management

### 4.1 Live Event Features
- [ ] Real-time schedule updates
- [ ] Photo/video gallery (daily uploads during summer school)
- [ ] Social media feed integration
- [ ] Live streaming of final performance (if bandwidth allows)
- [ ] Participant spotlights/testimonials

### 4.2 Event Day Operations
- [ ] Check-in digital tool
- [ ] Attendance tracking
- [ ] Feedback forms after each session
- [ ] Real-time notifications for updates

**Deliverables:**
- Live event platform
- Daily updates & engagement
- Post-event feedback collection

---

## PHASE 5: Future Scaling (Post-Event)
**Timeline:** October 2026 onwards  
**Goal:** Build sustainable ecosystem for year-round engagement

### 5.1 Alumni Network
- [ ] Alumni portal with continued learning resources
- [ ] Networking events & masterclasses (virtual)
- [ ] Alumni directory
- [ ] Continued education pathways (UK conservatoire connections)

### 5.2 Year-Round Programming
- [ ] Monthly online masterclasses
- [ ] Quarterly workshops
- [ ] Annual summit planning
- [ ] Mentorship program matching faculty to alumni

### 5.3 Database Enhancement for Planning Activities
- [ ] Workshop management system
- [ ] Instructor scheduling
- [ ] Venue management
- [ ] Budget tracking
- [ ] Sponsorship pipeline management

### 5.4 Mobile App (Optional)
- [ ] iOS/Android app for registrations & engagement
- [ ] Push notifications
- [ ] Offline schedule access

---

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, React |
| Hosting | Netlify (free tier with custom domain) |
| Database | Supabase (PostgreSQL, free tier includes 500MB) |
| Auth | Supabase Auth (email) |
| Email | Resend + Supabase (transactional) |
| Forms | React Hook Form + Zod validation |
| Analytics | Vercel Analytics + Supabase |
| CMS | Markdown files in Git (for blog) |

---

## Timeline at a Glance

```
April 2026
├─ Week 1-2: Design finalization, content gathering
├─ Week 3-4: Phase 1 website build & launch
│
May 2026
├─ Week 1-2: Phase 1 refinements, begin Phase 2
├─ Week 3-4: Phase 2 Supabase setup & forms
│
June 2026
├─ Week 1-3: Phase 2 completion, application launch
├─ Week 3-4: Phase 3 logistics hub setup
│
July 2026
├─ Week 1-2: Phase 3 community features
├─ Week 2-3: Sponsor portal
├─ Week 4: Final refinements, pre-event prep
│
Mid-August 2026: PLANNING DEADLINE
│
Late August - Early October: PHASE 4 & EVENT
│
October 2026+: Phase 5 planning & alumni engagement
```

---

## Effort Estimates

| Phase | Dev Time | Design Time | Content Time | Total |
|-------|----------|------------|-------------|-------|
| Phase 1 | 40-60 hrs | 20-30 hrs | 15-20 hrs | 75-110 hrs |
| Phase 2 | 30-40 hrs | 10-15 hrs | 10 hrs | 50-65 hrs |
| Phase 3 | 20-30 hrs | 5-10 hrs | 20-30 hrs | 45-70 hrs |
| Phase 4 | 15-20 hrs | 5 hrs | 30-40 hrs | 50-65 hrs |
| **Total MVP** | **100-150 hrs** | **40-55 hrs** | **75-100 hrs** | **215-305 hrs** |

---

## Success Metrics

**Phase 1:**
- Website live & accessible
- 50+ email signups in first week
- Mobile-responsive design verified

**Phase 2:**
- 100+ applications received
- 95% form completion rate
- 0 database errors

**Phase 3:**
- 200+ total registrations
- Active participant community (10+ forum posts)
- 5+ sponsors confirmed

**Phase 4:**
- 95%+ participant satisfaction scores
- 100+ social media shares of event content
- 50+ high-quality photos/videos captured

**Phase 5:**
- 80%+ alumni retention for continued engagement
- 30+ attendees in first alumni event

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Tight timeline for Phase 1 | Start with MVP only, no fancy features |
| Database scaling (many registrations) | Supabase free tier handles 10K+ records easily |
| Email deliverability | Use verified Resend service |
| Bandwidth for live streaming | Test beforehand, have YouTube backup |
| Participant no-show tracking | Digital check-in system in Phase 4 |

---

## Next Steps

1. **Approve this plan** (any modifications?)
2. **Assign roles:** Designer, Developer, Content Lead, Project Manager
3. **Gather remaining assets:** High-res photos, exact event dates, fee structure
4. **Set up Netlify & Supabase accounts** (free tier)
5. **Begin Phase 1:** Design system + homepage by next week

---

## Questions to Confirm

1. **Event Dates:** Exact start/end dates (end Sept or early Oct?)
2. **Location:** Royal Global University, Assam - confirmed?
3. **Fee Structure:** Price for different student tiers?
4. **Capacity:** How many students will you accept?
5. **Contact person:** Who should inquiries be sent to?
6. **Additional faculty:** Any other international faculty besides the 4 mentioned?
7. **Sponsorship levels:** What are sponsor recognition tiers?
8. **Materials:** Do you have high-res photos of Zubeen Garg, compositions, Mount Carmel facility?
