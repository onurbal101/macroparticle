import { knowledge } from "../src/data/schema";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const expected = { "healthy-steam": 17, "auto-cook": 20, "quick-defrost": 5 };
for (const [functionId, count] of Object.entries(expected)) {
  const actual = knowledge.records.filter(
    (record) => record.automatic && record.function === functionId,
  ).length;
  if (actual !== count)
    throw new Error(`${functionId}: expected ${count}, found ${actual}`);
}
const manifest = JSON.parse(readFileSync("public/print/manifest.json", "utf8"));
const ids = knowledge.records
  .filter((record) => record.automatic)
  .map((record) => record.id);
if (JSON.stringify(ids) !== JSON.stringify(manifest.presetIds))
  throw new Error("Print preset list is stale");
if (manifest.knowledgeVersion !== knowledge.version)
  throw new Error("Print knowledge version is stale");
if (
  manifest.knowledgeHash !==
  createHash("sha256").update(JSON.stringify(knowledge)).digest("hex")
)
  throw new Error("Print data content is stale. Run npm run print.");
console.log(
  `Validated ${knowledge.records.length} records, ${ids.length} presets, ${knowledge.controls.length} controls and matching print data.`,
);
