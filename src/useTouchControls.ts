import { useRef, type MouseEvent, type PointerEvent } from "react";

const controlSelector = "button, a[href], summary, .settings-choice, .appearance-option";
const longPressMilliseconds = 500;

function touchControl(target: EventTarget | null) {
  return target instanceof Element ? target.closest(controlSelector) : null;
}

export function useTouchControls() {
  const press = useRef<{ target: Element; id: number; start: number } | null>(null);
  const heldControl = useRef<Element | null>(null);

  function clearPress() {
    press.current?.target.removeAttribute("data-touch-pressed");
    press.current = null;
  }

  function endPress(event: PointerEvent<HTMLDivElement>) {
    const active = press.current;
    if (!active || active.id !== event.pointerId) return;
    clearPress();
    if (event.type === "pointerup" && event.timeStamp - active.start >= longPressMilliseconds &&
        !active.target.matches(".child-lock-key")) {
      heldControl.current = active.target;
    }
  }

  return {
    onPointerDownCapture(event: PointerEvent<HTMLDivElement>) {
      if (!event.isPrimary) return;
      clearPress();
      heldControl.current = null;
      if (event.button !== 0 || (event.pointerType !== "touch" && event.pointerType !== "pen")) return;
      const target = touchControl(event.target);
      if (!target || target.matches(":disabled")) return;
      target.setAttribute("data-touch-pressed", "");
      press.current = { target, id: event.pointerId, start: event.timeStamp };
    },
    onPointerUpCapture: endPress,
    onPointerCancelCapture: endPress,
    onLostPointerCaptureCapture: endPress,
    onClickCapture(event: MouseEvent<HTMLDivElement>) {
      clearPress();
      const target = heldControl.current;
      heldControl.current = null;
      if (target && event.detail && touchControl(event.target) === target) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    onContextMenu(event: MouseEvent<HTMLDivElement>) {
      const pointer = "pointerType" in event.nativeEvent ? event.nativeEvent.pointerType : "";
      const touch = pointer === "touch" || pointer === "pen" || (!pointer && matchMedia("(pointer: coarse)").matches);
      if (touch && touchControl(event.target)) event.preventDefault();
    },
  };
}
