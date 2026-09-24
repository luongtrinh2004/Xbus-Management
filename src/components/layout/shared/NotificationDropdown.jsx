"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import { toast } from "react-toastify";

const getNotificationConfig = (type) => {
  switch (type) {
    case "duty_water":
      return {
        icon: "tabler-droplet-filled",
        color: "info.main",
        bg: "rgba(0, 186, 209, 0.12)",
      };
    case "duty_trash":
      return {
        icon: "tabler-trash-filled",
        color: "warning.main",
        bg: "rgba(255, 159, 67, 0.12)",
      };
    case "fund_manual_payment":
      return {
        icon: "tabler-wallet",
        color: "warning.main",
        bg: "rgba(255, 159, 67, 0.15)",
      };
    case "fund_confirmed":
      return {
        icon: "tabler-circle-check-filled",
        color: "success.main",
        bg: "rgba(40, 199, 111, 0.12)",
      };
    case "duty_confirmed":
      return {
        icon: "tabler-award-filled",
        color: "primary.main",
        bg: "rgba(115, 103, 240, 0.12)",
      };
    default:
      return {
        icon: "tabler-bell-filled",
        color: "secondary.main",
        bg: "rgba(168, 170, 174, 0.12)",
      };
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay === 1) return "Hôm qua";
  if (diffDay < 7) return `${diffDay} ngày trước`;
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function NotificationDropdown() {
  const { data: session } = useSession();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore network errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Không thể đánh dấu đã đọc");
    }
  };

  const handleItemClick = async (noti) => {
    if (!noti.read) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noti.id }),
      }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === noti.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (noti.link) {
      handleClose();
      router.push(noti.link);
    }
  };

  const handleQuickAction = async (event, noti) => {
    event.stopPropagation();
    if (!noti.action) return;
    setActingId(noti.id);
    try {
      const res = await fetch("/api/notifications/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noti.action),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Thao tác thất bại");
      toast.success(data.message || "Xác nhận thành công!");
      await fetchNotifications();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActingId(null);
    }
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="Thông báo"
        onClick={handleOpen}
        sx={{
          width: 38,
          height: 38,
          p: 0,
          color: unreadCount > 0 ? "error.main" : "text.secondary",
          transition: "transform 0.15s ease",
          "&:hover": { transform: "scale(1.08)" },
        }}
      >
        <Badge
          badgeContent={unreadCount > 99 ? "99+" : unreadCount}
          color="error"
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: "0.6875rem",
              height: 18,
              minWidth: 18,
              px: 0.5,
              fontWeight: 700,
            },
          }}
        >
          <i
            className="tabler-bell"
            style={{
              fontSize: 22,
              color: unreadCount > 0 ? "#ea5455" : "inherit",
            }}
          />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              width: { xs: 320, sm: 380 },
              maxHeight: 520,
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              boxShadow: "0 8px 30px rgba(0,0,0,0.14)",
              overflow: "hidden",
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" fontWeight={700} fontSize="1rem">
              Thông báo
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} mới`}
                size="small"
                color="primary"
                variant="tonal"
                sx={{ height: 22, fontSize: "0.75rem", fontWeight: 600 }}
              />
            )}
          </Box>
          {unreadCount > 0 && (
            <Tooltip title="Đánh dấu tất cả là đã đọc">
              <Button
                size="small"
                onClick={handleMarkAllRead}
                sx={{ textTransform: "none", fontSize: "0.75rem", p: 0.5 }}
              >
                Đã đọc tất cả
              </Button>
            </Tooltip>
          )}
        </Box>

        {/* Danh sách thông báo */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {notifications.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
              <i
                className="tabler-bell-off"
                style={{ fontSize: 36, opacity: 0.5 }}
              />
              <Typography variant="body2" mt={1}>
                Chưa có thông báo nào
              </Typography>
            </Box>
          ) : (
            notifications.map((item) => {
              const cfg = getNotificationConfig(item.type);
              const isActing = actingId === item.id;
              return (
                <Box
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                    cursor: item.link ? "pointer" : "default",
                    bgcolor: item.read
                      ? "transparent"
                      : "rgba(115, 103, 240, 0.05)",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: item.read
                        ? "action.hover"
                        : "rgba(115, 103, 240, 0.09)",
                    },
                    position: "relative",
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: cfg.bg,
                      color: cfg.color,
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    <i className={cfg.icon} />
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        mb: 0.25,
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={item.read ? 600 : 700}
                        color={item.read ? "text.primary" : "primary.main"}
                        noWrap
                      >
                        {item.title}
                      </Typography>
                      {!item.read && (
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.message}
                    </Typography>

                    {/* Nút hành động nhanh nếu có */}
                    {item.action?.type === "confirm_fund" && !item.read && (
                      <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={isActing}
                          onClick={(e) => handleQuickAction(e, item)}
                          startIcon={
                            isActing ? (
                              <CircularProgress size={12} color="inherit" />
                            ) : (
                              <i className="tabler-check" />
                            )
                          }
                          sx={{
                            textTransform: "none",
                            fontSize: "0.75rem",
                            py: 0.25,
                            px: 1.5,
                            height: 26,
                            borderRadius: 1,
                          }}
                        >
                          {isActing ? "Đang duyệt..." : "Duyệt ngay"}
                        </Button>
                      </Box>
                    )}

                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ display: "block", mt: 0.5, fontSize: "0.6875rem" }}
                    >
                      {formatTimeAgo(item.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Popover>
    </>
  );
}
