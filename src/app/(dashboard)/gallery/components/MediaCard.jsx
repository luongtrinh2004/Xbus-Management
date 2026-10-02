"use client";
import { getAlbumLink } from "@/libs/galleryAlbumLink";
import { startGalleryBackgroundUpload, isGalleryUploadActive } from "@/libs/galleryBackgroundUpload";
import { toast } from "react-toastify";
import Button from "@mui/material/Button";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import LinearProgress from "@mui/material/LinearProgress";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import { renderWithMentions, resolveAuthorAvatar } from "./mentionUtils";

const uploadSize = value => {
  const bytes = Number(value) || 0;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  return `${(bytes / 1e6).toFixed(1)} MB`;
};

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
  onEdit,
  onToggleLike,
  canEdit = true,
  canDelete = true,
  usersList = [],
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  const handleOpenMenu = (e) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };

  const handleCloseMenu = (e) => {
    if (e) e.stopPropagation();
    setMenuAnchor(null);
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 400);
    if (onToggleLike) onToggleLike(item.id);
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    if (onShare) onShare(item);
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (onDownload) onDownload(item);
  };

  const isVideo =
    item.type === "video" || /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(item.url || "");
  const hasImageThumbnail =
    Boolean(item.thumbnail &&
    item.thumbnail !== item.url &&
    !/\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(item.thumbnail));
  const hasMultipleFiles = (item.totalFiles || item.postTotalFiles || 1) > 1;

  // Title fallback formatting
  const rawTitle = (item.title || "").trim();
  const isNoTitle =
    !rawTitle ||
    rawTitle.startsWith("Gemini_Generated_Image") ||
    /^\d{6,}_/.test(rawTitle) ||
    /\.(jpe?g|png|webp|gif|mp4|mov|svg)$/i.test(rawTitle);
  const displayTitle = isNoTitle ? "Bài viết không có tiêu đề" : rawTitle;

  // Description fallback formatting
  const rawDesc = (item.description || "").trim();
  const isNoDesc =
    !rawDesc ||
    rawDesc === "Tệp media được tải lên hệ thống lưu trữ nội bộ Xbus." ||
    rawDesc === "-";
  const displayDescription = isNoDesc ? "Mô tả : -" : rawDesc;

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        boxShadow: isSelected
          ? "0 0 0 2px rgba(115, 103, 240, 0.4), 0 8px 24px -4px rgba(115, 103, 240, 0.2)"
          : isHovered
            ? "0 10px 28px -4px rgba(47, 43, 61, 0.16)"
            : "0 2px 6px 0 rgba(47, 43, 61, 0.06)",
        transform: isHovered ? "translateY(-4px)" : "none",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* 1. Instagram-style Header: Uploader Avatar, Name, Time, Menu (Fixed Height 56px) */}
      <CardHeader
        avatar={
          <Avatar
            src={resolveAuthorAvatar(item.uploader, usersList)}
            alt={item.uploader?.name}
            sx={{ width: 34, height: 34, fontSize: 13, bgcolor: "primary.light" }}
          >
            {item.uploader?.name?.[0]}
          </Avatar>
        }
        title={
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: "text.primary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 160,
            }}
          >
            {item.uploader?.name || "Thành viên Xbus"}
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.75rem" }}>
            {formatRelativeTime(item.uploadedAt)}
          </Typography>
        }
        action={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {/* Checkbox for batch mode */}
            {(isSelected || isBatchMode || isHovered) && (
              <Checkbox
                checked={isSelected}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(item.id);
                }}
                sx={{
                  p: 0.5,
                  mr: 0.5,
                  color: isSelected ? "primary.main" : "text.secondary",
                  "&.Mui-checked": { color: "primary.main" },
                }}
              />
            )}
            <IconButton
              size="small"
              onClick={handleOpenMenu}
              sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
            >
              <i className="tabler-dots-vertical" style={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        }
        sx={{
          p: "10px 14px 8px",
          minHeight: 56,
          boxSizing: "border-box",
          alignItems: "center",
        }}
      />

      {/* 2. Media Area: Fixed aspect ratio (Click to open full view) */}
      <Box
        onClick={item.files?.length === 0 ? undefined : onClick}
        sx={{
          position: "relative",
          width: "100%",
          paddingTop: "70%", // Consistent aspect ratio
          bgcolor: "background.default",
          overflow: "hidden",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {isVideo && !hasImageThumbnail ? (
          <Box
            component="video"
            src={`${item.url}#t=0.5`}
            preload="none"
            muted
            playsInline
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              bgcolor: "#000",
              pointerEvents: "none",
              transition: "transform 0.4s ease",
              transform: isHovered ? "scale(1.04)" : "scale(1)",
            }}
          />
        ) : (
          <Box
            component="img"
            src={hasImageThumbnail ? item.thumbnail : item.url}
            alt={displayTitle}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.4s ease",
              transform: isHovered ? "scale(1.04)" : "scale(1)",
            }}
          />
        )}

        {/* Multi-file subtle icon indicator (No text, no hashtag) */}
        {hasMultipleFiles && (
          <Box
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 2,
              bgcolor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              color: "#fff",
              borderRadius: "6px",
              p: "4px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            <i className="tabler-copy" style={{ fontSize: 15 }} />
          </Box>
        )}

        {/* Center Play Button for Video */}
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
            }}
          >
            <i className="tabler-player-play-filled" style={{ fontSize: 20, marginLeft: 2 }} />
          </Box>
        )}
      </Box>

      {/* 3. Instagram-style Action Bar: Like, Comment, Share, Download (Fixed Height 42px) */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1,
          pt: 0.5,
          pb: 0.5,
          minHeight: 42,
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {/* Nút Tym (Like) kèm số lượng bên phải */}
          <Tooltip title={item.isLiked ? "Bỏ thích" : "Thích bài viết"}>
            <Box
              component="button"
              type="button"
              onClick={handleLikeClick}
              sx={{
                border: 0,
                py: 0.5,
                px: 1,
                bgcolor: "transparent",
                color: item.isLiked ? "#ea5455" : "text.secondary",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
                borderRadius: 1.5,
                transition: "all 0.15s ease",
                "&:hover": {
                  color: "#ea5455",
                  bgcolor: "rgba(234, 84, 85, 0.08)",
                },
              }}
            >
              <i
                className={item.isLiked ? "tabler-heart-filled" : "tabler-heart"}
                style={{
                  fontSize: 20,
                  transition: "transform 0.15s ease",
                  transform: isLikeAnimating ? "scale(1.35)" : "scale(1)",
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  color: item.isLiked ? "#ea5455" : "text.secondary",
                  userSelect: "none",
                }}
              >
                {item.likes || 0}
              </Typography>
            </Box>
          </Tooltip>

          {/* Nút Bình luận kèm số lượng bên phải */}
          <Tooltip title="Xem và viết bình luận">
            <Box
              component="button"
              type="button"
              onClick={handleCommentClick}
              sx={{
                border: 0,
                py: 0.5,
                px: 1,
                bgcolor: "transparent",
                color: "text.secondary",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
                borderRadius: 1.5,
                transition: "all 0.15s ease",
                "&:hover": {
                  color: "primary.main",
                  bgcolor: "rgba(115, 103, 240, 0.08)",
                },
              }}
            >
              <i className="tabler-message-circle-2" style={{ fontSize: 20 }} />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  color: "text.secondary",
                  userSelect: "none",
                }}
              >
                {item.comments?.length || 0}
              </Typography>
            </Box>
          </Tooltip>

          {/* Nút Chia sẻ */}
          <Tooltip title="Lấy liên kết bài đăng">
            <IconButton
              size="small"
              onClick={handleShareClick}
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "primary.main",
                  bgcolor: "rgba(115, 103, 240, 0.08)",
                },
              }}
            >
              <i className="tabler-share" style={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Nút Tải xuống nhanh */}
        <Tooltip title="Tải xuống tệp gốc">
          <IconButton
            size="small"
            onClick={handleDownloadClick}
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "primary.main",
                bgcolor: "rgba(115, 103, 240, 0.08)",
              },
            }}
          >
            <i className="tabler-download" style={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 4. Content Area: Minimal Upload Progress */}
      {item.uploadState && item.uploadState.state !== "completed" && (() => {
        const sessions = item.uploadState.sessions || [];
        const uploadedTotal = sessions.reduce((sum, s) => sum + (s.uploadedBytes || 0), 0);
        const sizeTotal = sessions.reduce((sum, s) => sum + s.size, 0);

        return (
          <Box
            sx={{
              mx: 2,
              my: 1.5,
              p: 2,
              borderRadius: 1.5,
              bgcolor: "action.hover",
              border: "1px solid",
              borderColor: "divider",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.825rem" }}>
                {item.uploadState.state === "failed" ? "Tải lên gặp sự cố" : "Đang tải lên / xử lý tệp"}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                {item.uploadState.progress || 0}%
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={item.uploadState.progress || 0}
              sx={{ height: 6, borderRadius: 1, mb: 1 }}
            />

            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", display: "block" }}>
              Đã tải {uploadSize(uploadedTotal)} / {uploadSize(sizeTotal)}
            </Typography>

            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              Đã sẵn sàng: {item.files?.length || 0} ảnh/video · File hoàn tất sẽ xuất hiện tự động.
            </Typography>
            {sessions.filter(s => s.state === "processing").map(s => (
              <Typography key={`processing-${s.sessionId}`} variant="caption" sx={{ display: "block" }}>
                {s.name}: {s.totalFiles ? `Đã xử lý ${s.readyFiles || 0}/${s.totalFiles} file` : "Đang ghép file / mở tệp nén…"}
              </Typography>
            ))}
            {sessions.some(s => s.state === "uploading") && !isGalleryUploadActive(item.id) && (
              <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 1 }}>
                Tab này không truyền file. Nếu đã F5 hoặc mất kết nối, chọn lại file gốc để tiếp tục từ phần đã lưu.
              </Typography>
            )}
            {sessions.filter(s => s.error).map(s => <Typography key={s.sessionId} variant="caption" color="error" sx={{ display: "block" }}>{s.name}: {s.error}</Typography>)}
            {canEdit && sessions.some((session) => session.state === "uploading") && (
              <Box sx={{ mt: 1 }}>
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  fullWidth
                  sx={{ fontSize: "0.72rem", py: 0.25, textTransform: "none" }}
                  onClick={(event) => event.stopPropagation()}
                >
                  Chọn lại file gốc để tiếp tục sau F5
                  <input
                    hidden
                    type="file"
                    multiple
                    onChange={async (event) => {
                      const selected = Array.from(event.target.files || []);
                      event.target.value = "";
                      const uploads = selected.map((file) => {
                        const session = item.uploadState.sessions.find(
                          (s) =>
                            s.name === file.name &&
                            s.size === file.size &&
                            s.state === "uploading"
                        );
                        return session ? { file, sessionId: session.sessionId, resume: true } : null;
                      });
                      if (uploads.some((file) => !file))
                        return toast.error("Hãy chọn đúng file gốc đang tải của bài đăng này");
                      try {
                        await startGalleryBackgroundUpload(item.id, uploads);
                      } catch (error) {
                        toast.error(error.message);
                      }
                    }}
                  />
                </Button>
              </Box>
            )}
          </Box>
        );
      })()}
      {item.postType === "album_link" && getAlbumLink(item.description) && (
        <Button component="a" href={getAlbumLink(item.description)} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()} sx={{ mx: 2, mt: 1 }} variant="outlined" startIcon={<i className="tabler-external-link" />}>
          Mở album
        </Button>
      )}
      <CardContent
        sx={{
          px: 2,
          pt: 1,
          pb: 2,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          "&:last-child": { pb: 2 },
        }}
      >

        {/* Tiêu đề bài đăng (Fixed height box: 26px) */}
        <Box sx={{ minHeight: 26, mb: 0.5, display: "flex", alignItems: "center" }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: isNoTitle ? 400 : 600,
              fontStyle: isNoTitle ? "italic" : "normal",
              fontSize: "0.9125rem",
              lineHeight: 1.3,
              color: isNoTitle ? "text.disabled" : "text.primary",
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              width: "100%",
            }}
            onClick={item.files?.length === 0 ? undefined : onClick}
          >
            {isNoTitle ? displayTitle : renderWithMentions(displayTitle)}
          </Typography>
        </Box>

        {/* Mô tả chi tiết bài đăng (Fixed height box: 36px) */}
        {item.postType !== "album_link" && (
        <Box sx={{ minHeight: 36, mb: 1, display: "flex", alignItems: "flex-start" }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.825rem",
              lineHeight: 1.4,
              color: isNoDesc ? "text.disabled" : "text.secondary",
              fontStyle: isNoDesc ? "italic" : "normal",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              cursor: "pointer",
              width: "100%",
            }}
            onClick={item.files?.length === 0 ? undefined : onClick}
          >
            {isNoDesc ? displayDescription : renderWithMentions(displayDescription)}
          </Typography>
        </Box>
        )}

        {/* Link xem tất cả bình luận ở đáy card (mt: "auto", Fixed height box: 20px) */}
        <Box sx={{ mt: "auto", minHeight: 20, display: "flex", alignItems: "center" }}>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: (item.comments?.length || 0) > 0 ? "text.secondary" : "text.disabled",
              fontWeight: 500,
              cursor: "pointer",
              "&:hover": { color: "primary.main" },
            }}
            onClick={item.files?.length === 0 ? undefined : onClick}
          >
            {(item.comments?.length || 0) > 0
              ? `Xem tất cả ${item.comments.length} bình luận`
              : "Chưa có bình luận"}
          </Typography>
        </Box>
      </CardContent>

      {/* Menu tác vụ (3 chấm) */}
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

        {canEdit && onEdit && (
          <MenuItem
            onClick={() => {
              handleCloseMenu();
              onEdit(item);
            }}
          >
            <ListItemIcon>
              <i className="tabler-edit text-warning" style={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText primary="Chỉnh sửa bài" />
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            handleCloseMenu();
            onDownload(item);
          }}
        >
          <ListItemIcon>
            <i className="tabler-download" style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText primary="Tải xuống tệp" />
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
          <ListItemText primary="Lấy liên kết" />
        </MenuItem>

        {canDelete && (
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
            <ListItemText primary="Xóa bài đăng" />
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}
