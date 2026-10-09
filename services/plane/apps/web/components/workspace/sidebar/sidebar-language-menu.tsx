import { useId, useState } from "react";
import { ChevronDown, Languages } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";

export function SidebarLanguageMenu() {
  const { t, currentLocale, changeLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <SidebarNavItem isActive={open}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-1.5 py-[1px] text-13 leading-5 font-medium"
        >
          <Languages className="size-4 shrink-0" aria-hidden="true" />
          <span className="grow text-left">{t("language")}</span>
          <ChevronDown
            className={`size-3 shrink-0 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </SidebarNavItem>
      <div id={panelId} hidden={!open} className="px-2 py-2">
        <select
          aria-label={t("language")}
          value={currentLocale}
          onChange={(event) => changeLanguage(event.target.value === "en" ? "en" : "vi-VN")}
          className="w-full rounded-md border border-subtle bg-surface-1 px-2 py-1 text-13 text-primary"
        >
          <option value="vi-VN" lang="vi">
            Tiếng Việt
          </option>
          <option value="en" lang="en">
            English
          </option>
        </select>
      </div>
    </div>
  );
}
