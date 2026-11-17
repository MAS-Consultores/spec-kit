import { useEffect } from "react";

/** Browser subscription. Server state belongs in TanStack Query, not here. */
export function useWindowEvent(type: string, handler: () => void): void {
  useEffect(() => {
    window.addEventListener(type, handler);
    return () => {
      window.removeEventListener(type, handler);
    };
  }, [type, handler]);
}
