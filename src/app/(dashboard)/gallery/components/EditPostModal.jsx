"use client";

import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import CustomTextField from "@core/components/mui/TextField";
import { toast } from "react-toastify";
import { POPULAR_TAGS } from "./constants";
import MentionInput from "./MentionInput";

export default function EditPostModal({
  open,
  onClose,
  post,
  onSaveSuccess,
  usersList = [],
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState("memory");
  const [privacy, setPrivacy] = useState("public");
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mentionsInfo, setMentionsInfo] = useState({ isTagAll: false, taggedUserIds: [] });

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setDescription(post.description || "");
      setChannel(post.channel || "memory");
      setPrivacy(post.privacy || "public");
      setSelectedTags(Array.isArray(post.tags) ? post.tags : []);
    }
  }, [post]);

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e) => {
    if (e.key === "Enter" && customTagInput.trim()) {
      e.preventDefault();
      const formatted = customTagInput.startsWith("#")
        ? customTagInput.trim()
        : `#${customTagInput.trim()}`;
      if (!selectedTags.includes(formatted)) {
        setSelectedTags((prev) => [...prev, formatted]);
      }
      setCustomTagInput("");
    }
  };

  const handleSave = async () => {
    if (!post) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/gallery/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          channel,
          privacy,
          tags: selectedTags,
          isTagAll: /@all\b/i.test(`${title} ${description}`) || mentionsInfo.isTagAll,
          taggedUserIds: mentionsInfo.taggedUserIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Đã cập nhật bài đăng thành công!");
        if (onSaveSuccess) onSaveSuccess(data.item);
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error || "Không thể cập nhật bài đăng");
      }
    } catch (err) {
      console.error("[EditPostModal] Lỗi:", err);
      toast.error("Đã xảy ra lỗi khi lưu thông tin");
    } finally {
      setIsSaving(false);
    }
  };

  if (!post) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 12px 32px rgba(47, 43, 61, 0.16)",
          overflow: "hidden",
        },
      }}
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
              borderRadius: "8px",
              bgcolor: "warning.lighter",
              color: "warning.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="tabler-edit text-xl" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Chỉnh Sửa Bài Đăng
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cập nhật tiêu đề, mô tả và thiết lập quyền riêng tư
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <i className="tabler-x" style={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          {/* Tiêu đề */}
          <MentionInput
            fullWidth
            label="Tiêu đề hiển thị"
            value={title}
            onChange={(val) => setTitle(val)}
            usersList={usersList}
            onMentionsChange={setMentionsInfo}
            placeholder="Ví dụ: Lễ bàn giao xe buýt điện Xbus @All..."
          />

          {/* Mô tả chi tiết */}
          <MentionInput
            fullWidth
            multiline
            rows={3}
            label="Mô tả nội dung"
            value={description}
            onChange={(val) => setDescription(val)}
            usersList={usersList}
            onMentionsChange={setMentionsInfo}
            placeholder="Ghi chú chi tiết về bài đăng, thời điểm... gõ @ để nhắc tên hoặc @All..."
          />

          {/* Gắn thẻ phân loại (Hashtags) */}
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Thẻ phân loại (Hashtags):
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
              {POPULAR_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant={isSelected ? "filled" : "outlined"}
                    color={isSelected ? "primary" : "default"}
                    onClick={() => handleToggleTag(tag)}
                    sx={{
                      cursor: "pointer",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  />
                );
              })}
            </Box>
            <CustomTextField
              fullWidth
              size="small"
              placeholder="Nhập thêm hashtag và nhấn Enter..."
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleAddCustomTag}
              slotProps={{
                input: {
                  startAdornment: (
                    <i className="tabler-tag text-muted mr-1.5" style={{ fontSize: 16 }} />
                  ),
                },
              }}
            />
          </Box>

          {/* Kênh truyền thông */}
          <FormControl>
            <FormLabel sx={{ fontSize: "0.875rem", fontWeight: 600, mb: 0.5 }}>
              Kênh truyền thông:
            </FormLabel>
            <RadioGroup
              row
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              sx={{ gap: 1 }}
            >
              <FormControlLabel
                value="memory"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <i className="tabler-photo-heart text-primary" style={{ fontSize: 16 }} />
                    <Typography variant="body2">Kỷ niệm</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="relax"
                control={<Radio size="small" color="success" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <i className="tabler-coffee text-success" style={{ fontSize: 16 }} />
                    <Typography variant="body2">Relax</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="report"
                control={<Radio size="small" color="error" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <i className="tabler-clipboard-check text-error" style={{ fontSize: 16 }} />
                    <Typography variant="body2">Report</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Quyền riêng tư */}
          <FormControl>
            <FormLabel sx={{ fontSize: "0.875rem", fontWeight: 600, mb: 0.5 }}>
              Quyền riêng tư & Phạm vi xem:
            </FormLabel>
            <RadioGroup
              row
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
            >
              <FormControlLabel
                value="public"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <i className="tabler-world" style={{ fontSize: 16 }} />
                    <Typography variant="body2">Công khai</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="team"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <i className="tabler-users" style={{ fontSize: 16 }} />
                    <Typography variant="body2">Nội bộ team</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="private"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <i className="tabler-lock" style={{ fontSize: 16 }} />
                    <Typography variant="body2">Chỉ mình tôi</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          px: 3,
          py: 2,
        }}
      >
        <Button variant="tonal" color="secondary" onClick={onClose} disabled={isSaving}>
          Hủy bỏ
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={
            isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <i className="tabler-check" />
            )
          }
        >
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
