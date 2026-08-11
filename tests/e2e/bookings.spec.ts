import { expect, test } from "@playwright/test";
import { login, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

test("admin can reject a booking request", async ({ page }) => {
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/bookings");

  const kwameRow = page.getByRole("row", { name: /Kwame Mensah/ });
  await expect(kwameRow.getByText("Pending")).toBeVisible();

  await kwameRow.getByRole("button", { name: "Reject", exact: true }).click();
  // The reject action sets status CANCELLED (badge label: "Cancelled").
  await expect(kwameRow.getByText("Cancelled")).toBeVisible();
});

test("admin approves the pending booking and verifies its payment", async ({
  page,
}) => {
  reseed(); // restore the canonical single pending request
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/bookings");

  const kwameRow = page.getByRole("row", { name: /Kwame Mensah/ });
  await expect(kwameRow.getByText("Pending")).toBeVisible();

  await kwameRow.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(kwameRow.getByText("Confirmed")).toBeVisible();

  await kwameRow.getByRole("button", { name: "Verify", exact: true }).click();
  // SUCCESS payment status renders as the "Verified" badge.
  await expect(kwameRow.getByText("Verified")).toBeVisible();
});
