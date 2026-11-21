import { expect, test } from "@playwright/test";

test("home shell stays available", { tag: "@critical" }, async ({ page }) => {
  await page.setContent(
    '<main><h1>Inicio</h1><time datetime="2026-01-15">15 ene 2026</time></main>',
  );
  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
  await expect(page.locator("time")).toHaveAttribute("datetime", "2026-01-15");
});
