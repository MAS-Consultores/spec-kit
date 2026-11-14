import { expect, test } from "@playwright/test";

test("health is served through the web origin", async ({ page }) => {
  const response = await page.request.get("/api/v1/health");
  expect(response.ok()).toBeTruthy();
  expect(response.url()).toContain("/api/v1/health");
  const body: unknown = await response.json();
  expect(body).toEqual({ ok: true });
});
