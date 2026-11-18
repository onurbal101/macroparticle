import { controlById, knowledge, quantityText, recordById, type ApplianceRecord, type Locale } from "./data/schema.ts";
import { messages, type MessageKey } from "./i18n.ts";

export const siteUrl = new URL(knowledge.publicBaseUrl).origin;
export const siteName = messages.tr.brand;
export const functionIds = ["quick-defrost", "auto-cook", "healthy-steam", "microwave", "keep-warm", "other"] as const;
export type FunctionId = (typeof functionIds)[number];

const directPrograms = new Set(["keep-warm", "deodorization"]);

export const guideSections = [
  { label: "guideOperation", ids: ["quick-start", "adjust-time", "pause-stop", "child-lock"] },
  { label: "guideDisplay", ids: ["clock", "eco"] },
  { label: "guideMemory", ids: ["save-favorite", "recall-favorite"] },
  { label: "guideOther", ids: knowledge.records.filter(record => record.kind === "article").map(record => record.id) },
] as const;

export function recordParentPath(record: ApplianceRecord) {
  if (directPrograms.has(record.id)) return "/programs";
  if (record.kind === "article" || record.function === "other") return "/guide";
  return `/functions/${record.function}`;
}

export type SitePage = {
  path: string;
  canonicalPath: string;
  title: string;
  heading: string;
  description: string;
  kind: "home" | "category" | "record" | "guide" | "simulation" | "private" | "not-found";
  indexable: boolean;
  imageKey: string;
  functionId?: FunctionId;
  record?: ApplianceRecord;
  controlId?: string;
};

const descriptions = {
  tr: {
    home: "Samsung MS23K3555ES/ND için programlar, hazırlık bilgileri, adım adım kullanım ve mikrodalga simülasyonu.",
    guide: "Samsung MS23K3555ES/ND için güvenlik, uygun kaplar, temizlik, güç seviyeleri ve diğer özellikler.",
    simulation: "Samsung MS23K3555ES/ND düğmelerini ve programlarını etkileşimli mikrodalga simülasyonunda keşfedin.",
    private: "Mikrodalga Rehberi için favoriler, dil ve görünüm ayarları.",
    "not-found": "Bu sayfa bulunamadı. Mikrodalga programlarına ve kullanım rehberine dönün.",
  },
  en: {
    home: "Programmes, preparation, step-by-step instructions and a microwave simulator for the Samsung MS23K3555ES/ND.",
    guide: "Safety, cookware, cleaning, power levels and other features for the Samsung MS23K3555ES/ND.",
    simulation: "Explore the Samsung MS23K3555ES/ND controls and programmes in an interactive microwave simulator.",
    private: "Favorites, language and appearance settings for the Microwave Guide.",
    "not-found": "This page was not found. Return to the microwave programmes and user guide.",
  },
};

function summarize(text: string, max = 190) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : clean;
}

export function pageFor(input: string, locale: Locale = "tr"): SitePage {
  const path = new URL(input, siteUrl).pathname.replace(/\/+$/, "") || "/";
  const t = messages[locale];
  const page = (kind: SitePage["kind"], heading: string, extra: Partial<SitePage> = {}): SitePage => ({
    path, canonicalPath: path, kind, heading,
    title: `${heading} · ${t.brand}`,
    description: descriptions[locale][kind as keyof typeof descriptions.tr] ?? descriptions[locale].home,
    indexable: kind !== "private" && kind !== "not-found",
    imageKey: kind,
    ...extra,
  });
  if (path === "/" || path === "/programs") {
    return page("home", t.programs, { canonicalPath: "/", title: `${t.brand} · ${t.model}` });
  }
  if (path === "/programs/all") return page("category", t.allPrograms, { imageKey: "all-programs" });
  if (path === "/guide") return page("guide", t.guide);
  const functionId = path.startsWith("/functions/") ? path.slice(11) as FunctionId : undefined;
  if (functionId && functionIds.includes(functionId)) {
    const count = knowledge.records.filter(record => record.function === functionId && record.kind !== "article").length;
    const description = locale === "tr"
      ? `${t.model} · ${t[functionId]}. ${count} program ve işlev için miktar, hazırlık ve kullanım adımları.`
      : `${t.model} · ${t[functionId]}. Quantities, preparation and instructions for ${count} programmes and functions.`;
    return page("category", t[functionId], { functionId, imageKey: `function-${functionId}`, description });
  }
  const record = path.startsWith("/programs/") ? recordById.get(path.slice(10)) : undefined;
  if (record) {
    const topic = record.code ? `${record.title[locale]} · ${record.code} · ${t[record.function]}` : record.title[locale];
    const detail = [quantityText(record, locale), record.preparation[0]?.[locale]].filter(Boolean).join(". ");
    return page("record", record.title[locale], {
      record, functionId: record.function, imageKey: `program-${record.id}`,
      title: `${topic} · ${t.brand}`,
      description: summarize(`${t.model} · ${record.code ? `${t[record.function]} ${record.code} · ` : ""}${record.title[locale]}. ${detail}`),
    });
  }
  const simulation = /^\/(?:simulation|controls|guide\/controls)(?:\/([^/]+))?$/.exec(path);
  if (simulation && (!simulation[1] || controlById.has(simulation[1]))) {
    const control = controlById.get(simulation[1]);
    return page("simulation", control ? `${control.name[locale]} · ${t.simulation}` : t.simulation, {
      canonicalPath: `/simulation${control ? `/${control.id}` : ""}`,
      controlId: control?.id, imageKey: control ? `control-${control.id}` : "simulation",
      description: control ? `${t.model} · ${control.summary[locale]}` : descriptions[locale].simulation,
    });
  }
  const settings: Record<string, MessageKey> = {
    "/account": "account", "/account/favorites": "favorites", "/favorites": "favorites",
    "/account/appearance": "appearance", "/account/reduce-motion": "reduceMotion", "/account/language": "language", "/search": "searchTitle",
  };
  if (settings[path]) return page("private", t[settings[path]], {
    canonicalPath: path === "/favorites" ? "/account/favorites" : path, imageKey: "home",
  });
  return page("not-found", t.notFound, { imageKey: "home" });
}

export function publicPages() {
  return ["/", "/programs/all", ...functionIds.map(id => `/functions/${id}`), "/guide", "/simulation",
    ...knowledge.controls.map(control => `/simulation/${control.id}`),
    ...knowledge.records.map(record => `/programs/${record.id}`),
  ].map(path => pageFor(path));
}

export function markdownPath(page: SitePage) {
  return `/content/${page.canonicalPath === "/" ? "index" : page.canonicalPath.slice(1)}.md`;
}

export function socialImagePath(page: SitePage) {
  return `/social/v1/${page.imageKey}.png`;
}

export function metadataFor(page: SitePage, locale: Locale = "tr") {
  const artwork = pageFor(page.path);
  const alt = [artwork.heading, artwork.record?.code, artwork.record ? quantityText(artwork.record, "tr") : "", siteName].filter(Boolean).join(" · ");
  const image = siteUrl + socialImagePath(page);
  const entries: ["name" | "property", string, string][] = [
    ["name", "description", page.description],
    ["name", "robots", page.indexable ? "index, follow, max-image-preview:large" : "noindex, follow"],
    ["property", "og:type", "website"], ["property", "og:site_name", siteName],
    ["property", "og:title", page.title], ["property", "og:description", page.description],
    ["property", "og:url", siteUrl + page.canonicalPath], ["property", "og:locale", locale === "tr" ? "tr_TR" : "en_US"],
    ["property", "og:image", image], ["property", "og:image:type", "image/png"],
    ["property", "og:image:width", "1200"], ["property", "og:image:height", "630"], ["property", "og:image:alt", alt],
    ["name", "twitter:card", "summary_large_image"], ["name", "twitter:title", page.title],
    ["name", "twitter:description", page.description], ["name", "twitter:image", image], ["name", "twitter:image:alt", alt],
  ];
  return entries;
}

export function structuredData(page: SitePage, locale: Locale = "tr") {
  const t = messages[locale];
  const url = siteUrl + page.canonicalPath;
  const website = { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: siteName, url: siteUrl + "/", inLanguage: "tr" };
  const product = { "@type": "Thing", name: t.model };
  const entity: Record<string, unknown> = {
    "@type": page.kind === "category" || page.kind === "guide" ? "CollectionPage" : "WebPage",
    "@id": `${url}#page`, url, name: page.title, description: page.description,
    inLanguage: locale, isPartOf: { "@id": website["@id"] }, about: product,
    primaryImageOfPage: { "@type": "ImageObject", url: siteUrl + socialImagePath(page), width: 1200, height: 630 },
  };
  const graph: Record<string, unknown>[] = [website, entity];
  if (page.kind === "home") graph.push({
    "@type": "WebApplication", "@id": `${siteUrl}/#app`, name: siteName, url: siteUrl + "/",
    applicationCategory: "UtilitiesApplication", operatingSystem: "Web", browserRequirements: "JavaScript is required for interactive controls.",
    description: descriptions[locale].home, inLanguage: ["tr", "en"], isAccessibleForFree: true,
  });
  if (page.record) entity.citation = page.record.sources.map(reference => {
    const source = knowledge.sources.find(source => source.id === reference.sourceId)!;
    return { "@type": "CreativeWork", name: source.title,
      url: `${source.url}${reference.pages[0] ? `#page=${reference.pages[0]}` : ""}` };
  });
  if (page.kind === "category") {
    const records = knowledge.records.filter(record => record.kind !== "article" && (!page.functionId || record.function === page.functionId));
    entity.mainEntity = { "@type": "ItemList", numberOfItems: records.length,
      itemListElement: records.map((record, index) => ({ "@type": "ListItem", position: index + 1,
        name: `${record.code ? `${record.code} · ` : ""}${record.title[locale]}`, url: `${siteUrl}/programs/${record.id}` })) };
  }
  if (page.canonicalPath !== "/") {
    const crumbs: { name: string; item: string }[] = [{ name: t.programs, item: siteUrl + "/" }];
    if (page.record) {
      const parent = recordParentPath(page.record);
      if (parent !== "/programs") crumbs.push({ name: parent === "/guide" ? t.guide : t[page.record.function], item: siteUrl + parent });
    }
    crumbs.push({ name: page.heading, item: url });
    graph.push({ "@type": "BreadcrumbList", itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, ...crumb })) });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
