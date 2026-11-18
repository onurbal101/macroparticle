import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import type { Locale } from "../data/schema";
import { messages } from "../i18n";

export function UpdateDialog({ locale, blocked }: { locale: Locale; blocked: boolean }) {
  const t = messages[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const reloading = useRef(false);
  const [dismissed, setDismissed] = useState(false);
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

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (available && !dismissed && (!blocked || updating)) {
      if (!element.open) element.showModal();
    } else if (element.open) {
      element.close();
    }
  }, [available, blocked, dismissed, updating]);

  return (
    <dialog
      ref={dialog}
      className="update-dialog"
      aria-labelledby="update-title"
      aria-describedby="update-description"
      onCancel={event => {
        if (updating) event.preventDefault();
        else setDismissed(true);
      }}
    >
      <div className="update-symbol" aria-hidden="true"><ArrowDownToLine size={26} /></div>
      <h2 id="update-title">{t.update}</h2>
      <p id="update-description" role="status">{state === "error" ? t.updateError : t.updateDescription}</p>
      <div className="update-actions">
        <button type="button" autoFocus disabled={updating} onClick={() => setDismissed(true)}>
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
  );
}
