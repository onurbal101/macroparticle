import { describe, expect, it } from "vitest";
import { metadataFor, pageFor, publicPages, siteUrl, socialImagePath, structuredData } from "../src/site";

describe("public page details", () => {
  it("distinguishes equal food names by programme code and function", () => {
    const first = pageFor("/programs/auto-1");
    const second = pageFor("/programs/auto-2");
    expect(first.heading).toBe(second.heading);
    expect(first.title).toContain("1 · Otomatik pişirme");
    expect(second.title).toContain("2 · Otomatik pişirme");
    expect(first.description).toContain("300–350 g");
    expect(second.description).toContain("400–450 g");
    expect(socialImagePath(first)).not.toBe(socialImagePath(second));
  });

  it("does not reuse a category preview for its programme", () => {
    expect(socialImagePath(pageFor("/functions/keep-warm"))).not.toBe(socialImagePath(pageFor("/programs/keep-warm")));
    const pages = publicPages();
    expect(new Set(pages.map(page => page.canonicalPath)).size).toBe(pages.length);
    expect(new Set(pages.map(socialImagePath)).size).toBe(pages.length);
  });

  it("uses canonical public URLs without query strings or duplicate home entries", () => {
    expect(pageFor("/programs/?utm_source=telegram").canonicalPath).toBe("/");
    expect(pageFor("/controls/auto-cook").canonicalPath).toBe("/simulation/auto-cook");
    expect(pageFor("/guide/controls/child-lock").canonicalPath).toBe("/simulation/child-lock");
    for (const page of publicPages()) expect(new URL(siteUrl + page.canonicalPath).protocol).toBe("https:");
  });

  it("keeps settings, search and unknown pages out of indexes", () => {
    for (const path of ["/account", "/account/favorites", "/account/language", "/search?q=private", "/programs/missing", "/functions/missing", "/simulation/missing"]) {
      const page = pageFor(path);
      expect(page.indexable, path).toBe(false);
      expect(metadataFor(page).find(([, key]) => key === "robots")?.[2]).toBe("noindex, follow");
    }
  });

  it("keeps one metadata value for each property and translates navigation titles", () => {
    for (const page of publicPages()) {
      const entries = metadataFor(page);
      expect(new Set(entries.map(([attribute, key]) => `${attribute}:${key}`)).size).toBe(entries.length);
      expect(entries.find(([, key]) => key === "og:url")?.[2]).toBe(siteUrl + page.canonicalPath);
      expect(entries.find(([, key]) => key === "og:image:alt")?.[2]).toBeTruthy();
    }
    expect(pageFor("/programs/defrost-2", "en").title).toContain("Poultry · 2 · Quick defrost");
  });

  it("includes real source citations and ordered category entries", () => {
    const record = structuredData(pageFor("/programs/defrost-2"));
    expect(record["@graph"][1].citation).toEqual(expect.arrayContaining([expect.objectContaining({ "@type": "CreativeWork", url: expect.stringContaining("#page=") })]));
    const category = structuredData(pageFor("/functions/quick-defrost"));
    expect(category["@graph"][1].mainEntity).toMatchObject({ "@type": "ItemList", numberOfItems: 5 });
  });
});
