// MUI Imports
import { useTheme } from "@mui/material/styles";

//Auth
import { useSession } from "next-auth/react";

// Third-party Imports
import PerfectScrollbar from "react-perfect-scrollbar";

// Component Imports
import { Menu, MenuItem, SubMenu } from "@menu/vertical-menu";

// Hook Imports
import useVerticalNav from "@menu/hooks/useVerticalNav";

// Styled Component Imports
import StyledVerticalNavExpandIcon from "@menu/styles/vertical/StyledVerticalNavExpandIcon";

// Style Imports
import menuItemStyles from "@core/styles/vertical/menuItemStyles";
import menuSectionStyles from "@core/styles/vertical/menuSectionStyles";

//Menu Data
import verticalMenuData from "@/data/navigation/verticalMenuData";

const RenderExpandIcon = ({ open, transitionDuration }) => (
  <StyledVerticalNavExpandIcon
    open={open}
    transitionDuration={transitionDuration}
  >
    <i className="tabler-chevron-right" />
  </StyledVerticalNavExpandIcon>
);

const VerticalMenu = ({ scrollMenu }) => {
  // Hooks
  const theme = useTheme();
  const { data: session } = useSession();
  const verticalNavOptions = useVerticalNav();

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions;
  const ScrollWrapper = isBreakpointReached ? "div" : PerfectScrollbar;

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: "flex-1 min-bs-0 overflow-y-auto overflow-x-hidden",
            onScroll: (container) => scrollMenu(container, false),
          }
        : {
            className: "flex-1 min-bs-0",
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: (container) => scrollMenu(container, true),
          })}
    >
      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 23 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => (
          <RenderExpandIcon
            open={open}
            transitionDuration={transitionDuration}
          />
        )}
        renderExpandedMenuItemIcon={{
          icon: <i className="tabler-circle text-xs" />,
        }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        {session &&
          verticalMenuData.map((item) => {
            // Nếu có children → chỉ render nếu có ít nhất 1 child hợp lệ với role
            if (item.children && item.children.length > 0) {
              const filteredChildren = item.children.filter(
                (child) =>
                  !child.roles || child.roles.includes(session.user.role),
              );

              if (filteredChildren.length === 0) return null;

              return (
                <SubMenu
                  key={item.label}
                  label={item.label}
                  icon={<i className={item.icon} />}
                >
                  {filteredChildren.map((child) => (
                    <MenuItem key={child.label} href={child.href}>
                      {child.label}
                    </MenuItem>
                  ))}
                </SubMenu>
              );
            }

            // Nếu không có children → check roles trực tiếp
            if (!item.roles || item.roles.includes(session.user.role)) {
              return (
                <MenuItem
                  key={item.label}
                  href={item.href}
                  icon={<i className={item.icon} />}
                >
                  {item.label}
                </MenuItem>
              );
            }

            return null;
          })}
      </Menu>
    </ScrollWrapper>
  );
};

export default VerticalMenu;
