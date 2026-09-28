import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "heo-nho-ai-button-position";
const BUTTON_SIZE = 58;
const EDGE_GAP = 12;

type Position = { x: number; y: number };
type DragState = Position & {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

function clamp(position: Position): Position {
  return {
    x: Math.min(
      Math.max(EDGE_GAP, position.x),
      Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP),
    ),
    y: Math.min(
      Math.max(EDGE_GAP, position.y),
      Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP),
    ),
  };
}

function initialPosition(): Position {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y))
      return clamp(saved);
  } catch {
    // A blocked or malformed preference should not hide the launcher.
  }
  return clamp({
    x: window.innerWidth - BUTTON_SIZE - 18,
    y:
      window.innerWidth < 900
        ? window.innerHeight * 0.6 - BUTTON_SIZE / 2
        : window.innerHeight - BUTTON_SIZE - 24,
  });
}

export function FloatingAIButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [position, setPosition] = useState(initialPosition);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const handleResize = () => setPosition((current) => clamp(current));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (location.pathname === "/ai") return null;

  return (
    <button
      type="button"
      className={`ai-fab ${dragging ? "dragging" : ""}`}
      style={{ left: position.x, top: position.y }}
      aria-label="Mở trợ lý AI"
      title="Mở trợ lý AI · Kéo để di chuyển"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: position.x,
          y: position.y,
          moved: false,
        };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const dx = event.clientX - current.startX;
        const dy = event.clientY - current.startY;
        if (Math.hypot(dx, dy) > 5) current.moved = true;
        setPosition(clamp({ x: current.x + dx, y: current.y + dy }));
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const finalPosition = clamp({
          x: current.x + event.clientX - current.startX,
          y: current.y + event.clientY - current.startY,
        });
        setPosition(finalPosition);
        suppressClick.current = current.moved;
        drag.current = null;
        setDragging(false);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPosition));
        } catch {
          // Position persistence is optional; dragging still works in-session.
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
        suppressClick.current = false;
        setDragging(false);
      }}
      onClick={(event) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          event.preventDefault();
          return;
        }
        navigate("/ai");
      }}
    >
      <Sparkles size={23} strokeWidth={2} />
      <span>AI</span>
    </button>
  );
}
