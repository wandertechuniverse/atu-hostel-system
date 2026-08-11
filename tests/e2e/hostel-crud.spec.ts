import { expect, test } from "@playwright/test";
import { login, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

test("admin creates a hostel, adds a room, publishes it, and students see it", async ({
  page,
}) => {
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/hostels");

  // --- Create (Prompt 3 dialog). New hostels start unpublished. ---
  await page.getByRole("button", { name: "Add hostel", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add a new hostel" });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Hostel name").fill("E2E Test Hostel");
  await dialog
    .getByLabel("Location / address around Adabraka")
    .fill("Test Lane, Adabraka");
  await dialog.getByLabel("Contact number (optional)").fill("0209999999");
  // Map coordinates - the hostel should show up on the student map.
  await dialog.getByLabel("Latitude (optional)").fill("5.5629");
  await dialog.getByLabel("Longitude (optional)").fill("-0.2219");
  await dialog.getByLabel("Wi-Fi").check();
  await dialog.getByLabel("Security").check();
  await dialog
    .getByLabel("Description (optional)")
    .fill("Created by the Playwright e2e suite.");
  await dialog
    .getByRole("button", { name: "Add hostel", exact: true })
    .click();

  const row = page.getByRole("row", { name: /E2E Test Hostel/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("Unpublished")).toBeVisible();

  // --- Rooms: add a room to the new hostel. ---
  await row.getByRole("button", { name: "Rooms", exact: true }).click();
  const roomsDialog = page.getByRole("dialog", { name: /Rooms - E2E Test Hostel/ });
  await expect(roomsDialog).toBeVisible();

  await roomsDialog.getByLabel("Room number").fill("501");
  await roomsDialog.getByLabel("Capacity (beds)").fill("2");
  await roomsDialog.getByLabel("Price / year (GH₵)").fill("2000");
  await roomsDialog.getByRole("button", { name: "Add room" }).click();

  await expect(roomsDialog.getByText("501")).toBeVisible();
  await expect(roomsDialog.getByText("GH₵ 2,000")).toBeVisible();
  await roomsDialog.getByRole("button", { name: "Close" }).click();

  // --- Publish: the approval gate before a hostel appears in search. ---
  await row.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(row.getByText("Published")).toBeVisible();

  // --- Photo upload: replace the hostel image with an uploaded file. ---
  await row.getByRole("button", { name: "Photo", exact: true }).click();
  const photoDialog = page.getByRole("dialog", { name: "Hostel photo" });
  await expect(photoDialog).toBeVisible();
  await photoDialog.locator('input[type="file"]').setInputFiles({
    name: "hostel-upload.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(photoDialog.getByAltText("New photo preview")).toBeVisible();
  await photoDialog.getByRole("button", { name: "Upload photo" }).click();
  await expect(photoDialog).toBeHidden();

  // The API reflects the new image and the uploaded file is actually served.
  const apiHostels = (await (await page.request.get("/api/hostels")).json()).data;
  const uploaded = apiHostels.find(
    (h: { name: string }) => h.name === "E2E Test Hostel",
  );
  expect(uploaded.featuredImage).toMatch(/^\/hostels\/[a-z0-9-]+\.png$/);
  expect((await page.request.get(uploaded.featuredImage)).status()).toBe(200);

  // Clean the uploaded file so the suite leaves no artifacts in public/.
  const { unlink } = await import("node:fs/promises");
  const { join } = await import("node:path");
  await unlink(
    join(process.cwd(), "public", "hostels", uploaded.featuredImage.split("/").pop()),
  ).catch(() => {});

  // --- Remove photo: the uploaded image can be dropped again (CRUD). ---
  await row.getByRole("button", { name: "Photo", exact: true }).click();
  const photoDialog2 = page.getByRole("dialog", { name: "Hostel photo" });
  await expect(photoDialog2).toBeVisible();
  await expect(photoDialog2.getByRole("button", { name: "Remove photo" })).toBeVisible();
  await photoDialog2.getByRole("button", { name: "Remove photo" }).click();
  await expect(photoDialog2).toBeHidden();
  const apiAfterRemove = (await (await page.request.get("/api/hostels")).json()).data;
  const afterRemove = apiAfterRemove.find(
    (h: { name: string }) => h.name === "E2E Test Hostel",
  );
  expect(afterRemove.featuredImage).toBeNull();

  // --- Manager: an admin assigns a student to run the hostel, then clears. ---
  await row.getByRole("button", { name: "Manager", exact: true }).click();
  const managerDialog = page.getByRole("dialog", { name: "Hostel manager" });
  await expect(managerDialog).toBeVisible();
  await managerDialog
    .getByLabel("Manager")
    .selectOption({ label: "Kwame Mensah (student@atu.edu.gh)" });
  await managerDialog.getByRole("button", { name: "Save manager" }).click();
  await expect(managerDialog).toBeHidden();
  await expect(row.getByText("Kwame Mensah")).toBeVisible();

  // Clear the manager again (the cell returns to "-").
  await row.getByRole("button", { name: "Manager", exact: true }).click();
  const managerDialog2 = page.getByRole("dialog", { name: "Hostel manager" });
  await expect(managerDialog2).toBeVisible();
  await managerDialog2.getByLabel("Manager").selectOption("");
  await managerDialog2.getByRole("button", { name: "Save manager" }).click();
  await expect(managerDialog2).toBeHidden();
  await expect(row.getByText("Kwame Mensah")).toHaveCount(0);

  // --- Student side: the published hostel is now visible, with coordinates
  // --- that place it on the student map.
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByText("E2E Test Hostel")).toBeVisible();
  const apiHostels2 = (await (await page.request.get("/api/hostels")).json()).data;
  const published = apiHostels2.find(
    (h: { name: string }) => h.name === "E2E Test Hostel",
  );
  expect(published.latitude).toBe(5.5629);
  expect(published.longitude).toBe(-0.2219);
  await expect(
    page.getByText("E2E Test Hostel").first(),
  ).toBeVisible();
});

test("a hostel with bookings cannot be deleted", async ({ page }) => {
  reseed();
  await login(page, "admin@atu.edu.gh");
  await page.goto("/admin/hostels");

  // Both seeded hostels have bookings - deletion must be blocked with a message.
  const row = page.getByRole("row", { name: /ATU Main Campus Hostel/ });
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByText("This hostel has bookings and cannot be deleted."),
  ).toBeVisible();
  await expect(row).toBeVisible();
});
