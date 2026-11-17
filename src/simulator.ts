import { useEffect, useReducer } from "react";
import { knowledge, type ApplianceRecord, type Locale } from "./data/schema";
import { formatSeconds, localClock, programmeDuration } from "./time";

type Mode = "healthy-steam" | "auto-cook" | "quick-defrost" | "microwave" | "keep-warm" | "deodorization" | "favorite";
type Phase = "idle" | "group" | "programme" | "quantity" | "power" | "duration" | "ready" | "memory" | "clock-format" | "clock-hour" | "clock-minute";
type Memory = { power: number; seconds: number; savedAtUtc: string };
export type SimulatorState = {
  mode: Mode | null;
  phase: Phase;
  selected: string | null;
  index: number;
  group: number;
  quantity: number;
  power: number;
  seconds: number | null;
  status: "idle" | "running" | "paused" | "complete";
  deadlineUtc: string | null;
  locked: boolean;
  eco: boolean;
  slot: number;
  saving: boolean;
  memories: (Memory | null)[];
  hour12: boolean;
  clockDraftUtc: number;
  dialRotation: number;
};
export const initialSimulator: SimulatorState = {
  mode: null, phase: "idle", selected: null, index: 1, group: 1, quantity: 200,
  power: 800, seconds: null, status: "idle", deadlineUtc: null,
  locked: false, eco: false, slot: 0, saving: false,
  memories: [null, null], hour12: false, clockDraftUtc: 0, dialRotation: 0,
};
type Action =
  | { type: "press"; id: string; now: number }
  | { type: "adjust"; direction: number; now: number }
  | { type: "lock" }
  | { type: "tick"; now: number };

export function simulatorRecords(state: SimulatorState) {
  return knowledge.records.filter((record) => record.kind === "preset" && record.function === state.mode &&
    (state.mode !== "healthy-steam" || record.groupCode === String(state.group)));
}
export function simulatorRecord(state: SimulatorState): ApplianceRecord | undefined {
  return simulatorRecords(state)[state.index - 1];
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const ascendingPowers = [...knowledge.powerLevels].sort((a, b) => a - b);

function alignDial(state: SimulatorState, angle = 0): SimulatorState {
  // Use the closest equivalent angle when a new scale replaces the old one.
  const turns = Math.round((state.dialRotation - angle) / 360);
  return { ...state, dialRotation: angle + turns * 360 };
}

export function remainingSeconds(state: SimulatorState, now: number) {
  return state.deadlineUtc && state.seconds !== null
    ? clamp(Math.ceil((Date.parse(state.deadlineUtc) - now) / 1000), 0, state.seconds)
    : state.seconds;
}
function reset(state: SimulatorState): SimulatorState {
  return alignDial({
    ...initialSimulator,
    memories: state.memories,
    locked: state.locked,
    hour12: state.hour12,
    dialRotation: state.dialRotation,
  });
}
function start(state: SimulatorState, now: number): SimulatorState {
  if (state.seconds === 0) return state;
  const seconds = state.seconds;
  return { ...state, status: "running", phase: "ready", eco: false,
    deadlineUtc: seconds === null ? null : new Date(now + seconds * 1000).toISOString() };
}
function pause(state: SimulatorState, now: number): SimulatorState {
  return { ...state, status: "paused", seconds: remainingSeconds(state, now), deadlineUtc: null };
}
function selectProgramme(state: SimulatorState): SimulatorState {
  const record = simulatorRecord(state);
  const quantity = record?.quantity?.values[0] ?? record?.quantity?.min ?? 200;
  return { ...state, quantity, seconds: record ? programmeDuration(record, quantity) : null };
}

export function simulatorReducer(state: SimulatorState, action: Action): SimulatorState {
  if (action.type === "tick") {
    return state.status === "running" && state.deadlineUtc && Date.parse(state.deadlineUtc) <= action.now
      ? { ...state, status: "complete", seconds: 0, deadlineUtc: null } : state;
  }
  if (action.type === "lock") return { ...state, locked: !state.locked, selected: "child-lock" };
  if (state.locked) return state;
  if (action.type === "adjust") {
    const direction = Math.sign(action.direction);
    const turn = (next: SimulatorState, steps: number, positions: number) =>
      steps && positions ? { ...next, dialRotation: state.dialRotation + (360 * steps) / positions } : next;
    if (state.status === "running" || state.status === "paused") {
      if (state.seconds === null) return state;
      const max = state.mode === "deodorization" ? 900 : 5940;
      const remaining = remainingSeconds(state, action.now) ?? 0;
      if (!remaining) return state;
      const seconds = clamp(remaining + direction * 30, 1, max);
      return turn({
        ...state,
        seconds,
        deadlineUtc: state.status === "running" ? new Date(action.now + seconds * 1000).toISOString() : null,
      }, seconds - remaining, 60);
    }
    switch (state.phase) {
      case "group": {
        const group = clamp(state.group + direction, 1, 2);
        return turn(selectProgramme({ ...state, group, index: 1 }), group - state.group, 2);
      }
      case "programme": {
        const positions = simulatorRecords(state).length;
        const index = clamp(state.index + direction, 1, positions);
        return turn(selectProgramme({ ...state, index }), index - state.index, positions);
      }
      case "quantity": {
        const record = simulatorRecord(state);
        const range = record?.quantity;
        if (!range) return state;
        const increment = range.increment ?? 100;
        const positions = range.values.length || Math.ceil((range.max! - range.min!) / increment) + 1;
        const current = range.values.length
          ? range.values.indexOf(state.quantity)
          : Math.ceil((state.quantity - range.min!) / increment);
        const index = clamp(current + direction, 0, positions - 1);
        const quantity = range.values[index] ?? Math.min(range.min! + index * increment, range.max!);
        return turn({ ...state, quantity, seconds: programmeDuration(record, quantity) }, index - current, positions);
      }
      case "power": {
        const current = ascendingPowers.indexOf(state.power);
        const index = clamp(current + direction, 0, ascendingPowers.length - 1);
        return turn({ ...state, power: ascendingPowers[index] }, index - current, ascendingPowers.length);
      }
      case "duration": {
        const current = state.seconds ?? 0;
        const seconds = clamp(current + direction * 30, 0, 5940);
        return turn({ ...state, seconds }, seconds - current, 60);
      }
      case "memory": {
        const slot = clamp(state.slot + direction, 0, 1);
        return turn({ ...state, slot }, slot - state.slot, 2);
      }
      case "clock-format": {
        const hour12 = direction < 0;
        return turn({ ...state, hour12 }, Number(state.hour12) - Number(hour12), 2);
      }
      case "clock-hour":
        return turn({ ...state, clockDraftUtc: state.clockDraftUtc + direction * 3600000 }, direction, state.hour12 ? 12 : 24);
      case "clock-minute":
        return turn({ ...state, clockDraftUtc: state.clockDraftUtc + direction * 60000 }, direction, 60);
      default: return state;
    }
  }
  const { id, now } = action;
  if (id === "child-lock" || id === "dial") return { ...state, selected: id, eco: false };
  if (id === "stop") {
    if (state.status === "running") return { ...pause(state, now), selected: "stop" };
    if (state.phase !== "idle" || state.status !== "idle") return { ...reset(state), selected: "stop" };
    return { ...state, eco: !state.eco, selected: "stop" };
  }
  if (id === "start") {
    if (state.status === "running") {
      if (state.seconds === null) return state;
      const seconds = Math.min((remainingSeconds(state, now) ?? 0) + 30, state.mode === "deodorization" ? 900 : 5940);
      return { ...state, seconds, deadlineUtc: new Date(now + seconds * 1000).toISOString() };
    }
    if (state.status === "paused") return start(state, now);
    if (state.phase === "memory") {
      if (state.saving) {
        const memories = [...state.memories];
        memories[state.slot] = { power: state.power, seconds: state.seconds ?? 30, savedAtUtc: new Date(now).toISOString() };
        return start({ ...state, mode: "microwave", memories }, now);
      }
      const memory = state.memories[state.slot];
      return memory ? start({ ...state, mode: "microwave", power: memory.power, seconds: memory.seconds }, now) : state;
    }
    if (state.phase === "idle" || state.status === "complete")
      return start({ ...reset(state), mode: "microwave", selected: "start", seconds: 30 }, now);
    if (state.phase === "duration" && !state.seconds) return state;
    if (["ready", "duration", "quantity"].includes(state.phase)) return start(state, now);
    return state;
  }
  if (state.status === "running" || state.status === "paused") return state;
  if (id === "select-clock") {
    switch (state.phase) {
      case "group": return alignDial(selectProgramme({ ...state, phase: "programme" }));
      case "programme": {
        const next = selectProgramme(state);
        return state.mode === "auto-cook"
          ? { ...next, phase: "ready" }
          : alignDial({ ...next, phase: "quantity" });
      }
      case "quantity": return { ...state, phase: "ready" };
      case "power": return alignDial({ ...state, phase: "duration", seconds: 0 });
      case "duration": return { ...state, phase: "ready" };
      case "memory": {
        if (!state.saving) return state;
        const memories = [...state.memories];
        memories[state.slot] = { power: state.power, seconds: state.seconds ?? 30, savedAtUtc: new Date(now).toISOString() };
        return { ...reset(state), memories, selected: "favorite" };
      }
      case "clock-format": {
        const hours = state.hour12 ? 12 : 24;
        return alignDial({ ...state, phase: "clock-hour" }, 360 * new Date(state.clockDraftUtc).getHours() / hours);
      }
      case "clock-hour":
        return alignDial({ ...state, phase: "clock-minute" }, 6 * new Date(state.clockDraftUtc).getMinutes());
      case "clock-minute": return { ...reset(state), selected: "select-clock" };
      default:
        return alignDial({ ...reset(state), selected: "select-clock", phase: "clock-format", clockDraftUtc: now },
          state.hour12 ? 0 : 180);
    }
  }
  if (id === "favorite") return alignDial({
    ...state, selected: id, mode: "favorite", phase: "memory", slot: 0,
    saving: state.mode === "microwave" && (state.seconds ?? 0) > 0, eco: false,
  });
  const base = { ...reset(state), selected: id, eco: false };
  if (id === "healthy-steam") return selectProgramme({ ...base, mode: id, phase: "group" });
  if (id === "auto-cook" || id === "quick-defrost") return selectProgramme({ ...base, mode: id, phase: "programme" });
  if (id === "microwave") return { ...base, mode: id, phase: "power" };
  if (id === "keep-warm") return { ...base, mode: id, phase: "duration", seconds: 0 };
  if (id === "deodorization") return start({ ...base, mode: id, phase: "ready", seconds: 300 }, now);
  return state;
}

export function simulatorDisplay(state: SimulatorState, now: number, locale: Locale) {
  if (state.locked) return "L";
  if (state.eco) return "";
  if (state.status !== "idle") return state.seconds === null ? "AUTO" : formatSeconds(remainingSeconds(state, now) ?? 0);
  if (state.phase === "group") return String(state.group);
  if (state.phase === "programme") return simulatorRecord(state)?.code ?? "1";
  if (state.phase === "quantity") return `${state.quantity} g`;
  if (state.phase === "power") return `${state.power} W`;
  if (state.phase === "memory") return `P${state.slot + 1}`;
  if (state.phase === "clock-format") return state.hour12 ? "12 H" : "24 H";
  if (state.phase === "clock-hour" || state.phase === "clock-minute") return localClock(state.clockDraftUtc, locale, state.hour12);
  if (state.phase === "duration" || state.phase === "ready") return state.seconds === null ? "AUTO" : formatSeconds(state.seconds);
  return localClock(now, locale, state.hour12);
}

export function useSimulator() {
  const [state, dispatch] = useReducer(simulatorReducer, initialSimulator);
  useEffect(() => {
    if (!state.deadlineUtc) return;
    const timer = setTimeout(
      () => dispatch({ type: "tick", now: Date.now() }),
      Math.max(1, Date.parse(state.deadlineUtc) - Date.now() + 1),
    );
    return () => clearTimeout(timer);
  }, [state.deadlineUtc]);
  return { state, dispatch };
}
