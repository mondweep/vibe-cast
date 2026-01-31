#!/bin/bash

# Stripe Webhook Forwarding Script for Local Development
# This forwards Stripe webhook events to your local Next.js server

echo "🔗 Starting Stripe webhook forwarding..."
echo ""
echo "This will forward Stripe test events to your local server."
echo "Make sure your Next.js dev server is running on port 3002."
echo ""

# Check if logged in
if ! stripe config --list 2>/dev/null | grep -q "test_mode"; then
  echo "⚠️  You need to log in to Stripe first."
  echo "Running: stripe login"
  stripe login
fi

echo ""
echo "📡 Forwarding webhooks to http://localhost:3002/api/webhooks/stripe"
echo ""
echo "⚠️  IMPORTANT: Copy the webhook signing secret (whsec_...) shown below"
echo "   and add it to your .env.local file as STRIPE_WEBHOOK_SECRET"
echo ""

# Forward webhooks to local server
stripe listen --forward-to localhost:3002/api/webhooks/stripe
