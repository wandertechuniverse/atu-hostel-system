import "server-only";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * On serverless (Netlify) each cold instance may start with an empty /tmp
 * SQLite file when the build-time demo.db is not in the function bundle.
 * If there are zero users, plant the canonical demo accounts so login works.
 *
 * Safe: never wipes existing data. Only runs when user count is 0.
 */
let ensurePromise: Promise<void> | null = null;

export async function ensureDemoData(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = ensureDemoDataOnce().catch((error) => {
      // Allow a later request to retry after a transient failure.
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}

async function ensureDemoDataOnce(): Promise<void> {
  let count = 0;
  try {
    count = await db.user.count();
  } catch (error) {
    // Schema may be missing on a brand-new empty file — push is not available
    // at runtime; surface a clear log and rethrow so the caller still fails
    // loudly rather than with "invalid password".
    console.error("[ensure-demo-data] cannot read users table:", error);
    throw error;
  }

  if (count > 0) return;

  console.warn(
    "[ensure-demo-data] empty database — seeding demo accounts (password: password)",
  );

  const password = await bcrypt.hash("password", 12);

  // Minimal account set so staff/student login works even without the full
  // hostel seed. Full seed is preferred via prepare-demo-db at build time.
  await db.user.createMany({
    data: [
      {
        name: "ATU Administrator",
        email: "admin@atu.edu.gh",
        phone: "0200000001",
        role: "ADMIN",
        password,
      },
      {
        name: "Campus Hostel Manager",
        email: "manager@hostel.test",
        phone: "0200000002",
        role: "MANAGER",
        password,
      },
      {
        name: "Al-Hassan Manager",
        email: "manager2@hostel.test",
        phone: "0200000003",
        role: "MANAGER",
        password,
      },
      {
        name: "Kwame Mensah",
        email: "student@atu.edu.gh",
        phone: "0200000004",
        studentIdNumber: "01240233C",
        department: "Information Technology",
        role: "STUDENT",
        password,
      },
      {
        name: "Ama Serwaa",
        email: "ama@atu.edu.gh",
        phone: "0200000005",
        studentIdNumber: "01240341B",
        department: "Accountancy",
        role: "STUDENT",
        password,
      },
      {
        name: "Yaw Boateng",
        email: "yaw@atu.edu.gh",
        phone: "0200000006",
        studentIdNumber: "01240118A",
        department: "Building Technology",
        role: "STUDENT",
        password,
      },
    ],
  });

  await db.activityLog.create({
    data: {
      action: "system.demo_seeded",
      subjectType: "Database",
    },
  });
}
