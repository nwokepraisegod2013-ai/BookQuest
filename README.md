# BookQuest

Production-ready **PDF book marketplace** for Nigeria. Multiple sellers, admin moderation, Stripe Checkout in **NGN**, and a polished **black glassmorphism** UI.

**Stack:** Next.js 16 · PostgreSQL (Neon) · Clerk · Stripe Nigeria · Vercel

## Features

- **Storefront** — browse, search, filter, book detail, reviews
- **Cart & checkout** — Stripe Checkout in Nigerian Naira
- **Personal library** — instant PDF access after purchase
- **Marketplace sellers** — apply, list books, submit for admin approval
- **Admin panel** — approve listings, view orders & revenue
- **Glassmorphism UI** — polished dark theme

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and fill in:

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | [Neon](https://neon.tech) or local Postgres |
| Clerk keys | [Clerk Dashboard](https://dashboard.clerk.com) |
| Stripe keys | [Stripe Dashboard](https://dashboard.stripe.com) (Nigeria account, enable NGN) |
| `ADMIN_EMAILS` | Your email (comma-separated) for admin access |

### 3. Database

```bash
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Add the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

### 5. Clerk webhook

In Clerk Dashboard → Webhooks → add endpoint:

`https://your-domain.com/api/webhooks/clerk`

Events: `user.created`, `user.updated`, `user.deleted`

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel + Neon)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all env vars from `.env.example`
4. Set `DATABASE_URL` from Neon (pooled connection for serverless)
5. Deploy — run migrations via Vercel build or `npx prisma migrate deploy`

**Stripe Nigeria:** Ensure your Stripe account is activated for Nigeria and that **NGN** is enabled as a presentment currency in Checkout.

## Roles

| Role | Access |
|------|--------|
| Customer | Browse, cart, library |
| Seller | `/seller` dashboard, create listings |
| Admin | `/admin` — set via `ADMIN_EMAILS` |

## Project structure

```
src/
  app/          # Pages & API routes
  components/   # UI (glass theme, books, cart, admin)
  lib/          # db, auth, stripe, storage
prisma/         # Schema & seed
```

## License

MIT
