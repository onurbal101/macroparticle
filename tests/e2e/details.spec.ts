import { expect, test } from "@playwright/test";

test("shared links expose the correct metadata before JavaScript", async ({ request }) => {
  for (const [path, title] of [["/", "Mikrodalga Rehberi"], ["/functions/quick-defrost", "Hızlı buz çözme"], ["/programs/defrost-2", "Kümes hayvanları"], ["/simulation/auto-cook", "Otomatik pişirme"]]) {
    const response = await request.get(path, { headers: { "User-Agent": "TelegramBot (like TwitterBot)" } });
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain(`<meta property="og:title" content="${title}`);
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain('<link rel="alternate" type="text/markdown"');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  }
});

test("saved settings and personal notes survive hydration and repeated reloads", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("microwave-companion-v1")) localStorage.setItem("microwave-companion-v1", JSON.stringify({
      locale: "en", theme: "dark", favorites: ["defrost-2"], notes: { "defrost-2": "Keep this personal note" },
    }));
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/programs/defrost-2");
  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("textarea")).toHaveValue("Keep this personal note");
    await expect(page.locator(".program-favorite")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#141319");
    await page.reload();
  }
  await expect(page.locator("textarea")).toHaveValue("Keep this personal note");
  expect(errors).toEqual([]);
});

test("search reports results and returns focus to its button", async ({ page }) => {
  await page.goto("/programs");
  const search = page.getByRole("button", { name: "Ara", exact: true });
  await search.click();
  await page.getByRole("searchbox").fill("ekmek");
  await expect(page.locator("#search-sheet [role=status]")).toContainText(/\d+ sonuç/);
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(page).toHaveURL(/\/programs$/);
  await expect(search).toBeFocused();
  await page.getByRole("link", { name: "Buz çöz", exact: true }).click();
  await search.click();
  await page.getByRole("searchbox").fill("ekmek");
  await page.mouse.click(12, 12);
  await expect(page).toHaveURL(/\/functions\/quick-defrost$/);
  await expect(search).toBeFocused();
});

test("only the results list scrolls while search is open", async ({ page }) => {
  await page.goto("/functions/auto-cook");
  await page.evaluate(() => window.scrollTo(0, 500));
  const pageView = page.locator(".page-view");
  const originalTop = await pageView.evaluate(element => element.getBoundingClientRect().top);
  expect(originalTop).toBe(-500);

  await page.getByRole("button", { name: "Ara", exact: true }).click();
  await page.getByRole("searchbox").fill("buhar");
  const results = page.locator(".search-results-viewport");
  await expect.poll(() => results.evaluate(element => element.clientHeight)).toBeGreaterThan(100);
  const touchCanScroll = await page.locator(".search-layer").evaluate(layer => {
    const tryPan = (selector: string) => {
      const move = new Event("touchmove", { bubbles: true, cancelable: true });
      Object.defineProperty(move, "touches", { value: [{ clientY: 100 }] });
      return layer.querySelector(selector)!.dispatchEvent(move);
    };
    return [tryPan(".search-dismiss-area"), tryPan(".search-toolbar"), tryPan(".search-results-viewport")];
  });
  expect(touchCanScroll).toEqual([false, false, true]);
  const box = await results.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 150);
  await expect.poll(() => results.evaluate(element => element.scrollTop)).toBeGreaterThan(0);

  const documentScroll = await page.evaluate(() => {
    window.scrollTo(0, 500);
    const root = document.scrollingElement!;
    return [root.scrollTop, root.scrollHeight - root.clientHeight];
  });
  expect(documentScroll).toEqual([0, 0]);
  await expect.poll(() => pageView.evaluate(element => element.getBoundingClientRect().top)).toBe(originalTop);

  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(page).toHaveURL(/\/functions\/auto-cook$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(500);
});

test("Reduce Motion follows the device and saves explicit choices", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/account");
  await page.getByRole("link", { name: "Hareketi azalt Sistem" }).click();
  const system = page.getByRole("radio", { name: "Sistem", exact: true });
  const searchBlur = page.locator(".search-backdrop");
  await expect(system).toBeChecked();
  await expect(system).toHaveAccessibleDescription("Şu an: Açık");
  await expect(searchBlur).toHaveCSS("transition-property", "none");
  await page.getByRole("radio", { name: "Kapalı", exact: true }).press("Space");
  await expect(page.locator("#system-motion-status")).toHaveCount(0);
  await expect(searchBlur).toHaveCSS("transition-property", "opacity, visibility");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  const on = page.getByRole("radio", { name: "Açık", exact: true });
  await on.press("Space");
  await page.reload();
  await expect(on).toBeChecked();
  await expect(searchBlur).toHaveCSS("transition-property", "none");

  await system.press("Space");
  await expect(system).toHaveAccessibleDescription("Şu an: Kapalı");
  await expect(searchBlur).toHaveCSS("transition-property", "opacity, visibility");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(searchBlur).toHaveCSS("transition-property", "none");
  await expect(system).toHaveAccessibleDescription("Şu an: Açık");
  await expect(system).toBeChecked();
});

test("System appearance shows the current device theme without changing the choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/account/appearance");
  const system = page.getByRole("radio", { name: "Sistem", exact: true });
  await expect(system).toHaveAccessibleDescription("Şu an: Açık");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(system).toHaveAccessibleDescription("Şu an: Koyu");
  await expect(system).toBeChecked();
  await page.getByRole("radio", { name: "Açık", exact: true }).press("Space");
  await expect(page.locator("#system-appearance-status")).toHaveCount(0);
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light");
});

test("the navigation indicator moves only when the selected tab changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "dark" });
  await page.goto("/programs");
  const nav = page.getByRole("navigation");
  const glass = nav.locator(".active-glass");
  await expect(glass).toBeVisible();
  await nav.evaluate(element => {
    element.setAttribute("data-test-mutations", "0");
    const observer = new MutationObserver(records => {
      element.dataset.testMutations = String(Number(element.dataset.testMutations) + records.length);
    });
    observer.observe(element, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class", "aria-current"] });
  });
  const initial = await glass.boundingBox();
  await page.getByRole("link", { name: "Buz çöz", exact: true }).click();
  await page.getByRole("heading", { name: "Ekmek", exact: true }).click();
  await page.getByRole("button", { name: "Geri", exact: true }).click();
  await page.getByRole("button", { name: "Geri", exact: true }).click();
  await expect(page).toHaveURL(/\/programs$/);
  await expect(nav).toHaveAttribute("data-test-mutations", "0");
  expect(await glass.boundingBox()).toEqual(initial);
  await nav.getByRole("link", { name: "Rehber", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Rehber", exact: true })).toHaveAttribute("aria-current", "page");
  await expect.poll(async () => (await glass.boundingBox())?.x ?? 0).toBeGreaterThan(initial!.x + 40);
});

test("the full programme instructions are readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/programs/defrost-2", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toHaveText("Kümes hayvanları");
    await expect(page.locator(".steps li:visible")).toHaveCount(8);
    await expect(page.locator(".steps li").nth(6)).toContainText("Tavuğu ters çevirin.");
  } finally { await context.close(); }
});
