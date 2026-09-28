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
              <TableCell sx={{ fontWeight: 600 }}>Tệp Media</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Loại & Kích thước</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Người đăng</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Thời gian tải</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Thẻ tag</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Quyền xem</TableCell>
              <TableCell align="right" sx={{ pr: 3, fontWeight: 600 }}>
                Thao tác
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isVideo = item.type === "video";

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
                        <Box
                          component="img"
                          src={item.thumbnail || item.url}
                          alt={item.title}
                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
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

                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 240,
                          }}
                        >
                          {item.title || item.fileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.fileName}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Type & Size */}
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        icon={<i className={isVideo ? "tabler-video" : "tabler-photo"} style={{ fontSize: 13 }} />}
                        label={isVideo ? `${item.duration || "Video"}` : item.fileFormat}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          bgcolor: isVideo ? "rgba(115, 103, 240, 0.12)" : "rgba(40, 199, 111, 0.12)",
                          color: isVideo ? "primary.main" : "success.main",
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {item.fileSizeFormatted}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Uploader */}
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Avatar
                        src={item.uploader?.avatar}
                        sx={{ width: 28, height: 28, fontSize: 12, bgcolor: "primary.light" }}
                      >
                        {item.uploader?.name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.uploader?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.uploader?.department}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Upload Time */}
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateTime(item.uploadedAt)}
                    </Typography>
                  </TableCell>

                  {/* Tags */}
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", maxWidth: 180 }}>
                      {(item.tags || []).slice(0, 2).map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{ height: 20, fontSize: "0.7rem", bgcolor: "action.hover" }}
                        />
                      ))}
                      {(item.tags || []).length > 2 && (
                        <Chip
                          label={`+${item.tags.length - 2}`}
                          size="small"
                          sx={{ height: 20, fontSize: "0.7rem", bgcolor: "action.hover" }}
                        />
                      )}
                    </Box>
                  </TableCell>

                  {/* Privacy */}
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        item.privacy === "public"
                          ? "Công khai"
                          : item.privacy === "team"
                            ? "Nội bộ"
                            : "Chỉ mình tôi"
                      }
                      sx={{
                        height: 22,
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        bgcolor:
                          item.privacy === "public"
                            ? "rgba(40, 199, 111, 0.12)"
                            : item.privacy === "team"
                              ? "rgba(0, 186, 209, 0.12)"
                              : "rgba(128, 131, 144, 0.12)",
                        color:
                          item.privacy === "public"
                            ? "success.main"
                            : item.privacy === "team"
                              ? "info.main"
                              : "secondary.main",
                      }}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right" sx={{ pr: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                      <Tooltip title="Xem chi tiết">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onItemClick(item);
                          }}
                        >
                          <i className="tabler-eye" style={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>

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
