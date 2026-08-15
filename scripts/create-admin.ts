import "dotenv/config";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { randomBytes } from "node:crypto";
import { createPrismaClient } from "../src/lib/prisma-client.ts";

const email = process.env.NEW_ADMIN_EMAIL?.trim().toLowerCase() || "admin.ops@atu.edu.gh";
const name = process.env.NEW_ADMIN_NAME?.trim() || "Operations Administrator";
const phone = process.env.NEW_ADMIN_PHONE?.trim() || "0200000099";
const password =
  process.env.NEW_ADMIN_PASSWORD?.trim() ||
  `Adm!${randomBytes(6).toString("base64url")}`;

const db = createPrismaClient();

async function main() {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`FAIL: account already exists: ${email} (role=${existing.role})`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      role: "ADMIN",
      isActive: true,
      password: hash,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  console.log("CREATED", JSON.stringify(user));

  const host = process.env.SMTP_HOST?.trim();
  let mailStatus = "skipped (no SMTP_HOST)";
  if (host) {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    const from =
      process.env.SMTP_FROM?.trim() ||
      "ATU Hostel Booking <noreply@atu.edu.gh>";
    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const info = await transporter.sendMail({
      from,
      to: email,
      subject: "Your ATU Hostel Booking admin account",
      text: [
        `Hello ${name},`,
        "",
        "An administrator account has been created for you on ATU Hostel Booking.",
        "",
        `Sign-in URL: ${site}/login`,
        `Email:       ${email}`,
        `Password:    ${password}`,
        `Role:        ADMIN`,
        "",
        "Please sign in and change this password under Change password.",
        "",
        "— ATU Hostel Booking",
      ].join("\n"),
      html: `
        <p>Hello <strong>${name}</strong>,</p>
        <p>An administrator account has been created for you on <strong>ATU Hostel Booking</strong>.</p>
        <ul>
          <li><strong>Sign-in URL:</strong> <a href="${site}/login">${site}/login</a></li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> <code>${password}</code></li>
          <li><strong>Role:</strong> ADMIN</li>
        </ul>
        <p>Please sign in and change this password after first login.</p>
        <p>— ATU Hostel Booking</p>
      `,
    });
    mailStatus = `sent messageId=${info.messageId}`;
  }

  console.log("---CREDENTIALS---");
  console.log(`email=${email}`);
  console.log(`password=${password}`);
  console.log(`login=${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/login`);
  console.log(`mail=${mailStatus}`);
}

main()
  .catch((e) => {
    console.error("FAIL", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect().catch(() => {});
  });
