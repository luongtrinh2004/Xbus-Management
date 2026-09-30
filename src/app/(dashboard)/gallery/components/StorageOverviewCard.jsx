"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function StorageOverviewCard({
  storage = {},
  onOpenManagePosts,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const maxBytes = storage.maxBytes || 20 * 1024 * 1024 * 1024; // 20 GB
  const usedBytes = storage.usedBytes || 0;
  const imageBytes = storage.imageBytes || 0;
  const videoBytes = storage.videoBytes || 0;
  const remainingBytes =
    storage.remainingBytes !== undefined
      ? storage.remainingBytes
      : Math.max(0, maxBytes - usedBytes);
  const percentUsed =
    storage.percentUsed !== undefined
      ? storage.percentUsed
      : Number(((usedBytes / maxBytes) * 100).toFixed(1));

  const rawImagePercent = Number(((imageBytes / maxBytes) * 100).toFixed(1));
  const rawVideoPercent = Number(((videoBytes / maxBytes) * 100).toFixed(1));
  const remainingPercent = Number(
    Math.max(0, 100 - (rawImagePercent + rawVideoPercent)).toFixed(1)
  );

  // Subtle visual tick on bar if used bytes > 0 so tiny file usage is still visible
  const visualVideoPercent = videoBytes > 0 ? Math.max(0.8, rawVideoPercent) : 0;
  const visualImagePercent = imageBytes > 0 ? Math.max(0.8, rawImagePercent) : 0;
  const visualRemainingPercent = Math.max(
    0,
    100 - visualVideoPercent - visualImagePercent
  );

  const isWarning = percentUsed >= 70 && percentUsed < 90;
  const isCritical = percentUsed >= 90;

  return (
    <Card sx={{ mb: 6 }}>
      <CardHeader
        sx={{
          pb: 2,
          "& .MuiCardHeader-action": { m: 0, alignSelf: "center" },
        }}
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="h5" fontWeight={600}>
              Tiến độ sử dụng bộ nhớ
            </Typography>
            <Chip
              size="small"
              variant="tonal"
              color={isCritical ? "error" : isWarning ? "warning" : "success"}
              label={`Đã dùng ${percentUsed}%`}
              sx={{ fontWeight: 600, height: 22 }}
            />
          </Box>
        }
        subheader={
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Đã sử dụng{" "}
            <strong style={{ color: theme.palette.text.primary }}>
              {formatBytes(usedBytes)}
            </strong>{" "}
            trên tổng số {formatBytes(maxBytes)}
          </Typography>
        }
        action={
          onOpenManagePosts && (
            <Button
              variant="tonal"
              color="primary"
              size="small"
              onClick={onOpenManagePosts}
              startIcon={<i className="tabler-adjustments-horizontal" />}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Cài Đặt bài đăng
            </Button>
          )
        }
      />

      <CardContent sx={{ pt: 1, pb: "20px !important" }}>
        {/* Sleek, modern multi-segment progress bar */}
        <Box
          sx={{
            width: "100%",
            height: 10,
            borderRadius: 5,
            bgcolor: isDark
              ? "rgba(40, 199, 111, 0.15)"
              : "rgba(40, 199, 111, 0.12)",
            overflow: "hidden",
            display: "flex",
            position: "relative",
          }}
        >
          {/* Video: Xanh biển */}
          {visualVideoPercent > 0 && (
            <Tooltip
              title={`Video: ${formatBytes(videoBytes)} (${rawVideoPercent}%) • ${storage.videoCount || 0} tệp`}
              arrow
            >
              <Box
                sx={{
                  width: `${visualVideoPercent}%`,
                  height: "100%",
                  bgcolor: "#0288d1",
                  transition: "width 0.4s ease",
                  cursor: "pointer",
                }}
              />
            </Tooltip>
          )}

          {/* Hình ảnh: Màu cam */}
          {visualImagePercent > 0 && (
            <Tooltip
              title={`Hình ảnh: ${formatBytes(imageBytes)} (${rawImagePercent}%) • ${storage.imageCount || 0} tệp`}
              arrow
            >
              <Box
                sx={{
                  width: `${visualImagePercent}%`,
                  height: "100%",
                  bgcolor: "#ff9f43",
                  transition: "width 0.4s ease",
                  cursor: "pointer",
                }}
              />
            </Tooltip>
          )}

          {/* Khả dụng: Màu xanh lá dịu mắt */}
          {visualRemainingPercent > 0 && (
            <Tooltip
              title={`Khả dụng: ${formatBytes(remainingBytes)} (${remainingPercent}%)`}
              arrow
            >
              <Box
                sx={{
                  flexGrow: 1,
                  height: "100%",
                  bgcolor: isDark
                    ? "rgba(40, 199, 111, 0.35)"
                    : "rgba(40, 199, 111, 0.22)",
                  transition: "width 0.4s ease",
                  cursor: "pointer",
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Minimalist Apple/Google style inline legend */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            mt: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 2, sm: 3.5 }, flexWrap: "wrap" }}>
            {/* Video */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#0288d1" }} />
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                Video:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
                {formatBytes(videoBytes)} ({storage.videoCount || 0} tệp)
              </Typography>
            </Box>

            {/* Hình ảnh */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ff9f43" }} />
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                Hình ảnh:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
                {formatBytes(imageBytes)} ({storage.imageCount || 0} tệp)
              </Typography>
            </Box>

            {/* Khả dụng */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#28c76f" }} />
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                Khả dụng:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
                {formatBytes(remainingBytes)} ({remainingPercent}%)
              </Typography>
            </Box>
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.75rem" }}>
            Tổng số: {storage.totalFiles || 0} tệp · Không giới hạn tệp/kích cỡ (tạm thời)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
