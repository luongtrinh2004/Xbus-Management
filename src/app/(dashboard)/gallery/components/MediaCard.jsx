"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";

function formatRelativeTime(dateString) {
  try {
    const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return dateString;
  }
}

export default function MediaCard({
  item,
  isSelected,
  onToggleSelect,
  isBatchMode,
  onClick,
  onDownload,
  onShare,
  onDelete,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleOpenMenu = (e) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };

  const handleCloseMenu = (e) => {
    if (e) e.stopPropagation();
    setMenuAnchor(null);
  };

  const isVideo = item.type === "video";

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      sx={{
        cursor: "pointer",
        position: "relative",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        boxShadow: isSelected
          ? "0 0 0 2px rgba(115, 103, 240, 0.4), 0 8px 24px -4px rgba(115, 103, 240, 0.2)"
          : isHovered
            ? "0 8px 24px -4px rgba(47, 43, 61, 0.16)"
            : "0 2px 6px 0 rgba(47, 43, 61, 0.06)",
        transform: isHovered ? "translateY(-4px)" : "none",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Thumbnail Area */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          paddingTop: "56.25%", // 16:9 Aspect Ratio
          bgcolor: "background.default",
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src={item.thumbnail || item.url}
          alt={item.title || item.fileName}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.4s ease",
            transform: isHovered ? "scale(1.05)" : "scale(1)",
          }}
        />

        {/* Dark overlay gradient */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 100%)",
            opacity: isHovered ? 0.9 : 0.6,
            transition: "opacity 0.2s ease",
          }}
        />

        {/* Checkbox (Batch select) */}
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 3,
            opacity: isSelected || isBatchMode || isHovered ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(item.id);
          }}
        >
          <Checkbox
            checked={isSelected}
            size="small"
            sx={{
              p: 0.5,
              bgcolor: isSelected ? "primary.main" : "rgba(0, 0, 0, 0.5)",
              color: "#fff",
              borderRadius: "6px",
              backdropFilter: "blur(4px)",
              "&.Mui-checked": {
                bgcolor: "primary.main",
                color: "#fff",
              },
              "&:hover": {
                bgcolor: isSelected ? "primary.dark" : "rgba(0, 0, 0, 0.7)",
              },
            }}
          />
        </Box>

        {/* Top-Right Badge: First Tag */}
        {item.tags?.[0] && (
          <Box sx={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
            <Chip
              label={item.tags[0]}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#fff",
                bgcolor: "rgba(0, 0, 0, 0.55)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            />
          </Box>
        )}

        {/* Center: Play Icon if Video */}
        {isVideo && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 2,
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: "rgba(115, 103, 240, 0.85)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              transition: "transform 0.2s ease, background-color 0.2s ease",
              "&:hover": {
                bgcolor: "primary.main",
                transform: "translate(-50%, -50%) scale(1.1)",
              },
            }}
          >
            <i className="tabler-player-play-filled" style={{ fontSize: 22, marginLeft: 2 }} />
          </Box>
        )}

        {/* Bottom Right: Duration (Video) or Format (Image) */}
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: "4px",
            bgcolor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            color: "#fff",
            fontSize: "0.72rem",
            fontWeight: 600,
          }}
        >
          {isVideo ? (
            <>
              <i className="tabler-video" style={{ fontSize: 13 }} />
              <span>{item.duration || "Video"}</span>
            </>
          ) : (
            <>
              <i className="tabler-photo" style={{ fontSize: 13 }} />
              <span>{item.fileFormat || "JPG"}</span>
            </>
          )}
        </Box>

        {/* Privacy Icon Bottom Left */}
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 8,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 0.8,
            py: 0.25,
            borderRadius: "4px",
            bgcolor: "rgba(0, 0, 0, 0.65)",
            color: "rgba(255,255,255,0.85)",
            fontSize: "0.7rem",
          }}
        >
          {item.privacy === "public" && (
            <Tooltip title="Công khai">
              <i className="tabler-world" style={{ fontSize: 13 }} />
            </Tooltip>
          )}
          {item.privacy === "team" && (
            <Tooltip title="Nội bộ team">
              <i className="tabler-users" style={{ fontSize: 13 }} />
            </Tooltip>
          )}
          {item.privacy === "private" && (
            <Tooltip title="Chỉ mình tôi">
              <i className="tabler-lock" style={{ fontSize: 13 }} />
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Card Body */}
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        {/* Title & Quick Action Menu */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Tooltip title={item.title || item.fileName} placement="top">
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                fontSize: "0.9375rem",
                lineHeight: 1.35,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
              }}
            >
              {item.title || item.fileName}
            </Typography>
          </Tooltip>

          <IconButton
            size="small"
            onClick={handleOpenMenu}
            sx={{
              p: 0.5,
              mt: -0.5,
              mr: -0.5,
              color: "text.secondary",
              "&:hover": { color: "primary.main" },
            }}
          >
            <i className="tabler-dots-vertical" style={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* File size & format */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {item.fileSizeFormatted}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            •
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.dimensions || item.fileFormat}
          </Typography>
          {item.likes > 0 && (
            <>
              <Typography variant="caption" color="text.disabled">
                •
              </Typography>
              <Typography variant="caption" sx={{ color: "error.main", display: "flex", alignItems: "center", gap: 0.3 }}>
                <i className={item.isLiked ? "tabler-heart-filled" : "tabler-heart"} style={{ fontSize: 12 }} />
                {item.likes}
              </Typography>
            </>
          )}
        </Box>

        {/* Uploader Info */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: 1.5,
            pt: 1.5,
            borderTop: "1px dashed",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <Avatar
              src={item.uploader?.avatar}
              alt={item.uploader?.name}
              sx={{ width: 26, height: 26, fontSize: 12, bgcolor: "primary.light" }}
            >
              {item.uploader?.name?.[0]}
            </Avatar>
            <Tooltip title={item.uploader?.name || ""}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 500,
                  color: "text.primary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 150,
                }}
              >
                {item.uploader?.name}
              </Typography>
            </Tooltip>
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
            {formatRelativeTime(item.uploadedAt)}
          </Typography>
        </Box>
      </CardContent>

      {/* Quick Action Popup Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: { minWidth: 180, borderRadius: 1.5, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" },
        }}
      >
        <MenuItem
          onClick={() => {
            handleCloseMenu();
            onClick();
          }}
        >
          <ListItemIcon>
            <i className="tabler-eye text-primary" style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText primary="Xem chi tiết" />
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleCloseMenu();
            onDownload(item);
          }}
        >
          <ListItemIcon>
            <i className="tabler-download" style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText primary="Tải xuống" />
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleCloseMenu();
            onShare(item);
          }}
        >
          <ListItemIcon>
            <i className="tabler-share" style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText primary="Lấy link chia sẻ" />
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleCloseMenu();
            onDelete(item);
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "error.main" }}>
            <i className="tabler-trash" style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText primary="Xóa file" />
        </MenuItem>
      </Menu>
    </Card>
  );
}
