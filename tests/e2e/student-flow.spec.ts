import { expect, test } from "@playwright/test";
import { reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

test("student registers, browses hostels, books a room, and sees the request", async ({
  page,
}) => {
  const email = `flow-${Date.now()}@student.test`;

  // --- Register (FR-1) ---
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Flow Student");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Student ID (optional)").fill("01240999Z");
  await page.getByLabel("Phone").fill("0551111111");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Find your room at ATU" }),
  ).toBeVisible();

  // --- Browse: open the campus hostel detail (FR-5) ---
  const hostels = (await (await page.request.get("/api/hostels")).json()).data;
  const campus = hostels.find((h: { name: string }) => h.name === "ATU Main Campus Hostel");
  await page.goto(`/hostels/${campus.id}`);
  await expect(
    page.getByRole("heading", { name: "ATU Main Campus Hostel", level: 1 }),
  ).toBeVisible();

  // --- Book room 101 (FR-6): capacity 2, currently empty in the canonical seed ---
  const row = page.getByRole("row").filter({ hasText: "101" });
  await row.getByRole("button", { name: "Request booking" }).click();
  const dialog = page.getByRole("dialog", { name: "Request this room" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/I accept the booking rules/i).check();
  await dialog.getByRole("button", { name: "Submit request" }).click();

  // --- My bookings shows the PENDING request (FR-6) ---
  await expect(page).toHaveURL(/\/my-bookings/);
  await expect(page.getByText("ATU Main Campus Hostel")).toBeVisible();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
});
