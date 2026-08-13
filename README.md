# ATU Hostel Booking

Student hostel booking for Accra Technical University. Students search rooms, request a booking, and submit Mobile Money. Managers approve bookings and verify payments. Admins manage users, hostels, and notifications.

Stack: Next.js 16, Prisma, Neon Postgres, iron-session.

## Setup

```bash
bun install
cp .env.example .env
```

Set `DATABASE_URL` (and optional `DIRECT_URL`) to a Neon Postgres database. Then:

```bash
bun run db:setup
bun run dev
```

Open http://localhost:3000

## Demo accounts

All seed passwords are `password`.

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
