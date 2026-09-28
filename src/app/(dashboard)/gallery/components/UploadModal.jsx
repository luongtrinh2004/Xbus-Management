"use client";

import { useState, useRef } from "react";
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
import { POPULAR_TAGS } from "./mockData";

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
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

  const handleFilesSelected = (filesList) => {
    const newItems = Array.from(filesList).map((file, idx) => {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : "";

      return {
        id: `upload_${Date.now()}_${idx}`,
        file,
        name: file.name,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        type: isVideo ? "video" : "image",
        previewUrl,
        progress: 0,
        status: "pending", // pending | uploading | success | error
      };
    });

    setFilesQueue((prev) => [...prev, ...newItems]);
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
    setFilesQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, progress: 0, status: "pending" } : item))
    );
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

  const handleStartUpload = () => {
    if (filesQueue.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 file ảnh hoặc video để tải lên");
      return;
    }

    setIsUploading(true);

    // Simulate progress upload for each file
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setFilesQueue((prev) =>
        prev.map((item) => ({
          ...item,
          status: "uploading",
          progress: Math.min(100, currentProgress + Math.floor(Math.random() * 15)),
        }))
      );

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);

          // Build created media items
          const newMediaItems = filesQueue.map((item, index) => {
            const ext = item.name.split(".").pop().toUpperCase();
            return {
              id: `media_custom_${Date.now()}_${index}`,
              title: title.trim() || item.name.replace(/\.[^/.]+$/, ""),
              fileName: item.name,
              type: item.type,
              url:
                item.previewUrl ||
                (item.type === "video"
                  ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  : "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80"),
              thumbnail:
                item.previewUrl ||
                "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
              fileSize: item.size,
              fileSizeFormatted: item.sizeFormatted,
              fileFormat: ext || (item.type === "video" ? "MP4" : "JPG"),
              dimensions: item.type === "video" ? "1920 x 1080 (FHD)" : "3840 x 2160 (4K)",
              duration: item.type === "video" ? "01:45" : undefined,
              durationSeconds: item.type === "video" ? 105 : undefined,
              uploadedAt: new Date().toISOString(),
              uploader: (() => {
                const matched = usersList.find(
                  (u) =>
                    (currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
                    (currentUser?.id && u.id === currentUser.id) ||
                    (currentUser?.name && u.name === currentUser.name)
                );
                return {
                  id: matched?.id || currentUser?.id || "usr_001",
                  name: matched?.name || currentUser?.name || "Vũ Hoàng Dũng",
                  email: matched?.email || currentUser?.email || "dungvh@phenikaa-x.com",
                  code: matched?.code || "PNKX047",
                  avatar: matched?.avatar || currentUser?.image || "/images/avatars/male-admin.png",
                  role: matched?.role || "Quản Lý Dự Án",
                  department: matched?.department || "Quản Lý Dự Án",
                };
              })(),
              privacy,
              tags: selectedTags.length > 0 ? selectedTags : ["#xbus"],
              description:
                description.trim() || "Tệp media được tải lên hệ thống lưu trữ nội bộ Xbus.",
              likes: 1,
              isLiked: false,
              exif: {
                camera: "Thiết bị người dùng",
                resolution: "Full HD",
                uploadedVia: "Web Uploader",
              },
              comments: [],
            };
          });

          onUploadSuccess(newMediaItems);
          toast.success(`Đã tải lên thành công ${newMediaItems.length} tệp!`);
          handleResetAndClose();
        }, 500);
      }
    }, 200);
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
            Hỗ trợ định dạng: <strong>JPG, PNG, WEBP, GIF, MP4, MOV, MKV...</strong> • Dung lượng tối đa: <strong>500MB / file</strong>
          </Typography>
        </Box>

        {/* Upload Queue List */}
        {filesQueue.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Danh sách tệp đang chờ ({filesQueue.length}):
            </Typography>

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
          <CustomTextField
            label="Tiêu đề hiển thị"
            placeholder="Ví dụ: Thử nghiệm xe buýt Xbus tại Hòa Lạc..."
            size="small"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <CustomTextField
            label="Mô tả chi tiết"
            placeholder="Ghi chú về nội dung ảnh, sự kiện, thời điểm hoặc thông số kỹ thuật..."
            size="small"
            multiline
            rows={2}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
