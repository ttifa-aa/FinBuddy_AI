import { useState, useRef, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import { ChatSidebar } from "@/components/ChatSidebar";
import type { Transaction } from "@/hooks/use-transactions";

interface FloatingChatButtonProps {
  transactions: Transaction[];
}

const MIN_W = 320;
const MIN_H = 350;
const MAX_W = 700;
const MAX_H = 800;

export function FloatingChatButton({ transactions }: FloatingChatButtonProps) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ w: 380, h: 520 });
  const dragging = useRef<{ edge: string; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const onPointerDown = useCallback((edge: string, e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = { edge, startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragging.current.startX;
      const dy = ev.clientY - dragging.current.startY;
      let newW = dragging.current.startW;
      let newH = dragging.current.startH;

      if (edge.includes("left")) newW = Math.min(MAX_W, Math.max(MIN_W, dragging.current.startW - dx));
      if (edge.includes("right")) newW = Math.min(MAX_W, Math.max(MIN_W, dragging.current.startW + dx));
      if (edge.includes("top")) newH = Math.min(MAX_H, Math.max(MIN_H, dragging.current.startH - dy));
      if (edge.includes("bottom")) newH = Math.min(MAX_H, Math.max(MIN_H, dragging.current.startH + dy));

      setSize({ w: newW, h: newH });
    };

    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [size]);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Open chat assistant"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse-soft" />
          </div>
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 rounded-xl shadow-2xl overflow-hidden border border-border animate-slide-in-right"
          style={{ width: size.w, height: size.h }}
        >
          {/* Resize handles */}
          <div className="absolute top-0 left-0 w-2 h-full cursor-ew-resize z-10" onPointerDown={(e) => onPointerDown("left", e)} />
          <div className="absolute top-0 left-0 h-2 w-full cursor-ns-resize z-10" onPointerDown={(e) => onPointerDown("top", e)} />
          <div className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-20" onPointerDown={(e) => onPointerDown("top-left", e)} />

          <ChatSidebar transactions={transactions} />
        </div>
      )}
    </>
  );
}
