import {
  BellRing, BookOpen, BrushCleaning, Clock3, CookingPot, Droplets, Fan,
  FolderOpen, LockKeyhole, Microwave, MonitorOff, PackageOpen, Pause, Play,
  Recycle, Save, ShieldCheck, Snowflake, Soup, TimerReset, Utensils,
  Volume2, Waves, WavesVertical, Wrench, type LucideIcon,
} from "lucide-react";

const recordIcons: Partial<Record<string, LucideIcon>> = {
  "quick-start": Play,
  "adjust-time": TimerReset,
  "pause-stop": Pause,
  clock: Clock3,
  eco: MonitorOff,
  "save-favorite": Save,
  "recall-favorite": FolderOpen,
  "child-lock": LockKeyhole,
  safety: ShieldCheck,
  cookware: Utensils,
  steamer: Soup,
  cleaning: BrushCleaning,
  setup: PackageOpen,
  completion: BellRing,
  sound: Volume2,
  troubleshooting: Wrench,
  "water-check": Droplets,
  disposal: Recycle,
  deodorization: Fan,
};

const functionIcons: Partial<Record<string, LucideIcon>> = {
  "healthy-steam": WavesVertical,
  "auto-cook": CookingPot,
  "quick-defrost": Snowflake,
  microwave: Microwave,
  "keep-warm": Waves,
};

export function RecordIcon({ id, functionId, size }: { id: string; functionId: string; size: number }) {
  const Icon = recordIcons[id] ?? functionIcons[functionId] ?? BookOpen;
  return <Icon size={size} aria-hidden="true" />;
}
