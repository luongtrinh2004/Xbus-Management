"use client";

import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import CustomTextField from "@core/components/mui/TextField";
import { toast } from "react-toastify";

function formatFullDateTime(dateString) {
  try {
    const d = new Date(dateString);
    return `${d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })} - ${d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}`;
  } catch {
    return dateString;
  }
}

function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function MediaLightbox({
  open,
  item,
  itemsList = [],
  currentIndex = 0,
  onClose,
  onNavigate,
  onToggleLike,
  onAddComment,
  onDownload,
  onShare,
  currentUser,
  usersList = [],
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Image controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Video controls
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoQuality, setVideoQuality] = useState("1080p");
  const [speedMenuAnchor, setSpeedMenuAnchor] = useState(null);
  const [qualityMenuAnchor, setQualityMenuAnchor] = useState(null);

  // Comment input
  const [commentText, setCommentText] = useState("");

  // Reset image / video state when active item changes
  useEffect(() => {
    setZoomLevel(1);
    setRotation(0);
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = 1;
    }
  }, [item?.id]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) onNavigate(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        if (currentIndex < itemsList.length - 1) onNavigate(currentIndex + 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, itemsList.length, onNavigate, onClose]);

  if (!item) return null;

  const isVideo = item.type === "video";
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < itemsList.length - 1;

  // Video handlers
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || item.durationSeconds || 0);
  };

  const handleSeek = (_, val) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const handleVolumeChange = (_, val) => {
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  const handleChangeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setSpeedMenuAnchor(null);
  };

  // Image zoom/rotation handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetImage = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Send comment
  const handleSendComment = () => {
    if (!commentText.trim()) return;
    const matched = usersList.find(
      (u) =>
        (currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.id && u.id === currentUser.id) ||
        (currentUser?.name && u.name === currentUser.name)
    );
    onAddComment(item.id, {
      id: `cmt_${Date.now()}`,
      author: {
        name: matched?.name || currentUser?.name || "Vũ Hoàng Dũng",
        avatar: matched?.avatar || currentUser?.image || "/images/avatars/male-admin.png",
        department: matched?.department || "AP",
      },
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    });
    setCommentText("");
    toast.success("Đã đăng bình luận!");
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: isDark ? "background.default" : "#F8F7FA",
          color: "text.primary",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      {/* Top Header Bar */}
      <Box
        sx={{
          height: 64,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          zIndex: 10,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton size="small" onClick={onClose} color="inherit">
            <i className="tabler-x" style={{ fontSize: 22 }} />
          </IconButton>
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: "text.primary", maxWidth: 450 }} noWrap>
              {item.title || item.fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentIndex + 1} / {itemsList.length} tệp • {item.fileSizeFormatted}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Xem toàn màn hình">
            <IconButton size="small" onClick={handleFullscreenToggle} color="inherit">
              <i className="tabler-maximize" style={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Tải xuống tệp">
            <IconButton size="small" onClick={() => onDownload(item)} color="inherit">
              <i className="tabler-download" style={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Lấy link chia sẻ">
            <IconButton size="small" onClick={() => onShare(item)} color="inherit">
              <i className="tabler-share" style={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Lightbox Body (Center Stage + Side Panel) */}
      <Box sx={{ flexGrow: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Left / Center: Media Display Stage */}
        <Box
          sx={{
            flexGrow: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
            overflow: "hidden",
            bgcolor: isDark ? "#121420" : "#EDEEF2",
          }}
        >
          {/* Previous Arrow */}
          {hasPrev && (
            <IconButton
              onClick={() => onNavigate(currentIndex - 1)}
              sx={{
                position: "absolute",
                left: 20,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 5,
                bgcolor: isDark ? "rgba(47, 51, 73, 0.8)" : "rgba(255, 255, 255, 0.9)",
                color: "text.primary",
                boxShadow: isDark ? "0 4px 14px rgba(0,0,0,0.4)" : "0 4px 14px rgba(47, 43, 61, 0.14)",
                border: "1px solid",
                borderColor: "divider",
                "&:hover": { bgcolor: "primary.main", color: "#fff" },
              }}
            >
              <i className="tabler-chevron-left" style={{ fontSize: 28 }} />
            </IconButton>
          )}

          {/* Next Arrow */}
          {hasNext && (
            <IconButton
              onClick={() => onNavigate(currentIndex + 1)}
              sx={{
                position: "absolute",
                right: 20,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 5,
                bgcolor: isDark ? "rgba(47, 51, 73, 0.8)" : "rgba(255, 255, 255, 0.9)",
                color: "text.primary",
                boxShadow: isDark ? "0 4px 14px rgba(0,0,0,0.4)" : "0 4px 14px rgba(47, 43, 61, 0.14)",
                border: "1px solid",
                borderColor: "divider",
                "&:hover": { bgcolor: "primary.main", color: "#fff" },
              }}
            >
              <i className="tabler-chevron-right" style={{ fontSize: 28 }} />
            </IconButton>
          )}

          {/* Media Element: Image or Video */}
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {isVideo ? (
              <Box
                sx={{
                  position: "relative",
                  maxWidth: "92%",
                  maxHeight: "82%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <video
                  ref={videoRef}
                  src={item.url}
                  poster={item.thumbnail}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  onClick={handleTogglePlay}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "75vh",
                    borderRadius: 8,
                    cursor: "pointer",
                    boxShadow: isDark
                      ? "0 10px 30px rgba(0,0,0,0.6)"
                      : "0 10px 30px rgba(47, 43, 61, 0.16)",
                  }}
                />

                {/* Center Play Button when paused */}
                {!isPlaying && (
                  <IconButton
                    onClick={handleTogglePlay}
                    sx={{
                      position: "absolute",
                      width: 68,
                      height: 68,
                      bgcolor: "rgba(115, 103, 240, 0.9)",
                      color: "#fff",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                      "&:hover": { bgcolor: "primary.main", transform: "scale(1.1)" },
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <i className="tabler-player-play-filled" style={{ fontSize: 32, marginLeft: 4 }} />
                  </IconButton>
                )}
              </Box>
            ) : (
              <Box
                component="img"
                src={item.url}
                alt={item.title}
                sx={{
                  maxWidth: "90%",
                  maxHeight: "82%",
                  objectFit: "contain",
                  borderRadius: 1.5,
                  boxShadow: isDark
                    ? "0 10px 30px rgba(0,0,0,0.6)"
                    : "0 10px 30px rgba(47, 43, 61, 0.15)",
                  transition: "transform 0.2s ease",
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                }}
              />
            )}
          </Box>

          {/* Floating Controls Bar at Bottom */}
          <Box
            sx={{
              position: "absolute",
              bottom: 20,
              bgcolor: isDark ? "rgba(47, 51, 73, 0.92)" : "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(12px)",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: isDark
                ? "0 8px 24px rgba(0,0,0,0.4)"
                : "0 8px 24px -4px rgba(47, 43, 61, 0.15)",
              color: "text.primary",
              borderRadius: 3,
              px: 2.5,
              py: 1,
              display: "flex",
              alignItems: "center",
              gap: 2,
              zIndex: 5,
              maxWidth: "90%",
            }}
          >
            {isVideo ? (
              /* Custom Video Controls */
              <>
                <IconButton size="small" onClick={handleTogglePlay} color="primary">
                  <i className={isPlaying ? "tabler-player-pause-filled" : "tabler-player-play-filled"} style={{ fontSize: 20 }} />
                </IconButton>

                <Typography variant="caption" sx={{ minWidth: 85, fontFamily: "monospace", fontWeight: 600 }}>
                  {formatDuration(currentTime)} / {formatDuration(duration || item.durationSeconds || 0)}
                </Typography>

                {/* Seekbar */}
                <Slider
                  size="small"
                  min={0}
                  max={duration || item.durationSeconds || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  sx={{
                    width: { xs: 100, sm: 180, md: 240 },
                    color: "primary.main",
                    "& .MuiSlider-thumb": { width: 12, height: 12 },
                  }}
                />

                {/* Volume */}
                <IconButton size="small" onClick={handleToggleMute} color="inherit">
                  <i className={isMuted || volume === 0 ? "tabler-volume-3" : "tabler-volume"} style={{ fontSize: 18 }} />
                </IconButton>
                <Slider
                  size="small"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  sx={{
                    width: 70,
                    color: "primary.main",
                    display: { xs: "none", sm: "inline-flex" },
                    "& .MuiSlider-thumb": { width: 10, height: 10 },
                  }}
                />

                {/* Playback speed */}
                <Button
                  size="small"
                  onClick={(e) => setSpeedMenuAnchor(e.currentTarget)}
                  sx={{ color: "text.primary", textTransform: "none", fontSize: "0.75rem", minWidth: 42, px: 0.5, fontWeight: 600 }}
                >
                  {playbackSpeed}x
                </Button>
                <Menu
                  anchorEl={speedMenuAnchor}
                  open={Boolean(speedMenuAnchor)}
                  onClose={() => setSpeedMenuAnchor(null)}
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                    <MenuItem key={spd} onClick={() => handleChangeSpeed(spd)} selected={playbackSpeed === spd}>
                      {spd}x {spd === 1 && "(Chuẩn)"}
                    </MenuItem>
                  ))}
                </Menu>

                {/* Quality */}
                <Button
                  size="small"
                  onClick={(e) => setQualityMenuAnchor(e.currentTarget)}
                  sx={{ color: "text.primary", textTransform: "none", fontSize: "0.75rem", minWidth: 50, px: 0.5, fontWeight: 600 }}
                >
                  {videoQuality}
                </Button>
                <Menu
                  anchorEl={qualityMenuAnchor}
                  open={Boolean(qualityMenuAnchor)}
                  onClose={() => setQualityMenuAnchor(null)}
                >
                  {["1080p Full HD", "720p HD", "480p SD"].map((q) => (
                    <MenuItem
                      key={q}
                      onClick={() => {
                        setVideoQuality(q.split(" ")[0]);
                        setQualityMenuAnchor(null);
                      }}
                      selected={videoQuality === q.split(" ")[0]}
                    >
                      {q}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            ) : (
              /* Image Zoom & Rotate Controls */
              <>
                <Tooltip title="Thu nhỏ (-25%)">
                  <IconButton size="small" onClick={handleZoomOut} color="inherit">
                    <i className="tabler-zoom-out" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>

                <Typography variant="caption" sx={{ minWidth: 42, textAlign: "center", fontWeight: 600 }}>
                  {Math.round(zoomLevel * 100)}%
                </Typography>

                <Tooltip title="Phóng to (+25%)">
                  <IconButton size="small" onClick={handleZoomIn} color="inherit">
                    <i className="tabler-zoom-in" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ borderColor: "divider" }} />

                <Tooltip title="Xoay ảnh 90 độ">
                  <IconButton size="small" onClick={handleRotate} color="inherit">
                    <i className="tabler-rotate-clockwise" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Đặt lại kích thước ban đầu">
                  <IconButton size="small" onClick={handleResetImage} color="inherit">
                    <i className="tabler-refresh" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {/* Right Side Panel: Details & Comments */}
        <Box
          sx={{
            width: { xs: "100%", md: 380, lg: 420 },
            borderLeft: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            p: 3,
            gap: 3,
          }}
        >
          {/* Uploader Profile */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              src={item.uploader?.avatar}
              sx={{ width: 48, height: 48, border: "2px solid #7367F0", bgcolor: "primary.light" }}
            >
              {item.uploader?.name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: "text.primary" }}>
                {item.uploader?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {item.uploader?.role || item.uploader?.department}
                {item.uploader?.code ? ` (${item.uploader.code})` : ""}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {formatFullDateTime(item.uploadedAt)}
              </Typography>
            </Box>
          </Box>

          {/* Social Interactions: Like, Download, Share */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              py: 1.5,
              borderTop: "1px solid",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Button
              variant={item.isLiked ? "contained" : "outlined"}
              color="error"
              size="small"
              onClick={() => onToggleLike(item.id)}
              startIcon={<i className={item.isLiked ? "tabler-heart-filled" : "tabler-heart"} />}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {item.likes} Yêu thích
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={() => onDownload(item)}
              startIcon={<i className="tabler-download" />}
              sx={{ textTransform: "none" }}
            >
              Tải xuống
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={() => onShare(item)}
              startIcon={<i className="tabler-share" />}
              sx={{ textTransform: "none" }}
            >
              Chia sẻ
            </Button>
          </Box>

          {/* Description & Tags */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}>
              Mô tả:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {item.description || "Không có mô tả bổ sung cho tệp này."}
            </Typography>

            {item.tags && item.tags.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 1.5 }}>
                {item.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{
                      bgcolor: "rgba(115, 103, 240, 0.12)",
                      color: "primary.main",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Technical Details (EXIF / Specs) */}
          <Box
            sx={{
              bgcolor: isDark ? "rgba(255, 255, 255, 0.04)" : "action.hover",
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary", mb: 1.5 }}>
              Chi tiết kỹ thuật (EXIF):
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, fontSize: "0.8rem" }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Định dạng:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.fileFormat || item.type.toUpperCase()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Độ phân giải:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.dimensions || "N/A"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Dung lượng:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.fileSizeFormatted}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Quyền xem:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.privacy === "public" ? "Công khai" : item.privacy === "team" ? "Nội bộ" : "Chỉ mình tôi"}
                </Typography>
              </Box>

              {item.exif?.camera && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography variant="caption" color="text.secondary">
                    Thiết bị / Codec:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {item.exif.camera} {item.exif.codec ? `(${item.exif.codec})` : ""}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Comments Section */}
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary", mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <i className="tabler-message-circle" /> Bình luận ({item.comments?.length || 0})
            </Typography>

            {/* Comments List */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2, maxHeight: 220, overflowY: "auto", pr: 0.5 }}>
              {(!item.comments || item.comments.length === 0) ? (
                <Typography variant="caption" color="text.disabled" sx={{ py: 2, textAlign: "center" }}>
                  Chưa có bình luận nào. Hãy là người đầu tiên để lại ý kiến!
                </Typography>
              ) : (
                item.comments.map((cmt) => (
                  <Box
                    key={cmt.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: isDark ? "rgba(255, 255, 255, 0.04)" : "action.hover",
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      gap: 1.5,
                    }}
                  >
                    <Avatar src={cmt.author?.avatar} sx={{ width: 30, height: 30, fontSize: 13, bgcolor: "primary.light" }}>
                      {cmt.author?.name?.[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
                          {cmt.author?.name}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
                          {formatFullDateTime(cmt.createdAt)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.825rem", lineHeight: 1.4 }}>
                        {cmt.content}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            {/* Comment Input Box */}
            <Box sx={{ mt: "auto", display: "flex", gap: 1 }}>
              <CustomTextField
                fullWidth
                size="small"
                placeholder="Viết bình luận, gắn thẻ @tên..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendComment}
                disabled={!commentText.trim()}
                sx={{ minWidth: 44, px: 1.5, borderRadius: 1.5 }}
              >
                <i className="tabler-send" style={{ fontSize: 18 }} />
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
