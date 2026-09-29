"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Slide from "@mui/material/Slide";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";

export default function BatchActionBar({
  open = true,
  selectedCount = 0,
  onClearSelection,
  onBatchDelete,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const isVisible = open && selectedCount > 0;
  if (!isVisible) return null;

  return (
    <Slide direction="up" in={isVisible} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1100,
          bgcolor: isDark ? "rgba(47, 51, 73, 0.95)" : "rgba(255, 255, 255, 0.96)",
          color: "text.primary",
          backdropFilter: "blur(14px)",
          border: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "divider",
          boxShadow: isDark
            ? "0 10px 30px 0 rgba(0, 0, 0, 0.45)"
            : "0 10px 30px 0 rgba(47, 43, 61, 0.18)",
          borderRadius: "50px",
          px: 2,
          py: 0.75,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          whiteSpace: "nowrap",
        }}
      >
        {/* Count indicator */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label={selectedCount}
            size="small"
            color="primary"
            sx={{ fontWeight: 700, height: 24, minWidth: 24 }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Đã chọn {selectedCount} mục
          </Typography>
        </Box>

        {/* Divider */}
        <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />

        {/* Action Button: Xóa */}
        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={onBatchDelete}
          startIcon={<i className="tabler-trash" style={{ fontSize: 16 }} />}
          sx={{
            borderRadius: "20px",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.8125rem",
            px: 2,
            py: 0.5,
            boxShadow: "0 2px 8px rgba(255, 77, 73, 0.35)",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(255, 77, 73, 0.45)",
            },
          }}
        >
          Xóa
        </Button>

        {/* Close / Deselect all */}
        <Tooltip title="Bỏ chọn tất cả">
          <IconButton
            size="small"
            onClick={onClearSelection}
            sx={{
              color: "text.secondary",
              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
            }}
          >
            <i className="tabler-x" style={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Slide>
  );
}
