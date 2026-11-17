import { controlById, type ApplianceRecord, type ControlAction, type Locale } from "./data/schema.ts";
import { messages } from "./i18n.ts";

export function guidedActions(record: ApplianceRecord) {
  return record.sequence.filter(({ type }) => type !== "open_door" && type !== "close_door");
}

export function instructionText(
  action: ControlAction,
  locale: Locale,
  parameters: Record<string, string> = {},
): string {
  if (action.message) return action.message[locale];
  const text = messages[locale];
  const control = controlById.get(action.control || "")?.hardware || "";
  const value =
    action.value ||
    (action.parameter ? parameters[action.parameter] : "") ||
    "";
  switch (action.type) {
    case "confirm_selection":
      return text.confirm;
    case "rotate_dial_to":
      return `${text.rotate} ${value || (action.parameter === "hour" ? text.hour : text.minute)}.`;
    case "set_weight":
      return `${text.setWeight}${value ? ` · ${value}` : ""}.`;
    case "set_servings":
      return `${text.setServings} · ${value}.`;
    case "set_duration":
      return `${text.setDuration}${value ? ` · ${value}` : ""}.`;
    case "hold_button":
      return `${control} · ${text.hold} ${value}.`;
    case "open_door":
      return text.openDoor;
    case "close_door":
      return text.closeDoor;
    case "turn_food":
      return text.turnFood;
    case "wait_for_signal":
      return text.wait;
    default:
      return locale === "tr"
        ? `${control} ${text.press}`
        : `${text.press} ${control}.`;
  }
}
