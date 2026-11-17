import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import type { Locale } from "../data/schema";

const holdMilliseconds = 3000;
const isHoldKey = (key: string) => key === " " || key === "Enter";

export function ChildLockKey({ locked, label, locale, onToggle, onSelect }: {
  locked: boolean;
  label: string;
  locale: Locale;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const hintId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedHold = useRef(false);
  const [holding, setHolding] = useState(false);
  const [confirmation, setConfirmation] = useState(0);

  const cancelHold = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => { if (document.hidden) cancelHold(); };
    window.addEventListener("blur", cancelHold);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", cancelHold);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [cancelHold]);

  const beginHold = () => {
    if (timer.current !== null) return;
    completedHold.current = false;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      completedHold.current = true;
      setHolding(false);
      setConfirmation((value) => value + 1);
      onToggle();
    }, holdMilliseconds);
  };

  const Icon = locked ? LockKeyhole : LockKeyholeOpen;
  return (
    <>
      <button
        type="button"
        className="panel-key child-lock-key"
        aria-label={label}
        aria-describedby={hintId}
        aria-pressed={locked}
        data-hold={holding ? locked ? "unlock" : "lock" : undefined}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          beginHold();
        }}
        onPointerMove={(event) => {
          if (!event.isPrimary || timer.current === null) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) cancelHold();
        }}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onLostPointerCapture={cancelHold}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (!isHoldKey(event.key)) return;
          event.preventDefault();
          if (!event.repeat) beginHold();
        }}
        onKeyUp={(event) => {
          if (!isHoldKey(event.key)) return;
          event.preventDefault();
          cancelHold();
        }}
        onBlur={cancelHold}
        onClick={() => {
          if (!completedHold.current) onSelect();
        }}
      >
        <span className="child-lock-label">
          <Icon size={18} aria-hidden="true" />
          <span lang="en">{label}</span>
        </span>
        <span className="child-lock-fill" aria-hidden="true">
          <span className="child-lock-label">
            <Icon size={18} aria-hidden="true" />
            <span data-fill-label={label} />
          </span>
        </span>
        {confirmation > 0 && <span key={confirmation} className="child-lock-confirmation" aria-hidden="true" />}
      </button>
      <span id={hintId} className="sr-only">
        {locale === "tr" ? "3 saniye basılı tut." : "Hold for 3 seconds."}
      </span>
    </>
  );
}
