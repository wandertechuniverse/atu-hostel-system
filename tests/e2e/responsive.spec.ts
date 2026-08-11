import { expect, test, type Page } from "@playwright/test";
import { login, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

/** Assert the page does not scroll horizontally. */
async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `page scrollWidth ${scroll} > viewport ${client}`).toBeLessThanOrEqual(client);
}

for (const { name, width, height } of WIDTHS) {
  test(`no horizontal overflow at ${name} width (${width}px): public pages`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    for (const path of ["/", "/login", "/register"]) {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    }
  });

  test(`no horizontal overflow at ${name} width (${width}px): admin pages`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await login(page, "admin@atu.edu.gh");
    for (const path of [
      "/admin",
      "/admin/hostels",
      "/admin/bookings",
      "/admin/payments",
      "/admin/reports",
      "/admin/users",
      "/admin/activity",
    ]) {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    }
  });

  test(`no horizontal overflow at ${name} width (${width}px): student pages`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await login(page, "student@atu.edu.gh");
    await page.goto("/my-bookings");
    await expectNoHorizontalOverflow(page);
  });
}
