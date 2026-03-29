# Shannon Craft Creator Platform — Setup Guide
# GitHub Pages + Cloudflare Workers (Free Forever)

---

## YOUR FILE STRUCTURE

```
Your GitHub repo (upload ALL of these):
├── index.html                  ← public creator page
├── admin.html                  ← mobile admin
├── admin-desktop.html          ← desktop admin
├── admin-email.html            ← email builder
├── how-to-use.html             ← email guide
├── sc-email.js                 ← email engine
├── _config.yml                 ← GitHub Pages config
└── SETUP-GUIDE.md              ← this file

cloudflare-workers/ (deploy these SEPARATELY to Cloudflare — NOT to GitHub):
├── send-email.js
├── stripe-webhook.js
└── paypal-webhook.js
```

---

## STEP 1 — PUT FILES ON GITHUB

1. Go to github.com → log in as ShannonlCraft
2. Click + top right → New repository
3. Name it: shannon-craft-platform
4. Check Public and Add a README → Create repository
5. Click "uploading an existing file"
6. Drag in ALL files listed above EXCEPT the cloudflare-workers folder
7. Click Commit changes

---

## STEP 2 — TURN ON GITHUB PAGES

1. In your repo → click Settings tab
2. Left sidebar → Pages
3. Source → Deploy from a branch
4. Branch → main → folder → / (root) → Save
5. Wait 2 minutes → visit:
   https://shannonlcraft.github.io/shannon-craft-platform

Your site is live!

Your private manage link:
https://shannonlcraft.github.io/shannon-craft-platform/index.html?manage=true

---

## STEP 3 — SET UP RESEND (Free Email Sending)

1. Go to resend.com → create free account (no credit card)
2. Click API Keys → Create API Key
3. Copy the key — it starts with re_
4. Save it somewhere safe — you'll need it in Step 4

---

## STEP 4 — SET UP CLOUDFLARE WORKERS

1. Go to cloudflare.com → Sign up free (no domain needed)
2. Dashboard → Workers & Pages → Create application → Create Worker

### Deploy send-email worker:
- Name it: sc-send-email
- Click Deploy → Edit code
- Delete all default code → paste everything from cloudflare-workers/send-email.js
- Save and deploy
- Go to Settings → Variables → Add:
  - RESEND_API_KEY = your re_ key from Step 3 (click Encrypt)
  - FROM_EMAIL = hello@shannoncraft.com
  - FROM_NAME = Shannon Craft

### Deploy stripe-webhook worker:
- Same process → name it: sc-stripe-webhook
- Paste cloudflare-workers/stripe-webhook.js
- Add variable: STRIPE_WEBHOOK_SECRET (from Step 5)

### Deploy paypal-webhook worker:
- Same process → name it: sc-paypal-webhook
- Paste cloudflare-workers/paypal-webhook.js

---

## STEP 5 — CONNECT STRIPE

1. dashboard.stripe.com → Developers → Webhooks → Add endpoint
2. URL: https://sc-stripe-webhook.shannonlcraft.workers.dev
3. Event: checkout.session.completed
4. Copy the Signing secret → add it as STRIPE_WEBHOOK_SECRET in your Worker

---

## STEP 6 — CONNECT PAYPAL

1. developer.paypal.com → My Apps → your app → Webhooks
2. URL: https://sc-paypal-webhook.shannonlcraft.workers.dev
3. Events: CHECKOUT.ORDER.APPROVED and PAYMENT.CAPTURE.COMPLETED

---

## STEP 7 — ADD RESEND KEY TO YOUR ADMIN

1. Open your manage link (see Step 2)
2. Tap Settings → Email Sending
3. Paste your Resend API key, your email address, your name
4. Broadcasts now actually send!

---

## WHEN YOU'RE READY FOR SHANNONCRAFT.COM

1. GitHub repo → Settings → Pages → Custom domain
2. Type: shannoncraft.com → Save
3. GitHub shows you DNS records to add
4. Add them in Hostinger → your site moves to shannoncraft.com

---

## FREE FOREVER COST BREAKDOWN

| Service           | Cost | Limit                    |
|-------------------|------|--------------------------|
| GitHub Pages      | FREE | Unlimited                |
| Cloudflare Workers| FREE | 100,000 requests/day     |
| Resend            | FREE | 3,000 emails/month       |
| TOTAL             | $0   |                          |
