import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const knowledge = JSON.parse(
  readFileSync(
    new URL("../../src/data/knowledge.json", import.meta.url),
    "utf8",
  ),
);

test("task navigation, steam hierarchy, discrete portions and highlighted controls", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Programlar", exact: true }),
  ).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Programlar", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveScreenshot("home.png", {
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("link", { name: "Buharda pişir" })
    .click();
  await expect(page.getByRole("heading", { name: "1 · Sağlıklı" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2 · Asya özellikleri" })).toBeVisible();
  await page
    .getByRole("heading", { name: "Brokoli parçacıkları", exact: true })
    .click();
  await expect(page.locator(".preparation-heading")).toContainText("150 / 300 g");
  await page.getByRole("button", { name: "Tüm adımlar", exact: true }).click();
  await expect(page.locator(".steps li")).toHaveCount(7);
  const next = page.getByRole("button", { name: "Sonraki", exact: true });
  await next.click();
  await next.click();
  if (testInfo.project.name === "mobile")
    await page.locator(".mobile-step-panel .disclosure-trigger").click();
  const panel = page.locator(
    testInfo.project.name === "mobile"
      ? ".mobile-step-panel .control-panel"
      : ".instruction-panel .control-panel",
  );
  await expect(panel.locator(".select-key")).toHaveClass(/highlighted/);
  await expect(panel.getByRole("button")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot("steam-guide.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("defrost weight, turn, resume, bookmarks and notes persist", async ({
  page,
}) => {
  await page.goto("/programs/defrost-5");
  await expect(page.locator(".preparation-heading")).toContainText("200–1.500 g");
  await page.getByRole("button", { name: "Tüm adımlar", exact: true }).click();
  await expect(page.locator(".steps li")).toHaveCount(8);
  await expect(page.locator(".steps li").nth(6)).toContainText("Ekmeği ters çevirin.");
  await expect(page.locator(".steps li").last()).toContainText("START/+30s");
  await expect(page.locator(".standing")).toContainText("10–30");
  await page
    .getByRole("button", { name: "Favoriler", exact: true })
    .click();
  await page.getByLabel("Kişisel notların").fill("Mutfak notum");
  await page.reload();
  await expect(page.getByLabel("Kişisel notların")).toHaveValue("Mutfak notum");
  await page.goto("/favorites");
  await expect(
    page.getByRole("heading", { name: "Ekmek", exact: true }),
  ).toBeVisible();
  await page.goto("/account/language");
  await page.getByRole("radio", { name: "English", exact: true }).press("Space");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/account/favorites");
  await expect(
    page.getByRole("heading", { name: "Bread", exact: true }),
  ).toBeVisible();
});

test("multilingual typo-tolerant search and fixed Auto Cook sequence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ara", exact: true }).click();
  await page.getByRole("searchbox").fill("ekmke");
  await expect(page.getByRole("link", { name: /Ekmek/ })).toBeVisible();
  await page.getByRole("searchbox").fill("Bread");
  await expect(page.getByRole("link", { name: /Ekmek/ })).toBeVisible();
  await page.goto("/programs/auto-2");
  await expect(page.locator(".preparation-heading")).toContainText("400–450 g");
  await expect(page.getByLabel("Cihazda gösterilen ağırlık (g)")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Tüm adımlar", exact: true }).click();
  await expect(page.locator(".steps li")).toHaveCount(4);
});

test("offline reload supports search, presets, sources and print files", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Ara", exact: true }).click();
  await page.getByRole("searchbox").fill("ekmek");
  await page.getByRole("link", { name: /Ekmek/ }).click();
  await expect(
    page.getByRole("heading", { name: "Ekmek", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kaynaklar", exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: /Samsung MS23K3555ES\/ND · Türkçe kılavuz 09/,
    }),
  ).toBeVisible();
  const status = await page.evaluate(async () => {
    const response = await fetch("/print/preset-index.pdf");
    return {
      status: response.status,
      type: response.headers.get("content-type"),
      bytes: (await response.arrayBuffer()).byteLength,
    };
  });
  expect(status.status).toBe(200);
  expect(status.type).toContain("pdf");
  expect(status.bytes).toBeGreaterThan(10000);
  await context.setOffline(false);
});

test("primary screens pass automated WCAG AA checks and narrow reflow", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/programs",
    "/programs/defrost-5",
    "/controls/select-clock",
    "/guide",
    "/favorites",
  ]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      `${path}: ${JSON.stringify(results.violations)}`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/programs/steam-2-1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Keep Warm uses the documented maximum duration", async ({ page }) => {
  await page.goto("/programs/keep-warm");
  const duration = page.getByLabel("Cihazda seçilen süre (mm:ss)");
  await duration.fill("99:30");
  await expect(page.getByRole("alert")).toBeVisible();
  await duration.fill("00:30");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Tüm adımlar", exact: true }).click();
  await expect(page.locator(".steps")).toContainText("00:30");
});

test("text scaling preserves narrow reflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ["/", "/programs", "/controls", "/programs/steam-2-1"]) {
    await page.goto(path);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("all canonical deep links render and source actions stay usable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Shared route coverage");
  test.setTimeout(120000);
  for (const record of knowledge.records) {
    await page.goto(`/programs/${record.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      record.title.tr,
    );
  }
  for (const control of knowledge.controls) {
    await page.goto(`/controls/${control.id}`);
    const presetMode = { "auto-cook": "auto-1", "quick-defrost": "defrost-1" }[control.id as string];
    const selectedPreset = knowledge.records.find((record: { id: string }) => record.id === presetMode);
    await expect(page.locator(".control-detail h2")).toHaveText(
      selectedPreset?.title.tr ?? control.name.tr,
    );
  }
});
