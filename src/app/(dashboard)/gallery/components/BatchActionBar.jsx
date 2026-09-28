"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Slide from "@mui/material/Slide";
import { useTheme } from "@mui/material/styles";

export default function BatchActionBar({
  selectedCount = 0,
  onClearSelection,
  onBatchDownload,
  onOpenBatchTag,
  onBatchDelete,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (selectedCount === 0) return null;

  return (
    <Slide direction="up" in={selectedCount > 0} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1100,
          bgcolor: isDark ? "rgba(47, 51, 73, 0.95)" : "rgba(255, 255, 255, 0.96)",
          color: "text.primary",
          backdropFilter: "blur(14px)",
          border: "1px solid",
          borderColor: isDark ? "rgba(115, 103, 240, 0.4)" : "primary.main",
          boxShadow: isDark
            ? "0 12px 36px 0 rgba(0, 0, 0, 0.45)"
            : "0 12px 36px 0 rgba(47, 43, 61, 0.18)",
          borderRadius: "50px",
          px: { xs: 2, sm: 3 },
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, sm: 2.5 },
          maxWidth: "92vw",
        }}
      >
        {/* Count indicator */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label={selectedCount}
            size="small"
            color="primary"
            sx={{ fontWeight: 700, height: 24 }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, display: { xs: "none", sm: "block" } }}>
            Đã chọn {selectedCount} mục
          </Typography>
        </Box>

        {/* Divider */}
        <Box sx={{ width: 1, height: 24, bgcolor: "divider" }} />

        {/* Action Buttons */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={onBatchDownload}
            startIcon={<i className="tabler-download" />}
            sx={{
              borderRadius: "20px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8125rem",
              px: 2,
            }}
          >
            Tải tất cả (.zip)
          </Button>

          <Button
            size="small"
            variant={isDark ? "tonal" : "outlined"}
            color="secondary"
            onClick={onOpenBatchTag}
            startIcon={<i className="tabler-tag" />}
            sx={{
              borderRadius: "20px",
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.8125rem",
              px: 2,
            }}
          >
            Gắn thẻ
          </Button>

          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={onBatchDelete}
            startIcon={<i className="tabler-trash" />}
            sx={{
              borderRadius: "20px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8125rem",
              px: 2,
            }}
          >
            Xóa
          </Button>
        </Box>

        {/* Close / Deselect all */}
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
      </Box>
    </Slide>
  );
}
