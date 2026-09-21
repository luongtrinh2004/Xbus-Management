"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import TextField from "@core/components/mui/TextField";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Menu from "@mui/material/Menu";
import ListSubheader from "@mui/material/ListSubheader";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { resolveAvatar } from "@/utils/getDefaultAvatar";
import { toast } from "react-toastify";
import ConfirmDialog from "@components/ConfirmDialog";
import {
  formatVietnamDateTime,
  toVietnamDateKey,
  toVietnamDateTimeLocal,
} from "@/libs/dateTime";
import {
  downloadShopOrdersPdf,
  downloadAllShopsPdf,
  downloadFoodItemsPdf,
} from "@/libs/teaPdfHelper";

const FOOD_CATEGORIES = ["Hoa quả", "Đồ chiên rán", "Khác"];
const FOOD_UNITS = ["hộp", "cái", "suất"];
const vietnamDateKey = (value = new Date()) => toVietnamDateKey(value);

export default function AfternoonTeaPage() {
  const { data: session } = useSession();
  const [data, setData] = useState({ menuImageUrl: "", invitations: [] });
  const isAdmin =
    ["admin", "assistant"].includes(session?.user?.role) ||
    data.users?.some(
      (user) =>
        user.email?.toLowerCase() === session?.user?.email?.toLowerCase() &&
        user.role === "admin",
    );
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState("");
  const [menuFile, setMenuFile] = useState(null);
  const [orderDrafts, setOrderDrafts] = useState({});
  const [editingOrders, setEditingOrders] = useState({});
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "Mời trà chiều",
    scheduledAt: "",
    note: "",
  });
  const [happyForm, setHappyForm] = useState({
    title: "Happy Hour",
    scheduledAt: "",
    note: "",
  });

  // State xuất PDF
  const [pdfMenuAnchor, setPdfMenuAnchor] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // State xem menu quán: null = ẩn, "all" = xem full tất cả, shopId = scroll đến quán cụ thể
  const [viewingShopId, setViewingShopId] = useState(null);

  // State quản lý Món ăn kèm
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [editingFoodItem, setEditingFoodItem] = useState(null);
  const [foodCategoryTab, setFoodCategoryTab] = useState("all");
  const [foodForm, setFoodForm] = useState({
    name: "",
    category: "Hoa quả",
    quantity: 1,
    unit: "hộp",
    note: "",
  });
  const [confirmation, setConfirmation] = useState(null);

  const formatInvitationTime = (value) =>
    value ? formatVietnamDateTime(value) : "";

  const load = () =>
    fetch("/api/afternoon-tea")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const create = async (type = "afternoon-tea", payload = form) => {
    await fetch("/api/afternoon-tea", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingId
          ? {
              invitationId: editingId,
              action: "updateInvitation",
              order: payload,
            }
          : { ...payload, type },
      ),
    });
    setForm({ title: "Mời trà chiều", scheduledAt: "", note: "" });
    setHappyForm({ title: "Happy Hour", scheduledAt: "", note: "" });
    setEditingId(null);
    load();
  };

  const saveOrder = async (invitationId, userId, order) => {
    const res = await fetch("/api/afternoon-tea", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, action: "order", userId, order }),
    });
    const result = await res.json();
    if (res.ok) {
      setOrderDrafts((prev) => {
        const next = { ...prev };
        delete next[`${invitationId}:${userId}`];
        return next;
      });
      setEditingOrders((prev) => ({
        ...prev,
        [`${invitationId}:${userId}`]: false,
      }));
      toast.success("Đã lưu món đã chọn");
      load();
    } else {
      toast.error(result.error || "Không thể lưu món đã chọn");
    }
  };

  const uploadMenu = async (invitation) => {
    if (!shop.trim() || !menuFile) return;
    const body = new FormData();
    body.append("invitationId", invitation.id);
    body.append("shop", shop.trim());
    body.append("image", menuFile);
    const response = await fetch("/api/afternoon-tea/menu", {
      method: "POST",
      body,
    });
    if (response.ok) {
      setShop("");
      setMenuFile(null);
      toast.success("Đã tải lên ảnh menu thành công");
      load();
    } else {
      toast.error("Không thể tải lên ảnh menu");
    }
  };

  const removeInvitation = async (id) => {
    const response = await fetch("/api/afternoon-tea", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId: id, action: "deleteInvitation" }),
    });
    if (response.ok) {
      toast.success("Đã xóa lời mời");
      load();
    }
  };

  // --- XUẤT FILE PDF TRỰC TIẾP KHÔNG QUA MÁY IN ---
  const handleDownloadShopPdf = async (invitation, shopName) => {
    try {
      setExportingPdf(true);
      setPdfMenuAnchor(null);
      toast.info(`Đang tạo file PDF cho "${shopName}"...`);
      await downloadShopOrdersPdf({
        invitation,
        shopName,
        orders: invitation.orders || [],
        users: data.users || [],
      });
      toast.success(`Đã tải file PDF cho quán "${shopName}"!`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Lỗi khi tạo file PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadAllShopsPdf = async (invitation) => {
    try {
      setExportingPdf(true);
      setPdfMenuAnchor(null);
      toast.info("Đang tạo file PDF cho tất cả các quán...");
      await downloadAllShopsPdf({
        invitation,
        orders: invitation.orders || [],
        users: data.users || [],
      });
      toast.success("Đã tải xong file PDF riêng cho từng quán!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Lỗi khi tạo file PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadFoodPdf = async (invitation) => {
    try {
      setExportingPdf(true);
      toast.info("Đang tạo file PDF danh sách món ăn kèm...");
      await downloadFoodItemsPdf({
        invitation,
        foodItems: invitation.foodItems || [],
      });
      toast.success("Đã tải file PDF món ăn kèm thành công!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Lỗi khi tạo file PDF món ăn");
    } finally {
      setExportingPdf(false);
    }
  };

  // --- QUẢN LÝ MÓN ĂN KÈM (HOA QUẢ, ĐỒ CHIÊN RÁN, KHÁC) ---
  const handleOpenAddFoodModal = () => {
    setEditingFoodItem(null);
    setFoodForm({
      name: "",
      category: "Hoa quả",
      quantity: 1,
      unit: "hộp",
      note: "",
    });
    setFoodModalOpen(true);
  };

  const handleOpenEditFoodModal = (item) => {
    setEditingFoodItem(item);
    setFoodForm({
      name: item.name,
      category: item.category || "Hoa quả",
      quantity: item.quantity || 1,
      unit: item.unit || "hộp",
      note: item.note || "",
    });
    setFoodModalOpen(true);
  };

  const handleSaveFoodItem = async (invitationId) => {
    if (!foodForm.name.trim()) {
      toast.error("Vui lòng nhập tên món ăn");
      return;
    }
    const action = editingFoodItem ? "updateFoodItem" : "addFoodItem";
    const payload = {
      invitationId,
      action,
      foodItemId: editingFoodItem?.id,
      foodItem: foodForm,
    };

    const res = await fetch("/api/afternoon-tea", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(
        editingFoodItem ? "Đã cập nhật món ăn" : "Đã thêm món ăn kèm mới",
      );
      setFoodModalOpen(false);
      load();
    } else {
      const err = await res.json();
      toast.error(err.error || "Không thể lưu món ăn");
    }
  };

  const handleDeleteFoodItem = async (invitationId, foodItemId) => {
    const res = await fetch("/api/afternoon-tea", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitationId,
        action: "deleteFoodItem",
        foodItemId,
      }),
    });
    if (res.ok) {
      toast.success("Đã xóa món ăn");
      load();
    } else {
      toast.error("Không thể xóa món ăn");
    }
  };

  const handleQuickChangeQuantity = async (invitationId, foodItem, delta) => {
    const newQuantity = Math.max(1, (foodItem.quantity || 1) + delta);
    if (newQuantity === foodItem.quantity) return;

    await fetch("/api/afternoon-tea", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitationId,
        action: "updateFoodItem",
        foodItemId: foodItem.id,
        foodItem: { quantity: newQuantity },
      }),
    });
    load();
  };

  const activeInvitation = data.invitations?.[0];
  const todayKey = vietnamDateKey();
  const todayInvitation = data.invitations?.find(
    (item) => item.scheduledAt && vietnamDateKey(item.scheduledAt) === todayKey,
  );
  const isOrderClosed = Boolean(
    activeInvitation?.scheduledAt &&
      vietnamDateKey(activeInvitation.scheduledAt) !== todayKey &&
      new Date(activeInvitation.scheduledAt) < new Date(),
  );

  const canManageMenu = Boolean(activeInvitation?.canManage);

  // Tính danh sách quán có đơn hàng hoặc menu
  const availableShops = useMemo(() => {
    if (!activeInvitation) return [];
    const shopCounts = {};
    // Quán từ menu
    (activeInvitation.menus || []).forEach((m) => {
      if (m.shop) shopCounts[m.shop] = 0;
    });
    // Quán từ đơn đặt
    (activeInvitation.orders || []).forEach((o) => {
      if (o.drink && o.drink.trim()) {
        const s = o.shop?.trim() || "Chưa chọn quán";
        shopCounts[s] = (shopCounts[s] || 0) + 1;
      }
    });
    return Object.entries(shopCounts).map(([name, count]) => ({
      name,
      count,
    }));
  }, [activeInvitation]);

  // Lọc món ăn kèm theo category
  const filteredFoodItems = useMemo(() => {
    const items = activeInvitation?.foodItems || [];
    if (foodCategoryTab === "all") return items;
    return items.filter((f) => f.category === foodCategoryTab);
  }, [activeInvitation?.foodItems, foodCategoryTab]);

  // Đếm món ăn theo phân loại
  const foodCounts = useMemo(() => {
    const items = activeInvitation?.foodItems || [];
    return {
      all: items.length,
      fruit: items.filter((f) => f.category === "Hoa quả").length,
      fried: items.filter((f) => f.category === "Đồ chiên rán").length,
      other: items.filter((f) => f.category === "Khác").length,
    };
  }, [activeInvitation?.foodItems]);

  if (loading)
    return (
      <Box
        sx={{
          minHeight: 360,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress size={40} thickness={4} />
        <Typography color="text.secondary">
          Đang tải dữ liệu trà chiều...
        </Typography>
      </Box>
    );

  return (
    <>
      <Grid container spacing={6}>
        {/* Card 1: MENU TRÀ CHIỀU */}
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "none",
            }}
          >
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      bgcolor: "rgba(115, 103, 240, 0.12)",
                      color: "primary.main",
                      width: 36,
                      height: 36,
                    }}
                  >
                    <i className="tabler-photo text-lg" />
                  </Avatar>
                  <Typography variant="h6" fontWeight={700}>
                    {activeInvitation?.type === "happy-hour"
                      ? "Menu Happy Hour"
                      : "Menu trà chiều"}
                  </Typography>
                </Box>
              }
              subheader={
                activeInvitation?.scheduledAt
                  ? `Người mời: ${activeInvitation.createdByName || "—"} · Thời gian: ${formatInvitationTime(activeInvitation.scheduledAt)}, hãy đặt nước ngay hehe`
                  : "Chưa có lời mời hôm nay"
              }
              action={
                activeInvitation ? (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {activeInvitation.menus?.length ? (
                      <Button
                        size="small"
                        variant="tonal"
                        color="primary"
                        startIcon={<i className="tabler-layout-grid" />}
                        onClick={() => setViewingShopId("all")}
                      >
                        Xem menu ({activeInvitation.menus.length} quán)
                      </Button>
                    ) : null}
                    {activeInvitation.canManage && (
                      <>
                        <Button
                          size="small"
                          variant="tonal"
                          onClick={() => {
                            setEditingId(activeInvitation.id);
                            setForm({
                              title: activeInvitation.title,
                              scheduledAt: toVietnamDateTimeLocal(
                                activeInvitation.scheduledAt,
                              ),
                              note: activeInvitation.note || "",
                            });
                          }}
                        >
                          Sửa lời mời
                        </Button>
                        <Button
                          size="small"
                          variant="tonal"
                          color="error"
                          onClick={() =>
                            setConfirmation({
                              title: "Xác nhận xóa lời mời",
                              message:
                                "Bạn có chắc muốn xóa lời mời trà chiều này?",
                              action: () =>
                                removeInvitation(activeInvitation.id),
                            })
                          }
                        >
                          Xóa lời mời
                        </Button>
                      </>
                    )}
                  </Box>
                ) : null
              }
            />
            <Divider />
            <CardContent sx={{ py: 3 }}>
              {activeInvitation?.menus?.length ? (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mr: 1 }}
                  >
                    Bấm vào quán để xem menu:
                  </Typography>
                  {activeInvitation.menus.map((m) => (
                    <Chip
                      key={m.id}
                      icon={<i className="tabler-building-store" />}
                      label={m.shop}
                      variant="tonal"
                      color="primary"
                      onClick={() => setViewingShopId(m.id)}
                      clickable
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa có menu nào được tải lên cho buổi trà chiều này.
                </Typography>
              )}

              {canManageMenu && activeInvitation.menus?.length < 3 && (
                <Box
                  sx={{
                    mt: 3,
                    pt: 3,
                    borderTop: "1px dashed",
                    borderColor: "divider",
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <TextField
                    size="small"
                    label="Tên quán mới"
                    placeholder="Ví dụ: TocoToco, Mixue, Phúc Long..."
                    value={shop}
                    onChange={(event) => setShop(event.target.value)}
                    sx={{ minWidth: { xs: "100%", sm: 260 }, flex: 1 }}
                  />
                  <Button
                    component="label"
                    variant="tonal"
                    color="secondary"
                    size="medium"
                    startIcon={<i className="tabler-upload" />}
                  >
                    {menuFile ? menuFile.name : "Chọn ảnh menu"}
                    <input
                      hidden
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        setMenuFile(event.target.files?.[0] || null)
                      }
                    />
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!shop.trim() || !menuFile}
                    onClick={() => uploadMenu(activeInvitation)}
                    startIcon={<i className="tabler-device-floppy" />}
                  >
                    Lưu menu
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Card tạo lời mời trà chiều */}
        {session && !todayInvitation && (
          <Grid
            size={{ xs: 12, md: isAdmin ? 6 : 12 }}
            sx={{ order: isAdmin ? 2 : 1 }}
          >
            <Card
              sx={{
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "none",
              }}
            >
              <CardHeader
                title="Tạo lời mời trà chiều hôm nay"
                subheader="Thiết lập tiêu đề, thời gian tổ chức và ghi chú chung"
              />
              <Divider />
              <CardContent sx={{ display: "grid", gap: 3, pt: 4 }}>
                <TextField
                  label="Tiêu đề"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Ngày trà chiều"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.scheduledAt?.slice(0, 10) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      scheduledAt: e.target.value
                        ? `${e.target.value}T14:00`
                        : "",
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="Ghi chú chung"
                  placeholder="Ví dụ: chốt đơn trước 15h30, tiền trích quỹ phòng..."
                  multiline
                  minRows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  fullWidth
                />
                <Box
                  sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}
                >
                  <Button variant="contained" color="primary" onClick={create}>
                    Tạo lời mời
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {session && isAdmin && !todayInvitation && !editingId && (
          <Grid size={{ xs: 12, md: 6 }} sx={{ order: 1 }}>
            <Card
              sx={{
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "none",
              }}
            >
              <CardHeader
                title="Tạo Happy Hour"
                subheader="Dùng quỹ team · không cộng điểm rèn luyện cho người tạo"
              />
              <Divider />
              <CardContent sx={{ display: "grid", gap: 3, pt: 4 }}>
                <TextField
                  label="Tiêu đề"
                  value={happyForm.title}
                  onChange={(e) =>
                    setHappyForm({ ...happyForm, title: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  label="Ngày Happy Hour"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={happyForm.scheduledAt?.slice(0, 10) || ""}
                  onChange={(e) =>
                    setHappyForm({
                      ...happyForm,
                      scheduledAt: e.target.value
                        ? `${e.target.value}T14:00`
                        : "",
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="Ghi chú chung"
                  placeholder="Ví dụ: Happy Hour thứ Sáu, trích từ quỹ team..."
                  multiline
                  minRows={2}
                  value={happyForm.note}
                  onChange={(e) =>
                    setHappyForm({ ...happyForm, note: e.target.value })
                  }
                  fullWidth
                />
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => create("happy-hour", happyForm)}
                  >
                    Tạo Happy Hour
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Chỉ cho chọn đồ uống khi đã có lời mời và ít nhất một menu quán */}
        {activeInvitation && (activeInvitation.menus || []).length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card
              sx={{
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "none",
              }}
            >
              <CardHeader
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      variant="rounded"
                      sx={{
                        bgcolor: "rgba(115, 103, 240, 0.12)",
                        color: "primary.main",
                        width: 36,
                        height: 36,
                      }}
                    >
                      <i className="tabler-cup text-lg" />
                    </Avatar>
                    <Typography variant="h6" fontWeight={700}>
                      Danh sách nhân sự chọn đồ uống
                    </Typography>
                  </Box>
                }
                action={
                  activeInvitation ? (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        size="small"
                        color="primary"
                        variant="tonal"
                        label={`${(activeInvitation.orders || []).filter((o) => o.drink?.trim()).length} người đã chọn món`}
                      />

                      {/* Nút Xuất PDF chia theo từng quán (Tải trực tiếp không qua máy in) */}
                      <Button
                        size="small"
                        variant="tonal"
                        color="secondary"
                        disabled={exportingPdf}
                        startIcon={<i className="tabler-file-type-pdf" />}
                        endIcon={<i className="tabler-chevron-down" />}
                        onClick={(e) => setPdfMenuAnchor(e.currentTarget)}
                      >
                        {exportingPdf ? "Đang tải PDF..." : "Tải PDF theo quán"}
                      </Button>

                      {/* MENU XUẤT PDF - HOÀN TOÀN KHÔNG DÙNG FRAGMENT ĐỂ TRÁNH CONSOLE ERROR */}
                      <Menu
                        anchorEl={pdfMenuAnchor}
                        open={Boolean(pdfMenuAnchor)}
                        onClose={() => setPdfMenuAnchor(null)}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "right",
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "right",
                        }}
                      >
                        <ListSubheader
                          component="div"
                          sx={{
                            lineHeight: "32px",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            letterSpacing: "0.8px",
                            textTransform: "uppercase",
                            color: "text.secondary",
                          }}
                        >
                          Chọn quán để tải file PDF
                        </ListSubheader>
                        <Divider sx={{ my: 0.5 }} />

                        {availableShops.length > 0 ? (
                          availableShops.map((s) => (
                            <MenuItem
                              key={s.name}
                              onClick={() =>
                                handleDownloadShopPdf(activeInvitation, s.name)
                              }
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 3,
                                py: 1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                }}
                              >
                                <i className="tabler-file-download text-primary" />
                                <Typography variant="body2" fontWeight={600}>
                                  {s.name}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                variant="tonal"
                                color={s.count > 0 ? "primary" : "default"}
                                label={`${s.count} món`}
                              />
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>
                            <Typography variant="body2" color="text.secondary">
                              Chưa có dữ liệu quán
                            </Typography>
                          </MenuItem>
                        )}

                        {availableShops.length > 1 && (
                          <Divider sx={{ my: 1 }} key="divider-all-shops" />
                        )}
                        {availableShops.length > 1 && (
                          <MenuItem
                            key="download-all-shops"
                            onClick={() =>
                              handleDownloadAllShopsPdf(activeInvitation)
                            }
                            sx={{
                              color: "primary.main",
                              fontWeight: 700,
                              py: 1.5,
                            }}
                          >
                            <i
                              className="tabler-files"
                              style={{ marginRight: 10, fontSize: "1.1rem" }}
                            />
                            Tải tất cả các quán (từng file riêng)
                          </MenuItem>
                        )}
                      </Menu>
                    </Box>
                  ) : null
                }
              />
              <Divider />
              <CardContent sx={{ p: 0 }}>
                {activeInvitation ? (
                  <Box>
                    {isOrderClosed && (
                      <Box sx={{ px: 5, py: 1.5, bgcolor: "action.hover" }}>
                        <Typography variant="body2" color="text.secondary">
                          Đã hết ngày đặt trà chiều. Danh sách chỉ còn ở chế độ
                          xem.
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ overflowX: "auto" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "action.hover" }}>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>
                              Nhân sự
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>
                              Món chọn
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 600, py: 2, width: 180 }}
                            >
                              Quán
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 600, py: 2, width: 120 }}
                            >
                              Size
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>
                              Ghi chú
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {[...(data.users || [])]
                            .sort((a, b) =>
                              a.id === session?.user?.id
                                ? -1
                                : b.id === session?.user?.id
                                  ? 1
                                  : a.name.localeCompare(b.name),
                            )
                            .map((user) => {
                              const order =
                                (activeInvitation.orders || []).find(
                                  (row) => row.userId === user.id,
                                ) || {};
                              const key = `${activeInvitation.id}:${user.id}`;
                              const draft = orderDrafts[key] || order;
                              const canEditOrder =
                                !isOrderClosed &&
                                (isAdmin ||
                                  user.id === session?.user?.id ||
                                  user.email === session?.user?.email);
                              const isEditing =
                                editingOrders[key] || !order.drink;
                              const isCurrentUser =
                                user.id === session?.user?.id;

                              return (
                                <TableRow
                                  key={user.id}
                                  hover
                                  sx={{
                                    bgcolor: isCurrentUser
                                      ? "rgba(115, 103, 240, 0.04)"
                                      : "inherit",
                                  }}
                                >
                                  <TableCell>
                                    <Box
                                      display="flex"
                                      alignItems="center"
                                      gap={1.5}
                                    >
                                      <Avatar
                                        src={resolveAvatar({
                                          avatarUrl: user.avatarUrl,
                                          gender: user.gender,
                                          role: user.role,
                                        })}
                                        sx={{ width: 32, height: 32 }}
                                      >
                                        {user.name?.[0]}
                                      </Avatar>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "baseline",
                                          gap: 0.75,
                                          flexWrap: "nowrap",
                                        }}
                                      >
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                          noWrap
                                        >
                                          {user.name}
                                        </Typography>
                                        {isCurrentUser && (
                                          <Typography
                                            variant="caption"
                                            color="primary.main"
                                            fontWeight={600}
                                            sx={{
                                              whiteSpace: "nowrap",
                                              flexShrink: 0,
                                            }}
                                          >
                                            (Bạn)
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  </TableCell>
                                  {canEditOrder && isEditing ? (
                                    <>
                                      <TableCell>
                                        <TextField
                                          size="small"
                                          placeholder="Nhập tên món uống..."
                                          value={draft.drink || ""}
                                          onChange={(event) =>
                                            setOrderDrafts((prev) => ({
                                              ...prev,
                                              [key]: {
                                                ...draft,
                                                drink: event.target.value,
                                              },
                                            }))
                                          }
                                          fullWidth
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <TextField
                                          select
                                          size="small"
                                          placeholder="Chọn quán"
                                          value={draft.shop || ""}
                                          onChange={(event) =>
                                            setOrderDrafts((prev) => ({
                                              ...prev,
                                              [key]: {
                                                ...draft,
                                                shop: event.target.value,
                                              },
                                            }))
                                          }
                                          fullWidth
                                        >
                                          <MenuItem value="">
                                            <em>Chưa chọn quán</em>
                                          </MenuItem>
                                          {(activeInvitation.menus || []).map(
                                            (menu) => (
                                              <MenuItem
                                                key={menu.id}
                                                value={menu.shop}
                                              >
                                                {menu.shop}
                                              </MenuItem>
                                            ),
                                          )}
                                        </TextField>
                                      </TableCell>
                                      <TableCell>
                                        <TextField
                                          select
                                          fullWidth
                                          size="small"
                                          placeholder="Size"
                                          value={draft.size || ""}
                                          onChange={(event) =>
                                            setOrderDrafts((prev) => ({
                                              ...prev,
                                              [key]: {
                                                ...draft,
                                                size: event.target.value,
                                              },
                                            }))
                                          }
                                        >
                                          <MenuItem value="">
                                            <em>Mặc định</em>
                                          </MenuItem>
                                          {["S", "M", "L", "XL", "XXL"].map(
                                            (size) => (
                                              <MenuItem key={size} value={size}>
                                                {size}
                                              </MenuItem>
                                            ),
                                          )}
                                        </TextField>
                                      </TableCell>
                                      <TableCell>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            gap: 1,
                                            alignItems: "center",
                                          }}
                                        >
                                          <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Ghi chú (50% đường, ít đá...)"
                                            value={draft.note || ""}
                                            onChange={(event) =>
                                              setOrderDrafts((prev) => ({
                                                ...prev,
                                                [key]: {
                                                  ...draft,
                                                  note: event.target.value,
                                                },
                                              }))
                                            }
                                          />
                                          <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            onClick={() =>
                                              saveOrder(
                                                activeInvitation.id,
                                                user.id,
                                                draft,
                                              )
                                            }
                                          >
                                            Lưu
                                          </Button>
                                        </Box>
                                      </TableCell>
                                    </>
                                  ) : (
                                    <>
                                      <TableCell>
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                          color={
                                            order.drink
                                              ? "primary.main"
                                              : "text.secondary"
                                          }
                                        >
                                          {order.drink || "Chưa chọn món"}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {order.shop || "—"}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {order.size || "—"}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 1,
                                          }}
                                        >
                                          <Typography variant="body2">
                                            {order.note || "—"}
                                          </Typography>
                                          {canEditOrder && order.drink && (
                                            <Button
                                              size="small"
                                              variant="tonal"
                                              color="primary"
                                              onClick={() =>
                                                setEditingOrders((prev) => ({
                                                  ...prev,
                                                  [key]: true,
                                                }))
                                              }
                                            >
                                              Sửa
                                            </Button>
                                          )}
                                        </Box>
                                      </TableCell>
                                    </>
                                  )}
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ p: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      Chưa có lời mời trà chiều nào đang hoạt động.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Card 3: CHỌN MÓN ĂN KÈM (HOA QUẢ, ĐỒ CHIÊN RÁN, KHÁC) */}
        {activeInvitation && (
          <Grid size={{ xs: 12 }}>
            <Card
              sx={{
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "none",
              }}
            >
              <CardHeader
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      variant="rounded"
                      sx={{
                        bgcolor: "rgba(255, 159, 67, 0.12)",
                        color: "warning.main",
                        width: 36,
                        height: 36,
                      }}
                    >
                      <i className="tabler-tools-kitchen-2 text-lg" />
                    </Avatar>
                    <Typography variant="h6" fontWeight={700}>
                      Chọn món ăn kèm trà chiều
                    </Typography>
                  </Box>
                }
                subheader="Danh sách món ăn theo 3 loại: Hoa quả, Đồ chiên rán, Khác (Đơn vị: hộp / cái / suất)"
                action={
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      size="small"
                      variant="tonal"
                      color="secondary"
                      disabled={exportingPdf}
                      startIcon={<i className="tabler-file-download" />}
                      onClick={() => handleDownloadFoodPdf(activeInvitation)}
                    >
                      Tải PDF món ăn
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<i className="tabler-plus" />}
                      onClick={handleOpenAddFoodModal}
                    >
                      Thêm món ăn
                    </Button>
                  </Box>
                }
              />
              <Divider />

              {/* Tabs lọc theo 3 loại món ăn */}
              <Box
                sx={{
                  px: 5,
                  pt: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Tabs
                  value={foodCategoryTab}
                  onChange={(e, val) => setFoodCategoryTab(val)}
                  textColor="primary"
                  indicatorColor="primary"
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{ minHeight: 44, maxWidth: "100%" }}
                >
                  <Tab
                    value="all"
                    label={`Tất cả (${foodCounts.all})`}
                    iconPosition="start"
                    icon={<i className="tabler-tools-kitchen-2" />}
                  />
                  <Tab
                    value="Hoa quả"
                    label={`Hoa quả (${foodCounts.fruit})`}
                    iconPosition="start"
                    icon={<i className="tabler-apple text-success" />}
                  />
                  <Tab
                    value="Đồ chiên rán"
                    label={`Đồ chiên rán (${foodCounts.fried})`}
                    iconPosition="start"
                    icon={<i className="tabler-flame text-warning" />}
                  />
                  <Tab
                    value="Khác"
                    label={`Khác (${foodCounts.other})`}
                    iconPosition="start"
                    icon={<i className="tabler-cookie text-info" />}
                  />
                </Tabs>

                {/* Quick Summary Chips */}
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    variant="tonal"
                    color="success"
                    label={`${foodCounts.fruit} món Hoa quả`}
                  />
                  <Chip
                    size="small"
                    variant="tonal"
                    color="warning"
                    label={`${foodCounts.fried} món Chiên rán`}
                  />
                  <Chip
                    size="small"
                    variant="tonal"
                    color="info"
                    label={`${foodCounts.other} món Khác`}
                  />
                </Box>
              </Box>

              <CardContent sx={{ p: 0, pt: 1 }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "action.hover" }}>
                        <TableCell
                          sx={{
                            width: 60,
                            textAlign: "center",
                            fontWeight: 600,
                            py: 2,
                          }}
                        >
                          STT
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>
                          Tên món ăn
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 150,
                            textAlign: "center",
                            fontWeight: 600,
                            py: 2,
                          }}
                        >
                          Phân loại
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 220,
                            textAlign: "center",
                            fontWeight: 600,
                            py: 2,
                          }}
                        >
                          Số lượng & Đơn vị
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>
                          Ghi chú
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 120,
                            textAlign: "center",
                            fontWeight: 600,
                            py: 2,
                          }}
                        >
                          Thao tác
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredFoodItems.length > 0 ? (
                        filteredFoodItems.map((item, idx) => {
                          const isFruit = item.category === "Hoa quả";
                          const isFried = item.category === "Đồ chiên rán";
                          const chipColor = isFruit
                            ? "success"
                            : isFried
                              ? "warning"
                              : "info";

                          return (
                            <TableRow key={item.id} hover>
                              <TableCell sx={{ textAlign: "center" }}>
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.name}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ textAlign: "center" }}>
                                <Chip
                                  size="small"
                                  variant="tonal"
                                  color={chipColor}
                                  label={item.category}
                                />
                              </TableCell>
                              <TableCell sx={{ textAlign: "center" }}>
                                <Box
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    bgcolor: "action.hover",
                                    borderRadius: 1,
                                    px: 1,
                                    py: 0.25,
                                  }}
                                >
                                  <Tooltip title="Giảm số lượng">
                                    <span>
                                      <IconButton
                                        size="small"
                                        disabled={item.quantity <= 1}
                                        onClick={() =>
                                          handleQuickChangeQuantity(
                                            activeInvitation.id,
                                            item,
                                            -1,
                                          )
                                        }
                                      >
                                        <i className="tabler-minus text-sm" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    color="primary.main"
                                    sx={{ minWidth: 70, textAlign: "center" }}
                                  >
                                    {item.quantity} {item.unit || "hộp"}
                                  </Typography>
                                  <Tooltip title="Tăng số lượng">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleQuickChangeQuantity(
                                          activeInvitation.id,
                                          item,
                                          1,
                                        )
                                      }
                                    >
                                      <i className="tabler-plus text-sm" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {item.note || "—"}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ textAlign: "center" }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Tooltip title="Chỉnh sửa">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() =>
                                        handleOpenEditFoodModal(item)
                                      }
                                    >
                                      <i className="tabler-edit" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Xóa món">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        setConfirmation({
                                          title: "Xác nhận xóa món ăn",
                                          message: `Bạn có chắc muốn xóa ${item.name} khỏi danh sách?`,
                                          action: () =>
                                            handleDeleteFoodItem(
                                              activeInvitation.id,
                                              item.id,
                                            ),
                                        })
                                      }
                                    >
                                      <i className="tabler-trash" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            sx={{ textAlign: "center", py: 6 }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <i
                                className="tabler-tools-kitchen-2 text-4xl"
                                style={{ opacity: 0.3 }}
                              />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Chưa có món ăn nào trong danh mục này.
                              </Typography>
                              <Button
                                size="small"
                                variant="tonal"
                                color="primary"
                                onClick={handleOpenAddFoodModal}
                                sx={{ mt: 1 }}
                              >
                                Thêm món ăn ngay
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* MODAL CHỈNH SỬA LỜI MỜI */}
      <Dialog
        open={Boolean(editingId)}
        onClose={() => setEditingId(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ px: 5, pt: 4, pb: 2 }}>
          {activeInvitation?.type === "happy-hour"
            ? "Chỉnh sửa Happy Hour"
            : "Chỉnh sửa lời mời trà chiều"}
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 3, pt: "20px !important" }}>
          <TextField
            label="Tiêu đề"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            fullWidth
          />
          <TextField
            label={
              activeInvitation?.type === "happy-hour"
                ? "Ngày Happy Hour"
                : "Ngày trà chiều"
            }
            type="date"
            InputLabelProps={{ shrink: true }}
            value={form.scheduledAt?.slice(0, 10) || ""}
            onChange={(e) =>
              setForm({
                ...form,
                scheduledAt: e.target.value ? `${e.target.value}T14:00` : "",
              })
            }
            fullWidth
          />
          <TextField
            label="Ghi chú chung"
            multiline
            minRows={3}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 5, py: 3 }}>
          <Button
            variant="tonal"
            color="secondary"
            onClick={() => setEditingId(null)}
          >
            Hủy
          </Button>
          <Button variant="contained" color="primary" onClick={() => create()}>
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL XEM MENU (theo quán cụ thể hoặc xem full) */}
      <Dialog
        open={Boolean(viewingShopId)}
        onClose={() => setViewingShopId(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <i className="tabler-building-store text-primary text-xl" />
            <Typography variant="h6" fontWeight={700}>
              {viewingShopId === "all"
                ? `Menu trà chiều – ${activeInvitation?.menus?.length || 0} quán`
                : (activeInvitation?.menus || []).find(
                    (m) => m.id === viewingShopId,
                  )?.shop || ""}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Nút chuyển qua quán khác */}
            {viewingShopId !== "all" &&
              (activeInvitation?.menus || []).length > 1 &&
              (activeInvitation?.menus || []).map((m) => (
                <Chip
                  key={m.id}
                  label={m.shop}
                  size="small"
                  variant={m.id === viewingShopId ? "filled" : "tonal"}
                  color="primary"
                  onClick={() => setViewingShopId(m.id)}
                  clickable
                />
              ))}
            {viewingShopId !== "all" && (
              <Button
                size="small"
                variant="tonal"
                color="secondary"
                startIcon={<i className="tabler-layout-grid" />}
                onClick={() => setViewingShopId("all")}
                sx={{ ml: 1 }}
              >
                Xem tất cả
              </Button>
            )}
            <IconButton
              size="small"
              onClick={() => setViewingShopId(null)}
              sx={{ ml: 0.5 }}
            >
              <i className="tabler-x" />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ minHeight: 400, py: 3, px: 3 }}>
          {viewingShopId === "all" ? (
            <Box sx={{ display: "grid", gap: 4 }}>
              {(activeInvitation?.menus || []).map((menu) => (
                <Box
                  key={menu.id}
                  sx={{
                    p: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <i className="tabler-building-store text-primary text-xl" />
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      color="primary.main"
                    >
                      {menu.shop}
                    </Typography>
                  </Box>
                  <Box
                    component="img"
                    src={menu.imageUrl}
                    alt={`Menu ${menu.shop}`}
                    sx={{
                      width: "100%",
                      maxHeight: "72vh",
                      objectFit: "contain",
                      borderRadius: 2,
                      bgcolor: "action.hover",
                    }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            (() => {
              const menu = (activeInvitation?.menus || []).find(
                (m) => m.id === viewingShopId,
              );
              if (!menu) return null;
              return (
                <Box
                  component="img"
                  src={menu.imageUrl}
                  alt={`Menu ${menu.shop}`}
                  sx={{
                    width: "100%",
                    maxHeight: "80vh",
                    objectFit: "contain",
                    borderRadius: 2,
                    bgcolor: "action.hover",
                  }}
                />
              );
            })()
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL THÊM / SỬA MÓN ĂN KÈM */}
      <Dialog
        open={foodModalOpen}
        onClose={() => setFoodModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            {editingFoodItem ? "Chỉnh sửa món ăn" : "Thêm món ăn kèm trà chiều"}
          </Typography>
          <IconButton size="small" onClick={() => setFoodModalOpen(false)}>
            <i className="tabler-x" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ display: "grid", gap: 3, pt: "20px !important" }}>
          <TextField
            label="Tên món ăn"
            placeholder="Ví dụ: Dưa hấu, Nem chua rán, Khoai tây lắc phô mai, Bánh su kem..."
            value={foodForm.name}
            onChange={(e) =>
              setFoodForm((prev) => ({ ...prev, name: e.target.value }))
            }
            fullWidth
            required
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              label="Phân loại (3 nhóm)"
              value={foodForm.category}
              onChange={(e) =>
                setFoodForm((prev) => ({ ...prev, category: e.target.value }))
              }
              fullWidth
            >
              {FOOD_CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Đơn vị tính"
              value={foodForm.unit}
              onChange={(e) =>
                setFoodForm((prev) => ({ ...prev, unit: e.target.value }))
              }
              sx={{ width: 160 }}
            >
              {FOOD_UNITS.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField
            label="Số lượng"
            type="number"
            inputProps={{ min: 1 }}
            value={foodForm.quantity}
            onChange={(e) =>
              setFoodForm((prev) => ({
                ...prev,
                quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
              }))
            }
            fullWidth
          />

          <TextField
            label="Ghi chú"
            placeholder="Ví dụ: gọt sẵn, chấm muối tôm, ít cay, quán cổng sau..."
            value={foodForm.note}
            onChange={(e) =>
              setFoodForm((prev) => ({ ...prev, note: e.target.value }))
            }
            multiline
            minRows={2}
            fullWidth
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 5, py: 3 }}>
          <Button
            variant="tonal"
            color="secondary"
            onClick={() => setFoodModalOpen(false)}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleSaveFoodItem(activeInvitation?.id)}
          >
            {editingFoodItem ? "Lưu thay đổi" : "Thêm món"}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title}
        message={confirmation?.message}
        confirmText="Xóa"
        onClose={() => setConfirmation(null)}
        onConfirm={async () => {
          const action = confirmation?.action;
          setConfirmation(null);
          await action?.();
        }}
      />
    </>
  );
}
