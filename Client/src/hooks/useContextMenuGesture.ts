import * as React from 'react';

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 12;

/**
 * Adds context-menu gestures to a list row:
 * - long-press (touch/pen) opens the menu with haptic + visual feedback
 * - right-click on desktop opens the same menu
 * - the synthetic click after a long-press is swallowed, so the row
 *   doesn't navigate when the menu opens
 *
 * Usage: spread `bind` on the row container, control the row's existing
 * DropdownMenu with `open`/`onOpenChange`, and use `pressed` for styling.
 */
export function useContextMenuGesture() {
    const [open, setOpen] = React.useState(false);
    const [pressed, setPressed] = React.useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
    // Set when a long-press fired; the click that follows it must not navigate.
    const swallowClickRef = React.useRef(false);

    const clearTimer = React.useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        startPosRef.current = null;
        setPressed(false);
    }, []);

    React.useEffect(() => clearTimer, [clearTimer]);

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            // Only touch/stylus get the long-press gesture; mouse uses right-click.
            if (e.pointerType === 'mouse') return;
            // The kebab trigger handles its own press (Radix opens the menu on
            // click); starting the gesture there would double-toggle the menu.
            if ((e.target as HTMLElement).closest('[data-no-gesture]')) return;
            startPosRef.current = { x: e.clientX, y: e.clientY };
            setPressed(true);
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                swallowClickRef.current = true;
                setPressed(false);
                setOpen(true);
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try {
                        navigator.vibrate(10);
                    } catch {
                        /* haptics unavailable */
                    }
                }
            }, LONG_PRESS_MS);
        },
        []
    );

    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!startPosRef.current) return;
            const dx = e.clientX - startPosRef.current.x;
            const dy = e.clientY - startPosRef.current.y;
            if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) clearTimer();
        },
        [clearTimer]
    );

    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (e.pointerType !== 'mouse') clearTimer();
        },
        [clearTimer]
    );

    const onContextMenu = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Right-click: open the row menu at the trigger and stop the browser menu.
        e.preventDefault();
        setOpen(true);
    }, []);

    const onClickCapture = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (swallowClickRef.current) {
            swallowClickRef.current = false;
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const bind = {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: clearTimer,
        onPointerLeave: clearTimer,
        onContextMenu,
        onClickCapture,
    } satisfies React.DOMAttributes<HTMLDivElement>;

    return { bind, open, setOpen, pressed };
}
