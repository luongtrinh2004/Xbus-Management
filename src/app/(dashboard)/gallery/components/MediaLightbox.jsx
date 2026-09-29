"use client";
import { trackGalleryActivity } from "@/libs/galleryActivity";

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
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import CustomTextField from "@core/components/mui/TextField";
import { toast } from "react-toastify";
import MentionInput from "./MentionInput";
import { renderWithMentions } from "./mentionUtils";

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
  onEditComment,
  onDeleteComment,
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
  const viewerOpenRef = useRef(open);
  viewerOpenRef.current = open;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoQuality, setVideoQuality] = useState("1080p");
  const [speedMenuAnchor, setSpeedMenuAnchor] = useState(null);
  const [qualityMenuAnchor, setQualityMenuAnchor] = useState(null);

  // Fullscreen state for media-only stage
  const mediaStageRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Comment input
  const [commentText, setCommentText] = useState("");
  const [commentMentions, setCommentMentions] = useState({ isTagAll: false, taggedUserIds: [] });

  // Comment editing state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editingMentions, setEditingMentions] = useState({ isTagAll: false, taggedUserIds: [] });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Multi-file post navigation state
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Group files in this post
  const postFiles = Array.isArray(item?.files) && item.files.length > 0 ? item.files : [item];
  const activeFile = postFiles[activeFileIndex] || item || {};
  const isVideo = activeFile?.type === "video";

  // Reset active file when active post item changes
  useEffect(() => {
    setActiveFileIndex(0);
  }, [item?.id]);

  // Reset image / video state when active file changes
  useEffect(() => {
    setZoomLevel(1);
    setRotation(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackSpeed(1);
    setVideoError("");
    setIsBuffering(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = 1;
    }
  }, [item?.id, activeFileIndex]);

  // Start on opening/reopening; metadata also starts newly mounted dialog content.
  useEffect(() => {
    const video = videoRef.current;
    if (open && video) startPlayback(video);
    return () => { (video || videoRef.current)?.pause(); };
  }, [open, activeFile.url, item?.id, activeFileIndex]);

  async function startPlayback(video, userInitiated = false) {
    if (!open || !video) return;
    const source = video.getAttribute("src");
    const isCurrent = () => viewerOpenRef.current && videoRef.current === video && video.isConnected &&
      video.getAttribute("src") === source;
    setVideoError("");
    setIsBuffering(true);
    try {
      await video.play();
      if (userInitiated && isCurrent()) trackGalleryActivity(item.id, "PLAY_GALLERY_VIDEO", activeFile.id);
    } catch (error) {
      if (!isCurrent() || error.name === "AbortError") return;
      if (error.name === "NotAllowedError" && !video.muted) {
        video.muted = true;
        setIsMuted(true);
        try {
          await video.play();
      if (userInitiated && isCurrent()) trackGalleryActivity(item.id, "PLAY_GALLERY_VIDEO", activeFile.id);
          return;
        } catch (retryError) {
          if (!isCurrent() || retryError.name === "AbortError") return;
        }
      }
      setIsBuffering(false);
      setIsPlaying(false);
    }
  }

  // Navigation handlers across files and posts
  const hasPrev = activeFileIndex > 0 || currentIndex > 0;
  const hasNext = activeFileIndex < postFiles.length - 1 || currentIndex < itemsList.length - 1;

  const handlePrev = () => {
    if (activeFileIndex > 0) {
      setActiveFileIndex((prev) => prev - 1);
    } else if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeFileIndex < postFiles.length - 1) {
      setActiveFileIndex((prev) => prev + 1);
    } else if (currentIndex < itemsList.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      // Ignore if typing in an input, textarea, or contentEditable
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, activeFileIndex, postFiles.length, currentIndex, itemsList.length, onNavigate, onClose]);

  if (!item) return null;

  // Video handlers
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (!videoRef.current.paused) {
      videoRef.current.pause();
      trackGalleryActivity(item.id, "PAUSE_GALLERY_VIDEO", activeFile.id);
    } else {
      startPlayback(videoRef.current, true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0);
    videoRef.current.volume = volume;
    startPlayback(videoRef.current);
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
      const el = mediaStageRef.current;
      if (el) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
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
      taggedUserIds: commentMentions.taggedUserIds,
      isTagAll: /@all\b/i.test(commentText) || commentMentions.isTagAll,
      createdAt: new Date().toISOString(),
    });
    setCommentText("");
    setCommentMentions({ isTagAll: false, taggedUserIds: [] });
    toast.success("Đã đăng bình luận!");
  };

  const canManageComment = (cmt) => {
    if (!currentUser) return false;
    const userRole = (currentUser.role || "").toLowerCase();
    const isAdminOrAssistant =
      userRole === "admin" ||
      userRole === "assistant" ||
      currentUser.roles?.includes("admin") ||
      currentUser.typeId === "quan_ly_du_an";
    const isAuthor =
      (cmt.author?.id && (cmt.author.id === currentUser.id || cmt.author.id === currentUser._id)) ||
      (cmt.author?.email && currentUser.email && cmt.author.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (cmt.author?.name && currentUser.name && cmt.author.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    return isAdminOrAssistant || isAuthor;
  };

  const handleStartEditComment = (cmt) => {
    setEditingCommentId(cmt.id);
    setEditingCommentText(cmt.content || "");
    setEditingMentions({ isTagAll: false, taggedUserIds: [] });
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveEditComment = async (commentId) => {
    if (!editingCommentText.trim()) return;
    try {
      setIsSubmittingEdit(true);
      const res = await fetch(`/api/gallery/${item.id}/comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId,
          content: editingCommentText.trim(),
          taggedUserIds: editingMentions.taggedUserIds,
          isTagAll: editingMentions.isTagAll,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Đã cập nhật bình luận!");
        setEditingCommentId(null);
        setEditingCommentText("");
        if (onEditComment) {
          onEditComment(item.id, commentId, data.comment);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Không thể cập nhật bình luận");
      }
    } catch (err) {
      toast.error("Lỗi khi cập nhật bình luận");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) return;
    try {
      const res = await fetch(`/api/gallery/${item.id}/comment?commentId=${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Đã xóa bình luận!");
        if (onDeleteComment) {
          onDeleteComment(item.id, commentId);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Không thể xóa bình luận");
      }
    } catch (err) {
      toast.error("Lỗi khi xóa bình luận");
    }
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
              {item.title || "Bài viết không có tiêu đề"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {postFiles.length > 1
                ? `Tệp ${activeFileIndex + 1}/${postFiles.length} trong bài • ${activeFile.fileSizeFormatted || formatBytes(activeFile.fileSize)} (Bài ${currentIndex + 1}/${itemsList.length})`
                : `Bài ${currentIndex + 1}/${itemsList.length} • ${item.fileSizeFormatted}`}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={isFullscreen ? "Thoát toàn màn hình" : "Xem toàn màn hình"}>
            <IconButton size="small" onClick={handleFullscreenToggle} color="inherit">
              <i className={isFullscreen ? "tabler-minimize" : "tabler-maximize"} style={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Tải xuống tệp đang xem">
            <IconButton size="small" onClick={() => onDownload(activeFile)} color="inherit">
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
        {/* Left / Center: Media Display Stage (Full-screen target) */}
        <Box
          ref={mediaStageRef}
          sx={{
            flexGrow: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: isFullscreen ? 0 : 2,
            overflow: "hidden",
            bgcolor: isFullscreen ? "#000 !important" : (isDark ? "#121420" : "#EDEEF2"),
            "&:fullscreen": {
              width: "100vw",
              height: "100vh",
              bgcolor: "#000 !important",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          }}
        >
          {/* Top-Right Exit Fullscreen Button */}
          {isFullscreen && (
            <Tooltip title="Thoát toàn màn hình (Esc)">
              <IconButton
                onClick={handleFullscreenToggle}
                sx={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  zIndex: 30,
                  bgcolor: "rgba(0, 0, 0, 0.65)",
                  color: "#fff",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  "&:hover": { bgcolor: "rgba(0, 0, 0, 0.85)", color: "primary.main" },
                }}
              >
                <i className="tabler-minimize" style={{ fontSize: 24 }} />
              </IconButton>
            </Tooltip>
          )}
          {/* Previous Arrow */}
          {hasPrev && (
            <IconButton
              onClick={handlePrev}
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
              onClick={handleNext}
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
                  width: isFullscreen ? "100%" : "auto",
                  height: isFullscreen ? "100%" : "auto",
                  maxWidth: isFullscreen ? "100%" : "92%",
                  maxHeight: isFullscreen ? "100%" : "82%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <video
                  key={activeFile.url || item.url}
                  ref={videoRef}
                  preload="auto"
                  playsInline
                  muted={isMuted}
                  src={activeFile.url || item.url}
                  poster={
                    activeFile.thumbnail &&
                    !/\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(activeFile.thumbnail)
                      ? activeFile.thumbnail
                      : undefined
                  }
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlaying={() => {
                    setIsPlaying(true); setIsBuffering(false);

                  }}
                  onPause={() => { setIsPlaying(false); setIsBuffering(false); }}
                  onWaiting={() => setIsBuffering(true)}
                  onCanPlay={() => setIsBuffering(false)}
                  onError={() => {
                    setIsPlaying(false);
                    setIsBuffering(false);
                    setVideoError("Không thể phát video. Vui lòng thử lại hoặc tải video xuống.");
                  }}
                  onEnded={() => { setIsPlaying(false); setIsBuffering(false); }}
                  onClick={handleTogglePlay}
                  onDoubleClick={handleFullscreenToggle}
                  style={{
                    maxWidth: isFullscreen ? "100vw" : "100%",
                    maxHeight: isFullscreen ? "100vh" : "75vh",
                    width: isFullscreen ? "100%" : "auto",
                    height: isFullscreen ? "100%" : "auto",
                    objectFit: "contain",
                    borderRadius: isFullscreen ? 0 : 8,
                    cursor: "pointer",
                    boxShadow: isFullscreen
                      ? "none"
                      : isDark
                        ? "0 10px 30px rgba(0,0,0,0.6)"
                        : "0 10px 30px rgba(47, 43, 61, 0.16)",
                  }}
                />

                {isBuffering && !videoError && (
                  <Box sx={{ position: "absolute", pointerEvents: "none", display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(0,0,0,0.65)", color: "#fff", borderRadius: 2, p: 2 }}>
                    <CircularProgress size={24} color="inherit" />
                    <Typography variant="body2">Đang tải video…</Typography>
                  </Box>
                )}
                {videoError && (
                  <Typography role="alert" sx={{ position: "absolute", bgcolor: "rgba(0,0,0,0.75)", color: "#fff", p: 2, borderRadius: 2 }}>
                    {videoError}
                  </Typography>
                )}
                {/* Center Play Button when paused */}
                {!isPlaying && !isBuffering && !videoError && (
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
                src={activeFile.url || item.url}
                alt={activeFile.fileName || item.title}
                onDoubleClick={handleFullscreenToggle}
                sx={{
                  maxWidth: isFullscreen ? "100vw" : "90%",
                  maxHeight: isFullscreen ? "100vh" : "82%",
                  width: isFullscreen ? "100%" : "auto",
                  height: isFullscreen ? "100%" : "auto",
                  objectFit: "contain",
                  borderRadius: isFullscreen ? 0 : 1.5,
                  boxShadow: isFullscreen
                    ? "none"
                    : isDark
                      ? "0 10px 30px rgba(0,0,0,0.6)"
                      : "0 10px 30px rgba(47, 43, 61, 0.15)",
                  transition: "transform 0.2s ease",
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  cursor: "pointer",
                }}
              />
            )}
          </Box>

          {/* Multi-file Post Thumbnail Filmstrip (Hidden in Fullscreen) */}
          {!isFullscreen && postFiles.length > 1 && (
            <Box
              sx={{
                position: "absolute",
                bottom: 84,
                zIndex: 6,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                p: 1,
                borderRadius: 2,
                bgcolor: isDark ? "rgba(47, 51, 73, 0.85)" : "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                maxWidth: "85%",
                overflowX: "auto",
              }}
            >
              {postFiles.map((f, idx) => {
                const isActive = idx === activeFileIndex;
                return (
                  <Box
                    key={f.id || idx}
                    onClick={() => setActiveFileIndex(idx)}
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      overflow: "hidden",
                      cursor: "pointer",
                      position: "relative",
                      flexShrink: 0,
                      border: "2px solid",
                      borderColor: isActive ? "primary.main" : "transparent",
                      boxShadow: isActive ? "0 0 0 2px rgba(115, 103, 240, 0.4)" : "none",
                      opacity: isActive ? 1 : 0.6,
                      transform: isActive ? "scale(1.08)" : "none",
                      transition: "all 0.2s ease",
                      "&:hover": { opacity: 1 },
                    }}
                  >
                    {f.type === "video" && (!f.thumbnail || f.thumbnail === f.url || /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(f.thumbnail)) ? (
                      <Box
                        component="video"
                        src={`${f.url}#t=0.5`}
                        preload="metadata"
                        muted
                        playsInline
                        sx={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
                      />
                    ) : (
                      <Box
                        component="img"
                        src={f.thumbnail || f.url}
                        alt=""
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                    {f.type === "video" && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          bgcolor: "rgba(0,0,0,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <i className="tabler-player-play text-white text-xs" />
                      </Box>
                    )}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 2,
                        right: 2,
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        color: "#fff",
                        bgcolor: "rgba(0,0,0,0.7)",
                        borderRadius: "3px",
                        px: 0.5,
                        lineHeight: 1.2,
                      }}
                    >
                      {idx + 1}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Floating Controls Bar at Bottom */}
          <Box
            sx={{
              position: "absolute",
              bottom: isFullscreen ? 28 : 20,
              bgcolor: isDark || isFullscreen ? "rgba(20, 22, 34, 0.94)" : "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(12px)",
              border: "1px solid",
              borderColor: isFullscreen ? "rgba(255, 255, 255, 0.15)" : "divider",
              boxShadow: isDark || isFullscreen
                ? "0 8px 32px rgba(0,0,0,0.6)"
                : "0 8px 24px -4px rgba(47, 43, 61, 0.15)",
              color: isFullscreen ? "#fff" : "text.primary",
              borderRadius: 3,
              px: 2.5,
              py: 1,
              display: "flex",
              alignItems: "center",
              gap: 2,
              zIndex: 15,
              maxWidth: "92%",
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
                    onChangeCommitted={() => trackGalleryActivity(item.id, "SEEK_GALLERY_VIDEO", activeFile.id)}
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
                  sx={{ color: isFullscreen ? "#fff" : "text.primary", textTransform: "none", fontSize: "0.75rem", minWidth: 42, px: 0.5, fontWeight: 600 }}
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
                  sx={{ color: isFullscreen ? "#fff" : "text.primary", textTransform: "none", fontSize: "0.75rem", minWidth: 50, px: 0.5, fontWeight: 600 }}
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

                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ borderColor: isFullscreen ? "rgba(255,255,255,0.2)" : "divider" }}
                />

                {/* Fullscreen Button for Video */}
                <Tooltip title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"}>
                  <IconButton
                    size="small"
                    onClick={handleFullscreenToggle}
                    sx={{ color: isFullscreen ? "primary.main" : "inherit" }}
                  >
                    <i
                      className={isFullscreen ? "tabler-minimize" : "tabler-maximize"}
                      style={{ fontSize: 20 }}
                    />
                  </IconButton>
                </Tooltip>
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

                <Divider orientation="vertical" flexItem sx={{ borderColor: isFullscreen ? "rgba(255,255,255,0.2)" : "divider" }} />

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

                <Divider orientation="vertical" flexItem sx={{ borderColor: isFullscreen ? "rgba(255,255,255,0.2)" : "divider" }} />

                {/* Fullscreen Button for Image */}
                <Tooltip title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"}>
                  <IconButton
                    size="small"
                    onClick={handleFullscreenToggle}
                    sx={{ color: isFullscreen ? "primary.main" : "inherit" }}
                  >
                    <i
                      className={isFullscreen ? "tabler-minimize" : "tabler-maximize"}
                      style={{ fontSize: 20 }}
                    />
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
            {item.title && (
              <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontSize: "1.05rem" }}>
                {renderWithMentions(item.title, usersList)}
              </Typography>
            )}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}>
              Mô tả:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {renderWithMentions(item.description || "-", usersList)}
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
                item.comments.map((cmt) => {
                  const isEditing = editingCommentId === cmt.id;
                  const canManage = canManageComment(cmt);

                  return (
                    <Box
                      key={cmt.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: isDark ? "rgba(255, 255, 255, 0.04)" : "action.hover",
                        border: "1px solid",
                        borderColor: isEditing ? "primary.main" : "divider",
                        display: "flex",
                        gap: 1.5,
                      }}
                    >
                      <Avatar src={cmt.author?.avatar} sx={{ width: 32, height: 32, fontSize: 13, bgcolor: "primary.light" }}>
                        {cmt.author?.name?.[0] || "U"}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
                            {cmt.author?.name}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
                              {formatFullDateTime(cmt.createdAt)}
                            </Typography>
                            {canManage && !isEditing && (
                              <>
                                <Tooltip title="Chỉnh sửa bình luận">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleStartEditComment(cmt)}
                                    sx={{ p: 0.25, ml: 0.5, color: "text.secondary", "&:hover": { color: "primary.main" } }}
                                  >
                                    <i className="tabler-pencil" style={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa bình luận">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteComment(cmt.id)}
                                    sx={{ p: 0.25, color: "text.secondary", "&:hover": { color: "error.main" } }}
                                  >
                                    <i className="tabler-trash" style={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </Box>

                        {isEditing ? (
                          <Box sx={{ mt: 1 }}>
                            <MentionInput
                              fullWidth
                              size="small"
                              placement="top-start"
                              value={editingCommentText}
                              onChange={(val) => setEditingCommentText(val)}
                              usersList={usersList}
                              onMentionsChange={setEditingMentions}
                              autoFocus
                            />
                            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                onClick={handleCancelEditComment}
                                sx={{ textTransform: "none", py: 0.25, px: 1.25, fontSize: "0.75rem" }}
                              >
                                Hủy
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                disabled={!editingCommentText.trim() || isSubmittingEdit}
                                onClick={() => handleSaveEditComment(cmt.id)}
                                sx={{ textTransform: "none", py: 0.25, px: 1.25, fontSize: "0.75rem" }}
                              >
                                {isSubmittingEdit ? "Đang lưu..." : "Lưu"}
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.825rem", lineHeight: 1.4, wordBreak: "break-word" }}>
                              {renderWithMentions(cmt.content, usersList)}
                            </Typography>
                            {cmt.updatedAt && (
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem", fontStyle: "italic", display: "block", mt: 0.25 }}>
                                (Đã chỉnh sửa)
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>

            {/* Comment Input Box */}
            <Box sx={{ mt: "auto", display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Box sx={{ flexGrow: 1 }}>
                <MentionInput
                  fullWidth
                  size="small"
                  placement="top-start"
                  placeholder="Viết bình luận, gắn thẻ @tên hoặc @All..."
                  value={commentText}
                  onChange={(val) => setCommentText(val)}
                  usersList={usersList}
                  onMentionsChange={setCommentMentions}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                />
              </Box>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendComment}
                disabled={!commentText.trim()}
                sx={{ minWidth: 44, height: 38, px: 1.5, borderRadius: 1.5 }}
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
