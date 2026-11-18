export function scrollResultsWithKeyboard(
  list: HTMLElement,
  keyboardOpen: () => boolean,
  reducedMotion: boolean,
) {
  let drag: { touch: Touch; time: number; velocity: number; moving: boolean } | undefined;

  function start(event: TouchEvent) {
    drag = keyboardOpen() && event.touches.length === 1
      ? { touch: event.touches[0], time: event.timeStamp, velocity: 0, moving: false }
      : undefined;
  }

  function move(event: TouchEvent) {
    if (!drag || event.touches.length !== 1 || !event.cancelable) return;
    const touch = event.touches[0];
    const delta = drag.touch.clientY - touch.clientY;
    const sideways = Math.abs(drag.touch.clientX - touch.clientX);
    if (!drag.moving && Math.abs(delta) < Math.max(4, sideways)) return;
    event.preventDefault();
    list.scrollTop += delta;
    drag = { touch, time: event.timeStamp, velocity: delta / Math.max(8, event.timeStamp - drag.time), moving: true };
  }

  function end(event: TouchEvent) {
    if (drag?.moving && !reducedMotion && event.type === "touchend" && event.timeStamp - drag.time < 80) {
      list.scrollBy({ top: Math.max(-120, Math.min(120, drag.velocity * 90)), behavior: "smooth" });
    }
    drag = undefined;
  }

  list.addEventListener("touchstart", start, { passive: true });
  list.addEventListener("touchmove", move, { passive: false });
  list.addEventListener("touchend", end);
  list.addEventListener("touchcancel", end);
  return () => {
    list.removeEventListener("touchstart", start);
    list.removeEventListener("touchmove", move);
    list.removeEventListener("touchend", end);
    list.removeEventListener("touchcancel", end);
  };
}
