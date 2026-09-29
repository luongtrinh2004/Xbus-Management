"use client";

import { useState, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import CustomTextField from "@core/components/mui/TextField";

export default function ManagePostsModal({
  open,
  onClose,
  posts = [],
  onEditPost,
  onDeletePost,
}) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("fileSize"); // 'title' | 'uploader' | 'totalFiles' | 'fileSize'
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.uploader?.name?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "title") {
        const titleA = a.title || "Bài viết không có tiêu đề";
        const titleB = b.title || "Bài viết không có tiêu đề";
        comparison = titleA.localeCompare(titleB, "vi");
      } else if (sortField === "uploader") {
        const nameA = a.uploader?.name || "";
        const nameB = b.uploader?.name || "";
        comparison = nameA.localeCompare(nameB, "vi");
      } else if (sortField === "totalFiles") {
        const countA = a.totalFiles || a.files?.length || 1;
        const countB = b.totalFiles || b.files?.length || 1;
        comparison = countA - countB;
      } else if (sortField === "fileSize") {
        const sizeA = Number(a.fileSize) || 0;
        const sizeB = Number(b.fileSize) || 0;
        comparison = sizeA - sizeB;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [posts, search, sortField, sortOrder]);

  const renderSortableHeader = (field, label, align = "left") => {
    const isCurrent = sortField === field;
    return (
      <Box
        component="button"
        type="button"
        onClick={() => handleSort(field)}
        sx={{
          border: 0,
          p: 0,
          bgcolor: "transparent",
          color: "inherit",
          font: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent:
            align === "center"
              ? "center"
              : align === "right"
                ? "flex-end"
                : "flex-start",
          gap: 0.75,
          cursor: "pointer",
          fontWeight: 600,
          width: "100%",
          "&:hover": {
            color: "primary.main",
          },
        }}
      >
        <span>{label}</span>
        <i
          className={
            isCurrent
              ? sortOrder === "asc"
                ? "tabler-chevron-up text-primary"
                : "tabler-chevron-down text-primary"
              : "tabler-selector text-muted"
          }
          style={{ fontSize: 16 }}
        />
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
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
              width: 40,
              height: 40,
              borderRadius: "10px",
              bgcolor: "primary.lighter",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="tabler-settings text-2xl" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Cài Đặt bài đăng
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Quản lý, chỉnh sửa hoặc xóa các bài đăng chiếm nhiều dung lượng để giải phóng bộ nhớ
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <i className="tabler-x" style={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      {/* Filter bar: Search only with total count badge (Removed yellow buttons) */}
      <Box
        sx={{
          p: 2.5,
          pb: 2,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <CustomTextField
          size="small"
          placeholder="Tìm bài đăng theo tiêu đề, người đăng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 260 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <i className="tabler-search text-muted" style={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <Chip
          label={`Tổng: ${filteredPosts.length} bài đăng`}
          size="small"
          variant="tonal"
          color="secondary"
          sx={{ fontWeight: 600, height: 28 }}
        />
      </Box>

      {/* Table content */}
      <DialogContent sx={{ p: 0, flexGrow: 1, overflowY: "auto" }}>
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 280, bgcolor: "action.hover" }}>
                  {renderSortableHeader("title", "Bài đăng", "left")}
                </TableCell>
                <TableCell sx={{ minWidth: 160, bgcolor: "action.hover" }}>
                  {renderSortableHeader("uploader", "Người đăng", "left")}
                </TableCell>
                <TableCell sx={{ width: 100, textAlign: "center", bgcolor: "action.hover" }}>
                  {renderSortableHeader("totalFiles", "Số tệp", "center")}
                </TableCell>
                <TableCell sx={{ width: 130, textAlign: "right", bgcolor: "action.hover" }}>
                  {renderSortableHeader("fileSize", "Dung lượng", "right")}
                </TableCell>
                <TableCell sx={{ width: 110, textAlign: "center", fontWeight: 600, bgcolor: "action.hover" }}>
                  Hành động
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: "center", py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy bài đăng nào phù hợp
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPosts.map((post) => {
                  const rawTitle = (post.title || "").trim();
                  const isNoTitle =
                    !rawTitle ||
                    rawTitle.startsWith("Gemini_Generated_Image") ||
                    /^\d{6,}_/.test(rawTitle) ||
                    /\.(jpe?g|png|webp|gif|mp4|mov|svg)$/i.test(rawTitle);
                  const displayTitle = isNoTitle ? "Bài viết không có tiêu đề" : rawTitle;

                  const rawDesc = (post.description || "").trim();
                  const isNoDesc =
                    !rawDesc ||
                    rawDesc === "Tệp media được tải lên hệ thống lưu trữ nội bộ Xbus." ||
                    rawDesc === "-";
                  const displayDescription = isNoDesc ? "Mô tả : -" : rawDesc;

                  return (
                    <TableRow
                      key={post.id}
                      hover
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      {/* Post Cover & Title */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box
                            component="img"
                            src={post.thumbnail || post.url}
                            alt={displayTitle}
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: "6px",
                              objectFit: "cover",
                              bgcolor: "background.default",
                              border: "1px solid",
                              borderColor: "divider",
                              flexShrink: 0,
                            }}
                          />
                          <Box sx={{ minWidth: 0, maxWidth: 260 }}>
                            <Typography
                              variant="body2"
                              fontWeight={isNoTitle ? 400 : 600}
                              fontStyle={isNoTitle ? "italic" : "normal"}
                              color={isNoTitle ? "text.disabled" : "text.primary"}
                              noWrap
                            >
                              {displayTitle}
                            </Typography>
                            <Typography
                              variant="caption"
                              color={isNoDesc ? "text.disabled" : "text.secondary"}
                              fontStyle={isNoDesc ? "italic" : "normal"}
                              noWrap
                              sx={{ display: "block" }}
                            >
                              {displayDescription}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Uploader */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar
                            src={post.uploader?.avatar}
                            alt={post.uploader?.name}
                            sx={{ width: 26, height: 26, fontSize: 12 }}
                          >
                            {post.uploader?.name?.[0]}
                          </Avatar>
                          <Typography variant="caption" fontWeight={500} noWrap>
                            {post.uploader?.name || "Thành viên"}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* File Count */}
                      <TableCell sx={{ textAlign: "center" }}>
                        <Chip
                          size="small"
                          label={`${post.totalFiles || post.files?.length || 1} tệp`}
                          variant="tonal"
                          color="secondary"
                          sx={{ height: 22, fontSize: "0.72rem" }}
                        />
                      </TableCell>

                      {/* File Size */}
                      <TableCell sx={{ textAlign: "right" }}>
                        <Typography variant="body2" fontWeight={600} color="warning.main">
                          {post.fileSizeFormatted || "0 KB"}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ textAlign: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                          <Tooltip title="Chỉnh sửa bài đăng">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => onEditPost(post)}
                            >
                              <i className="tabler-edit" style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Xóa bài đăng (giải phóng dung lượng)">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onDeletePost(post)}
                            >
                              <i className="tabler-trash" style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ borderTop: "1px solid", borderColor: "divider", p: 2 }}>
        <Button variant="contained" color="secondary" onClick={onClose}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
