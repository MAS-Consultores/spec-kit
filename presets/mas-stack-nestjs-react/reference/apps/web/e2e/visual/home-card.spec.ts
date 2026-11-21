import { expect, test } from "@playwright/test";

test("home card matches the opted-in baseline", async ({ page }) => {
  await page.setContent(
    '<main style="font-family: sans-serif"><h1>Inicio</h1><time datetime="2026-01-15">15 ene 2026</time></main>',
  );
  await expect(page.getByRole("heading", { name: "Inicio" })).toHaveScreenshot("home-card.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.01,
  });
});
