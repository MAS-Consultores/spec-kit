import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home is in es-CL and has no axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Notas" })).toBeVisible();
  await expect(page.getByText("12.345.678-5")).toBeVisible();
  const button = page.getByRole("button", { name: "Crear" });
  const background = await button.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(background).not.toBe("rgba(0, 0, 0, 0)");
  const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());
  expect(primary.length).toBeGreaterThan(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
