import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import type { Locale } from "../data/schema";
import { markdownPath, metadataFor, pageFor, siteUrl, structuredData } from "../site";

export function PageMetadata({ locale }: { locale: Locale }) {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const page = pageFor(pathname, locale);
    document.title = page.title;
    const meta = (attribute: "name" | "property", key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.append(element);
      }
      element.content = content;
    };
    const link = (rel: string, href: string | null, type?: string) => {
      const selector = `link[rel="${rel}"]${type ? `[type="${type}"]` : ""}`;
      let element = document.head.querySelector<HTMLLinkElement>(selector);
      if (!href) { element?.remove(); return; }
      if (!element) {
        element = document.createElement("link");
        element.rel = rel;
        if (type) element.type = type;
        document.head.append(element);
      }
      element.href = href;
    };
    for (const [attribute, key, content] of metadataFor(page, locale)) meta(attribute, key, content);
    link("canonical", siteUrl + page.canonicalPath);
    link("alternate", page.indexable ? siteUrl + markdownPath(page) : null, "text/markdown");
    let data = document.head.querySelector<HTMLScriptElement>("#page-data");
    if (!data) {
      data = document.createElement("script");
      data.id = "page-data";
      data.type = "application/ld+json";
      document.head.append(data);
    }
    data.textContent = JSON.stringify(page.indexable ? structuredData(page, locale) : {});
  }, [pathname, locale]);
  return null;
}
