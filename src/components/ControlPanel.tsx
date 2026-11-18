import {
  Clock3,
  CookingPot,
  Fan,
  LockKeyholeOpen,
  Microwave,
  Play,
  Minus,
  Plus,
  Snowflake,
  Square,
  Star,
  Waves,
  WavesVertical,
} from "lucide-react";
import { knowledge } from "../data/schema";
import { m as motion, useReducedMotionConfig } from "motion/react";
import { localClock, useUtcNow } from "../time";
import type { Locale } from "../data/schema";
import { ChildLockKey } from "./ChildLockKey";

const controlIcons = [
  WavesVertical,
  CookingPot,
  Snowflake,
  Waves,
  Microwave,
  Fan,
  LockKeyholeOpen,
  Star,
];

function LocalPanelClock({ locale }: { locale: Locale }) {
  return localClock(useUtcNow(), locale);
}

export function ControlPanel({
  active,
  onSelect,
  label,
  display,
  locale = "tr",
  onAdjust,
  onLock,
  locked = false,
  dialRotation = 0,
}: {
  active?: string | null;
  onSelect?: (id: string) => void;
  label: string;
  display?: string;
  locale?: Locale;
  onAdjust?: (direction: number) => void;
  onLock?: () => void;
  locked?: boolean;
  dialRotation?: number;
}) {
  const reducedMotion = useReducedMotionConfig();
  const Key = onSelect ? "button" : "div";
  const buttonClass = (id: string) =>
    `panel-key ${active === id ? "highlighted" : ""}`;
  const keyProps = (id: string) => ({
    type: onSelect ? "button" as const : undefined,
    "aria-pressed": onSelect ? active === id : undefined,
    "aria-current": !onSelect && active === id ? true : undefined,
    onClick: onSelect ? () => onSelect(id) : undefined,
  });
  const adjust = (direction: number) =>
    onSelect ? () => onAdjust ? onAdjust(direction) : onSelect("dial") : undefined;
  return (
    <div
      className="control-panel"
      role="group"
      aria-label={label}
    >
      <div className="panel-display" role="timer" aria-label={locale === "tr" ? "Ekran" : "Display"}>
        {display ?? <LocalPanelClock locale={locale} />}
      </div>
      <div className="panel-grid">
        {knowledge.controls.slice(0, 8).map((control, index) => {
          if (control.id === "child-lock" && onLock && onSelect) {
            return (
              <ChildLockKey
                key={control.id}
                locked={locked}
                label={control.hardware}
                locale={locale}
                onToggle={onLock}
                onSelect={() => onSelect(control.id)}
              />
            );
          }
          const Icon = controlIcons[index];
          return (
            <Key
              key={control.id}
              className={buttonClass(control.id)}
              {...keyProps(control.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span lang="en">{control.hardware}</span>
            </Key>
          );
        })}
      </div>
      <div className="panel-adjustments">
        <div className="dial-row">
          <Key
            className="dial-adjust"
            aria-label={locale === "tr" ? "Azalt" : "Decrease"}
            aria-hidden={!onSelect || undefined}
            onClick={adjust(-1)}
          >
            <Minus size={25} aria-hidden="true" />
          </Key>
          <motion.div
            className={`dial ${active === "dial" ? "highlighted" : ""}`}
            aria-hidden="true"
            initial={false}
            animate={{ rotate: dialRotation }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
          >
            <span />
          </motion.div>
          <Key className="dial-adjust" aria-label={locale === "tr" ? "Artır" : "Increase"}
            aria-hidden={!onSelect || undefined}
            onClick={adjust(1)}>
            <Plus size={25} aria-hidden="true" />
          </Key>
        </div>
        <div className="select-row">
          <Key
            className={`select-key ${active === "select-clock" ? "highlighted" : ""}`}
            aria-label="Seç/Saat / Select/Clock"
            {...keyProps("select-clock")}
          >
            <Clock3 size={17} aria-hidden="true" />
            <span lang="en">Select / Clock</span>
          </Key>
        </div>
      </div>
      <div className="panel-grid panel-bottom">
        <Key
          className={buttonClass("stop")}
          {...keyProps("stop")}
        >
          <Square size={16} aria-hidden="true" />
          <span>STOP / ECO</span>
        </Key>
        <Key
          className={buttonClass("start")}
          {...keyProps("start")}
        >
          <Play size={16} aria-hidden="true" />
          <span>START / +30s</span>
        </Key>
      </div>
    </div>
  );
}
