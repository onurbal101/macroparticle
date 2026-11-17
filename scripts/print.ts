import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { knowledge, quantityText } from "../src/data/schema";
import { instructionText } from "../src/instructions";

const base = new URL(process.env.PUBLIC_BASE_URL || knowledge.publicBaseUrl);
if (
  base.protocol !== "https:" ||
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(base.hostname) ||
  base.pathname !== "/" ||
  base.search ||
  base.hash
) {
  throw new Error(
    "PUBLIC_BASE_URL must be a production HTTPS origin, without a path, query or fragment.",
  );
}
const output = resolve("public/print");
await mkdir(output, { recursive: true });
await mkdir("tmp/print", { recursive: true });
await mkdir("output/pdf", { recursive: true });
const destinations = [
  { id: "home", path: "/" },
  { id: "programs", path: "/programs" },
  { id: "controls", path: "/controls" },
  ...["healthy-steam", "auto-cook", "quick-defrost"].map((id) => ({
    id,
    path: `/functions/${id}`,
  })),
];
const qrResults = [];
for (const destination of destinations) {
  const url = new URL(destination.path, base).href;
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
  });
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 600,
    margin: 4,
    errorCorrectionLevel: "M",
  });
  const png = PNG.sync.read(buffer);
  for (const size of [600, 220]) {
    const pixels = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const sourceOffset =
          (Math.floor((y * png.height) / size) * png.width +
            Math.floor((x * png.width) / size)) *
          4;
        pixels.set(
          png.data.subarray(sourceOffset, sourceOffset + 4),
          (y * size + x) * 4,
        );
      }
    }
    if (jsQR(pixels, size, size)?.data !== url)
      throw new Error(`QR decode failed for ${destination.id} at ${size}px`);
  }
  await writeFile(`${output}/qr-${destination.id}.svg`, svg);
  await writeFile(`${output}/qr-${destination.id}.png`, buffer);
  qrResults.push({ ...destination, url, decodedAt: [600, 220] });
}

// This original drawing follows the positions shown in TR09 p. 11.
const escape = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const key = (x: number, y: number, text: string, width = 96) =>
  `<rect x="${x}" y="${y}" width="${width}" height="40" rx="4" fill="white" stroke="#8a9682"/><text x="${x + width / 2}" y="${y + 24}" text-anchor="middle" font-size="10">${escape(text)}</text>`;
const panel = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="450" viewBox="0 0 250 450"><title>MS23K3555ES/ND · Control layout · TR09 p. 11</title><g font-family="sans-serif" fill="#26362f"><rect x="2" y="2" width="246" height="446" rx="15" fill="#f3f5ee" stroke="#899780"/><rect x="50" y="23" width="150" height="49" rx="4" fill="#263c2b"/><text x="125" y="55" text-anchor="middle" fill="#e9f1db" font-size="25">12:00</text>${knowledge.controls
  .slice(0, 8)
  .map((control, index) =>
    key(
      24 + (index % 2) * 104,
      96 + Math.floor(index / 2) * 51,
      control.hardware,
    ),
  )
  .join(
    "",
  )}<circle cx="108" cy="353" r="39" fill="white" stroke="#899780"/><text x="108" y="357" text-anchor="middle" font-size="12">− ↻ +</text>${key(163, 350, "Select/Clock", 69)}${key(24, 404, "STOP/ECO")}${key(128, 404, "START/+30s")}</g></svg>`;
await writeFile(`${output}/control-panel.svg`, panel);
const manifest = {
  generated: new Date().toISOString(),
  baseUrl: base.origin,
  knowledgeVersion: knowledge.version,
  knowledgeHash: createHash("sha256")
    .update(JSON.stringify(knowledge))
    .digest("hex"),
  qrCodes: qrResults,
  remoteAvailability: "not checked during generation",
  presetIds: knowledge.records
    .filter((record) => record.automatic)
    .map((record) => record.id),
  files: ["everyday-card.pdf", "preset-index.pdf", "button-legend.pdf"],
};
await writeFile(
  `${output}/manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  "tmp/print/input.json",
  JSON.stringify({
    ...knowledge,
    publicBaseUrl: base.origin,
    records: knowledge.records.map((record) => ({
      ...record,
      quantityLabel: quantityText(record, "tr"),
      sequenceLabels: record.sequence.map((action) =>
        instructionText(action, "tr", {
          power: "uygun güç",
          duration: "uygun süre",
          quantity: "listelenen miktar",
        }),
      ),
    })),
  }),
);
const python = process.env.PRINT_PYTHON || "python3";
execFileSync(python, ["scripts/print_pdf.py", "tmp/print/input.json"], {
  stdio: "inherit",
});
for (const filename of manifest.files)
  await copyFile(`${output}/${filename}`, `output/pdf/${filename}`);
console.log(
  `Generated three PDFs, one control SVG and six decoded QR codes for ${base.origin}.`,
);
