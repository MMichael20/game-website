import { test, expect } from "@playwright/test";

test("boots, starts, renders a canvas with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForTimeout(1500); // let physics init + a few frames run

  // Engine renders one WebGL canvas; the minimap overlay adds a second 2D canvas.
  const canvas = page.locator("canvas");
  expect(await canvas.count()).toBeGreaterThanOrEqual(1);

  expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
});
