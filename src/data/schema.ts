import { z } from "zod";
import raw from "./knowledge.json" with { type: "json" };

export const localizedSchema = z.object({
  tr: z.string().min(1),
  en: z.string().min(1),
});
const referenceSchema = z.object({
  sourceId: z.string(),
  pages: z.array(z.number().int().positive()),
});
const actionSchema = z.object({
  type: z.enum([
    "press_button",
    "hold_button",
    "rotate_dial_to",
    "confirm_selection",
    "set_weight",
    "set_servings",
    "set_duration",
    "wait_for_signal",
    "turn_food",
    "open_door",
    "close_door",
    "start",
    "stop",
  ]),
  control: z.string().nullable(),
  value: z.string().nullable(),
  parameter: z
    .enum(["quantity", "power", "duration", "hour", "minute"])
    .nullable(),
  message: localizedSchema.nullable(),
  phase: z.enum(["setup", "during"]),
  display: z.string().nullable(),
});
const quantitySchema = z.object({
  kind: z.enum(["fixed", "options", "range"]),
  values: z.array(z.number().positive()),
  min: z.number().positive().nullable(),
  max: z.number().positive().nullable(),
  increment: z.number().positive().nullable(),
  incrementSource: z.string().optional(),
  unit: z.enum(["g", "ml"]),
});
export const recordSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(["preset", "manual", "function", "article"]),
  title: localizedSchema,
  officialTr: z.string(),
  officialEn: z.string().nullable(),
  englishStatus: z.literal("application-translation"),
  function: z.enum([
    "healthy-steam",
    "auto-cook",
    "quick-defrost",
    "microwave",
    "keep-warm",
    "other",
  ]),
  category: z.string(),
  code: z.string().nullable(),
  groupCode: z.string().nullable(),
  foodCode: z.string().nullable(),
  synonyms: z.array(z.string()),
  food: localizedSchema,
  ingredients: z.array(localizedSchema),
  quantity: quantitySchema.nullable(),
  preparation: z.array(localizedSchema),
  cookware: z.array(localizedSchema),
  accessories: z.array(localizedSchema),
  sequence: z.array(actionSchema),
  during: z.array(localizedSchema),
  standing: z
    .object({ min: z.number().positive(), max: z.number().positive() })
    .nullable(),
  after: z.array(localizedSchema),
  warnings: z.array(localizedSchema),
  sources: z.array(referenceSchema).min(1),
  verification: z.enum([
    "manual",
    "corroborated",
    "secondary",
    "interpretation",
    "unverified",
    "regional-reference",
  ]),
  automatic: z.boolean(),
  durationVariants: z.array(z.object({
    quantity: z.number().positive().nullable(),
    seconds: z.number().int().positive(),
  })).default([]),
  durationLimitSeconds: z.number().positive().optional(),
  manualSettings: z
    .object({
      power: z.number(),
      durationMin: z.number().positive(),
      durationMax: z.number().positive(),
    })
    .optional(),
});
export const knowledgeSchema = z
  .object({
    version: z.string(),
    reviewed: z.string(),
    brand: z.string().min(1),
    shortBrand: z.string().min(1).optional(),
    model: z.string(),
    publicBaseUrl: z.url(),
    sources: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        url: z.url(),
        revision: z.string().nullable(),
        date: z.string().nullable(),
        accessed: z.string(),
        language: z.string(),
        region: z.string(),
        sha256: z.string().optional(),
      }),
    ),
    controls: z.array(
      z.object({
        id: z.string(),
        name: localizedSchema,
        summary: localizedSchema,
        shortPurpose: localizedSchema,
        hardware: z.string(),
        position: z.string(),
        source: referenceSchema,
      }),
    ),
    powerLevels: z.array(z.number().positive()),
    records: z.array(recordSchema),
  })
  .superRefine((data, context) => {
    const ids = new Set<string>();
    const codes = new Set<string>();
    const controls = new Set(data.controls.map((control) => control.id));
    const sources = new Set(data.sources.map((source) => source.id));
    const problem = (message: string) =>
      context.addIssue({ code: "custom", message });
    for (const record of data.records) {
      if (ids.has(record.id)) problem(`Duplicate record ID ${record.id}`);
      ids.add(record.id);
      if (record.code) {
        const key = `${record.function}/${record.code}`;
        if (codes.has(key)) problem(`Duplicate program code ${key}`);
        codes.add(key);
      }
      for (const ref of record.sources) {
        if (!sources.has(ref.sourceId))
          problem(`Unknown source on ${record.id}`);
        if (ref.sourceId === "TR09" && ref.pages.length === 0)
          problem(`Missing manual page on ${record.id}`);
      }
      if (
        record.sequence.length &&
        !["manual", "corroborated"].includes(record.verification)
      )
        problem(`Unverified operation ${record.id}`);
      for (const step of record.sequence) {
        if (step.control && !controls.has(step.control))
          problem(`Unknown control on ${record.id}`);
        if (
          [
            "press_button",
            "hold_button",
            "confirm_selection",
            "start",
            "stop",
          ].includes(step.type) &&
          (!step.control || step.control === "dial")
        )
          problem(`Button action requires a physical key on ${record.id}`);
        if (
          [
            "rotate_dial_to",
            "set_weight",
            "set_servings",
            "set_duration",
          ].includes(step.type) &&
          step.control !== "dial"
        )
          problem(`Dial action uses another control on ${record.id}`);
        if (
          step.type === "confirm_selection" &&
          step.control !== "select-clock"
        )
          problem(`Invalid confirmation on ${record.id}`);
      }
      const quantity = record.quantity;
      if (quantity?.min && quantity.max && quantity.min > quantity.max)
        problem(`Invalid quantity on ${record.id}`);
      if (quantity?.kind === "options" && quantity.values.length === 0)
        problem(`Missing quantity choices on ${record.id}`);
      if (
        record.automatic &&
        (!record.code || !record.quantity || !record.sequence.length)
      )
        problem(`Incomplete preset ${record.id}`);
      if (
        record.manualSettings &&
        !data.powerLevels.includes(record.manualSettings.power)
      )
        problem(`Unsupported power on ${record.id}`);
    }
  });

export type ApplianceRecord = z.infer<typeof recordSchema>;
export type ControlAction = z.infer<typeof actionSchema>;
export type Localized = z.infer<typeof localizedSchema>;
export type Locale = keyof Localized;
export const knowledge = knowledgeSchema.parse(raw);
export const recordById = new Map(
  knowledge.records.map((record) => [record.id, record]),
);
export const controlById = new Map(
  knowledge.controls.map((control) => [control.id, control]),
);

export function supportsQuantity(
  record: ApplianceRecord,
  value: number,
): boolean {
  const quantity = record.quantity;
  if (!quantity || !Number.isFinite(value)) return false;
  if (quantity.values.length) return quantity.values.includes(value);
  return (
    quantity.min !== null &&
    quantity.max !== null &&
    value >= quantity.min &&
    value <= quantity.max
  );
}

export function quantityText(record: ApplianceRecord, locale: Locale): string {
  const quantity = record.quantity;
  if (!quantity) return "";
  const format = new Intl.NumberFormat(locale);
  const values = quantity.values
    .map((value) => format.format(value))
    .join(" / ");
  return `${values || `${format.format(quantity.min!)}–${format.format(quantity.max!)}`} ${quantity.unit}`;
}
