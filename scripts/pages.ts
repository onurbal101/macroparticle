import react from "@vitejs/plugin-react";
import { createServer, type Plugin } from "vite";
import { knowledge, quantityText, type Locale } from "../src/data/schema.ts";
import { guidedActions, instructionText } from "../src/instructions.ts";
import { messages } from "../src/i18n.ts";
import { formatSeconds } from "../src/time.ts";
import { isGuideFeature, markdownPath, metadataFor, pageFor, publicPages, siteName, siteUrl, socialImagePath, structuredData, type SitePage } from "../src/site.ts";
import { escapeXml, png, shareSvg } from "./brand.ts";

export function pageHead(page: SitePage) {
  const url = siteUrl + page.canonicalPath;
  return [
    `<title>${escapeXml(page.title)}</title>`,
    ...metadataFor(page).map(([attribute, key, content]) => `<meta ${attribute}="${key}" content="${escapeXml(content)}">`),
    `<link rel="canonical" href="${escapeXml(url)}">`,
    ...(page.indexable ? [`<link rel="alternate" type="text/markdown" href="${siteUrl + markdownPath(page)}">`] : []),
    `<script id="page-data" type="application/ld+json">${JSON.stringify(page.indexable ? structuredData(page) : {}).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}

function markdown(page: SitePage) {
  const record = page.record;
  const lines = [`# ${page.heading}`, "", `URL: ${siteUrl + page.canonicalPath}`, "", page.description, ""];
  if (record) {
    for (const locale of ["tr", "en"] as Locale[]) {
      const t = messages[locale];
      lines.push(`## ${locale === "tr" ? "Türkçe" : "English (application translation)"}`, "", `### ${record.title[locale]}`, "");
      if (record.code) lines.push(`${t[record.function]} · ${record.code}`, "");
      const quantity = quantityText(record, locale);
      if (quantity) lines.push(`**${t.quantity}:** ${quantity}`, "");
      if (record.manualSettings) lines.push(`${record.manualSettings.power} W · ${formatSeconds(record.manualSettings.durationMin)}–${formatSeconds(record.manualSettings.durationMax)}`, "");
      for (const [title, items] of [
        [locale === "tr" ? "Malzemeler" : "Ingredients", record.ingredients], [t.accessories, record.accessories], [t.cookware, record.cookware],
        [t.preparation, record.preparation], [t.caution, record.warnings],
      ] as const) if (items.length) lines.push(`### ${title}`, "", ...items.map(item => `- ${item[locale]}`), "");
      const actions = guidedActions(record);
      if (actions.length) {
        const parameters = { quantity, power: record.manualSettings ? `${record.manualSettings.power} W` : (locale === "tr" ? "seçilen güç" : "selected power"), duration: locale === "tr" ? "seçilen süre" : "selected duration" };
        lines.push(`### ${t.steps}`, "", ...actions.map((action, index) => `${index + 1}. ${instructionText(action, locale, parameters)}`), "");
      }
      if (record.standing) lines.push(`**${t.standing}:** ${record.standing.min}${record.standing.max !== record.standing.min ? `–${record.standing.max}` : ""} ${t.minutes}`, "");
      if (record.after.length) lines.push(`### ${t.after}`, "", ...record.after.map(item => `- ${item[locale]}`), "");
    }
    lines.push("## Kaynaklar / Sources", "");
    for (const ref of record.sources) {
      const source = knowledge.sources.find(source => source.id === ref.sourceId)!;
      lines.push(`- [${source.title}](${source.url}${ref.pages[0] ? `#page=${ref.pages[0]}` : ""})${ref.pages.length ? ` · ${ref.pages.join(", ")}` : ""}`);
    }
  } else if (page.kind === "simulation") {
    lines.push("This is a simulation. It does not control the physical microwave. Interactive controls require JavaScript.", "");
    for (const control of knowledge.controls.filter(control => !page.controlId || control.id === page.controlId))
      lines.push(`## ${control.hardware}`, "", control.summary.tr, "", control.summary.en, "");
  } else {
    let linked = publicPages().filter(item => item.kind === "record");
    if (page.kind === "home") linked = ["/functions/quick-defrost", "/functions/auto-cook", "/functions/healthy-steam", "/functions/microwave", "/programs/keep-warm", "/programs/deodorization", "/simulation", "/guide"].map(path => pageFor(path));
    if (page.kind === "category" && !page.functionId) linked = linked.filter(item => item.record!.kind !== "article");
    if (page.functionId) linked = linked.filter(item => item.functionId === page.functionId && item.record!.kind !== "article");
    if (page.kind === "guide") linked = linked.filter(item => item.record!.kind === "article" || isGuideFeature(item.record!));
    lines.push(...linked.map(item => `- [${item.record?.code ? `${item.record.code} · ` : ""}${item.heading}](${siteUrl + item.canonicalPath}) · [Markdown](${siteUrl + markdownPath(item)})`));
    if (page.kind === "guide") lines.push("", "## Güç seviyeleri / Power levels", "", ...[...knowledge.powerLevels].sort((a, b) => a - b).map(power => `${power} W · ${messages.tr[`power${power}` as keyof typeof messages.tr]} / ${messages.en[`power${power}` as keyof typeof messages.en]}`));
  }
  return lines.join("\n") + "\n";
}

export function staticPages(): Plugin {
  return {
    name: "static-page-details",
    apply: "build",
    generateBundle: { order: "post", async handler(_, bundle) {
      const index = bundle["index.html"];
      if (!index || index.type !== "asset") throw new Error("Missing application HTML");
      const template = String(index.source);
      const pages = publicPages();
      const paths = [
        ...pages.map(page => page.path), "/programs", "/account", "/account/favorites", "/account/language", "/account/appearance", "/account/reduce-motion", "/search", "/404",
        "/controls", ...knowledge.controls.flatMap(control => [`/controls/${control.id}`, `/guide/controls/${control.id}`]),
      ];
      const server = await createServer({
        configFile: false, appType: "custom", logLevel: "error",
        server: { middlewareMode: true, hmr: false },
        plugins: [react(), {
          name: "server-only-pwa-stub",
          resolveId: id => id === "virtual:pwa-register/react" ? "\0static-pwa" : undefined,
          load: id => id === "\0static-pwa" ? "export const useRegisterSW = () => ({ needRefresh: [false], updateServiceWorker: async () => {} });" : undefined,
        }],
      });
      try {
        const { render } = await server.ssrLoadModule("/src/entry-server.tsx") as { render: (path: string) => string };
        for (const path of paths) {
          const page = pageFor(path);
          const html = template
            .replace(/<!--page-meta:start-->[\s\S]*?<!--page-meta:end-->/, pageHead(page))
            .replace('<div id="root"></div>', `<div id="root" data-page="${escapeXml(path)}">${render(path)}</div>`);
          if (path === "/") index.source = html;
          else this.emitFile({ type: "asset", fileName: `${path.slice(1)}.html`, source: html });
        }
      } finally { await server.close(); }
      this.emitFile({ type: "asset", fileName: "app.html", source: template.replace(/<!--page-meta:start-->[\s\S]*?<!--page-meta:end-->/, pageHead(pageFor("/account"))) });
      const images = new Map(pages.map(page => [socialImagePath(page), page]));
      for (const [path, page] of images) this.emitFile({ type: "asset", fileName: path.slice(1), source: png(shareSvg(page)) });
      for (const page of pages) this.emitFile({ type: "asset", fileName: markdownPath(page).slice(1), source: markdown(page) });
      const urls = pages.map(page => `<url><loc>${escapeXml(siteUrl + page.canonicalPath)}</loc></url>`).join("");
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>` });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n` });
      const sections = pages.filter(page => ["home", "category", "guide", "simulation"].includes(page.kind));
      this.emitFile({ type: "asset", fileName: "llms.txt", source: [
        `# ${siteName}`, "", `> An independent, Turkish-first companion for the Samsung ${knowledge.model} microwave. Includes English application translations, source links and an interactive simulator.`, "",
        "## Content notes", "", "- The site is a companion guide, not a Samsung service. The simulator does not operate the appliance.",
        "- Fixed automatic programme durations are not available. Do not infer them from weights or standing times.",
        "- Programme quantities, instructions, cautions and source citations are in each page's Markdown version.",
        "- Personal notes, favorites and preferences stay in the user's browser. They are not public site content.", "",
        "## Pages", "", ...sections.map(page => `- [${page.heading}](${siteUrl + markdownPath(page)}): ${page.description}`), "",
        `## Discovery`, "", `- [Sitemap](${siteUrl}/sitemap.xml)`,
        ...knowledge.sources.map(source => `- [${source.title}](${source.url})`), "",
      ].join("\n") });
      console.log(`Generated ${paths.length} HTML pages, ${images.size} link previews and ${pages.length} Markdown references.`);
    } },
  };
}
