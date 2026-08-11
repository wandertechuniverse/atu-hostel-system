import { expect, test } from "@playwright/test";
import { login, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

test("manager sees only their own hostel's bookings and hostels", async ({
  page,
}) => {
  await login(page, "manager@hostel.test");
  await expect(page).toHaveURL(/\/admin$/);

  // Bookings: the campus manager owns ATU Main Campus - Kwame's pending request
  // is theirs; the two Al-Hassan bookings must not appear.
  await page.goto("/admin/bookings");
  await expect(page.getByRole("row", { name: /Kwame Mensah/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Ama Serwaa/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Yaw Boateng/ })).toHaveCount(0);

  // Hostels: only their own hostel, no Add button, no publish control.
  await page.goto("/admin/hostels");
  await expect(
    page.getByRole("row", { name: /ATU Main Campus Hostel/ }),
  ).toBeVisible();
  await expect(page.getByRole("row", { name: /Al-Hassan Hostel/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add hostel", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Admin only")).toBeVisible();
});

test("manager cannot open admin-only screens", async ({ page }) => {
  await login(page, "manager@hostel.test");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/activity");
  await expect(page).toHaveURL(/\/admin$/);
});
