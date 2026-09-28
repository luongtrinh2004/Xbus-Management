"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Chip from "@mui/material/Chip";
import CustomTextField from "@core/components/mui/TextField";
import { toast } from "react-toastify";
import ConfirmDialog from "@components/ConfirmDialog";

// Local gallery components & mock data
import { INITIAL_MEDIA_LIST, POPULAR_TAGS } from "./components/mockData";
import MediaToolbar from "./components/MediaToolbar";
import MediaCard from "./components/MediaCard";
import MediaListView from "./components/MediaListView";
import UploadModal from "./components/UploadModal";
import MediaLightbox from "./components/MediaLightbox";
import BatchActionBar from "./components/BatchActionBar";

export default function GalleryPage() {
  const { data: session } = useSession();

  // Media list state
  const [mediaList, setMediaList] = useState(INITIAL_MEDIA_LIST);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'image' | 'video'
  const [timeFilter, setTimeFilter] = useState("all"); // 'all' | 'today' | 'this_week' | 'this_month' | 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploaderFilter, setUploaderFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

  // Batch selection states
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState(null);

  // Delete confirm dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Batch tag dialog
  const [batchTagModalOpen, setBatchTagModalOpen] = useState(false);
  const [batchTagsSelected, setBatchTagsSelected] = useState([]);
  const [customBatchTag, setCustomBatchTag] = useState("");

  // Users for uploader dropdown
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    const DEPARTMENT_NAMES = {
      ap: "AP",
      web_app: "Web App",
      van_hanh: "Vận Hành",
      quan_ly_du_an: "Quản Lý Dự Án",
      mua_sam: "Mua Sắm",
    };

    fetch("/api/users?limit=200")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.users)) {
          setUsersList(
            data.users
              .filter((u) => u.status === "able")
              .map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                code: u.code,
                role:
                  u.role === "admin"
                    ? "Quản Lý Dự Án"
                    : u.role === "assistant"
                      ? "Trợ lý Văn phòng"
                      : "Kỹ sư",
                department: DEPARTMENT_NAMES[u.typeId] || u.typeId || "Xbus",
                avatar:
                  u.avatarUrl ||
                  (u.gender === "female"
                    ? "/images/avatars/female-user.png"
                    : u.role === "admin"
                      ? "/images/avatars/male-admin.png"
                      : "/images/avatars/male-user.png"),
              }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Compute available uploader options (combining actual authors in media + fetched users)
  const uploaderOptions = useMemo(() => {
    const map = new Map();
    mediaList.forEach((item) => {
      if (item.uploader && item.uploader.name) {
        map.set(item.uploader.name, item.uploader);
      }
    });
    usersList.forEach((user) => {
      if (!map.has(user.name)) {
        map.set(user.name, user);
      }
    });
    return Array.from(map.values());
  }, [mediaList, usersList]);

  // Counts for format toggle buttons
  const counts = useMemo(() => {
    return {
      all: mediaList.length,
      image: mediaList.filter((item) => item.type === "image").length,
      video: mediaList.filter((item) => item.type === "video").length,
    };
  }, [mediaList]);

  // Filtered and Sorted media list
  const filteredMediaList = useMemo(() => {
    return mediaList
      .filter((item) => {
        // 1. Search Query filter (title, filename, uploader name, tags)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchFileName = item.fileName?.toLowerCase().includes(q);
          const matchUploader = item.uploader?.name?.toLowerCase().includes(q);
          const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchFileName && !matchUploader && !matchTags) {
            return false;
          }
        }

        // 2. Type format filter
        if (typeFilter !== "all" && item.type !== typeFilter) {
          return false;
        }

        // 3. Time filter
        if (timeFilter !== "all") {
          const itemDate = new Date(item.uploadedAt);
          const now = new Date();

          if (timeFilter === "today") {
            const isToday =
              itemDate.getDate() === now.getDate() &&
              itemDate.getMonth() === now.getMonth() &&
              itemDate.getFullYear() === now.getFullYear();
            if (!isToday) return false;
          } else if (timeFilter === "this_week") {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            if (itemDate < oneWeekAgo) return false;
          } else if (timeFilter === "this_month") {
            const isThisMonth =
              itemDate.getMonth() === now.getMonth() &&
              itemDate.getFullYear() === now.getFullYear();
            if (!isThisMonth) return false;
          } else if (timeFilter === "custom") {
            if (startDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              if (itemDate < start) return false;
            }
            if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              if (itemDate > end) return false;
            }
          }
        }

        // 4. Uploader filter
        if (uploaderFilter !== "all") {
          if (item.uploader?.name !== uploaderFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sorting logic
        if (sortOption === "newest") {
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        }
        if (sortOption === "oldest") {
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        }
        if (sortOption === "name_asc") {
          return (a.title || a.fileName).localeCompare(b.title || b.fileName, "vi");
        }
        if (sortOption === "name_desc") {
          return (b.title || b.fileName).localeCompare(a.title || a.fileName, "vi");
        }
        if (sortOption === "size_desc") {
          return (b.fileSize || 0) - (a.fileSize || 0);
        }
        if (sortOption === "size_asc") {
          return (a.fileSize || 0) - (b.fileSize || 0);
        }
        return 0;
      });
  }, [mediaList, searchQuery, typeFilter, timeFilter, startDate, endDate, uploaderFilter, sortOption]);

  // Active item in lightbox
  const currentLightboxIndex = useMemo(() => {
    if (!activeMediaId) return 0;
    const idx = filteredMediaList.findIndex((item) => item.id === activeMediaId);
    return idx >= 0 ? idx : 0;
  }, [activeMediaId, filteredMediaList]);

  const activeMediaItem = filteredMediaList[currentLightboxIndex] || null;

  // Multi-selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMediaList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMediaList.map((item) => item.id));
    }
  };

  const handleToggleBatchMode = () => {
    setIsBatchMode((prev) => {
      if (prev) setSelectedIds([]);
      return !prev;
    });
  };

  // Open Lightbox
  const handleOpenLightbox = (item) => {
    setActiveMediaId(item.id);
    setLightboxOpen(true);
  };

  // Download simulation
  const handleDownload = (item) => {
    toast.info(`Bắt đầu tải xuống: ${item.fileName}`);
    const link = document.createElement("a");
    link.href = item.url;
    link.download = item.fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch download simulation
  const handleBatchDownload = () => {
    toast.success(`Đang nén và chuẩn bị tải xuống ${selectedIds.length} tệp tin (.zip)...`);
  };

  // Share link
  const handleShare = (item) => {
    const shareUrl = `${window.location.origin}/gallery?id=${item.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("Đã sao chép liên kết chia sẻ vào clipboard!");
      });
    } else {
      toast.success(`Liên kết: ${shareUrl}`);
    }
  };

  // Delete single file
  const handleDeleteRequest = (item) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  // Delete batch files
  const handleBatchDeleteRequest = () => {
    setItemToDelete("batch");
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete === "batch") {
      setMediaList((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      toast.success(`Đã xóa thành công ${selectedIds.length} tệp!`);
      setSelectedIds([]);
    } else if (itemToDelete) {
      setMediaList((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id));
      toast.success(`Đã xóa tệp: ${itemToDelete.fileName}`);
      if (lightboxOpen && activeMediaId === itemToDelete.id) {
        setLightboxOpen(false);
      }
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  // Social interactions
  const handleToggleLike = (id) => {
    setMediaList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newLiked = !item.isLiked;
          return {
            ...item,
            isLiked: newLiked,
            likes: newLiked ? (item.likes || 0) + 1 : Math.max(0, (item.likes || 0) - 1),
          };
        }
        return item;
      })
    );
  };

  const handleAddComment = (id, newComment) => {
    setMediaList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            comments: [...(item.comments || []), newComment],
          };
        }
        return item;
      })
    );
  };

  // Batch tag assignment
  const handleApplyBatchTags = () => {
    if (batchTagsSelected.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thẻ tag để gắn");
      return;
    }

    setMediaList((prev) =>
      prev.map((item) => {
        if (selectedIds.includes(item.id)) {
          const currentTags = item.tags || [];
          const combined = Array.from(new Set([...currentTags, ...batchTagsSelected]));
          return { ...item, tags: combined };
        }
        return item;
      })
    );

    toast.success(`Đã gắn thẻ cho ${selectedIds.length} tệp thành công!`);
    setBatchTagModalOpen(false);
    setBatchTagsSelected([]);
    setCustomBatchTag("");
  };

  // Upload handler
  const handleUploadSuccess = (newItems) => {
    setMediaList((prev) => [...newItems, ...prev]);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4, md: 6 } }}>
      {/* 1. Toolbar & Filters */}
      <MediaToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        uploaderFilter={uploaderFilter}
        onUploaderFilterChange={setUploaderFilter}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isBatchMode={isBatchMode}
        onToggleBatchMode={handleToggleBatchMode}
        onOpenUpload={() => setIsUploadOpen(true)}
        uploaderOptions={uploaderOptions}
        counts={counts}
      />

      {/* Main Content: Grid View or List View */}
      {filteredMediaList.length === 0 ? (
        <Box
          sx={{
            py: 8,
            px: 3,
            textAlign: "center",
            bgcolor: "background.paper",
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
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
            <i className="tabler-photo-off" style={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Không tìm thấy ảnh hoặc video nào
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Thử thay đổi từ khóa tìm kiếm hoặc làm mới bộ lọc ngày/định dạng.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("all");
              setTimeFilter("all");
              setUploaderFilter("all");
            }}
          >
            Xóa toàn bộ bộ lọc
          </Button>
        </Box>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <Grid container spacing={3}>
          {filteredMediaList.map((item) => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <MediaCard
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onToggleSelect={handleToggleSelect}
                isBatchMode={isBatchMode}
                onClick={() => handleOpenLightbox(item)}
                onDownload={handleDownload}
                onShare={handleShare}
                onDelete={handleDeleteRequest}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        /* List View */
        <MediaListView
          items={filteredMediaList}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onItemClick={handleOpenLightbox}
          onDownload={handleDownload}
          onShare={handleShare}
          onDelete={handleDeleteRequest}
        />
      )}

      {/* 2. Floating Action Bar for Batch Operations */}
      <BatchActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBatchDownload={handleBatchDownload}
        onOpenBatchTag={() => setBatchTagModalOpen(true)}
        onBatchDelete={handleBatchDeleteRequest}
      />

      {/* 3. Upload Modal */}
      <UploadModal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        currentUser={session?.user}
        usersList={usersList}
      />

      {/* 4. Lightbox Viewer Modal */}
      <MediaLightbox
        open={lightboxOpen}
        item={activeMediaItem}
        itemsList={filteredMediaList}
        currentIndex={currentLightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => {
          if (filteredMediaList[newIdx]) {
            setActiveMediaId(filteredMediaList[newIdx].id);
          }
        }}
        onToggleLike={handleToggleLike}
        onAddComment={handleAddComment}
        onDownload={handleDownload}
        onShare={handleShare}
        currentUser={session?.user}
        usersList={usersList}
      />

      {/* 5. Batch Tag Modal */}
      <Dialog
        open={batchTagModalOpen}
        onClose={() => setBatchTagModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Gắn thẻ hàng loạt</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Chọn thẻ gắn đồng thời cho <strong>{selectedIds.length}</strong> tệp đang chọn:
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {POPULAR_TAGS.map((tag) => {
              const isSelected = batchTagsSelected.includes(tag);
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onClick={() => {
                    setBatchTagsSelected((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    );
                  }}
                  color={isSelected ? "primary" : "default"}
                  variant={isSelected ? "filled" : "outlined"}
                  sx={{ cursor: "pointer", fontWeight: isSelected ? 600 : 400 }}
                />
              );
            })}
          </Box>

          <CustomTextField
            size="small"
            fullWidth
            placeholder="Nhập hashtag mới và nhấn Enter..."
            value={customBatchTag}
            onChange={(e) => setCustomBatchTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customBatchTag.trim()) {
                e.preventDefault();
                let tag = customBatchTag.trim();
                if (!tag.startsWith("#")) tag = `#${tag}`;
                if (!batchTagsSelected.includes(tag)) {
                  setBatchTagsSelected((prev) => [...prev, tag]);
                }
                setCustomBatchTag("");
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="tonal" color="secondary" onClick={() => setBatchTagModalOpen(false)}>
            Hủy
          </Button>
          <Button variant="contained" color="primary" onClick={handleApplyBatchTags}>
            Áp dụng thẻ
          </Button>
        </DialogActions>
      </Dialog>

      {/* 6. Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={itemToDelete === "batch" ? "Xác nhận xóa nhiều tệp" : "Xác nhận xóa tệp"}
        message={
          itemToDelete === "batch"
            ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} tệp đã chọn? Hành động này không thể hoàn tác.`
            : `Bạn có chắc chắn muốn xóa tệp "${itemToDelete?.fileName}"?`
        }
        confirmText="Xóa vĩnh viễn"
        confirmColor="error"
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
}
