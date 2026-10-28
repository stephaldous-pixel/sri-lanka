"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { card } from "@/lib/ui";
import { Grip } from "./route-editor";

type Drag = { from: number; over: number; startY: number; dy: number; mids: number[]; step: number };

/**
 * A vertical list you can reorder by dragging a handle (mouse or touch) or,
 * with the handle focused, the ↑ and ↓ keys. Built on plain pointer events so
 * it works the same everywhere.
 */
export function SortableList({
  label,
  items,
  onMove,
  renderItem,
}: {
  label: string;
  /** Unique id for each row. */
  items: string[];
  onMove: (from: number, to: number) => void;
  /** Render a row; call `handle(label)` where the drag handle should go. */
  renderItem: (id: string, index: number, handle: (label: string) => ReactNode) => ReactNode;
}) {
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const [drag, setDrag] = useState<Drag | null>(null);
  const refocus = useRef<string | null>(null);

  // Keep keyboard focus on the handle that moved once the list re-renders.
  useLayoutEffect(() => {
    if (refocus.current) {
      handles.current.get(refocus.current)?.focus();
      refocus.current = null;
    }
  }, [items]);

  function start(e: PointerEvent<HTMLButtonElement>, index: number) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rects = rows.current.map((r) => r?.getBoundingClientRect());
    const own = rects[index]!;
    const next = rects[index + 1] ?? rects[index - 1];
    const step = next ? Math.abs(next.top - own.top) : own.height + 8;
    setDrag({ from: index, over: index, startY: e.clientY, dy: 0, mids: rects.map((r) => (r ? r.top + r.height / 2 : 0)), step });
  }

  function move(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    const y = drag.mids[drag.from] + dy;
    // The new position is however many other rows sit above the dragged row's centre.
    const over = drag.mids.filter((mid, i) => i !== drag.from && mid < y).length;
    setDrag({ ...drag, dy, over });
  }

  function end() {
    if (!drag) return;
    if (drag.over !== drag.from) onMove(drag.from, drag.over);
    setDrag(null);
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const to = e.key === "ArrowUp" ? index - 1 : e.key === "ArrowDown" ? index + 1 : null;
    if (to === null) return;
    e.preventDefault();
    if (to < 0 || to >= items.length) return;
    refocus.current = items[index];
    onMove(index, to);
  }

  // How far each row shifts to make room while dragging.
  function offset(i: number): number {
    if (!drag) return 0;
    if (i === drag.from) return drag.dy;
    if (drag.from < drag.over && i > drag.from && i <= drag.over) return -drag.step;
    if (drag.from > drag.over && i >= drag.over && i < drag.from) return drag.step;
    return 0;
  }

  return (
    <ol aria-label={label} className="space-y-2">
      {items.map((id, i) => {
        const dragging = drag?.from === i;
        return (
          <li
            key={id}
            ref={(el) => {
              rows.current[i] = el;
            }}
            style={{ transform: offset(i) ? `translateY(${offset(i)}px)` : undefined }}
            className={`${card} relative flex items-center gap-3 p-3 ${
              dragging ? "z-10 shadow-lg ring-2 ring-accent" : drag ? "transition-transform duration-150" : ""
            }`}
          >
            {renderItem(id, i, (handleLabel) => (
              <button
                type="button"
                ref={(el) => {
                  if (el) handles.current.set(id, el);
                  else handles.current.delete(id);
                }}
                aria-label={handleLabel}
                aria-describedby="reorder-help"
                onPointerDown={(e) => start(e, i)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={(e) => onKey(e, i)}
                className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing"
              >
                <Grip />
              </button>
            ))}
          </li>
        );
      })}
      <li id="reorder-help" className="sr-only">
        Press the up or down arrow key to move this stop.
      </li>
    </ol>
  );
}
