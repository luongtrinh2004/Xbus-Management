"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { renderWithMentions } from "./mentionUtils";

function formatDateTime(dateString) {
  try {
    const d = new Date(dateString);
    return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return dateString;
  }
}

export default function MediaListView({
  items = [],
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onItemClick,
  onDownload,
  onShare,
  onDelete,
  onEdit,
  currentUser = null,
  isAdminOrAssistant = false,
}) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  return (
    <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
      <TableContainer>
        <Table sx={{ minWidth: 850 }}>
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell padding="checkbox" sx={{ pl: 3 }}>
                <Checkbox
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Bài đăng</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Loại & Kích thước</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Người đăng</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Thời gian tải</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isVideo =
                item.type === "video" || /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(item.url || "");
              const hasImageThumbnail = Boolean(
                item.thumbnail &&
                item.thumbnail !== item.url &&
                !/\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(item.thumbnail)
              );

              const rawTitle = (item.title || "").trim();
              const isNoTitle =
                !rawTitle ||
                rawTitle.startsWith("Gemini_Generated_Image") ||
                /^\d{6,}_/.test(rawTitle) ||
                /\.(jpe?g|png|webp|gif|mp4|mov|svg)$/i.test(rawTitle);
              const displayTitle = isNoTitle ? "Bài viết không có tiêu đề" : rawTitle;

              const rawDesc = (item.description || "").trim();
              const isNoDesc =
                !rawDesc ||
                rawDesc === "Tệp media được tải lên hệ thống lưu trữ nội bộ Xbus." ||
                rawDesc === "-";
              const displayDescription = isNoDesc ? "Mô tả : -" : rawDesc;

              const isOwner =
                (item.uploader?.id && currentUser?.id && item.uploader.id === currentUser.id) ||
                (item.uploader?.email &&
                  currentUser?.email &&
                  item.uploader.email.toLowerCase() === currentUser.email.toLowerCase());

              const canEdit = isAdminOrAssistant || isOwner;
              const canDelete = isAdminOrAssistant || isOwner;

              return (
                <TableRow
                  key={item.id}
                  hover
                  selected={isSelected}
                  onClick={() => onItemClick(item)}
                  sx={{
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                    "&.Mui-selected": {
                      bgcolor: "rgba(115, 103, 240, 0.08) !important",
                    },
                  }}
                >
                  <TableCell
                    padding="checkbox"
                    sx={{ pl: 3 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(item.id);
                    }}
                  >
                    <Checkbox checked={isSelected} size="small" />
                  </TableCell>

                  {/* Thumbnail & Title */}
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          position: "relative",
                          width: 56,
                          height: 42,
                          borderRadius: 1,
                          overflow: "hidden",
                          flexShrink: 0,
                          bgcolor: "background.default",
                        }}
                      >
                        {isVideo && !hasImageThumbnail ? (
                          <Box
                            component="video"
                            src={`${item.url}#t=0.5`}
                            preload="none"
                            muted
                            playsInline
                            sx={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", bgcolor: "#000" }}
                          />
                        ) : (
                          <Box
                            component="img"
                            src={hasImageThumbnail ? item.thumbnail : item.url}
                            alt={displayTitle}
                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        )}
                        {isVideo && (
                          <Box
                            sx={{
                              position: "absolute",
                              inset: 0,
                              bgcolor: "rgba(0,0,0,0.35)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                            }}
                          >
                            <i className="tabler-player-play-filled" style={{ fontSize: 16 }} />
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ minWidth: 0, maxWidth: 280 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isNoTitle ? 400 : 600,
                            fontStyle: isNoTitle ? "italic" : "normal",
                            color: isNoTitle ? "text.disabled" : "text.primary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isNoTitle ? displayTitle : renderWithMentions(displayTitle)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color={isNoDesc ? "text.disabled" : "text.secondary"}
                          fontStyle={isNoDesc ? "italic" : "normal"}
                          noWrap
                          sx={{ display: "block" }}
                        >
                          {isNoDesc ? displayDescription : renderWithMentions(displayDescription)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Type & Size */}
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        icon={<i className={isVideo ? "tabler-video" : "tabler-photo"} style={{ fontSize: 13 }} />}
                        label={isVideo ? `${item.duration || "Video"}` : item.fileFormat || "MEDIA"}
                        size="small"
                        variant="tonal"
                        color={isVideo ? "primary" : "secondary"}
                        sx={{ height: 24, fontSize: "0.75rem" }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {item.fileSizeFormatted}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Uploader */}
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar
                        src={item.uploader?.avatar}
                        alt={item.uploader?.name}
                        sx={{ width: 28, height: 28, fontSize: 12, bgcolor: "primary.light" }}
                      >
                        {item.uploader?.name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {item.uploader?.name}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {item.uploader?.department || item.uploader?.role}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Time */}
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateTime(item.uploadedAt)}
                    </Typography>
                  </TableCell>

                  {/* Action buttons */}
                  <TableCell sx={{ textAlign: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                      {canEdit && onEdit && (
                        <Tooltip title="Chỉnh sửa bài">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(item);
                            }}
                          >
                            <i className="tabler-edit" style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}

                      <Tooltip title="Tải xuống">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(item);
                          }}
                        >
                          <i className="tabler-download" style={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Sao chép link">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShare(item);
                          }}
                        >
                          <i className="tabler-share" style={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>

                      {canDelete && (
                        <Tooltip title="Xóa">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(item);
                            }}
                          >
                            <i className="tabler-trash" style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
