import assert from "node:assert/strict";
import { publicPages, siteUrl, socialImagePath, markdownPath } from "../src/site";
import { escapeXml } from "./brand";

const base = process.argv[2];
assert(base && /^https?:\/\//.test(base), "Supply the HTTP origin to check, for example npm run validate:site -- https://macroparticle.onurbal.com");
const agents = ["WhatsApp/2.24", "TelegramBot (like TwitterBot)", "Mozilla/5.0", "Googlebot"];
const pages = publicPages();
let checked = 0;
for (let offset = 0; offset < pages.length; offset += 5) {
  const results = await Promise.allSettled(pages.slice(offset, offset + 5).map(async (page, index) => {
    const response = await fetch(base + page.path, { headers: { "User-Agent": agents[(offset + index) % agents.length] }, signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, page.path);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    const html = await response.text();
    const head = html.slice(0, html.indexOf("</head>"));
    assert(head.includes(`<title>${escapeXml(page.title)}</title>`), `${page.path}: title`);
    assert.equal((head.match(/<link rel="canonical"/g) ?? []).length, 1, `${page.path}: canonical count`);
    assert(head.includes(`href="${siteUrl + page.canonicalPath}"`), `${page.path}: canonical URL`);
    assert(head.includes(`property="og:url" content="${siteUrl + page.canonicalPath}"`), `${page.path}: preview URL`);
    assert(head.includes(`property="og:image" content="${siteUrl + socialImagePath(page)}"`), `${page.path}: preview image`);
    assert.equal((head.match(/property="og:title"/g) ?? []).length, 1, `${page.path}: preview title count`);
    const data = /<script id="page-data" type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(head);
    assert(data, `${page.path}: structured data`);
    assert.equal(JSON.parse(data[1])["@context"], "https://schema.org");
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${page.path}: readable heading`);
    assert(!html.includes("<!--page-meta:"), `${page.path}: unprocessed template`);
    const image = await fetch(base + socialImagePath(page), { headers: { Range: "bytes=0-31" }, signal: AbortSignal.timeout(15000) });
    assert([200, 206].includes(image.status), `${page.path}: image status ${image.status}`);
    assert.match(image.headers.get("content-type") ?? "", /image\/png/);
    const bytes = Buffer.from(await image.arrayBuffer());
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);
    const markdown = await fetch(base + markdownPath(page), { signal: AbortSignal.timeout(15000) });
    assert.equal(markdown.status, 200, `${page.path}: Markdown response`);
    assert.match(markdown.headers.get("content-type") ?? "", /text\/markdown/);
    assert((await markdown.text()).includes(`# ${page.heading}`), `${page.path}: Markdown heading`);
    checked++;
  }));
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failures.length) throw new AggregateError(failures.map(result => result.reason), "Public page checks failed");
}
for (const path of ["/account", "/account/favorites", "/account/language", "/account/appearance", "/account/reduce-motion", "/search", "/app.html"]) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/, path);
  assert((await response.text()).includes('content="noindex, follow"'), path);
}
for (const path of ["/not-a-real-page", "/programs/not-a-real-programme", "/icons/missing.png", "/content/missing.md"]) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 404, path);
  await response.arrayBuffer();
}
for (const [path, target] of [["/controls", "/simulation"], ["/controls/auto-cook", "/simulation/auto-cook"], ["/guide/controls/child-lock", "/simulation/child-lock"], ["/favorites", "/account/favorites"]]) {
  const response = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 308, path);
  assert.equal(response.headers.get("location"), target, path);
  await response.arrayBuffer();
}
const sitemap = await fetch(base + "/sitemap.xml").then(response => response.text());
assert.equal((sitemap.match(/<loc>/g) ?? []).length, pages.length);
assert(!/\/account|\/search/.test(sitemap));
for (const path of ["/robots.txt", "/llms.txt", "/favicon.ico", "/favicon.svg", "/icons/apple-touch-icon.png", "/manifest.webmanifest"]) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, path);
  await response.arrayBuffer();
}
console.log(`Checked ${checked} public pages, preview images, Markdown references, personal-page headers, 404s, redirects, icons and discovery files at ${base}.`);
