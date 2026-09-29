"use client";

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
            (width / (video.videoWidth || 16)) * (video.videoHeight || 9)
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
            0.85
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

export default function UploadModal({ open, onClose, onUploadSuccess, currentUser, usersList = [] }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filesQueue, setFilesQueue] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState(["#xe_tuhanh"]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [isUploading, setIsUploading] = useState(false);
  const [mentionsInfo, setMentionsInfo] = useState({ isTagAll: false, taggedUserIds: [] });
  const queueRef = useRef([]);

  const MAX_FILES_PER_POST = 20;

  // Keep queueRef in sync with filesQueue state for async handlers
  useEffect(() => {
    queueRef.current = filesQueue;
  }, [filesQueue]);

  // Upload single file immediately to MinIO S3 in the background
  const uploadSingleFile = (uploadItem) => {
    const formData = new FormData();
    formData.append("file", uploadItem.file);
    if (uploadItem.thumbnailBlob) {
      formData.append("thumbnail", uploadItem.thumbnailBlob, `thumb_${Date.now()}.jpg`);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/gallery/upload/file", true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
        setFilesQueue((prev) =>
          prev.map((q) =>
            q.id === uploadItem.id
              ? { ...q, progress: percent, status: "uploading" }
              : q
          )
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.fileData) {
            setFilesQueue((prev) =>
              prev.map((q) =>
                q.id === uploadItem.id
                  ? {
                      ...q,
                      progress: 100,
                      status: "ready",
                      uploadedData: res.fileData,
                    }
                  : q
              )
            );
            return;
          }
        } catch {}
      }

      setFilesQueue((prev) =>
        prev.map((q) =>
          q.id === uploadItem.id
            ? { ...q, status: "error", errorMsg: "Lỗi tải lên" }
            : q
        )
      );
    };

    xhr.onerror = () => {
      setFilesQueue((prev) =>
        prev.map((q) =>
          q.id === uploadItem.id
            ? { ...q, status: "error", errorMsg: "Lỗi mạng" }
            : q
        )
      );
    };

    xhr.send(formData);
  };

  const handleFilesSelected = async (filesList) => {
    const rawFiles = Array.from(filesList);
    const availableSlots = MAX_FILES_PER_POST - filesQueue.length;

    if (availableSlots <= 0) {
      toast.warning(`Một bài đăng chỉ được chứa tối đa ${MAX_FILES_PER_POST} ảnh hoặc video.`);
      return;
    }

    if (rawFiles.length > availableSlots) {
      toast.info(
        `Đã tự động chọn ${availableSlots} tệp hợp lệ (Đạt giới hạn tối đa ${MAX_FILES_PER_POST} tệp/bài đăng).`
      );
    }

    const filesToProcess = rawFiles.slice(0, availableSlots);

    for (let idx = 0; idx < filesToProcess.length; idx++) {
      const file = filesToProcess[idx];
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      let previewUrl = isImage ? URL.createObjectURL(file) : "";
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
        name: file.name,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        type: isVideo ? "video" : "image",
        previewUrl,
        thumbnailBlob,
        progress: 0,
        status: "uploading",
        uploadedData: null,
      };

      setFilesQueue((prev) => [...prev, item]);
      uploadSingleFile(item);
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

  const handleRetryQueueItem = (id) => {
    const item = filesQueue.find((q) => q.id === id);
    if (item) {
      setFilesQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, progress: 0, status: "uploading" } : q))
      );
      uploadSingleFile(item);
    }
  };

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
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

  // When user clicks "Tải lên" / "Đăng bài" -> files already uploaded to MinIO!
  const handleStartUpload = async () => {
    if (filesQueue.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 file ảnh hoặc video để tải lên");
      return;
    }

    // Check if any files are still uploading
    const stillUploading = filesQueue.some((q) => q.status === "uploading");
    if (stillUploading) {
      setIsUploading(true);
      toast.info("Đang hoàn tất tải lên các tệp, vui lòng chờ trong giây lát...");
      // Poll briefly until ready
      const checkInterval = setInterval(async () => {
        const currentQueue = queueRef.current;
        const pending = currentQueue.some((q) => q.status === "uploading");
        if (!pending) {
          clearInterval(checkInterval);
          await finalizePost(currentQueue);
        }
      }, 300);
      return;
    }

    await finalizePost(filesQueue);
  };

  const finalizePost = async (queue) => {
    setIsUploading(true);
    try {
      const readyFiles = queue
        .filter((q) => q.status === "ready" && q.uploadedData)
        .map((q) => q.uploadedData);

      if (readyFiles.length === 0) {
        toast.error("Không có tệp nào tải lên thành công. Vui lòng thử lại.");
        setIsUploading(false);
        return;
      }

      // Fast JSON submit: Post is created in ~10ms
      const res = await fetch("/api/gallery/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          privacy,
          tags: selectedTags,
          uploadedFiles: readyFiles,
          isTagAll: /@all\b/i.test(`${title} ${description}`) || mentionsInfo.isTagAll,
          taggedUserIds: mentionsInfo.taggedUserIds,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onUploadSuccess(data.items, data.storage);
        toast.success(`Đã đăng tải thành công bài viết với ${readyFiles.length} tệp!`);
        handleResetAndClose();
      } else {
        toast.error(data.error || "Lỗi tạo bài đăng");
      }
    } catch (err) {
      console.error("[finalizePost] Lỗi:", err);
      toast.error("Lỗi gửi dữ liệu bài đăng");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetAndClose = () => {
    setFilesQueue([]);
    setTitle("");
    setDescription("");
    setSelectedTags(["#xe_tuhanh"]);
    setCustomTagInput("");
    setPrivacy("public");
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

        <IconButton size="small" onClick={handleResetAndClose} disabled={isUploading}>
          <i className="tabler-x" style={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
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
            Kéo thả file vào đây hoặc <span style={{ color: "#7367F0" }}>Chọn từ máy tính</span>
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Tối đa <strong>20 ảnh/video</strong> cho một bài đăng • Định dạng: <strong>JPG, PNG, WEBP, GIF, MP4, MOV...</strong> (Max 500MB/tệp)
          </Typography>
        </Box>

        {/* Upload Queue List */}
        {filesQueue.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Danh sách tệp trong bài đăng ({filesQueue.length}/20 tệp):
              </Typography>
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                {20 - filesQueue.length > 0 ? `Còn có thể thêm ${20 - filesQueue.length} tệp` : "Đã đạt tối đa 20 tệp"}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 220, overflowY: "auto", pr: 0.5 }}>
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
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <i
                        className={item.type === "video" ? "tabler-video text-primary" : "tabler-photo text-success"}
                        style={{ fontSize: 24 }}
                      />
                    )}
                  </Box>

                  {/* File info & Progress */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.sizeFormatted}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={item.progress}
                        sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                        color={item.progress === 100 ? "success" : "primary"}
                      />
                      <Typography variant="caption" sx={{ minWidth: 40, textAlign: "right", fontWeight: 600 }}>
                        {item.progress}%
                      </Typography>
                    </Box>
                  </Box>

                  {/* Actions for Item */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {item.status === "error" && (
                      <Tooltip title="Tải lại">
                        <IconButton size="small" onClick={() => handleRetryQueueItem(item.id)}>
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
          Thông tin tệp tải lên (Metadata):
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
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 500 }}>
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
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
        <Button variant="outlined" color="secondary" onClick={handleResetAndClose} disabled={isUploading}>
          Hủy bỏ
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleStartUpload}
          disabled={isUploading || filesQueue.length === 0}
          startIcon={isUploading ? <CircularProgress size={18} color="inherit" /> : <i className="tabler-cloud-upload" />}
          sx={{ minWidth: 140 }}
        >
          {isUploading ? "Đang tải lên..." : `Tải lên (${filesQueue.length} file)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
