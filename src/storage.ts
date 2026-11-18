import { z } from "zod";
import { recordById } from "./data/schema";

const preferenceSchema = z.object({
  locale: z.enum(["tr", "en"]).default("tr"),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  reduceMotion: z.enum(["system", "off", "on"]).catch("system"),
  favorites: z.array(z.string()).default([]),
  history: z.array(z.string()).default([]),
  notes: z.record(z.string(), z.string()).default({}),
});
export type Preferences = z.infer<typeof preferenceSchema>;
export const storageKey = "microwave-companion-v1";
export const emptyPreferences: Preferences = {
  locale: "tr",
  theme: "system",
  reduceMotion: "system",
  favorites: [],
  history: [],
  notes: {},
};

export function parsePreferences(value: string | null): Preferences {
  try {
    const parsed = preferenceSchema.parse(JSON.parse(value || "{}"));
    parsed.favorites = [...new Set(parsed.favorites)].filter((id) =>
      recordById.has(id),
    );
    parsed.history = [...new Set(parsed.history)]
      .filter((id) => recordById.has(id))
      .slice(0, 6);
    return parsed;
  } catch {
    return { ...emptyPreferences };
  }
}
