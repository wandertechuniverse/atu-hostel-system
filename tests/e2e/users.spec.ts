import { expect, test } from "@playwright/test";
import { login, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

test("admin can deactivate and reactivate a user", async ({ page }) => {
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/users");

  const amaRow = page.getByRole("row", { name: /Ama Serwaa/ });
  await expect(amaRow.getByText("Active")).toBeVisible();

  await amaRow.getByRole("button", { name: "Deactivate", exact: true }).click();
  await expect(amaRow.getByText("Inactive")).toBeVisible();

  await amaRow.getByRole("button", { name: "Activate", exact: true }).click();
  await expect(amaRow.getByText("Active")).toBeVisible();
});

test("admin reassigning a hostel promotes a student and demotes on unassign", async ({
  page,
}) => {
  reseed();
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/users");

  const managerRow = page.getByRole("row", { name: /Al-Hassan Manager/ });
  const kwameRow = page.getByRole("row", { name: /Kwame Mensah/ });

  // Unassign Al-Hassan from its current manager → demoted to STUDENT.
  await managerRow.locator("select").selectOption({ label: "- No hostel -" });
  await managerRow.getByRole("button", { name: "Save", exact: true }).click();
  await expect(managerRow.getByText("STUDENT", { exact: true })).toBeVisible();
  await expect(managerRow.locator("select")).toHaveValue("");

  // Now the option is free - assign it to a student → promoted to MANAGER.
  await kwameRow.locator("select").selectOption({ label: "Al-Hassan Hostel" });
  await kwameRow.getByRole("button", { name: "Save", exact: true }).click();
  await expect(kwameRow.getByText("MANAGER", { exact: true })).toBeVisible();
  // Hostel column (4th cell) shows the assigned hostel; the select reflects it.
  await expect(kwameRow.locator("td").nth(3)).toHaveText("Al-Hassan Hostel");
  await expect(kwameRow.locator("select")).toHaveValue(/^[0-9a-f-]{36}$/);
});

test("admin creates a manager from the Add user dialog; they can log in", async ({
  page,
}) => {
  reseed();
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/users");

  await page.getByRole("button", { name: "Add user", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add user" });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Full name").fill("Efua Ama");
  await dialog.getByLabel("Email").fill("efua.ama@hostel.test");
  await dialog.getByLabel("Phone").fill("0551112222");

  // Role defaults to Student - switch to Manager in the Base UI select.
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Manager" }).click();

  await dialog.getByLabel("Password", { exact: true }).fill("secret123");
  await dialog.getByRole("button", { name: "Create account" }).click();

  await expect(dialog).toBeHidden();
  const row = page.getByRole("row", { name: /Efua Ama/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("MANAGER", { exact: true })).toBeVisible();
  await expect(row.getByText("Active")).toBeVisible();

  // The new manager can log in with the password the admin set.
  await page.context().clearCookies();
  await login(page, "efua.ama@hostel.test", "secret123");
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
});

test("admin can edit a profile and reset a password; the new password works", async ({
  page,
}) => {
  reseed();
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/users");

  const kwameRow = page.getByRole("row", { name: /Kwame Mensah/ });
  await kwameRow.getByRole("button", { name: "Edit", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Full name")).toHaveValue("Kwame Mensah");

  // Profile edit + password reset in one save.
  await dialog.getByLabel("Full name").fill("Kwame Mensah II");
  await dialog.getByLabel("Reset password", { exact: true }).fill("newsecret1");
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("row", { name: /Kwame Mensah II/ }),
  ).toBeVisible();

  // The reset password works - log out and back in as the student. Wait for
  // the logout action's redirect to /login so its cookie deletion has landed
  // before navigating; otherwise the /login GET can race the action and 307
  // to /admin on the stale session.
  await page.goto("/");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.waitForURL(/\/login/);
  await login(page, "student@atu.edu.gh", "newsecret1");
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
});

test("admin can hard-delete a booking-less user; bookings guard the delete", async ({
  page,
}) => {
  reseed();
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/users");

  // A user with booking history cannot be deleted - the button is disabled
  // with an explanatory title.
  const kwameRow = page.getByRole("row", { name: /Kwame Mensah/ });
  const kwameDelete = kwameRow.getByRole("button", { name: "Delete" });
  await expect(kwameDelete).toBeDisabled();
  await expect(kwameDelete).toHaveAttribute(
    "title",
    /booking/,
  );

  // The admin's own row offers no delete button at all.
  const adminRow = page.getByRole("row", { name: /admin@atu.edu.gh/ });
  await expect(adminRow.getByRole("button", { name: "Delete" })).toHaveCount(0);

  // Create a booking-less account, then delete it via the confirm dialog.
  await page.getByRole("button", { name: "Add user", exact: true }).click();
  const createDialog = page.getByRole("dialog", { name: "Add user" });
  await createDialog.getByLabel("Full name").fill("Delete Me");
  await createDialog.getByLabel("Email").fill("delete.me@hostel.test");
  await createDialog.getByLabel("Phone").fill("0559998888");
  await createDialog.getByLabel("Password", { exact: true }).fill("secret123");
  await createDialog.getByRole("button", { name: "Create account" }).click();
  await expect(createDialog).toBeHidden();

  const row = page.getByRole("row", { name: /Delete Me/ });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Delete" }).click();

  const confirm = page.getByRole("dialog", { name: /Delete Delete Me/ });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Delete account" }).click();

  // The row is gone after revalidation.
  await expect(row).toHaveCount(0);
});
