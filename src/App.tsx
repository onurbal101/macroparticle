import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import {
  MotionConfig,
  LazyMotion,
  domAnimation,
  AnimatePresence,
  m as motion,
  useReducedMotionConfig,
} from "motion/react";
import {
  Link as RouterLink,
  type LinkProps,
  type Location as RouterLocation,
  useNavigationType,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ChevronLeft,
  CookingPot,
  ExternalLink,
  WavesVertical,
  Languages,
  Microwave,
  Monitor,
  PersonStanding,
  Search as SearchIcon,
  ShieldCheck,
  Snowflake,
  Star,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  knowledge,
  controlById,
  recordById,
  quantityText,
  type ApplianceRecord,
  type Locale,
} from "./data/schema";
import { messages, type MessageKey } from "./i18n";
import { parsePreferences, storageKey, type Preferences } from "./storage";
import { guidedActions, instructionText } from "./instructions";
import { search } from "./search";
import { ProgrammeInformation } from "./components/ProgrammeInformation";
import { Disclosure } from "./components/Disclosure";
import { ControlPanel } from "./components/ControlPanel";
import { Simulator } from "./components/Simulator";
import { PageMetadata } from "./components/PageMetadata";
import { UpdateDialog } from "./components/UpdateDialog";
import { Navigation, tabs, type Section } from "./components/Navigation";
import { useSimulator } from "./simulator";
import { formatSeconds, programmeDuration } from "./time";

type AppContext = {
  locale: Locale;
  t: (key: MessageKey) => string;
  preferences: Preferences;
  change: (update: (previous: Preferences) => Preferences) => void;
  machine: ReturnType<typeof useSimulator>;
};
const Context = createContext<AppContext>(null!);
const useApp = () => useContext(Context);
const motionQuery = "(prefers-reduced-motion: reduce)";
const getSystemMotion = () => window.matchMedia(motionQuery).matches;
const subscribeToSystemMotion = (update: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
};
const motionLabels = { system: "motionSystem", off: "motionOff", on: "motionOn" } as const;
const functions = [
  "quick-defrost",
  "auto-cook",
  "healthy-steam",
  "microwave",
  "keep-warm",
  "other",
] as const;

type NavigationState = {
  tab?: Section;
  background?: RouterLocation;
};

const isSimulator = (pathname: string) =>
  /^\/(simulation|controls|guide\/controls)(\/|$)/.test(pathname);

function sectionFor(location: RouterLocation): Section {
  if (isSimulator(location.pathname)) return "simulation";
  const state = location.state as NavigationState | null;
  if (state?.tab) return state.tab;
  if (
    location.pathname.startsWith("/account") ||
    location.pathname === "/favorites"
  )
    return "account";
  if (location.pathname.startsWith("/guide"))
    return "guide";
  return "programs";
}

function Link({ state, ...props }: LinkProps) {
  const location = useLocation();
  return (
    <RouterLink
      {...props}
      state={{
        tab: sectionFor(location),
        ...state,
      }}
    />
  );
}

function MenuBack({ fallback = "/programs" }: { fallback?: string }) {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      className="back-link"
      onClick={() => {
        if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
        else
          navigate(fallback, {
            replace: true,
            state: { tab: sectionFor(location) },
          });
      }}
    >
      <ChevronLeft size={25} aria-hidden="true" />
      {t("back")}
    </button>
  );
}

function PageScreen({
  children,
  offset,
  location,
  positions,
  restore,
}: {
  children: ReactNode;
  offset: number;
  location: RouterLocation;
  positions: Map<string, number>;
  restore: boolean;
}) {
  const reducedMotion = useReducedMotionConfig();
  const view = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    window.scrollTo(0, restore ? positions.get(location.key) || 0 : 0);
    const heading = view.current?.querySelector<HTMLHeadingElement>("h1");
    heading?.focus({ preventScroll: true });
    return () => {
      positions.set(location.key, window.scrollY);
    };
  }, [location.key]);
  return (
    <motion.div
      ref={view}
      className={isSimulator(location.pathname) ? "page-view simulation-view" : "page-view"}
      initial={!reducedMotion && offset ? { x: offset, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes({ location }: { location: RouterLocation }) {
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const tabIndex = tabs.findIndex(({ key }) => key === sectionFor(location));
  const historyIndex = typeof window === "undefined" ? 0 : window.history.state?.idx ?? 0;
  const previous = useRef({ key: location.key, tabIndex, historyIndex });
  let offset = 0;
  if (previous.current.key !== location.key) {
    const tabChange = tabIndex - previous.current.tabIndex;
    offset = tabChange
      ? 36 * Math.sign(tabChange)
      : historyIndex < previous.current.historyIndex ? -52 : 52;
  }
  useLayoutEffect(() => {
    previous.current = { key: location.key, tabIndex, historyIndex };
  }, [location.key]);
  return (
    <PageScreen
      key={location.key}
      offset={offset}
      location={location}
      positions={positions.current}
      restore={navigationType === "POP"}
    >
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/programs" element={<Home />} />
        <Route path="/programs/all" element={<ProgramList />} />
        <Route path="/functions/:functionId" element={<ProgramList />} />
        <Route path="/programs/:id" element={<RecordPage />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/simulation/:controlId?" element={<SimulationPage />} />
        <Route path="/guide/controls/:controlId" element={<SimulationPage />} />
        <Route path="/controls/:controlId?" element={<SimulationPage />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/favorites" element={<Favorites />} />
        <Route path="/account/appearance" element={<AppearanceSettings />} />
        <Route path="/account/reduce-motion" element={<MotionSettings />} />
        <Route path="/account/language" element={<LanguageSettings />} />
        <Route
          path="/favorites"
          element={<Navigate to="/account/favorites" replace />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageScreen>
  );
}

function SearchSheet({
  dialog,
  input,
  onDismiss,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  input: RefObject<HTMLInputElement | null>;
  onDismiss: () => void;
}) {
  const { t, locale } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const query =
    location.pathname === "/search"
      ? new URLSearchParams(location.search).get("q") || ""
      : "";
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => search(deferredQuery), [deferredQuery]);
  const [editing, setEditing] = useState(false);
  const backdropPress = useRef(false);
  const canEdit = results.some((result) => result.kind !== "control");
  const locationRef = useRef(location);
  locationRef.current = location;
  useLayoutEffect(() => {
    const sheet = dialog.current;
    if (location.pathname === "/search" && sheet && !sheet.open) {
      sheet.showModal();
      input.current?.focus({ preventScroll: true });
    } else if (location.pathname !== "/search" && sheet?.open) {
      sheet.close();
    }
  }, [location.pathname, dialog, input]);
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const sheet = dialog.current;
    if (location.pathname !== "/search" || !viewport || !sheet) return;
    const updatePosition = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      sheet.style.setProperty("--search-viewport-offset", `${offset}px`);
      sheet.style.setProperty("--search-viewport-height", `${viewport.height}px`);
    };
    updatePosition();
    viewport.addEventListener("resize", updatePosition);
    viewport.addEventListener("scroll", updatePosition);
    return () => {
      viewport.removeEventListener("resize", updatePosition);
      viewport.removeEventListener("scroll", updatePosition);
    };
  }, [location.pathname, dialog]);
  const setQuery = (value: string) =>
    navigate(`/search?q=${encodeURIComponent(value)}`, {
      replace: true,
      state: location.state,
    });
  const hitsBackdrop = (event: { target: EventTarget; currentTarget: HTMLDialogElement; clientX: number; clientY: number }) => {
    if (event.target !== event.currentTarget) return false;
    const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
    return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
  };
  return (
    <dialog
      id="search-sheet"
      className="search-sheet"
      closedby="any"
      ref={dialog}
      aria-label={t("searchShort")}
      onPointerDown={event => {
        if (!("closedBy" in event.currentTarget)) backdropPress.current = hitsBackdrop(event);
      }}
      onPointerCancel={() => { backdropPress.current = false; }}
      onClick={event => {
        if (backdropPress.current && hitsBackdrop(event)) event.currentTarget.close();
        backdropPress.current = false;
      }}
      onClose={() => {
        setEditing(false);
        if (locationRef.current.pathname !== "/search") return;
        onDismiss();
        if (
          (locationRef.current.state as NavigationState | null)?.background &&
          (window.history.state?.idx ?? 0) > 0
        )
          navigate(-1);
        else navigate("/programs", { replace: true });
      }}
    >
      <form
        className="search-toolbar"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="search-box">
          <SearchIcon size={22} aria-hidden="true" />
          <input
            ref={input}
            type="search"
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            aria-label={t("search")}
            placeholder={t("searchShort")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label={t("clear")}
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
            >
              <X size={19} aria-hidden="true" />
            </button>
          )}
        </div>
        {(editing || canEdit) && <FavoriteModeButton editing={editing} onToggle={() => setEditing(!editing)} />}
        <button
          type="button"
          className="search-cancel"
          onClick={() => dialog.current?.close()}
        >
          {t("cancel")}
        </button>
      </form>
      <p className="sr-only" role="status" aria-atomic="true">
        {deferredQuery && query === deferredQuery ? `${results.length} ${locale === "tr" ? "sonuç" : "results"}` : ""}
      </p>
      <div className="search-results" aria-busy={query !== deferredQuery}>
        {deferredQuery && !results.length && (
          <p className="empty-state">{t("noResults")}</p>
        )}
        {results.length > 0 && (
          <ul className="menu-list" role="list">
            {results.map((result) => {
              const content = <>
                {result.code ? (
                  <span className="result-code">{result.code}</span>
                ) : (
                  <BookOpen size={23} aria-hidden="true" />
                )}
                <span>{result.title[locale]}</span>
              </>;
              return result.kind === "control"
                ? <li className="search-row" key={result.path}><Link to={result.path}>{content}</Link></li>
                : <FavoriteRow
                    key={result.path}
                    className="search-row"
                    id={result.id}
                    path={result.path}
                    editing={editing}
                    name={result.title[locale]}
                  >{content}</FavoriteRow>;
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}

export default function App() {
  const [preferences, setPreferences] = useState(() => parsePreferences(null));
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  useLayoutEffect(() => {
    try {
      setPreferences(parsePreferences(localStorage.getItem(storageKey)));
    } catch {
      setPreferences(parsePreferences(null));
    }
    setPreferencesLoaded(true);
  }, []);
  const [storageError, setStorageError] = useState(false);
  const locale = preferences.locale;
  const t = (key: MessageKey) => messages[locale][key];
  const machine = useSimulator();
  const systemReducesMotion = useSyncExternalStore(subscribeToSystemMotion, getSystemMotion, () => false);
  const reduceMotion = preferences.reduceMotion === "on" || (preferences.reduceMotion === "system" && systemReducesMotion);
  useLayoutEffect(() => {
    if (preferencesLoaded) document.documentElement.dataset.reduceMotion = preferences.reduceMotion;
  }, [preferences.reduceMotion, preferencesLoaded]);
  useLayoutEffect(() => {
    if (!preferencesLoaded) return;
    const scheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (scheme) scheme.content = preferences.theme === "system" ? "light dark" : preferences.theme;
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const updateColor = () => {
      const dark = preferences.theme === "dark" || (preferences.theme === "system" && system.matches);
      const color = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (color) color.content = dark ? "#141319" : "#f2f2f7";
    };
    updateColor();
    system.addEventListener("change", updateColor);
    return () => system.removeEventListener("change", updateColor);
  }, [preferences.theme, preferencesLoaded]);
  useEffect(() => {
    const syncPreferences = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== storageKey && event.key !== null)) return;
      setPreferences(parsePreferences(event.newValue));
    };
    window.addEventListener("storage", syncPreferences);
    return () => window.removeEventListener("storage", syncPreferences);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    if (!preferencesLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      setStorageError(true);
    }
  }, [preferences, locale, preferencesLoaded]);
  const location = useLocation();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const navigation = useRef({ location, navigate });
  useLayoutEffect(() => { navigation.current = { location, navigate }; }, [location, navigate]);
  const selectTab = useCallback((path: string, section: Section) => {
    const { location, navigate } = navigation.current;
    if (location.pathname.replace(/\/$/, "") === path ||
        (section === "programs" && location.pathname === "/") ||
        (section === "simulation" && isSimulator(location.pathname))) return;
    navigate(path, { state: { tab: section } });
  }, []);
  const openSearch = useCallback(() => {
    const { location, navigate } = navigation.current;
    if (location.pathname === "/search") return;
    // Commit the route and focus the input within the user's tap.
    flushSync(() => {
      navigate("/search", { state: { background: location, tab: sectionFor(location) } });
    });
  }, []);
  const restoreSearchFocus = useRef(false);
  useLayoutEffect(() => {
    if (location.pathname !== "/search" && restoreSearchFocus.current) {
      restoreSearchFocus.current = false;
      document.querySelector<HTMLButtonElement>(".floating-search")?.focus({ preventScroll: true });
    }
  }, [location.key]);
  const state = location.state as NavigationState | null;
  const background =
    location.pathname === "/search"
      ? state?.background || {
          pathname: "/programs",
          search: "",
          hash: "",
          key: "search-background",
          state: null,
        }
      : location;
  return (
    <Context.Provider
      value={{ locale, t, preferences, change: setPreferences, machine }}
    >
      <PageMetadata locale={locale} />
      <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
        <LazyMotion features={domAnimation} strict>
          <a className="skip-link" href="#content">
            {t("skip")}
          </a>
          <div className="app-shell">
            <main id="content" className="page-stage" tabIndex={-1}>
              {storageError && (
                <p className="notice" role="status">
                  {t("storageError")}
                </p>
              )}
              <AnimatedRoutes location={background} />
            </main>
            <Navigation
              section={sectionFor(location)}
              locale={locale}
              onNavigate={selectTab}
              onSearch={openSearch}
            />
            <div className="search-backdrop" aria-hidden="true" />
            <SearchSheet dialog={dialog} input={input} onDismiss={() => { restoreSearchFocus.current = true; }} />
            <UpdateDialog locale={locale} blocked={location.pathname === "/search" || (isSimulator(location.pathname) && machine.state.status === "running")} />
          </div>
        </LazyMotion>
      </MotionConfig>
    </Context.Provider>
  );
}

function PageHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <h1 tabIndex={-1}>{title}</h1>
      {action}
    </div>
  );
}

function Home() {
  const { t } = useApp();
  const tasks = [
    {
      key: "defrost",
      path: "/functions/quick-defrost",
      icon: Snowflake,
      color: "blue",
    },
    {
      key: "cook",
      path: "/functions/auto-cook",
      icon: CookingPot,
      color: "rose",
    },
    {
      key: "steam",
      path: "/functions/healthy-steam",
      icon: WavesVertical,
      color: "green",
    },
    {
      key: "heat",
      path: "/functions/microwave",
      icon: Microwave,
      color: "apricot",
    },
    { key: "warm", path: "/programs/keep-warm", icon: Waves, color: "sand" },
  ] as const;
  return (
    <>
      <PageHeading title={t("programs")} />
      <ul className="menu-list task-list" role="list">
        {tasks.map(({ key, path, icon: Icon, color }) => (
          <li key={key}>
            <Link className="task-row" to={path}>
              <span className={`task-icon ${color}`}>
                <Icon size={28} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h2>{t(key)}</h2>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function FavoriteModeButton({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  const { t } = useApp();
  const reducedMotion = useReducedMotionConfig();
  return (
    <motion.button
      type="button"
      className="favorite-mode-button"
      aria-label={t("editFavorites")}
      aria-pressed={editing}
      onClick={onToggle}
      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
      transition={{ duration: 0.12 }}
    >
      <motion.span initial={false} animate={{ scale: editing && !reducedMotion ? 1.06 : 1 }} transition={{ duration: 0.12 }}>
        <Star size={25} fill={editing ? "currentColor" : "transparent"} aria-hidden="true" />
      </motion.span>
    </motion.button>
  );
}

function FavoriteStar({ saved, decorative = false }: { saved: boolean; decorative?: boolean }) {
  const { t } = useApp();
  const reducedMotion = useReducedMotionConfig();
  return (
    <motion.span
      className={`favorite-star${saved ? " saved" : ""}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : t("favorites")}
      initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.8 }}
      transition={{ duration: reducedMotion ? 0 : 0.12, ease: "easeOut" }}
    >
      <Star size={24} fill={saved ? "currentColor" : "transparent"} aria-hidden="true" />
    </motion.span>
  );
}

function toggleFavorite(previous: Preferences, id: string): Preferences {
  return {
    ...previous,
    favorites: previous.favorites.includes(id)
      ? previous.favorites.filter((favorite) => favorite !== id)
      : [...previous.favorites, id],
  };
}

function ProgramFavorite({ id }: { id: string }) {
  const { preferences, change, t } = useApp();
  const saved = preferences.favorites.includes(id);
  const reducedMotion = useReducedMotionConfig();
  return (
    <motion.button
      type="button"
      className="favorite-mode-button program-favorite"
      aria-label={t("favorites")}
      aria-pressed={saved}
      onClick={() => change((previous) => toggleFavorite(previous, id))}
      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
      transition={{ duration: 0.12 }}
    >
      <Star size={25} fill={saved ? "currentColor" : "transparent"} aria-hidden="true" />
    </motion.button>
  );
}

function FavoriteRow({ id, path, className, name, editing, children }: {
  id: string;
  path: string;
  className: string;
  name: string;
  editing: boolean;
  children: ReactNode;
}) {
  const { preferences, change } = useApp();
  const saved = preferences.favorites.includes(id);
  return (
    <li className={`${className} favorite-row`}>
      {editing ? (
        <button
          className="favorite-row-toggle"
          aria-label={name}
          aria-pressed={saved}
          onClick={() => change((previous) => toggleFavorite(previous, id))}
        >
          {children}
        </button>
      ) : <Link to={path}>{children}</Link>}
      <AnimatePresence initial={false}>
        {(saved || editing) && <FavoriteStar key="star" saved={saved} decorative={editing} />}
      </AnimatePresence>
    </li>
  );
}

const recordIcons = {
  "healthy-steam": WavesVertical,
  "auto-cook": CookingPot,
  "quick-defrost": Snowflake,
  microwave: Microwave,
  "keep-warm": Waves,
  other: BookOpen,
};
function RecordGrid({
  records,
  headingLevel: Heading = "h3",
  editing,
}: {
  records: ApplianceRecord[];
  headingLevel?: "h2" | "h3";
  editing: boolean;
}) {
  const { locale } = useApp();
  return (
    <ul className="menu-list record-list" role="list">
      {records.map((record) => {
        const Icon = recordIcons[record.function];
        const Label = editing ? "span" : Heading;
        return (
          <FavoriteRow
            key={record.id}
            className="record-row"
            id={record.id}
            path={`/programs/${record.id}`}
            name={`${record.code ? `${record.code} · ` : ""}${record.title[locale]}`}
            editing={editing}
          >
            {record.code ? (
              <span className={record.groupCode ? "program-number grouped-code" : "program-number"}>
                {record.code}
              </span>
            ) : (
              <span className="row-symbol">
                <Icon size={26} aria-hidden="true" />
              </span>
            )}
            <Label className="record-name">{record.title[locale]}</Label>
          </FavoriteRow>
        );
      })}
    </ul>
  );
}

function RecordSection({ title, records, editing }: {
  title: string;
  records: ApplianceRecord[];
  editing: boolean;
}) {
  return (
    <section className="record-section">
      <h2>{title}</h2>
      <RecordGrid records={records} editing={editing} />
    </section>
  );
}

function ProgramList() {
  const { functionId } = useParams();
  const { t } = useApp();
  const [editing, setEditing] = useState(false);
  if (
    functionId &&
    !functions.includes(functionId as (typeof functions)[number])
  )
    return <NotFound />;
  const selected = functionId as (typeof functions)[number] | undefined;
  const records = knowledge.records.filter(
    (record) =>
      record.kind !== "article" && (!selected || record.function === selected),
  );
  return (
    <>
      <MenuBack />
      <PageHeading title={selected ? t(selected) : t("allPrograms")}
        action={<FavoriteModeButton editing={editing} onToggle={() => setEditing(!editing)} />} />
      {selected === "healthy-steam" ? (
        <>
          <RecordSection title={`1 · ${t("healthy")}`} records={records.filter((record) => record.groupCode === "1")} editing={editing} />
          <RecordSection title={`2 · ${t("asian")}`} records={records.filter((record) => record.groupCode === "2")} editing={editing} />
        </>
      ) : <RecordGrid records={records} headingLevel="h2" editing={editing} />}
    </>
  );
}

const languageNames: Record<Locale, string> = { tr: "Türkçe", en: "English" };

function SettingsLink({ to, label, value, icon: Icon, color }: {
  to: string;
  label: string;
  value?: string;
  icon: LucideIcon;
  color: "gold" | "indigo" | "blue";
}) {
  return (
    <li>
      <Link className="settings-link" to={to}>
        <span className={`settings-icon ${color}`}><Icon size={20} aria-hidden="true" /></span>
        <span>{label}</span>
        <span className="settings-value">{value}</span>
        <ChevronRight size={20} aria-hidden="true" />
      </Link>
    </li>
  );
}

function Account() {
  const { t, locale, preferences } = useApp();
  return (
    <div className="account-settings">
      <PageHeading title={t("account")} />
      <ul className="menu-list settings-list" role="list">
        <SettingsLink to="/account/favorites" label={t("favorites")} icon={Star} color="gold" />
      </ul>
      <ul className="menu-list settings-list" role="list">
        <SettingsLink to="/account/appearance" label={t("appearance")} value={t(preferences.theme)} icon={Monitor} color="indigo" />
        <SettingsLink to="/account/reduce-motion" label={t("reduceMotion")} value={t(motionLabels[preferences.reduceMotion])} icon={PersonStanding} color="indigo" />
        <SettingsLink to="/account/language" label={t("language")} value={languageNames[locale]} icon={Languages} color="blue" />
      </ul>
    </div>
  );
}

function Favorites() {
  const { t, preferences } = useApp();
  const [editing, setEditing] = useState(false);
  const [editList, setEditList] = useState<string[]>([]);
  const ids = new Set(editing ? editList : preferences.favorites);
  const favorites = knowledge.records.filter((record) => ids.has(record.id));
  const groups = functions.map((fn) => ({
    title: t(fn),
    records: favorites.filter((record) => record.function === fn && record.kind !== "article"),
  }));
  groups.push({ title: t("learn"), records: favorites.filter((record) => record.kind === "article") });
  const toggleEditing = () => {
    if (!editing) setEditList(preferences.favorites);
    setEditing(!editing);
  };
  return (
    <>
      <MenuBack fallback="/account" />
      <PageHeading title={t("favorites")} action={(editing || favorites.length > 0) &&
        <FavoriteModeButton editing={editing} onToggle={toggleEditing} />} />
      {favorites.length === 0 && <p className="empty-state">{t("noFavorites")}</p>}
      {groups.filter(({ records }) => records.length).map(({ title, records }) => (
        <RecordSection key={title} title={title} records={records} editing={editing} />
      ))}
    </>
  );
}

function AppearanceSettings() {
  const { t, preferences, change } = useApp();
  return (
    <div className="account-settings">
      <MenuBack fallback="/account" />
      <PageHeading title={t("appearance")} />
      <fieldset className="appearance-options" aria-label={t("appearance")}>
        {(["light", "dark", "system"] as const).map((theme) => (
          <label className="appearance-option" key={theme}>
            <input
              className="sr-only"
              type="radio"
              name="appearance"
              checked={preferences.theme === theme}
              onChange={() => change((previous) => ({ ...previous, theme }))}
            />
            <span className="appearance-preview" data-preview={theme} aria-hidden="true">
              <span className="preview-line" />
              <span className="preview-list"><span /><span /><span /></span>
              <span className="preview-dock" />
            </span>
            <span>{t(theme)}</span>
            <span className="appearance-check" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}

function LanguageSettings() {
  const { t, locale, change } = useApp();
  return (
    <div className="account-settings">
      <MenuBack fallback="/account" />
      <PageHeading title={t("language")} />
      <fieldset aria-label={t("language")}>
        <ul className="menu-list settings-list">
          {(["tr", "en"] as const).map((value) => (
            <li key={value}>
              <label className="settings-choice">
                <input
                  className="sr-only"
                  type="radio"
                  name="language"
                  checked={locale === value}
                  onChange={() => change((previous) => ({ ...previous, locale: value }))}
                />
                <span lang={value}>{languageNames[value]}</span>
                <Check size={21} strokeWidth={2.5} aria-hidden="true" />
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}

function MotionSettings() {
  const { t, preferences, change } = useApp();
  return (
    <div className="account-settings">
      <MenuBack fallback="/account" />
      <PageHeading title={t("reduceMotion")} />
      <fieldset aria-label={t("reduceMotion")}>
        <ul className="menu-list settings-list" role="list">
          {(["system", "off", "on"] as const).map(value => (
            <li key={value}>
              <label className="settings-choice">
                <input
                  className="sr-only"
                  type="radio"
                  name="reduce-motion"
                  checked={preferences.reduceMotion === value}
                  onChange={() => change(previous => ({ ...previous, reduceMotion: value }))}
                />
                <span>{t(motionLabels[value])}</span>
                <Check size={21} strokeWidth={2.5} aria-hidden="true" />
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}

function SourceDetails({ record }: { record: ApplianceRecord }) {
  const { t } = useApp();
  return (
    <Disclosure className="source-details" label={t("sources")}>
      {record.sources.map((reference, index) => {
        const source = knowledge.sources.find(
          (source) => source.id === reference.sourceId,
        )!;
        return (
          <a
            key={index}
            href={`${source.url}${reference.sourceId === "TR09" ? `#page=${reference.pages[0]}` : ""}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              {source.title}
              {reference.pages.length > 0 && (
                <small>
                  {t("sourcePage")} {[...new Set(reference.pages)].join(", ")}
                </small>
              )}
            </span>
            <ExternalLink size={18} aria-hidden="true" />
          </a>
        );
      })}
    </Disclosure>
  );
}

function RecordPage() {
  const { id } = useParams();
  const record = recordById.get(id || "");
  return record ? (
    <Instruction key={record.id} record={record} />
  ) : (
    <NotFound />
  );
}

function Instruction({ record }: { record: ApplianceRecord }) {
  const { t, locale, preferences, change } = useApp();
  const [step, setStep] = useState(0);
  const [compact, setCompact] = useState(false);
  const [power, setPower] = useState("800");
  const [duration, setDuration] = useState(
    record.manualSettings
      ? formatSeconds(record.manualSettings.durationMin)
      : "",
  );
  useEffect(() => {
    change((previous) =>
      previous.history[0] === record.id
        ? previous
        : {
            ...previous,
            history: [
              record.id,
              ...previous.history.filter((id) => id !== record.id),
            ].slice(0, 6),
          },
    );
  }, [record.id]);
  const durationParts = /^(\d{1,2}):([0-5]\d)$/.exec(duration);
  const durationSeconds = durationParts
    ? Number(durationParts[1]) * 60 + Number(durationParts[2])
    : 0;
  const validWarmDuration =
    record.id !== "keep-warm" ||
    (durationSeconds > 0 && durationSeconds <= record.durationLimitSeconds!);
  const knownDuration = validWarmDuration && durationSeconds > 0
    ? durationSeconds
    : programmeDuration(record, record.quantity?.values.length === 1 ? record.quantity.values[0] : undefined);
  const display = knownDuration !== null
    ? formatSeconds(knownDuration)
    : record.automatic ? "AUTO" : undefined;
  const parameters = {
    quantity: quantityText(record, locale),
    power: `${power} W`,
    duration: validWarmDuration ? duration : "",
  };
  const actions = guidedActions(record);
  const active = actions[step]?.control;
  const heading = record.title[locale];
  return (
    <>
      <MenuBack
        fallback={
          record.kind === "article" || record.function === "other"
            ? "/guide"
            : `/functions/${record.function}`
        }
      />
      <div className="instruction-heading">
        {record.code && <span className="detail-number">{record.code}</span>}
        <PageHeading title={heading} />
        <ProgramFavorite id={record.id} />
      </div>
      <div
        className={`instruction-layout ${!actions.length ? "article-layout" : ""}`}
      >
        <div className="instruction-body">
          <ProgrammeInformation record={record} locale={locale}>
            {record.manualSettings && (
              <div className="manual-settings">
                <p className="manual-summary">
                  <strong>{record.manualSettings.power} W</strong>{" "}
                  <span aria-hidden="true">·</span>{" "}
                  {t("manualRange")}{" "}
                  {formatSeconds(record.manualSettings.durationMin)}–
                  {formatSeconds(record.manualSettings.durationMax)}
                </p>
                <label htmlFor="duration">{t("duration")}</label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                >
                  {[
                    ...new Set([
                      record.manualSettings.durationMin,
                      record.manualSettings.durationMax,
                    ]),
                  ].map((value) => (
                    <option key={value} value={formatSeconds(value)}>
                      {formatSeconds(value)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {["manual-heating", "save-favorite"].includes(record.id) && (
              <div className="manual-settings">
                <label htmlFor="power">{t("power")}</label>
                <select
                  id="power"
                  value={power}
                  onChange={(event) => setPower(event.target.value)}
                >
                  {knowledge.powerLevels.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <label htmlFor="duration">{t("duration")}</label>
                <input
                  id="duration"
                  placeholder="mm:ss"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
                <p className="field-hint">{t("durationHint")}</p>
              </div>
            )}
            {record.id === "keep-warm" && (
              <div className="manual-settings">
                <label htmlFor="warm-duration">{t("observedDuration")}</label>
                <input
                  id="warm-duration"
                  placeholder="mm:ss"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  aria-invalid={!!duration && !validWarmDuration}
                  aria-describedby="warm-duration-hint"
                />
                <p className="field-hint" id="warm-duration-hint">
                  {t("warmDurationHint")}
                </p>
                {!!duration && !validWarmDuration && (
                  <p className="field-error" role="alert">
                    {t("durationError")}
                  </p>
                )}
              </div>
            )}
          </ProgrammeInformation>
          {record.warnings.length > 0 && (
            <section className="surface safety-notice">
              <h2>
                <ShieldCheck size={19} aria-hidden="true" />
                {t("caution")}
              </h2>
              {record.warnings.map((text, index) => (
                <p key={index}>{text[locale]}</p>
              ))}
            </section>
          )}
          {actions.length > 0 && (
            <section className="surface step-section">
              <div className="section-heading step-heading">
                <h2>
                  {t("steps")}{" "}
                  <span className="heading-detail">
                    <span aria-hidden="true">·</span>{" "}
                    <span aria-live="polite" aria-atomic="true">{step + 1} / {actions.length}</span>
                  </span>
                </h2>
                <button
                  className="text-button"
                  onClick={() => setCompact(!compact)}
                >
                  {compact ? t("guided") : t("compact")}
                </button>
              </div>
              <div
                className="step-progress"
                aria-hidden="true"
              >
                {actions.map((_, index) => (
                  <span key={index} className={index <= step ? "done" : ""} />
                ))}
              </div>
              <ol className={`steps ${compact ? "compact-steps" : ""}`} role="list">
                {actions.map(
                  (action, index) =>
                    (
                      <li key={index} value={index + 1} hidden={!compact && index !== step} aria-current={index === step ? "step" : undefined}>
                        <div className="step-content">
                          {compact && <span className="step-number" aria-hidden="true">{index + 1}</span>}
                          <span>
                            <strong>
                              {instructionText(action, locale, parameters)}
                            </strong>
                            {action.display && (
                              <span className="display-value">
                                {t("display")} · {action.display}
                              </span>
                            )}
                            {action.type === "rotate_dial_to" &&
                              record.function === "healthy-steam" &&
                              action.value === record.groupCode && (
                                <small>
                                  {t("group")} {record.groupCode} ·{" "}
                                  {t(
                                    record.groupCode === "1"
                                      ? "healthy"
                                      : "asian",
                                  )}
                                </small>
                              )}
                          </span>
                        </div>
                      </li>
                    ),
                )}
              </ol>
              <Disclosure
                className="mobile-step-panel"
                label={`${t("controls")} · ${controlById.get(active || "")?.hardware || t("during")}`}
              >
                <ControlPanel
                  active={active}
                  display={display}
                  locale={locale}
                  label={t("panelTitle")}
                />
              </Disclosure>
              <div className="step-controls">
                <button
                  className="secondary-button"
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  {t("previous")}
                </button>
                <button
                  className="primary-button"
                  disabled={
                    step === actions.length - 1 ||
                    (!validWarmDuration &&
                      actions[step]?.type === "set_duration")
                  }
                  onClick={() => setStep(step + 1)}
                >
                  {t("next")}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </section>
          )}
          {(record.standing || record.after.length > 0 || record.automatic) && (
            <section className="surface after-section">
              <h2>{t("after")}</h2>
              {record.standing && (
                <p className="standing">
                  {t("standing")}{" "}<span aria-hidden="true">·</span>{" "}
                  <strong>
                    {record.standing.min === record.standing.max
                      ? record.standing.min
                      : `${record.standing.min}–${record.standing.max}`}{" "}
                    {t("minutes")}
                  </strong>
                </p>
              )}
              {record.after.map((text, index) => (
                <p key={index}>{text[locale]}</p>
              ))}
              {record.automatic && (
                <Link className="text-link" to="/programs/completion">
                  {recordById.get("completion")!.title[locale]}
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              )}
            </section>
          )}
          <SourceDetails record={record} />
          <section className="notes">
            <label htmlFor="notes">{t("notes")}</label>

            <textarea
              id="notes"
              maxLength={5000}
              value={preferences.notes[record.id] || ""}
              placeholder={t("notePlaceholder")}
              onChange={(event) =>
                change((previous) => ({
                  ...previous,
                  notes: { ...previous.notes, [record.id]: event.target.value },
                }))
              }
            />
          </section>
        </div>
        {actions.length > 0 && (
          <aside className="instruction-panel">
            <div className="panel-sticky">
              <ControlPanel
                active={active}
                display={display}
                locale={locale}
                label={t("panelTitle")}
              />
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

function SimulationPage() {
  const { controlId } = useParams();
  const { locale, t, machine } = useApp();
  if (controlId && !controlById.has(controlId)) return <NotFound />;
  return (
    <>
      <PageHeading title={t("simulation")} />
      <Simulator locale={locale} machine={machine} initialControl={controlId} />
    </>
  );
}

function Guide() {
  const { t } = useApp();
  const [editing, setEditing] = useState(false);
  const articles = knowledge.records.filter(
    (record) => record.kind === "article",
  );
  const features = knowledge.records.filter(
    (record) => record.kind === "function",
  );
  return (
    <>
      <PageHeading title={t("guide")} action={<FavoriteModeButton editing={editing} onToggle={() => setEditing(!editing)} />} />
      <h2 className="section-title">{t("other")}</h2>
      <RecordGrid records={features} editing={editing} />
      <h2 className="section-title">{t("learn")}</h2>
      <RecordGrid records={articles} editing={editing} />
      <section className="surface power-guide-card">
        <h2 id="power-guide-title">{t("powerGuide")}</h2>
        <div className="power-guide-viewport" role="region" aria-labelledby="power-guide-title" tabIndex={0}>
          <dl className="power-guide">
            {[...knowledge.powerLevels].sort((a, b) => a - b).map((power) => (
              <div key={power} className="power-level" data-power={power}>
                <dt>{power} W</dt>
                <dd>{t(`power${power}` as MessageKey)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

function NotFound() {
  const { t } = useApp();
  return (
    <>
      <PageHeading title={t("notFound")} />
      <Link className="primary-button" to="/programs">
        {t("programs")}
      </Link>
    </>
  );
}
