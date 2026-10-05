"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

const links = [
  { href: "/work/projects", label: "Dự án", icon: "tabler-layout-grid" },
  {
    href: "/work/my-tasks",
    label: "Công việc của tôi",
    icon: "tabler-circle-check",
  },
  { href: "/work/templates", label: "Mẫu dự án", icon: "tabler-template" },
];

function Navigation({ pathname, compact = false }) {
  return links.map((link) => {
    const active = pathname.startsWith(link.href);
    return (
      <Tooltip
        key={link.href}
        title={compact ? link.label : ""}
        placement="right"
      >
        <Button
          component={Link}
          href={link.href}
          fullWidth={!compact}
          aria-current={active ? "page" : undefined}
          startIcon={!compact ? <i className={link.icon} /> : undefined}
          sx={{
            minWidth: compact ? 42 : 0,
            width: compact ? 42 : "100%",
            height: 38,
            px: compact ? 0 : 1.25,
            justifyContent: compact ? "center" : "flex-start",
            color: active ? "text.primary" : "text.secondary",
            bgcolor: active ? "action.selected" : "transparent",
            fontWeight: active ? 650 : 500,
            borderRadius: 1.25,
            "&:hover": { bgcolor: "action.hover", color: "text.primary" },
          }}
        >
          {compact ? <i className={link.icon} /> : link.label}
        </Button>
      </Tooltip>
    );
  });
}

export default function WorkShell({ children }) {
  const pathname = usePathname();

  // Plane already provides its own project navigation and workspace chrome.
  // Do not wrap it in the legacy XBus Work shell, otherwise both sidebars are
  // rendered and the iframe can no longer fill the dashboard content area.
  if (pathname.startsWith("/work/projects")) {
    return children;
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "calc(100vh - 132px)",
        mx: { xs: -2, sm: -3, lg: -6 },
        my: { xs: -2, sm: -3, lg: -6 },
        bgcolor: "background.paper",
        color: "text.primary",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box
        component="aside"
        sx={{
          width: 236,
          flexShrink: 0,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,.018)"
              : "#fbfbfc",
          borderRight: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            height: 58,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 2,
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: "#5c5bd6",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            X
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              XBus Workspace
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Quản lý công việc
            </Typography>
          </Box>
          <IconButton size="small">
            <i className="tabler-selector" style={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Divider />
        <Box
          sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 0.35 }}
        >
          <Button
            component={Link}
            href="/work/projects?create=blank"
            variant="contained"
            fullWidth
            startIcon={<i className="tabler-plus" />}
            sx={{
              justifyContent: "flex-start",
              mb: 0.75,
              boxShadow: "none",
              bgcolor: "#5c5bd6",
              "&:hover": { bgcolor: "#4f4ec4", boxShadow: "none" },
            }}
          >
            Tạo dự án
          </Button>
          <Navigation pathname={pathname} />
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ p: 1.5 }}>
          <Box
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
            }}
          >
            <Typography variant="caption" fontWeight={700}>
              Không gian làm việc
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mt: 0.5 }}
            >
              Tập trung dự án và công việc của đội ngũ tại một nơi.
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Box
          sx={{
            height: 58,
            px: { xs: 1.5, sm: 2.5 },
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            gap: 1,
          }}
        >
          <Box sx={{ display: { xs: "flex", md: "none" }, gap: 0.25 }}>
            <Navigation pathname={pathname} compact />
          </Box>
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Workspace
            </Typography>
            <i
              className="tabler-chevron-right"
              style={{ fontSize: 15, opacity: 0.55 }}
            />
            <Typography variant="body2" fontWeight={600}>
              Công việc
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Tìm kiếm">
            <IconButton size="small">
              <i className="tabler-search" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Trợ giúp">
            <IconButton size="small">
              <i className="tabler-help-circle" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2, sm: 3 },
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "background.default" : "#f8f8fa",
            "& .MuiCard-root": {
              boxShadow: "none",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
            },
            "& .MuiButton-root": { textTransform: "none" },
            "& .MuiInputBase-root": { borderRadius: 1.25 },
          }}
        >
          <Box
            sx={{
              maxWidth: 1600,
              mx: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
