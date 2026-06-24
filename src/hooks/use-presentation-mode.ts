import { useEffect, useState } from "react";

const KEY = "qc:presentation";

export function usePresentationMode() {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(KEY) === "1";
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.presentation = on ? "on" : "off";
    window.localStorage.setItem(KEY, on ? "1" : "0");
  }, [on]);
  return { on, toggle: () => setOn((v) => !v), set: setOn };
}
