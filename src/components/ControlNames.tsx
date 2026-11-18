import { controlById } from "../data/schema";

const names = Array.from(controlById.values(), ({ hardware }) => hardware);
const literals = [...names, "Seç/Saat", "Seç/saat", "dial"]
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const word = String.raw`[\p{L}\p{N}-]`;
const controlName = new RegExp(
  `(?<!${word})(Çevirme [Dd]üğmesi(?=(?:ni|yle)?(?!${word}))|(?:${literals})(?!${word}))`,
  "gu",
);

export function ControlNames({ text }: { text: string }) {
  return text.split(controlName).map((part, index) =>
    index % 2 ? <span className="control-name" key={index}>{part}</span> : part,
  );
}
