"use client";

import { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CustomTextField from "@core/components/mui/TextField";
import CustomAvatar from "@core/components/mui/Avatar";
import Avatar from "@mui/material/Avatar";

function formatDateYMD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const CHANNELS = [
  {
    key: "memory",
    label: "Kênh Kỷ Niệm",
    tabLabel: "Kỷ niệm",
    icon: "tabler-photo-heart",
    description: "Kho tư liệu hình ảnh và video sự kiện, dự án xe tự hành Xbus",
    color: "primary",
  },
  {
    key: "relax",
    label: "Kênh Relax",
    tabLabel: "Relax",
    icon: "tabler-coffee",
    description: "Góc thư giãn, meme hài hước, đời sống và giao lưu đồng đội Xbus",
    color: "success",
  },
  {
    key: "report",
    label: "Kênh Report",
    tabLabel: "Report",
    icon: "tabler-clipboard-check",
    description: "Cập nhật hình ảnh/video tiến độ, biên bản bàn giao, kiểm tra xe và báo cáo sự cố",
    color: "error",
  },
  {
    key: "all",
    label: "Tất Cả Kênh Truyền Thông",
    tabLabel: "Tất cả",
    icon: "tabler-broadcast",
    description: "Tổng hợp toàn bộ nội dung từ Kỷ niệm, Relax và Report",
    color: "secondary",
  },
];

export default function MediaToolbar({
  selectedChannel = "memory",
  onChannelChange,
  channelCounts = {},
  searchQuery = "",
  onSearchChange,
  startDate = "",
  onStartDateChange,
  endDate = "",
  onEndDateChange,
  tagFilter = "all",
  onTagFilterChange,
  uploaderFilter = "all",
  onUploaderFilterChange,
  sortOption = "newest",
  onSortOptionChange,
  viewMode = "grid",
  onViewModeChange,
  onOpenUpload,
  uploaderOptions = [],
  availableTags = [],
  onResetFilters,
}) {
  const [searchStaffText, setSearchStaffText] = useState("");

  const currentChannelInfo = useMemo(() => {
    return (
      CHANNELS.find((c) => c.key === selectedChannel) || CHANNELS[0]
    );
  }, [selectedChannel]);

  // Tìm kiếm nhân sự trong dropdown Người tải lên
  const filteredStaffList = useMemo(() => {
    if (!searchStaffText.trim()) return uploaderOptions;
    const q = searchStaffText.toLowerCase().trim();
    return uploaderOptions.filter((u) => {
      const matchName = u.name?.toLowerCase().includes(q);
      const matchCode = u.code?.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      return matchName || matchCode || matchDept || matchEmail;
    });
  }, [uploaderOptions, searchStaffText]);

  // Tìm thông tin nhân sự đang được chọn
  const selectedStaff = useMemo(() => {
    if (!uploaderFilter || uploaderFilter === "all") return null;
    return uploaderOptions.find(
      (u) => u.name === uploaderFilter || u.id === uploaderFilter
    );
  }, [uploaderFilter, uploaderOptions]);

  // Xử lý khi chọn "Từ ngày":
  // Nếu "Đến ngày" đang trống thì mặc định là ngày hôm nay (hoặc = val nếu val > today)
  // Nếu "Đến ngày" đã có nhưng val > endDate thì tự động đẩy endDate = val
  const handleStartDateChange = (val) => {
    onStartDateChange(val);
    if (val) {
      const today = formatDateYMD(new Date());
      if (!endDate) {
        onEndDateChange(val > today ? val : today);
      } else if (val > endDate) {
        onEndDateChange(val);
      }
    }
  };

  // Xử lý khi chọn "Đến ngày":
  // Nếu chọn mỗi đến ngày thì từ ngày để trống (lọc từ quá khứ đến ngày được chọn)
  // Nếu đã có startDate và startDate > val thì tự động xóa startDate
  const handleEndDateChange = (val) => {
    onEndDateChange(val);
    if (val && startDate && startDate > val) {
      onStartDateChange("");
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    startDate ||
    endDate ||
    (tagFilter && tagFilter !== "all") ||
    (uploaderFilter && uploaderFilter !== "all")
  );

  return (
    <Card sx={{ mb: 6 }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        {/* Channel Switcher Tabs */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 3,
            pb: 2.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {CHANNELS.map((ch) => {
            const isActive = selectedChannel === ch.key;
            const count = channelCounts?.[ch.key] ?? 0;
            return (
              <Button
                key={ch.key}
                variant={isActive ? "contained" : "outlined"}
                color={isActive ? (ch.color === "secondary" ? "primary" : ch.color) : "secondary"}
                onClick={() => onChannelChange && onChannelChange(ch.key)}
                startIcon={<i className={`${ch.icon} text-lg`} />}
                size="medium"
                sx={{
                  borderRadius: "24px",
                  px: 2.5,
                  py: 0.8,
                  fontWeight: isActive ? 600 : 500,
                  textTransform: "none",
                  boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                  ...(isActive
                    ? {}
                    : {
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          borderColor: "primary.main",
                          bgcolor: "action.hover",
                        },
                      }),
                }}
              >
                {ch.tabLabel}
                <Chip
                  label={count}
                  size="small"
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    bgcolor: isActive ? "rgba(255,255,255,0.25)" : "action.selected",
                    color: isActive ? "#fff" : "text.secondary",
                  }}
                />
              </Button>
            );
          })}
        </Box>

        {/* Top row: Title / Stats + Main Upload Action */}
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <CustomAvatar
                variant="rounded"
                skin="light"
                color={currentChannelInfo.color === "secondary" ? "primary" : currentChannelInfo.color}
                sx={{ width: 46, height: 46 }}
              >
                <i className={`${currentChannelInfo.icon} text-2xl`} />
              </CustomAvatar>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {currentChannelInfo.label}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${channelCounts?.[selectedChannel] ?? 0} bài đăng`}
                    color={currentChannelInfo.color === "secondary" ? "default" : currentChannelInfo.color}
                    variant="outlined"
                    sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {currentChannelInfo.description}
                </Typography>
              </Box>
            </Box>
          </Box>

          {selectedChannel !== "all" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                color={currentChannelInfo.color === "secondary" ? "primary" : currentChannelInfo.color}
                size="medium"
                startIcon={<i className="tabler-cloud-upload" style={{ fontSize: 20 }} />}
                onClick={onOpenUpload}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "0 4px 14px 0 rgba(115, 103, 240, 0.38)",
                  px: 3,
                }}
              >
                Đăng lên {currentChannelInfo.tabLabel}
              </Button>
            </Box>
          )}
        </Box>

        {/* Filter & Search Bar */}
        <Grid container spacing={2} alignItems="center">
          {/* 1. Search Input */}
          <Grid size={{ xs: 12, md: 3 }}>
            <CustomTextField
              fullWidth
              size="small"
              placeholder="Tìm theo tên file, người đăng..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <i className="tabler-search text-muted" style={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => onSearchChange("")}>
                      <i className="tabler-x" style={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Grid>

          {/* 2. Từ ngày */}
          <Grid size={{ xs: 6, sm: 6, md: 2 }}>
            <CustomTextField
              type="date"
              size="small"
              fullWidth
              label="Từ ngày"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              placeholder="dd/mm/yyyy"
              InputProps={{
                endAdornment: startDate ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartDateChange("");
                      }}
                      sx={{ p: 0.25 }}
                    >
                      <i className="tabler-x" style={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Grid>

          {/* 3. Đến ngày */}
          <Grid size={{ xs: 6, sm: 6, md: 2 }}>
            <CustomTextField
              type="date"
              size="small"
              fullWidth
              label="Đến ngày"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              placeholder="dd/mm/yyyy"
              inputProps={{ min: startDate || undefined }}
              InputProps={{
                endAdornment: endDate ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEndDateChange("");
                      }}
                      sx={{ p: 0.25 }}
                    >
                      <i className="tabler-x" style={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Grid>

          {/* 4. Lọc theo chủ đề (Hashtag) */}
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="tag-filter-label">Chủ đề (Hashtag)</InputLabel>
              <Select
                labelId="tag-filter-label"
                value={tagFilter || "all"}
                label="Chủ đề (Hashtag)"
                onChange={(e) => onTagFilterChange(e.target.value)}
                renderValue={(selected) => {
                  if (!selected || selected === "all") {
                    return (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                        <i className="tabler-hash" style={{ fontSize: 16 }} />
                        <span>Tất cả chủ đề</span>
                      </Box>
                    );
                  }
                  const displayTag = selected.startsWith("#") ? selected.slice(1) : selected;
                  return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "primary.main", fontWeight: 600 }}>
                      <i className="tabler-hash" style={{ fontSize: 16 }} />
                      <span>{displayTag}</span>
                    </Box>
                  );
                }}
                endAdornment={
                  tagFilter && tagFilter !== "all" ? (
                    <InputAdornment position="end" sx={{ mr: 2 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTagFilterChange("all");
                        }}
                        sx={{ p: 0.25 }}
                      >
                        <i className="tabler-x" style={{ fontSize: 14 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              >
                <MenuItem value="all">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <i className="tabler-apps" style={{ fontSize: 18 }} />
                    <span>Tất cả chủ đề</span>
                  </Box>
                </MenuItem>
                {availableTags.map((item) => {
                  const tagName = typeof item === "string" ? item : item.tag;
                  const count = typeof item === "object" ? item.count : undefined;
                  const cleanName = tagName.startsWith("#") ? tagName.slice(1) : tagName;
                  return (
                    <MenuItem key={tagName} value={tagName}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          gap: 1.5,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <i className="tabler-hash text-primary" style={{ fontSize: 16 }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {cleanName}
                          </Typography>
                        </Box>
                        {typeof count === "number" && (
                          <Chip
                            label={count}
                            size="small"
                            sx={{
                              height: 20,
                              minWidth: 24,
                              fontSize: "0.72rem",
                              bgcolor: count > 0 ? "rgba(115, 103, 240, 0.1)" : "action.hover",
                              color: count > 0 ? "primary.main" : "text.secondary",
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>

          {/* 5. Người tải lên (Lọc theo danh sách nhân sự, có ô tìm tên ở trên) */}
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="uploader-filter-label">Người tải lên</InputLabel>
              <Select
                labelId="uploader-filter-label"
                value={uploaderFilter || "all"}
                label="Người tải lên"
                onChange={(e) => onUploaderFilterChange(e.target.value)}
                onClose={() => setSearchStaffText("")}
                renderValue={(selected) => {
                  if (!selected || selected === "all") {
                    return (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                        <i className="tabler-users" style={{ fontSize: 18 }} />
                        <span>Tất cả thành viên</span>
                      </Box>
                    );
                  }
                  return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar src={selectedStaff?.avatar} sx={{ width: 22, height: 22, fontSize: 12 }}>
                        {selectedStaff?.name?.[0] || selected[0]}
                      </Avatar>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                        {selectedStaff?.name || selected}
                      </Typography>
                    </Box>
                  );
                }}
                endAdornment={
                  uploaderFilter && uploaderFilter !== "all" ? (
                    <InputAdornment position="end" sx={{ mr: 2 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUploaderFilterChange("all");
                        }}
                        sx={{ p: 0.25 }}
                      >
                        <i className="tabler-x" style={{ fontSize: 14 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
                MenuProps={{
                  autoFocus: false,
                  PaperProps: {
                    sx: {
                      maxHeight: 380,
                      width: 280,
                    },
                  },
                }}
              >
                {/* Phần tìm tên nhân sự ở trên cùng menu */}
                <Box
                  sx={{
                    p: 1.5,
                    pb: 1,
                    position: "sticky",
                    top: 0,
                    bgcolor: "background.paper",
                    zIndex: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CustomTextField
                    size="small"
                    fullWidth
                    autoFocus
                    placeholder="Tìm tên nhân sự..."
                    value={searchStaffText}
                    onChange={(e) => setSearchStaffText(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <i className="tabler-search text-muted" style={{ fontSize: 16 }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchStaffText ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchStaffText("");
                            }}
                          >
                            <i className="tabler-x" style={{ fontSize: 14 }} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                  />
                </Box>

                <MenuItem value="all">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <i className="tabler-users" style={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Tất cả thành viên
                    </Typography>
                  </Box>
                </MenuItem>

                {filteredStaffList.length === 0 ? (
                  <Box sx={{ py: 2, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      Không tìm thấy nhân sự
                    </Typography>
                  </Box>
                ) : (
                  filteredStaffList.map((user) => (
                    <MenuItem key={user.id || user.name} value={user.name}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%", py: 0.25 }}>
                        <Avatar src={user.avatar} sx={{ width: 28, height: 28, fontSize: 13 }}>
                          {user.name?.[0]}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                            {user.name}
                          </Typography>
                          {(user.department || user.code) && (
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: "0.72rem" }}>
                              {user.department || "Xbus"} {user.code ? `• ${user.code}` : ""}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* Bottom Bar: Sorting, Clear Filters & View Mode Switcher */}
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pt: 1,
                borderTop: "1px dashed",
                borderColor: "divider",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <i className="tabler-arrows-sort" /> Sắp xếp theo:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 170 }}>
                  <Select
                    value={sortOption}
                    onChange={(e) => onSortOptionChange(e.target.value)}
                    sx={{ height: 34, fontSize: "0.875rem" }}
                  >
                    <MenuItem value="newest">Mới nhất trước</MenuItem>
                    <MenuItem value="oldest">Cũ nhất trước</MenuItem>
                    <MenuItem value="likes_desc">Nhiều lượt tim nhất</MenuItem>
                    <MenuItem value="comments_desc">Nhiều bình luận nhất</MenuItem>
                  </Select>
                </FormControl>

                {hasActiveFilters && (
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    startIcon={<i className="tabler-filter-x" style={{ fontSize: 16 }} />}
                    onClick={onResetFilters}
                    sx={{
                      textTransform: "none",
                      fontSize: "0.8125rem",
                      py: 0.5,
                      px: 1.5,
                      borderRadius: 1,
                      bgcolor: "rgba(234, 84, 85, 0.08)",
                      "&:hover": { bgcolor: "rgba(234, 84, 85, 0.16)" },
                    }}
                  >
                    Xóa tất cả bộ lọc
                  </Button>
                )}
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                  Chế độ xem:
                </Typography>
                <Tooltip title="Dạng lưới (Grid View)">
                  <IconButton
                    size="small"
                    color={viewMode === "grid" ? "primary" : "default"}
                    onClick={() => onViewModeChange("grid")}
                    sx={{
                      bgcolor: viewMode === "grid" ? "rgba(115, 103, 240, 0.12)" : "transparent",
                      border: "1px solid",
                      borderColor: viewMode === "grid" ? "primary.main" : "divider",
                    }}
                  >
                    <i className="tabler-layout-grid" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Dạng danh sách (List View)">
                  <IconButton
                    size="small"
                    color={viewMode === "list" ? "primary" : "default"}
                    onClick={() => onViewModeChange("list")}
                    sx={{
                      bgcolor: viewMode === "list" ? "rgba(115, 103, 240, 0.12)" : "transparent",
                      border: "1px solid",
                      borderColor: viewMode === "list" ? "primary.main" : "divider",
                    }}
                  >
                    <i className="tabler-list" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
