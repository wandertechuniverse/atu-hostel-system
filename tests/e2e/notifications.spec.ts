import { expect, test } from "@playwright/test";
import { login, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

test("admin can open notifications and send a console test email", async ({
  page,
}) => {
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/notifications");

  await expect(
    page.getByRole("heading", { name: "Notifications" }),
  ).toBeVisible();
  await expect(page.getByText("Email integration")).toBeVisible();
  await expect(page.getByText("Console (log only)")).toBeVisible();
  await expect(page.getByText("Booking request received")).toBeVisible();

  await page.getByRole("button", { name: "Verify connection" }).click();
  await expect(page.getByText(/console mailer is active/i)).toBeVisible();

  await page.getByLabel("Send test email to").fill("admin@atu.edu.gh");
  await page.getByRole("button", { name: "Send test" }).click();
  await expect(page.getByText(/server log/i)).toBeVisible();
  await expect(page.getByText("email.test").first()).toBeVisible();
});

test("admin header bell opens the inbox", async ({ page }) => {
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin");

  await page.getByRole("button", { name: /notifications/i }).click();
  await expect(
    page.getByRole("link", { name: /email integration and delivery log/i }),
  ).toBeVisible();
});
