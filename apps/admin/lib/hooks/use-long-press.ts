import { useCallback, useRef } from "react";

export function useLongPress(callback: () => void, ms = 400) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  const start = useCallback(() => {
    isLongPressActive.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      callback();
    }, ms);
  }, [callback, ms]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    // We only attach to touch events as per requirement (exclude mouse)
    handlers: {
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchCancel: clear,
      // Scrolling or dragging should cancel the long press
      onTouchMove: clear,
    },
    /**
     * Call this inside the standard onClick handler to see if a long press
     * just occurred. If it did, you typically want to early return.
     */
    wasLongPress: () => isLongPressActive.current,
    /**
     * Resets the flag. Optionally call this after bailing out of an onClick.
     */
    resetLongPress: () => {
      isLongPressActive.current = false;
    },
  };
}
