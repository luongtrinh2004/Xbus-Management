"use client";
import { startGalleryBackgroundUpload } from "@/libs/galleryBackgroundUpload";
import {
  classifyGalleryMedia,
  galleryMediaAccept,
} from "@/libs/galleryMediaTypes";

import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import AlbumLinkUpload from "./AlbumLinkUpload";
import { useState, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import CustomTextField from "@core/components/mui/TextField";
import { toast } from "react-toastify";
import { POPULAR_TAGS } from "./constants";
import MentionInput from "./MentionInput";

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function captureVideoThumbnail(file) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      let captured = false;
      const doCapture = () => {
        if (captured) return;
        captured = true;
        try {
          const canvas = document.createElement("canvas");
          const width = Math.min(800, video.videoWidth || 640);
          const height = Math.round(
            (width / (video.videoWidth || 16)) * (video.videoHeight || 9),
          );
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              resolve({
                blob,
                previewUrl: blob ? URL.createObjectURL(blob) : "",
              });
            },
            "image/jpeg",
            0.85,
          );
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 3);
      };
      video.onseeked = doCapture;
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      setTimeout(() => {
        if (!captured) doCapture();
      }, 1500);
    } catch {
      resolve(null);
    }
  });
}

export default function UploadModal({
  open,
  onClose,
  onUploadSuccess,
  currentUser,
  usersList = [],
  defaultChannel = "memory",
}) {
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("media");
  const [isDragOver, setIsDragOver] = useState(false);
  const [filesQueue, setFilesQueue] = useState([]);
  const [channel, setChannel] = useState(defaultChannel || "memory");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState(["#xe_tuhanh"]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [isUploading, setIsUploading] = useState(false);
  const [mentionsInfo, setMentionsInfo] = useState({
    isTagAll: false,
    taggedUserIds: [],
  });
  const draftPostIdRef = useRef(null);

  useEffect(() => {
    if (open) {
      setChannel(defaultChannel || "memory");
    }
  }, [open, defaultChannel]);

  const canBrowserPreviewImage = (file) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return [
      "jpg",
      "jpeg",
      "jfif",
      "png",
      "gif",
      "webp",
      "avif",
      "svg",
      "bmp",
      "ico",
    ].includes(ext);
  };

  const handleFilesSelected = async (filesList) => {
    const filesToProcess = Array.from(filesList);
    if (!draftPostIdRef.current)
      draftPostIdRef.current = `post_${crypto.randomUUID()}`;
    const postId = draftPostIdRef.current;

    for (let idx = 0; idx < filesToProcess.length; idx++) {
      const file = filesToProcess[idx];
      const { isVideo, isImage, isArchive } = classifyGalleryMedia(file);
      if ((!isVideo && !isImage && !isArchive) || !file.size) {
        toast.error(`Tệp không hợp lệ: ${file.name}`);
        continue;
      }
      let previewUrl =
        isImage && canBrowserPreviewImage(file)
          ? URL.createObjectURL(file)
          : "";
      let thumbnailBlob = null;

      if (isVideo) {
        const thumbRes = await captureVideoThumbnail(file);
        if (thumbRes?.previewUrl) {
          previewUrl = thumbRes.previewUrl;
          thumbnailBlob = thumbRes.blob;
        }
      }

      const item = {
        id: `upload_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        postId,
        name: file.name,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        type: isVideo ? "video" : "image",
        previewUrl,
        thumbnailBlob,
        progress: 0,
        status: "queued",
        uploadedData: null,
      };

      setFilesQueue((prev) => [...prev, item]);

    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleRemoveQueueItem = (id) => {
    setFilesQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleAddCustomTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && customTagInput.trim()) {
      e.preventDefault();
      let tag = customTagInput.trim();
      if (!tag.startsWith("#")) tag = `#${tag}`;
      if (!selectedTags.includes(tag)) {
        setSelectedTags((prev) => [...prev, tag]);
      }
      setCustomTagInput("");
    }
  };

  const handleStartUpload = async () => {
    if (!filesQueue.length || isUploading) return;
    setIsUploading(true);
    try {
      const postId = draftPostIdRef.current;
      const uploads = filesQueue.map(item => ({ ...item, sessionId: crypto.randomUUID() }));
      const response = await fetch("/api/gallery/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: true, postId, title: title.trim(), description: description.trim(),
          channel: channel || "memory",
          privacy, tags: selectedTags, uploadedFiles: [],
          uploads: uploads.map(item => ({ sessionId: item.sessionId, name: item.file.name, size: item.file.size })),
          isTagAll: /@all\b/i.test(`${title} ${description}`) || mentionsInfo.isTagAll,
          taggedUserIds: mentionsInfo.taggedUserIds }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Không thể tạo bài đăng");
      onUploadSuccess(data.items, data.storage);
      void startGalleryBackgroundUpload(postId, uploads);
      toast.info("Đã tạo bài đăng. Các tệp đang được tải lên ngầm.");
      handleResetAndClose();
    } catch(error) { toast.error(error.message); }
    finally { setIsUploading(false); }
  };

  const handleResetAndClose = () => {
    setMode("media");
    draftPostIdRef.current = null;
    setFilesQueue([]);
    setTitle("");
    setDescription("");
    setSelectedTags(["#xe_tuhanh"]);
    setCustomTagInput("");
    setPrivacy("public");
    setChannel(defaultChannel || "memory");
    setIsUploading(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={isUploading ? undefined : handleResetAndClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              bgcolor: "rgba(115, 103, 240, 0.12)",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            <i className="tabler-cloud-upload" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Tải lên Ảnh & Video
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Lưu trữ tài liệu đa phương tiện lên hệ thống Xbus
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={handleResetAndClose}
          disabled={isUploading}
        >
          <i className="tabler-x" style={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Tabs value={mode} onChange={(_, value) => setMode(value)} sx={{ mb: 2 }}>
          <Tab value="media" label="Tải ảnh / video" disabled={isUploading} />
          <Tab value="album" label="Upload URL Album" disabled={isUploading} />
        </Tabs>
        {mode === "album" ? <AlbumLinkUpload onUploadSuccess={onUploadSuccess} onClose={handleResetAndClose} onBusyChange={setIsUploading} defaultChannel={channel} /> : <>
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={galleryMediaAccept}
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) handleFilesSelected(e.target.files);
          }}
        />

        {/* Drag & Drop Zone */}
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            p: 4,
            border: "2px dashed",
            borderColor: isDragOver ? "primary.main" : "primary.light",
            bgcolor: isDragOver ? "rgba(115, 103, 240, 0.08)" : "action.hover",
            borderRadius: 2,
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "rgba(115, 103, 240, 0.04)",
            },
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "rgba(115, 103, 240, 0.12)",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <i className="tabler-cloud-upload" style={{ fontSize: 32 }} />
          </Box>

          <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Kéo thả file vào đây hoặc{" "}
            <span style={{ color: "#7367F0" }}>Chọn từ máy tính</span>
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            Có thể chọn không giới hạn ảnh/video cho một bài đăng • Định dạng:{" "}
            <strong>Ảnh (HEIC, HEIF, JPG, PNG, TIFF, RAW…) và video</strong>
          </Typography>
        </Box>

        {/* Upload Queue List */}
        {filesQueue.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Danh sách tệp trong bài đăng ({filesQueue.length} tệp):
              </Typography>
              <Typography
                variant="caption"
                color="primary.main"
                sx={{ fontWeight: 600 }}
              ></Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                maxHeight: 220,
                overflowY: "auto",
                pr: 0.5,
              }}
            >
              {filesQueue.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    bgcolor: "background.paper",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  {/* Thumbnail / Icon */}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor: "action.selected",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.previewUrl ? (
                      <Box
                        component="img"
                        src={item.previewUrl}
                        alt=""
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <i
                        className={
                          item.type === "video"
                            ? "tabler-video text-primary"
                            : "tabler-photo text-success"
                        }
                        style={{ fontSize: 24 }}
                      />
                    )}
                  </Box>

                  {/* File info & Progress */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500 }}
                        noWrap
                      >
                        {item.name}
                        {item.extractedFiles > 1
                          ? ` (${item.extractedFiles} media đã giải nén)`
                          : ""}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.sizeFormatted}
                      </Typography>
                    </Box>

                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <LinearProgress
                        variant="determinate"
                        value={item.progress}
                        sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                        color={item.progress === 100 ? "success" : "primary"}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          minWidth: 40,
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {item.progress}%
                      </Typography>
                    </Box>
                  </Box>

                  {/* Actions for Item */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {item.status === "error" && (
                      <Tooltip title="Tải lại">
                        <IconButton
                          size="small"
                          onClick={() => {}}
                        >
                          <i className="tabler-refresh text-warning" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Xóa khỏi hàng chờ">
                      <IconButton
                        size="small"
                        disabled={isUploading}
                        onClick={() => handleRemoveQueueItem(item.id)}
                      >
                        <i className="tabler-x" style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Metadata Inputs */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
          Thông tin tệp tải lên:
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <MentionInput
            label="Tiêu đề hiển thị (Hỗ trợ @ để gắn thẻ hoặc @All)"
            placeholder="Ví dụ: Thử nghiệm xe buýt Xbus tại Hòa Lạc @All..."
            size="small"
            fullWidth
            value={title}
            onChange={(val) => setTitle(val)}
            usersList={usersList}
            onMentionsChange={setMentionsInfo}
          />

          <MentionInput
            label="Mô tả chi tiết (Hỗ trợ @ để gắn thẻ hoặc @All)"
            placeholder="Ghi chú về nội dung ảnh, sự kiện... gõ @ để nhắc tên hoặc @All..."
            size="small"
            multiline
            rows={2}
            fullWidth
            value={description}
            onChange={(val) => setDescription(val)}
            usersList={usersList}
            onMentionsChange={setMentionsInfo}
          />

          {/* Tags */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1, fontWeight: 500 }}
            >
              Gắn thẻ phân loại (Tags):
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
              {POPULAR_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={() => handleToggleTag(tag)}
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "filled" : "outlined"}
                    sx={{
                      cursor: "pointer",
                      fontWeight: isSelected ? 600 : 400,
                      transition: "all 0.15s ease",
                    }}
                  />
                );
              })}
            </Box>

            <CustomTextField
              size="small"
              placeholder="Nhập thêm hashtag và nhấn Enter (ví dụ: #hoalac, #review)..."
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleAddCustomTag}
              InputProps={{
                startAdornment: <i className="tabler-tag mr-2 text-muted" />,
              }}
            />
          </Box>

          {/* Kênh truyền thông đăng tải */}
          <FormControl fullWidth>
            <FormLabel sx={{ fontSize: "0.8125rem", fontWeight: 600, mb: 1 }}>
              Kênh truyền thông đăng tải:
            </FormLabel>
            <RadioGroup
              row
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              sx={{ gap: { xs: 1, sm: 2 } }}
            >
              <FormControlLabel
                value="memory"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
                      <i className="tabler-photo-heart text-primary" /> Kênh Kỷ Niệm
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Kho tư liệu sự kiện & dự án
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="relax"
                control={<Radio size="small" color="success" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
                      <i className="tabler-coffee text-success" /> Kênh Relax
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Thư giãn, hài hước & đời sống
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="report"
                control={<Radio size="small" color="error" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
                      <i className="tabler-clipboard-check text-error" /> Kênh Report
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tiến độ, biên bản bàn giao, kiểm tra xe
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Privacy */}
          <FormControl>
            <FormLabel sx={{ fontSize: "0.8125rem", fontWeight: 600, mb: 1 }}>
              Quyền riêng tư & Phạm vi xem:
            </FormLabel>
            <RadioGroup
              row
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              sx={{ gap: 2 }}
            >
              <FormControlLabel
                value="public"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Công khai
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Toàn bộ thành viên Xbus
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="team"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Nội bộ team
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Chỉ phòng ban liên quan
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="private"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Chỉ mình tôi
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Lưu trữ riêng tư cá nhân
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </Box>
        </>}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 1,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleResetAndClose}
          disabled={isUploading}
        >
          Hủy bỏ
        </Button>
        <Button
          variant="contained"
          color="primary"
          sx={{ display: mode === "album" ? "none" : undefined, minWidth: 140 }}
          onClick={handleStartUpload}
          disabled={isUploading || filesQueue.length === 0}
          startIcon={
            isUploading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <i className="tabler-cloud-upload" />
            )
          }

        >
          {isUploading
            ? "Đang tải lên..."
            : `Tải lên (${filesQueue.length} file)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
