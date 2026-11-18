import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDownToLine } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import type { Locale } from "../data/schema";
import { messages } from "../i18n";

const updateDialogId = "app-update-dialog";
const OpenUpdateContext = createContext<(() => void) | null>(null);

export function UpdateButton({ label }: { label: string }) {
  const openUpdate = useContext(OpenUpdateContext);
  if (!openUpdate) return null;
  return (
    <button
      type="button"
      className="update-trigger"
      aria-label={label}
      title={label}
      aria-haspopup="dialog"
      aria-controls={updateDialogId}
      onClick={openUpdate}
    >
      <ArrowDownToLine size={23} aria-hidden="true" />
    </button>
  );
}

export function UpdatePrompt({ locale, deferAutomatic, children }: {
  locale: Locale;
  deferAutomatic: boolean;
  children: ReactNode;
}) {
  const t = messages[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const reloading = useRef(false);
  const [presentation, setPresentation] = useState<"automatic" | "manual" | "later">("automatic");
  const openUpdate = useCallback(() => setPresentation("manual"), []);
  const [state, setState] = useState<"idle" | "updating" | "error">("idle");
  const updating = state === "updating";
  const reloadPage = () => {
    if (reloading.current) return;
    reloading.current = true;
    window.location.reload();
  };
  const { needRefresh: [available], updateServiceWorker } = useRegisterSW({ onNeedReload: reloadPage });

  async function applyUpdate() {
    if (updating) return;
    setState("updating");
    const workers = navigator.serviceWorker;
    try {
      const registration = await workers.getRegistration();
      if (!registration?.waiting) {
        reloadPage();
        return;
      }
      // Workbox can classify a waiting worker as external to this tab.
      workers.addEventListener("controllerchange", reloadPage, { once: true });
      await updateServiceWorker(true);
    } catch {
      workers.removeEventListener("controllerchange", reloadPage);
      setState("error");
    }
  }

  const showDialog = available && (updating || presentation === "manual" || (presentation === "automatic" && !deferAutomatic));
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (showDialog) {
      if (!element.open) element.showModal();
    } else if (element.open) {
      element.close();
    }
  }, [showDialog]);

  return (
    <OpenUpdateContext.Provider value={available ? openUpdate : null}>
      {children}
      <dialog
        id={updateDialogId}
        ref={dialog}
        className="update-dialog"
        aria-labelledby="update-title"
        aria-describedby="update-description"
        onCancel={event => {
          if (updating) event.preventDefault();
          else setPresentation("later");
        }}
      >
        <div className="update-symbol" aria-hidden="true"><ArrowDownToLine size={26} /></div>
        <h2 id="update-title">{t.update}</h2>
        <p id="update-description" role="status">{state === "error" ? t.updateError : t.updateDescription}</p>
        <div className="update-actions">
          <button type="button" autoFocus disabled={updating} onClick={() => setPresentation("later")}>
            {t.updateLater}
          </button>
          <button
            type="button"
            className="update-confirm"
            aria-disabled={updating || undefined}
            onClick={applyUpdate}
          >
            {updating ? t.updating : t.updateAction}
          </button>
        </div>
      </dialog>
    </OpenUpdateContext.Provider>
  );
}
