import { useEffect, useLayoutEffect, useRef } from "react";
import { controlById, type Locale } from "../data/schema";
import { simulatorDisplay, simulatorRecord, type useSimulator } from "../simulator";
import { useUtcNow } from "../time";
import { ControlPanel } from "./ControlPanel";
import { ProgrammeInformation } from "./ProgrammeInformation";

const copy = {
  tr: {
    running: "Çalışıyor",
    paused: "Duraklatıldı",
    complete: "Tamamlandı",
    locked: "Kilitli · Child Lock: 3 sn",
    eco: "Ekran kapalı",
    emptyMemory: "Hafıza boş",
    groups: ["Sağlıklı", "Asya"],
    information: "Program bilgisi",
  },
  en: {
    running: "Running",
    paused: "Paused",
    complete: "Complete",
    locked: "Locked · Child Lock: 3 sec",
    eco: "Display off",
    emptyMemory: "Memory empty",
    groups: ["Healthy", "Asian"],
    information: "Programme information",
  },
};

export function Simulator({ locale, machine, initialControl }: {
  locale: Locale; machine: ReturnType<typeof useSimulator>; initialControl?: string;
}) {
  const { state, dispatch } = machine;
  const c = copy[locale];
  const now = useUtcNow();
  const appliedControl = useRef<string | undefined>(undefined);
  const information = useRef<HTMLElement>(null);
  useEffect(() => {
    if (initialControl && initialControl !== appliedControl.current && controlById.has(initialControl)) {
      appliedControl.current = initialControl;
      dispatch({ type: "press", id: initialControl, now: Date.now() });
    }
  }, [initialControl, dispatch]);
  const selected = controlById.get(state.selected ?? "");
  const record = state.phase === "group" ? undefined : simulatorRecord(state);
  useLayoutEffect(() => {
    if (information.current) information.current.scrollTop = 0;
  }, [record?.id]);
  let status: string | undefined;
  if (state.locked) status = c.locked;
  else if (state.eco) status = c.eco;
  else if (state.status !== "idle") status = c[state.status];
  else if (state.phase === "group") status = c.groups[state.group - 1];
  else if (state.phase === "memory" && !state.saving && !state.memories[state.slot])
    status = c.emptyMemory;

  return (
    <div className="simulation-explorer">
      <ControlPanel
        locale={locale}
        active={state.locked ? "child-lock" : state.mode ?? state.selected}
        display={simulatorDisplay(state, now, locale)}
        dialRotation={state.dialRotation}
        label={locale === "tr" ? "Mikrodalga" : "Microwave"}
        onSelect={(id) => dispatch({ type: "press", id, now: Date.now() })}
        onAdjust={(direction) => dispatch({ type: "adjust", direction, now: Date.now() })}
        onLock={() => dispatch({ type: "lock" })}
        locked={state.locked}
      />
      <section ref={information} className="simulation-information" tabIndex={0} aria-label={c.information}>
        <div className="surface control-detail">
          <div aria-live="polite" aria-atomic="true">
            <h2>{record?.title[locale] ?? selected?.name[locale] ?? (locale === "tr" ? "Mikrodalga" : "Microwave")}</h2>
            {status && <p className="simulator-status">{status}</p>}
          </div>
          {record && <ProgrammeInformation record={record} locale={locale} embedded />}
        </div>
      </section>
    </div>
  );
}
