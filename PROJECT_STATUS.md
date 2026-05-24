# BookQuest — project status

Last updated after full platform scan and fixes.

## Done

- Storefront, catalog, cart, library, reviews
- **Paystack** checkout + webhook + verified confirm callback
- Clerk auth + admin by email
- Seller marketplace (apply, CRUD, submit for review)
- Admin (approve/reject books, verify/revoke sellers, metrics)
- Secure PDF delivery via authenticated API (private `storage/private`)
- Sample PDFs via `/api/books/[slug]/sample`
- Sale pricing for sellers
- Terms, privacy, refund, contact pages
- `.env.example`, Prisma migrations, seed data
- Production build passes

## Still optional / future

| Item | Notes |
|------|--------|
| Email receipts | Resend/Postmark not wired |
| Seller payouts UI | `Payout` model exists, no automation |
| S3/Blob storage | Required for durable uploads on Vercel |
| Automated tests | None yet |
| Rate limiting | Add Upstash or middleware |
| Stripe removal | Legacy DB columns remain; code uses Paystack only |

## Env checklist

See `.env.example` — minimum: `DATABASE_URL`, Clerk keys, `PAYSTACK_SECRET_KEY`, `ADMIN_EMAILS`, `NEXT_PUBLIC_APP_URL`.
