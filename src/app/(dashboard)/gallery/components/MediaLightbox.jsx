"use client";
import CopyAlbumUrlButton from "./CopyAlbumUrlButton";
import { getAlbumLink } from "@/libs/galleryAlbumLink";
import { galleryImageSource } from "@/libs/galleryMediaTypes";
import { trackGalleryActivity } from "@/libs/galleryActivity";

import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import InputAdornment from "@mui/material/InputAdornment";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import CustomTextField from "@core/components/mui/TextField";
import { toast } from "react-toastify";
import MentionInput from "./MentionInput";
import { renderWithMentions, resolveAuthorAvatar } from "./mentionUtils";

const EMOJI_CATEGORIES = [
  {
    name: "Phổ biến",
    icon: "tabler-flame",
    emojis: ["👍", "❤️", "😂", "👏", "🔥", "🎉", "😮", "😢", "🚀", "💯", "🙏", "😍", "🥳", "✨"],
  },
  {
    name: "Mặt cười & Cảm xúc",
    icon: "tabler-mood-smile",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🥹", "😊",
      "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😋", "😛",
      "😜", "🤪", "🤩", "😎", "🥳", "😏", "😒", "😞", "😔", "😟",
      "😕", "🙁", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤",
      "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰",
      "🤔", "🤫", "🤭", "🥱", "😴", "🤤", "😷", "🤒", "🤕", "🤢",
    ],
  },
  {
    name: "Cử chỉ & Tương tác",
    icon: "tabler-hand-stop",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪",
      "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "🤙", "👈",
      "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🫶",
      "💅", "🤳", "👀", "👁️", "🧠", "👄", "👅", "👃",
    ],
  },
  {
    name: "Trái tim & Biểu tượng",
    icon: "tabler-heart",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
      "✨", "🌟", "⭐️", "💫", "⚡️", "💥", "🔥", "💯", "💢", "💤",
      "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️",
    ],
  },
  {
    name: "Công việc & Xe cộ",
    icon: "tabler-bus",
    emojis: [
      "🚌", "🚐", "🚗", "🚙", "🏎️", "🛞", "⚙️", "🔧", "🔨", "🛠️",
      "💻", "📱", "🖥️", "📷", "📸", "🎥", "📹", "📊", "📈", "📉",
      "📌", "📍", "📎", "📝", "📅", "🕒", "⏰", "💡", "🎯", "🚀",
      "🏢", "🏗️", "⛽️", "🚦", "🛑", "🚧", "🔑", "🛡️", "📦", "📫",
    ],
  },
];

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

function formatDateOnly(dateString) {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
  onToggleCommentReaction,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onDownload,
  onShare,
  onTagClick,
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
  const commentInputRef = useRef(null);

  // Emoji picker state
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [emojiCategoryIdx, setEmojiCategoryIdx] = useState(0);
  const [emojiSearch, setEmojiSearch] = useState("");

  // Reaction modal state (who liked/disliked)
  const [reactionModalOpen, setReactionModalOpen] = useState(false);
  const [reactionTab, setReactionTab] = useState("like"); // "like" | "dislike"

  // Replying to state
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, authorName }

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

  // Reset video player states and cleanup on media change
  useEffect(() => {
    const video = videoRef.current;
    setIsBuffering(false);
    setIsPlaying(false);
    return () => {
      if (video) {
        try {
          video.pause();
        } catch {}
      }
    };
  }, [open, activeFile.url, item?.id, activeFileIndex]);

  // Safety timer to prevent buffering spinner from ever hanging indefinitely
  useEffect(() => {
    if (!isBuffering) return;
    const timer = setTimeout(() => {
      setIsBuffering(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isBuffering]);

  async function startPlayback(video, userInitiated = false) {
    if (!open || !video) return;
    const source = video.getAttribute("src");
    const isCurrent = () =>
      viewerOpenRef.current && videoRef.current === video && video.isConnected &&
      video.getAttribute("src") === source;
    setVideoError("");
    setIsBuffering(true);
    try {
      await video.play();
      setIsPlaying(true);
      setIsBuffering(false);
      if (userInitiated && isCurrent()) trackGalleryActivity(item.id, "PLAY_GALLERY_VIDEO", activeFile.id);
    } catch (error) {
      if (!isCurrent() || error.name === "AbortError") return;
      if (error.name === "NotAllowedError" && !video.muted) {
        video.muted = true;
        setIsMuted(true);
        try {
          await video.play();
          setIsPlaying(true);
          setIsBuffering(false);
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
    const finalContent = replyingTo
      ? `@${replyingTo.authorName} ${commentText.trim()}`
      : commentText.trim();

    onAddComment(item.id, {
      id: `cmt_${Date.now()}`,
      author: {
        name: matched?.name || currentUser?.name || "Vũ Hoàng Dũng",
        avatar: matched?.avatar || currentUser?.image || "/images/avatars/male-admin.png",
        department: matched?.department || "AP",
      },
      content: finalContent,
      taggedUserIds: commentMentions.taggedUserIds,
      isTagAll: /@all\b/i.test(commentText) || commentMentions.isTagAll,
      createdAt: new Date().toISOString(),
      parentId: replyingTo?.commentId || null,
      replyTo: null,
    });
    setCommentText("");
    setCommentMentions({ isTagAll: false, taggedUserIds: [] });
    setReplyingTo(null);
    toast.success("Đã đăng bình luận!");
  };

  // Insert emoji into comment at cursor or append
  const handleInsertEmoji = (emoji) => {
    const input = commentInputRef.current?.querySelector?.("input, textarea") || commentInputRef.current;
    if (input && typeof input.selectionStart === "number") {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const before = commentText.substring(0, start);
      const after = commentText.substring(end);
      const nextText = before + emoji + after;
      setCommentText(nextText);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 10);
    } else {
      setCommentText((prev) => (prev ? `${prev} ${emoji}` : emoji));
    }
  };

  // Handle reply button click: sets replyingTo chip at start of input
  const handleReplyToComment = (cmt, isReply) => {
    const parentCommentId = isReply ? cmt.parentId : cmt.id;
    const authorName = cmt.author?.name || "thành viên";
    const authorId = cmt.author?.id || cmt.author?._id;

    setReplyingTo({
      commentId: parentCommentId,
      authorName: authorName,
      authorId: authorId,
    });

    if (authorId) {
      setCommentMentions((prev) => ({
        ...prev,
        taggedUserIds: Array.from(new Set([...(prev.taggedUserIds || []), authorId])),
      }));
    }

    setTimeout(() => {
      const input = commentInputRef.current?.querySelector?.("input, textarea") || commentInputRef.current;
      if (input) {
        input.focus();
      }
    }, 50);
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
                key={`video-${activeFile.url || item.url}`}
                sx={{
                  position: "relative",
                  isolation: "isolate",
                  bgcolor: "#000",
                  overflow: "hidden",
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
                  preload="metadata"
                  playsInline
                  muted={isMuted}
                  src={activeFile.url || item.url}
                  poster={
                    activeFile.thumbnail &&
                    activeFile.thumbnail !== activeFile.url &&
                    !/\.(mp4|mov|webm|avi|mkv|m4v)(?:[?#]|$)/i.test(activeFile.thumbnail)
                      ? activeFile.thumbnail
                      : undefined
                  }
                  onTimeUpdate={() => {
                    handleTimeUpdate();
                    if (isBuffering) setIsBuffering(false);
                  }}
                  onLoadedMetadata={handleLoadedMetadata}
                  onLoadedData={() => setIsBuffering(false)}
                  onCanPlay={() => setIsBuffering(false)}
                  onCanPlayThrough={() => setIsBuffering(false)}
                  onSeeked={() => setIsBuffering(false)}
                  onPlaying={() => {
                    setIsPlaying(true);
                    setIsBuffering(false);
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    setIsBuffering(false);
                  }}
                  onWaiting={() => {
                    if (isPlaying) setIsBuffering(true);
                  }}
                  onError={() => {
                    setIsPlaying(false);
                    setIsBuffering(false);
                    setVideoError("Không thể phát video. Vui lòng thử lại hoặc tải video xuống.");
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    setIsBuffering(false);
                  }}
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

                {/* Show buffering only when actively playing and network needs more data */}
                {isPlaying && isBuffering && !videoError && (
                  <Box
                    sx={{
                      position: "absolute",
                      pointerEvents: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      bgcolor: "rgba(0,0,0,0.75)",
                      color: "#fff",
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                    }}
                  >
                    <CircularProgress size={20} color="inherit" />
                    <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                      Đang tải video…
                    </Typography>
                  </Box>
                )}

                {videoError && (
                  <Typography
                    role="alert"
                    sx={{
                      position: "absolute",
                      bgcolor: "rgba(0,0,0,0.85)",
                      color: "#fff",
                      p: 2,
                      borderRadius: 2,
                      textAlign: "center",
                    }}
                  >
                    {videoError}
                  </Typography>
                )}

                {/* Center Play Button always visible when paused */}
                {!isPlaying && !videoError && (
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
                key={`image-${activeFile.url || item.url}`}
                component="img"
                src={galleryImageSource(activeFile) || item.url}
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
                    {f.type === "video" && (!f.thumbnail || f.thumbnail === f.url || /\.(mp4|mov|webm|avi|mkv|m4v)(?:[?#]|$)/i.test(f.thumbnail)) ? (
                      <Box sx={{ width: "100%", height: "100%", bgcolor: "grey.800" }} />
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
            height: "100%",
            overflowY: "auto",
            p: 3,
            gap: 2.5,
          }}
        >
          {/* Uploader Profile */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                src={resolveAuthorAvatar(item.uploader, usersList)}
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

            <Chip
              size="small"
              icon={
                <i
                  className={
                    item.channel === "relax"
                      ? "tabler-coffee"
                      : item.channel === "report"
                      ? "tabler-clipboard-check"
                      : "tabler-photo-heart"
                  }
                  style={{ fontSize: 14 }}
                />
              }
              label={
                item.channel === "relax"
                  ? "Relax"
                  : item.channel === "report"
                  ? "Report"
                  : "Kỷ Niệm"
              }
              color={
                item.channel === "relax"
                  ? "success"
                  : item.channel === "report"
                  ? "error"
                  : "primary"
              }
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: "0.75rem", height: 26 }}
            />
          </Box>

          {/* Social Interactions: Like, Download, Share */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              py: 1.5,
              borderTop: "1px solid",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            {/* Nút Yêu thích */}
            <ButtonGroup size="small" variant={item.isLiked ? "contained" : "outlined"} color="error">
              <Tooltip title={item.isLiked ? "Bỏ thích" : "Yêu thích"}>
                <Button
                  onClick={() => onToggleLike && onToggleLike(item.id, "like")}
                  sx={{ px: 1, minWidth: 36 }}
                >
                  <i className={item.isLiked ? "tabler-heart-filled" : "tabler-heart"} style={{ fontSize: 18 }} />
                </Button>
              </Tooltip>
              <Tooltip title="Xem danh sách người yêu thích">
                <Button
                  onClick={() => {
                    setReactionTab("like");
                    setReactionModalOpen(true);
                  }}
                  sx={{ px: 1, fontWeight: 700, minWidth: 28 }}
                >
                  {item.likes || 0}
                </Button>
              </Tooltip>
            </ButtonGroup>

            {/* Nút Không thích (Dislike) */}
            <ButtonGroup size="small" variant={item.isDisliked ? "contained" : "outlined"} color="secondary">
              <Tooltip title={item.isDisliked ? "Bỏ không thích" : "Không thích"}>
                <Button
                  onClick={() => onToggleLike && onToggleLike(item.id, "dislike")}
                  sx={{
                    px: 1,
                    minWidth: 36,
                    color: item.isDisliked ? "#fff" : "text.secondary",
                    borderColor: item.isDisliked ? "secondary.main" : "divider",
                  }}
                >
                  <i className={item.isDisliked ? "tabler-thumb-down-filled" : "tabler-thumb-down"} style={{ fontSize: 18 }} />
                </Button>
              </Tooltip>
              <Tooltip title="Xem danh sách người không thích">
                <Button
                  onClick={() => {
                    setReactionTab("dislike");
                    setReactionModalOpen(true);
                  }}
                  sx={{
                    px: 1,
                    fontWeight: 700,
                    minWidth: 28,
                    color: item.isDisliked ? "#fff" : "text.secondary",
                    borderColor: item.isDisliked ? "secondary.main" : "divider",
                  }}
                >
                  {item.dislikes || 0}
                </Button>
              </Tooltip>
            </ButtonGroup>

            {/* Nút Tải xuống */}
            <Tooltip title="Tải xuống tệp gốc">
              <IconButton
                size="small"
                onClick={() => onDownload(item)}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  width: 32,
                  height: 30,
                  color: "text.secondary",
                  "&:hover": { color: "primary.main", borderColor: "primary.main" },
                }}
              >
                <i className="tabler-download" style={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            {/* Nút Chia sẻ */}
            <Tooltip title="Lấy liên kết chia sẻ">
              <IconButton
                size="small"
                onClick={() => onShare(item)}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  width: 32,
                  height: 30,
                  color: "text.secondary",
                  "&:hover": { color: "primary.main", borderColor: "primary.main" },
                }}
              >
                <i className="tabler-share" style={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Description & Tags */}
          <Box>
            {item.title && (
              <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontSize: "1.05rem" }}>
                {renderWithMentions(item.title, usersList)}
              </Typography>
            )}
            {item.postType === "album_link" ? (
              <Box sx={{ p: 2, mt: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Box sx={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 1.5, bgcolor: "background.paper", color: "primary.main", flexShrink: 0 }}>
                    <i className="tabler-link" style={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Album liên kết</Typography>
                    <Typography variant="caption" color="text.secondary">Mở album để xem toàn bộ ảnh và video</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                  {getAlbumLink(item.description) && (
                    <Button size="small" component="a" href={getAlbumLink(item.description)} target="_blank" rel="noopener noreferrer" variant="contained" disableElevation sx={{ minHeight: 36, borderRadius: 1.5, flexGrow: 1 }} startIcon={<i className="tabler-external-link" />}>
                      Mở album
                    </Button>
                  )}
                  <CopyAlbumUrlButton description={item.description} />
                </Box>
              </Box>
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Mô tả:</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {renderWithMentions(item.description || "-", usersList)}
                </Typography>
              </>
            )}
            {item.tags && item.tags.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 1.5 }}>
                {item.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={onTagClick ? () => onTagClick(tag) : undefined}
                    sx={{
                      bgcolor: "rgba(115, 103, 240, 0.12)",
                      color: "primary.main",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      cursor: onTagClick ? "pointer" : "default",
                      "&:hover": onTagClick ? { bgcolor: "primary.main", color: "#fff" } : undefined,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Comments Section */}
          <Box sx={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column", borderTop: "1px solid", borderColor: "divider", pt: 2, mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary", mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <i className="tabler-message-circle" /> Bình luận ({item.comments?.length || 0})
            </Typography>

            {/* Comments List */}
            <Box sx={{ flexGrow: 1, minHeight: 140, display: "flex", flexDirection: "column", gap: 1.5, mb: 2, overflowY: "auto", pr: 0.5 }}>
              {(!item.comments || item.comments.length === 0) ? (
                <Typography variant="caption" color="text.disabled" sx={{ py: 2, textAlign: "center" }}>
                  Chưa có bình luận nào. Hãy là người đầu tiên để lại ý kiến!
                </Typography>
              ) : (
                (() => {
                  const comments = item.comments || [];
                  const topLevelComments = comments.filter((c) => !c.parentId);
                  const repliesMap = new Map();
                  comments.forEach((c) => {
                    if (c.parentId) {
                      if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, []);
                      repliesMap.get(c.parentId).push(c);
                    }
                  });

                  const renderCommentItem = (cmt, isReply = false) => {
                    const isEditing = editingCommentId === cmt.id;
                    const canManage = canManageComment(cmt);

                    return (
                      <Box
                        key={cmt.id}
                        sx={{
                          p: isReply ? 1 : 1.5,
                          borderRadius: 1.5,
                          bgcolor: isDark ? "rgba(255, 255, 255, 0.04)" : isReply ? "transparent" : "action.hover",
                          border: isReply ? "none" : "1px solid",
                          borderColor: isEditing ? "primary.main" : "divider",
                          display: "flex",
                          gap: 1.25,
                        }}
                      >
                        <Avatar
                          src={resolveAuthorAvatar(cmt.author, usersList)}
                          sx={{
                            width: isReply ? 26 : 32,
                            height: isReply ? 26 : 32,
                            fontSize: isReply ? 11 : 13,
                            bgcolor: "primary.light",
                            flexShrink: 0,
                            mt: 0.25,
                          }}
                        >
                          {cmt.author?.name?.[0] || "U"}
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.25 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
                                {cmt.author?.name}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Tooltip title={formatFullDateTime(cmt.createdAt)}>
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                  sx={{ fontSize: "0.68rem", whiteSpace: "nowrap" }}
                                >
                                  {isReply ? formatDateOnly(cmt.createdAt) : formatFullDateTime(cmt.createdAt)}
                                </Typography>
                              </Tooltip>
                              {canManage && !isEditing && (
                                <>
                                  <Tooltip title="Chỉnh sửa bình luận">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleStartEditComment(cmt)}
                                      sx={{ p: 0.25, ml: 0.5, color: "text.secondary", "&:hover": { color: "primary.main" } }}
                                    >
                                      <i className="tabler-pencil" style={{ fontSize: 13 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Xóa bình luận">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteComment(cmt.id)}
                                      sx={{ p: 0.25, color: "text.secondary", "&:hover": { color: "error.main" } }}
                                    >
                                      <i className="tabler-trash" style={{ fontSize: 13 }} />
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

                              {/* Comment Action Buttons: Like, Dislike, Reply */}
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5 }}>
                                <Box
                                  component="button"
                                  type="button"
                                  onClick={() => onToggleCommentReaction && onToggleCommentReaction(item.id, cmt.id, "like")}
                                  sx={{
                                    border: 0,
                                    bgcolor: "transparent",
                                    p: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    cursor: "pointer",
                                    color: cmt.isLiked ? "error.main" : "text.secondary",
                                    fontWeight: cmt.isLiked ? 600 : 500,
                                    fontSize: "0.72rem",
                                    "&:hover": { color: "error.main" },
                                  }}
                                >
                                  <i className={cmt.isLiked ? "tabler-heart-filled" : "tabler-heart"} style={{ fontSize: 13 }} />
                                  <span>{(cmt.likes || 0) > 0 ? cmt.likes : "Thích"}</span>
                                </Box>

                                <Box
                                  component="button"
                                  type="button"
                                  onClick={() => onToggleCommentReaction && onToggleCommentReaction(item.id, cmt.id, "dislike")}
                                  sx={{
                                    border: 0,
                                    bgcolor: "transparent",
                                    p: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    cursor: "pointer",
                                    color: cmt.isDisliked ? "text.primary" : "text.secondary",
                                    fontWeight: cmt.isDisliked ? 600 : 500,
                                    fontSize: "0.72rem",
                                    "&:hover": { color: "text.primary" },
                                  }}
                                >
                                  <i className={cmt.isDisliked ? "tabler-thumb-down-filled" : "tabler-thumb-down"} style={{ fontSize: 13 }} />
                                  <span>{(cmt.dislikes || 0) > 0 ? cmt.dislikes : "Không thích"}</span>
                                </Box>

                                <Box
                                  component="button"
                                  type="button"
                                  onClick={() => handleReplyToComment(cmt, isReply)}
                                  sx={{
                                    border: 0,
                                    bgcolor: "transparent",
                                    p: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    cursor: "pointer",
                                    color: "text.secondary",
                                    fontWeight: 500,
                                    fontSize: "0.72rem",
                                    "&:hover": { color: "primary.main" },
                                  }}
                                >
                                  <i className="tabler-arrow-back-up" style={{ fontSize: 13 }} />
                                  <span>Trả lời</span>
                                </Box>
                              </Box>
                            </>
                          )}

                          {/* Nested replies */}
                          {!isReply && repliesMap.has(cmt.id) && (
                            <Box sx={{ mt: 1, pl: 2, borderLeft: "2px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 1 }}>
                              {repliesMap.get(cmt.id).map((r) => renderCommentItem(r, true))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  };

                  return topLevelComments.map((cmt) => renderCommentItem(cmt, false));
                })()
              )}
            </Box>

            {/* Comment Input Box */}
            <Box sx={{ mt: "auto", display: "flex", gap: 0.75, alignItems: "center" }}>
              <Box sx={{ flexGrow: 1 }}>
                <MentionInput
                  inputRef={commentInputRef}
                  fullWidth
                  size="small"
                  placement="top-start"
                  placeholder={replyingTo ? "Nhập câu trả lời..." : "Viết bình luận, gắn thẻ @tên hoặc @All..."}
                  value={commentText}
                  onChange={(val) => setCommentText(val)}
                  usersList={usersList}
                  onMentionsChange={setCommentMentions}
                  InputProps={{
                    startAdornment: replyingTo ? (
                      <InputAdornment position="start">
                        <Chip
                          size="small"
                          label={`@${replyingTo.authorName}`}
                          color="primary"
                          variant="tonal"
                          onDelete={() => setReplyingTo(null)}
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.78rem",
                            height: 24,
                            bgcolor: "rgba(115, 103, 240, 0.12)",
                            color: "primary.main",
                            "& .MuiChip-deleteIcon": {
                              fontSize: 14,
                              color: "primary.main",
                              "&:hover": { color: "error.main" },
                            },
                          }}
                        />
                      </InputAdornment>
                    ) : null,
                    endAdornment: null,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !commentText && replyingTo) {
                      setReplyingTo(null);
                    } else if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                />
              </Box>

              {/* Nút Chọn Emoji */}
              <Tooltip title="Chọn biểu tượng cảm xúc">
                <IconButton
                  size="small"
                  onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: Boolean(emojiAnchorEl) ? "primary.main" : "divider",
                    color: Boolean(emojiAnchorEl) ? "primary.main" : "text.secondary",
                    bgcolor: Boolean(emojiAnchorEl) ? "rgba(115, 103, 240, 0.08)" : "transparent",
                    "&:hover": {
                      color: "primary.main",
                      bgcolor: "rgba(115, 103, 240, 0.08)",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <i className="tabler-mood-smile" style={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>

              {/* Nút Gửi bình luận */}
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

      {/* Reaction List Modal (Like / Dislike) */}
      <Dialog
        open={reactionModalOpen}
        onClose={() => setReactionModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Tabs
            value={reactionTab}
            onChange={(_, val) => setReactionTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 40 }}
          >
            <Tab
              value="like"
              icon={<i className="tabler-heart-filled text-error" style={{ fontSize: 16 }} />}
              iconPosition="start"
              label={`Yêu thích (${(item?.likedBy || []).length})`}
              sx={{ textTransform: "none", fontWeight: 600, minHeight: 40, py: 0.5, fontSize: "0.85rem" }}
            />
            <Tab
              value="dislike"
              icon={<i className="tabler-thumb-down-filled" style={{ fontSize: 16 }} />}
              iconPosition="start"
              label={`Không thích (${(item?.dislikedBy || []).length})`}
              sx={{ textTransform: "none", fontWeight: 600, minHeight: 40, py: 0.5, fontSize: "0.85rem" }}
            />
          </Tabs>
          <IconButton size="small" onClick={() => setReactionModalOpen(false)}>
            <i className="tabler-x" style={{ fontSize: 16 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {(() => {
            const list = reactionTab === "like" ? (item?.likedBy || []) : (item?.dislikedBy || []);
            if (list.length === 0) {
              return (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    {reactionTab === "like"
                      ? "Chưa có ai yêu thích bài đăng này."
                      : "Chưa có ai bày tỏ không thích bài đăng này."}
                  </Typography>
                </Box>
              );
            }
            return (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {list.map((u, idx) => {
                  const resolvedUser = typeof u === "string"
                    ? usersList.find((x) => x.id === u || x.name === u) || { name: u }
                    : u;
                  return (
                    <Box key={u.id || u.name || idx} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar src={resolvedUser.avatar} sx={{ width: 36, height: 36, fontSize: 14 }}>
                        {resolvedUser.name?.[0]}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                          {resolvedUser.name}
                        </Typography>
                        {(resolvedUser.department || resolvedUser.role) && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            {resolvedUser.department || resolvedUser.role}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => {
          setEmojiAnchorEl(null);
          setEmojiSearch("");
        }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              maxHeight: 380,
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              p: 1.5,
              boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
            },
          },
        }}
      >
        {/* Search */}
        <CustomTextField
          size="small"
          fullWidth
          placeholder="Tìm biểu tượng cảm xúc..."
          value={emojiSearch}
          onChange={(e) => setEmojiSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <i className="tabler-search" style={{ fontSize: 16 }} />
              </InputAdornment>
            ),
            endAdornment: emojiSearch ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setEmojiSearch("")}>
                  <i className="tabler-x" style={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ mb: 1 }}
        />

        {/* Categories Tab (if not searching) */}
        {!emojiSearch && (
          <Tabs
            value={emojiCategoryIdx}
            onChange={(_, val) => setEmojiCategoryIdx(val)}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              minHeight: 32,
              mb: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              "& .MuiTab-root": {
                minHeight: 32,
                py: 0.5,
                px: 1,
                fontSize: "0.75rem",
                textTransform: "none",
              },
            }}
          >
            {EMOJI_CATEGORIES.map((cat) => (
              <Tab
                key={cat.name}
                icon={<i className={cat.icon} style={{ fontSize: 15 }} />}
                iconPosition="start"
                label={cat.name}
              />
            ))}
          </Tabs>
        )}

        {/* Emoji Grid */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 0.5,
            py: 0.5,
          }}
        >
          {(emojiSearch
            ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e, idx, arr) => arr.indexOf(e) === idx)
            : EMOJI_CATEGORIES[emojiCategoryIdx]?.emojis || []
          ).map((em, i) => (
            <Box
              key={`${em}_${i}`}
              component="button"
              type="button"
              onClick={() => handleInsertEmoji(em)}
              sx={{
                border: 0,
                bgcolor: "transparent",
                borderRadius: 1,
                p: 0.5,
                fontSize: "1.35rem",
                lineHeight: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.12s, background-color 0.12s",
                "&:hover": {
                  transform: "scale(1.3)",
                  bgcolor: "action.hover",
                },
              }}
            >
              {em}
            </Box>
          ))}
        </Box>
      </Popover>
    </Dialog>
  );
}
