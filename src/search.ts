import Fuse, { type IFuseOptions } from "fuse.js";
import { knowledge, type Localized } from "./data/schema";

export function normalize(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9-]+/g, " ")
    .trim();
}

const functionTerms: Record<string, string> = {
  "healthy-steam": "buhar buharda pisir saglikli sebze steam steamed healthy",
  "auto-cook": "otomatik pisir yemek pisirmek cook cooking automatic",
  "quick-defrost":
    "buz buzunu coz cozmek cozerim cozulur donmus dondurulmus thaw defrost frozen",
  microwave:
    "isit isitma isitmak isitilmasi yemek yemegi yemegimi reheat heat heating microwave mikrodalga",
  "keep-warm": "sicak tut tutmak sogumasin keep warm",
  other: "",
};

const aliases: Record<string, string> = {
  "defrost-1": "donmus et etin buzunu coz thaw meat",
  "defrost-2":
    "tavuk tavugu tavugun donmus tavuk buzunu coz thaw chicken defrost chicken poultry",
  "defrost-3": "donmus balik baligin buzunu coz thaw fish",
  "defrost-4": "donmus sebze sebzenin buzunu coz thaw vegetables",
  "defrost-5": "donmus ekmek ekmegin buzunu coz thaw bread frozen bread",
  "manual-heating":
    "yemek yemegi yemegimi isit isitmak isitma reheat food warm up power guc ayari",
  "quick-start": "hizli baslat hizlica isit otuz saniye 30 saniye quick start",
  clock: "saati ayarla saat ayari saati degistir zaman clock set time",
  "child-lock":
    "cocuk kilidini ac kilidi ac kilitle kilit unlock lock child safety",
  deodorization:
    "koku kokusu kokusunu gider kotu koku smell odor odour deodorize",
  "save-favorite": "p1 p2 hafiza kaydet sakla memory save favorite",
  "recall-favorite": "p1 p2 hafiza ac kullan memory recall favorite",
  "pause-stop": "durdur duraklat iptal bitir stop pause cancel",
  cleaning: "temizle nasil temizlenir kir temizligi clean wash",
  cookware: "hangi kap cam plastik metal tabak kase container bowl dish safe",
};

const foodTerms = [
  {
    words: /tavuk|chicken|poultry/,
    terms: "tavuk tavugu tavugun chicken poultry",
  },
  { words: /pirinc|rice/, terms: "pilav pirinc rice" },
  { words: /ekmek|bread/, terms: "ekmek ekmegi ekmegin bread" },
  { words: /brokoli|broccoli/, terms: "brokoli broccoli" },
  { words: /balik|fish|somon|salmon|alabalik|trout/, terms: "balik fish" },
  { words: /karides|shrimp/, terms: "karides shrimp prawn" },
];

type SearchEntry = {
  id: string;
  kind: "preset" | "manual" | "function" | "article" | "control";
  title: Localized;
  path: string;
  code: string | null;
  functionId: string;
  names: string[];
  keywords: string[];
  text: string;
};

export const searchEntries: SearchEntry[] = [
  ...knowledge.records.map((record) => {
    const name = normalize(`${record.title.tr} ${record.title.en}`);
    return {
      id: record.id,
      kind: record.kind,
      title: record.title,
      path: `/programs/${record.id}`,
      code: record.code,
      functionId: record.function,
      names: [normalize(record.title.tr), normalize(record.title.en)],
      keywords: [
        normalize(record.code || ""),
        normalize(record.function),
        normalize(functionTerms[record.function]),
        normalize(aliases[record.id] || ""),
        ...record.synonyms.map(normalize),
        ...foodTerms
          .filter((group) => group.words.test(name))
          .map((group) => group.terms),
        record.manualSettings ? `${record.manualSettings.power} w` : "",
        ...(record.id === "manual-heating"
          ? knowledge.powerLevels.map((power) => `${power} w`)
          : []),
      ],
      text: normalize(
        record.preparation.flatMap((text) => [text.tr, text.en]).join(" "),
      ),
    };
  }),
  ...knowledge.controls.map((control) => ({
    id: control.id,
    kind: "control" as const,
    title: control.name,
    path: `/simulation/${control.id}`,
    code: null,
    functionId: control.id,
    names: [normalize(control.name.tr), normalize(control.name.en)],
    keywords: [normalize(control.hardware), normalize(control.id)],
    text: normalize(`${control.summary.tr} ${control.summary.en}`),
  })),
];

const stopWords = new Set([
  "istiyorum",
  "nasil",
  "yapabilirim",
  "yapilir",
  "icin",
  "bir",
  "ve",
  "the",
  "how",
  "can",
  "want",
  "to",
  "i",
  "a",
  "my",
  "please",
  "w",
  "do",
  "could",
  "would",
  "like",
  "lutfen",
]);
const options: IFuseOptions<SearchEntry> = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.4,
  minMatchCharLength: 2,
  useTokenSearch: true,
  tokenMatch: "all",
  tokenize: (text) =>
    normalize(text)
      .split(/\s+/)
      .filter((token) => token && !stopWords.has(token)),
  keys: [
    { name: "names", weight: 0.55 },
    { name: "keywords", weight: 0.35 },
    { name: "text", weight: 0.1 },
  ],
};
const index = new Fuse(searchEntries, options);
const exactIndex = new Fuse(searchEntries, {
  ...options,
  threshold: 0,
  keys: [
    { name: "names", weight: 0.6 },
    { name: "keywords", weight: 0.4 },
  ],
});

export function search(query: string) {
  const normalized = normalize(query);
  if (!normalized) return [];
  if (/^\d+(?:-\d+)?$/.test(normalized)) {
    const programs = searchEntries
      .filter((entry) => entry.code === normalized)
      .map((entry) => ({ ...entry, score: 1 }));
    if (programs.length) return programs;
  }
  const exact = exactIndex.search(normalized, { limit: 40 });
  const matches = exact.length
    ? exact
    : index.search(normalized, { limit: 40 });
  const cutoff = exact.length
    ? 1
    : Math.min(0.58, (matches[0]?.score ?? 1) + 0.18);
  const seen = new Set<string>();
  return matches
    .filter((result) => {
      if ((result.score ?? 1) > cutoff || seen.has(result.item.id))
        return false;
      seen.add(result.item.id);
      return true;
    })
    .map((result) => ({ ...result.item, score: 1 - (result.score ?? 1) }));
}
