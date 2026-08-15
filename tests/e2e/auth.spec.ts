import { expect, test } from "@playwright/test";
import { login, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

test("rejects a wrong password with a clear error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@atu.edu.gh");
  await page.getByLabel("Password", { exact: true }).fill("definitely-wrong");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});

test("the show-password toggle reveals the typed password", async ({ page }) => {
  await page.goto("/login");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("secret123");
  await expect(password).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("secret123");

  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("redirects unauthenticated visitors away from /admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("admin can log in, reach the dashboard, and log out", async ({ page }) => {
  await login(page, "admin@atu.edu.gh");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Overview", level: 1 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login|\/$/);
});

test("change password: current password is verified, old stops working, new works (FR-9)", async ({
  page,
  request,
}) => {
  // Fresh account via the API so no seeded account's password is mutated.
  const email = `pw-${Date.now()}@student.test`;
  const created = await request.post("/api/auth/register", {
    data: {
      name: "Password Test",
      email,
      phone: "0551112222",
      password: "original-pass",
    },
  });
  expect(created.status()).toBe(201);

  await login(page, email, "original-pass");
  await expect(page).toHaveURL(/\/$/);

  // Styled as a button; aria-label is "Change password" (visible text is short).
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/change-password/);

  // Wrong current password is rejected server-side.
  await page.getByLabel("Current password", { exact: true }).fill("not-the-current");
  await page.getByLabel("New password", { exact: true }).fill("brand-new-pass");
  await page.getByLabel("Confirm new password", { exact: true }).fill("brand-new-pass");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Current password is incorrect")).toBeVisible();

  // Correct current password succeeds.
  await page.getByLabel("Current password", { exact: true }).fill("original-pass");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Password updated.")).toBeVisible();

  // The old password no longer works; the new one does.
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login|\/$/);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("original-pass");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();

  await login(page, email, "brand-new-pass");
  await expect(page).toHaveURL(/\/$/);
});

test("forgot password: dev reset link, one-time reset, new password works", async ({
  page,
  request,
}) => {
  // Fresh account via the API so no seeded password is mutated.
  const email = `fpu-${Date.now()}@student.test`;
  const created = await request.post("/api/auth/register", {
    data: {
      name: "Forgot UI Test",
      email,
      phone: "0556667777",
      password: "original-pass",
    },
  });
  expect(created.status()).toBe(201);

  // Login page links to the forgot-password flow.
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password/);

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();

  // Generic success message + the dev-mode reset link.
  await expect(
    page.getByText(/If an account exists for that email/),
  ).toBeVisible();
  const resetLink = page.getByRole("link", { name: /\/reset-password\?token=/ });
  await expect(resetLink).toBeVisible();

  // Open the link and set a new password.
  await resetLink.click();
  await expect(page).toHaveURL(/\/reset-password\?token=/);
  await page.getByLabel("New password", { exact: true }).fill("brand-new-pass");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("brand-new-pass");
  await page.getByRole("button", { name: "Reset password" }).click();

  // Back at login with the success banner; old password fails, new works.
  await expect(page).toHaveURL(/\/login\?reset=1/);
  await expect(page.getByText("Password reset.")).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("original-pass");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();

  // useActionState resets the form after the failed action, so refill both.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brand-new-pass");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});
