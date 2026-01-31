# ShopFlow V2 Deployment Guide

## Local Development

### 1. Start the Development Server
```bash
npm run dev
```
The app will run on http://localhost:3002 (or next available port).

### 2. Set Up Stripe Webhook Forwarding
In a separate terminal:
```bash
# First time: Login to Stripe
stripe login

# Start webhook forwarding
./scripts/stripe-webhook-local.sh
# Or manually:
stripe listen --forward-to localhost:3002/api/webhooks/stripe
```

Copy the `whsec_...` secret and add it to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

### 3. Test Payments
- Use Stripe test card: `4242 4242 4242 4242`
- Any future expiry date and any CVC
- Discount codes: `FREEORDER` (100%), `HALF50` (50%), `SAVE20` (20%)

---

## Netlify Deployment

### 1. Prerequisites
- GitHub repository with this code
- Netlify account
- Production PostgreSQL database (Neon, Supabase, or Railway recommended)
- Stripe account with production keys

### 2. Deploy to Netlify

#### Option A: Via Netlify Dashboard
1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Connect your GitHub repository
4. Build settings are auto-detected from `netlify.toml`

#### Option B: Via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### 3. Configure Environment Variables
In Netlify Dashboard > Site Settings > Environment Variables, add:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Production PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` for testing |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard webhook endpoint |
| `RESEND_API_KEY` | Your Resend API key |
| `NEXT_PUBLIC_APP_URL` | Your Netlify site URL |

### 4. Set Up Production Stripe Webhook
1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://your-site.netlify.app/api/webhooks/stripe
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (`whsec_...`)
7. Add it to Netlify environment variables as `STRIPE_WEBHOOK_SECRET`

### 5. Set Up Production Database
Run Prisma migrations on your production database:
```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="your_production_connection_string"
npx prisma db push
npx prisma db seed
```

### 6. Configure Resend for Production
1. Go to [Resend Domains](https://resend.com/domains)
2. Add and verify your domain
3. Update the `from` address in `src/lib/email.ts` to use your verified domain

---

## Environment Comparison

| Feature | Local | Netlify Production |
|---------|-------|-------------------|
| Database | localhost PostgreSQL | Neon/Supabase/Railway |
| Stripe | Test mode (`sk_test_`) | Live or Test mode |
| Webhooks | `stripe listen --forward-to` | Dashboard endpoint |
| Emails | Resend (owner email only) | Resend (verified domain) |
| URL | http://localhost:3002 | https://your-site.netlify.app |

---

## Troubleshooting

### Webhooks not working locally
1. Ensure `stripe listen` is running
2. Check the webhook secret matches `.env.local`
3. Verify the dev server is on the correct port

### Webhooks not working on Netlify
1. Check the endpoint URL in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` in Netlify env vars
3. Check Netlify function logs for errors

### Database connection errors
- Local: Ensure PostgreSQL is running (`brew services start postgresql`)
- Netlify: Check connection string format and SSL settings

### Emails not sending
- Local: Use your Resend account email as recipient
- Production: Verify your domain in Resend

---

## Useful Commands

```bash
# Database
npm run db:studio    # Open Prisma Studio
npm run db:push      # Push schema changes
npm run db:seed      # Seed sample data

# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run linter

# Stripe CLI
stripe login                                      # Authenticate
stripe listen --forward-to localhost:3002/...    # Forward webhooks
stripe trigger checkout.session.completed        # Test webhook
```
