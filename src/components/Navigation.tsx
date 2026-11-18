import { memo, useLayoutEffect, useRef, useState } from "react";
import { m, useReducedMotionConfig } from "motion/react";
import { BookOpen, List, Microwave, Search, UserRound } from "lucide-react";
import type { Locale } from "../data/schema";
import { messages } from "../i18n";

export type Section = "programs" | "guide" | "simulation" | "account";
export const tabs = [
  { path: "/programs", key: "programs", icon: List },
  { path: "/simulation", key: "simulation", icon: Microwave },
  { path: "/guide", key: "guide", icon: BookOpen },
  { path: "/account", key: "account", icon: UserRound },
] as const;

type Indicator = { x: number; top: number; width: number; height: number; instant?: boolean };

// Route and preference changes stay outside this persistent navigation view.
export const Navigation = memo(function Navigation({ section, locale, onNavigate, onSearch }: {
  section: Section;
  locale: Locale;
  onNavigate: (path: string, section: Section) => void;
  onSearch: () => void;
}) {
  const t = messages[locale];
  const nav = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<Indicator>();
  const reducedMotion = useReducedMotionConfig();
  useLayoutEffect(() => {
    const element = nav.current;
    if (!element) return;
    const measure = () => {
      const active = element.querySelector<HTMLElement>('a[aria-current="page"]');
      if (!active) return;
      const bounds = active.getBoundingClientRect();
      const container = element.getBoundingClientRect();
      const next = {
        x: bounds.left - container.left - element.clientLeft,
        top: bounds.top - container.top - element.clientTop + 1,
        width: bounds.width, height: bounds.height - 2,
      };
      setIndicator(previous => {
        if (previous && previous.x === next.x && previous.top === next.top &&
            previous.width === next.width && previous.height === next.height) return previous;
        return { ...next, instant: !previous };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const link of element.querySelectorAll("a")) observer.observe(link);
    return () => observer.disconnect();
  }, [section, locale]);
  return (
    <div className="floating-dock">
      <svg className="dock-optics" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="dock-refraction" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence baseFrequency="0.016 0.034" numOctaves="1" seed="7" result="ripples" />
            <feDisplacementMap in="SourceGraphic" in2="ripples" scale="12" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <nav ref={nav} className="main-nav" aria-label={t.navigation} data-indicator-ready={!!indicator}>
        <m.span
          className="active-glass"
          aria-hidden="true"
          initial={false}
          style={{ top: indicator?.top, height: indicator?.height, visibility: indicator ? "visible" : "hidden" }}
          animate={{ x: indicator?.x ?? 0, width: indicator?.width ?? 0 }}
          transition={reducedMotion || indicator?.instant ? { duration: 0 } : { type: "spring", stiffness: 440, damping: 36, mass: 0.8 }}
        />
        {tabs.map(({ path, key, icon: Icon }) => (
          <a key={key} href={path} className={section === key ? "active" : ""}
            aria-label={t[key]}
            aria-current={section === key ? "page" : undefined}
            onClick={event => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onNavigate(path, key);
            }}
          >
            <Icon size={24} aria-hidden="true" />
            <span className="tab-label">{t[key]}</span>
          </a>
        ))}
      </nav>
      <button type="button" className="floating-search" onClick={onSearch} aria-label={t.searchShort}
        aria-haspopup="dialog" aria-controls="search-sheet">
        <Search size={27} aria-hidden="true" />
      </button>
    </div>
  );
});
