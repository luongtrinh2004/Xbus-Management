"use client";

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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CustomTextField from "@core/components/mui/TextField";
import CustomAvatar from "@core/components/mui/Avatar";
import Avatar from "@mui/material/Avatar";

export default function MediaToolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  timeFilter,
  onTimeFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  uploaderFilter,
  onUploaderFilterChange,
  sortOption,
  onSortOptionChange,
  viewMode,
  onViewModeChange,
  onOpenUpload,
  uploaderOptions = [],
  counts = { all: 0, image: 0, video: 0 },
}) {
  return (
    <Card sx={{ mb: 6 }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
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
              <CustomAvatar variant="rounded" skin="light" color="primary" sx={{ width: 44, height: 44 }}>
                <i className="tabler-photo-video text-2xl" />
              </CustomAvatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Thư Viện Ảnh & Video
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Kho tư liệu hình ảnh và video sự kiện, dự án xe tự hành Xbus
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              color="primary"
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
              Tải lên Media
            </Button>
          </Box>
        </Box>

        {/* Filter & Search Bar */}
        <Grid container spacing={2.5} alignItems="center">
          {/* Search Input */}
          <Grid size={{ xs: 12, md: 4 }}>
            <CustomTextField
              fullWidth
              size="small"
              placeholder="Tìm theo tên file, người đăng, #hashtag..."
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

          {/* Quick Format Filter (Tabs/Buttons) */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ToggleButtonGroup
              value={typeFilter}
              exclusive
              onChange={(_, val) => val && onTypeFilterChange(val)}
              size="small"
              fullWidth
              sx={{
                height: 40,
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  py: 1,
                  display: "flex",
                  gap: 1,
                },
              }}
            >
              <ToggleButton value="all">
                <span>Tất cả</span>
                <Chip
                  label={counts.all}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.75rem",
                    bgcolor: typeFilter === "all" ? "primary.main" : "action.hover",
                    color: typeFilter === "all" ? "#fff" : "text.secondary",
                  }}
                />
              </ToggleButton>
              <ToggleButton value="image">
                <i className="tabler-photo text-base" />
                <span>Ảnh</span>
                <Chip
                  label={counts.image}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.75rem",
                    bgcolor: typeFilter === "image" ? "primary.main" : "action.hover",
                    color: typeFilter === "image" ? "#fff" : "text.secondary",
                  }}
                />
              </ToggleButton>
              <ToggleButton value="video">
                <i className="tabler-video text-base" />
                <span>Video</span>
                <Chip
                  label={counts.video}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.75rem",
                    bgcolor: typeFilter === "video" ? "primary.main" : "action.hover",
                    color: typeFilter === "video" ? "#fff" : "text.secondary",
                  }}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Time Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="time-filter-label">Thời gian</InputLabel>
              <Select
                labelId="time-filter-label"
                value={timeFilter}
                label="Thời gian"
                onChange={(e) => onTimeFilterChange(e.target.value)}
              >
                <MenuItem value="all">Tất cả thời gian</MenuItem>
                <MenuItem value="today">Hôm nay</MenuItem>
                <MenuItem value="this_week">Tuần này</MenuItem>
                <MenuItem value="this_month">Tháng này</MenuItem>
                <MenuItem value="custom">Tùy chỉnh ngày</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Uploader Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="uploader-filter-label">Người tải lên</InputLabel>
              <Select
                labelId="uploader-filter-label"
                value={uploaderFilter}
                label="Người tải lên"
                onChange={(e) => onUploaderFilterChange(e.target.value)}
              >
                <MenuItem value="all">Tất cả thành viên</MenuItem>
                {uploaderOptions.map((user) => (
                  <MenuItem key={user.id || user.name} value={user.name}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar src={user.avatar} sx={{ width: 22, height: 22, fontSize: 12 }}>
                        {user.name?.[0]}
                      </Avatar>
                      <Typography variant="body2" noWrap>
                        {user.name}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Custom Date Range when selected */}
          {timeFilter === "custom" && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  bgcolor: "action.hover",
                  borderRadius: 1.5,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Khoảng ngày:
                </Typography>
                <CustomTextField
                  type="date"
                  size="small"
                  label="Từ ngày"
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                />
                <Typography variant="body2">-</Typography>
                <CustomTextField
                  type="date"
                  size="small"
                  label="Đến ngày"
                  InputLabelProps={{ shrink: true }}
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                />
              </Box>
            </Grid>
          )}

          {/* Bottom Bar: Sorting & View Mode Switcher */}
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
                    <MenuItem value="size_desc">Dung lượng lớn nhất</MenuItem>
                    <MenuItem value="size_asc">Dung lượng nhỏ nhất</MenuItem>
                  </Select>
                </FormControl>
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
