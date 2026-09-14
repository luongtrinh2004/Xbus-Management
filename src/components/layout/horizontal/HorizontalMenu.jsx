//auth
import { useSession } from "next-auth/react";

// MUI Imports
import { useTheme } from "@mui/material/styles";

// Component Imports
import HorizontalNav, { Menu, MenuItem, SubMenu } from "@menu/horizontal-menu";
import VerticalNavContent from "./VerticalNavContent";

// Hook Imports
import useVerticalNav from "@menu/hooks/useVerticalNav";

// Styled Component Imports
import StyledHorizontalNavExpandIcon from "@menu/styles/horizontal/StyledHorizontalNavExpandIcon";
import StyledVerticalNavExpandIcon from "@menu/styles/vertical/StyledVerticalNavExpandIcon";

//Menu Data
import horizontalMenuData from "@/data/navigation/horizontalMenuData";

// Style Imports
import menuItemStyles from "@core/styles/horizontal/menuItemStyles";
import menuRootStyles from "@core/styles/horizontal/menuRootStyles";
import verticalNavigationCustomStyles from "@core/styles/vertical/navigationCustomStyles";
import verticalMenuItemStyles from "@core/styles/vertical/menuItemStyles";
import verticalMenuSectionStyles from "@core/styles/vertical/menuSectionStyles";

const RenderExpandIcon = ({ level }) => (
  <StyledHorizontalNavExpandIcon level={level}>
    <i className="tabler-chevron-right" />
  </StyledHorizontalNavExpandIcon>
);

const RenderVerticalExpandIcon = ({ open, transitionDuration }) => (
  <StyledVerticalNavExpandIcon
    open={open}
    transitionDuration={transitionDuration}
  >
    <i className="tabler-chevron-right" />
  </StyledVerticalNavExpandIcon>
);

const HorizontalMenu = () => {
  // Hooks
  const verticalNavOptions = useVerticalNav();
  const { data: session } = useSession();
  const theme = useTheme();

  // Lọc menu theo role của user
  const filteredMenu = session
    ? horizontalMenuData.filter((item) =>
        item.roles.includes(session.user.role),
      )
    : [];

  // Vars
  const { transitionDuration } = verticalNavOptions;

  return (
    <HorizontalNav
      switchToVertical
      verticalNavContent={VerticalNavContent}
      verticalNavProps={{
        customStyles: verticalNavigationCustomStyles(verticalNavOptions, theme),
        backgroundColor: "var(--mui-palette-background-paper)",
      }}
    >
      <Menu
        rootStyles={menuRootStyles(theme)}
        renderExpandIcon={({ level }) => <RenderExpandIcon level={level} />}
        menuItemStyles={menuItemStyles(theme, "tabler-circle")}
        renderExpandedMenuItemIcon={{
          icon: <i className="tabler-circle text-xs" />,
        }}
        popoutMenuOffset={{
          mainAxis: ({ level }) => (level && level > 0 ? 14 : 12),
          alignmentAxis: 0,
        }}
        verticalMenuProps={{
          menuItemStyles: verticalMenuItemStyles(verticalNavOptions, theme),
          renderExpandIcon: ({ open }) => (
            <RenderVerticalExpandIcon
              open={open}
              transitionDuration={transitionDuration}
            />
          ),
          renderExpandedMenuItemIcon: {
            icon: <i className="tabler-circle text-xs" />,
          },
          menuSectionStyles: verticalMenuSectionStyles(
            verticalNavOptions,
            theme,
          ),
        }}
      >
        {filteredMenu.map((item) =>
          item.children?.length ? (
            <SubMenu
              key={item.label}
              label={item.label}
              icon={<i className={item.icon} />}
            >
              {item.children
                .filter(
                  (child) =>
                    !child.roles || child.roles.includes(session.user.role),
                )
                .map((child) => (
                  <MenuItem key={child.label} href={child.href}>
                    {child.label}
                  </MenuItem>
                ))}
            </SubMenu>
          ) : (
            <MenuItem
              key={item.label}
              href={item.href}
              icon={<i className={item.icon} />}
            >
              {item.label}
            </MenuItem>
          ),
        )}
      </Menu>
    </HorizontalNav>
  );
};

export default HorizontalMenu;
