import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import { resolve } from "node:path";
import { controlById, quantityText } from "../src/data/schema.ts";
import { messages } from "../src/i18n.ts";
import { siteName, type SitePage } from "../src/site.ts";

export const escapeXml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
const font: ResvgRenderOptions["font"] = {
  loadSystemFonts: false,
  fontFiles: [resolve("assets/fonts/NotoSans-Regular.ttf"), resolve("assets/fonts/NotoSans-Bold.ttf")],
  defaultFontFamily: "Noto Sans",
};

const microwave = `<rect x="3" y="5" width="18" height="14" rx="2.5"/><rect x="5.5" y="7.5" width="10" height="9" rx="1.5"/><path d="M18.2 8.5h.1M18.2 11.5h.1"/><circle cx="18.2" cy="15" r="1"/>`;
const symbols: Record<string, string> = {
  "quick-defrost": `<path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5M9 3l3 3 3-3M9 21l3-3 3 3M3 9l3 3-3 3M21 9l-3 3 3 3"/>`,
  "auto-cook": `<path d="M5 9h14v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3ZM2 12h3m14 0h3M4 6h16M9 3h6"/>`,
  "healthy-steam": `<path d="M6 3c-6 5 6 7 0 12M12 3c-6 5 6 7 0 12M18 3c-6 5 6 7 0 12M3 20h18"/>`,
  "keep-warm": `<path d="M2 7c3-4 7 4 10 0s7 4 10 0M2 12c3-4 7 4 10 0s7 4 10 0M2 17c3-4 7 4 10 0s7 4 10 0"/>`,
  guide: `<path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/>`,
};

export function iconSvg(maskable = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" width="512" height="512" viewBox="0 0 512 512">
    <title>${escapeXml(siteName)}</title>
    <defs>
      <linearGradient id="blue" x2="1" y2="1"><stop stop-color="#2199ff"/><stop offset=".5" stop-color="#1266db"/><stop offset="1" stop-color="#8052e7"/></linearGradient>
      <linearGradient id="glass" x2=".7" y2="1"><stop stop-color="#fff" stop-opacity=".24"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#blue)"/>
    <rect x="1" y="1" width="510" height="510" rx="${maskable ? 0 : 111}" fill="url(#glass)" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>
    <g transform="translate(88 88) scale(14)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${microwave}</g>
  </svg>`;
}

export function png(svg: string, size?: number) {
  return new Resvg(svg, { font, ...(size ? { fitTo: { mode: "width", value: size } } : {}) }).render().asPng();
}

// ICO accepts PNG frames. Keep separate sizes so small tabs stay sharp.
export function faviconIco() {
  const sizes = [16, 32, 48];
  const frames = sizes.map(size => png(iconSvg(), size));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  frames.forEach((frame, index) => {
    const position = 6 + index * 16;
    header[position] = header[position + 1] = sizes[index];
    header.writeUInt16LE(1, position + 4);
    header.writeUInt16LE(32, position + 6);
    header.writeUInt32LE(frame.length, position + 8);
    header.writeUInt32LE(offset, position + 12);
    offset += frame.length;
  });
  return Buffer.concat([header, ...frames]);
}

function textWidth(text: string, size: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="200"><text x="0" y="100" font-family="Noto Sans" font-size="${size}" font-weight="700">${escapeXml(text)}</text></svg>`;
  return new Resvg(svg, { font }).innerBBox()?.width ?? 0;
}

export function shareSvg(page: SitePage) {
  const control = page.controlId ? controlById.get(page.controlId) : undefined;
  const title = page.kind === "home" ? siteName : page.record?.title.tr ?? control?.name.tr ?? page.heading;
  const lines: string[] = [];
  let line = "";
  for (const word of title.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, 66) > 940) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > 3) throw new Error(`Preview title needs more than three lines: ${title}`);
  const subtitle = page.record
    ? [messages.tr[page.record.function], page.record.code, quantityText(page.record, "tr")].filter(Boolean).join(" · ")
    : control ? "Simülasyon" : page.kind === "home" ? "Programlar · Simülasyon · Rehber" : "Samsung MS23K3555ES/ND";
  const symbol = symbols[page.functionId ?? page.kind] ?? microwave;
  const startY = lines.length > 2 ? 252 : 282;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <radialGradient id="blue"><stop stop-color="#1972e6" stop-opacity=".5"/><stop offset="1" stop-color="#1972e6" stop-opacity="0"/></radialGradient>
      <radialGradient id="purple"><stop stop-color="#a56bea" stop-opacity=".4"/><stop offset="1" stop-color="#a56bea" stop-opacity="0"/></radialGradient>
      <linearGradient id="glass" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity=".025"/></linearGradient>
      <linearGradient id="rim" x2=".8" y2="1"><stop stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></linearGradient>
    </defs>
    <rect width="1200" height="630" fill="#141319"/>
    <ellipse cx="170" cy="105" rx="560" ry="460" fill="url(#blue)"/>
    <ellipse cx="1110" cy="600" rx="620" ry="440" fill="url(#purple)"/>
    <rect x="42" y="42" width="1116" height="546" rx="48" fill="url(#glass)" stroke="url(#rim)" stroke-width="2"/>
    <rect x="84" y="84" width="76" height="76" rx="23" fill="#70a7ff" fill-opacity=".14" stroke="#b8d3ff" stroke-opacity=".2"/>
    <g transform="translate(99 99) scale(1.9)" fill="none" stroke="#bfd8ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${symbol}</g>
    <text x="182" y="119" fill="#f5f3fa" font-family="Noto Sans" font-size="25" font-weight="700">${escapeXml(siteName)}</text>
    <text x="182" y="149" fill="#c1bed3" font-family="Noto Sans" font-size="21">Samsung MS23K3555ES/ND</text>
    ${lines.map((text, index) => `<text x="84" y="${startY + index * 82}" fill="#f5f3fa" font-family="Noto Sans" font-size="66" font-weight="700">${escapeXml(text)}</text>`).join("")}
    <text x="84" y="${startY + lines.length * 82 + 6}" fill="#c6bcdf" font-family="Noto Sans" font-size="29">${escapeXml(subtitle)}</text>
    <text x="84" y="546" fill="#b2b0c5" font-family="Noto Sans" font-size="22">macroparticle.onurbal.com</text>
    <g transform="translate(1065 518)" fill="none" stroke="#b9a5ed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M0 10h25M16 1l9 9-9 9"/></g>
  </svg>`;
}
