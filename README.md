# ATU Hostel Booking

Student hostel booking for Accra Technical University. Students search rooms, request a booking, and submit Mobile Money. Managers approve bookings and verify payments. Admins manage users, hostels, and notifications.

Stack: Next.js 16, Prisma, Postgres (local Prisma Postgres or Neon), iron-session.

## Setup

```bash
bun install
cp .env.example .env
```

### Local database (recommended for `next dev`)

Avoids Neon free-tier cold starts and connection timeouts:

```bash
bun run db:local          # start local Prisma Postgres (background)
bun run db:setup          # push schema + seed demo accounts
bun run dev
```

Stop the local DB: `bun run db:local:stop`.

`.env.example` already points `DATABASE_URL` / `DIRECT_URL` at
`localhost:51214`. Neon URLs can stay commented for production deploys.

### Neon (cloud)

Set `DATABASE_URL` (pooled) and optional `DIRECT_URL` (direct) to a Neon
Postgres database, then `bun run db:setup`.

## Demo accounts

All seed passwords are `Demo@ATU2026`.

| Role | Email |
|---|---|
| Admin | admin@atu.edu.gh |
| Manager | manager@hostel.test |
| Student | student@atu.edu.gh |

## Email

Default: console mailer (prints to the server log).

Set `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` to deliver through SMTP (Mailtrap sandbox works). Admin panel: `/admin/notifications`. Status and test send: `GET` / `POST` `/api/smtp`.

Optional Mailtrap-hosted templates: `MAILTRAP_API_TOKEN`, `MAILTRAP_INBOX_ID`, and `MAILTRAP_TEMPLATE_*` UUIDs. Unset UUIDs keep using SMTP/console.

## Tests

```bash
bun test
```

Playwright (`bun run test:e2e`) needs `DATABASE_URL` or `E2E_DATABASE_URL` loaded (add `import "dotenv/config"` in `playwright.config.ts` if the runner does not see `.env`).

API shape is in `openapi.yaml`.
