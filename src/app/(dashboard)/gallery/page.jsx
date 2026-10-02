"use client";
import { trackGalleryActivity } from "@/libs/galleryActivity";

import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import CustomTextField from "@core/components/mui/TextField";
import { toast } from "react-toastify";
import ConfirmDialog from "@components/ConfirmDialog";

// Local gallery components
import { POPULAR_TAGS } from "./components/constants";
import MediaToolbar from "./components/MediaToolbar";
import StorageOverviewCard from "./components/StorageOverviewCard";
import MediaCard from "./components/MediaCard";
import MediaListView from "./components/MediaListView";
import UploadModal from "./components/UploadModal";
import MediaLightbox from "./components/MediaLightbox";
import BatchActionBar from "./components/BatchActionBar";
import EditPostModal from "./components/EditPostModal";
import ManagePostsModal from "./components/ManagePostsModal";

function GalleryContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // Role permissions: Only admin and assistant can see storage management
  const userRole = session?.user?.role || "user";
  const isAdminOrAssistant = ["admin", "assistant"].includes(userRole);

  // Media list & Storage state from real API
  const [mediaList, setMediaList] = useState([]);
  const [storageStats, setStorageStats] = useState({
    maxBytes: 20 * 1024 * 1024 * 1024,
    usedBytes: 0,
    imageBytes: 0,
    videoBytes: 0,
    remainingBytes: 20 * 1024 * 1024 * 1024,
    percentUsed: 0,
    totalFiles: 0,
    imageCount: 0,
    videoCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'image' | 'video'
  const [timeFilter, setTimeFilter] = useState("all"); // 'all' | 'today' | 'this_week' | 'this_month' | 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploaderFilter, setUploaderFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [isFilterLargest, setIsFilterLargest] = useState(false);

  // Batch selection states
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState(null);

  // Edit post modal
  const [editPostModalOpen, setEditPostModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);

  // Manage posts dialog (Admin/Assistant)
  const [managePostsOpen, setManagePostsOpen] = useState(false);

  // Delete confirm dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Batch tag dialog
  const [batchTagModalOpen, setBatchTagModalOpen] = useState(false);
  const [batchTagsSelected, setBatchTagsSelected] = useState([]);
  const [customBatchTag, setCustomBatchTag] = useState("");

  // Users for uploader dropdown
  const [usersList, setUsersList] = useState([]);

  // Fetch real users from /api/users
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
        const rawUsers = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data)
              ? data
              : [];

        if (rawUsers.length > 0) {
          setUsersList(
            rawUsers
              .filter((u) => u.status === "able" || !u.status)
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

  // Fetch real gallery data from API
  const fetchGalleryData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (timeFilter !== "all") params.set("time", timeFilter);
      if (uploaderFilter !== "all") params.set("uploader", uploaderFilter);
      if (sortOption) params.set("sort", isFilterLargest ? "size_desc" : sortOption);
      if (isFilterLargest) params.set("largestOnly", "true");

      const res = await fetch(`/api/gallery?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMediaList(previous => (data.items || []).map(post => {
          const local = previous.find(item => item.id === post.id)?.uploadState;
          if (!local || !post.uploadState || post.uploadState.state === "completed") return post;
          const sessions = post.uploadState.sessions.map(session => {
            const before = local.sessions?.find(item => item.sessionId === session.sessionId);
            return before && ["uploading", "processing"].includes(session.state)
              ? { ...session, progress: Math.max(session.progress, before.progress || 0),
                uploadedBytes: Math.max(session.uploadedBytes || 0, before.uploadedBytes || 0),
                bytesPerSecond: session.state === "uploading" && Date.now() - (before.measuredAt || 0) < 10000 ? before.bytesPerSecond || 0 : 0,
                measuredAt: before.measuredAt } : session;
          });
          const size = sessions.reduce((sum, session) => sum + session.size, 0);
          return { ...post, uploadState: { ...post.uploadState, sessions,
            progress: size ? Math.round(sessions.reduce((sum, session) => sum + session.size * session.progress, 0) / size) : 0 } };
        }));
        if (data.storage) {
          setStorageStats(data.storage);
        }
      }
    } catch (err) {
      console.error("[fetchGalleryData] Lỗi:", err);
      toast.error("Không thể tải danh sách thư viện");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [searchQuery, typeFilter, timeFilter, uploaderFilter, sortOption, isFilterLargest]);

  useEffect(() => {
    fetchGalleryData();
  }, [fetchGalleryData]);

  // Handle auto-open post from notification link: /gallery?open=postId (only once on load)
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    const openParam = searchParams.get("open") || searchParams.get("id");
    if (openParam && mediaList.length > 0 && !hasAutoOpenedRef.current) {
      const target = mediaList.find((i) => i.id === openParam || i.postId === openParam);
      if (target) {
        hasAutoOpenedRef.current = true;
        setActiveMediaId(target.id);
        setLightboxOpen(true);
      }
    }
  }, [searchParams, mediaList]);

  const hasPendingUploads = mediaList.some(post => post.uploadState?.sessions?.some(s => ["uploading", "processing"].includes(s.state)));
  // Refresh completed MinIO objects even while other files in a post are processing.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") fetchGalleryData(true); };
    const timer = setInterval(refresh, hasPendingUploads ? 2000 : 5000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [fetchGalleryData, hasPendingUploads]);

  useEffect(() => {
    const progress = event => {
      const { postId, sessionId, progress, state, error, uploadedBytes, totalBytes, bytesPerSecond, measuredAt } = event.detail;
      setMediaList(previous => previous.map(post => {
        if (post.id !== postId) return post;
        const sessions = (post.uploadState?.sessions || post.uploadSessions || []).map(session =>
          session.sessionId === sessionId ? { ...session, progress, state, error, uploadedBytes, totalBytes, bytesPerSecond, measuredAt } : session);
        const size = sessions.reduce((n,s) => n+s.size,0);
        return { ...post, uploadState: { sessions, state: sessions.some(s=>s.state==="failed") ? "failed" : "uploading",
          progress: size ? Math.round(sessions.reduce((n,s)=>n+s.size*(s.progress||0),0)/size) : 0 } };
      }));
    };
    window.addEventListener("gallery-upload-progress", progress);
    return () => window.removeEventListener("gallery-upload-progress", progress);
  }, []);

  // Active item for Lightbox
  const activeMediaItem = useMemo(() => {
    if (!activeMediaId) return null;
    return (
      mediaList.find(
        (m) => m.id === activeMediaId || (m.postId && m.postId === activeMediaId)
      ) || null
    );
  }, [activeMediaId, mediaList]);

  const currentLightboxIndex = useMemo(() => {
    if (!activeMediaId) return 0;
    const idx = mediaList.findIndex(
      (m) => m.id === activeMediaId || (m.postId && m.postId === activeMediaId)
    );
    return idx >= 0 ? idx : 0;
  }, [activeMediaId, mediaList]);

  // Dynamic counts for Toolbar chips
  const counts = useMemo(() => {
    const total = mediaList.length;
    const images = mediaList.filter((m) => m.type === "image" || m.hasImage).length;
    const videos = mediaList.filter((m) => m.type === "video" || m.hasVideo).length;
    return { all: total, image: images, video: videos };
  }, [mediaList]);

  // Dynamic Uploader options
  const uploaderOptions = useMemo(() => {
    const map = new Map();
    mediaList.forEach((item) => {
      if (item.uploader?.id && !map.has(item.uploader.id)) {
        map.set(item.uploader.id, {
          id: item.uploader.id,
          name: item.uploader.name,
          avatar: item.uploader.avatar,
        });
      }
    });
    return Array.from(map.values());
  }, [mediaList]);

  // Batch actions
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === mediaList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(mediaList.map((m) => m.id));
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

  // Download single file
  const handleDownload = (item) => {
    const parent = mediaList.find(post => post.id === item.id || post.files?.some(file => file.id === item.id));
    trackGalleryActivity(parent?.id || item.postId || item.id, "DOWNLOAD_GALLERY_MEDIA", item.id);
    toast.info(`Bắt đầu tải xuống: ${item.fileName || item.title || "tệp tin"}`);
    const link = document.createElement("a");
    link.href = item.url;
    link.download = item.fileName || "xbus-media";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch download
  const handleBatchDownload = () => {
    mediaList.filter(item => selectedIds.includes(item.id)).forEach(item => {
      const files = item.files?.length ? item.files : [item];
      files.forEach(handleDownload);
    });
  };

  // Share link
  const handleShare = (item) => {
    const shareUrl = `${window.location.origin}/gallery?open=${item.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        trackGalleryActivity(item.id, "SHARE_GALLERY_POST");
        toast.success("Đã sao chép liên kết chia sẻ vào bộ nhớ tạm!");
      });
    } else {
      toast.success(`Liên kết: ${shareUrl}`);
    }
  };

  // Delete single file/post
  const handleDeleteRequest = (item) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  // Delete batch files
  const handleBatchDeleteRequest = () => {
    setItemToDelete("batch");
    setDeleteConfirmOpen(true);
  };

  // Confirm delete handler (real API)
  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      if (itemToDelete === "batch") {
        const res = await fetch("/api/gallery/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", ids: selectedIds }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Đã xóa thành công ${selectedIds.length} bài đăng!`);
          setSelectedIds([]);
          if (data.storage) setStorageStats(data.storage);
          fetchGalleryData();
        } else {
          toast.error(data.error || "Lỗi xóa bài đăng");
        }
      } else if (itemToDelete) {
        const res = await fetch(`/api/gallery/${itemToDelete.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Đã xóa bài đăng: ${itemToDelete.title || "thành công"}`);
          if (data.storage) setStorageStats(data.storage);
          if (lightboxOpen && activeMediaId === itemToDelete.id) {
            setLightboxOpen(false);
          }
          fetchGalleryData();
        } else {
          toast.error(data.error || "Lỗi xóa bài đăng");
        }
      }
    } catch (err) {
      console.error("[handleConfirmDelete] Lỗi:", err);
      toast.error("Không thể xóa bài đăng");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  // Social interactions (Real API with optimistic state)
  const handleToggleLike = async (id) => {
    // Optimistic update
    setMediaList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextLiked = !item.isLiked;
          const nextCount = Math.max(0, (item.likes || 0) + (nextLiked ? 1 : -1));
          return { ...item, isLiked: nextLiked, likes: nextCount };
        }
        return item;
      })
    );

    try {
      const res = await fetch(`/api/gallery/${id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMediaList((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isLiked: data.isLiked, likes: data.likes } : item
          )
        );
      }
    } catch (err) {
      console.error("[handleToggleLike] Lỗi:", err);
      fetchGalleryData(); // rollback if error
    }
  };

  const handleAddComment = async (id, newComment) => {
    try {
      const res = await fetch(`/api/gallery/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.content,
          taggedUserIds: newComment.taggedUserIds,
          isTagAll: newComment.isTagAll,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMediaList((prev) =>
          prev.map((item) => {
            const isMatch =
              item.id === id ||
              (item.postId && activeMediaItem?.postId && item.postId === activeMediaItem.postId);
            return isMatch
              ? { ...item, comments: [...(item.comments || []), data.comment] }
              : item;
          })
        );
      }
    } catch (err) {
      console.error("[handleAddComment] Lỗi:", err);
    }
  };

  const handleEditComment = (id, commentId, updatedComment) => {
    setMediaList((prev) =>
      prev.map((item) => {
        const isMatch =
          item.id === id ||
          (item.postId && activeMediaItem?.postId && item.postId === activeMediaItem.postId);
        if (!isMatch) return item;
        return {
          ...item,
          comments: (item.comments || []).map((c) =>
            c.id === commentId ? updatedComment : c
          ),
        };
      })
    );
  };

  const handleDeleteComment = (id, commentId) => {
    setMediaList((prev) =>
      prev.map((item) => {
        const isMatch =
          item.id === id ||
          (item.postId && activeMediaItem?.postId && item.postId === activeMediaItem.postId);
        if (!isMatch) return item;
        return {
          ...item,
          comments: (item.comments || []).filter((c) => c.id !== commentId),
        };
      })
    );
  };

  // Batch tag assignment (Real API)
  const handleApplyBatchTags = async () => {
    if (batchTagsSelected.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 thẻ tag để gắn");
      return;
    }

    try {
      const res = await fetch("/api/gallery/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tag",
          ids: selectedIds,
          tags: batchTagsSelected,
        }),
      });
      if (res.ok) {
        toast.success(`Đã gắn thẻ cho ${selectedIds.length} bài đăng thành công!`);
        setBatchTagModalOpen(false);
        setBatchTagsSelected([]);
        setCustomBatchTag("");
        fetchGalleryData();
      }
    } catch (err) {
      console.error("[handleApplyBatchTags] Lỗi:", err);
      toast.error("Không thể gắn thẻ hàng loạt");
    }
  };

  // Upload handler from UploadModal
  const handleUploadSuccess = (newItems, updatedStorage) => {
    setMediaList((prev) => [...newItems, ...prev]);
    if (updatedStorage) setStorageStats(updatedStorage);
    fetchGalleryData();
  };

  // Edit handler from EditPostModal
  const handleEditSuccess = (updatedItem) => {
    setMediaList((prev) =>
      prev.map((item) =>
        item.id === updatedItem.id || (item.postId && item.postId === updatedItem.postId)
          ? { ...item, ...updatedItem }
          : item
      )
    );
    fetchGalleryData();
  };

  // Toggle filter largest files
  const handleToggleFilterLargest = () => {
    setIsFilterLargest((prev) => {
      const next = !prev;
      if (next) {
        setSortOption("size_desc");
      } else {
        setSortOption("newest");
      }
      return next;
    });
  };

  const isItemOwner = useCallback(
    (item) => {
      if (!session?.user) return false;
      const userId = session.user.id;
      const userEmail = session.user.email?.toLowerCase();
      const uploaderId = item.uploader?.id;
      const uploaderEmail = item.uploader?.email?.toLowerCase();

      return (
        (userId && uploaderId && userId === uploaderId) ||
        (userEmail && uploaderEmail && userEmail === uploaderEmail)
      );
    },
    [session]
  );

  return (
    <Box>
      {/* 1. Storage Overview & 20GB Limit Bar (Chỉ hiển thị cho Quản trị viên & Trợ lý) */}
      {isAdminOrAssistant && (
        <StorageOverviewCard
          storage={storageStats}
          isFilterLargest={isFilterLargest}
          onToggleFilterLargest={handleToggleFilterLargest}
          onOpenManagePosts={() => setManagePostsOpen(true)}
        />
      )}

      {/* 2. Toolbar & Filters */}
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

      {/* 3. Main Content: Grid View or List View */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 12 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : mediaList.length === 0 ? (
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
            <i className="tabler-photo-off text-3xl" />
          </Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Không tìm thấy bài đăng nào
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: "auto", mb: 3 }}>
            {searchQuery || typeFilter !== "all" || timeFilter !== "all" || uploaderFilter !== "all"
              ? "Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem kết quả khác."
              : "Hãy bắt đầu đăng tải ảnh và video kỷ niệm của bạn lên hệ thống."}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<i className="tabler-upload" />}
            onClick={() => setIsUploadOpen(true)}
          >
            Đăng ảnh & video ngay
          </Button>
        </Box>
      ) : viewMode === "grid" ? (
        /* Grid View: Instagram Style Feed Cards */
        <Grid container spacing={3}>
          {mediaList.map((item) => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }} sx={{ display: "flex" }}>
              <MediaCard
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onToggleSelect={handleToggleSelect}
                isBatchMode={isBatchMode}
                onClick={() => handleOpenLightbox(item)}
                onDownload={handleDownload}
                onShare={handleShare}
                onDelete={handleDeleteRequest}
                onEdit={(post) => {
                  setPostToEdit(post);
                  setEditPostModalOpen(true);
                }}
                onToggleLike={handleToggleLike}
                canEdit={isAdminOrAssistant || isItemOwner(item)}
                canDelete={isAdminOrAssistant || isItemOwner(item)}
                usersList={usersList}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        /* List View */
        <MediaListView
          items={mediaList}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onItemClick={handleOpenLightbox}
          onDownload={handleDownload}
          onShare={handleShare}
          onDelete={handleDeleteRequest}
          onEdit={(post) => {
            setPostToEdit(post);
            setEditPostModalOpen(true);
          }}
          currentUser={session?.user}
          isAdminOrAssistant={isAdminOrAssistant}
          usersList={usersList}
        />
      )}

      {/* 4. Batch Floating Action Bar */}
      <BatchActionBar
        open={isBatchMode && selectedIds.length > 0}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBatchDelete={handleBatchDeleteRequest}
      />

      {/* 5. Upload Modal */}
      <UploadModal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        currentUser={session?.user}
        usersList={usersList}
      />

      {/* 6. Lightbox Viewer Modal */}
      <MediaLightbox
        open={lightboxOpen}
        item={activeMediaItem}
        itemsList={mediaList}
        currentIndex={currentLightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => {
          if (mediaList[newIdx]) {
            setActiveMediaId(mediaList[newIdx].id);
          }
        }}
        onToggleLike={handleToggleLike}
        onAddComment={handleAddComment}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
        onDownload={handleDownload}
        onShare={handleShare}
        currentUser={session?.user}
        usersList={usersList}
      />

      {/* 7. Edit Post Modal */}
      <EditPostModal
        open={editPostModalOpen}
        onClose={() => {
          setEditPostModalOpen(false);
          setPostToEdit(null);
        }}
        post={postToEdit}
        usersList={usersList}
        onSaveSuccess={handleEditSuccess}
      />

      {/* 8. Manage Posts Modal (Admin / Assistant) */}
      <ManagePostsModal
        open={managePostsOpen}
        onClose={() => setManagePostsOpen(false)}
        posts={mediaList}
        onEditPost={(post) => {
          setPostToEdit(post);
          setEditPostModalOpen(true);
        }}
        onDeletePost={(post) => handleDeleteRequest(post)}
      />

      {/* 9. Batch Tag Modal */}
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
            Chọn thẻ gắn đồng thời cho <strong>{selectedIds.length}</strong> bài đăng đang chọn:
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

      {/* 10. Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        loading={isDeleting}
        title={itemToDelete === "batch" ? "Xác nhận xóa nhiều bài đăng" : "Xác nhận xóa bài đăng"}
        message={
          itemToDelete === "batch"
            ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} bài đăng đã chọn? Dung lượng bộ nhớ sẽ được giải phóng ngay lập tức.`
            : `Bạn có chắc chắn muốn xóa vĩnh viễn bài đăng "${itemToDelete?.title || "này"}"? Dung lượng bộ nhớ sẽ được giải phóng ngay lập tức.`
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

export default function GalleryPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 12 }}>
        <CircularProgress color="primary" />
      </Box>
    }>
      <GalleryContent />
    </Suspense>
  );
}
