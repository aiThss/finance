/** Suppress the compatibility click after a swipe, including in Android WebView.
 * Capture at document level so buttons, links, labels and nested pickers share
 * the same rule without blocking native scrolling or keyboard activation.
 */
export function installTouchIntentGuard(doc: Document = document) {
  let gesture: {
    id: number;
    x: number;
    y: number;
    moved: boolean;
    active: boolean;
    ended: number;
  } | null = null;
  const down = (event: PointerEvent) => {
    if (event.pointerType === "mouse") {
      gesture = null;
      return;
    }
    if (!event.isPrimary) {
      if (gesture) gesture.moved = true;
      return;
    }
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      active: true,
      ended: 0,
    };
  };
  const move = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId || !gesture.active) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 8)
      gesture.moved = true;
  };
  const end = (event: PointerEvent) => {
    move(event);
    if (!gesture || gesture.id !== event.pointerId) return;
    if (event.type === "pointercancel") gesture.moved = true;
    gesture.active = false;
    gesture.ended = Date.now();
  };
  const scroll = () => {
    if (gesture?.active) gesture.moved = true;
  };
  const click = (event: MouseEvent) => {
    // detail=0 is keyboard, assistive technology or programmatic activation.
    if (event.detail === 0 || !gesture?.moved) return;
    if (gesture.active || Date.now() - gesture.ended < 800) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  doc.addEventListener("pointerdown", down, { capture: true, passive: true });
  doc.addEventListener("pointermove", move, { capture: true, passive: true });
  doc.addEventListener("pointerup", end, { capture: true, passive: true });
  doc.addEventListener("pointercancel", end, { capture: true, passive: true });
  doc.addEventListener("scroll", scroll, { capture: true, passive: true });
  doc.addEventListener("click", click, true);
  return () => {
    doc.removeEventListener("pointerdown", down, true);
    doc.removeEventListener("pointermove", move, true);
    doc.removeEventListener("pointerup", end, true);
    doc.removeEventListener("pointercancel", end, true);
    doc.removeEventListener("scroll", scroll, true);
    doc.removeEventListener("click", click, true);
  };
}
