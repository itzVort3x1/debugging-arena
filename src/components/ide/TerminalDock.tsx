"use client";

import { useCallback, useRef, useState } from "react";
import { TerminalPanel } from "./TerminalPanel";

const MIN_HEIGHT = 96;
const DEFAULT_HEIGHT = 192; // matches the previous fixed h-48
/** Leave at least this much room for the editor above the terminal. */
const EDITOR_HEADROOM = 120;

/**
 * The terminal, docked below the editor with a drag handle on its top edge
 * for vertical (up/down) resizing. Height is clamped so it can't collapse to
 * nothing or swallow the whole editor.
 */
export function TerminalDock() {
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ startY: number; startHeight: number; max: number } | null>(
        null,
    );

    const onPointerMove = useCallback((e: PointerEvent) => {
        const st = drag.current;
        if (!st) return;
        // Dragging up (smaller clientY) makes the terminal taller.
        const next = st.startHeight + (st.startY - e.clientY);
        setHeight(Math.max(MIN_HEIGHT, Math.min(st.max, next)));
    }, []);

    const onPointerUp = useCallback(() => {
        drag.current = null;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }, [onPointerMove]);

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault();
            const parentH =
                wrapperRef.current?.parentElement?.clientHeight ??
                window.innerHeight;
            drag.current = {
                startY: e.clientY,
                startHeight: height,
                max: Math.max(MIN_HEIGHT, parentH - EDITOR_HEADROOM),
            };
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
        },
        [height, onPointerMove, onPointerUp],
    );

    return (
        <div
            ref={wrapperRef}
            style={{ height }}
            className="flex shrink-0 flex-col border-t border-vscode-border"
        >
            <div
                onPointerDown={onPointerDown}
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize terminal"
                title="Drag to resize"
                className="group relative h-1.5 shrink-0 cursor-row-resize"
            >
                {/* Larger invisible hit area around the thin visible line. */}
                <span className="absolute inset-x-0 -top-1 h-3.5" />
                <span className="absolute inset-x-0 top-0 h-1.5 bg-transparent transition-colors group-hover:bg-vscode-accent/40" />
            </div>
            <div className="min-h-0 flex-1">
                <TerminalPanel />
            </div>
        </div>
    );
}
