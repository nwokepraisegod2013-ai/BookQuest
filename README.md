# BookQuest

Production-ready **PDF book marketplace** for Nigeria. Multiple sellers, admin moderation, **Paystack (NGN)** checkout, and a polished **black glassmorphism** UI.

**Stack:** Next.js 16 · PostgreSQL (Neon) · Clerk · Paystack · Vercel

## Features

- **Storefront** — browse, search, filter, book detail, reviews, sale prices
- **Cart & checkout** — Paystack in Nigerian Naira
- **Personal library** — secure PDF download (not public URLs)
- **Marketplace sellers** — apply, list books, submit for admin approval
- **Admin panel** — approve listings, verify sellers, orders & revenue
- **Legal** — terms, privacy, refund policy, contact

## Quick start

### 1. Install

```bash
cd bookquest
npm install
```

### 2. Environment

```bash
copy .env.example .env
```

| Variable | Where to get it |
|----------|-----------------|
| `DATABASE_URL` | [Neon](https://neon.tech) or local Postgres |
| Clerk keys | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk → Configure → Webhooks → Signing secret |
| `PAYSTACK_SECRET_KEY` | [Paystack](https://dashboard.paystack.com) → Settings → API Keys |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Same page → Public key |
| `ADMIN_EMAILS` | Your sign-up email (comma-separated) |

### 3. Database

```bash
npx prisma migrate dev
npm run db:seed
```

### 4. Paystack webhooks (local)

```bash
# Use ngrok: ngrok http 3000
# Then in Paystack → Settings → Webhooks → add:
# https://YOUR-NGROK.ngrok-free.app/api/webhooks/paystack
```

Events: `charge.success`

### 5. Clerk webhook (optional locally)

`https://YOUR-NGROK.ngrok-free.app/api/webhooks/clerk` — events: `user.created`, `user.updated`, `user.deleted`

### 6. Run

```bash
npm run dev
```

Open http://localhost:3000

## Deployment (Vercel + Neon)

1. Push to GitHub, import in Vercel
2. Add all env vars from `.env.example`
3. Use Neon **pooled** `DATABASE_URL`
4. Set Paystack **live** keys and live webhook URL
5. For uploads on Vercel, use Blob/S3 (local `storage/private` is ephemeral on serverless)

## Roles

| Role | Access |
|------|--------|
| Customer | Browse, cart, library |
| Seller | `/seller` — create listings |
| Admin | `/admin` — email in `ADMIN_EMAILS` |

## Project structure

```
src/app/          Pages & API routes
src/components/   Glass UI
src/lib/          db, auth, paystack, orders, storage
prisma/           Schema, migrations, seed
storage/private/  Paid PDFs (not web-accessible)
```

## License

MIT
