import { useEffect, useState } from "react";
import type { ApplianceRecord, Locale } from "./data/schema";

// Instants stay in UTC milliseconds. Only presentation uses the user's zone.
export function useUtcNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return now;
}

export function localClock(utc: number, locale: Locale, hour12 = false) {
  const clock = new Intl.DateTimeFormat(locale, {
    hour: "2-digit", minute: "2-digit", hourCycle: hour12 ? "h12" : "h23",
  });
  return clock.formatToParts(utc)
    .filter(({ type }) => type === "hour" || type === "minute")
    .map(({ value }) => value)
    .join(":");
}

export function formatSeconds(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function programmeDuration(record: ApplianceRecord, quantity?: number) {
  const match = record.durationVariants.find((entry) => entry.quantity === (quantity ?? null))
    ?? record.durationVariants.find((entry) => entry.quantity === null);
  return match?.seconds ?? record.manualSettings?.durationMin ??
    (record.id === "deodorization" ? 300 : record.id === "quick-start" ? 30 : null);
}
