import { useEffect, useRef } from "react";
import { useTranslation } from "@plane/i18n";
import { getFocusCommand } from "./focus-message";

/** The host owns the viewport; the iframe hides its navigation without remounting. */
export function useEmbeddedFocus() {
  const { currentLocale } = useTranslation();
  const enabled = useRef(false);
  const parentOrigin = useRef<string | null>(null);

  useEffect(() => {
    if (process.env.VITE_XBUS_EMBEDDED !== "true" || window.parent === window) return;
    const onMessage = (event: MessageEvent) => {
      const command = getFocusCommand(event, window.parent, parentOrigin.current);
      if (command === undefined) return;
      parentOrigin.current = event.origin;
      enabled.current = command;
      document.documentElement.classList.toggle("xbus-work-focus", enabled.current);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (enabled.current && event.key === "Escape" && parentOrigin.current) {
        window.parent.postMessage({ type: "xbus-work-exit-focus" }, parentOrigin.current);
      }
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("xbus-work-focus");
    };
  }, []);

  useEffect(() => {
    if (process.env.VITE_XBUS_EMBEDDED === "true" && window.parent !== window) {
      // Readiness and locale contain no session or user data. The host validates the sender.
      window.parent.postMessage({ type: "xbus-work-ready", language: currentLocale }, "*");
    }
  }, [currentLocale]);
}
