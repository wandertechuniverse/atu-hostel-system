/**
 * Canonical demo accounts shared by seed, ensure-demo-data, and the login form.
 * Password is intentionally demo-only — never reuse in production.
 */
export const DEMO_PASSWORD = "Demo@ATU2026";

export const DEMO_ACCOUNTS = [
  { email: "student@atu.edu.gh", hint: "Student" },
  { email: "manager@hostel.test", hint: "Manager" },
  { email: "admin@atu.edu.gh", hint: "Admin" },
] as const;
