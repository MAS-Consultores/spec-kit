import { expect, test } from "@playwright/test";

/**
 * Copy to apps/web/e2e/i18n-login.spec.ts when the feature has a login screen.
 * The skeleton has no login, so this file is the task template. Do not call
 * screenshot, video, or trace.
 *
 * Selectors below are the contract. Point them at the feature's login and nav.
 */
const RESPOND_MS = 500;

test.use({ screenshot: "off", video: "off", trace: "off" });

test("switching language on login stays responsive and survives reload", async ({ page }) => {
  await page.goto("/login");
  const heading = page.getByRole("heading");
  const spanish = (await heading.textContent()) ?? "";
  await page.getByRole("button", { name: "English" }).click();
  await expect(heading).not.toHaveText(spanish);

  const started = Date.now();
  await page.getByRole("button", { name: "Sign in" }).click({ timeout: RESPOND_MS });
  expect(Date.now() - started).toBeLessThan(RESPOND_MS);

  await page.getByLabel("Email").fill("person@company.test");
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "Sign in" }).click();
  const nav = page.getByRole("navigation");
  const beforeReload = (await nav.textContent()) ?? "";
  await page.reload();
  await expect(heading).toBeHidden();
  await expect(nav).toHaveText(beforeReload);

  const menu = (await nav.textContent()) ?? "";
  await page.getByRole("button", { name: "Português" }).click();
  await expect(nav).not.toHaveText(menu);
});
