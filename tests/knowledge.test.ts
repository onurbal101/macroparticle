import { describe, expect, it } from "vitest";
import {
  knowledge,
  knowledgeSchema,
  recordById,
  supportsQuantity,
} from "../src/data/schema";
import { search, normalize } from "../src/search";
import { parsePreferences } from "../src/storage";
import { instructionText } from "../src/instructions";
import raw from "../src/data/knowledge.json";

describe("TR09 program tables, checked against pages 15, 16, 19, 20 and 21", () => {
  it("covers each code once within its parent function", () => {
    for (const [functionId, codes] of [
      [
        "healthy-steam",
        [
          ...Array.from({ length: 11 }, (_, i) => `1-${i + 1}`),
          ...Array.from({ length: 6 }, (_, i) => `2-${i + 1}`),
        ],
      ],
      ["auto-cook", Array.from({ length: 20 }, (_, i) => String(i + 1))],
      ["quick-defrost", ["1", "2", "3", "4", "5"]],
    ] as const) {
      expect(
        knowledge.records
          .filter(
            (record) => record.automatic && record.function === functionId,
          )
          .map((record) => record.code),
      ).toEqual(codes);
    }
  });
  it.each([
    ["steam-1-1", [150, 300]],
    ["steam-1-2", [200, 400]],
    ["steam-1-3", [200, 400]],
    ["steam-1-4", [200, 400]],
    ["steam-1-5", [250, 500]],
    ["steam-1-6", [150, 300]],
    ["steam-1-7", [300]],
    ["steam-1-8", [200]],
    ["steam-1-9", [200, 400]],
    ["steam-1-10", [200, 400]],
    ["steam-1-11", [250, 500]],
    ["steam-2-1", [650]],
    ["steam-2-2", [250, 500]],
    ["steam-2-3", [200]],
    ["steam-2-4", [125, 250]],
    ["steam-2-5", [300]],
    ["steam-2-6", [300]],
  ])("%s preserves its discrete quantities", (id, weights) => {
    expect(recordById.get(id as string)?.quantity?.values).toEqual(weights);
  });
  it("keeps Auto Cook quantity fixed and has no weight action", () => {
    const expected = [
      "300-350",
      "400-450",
      "300-350",
      "400-450",
      "250",
      "250",
      "250",
      "150",
      "250",
      "250",
      "125",
      "125",
      "125",
      "125",
      "300",
      "300",
      "300",
      "300",
      "250",
      "200",
    ];
    const programs = knowledge.records.filter(
      (record) => record.function === "auto-cook",
    );
    expect(
      programs.map(
        (record) =>
          record.quantity?.values.join(",") ||
          `${record.quantity?.min}-${record.quantity?.max}`,
      ),
    ).toEqual(expected);
    for (const program of programs)
      expect(program.sequence.map((action) => action.type)).toEqual([
        "press_button",
        "rotate_dial_to",
        "confirm_selection",
        "start",
      ]);
  });
  it("preserves steam group confirmation and separate food confirmation", () => {
    for (const record of knowledge.records.filter(
      (record) => record.function === "healthy-steam",
    )) {
      expect(record.sequence.map((action) => action.control)).toEqual([
        "healthy-steam",
        "dial",
        "select-clock",
        "dial",
        "select-clock",
        "dial",
        "start",
      ]);
      expect(record.sequence[1].value).toBe(record.groupCode);
      expect(record.sequence[3].value).toBe(record.code);
      expect(record.sequence[3].display).toBeNull();
    }
  });
  it("uses the Turkish shrimp row instead of the English fish-cube variant", () => {
    expect(recordById.get("steam-2-6")?.title.tr).toBe("Karides buğulama");
    expect(recordById.get("steam-2-6")?.officialEn).toBeNull();
  });
  it("preserves defrost ranges, the reported chicken increment and all standing times", () => {
    const programs = knowledge.records.filter(
      (record) => record.function === "quick-defrost",
    );
    expect(programs.map((record) => record.standing)).toEqual([
      { min: 20, max: 60 },
      { min: 20, max: 60 },
      { min: 20, max: 60 },
      { min: 5, max: 20 },
      { min: 10, max: 30 },
    ]);
    for (const record of programs) {
      expect(record.quantity).toMatchObject({
        min: 200,
        max: 1500,
        increment: record.id === "defrost-2" ? 100 : null,
      });
      expect(supportsQuantity(record, 199)).toBe(false);
      expect(supportsQuantity(record, 1501)).toBe(false);
      expect(supportsQuantity(record, 200)).toBe(true);
      expect(record.sequence.map((action) => action.type)).toContain(
        "open_door",
      );
      expect(record.sequence.at(-1)?.type).toBe("start");
    }
  });
  it("does not accept an intermediate steam amount", () =>
    expect(supportsQuantity(recordById.get("steam-1-1")!, 200)).toBe(false));
  it("preserves all eight distinct reheating variants and exact time ranges", () => {
    const times = knowledge.records
      .filter((record) => record.id.startsWith("heat-"))
      .map((record) => record.manualSettings);
    expect(times).toEqual([
      { power: 800, durationMin: 60, durationMax: 90 },
      { power: 800, durationMin: 90, durationMax: 120 },
      { power: 800, durationMin: 180, durationMax: 210 },
      { power: 600, durationMin: 330, durationMax: 390 },
      { power: 600, durationMin: 270, durationMax: 330 },
      { power: 600, durationMin: 300, durationMax: 360 },
      { power: 600, durationMin: 330, durationMax: 390 },
      { power: 450, durationMin: 960, durationMax: 990 },
    ]);
  });
});

describe("provenance and runtime validation", () => {
  it("includes all twelve physical controls and six powers", () => {
    expect(knowledge.controls).toHaveLength(12);
    expect(knowledge.powerLevels).toEqual([800, 600, 450, 300, 180, 100]);
  });
  it("rejects duplicate codes and a pressable dial confirmation", () => {
    const duplicate = structuredClone(raw);
    duplicate.records.push(duplicate.records[0]);
    expect(knowledgeSchema.safeParse(duplicate).success).toBe(false);
    const incorrect = structuredClone(raw);
    incorrect.records[0].sequence[2].control = "dial";
    expect(knowledgeSchema.safeParse(incorrect).success).toBe(false);
  });
  it("keeps the unconfirmed sound sequence out of operational actions", () => {
    expect(recordById.get("sound")).toMatchObject({
      verification: "regional-reference",
      sequence: [],
    });
  });
  it("renders every action in both languages without missing parameters", () => {
    for (const record of knowledge.records) {
      for (const action of record.sequence) {
        for (const locale of ["tr", "en"] as const) {
          const text = instructionText(action, locale, {
            quantity: "300 g",
            power: "600 W",
            duration: "3:00",
            hour: "12",
            minute: "30",
          });
          expect(text.length).toBeGreaterThan(5);
          expect(text).not.toMatch(/undefined|NaN/);
        }
      }
    }
  });
});

describe("search and preferences", () => {
  it.each([
    "Ekmek",
    "Bread",
    "ekmke",
    "brokli",
    "CHICKEN",
    "TAVUK",
    "ISITMA",
    "İsıtma",
    "800 W",
    "2-6",
    "Select Clock",
  ])("finds %s", (query) => expect(search(query).length).toBeGreaterThan(0));
  it("handles both Turkish I variants", () =>
    expect(normalize("ISITMA İSİTMA ısıtma")).toBe("isitma isitma isitma"));
  it("recovers from corrupt storage, old fields and removed IDs", () => {
    expect(parsePreferences("{broken").locale).toBe("tr");
    expect(parsePreferences('{"locale":"en"}').locale).toBe("en");
    expect(
      parsePreferences('{"favorites":["gone","defrost-5","defrost-5"]}')
        .favorites,
    ).toEqual(["defrost-5"]);
  });
});
