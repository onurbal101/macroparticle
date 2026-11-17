import { mkdir, writeFile } from "node:fs/promises";
import { faviconIco, iconSvg, png } from "./brand";

await mkdir("public/icons", { recursive: true });
await writeFile("public/favicon.svg", iconSvg());
await writeFile("public/favicon.ico", faviconIco());
for (const [size, filename, maskable] of [
  [32, "favicon-32.png", false], [48, "favicon-48.png", false],
  [180, "apple-touch-icon.png", true], [192, "icon-192.png", false],
  [512, "icon-512.png", false], [512, "maskable-512.png", true],
] as const) await writeFile(`public/icons/${filename}`, png(iconSvg(maskable), size));
console.log("Generated SVG, ICO, Apple and PWA icons.");
