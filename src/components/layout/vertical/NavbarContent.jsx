"use client";

import { useState } from "react";

// Third-party Imports
import classnames from "classnames";

// Component Imports
import NavToggle from "./NavToggle";
import HeaderAnnouncements from "./HeaderAnnouncements";
import ModeDropdown from "@components/layout/shared/ModeDropdown";
import TokenBalance from "@components/layout/shared/TokenBalance";
import NotificationDropdown from "@components/layout/shared/NotificationDropdown";
import UserDropdown from "@components/layout/shared/UserDropdown";

// Util Imports
import { verticalLayoutClasses } from "@layouts/utils/layoutClasses";

const NavbarContent = () => {
  const [hasAnnouncements, setHasAnnouncements] = useState(false);

  return (
    <div
      className={classnames(
        verticalLayoutClasses.navbarContent,
        "flex items-center justify-between gap-3 is-full",
      )}
    >
      <div className="flex items-center gap-3 shrink-0">
        <NavToggle />
        <ModeDropdown />
      </div>

      <HeaderAnnouncements onActiveChange={setHasAnnouncements} />

      <div className="flex items-center gap-2 shrink-0">
        {!hasAnnouncements && <TokenBalance />}
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </div>
  );
};

export default NavbarContent;
