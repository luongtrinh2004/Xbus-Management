"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@core/hooks/useSettings";

export default function ModeDropdown() {
  const { settings, updateSettings } = useSettings();
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreference = () => setPrefersDark(media.matches);

    syncPreference();
    media.addEventListener("change", syncPreference);

    return () => media.removeEventListener("change", syncPreference);
  }, []);

  const isDark =
    settings?.mode === "system" ? prefersDark : settings?.mode === "dark";

  const handleToggle = () => {
    updateSettings({ mode: isDark ? "light" : "dark" });
  };

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? "dark" : ""}`}
      onClick={handleToggle}
      aria-pressed={isDark}
      aria-label="Toggle theme"
      title={isDark ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
    >
      <span className="theme-toggle__sky" aria-hidden="true" />
      <span
        className="theme-toggle__cloud theme-toggle__cloud--back"
        aria-hidden="true"
      />
      <span
        className="theme-toggle__cloud theme-toggle__cloud--front"
        aria-hidden="true"
      />
      <span className="theme-toggle__stars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="theme-toggle__orb" aria-hidden="true">
        <i className="theme-toggle__crater theme-toggle__crater--one" />
        <i className="theme-toggle__crater theme-toggle__crater--two" />
        <i className="theme-toggle__crater theme-toggle__crater--three" />
      </span>
    </button>
  );
}
