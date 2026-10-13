"use client";

import ZoomableMenuImage from "./components/ZoomableMenuImage";
import { useEffect, useState, useMemo, useRef } from "react";
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
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
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
const COMMON_DRINK_SIZES = ["S", "M", "L", "XL", "XXL"];
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
  const [reviewingMenu, setReviewingMenu] = useState(null);
  const [menuReviewDrafts, setMenuReviewDrafts] = useState({});
  const [reviewImageFile, setReviewImageFile] = useState(null);
  const [replacingReviewImage, setReplacingReviewImage] = useState(false);
  const [uploadingMenu, setUploadingMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [remoteEditors, setRemoteEditors] = useState({});
  const [remoteOrderPreviews, setRemoteOrderPreviews] = useState({});
  const [remotePageVisitors, setRemotePageVisitors] = useState({});
  const [activeOrderField, setActiveOrderField] = useState(null);
  const liveSyncInFlight = useRef(false);
  const realtimeClientId = useRef(
    `tea_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  );
  const realtimeChannel = useRef(null);
  const orderAutoSaveTimers = useRef(new Map());
  const remoteEditorTimers = useRef(new Map());
  const pageVisitorTimers = useRef(new Map());
  const [orderDrafts, setOrderDrafts] = useState({});
  const [editingOrders, setEditingOrders] = useState({});
  const [orderFilters, setOrderFilters] = useState({
    name: "",
    drink: "",
    size: "",
  });
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

  const load = async () => {
    if (liveSyncInFlight.current) return;
    liveSyncInFlight.current = true;
    try {
      const response = await fetch("/api/afternoon-tea", {
        cache: "no-store",
      });
      if (!response.ok) return;
      setData(await response.json());
    } catch {
      // Lần đồng bộ kế tiếp sẽ thử lại; không làm gián đoạn thao tác đang nhập.
    } finally {
      liveSyncInFlight.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const events = new EventSource("/api/afternoon-tea/events");
    const receiveRealtimeEvent = (event) => {
      if (event.type === "data") {
        load();
        return;
      }
      if (
        event.type !== "activity" ||
        event.clientId === realtimeClientId.current ||
        event.userId === session?.user?.id
      )
        return;
      if (event.field === "page") {
        const presenceKey = `${event.invitationId}:${event.userId}`;
        setRemotePageVisitors((previous) => ({
          ...previous,
          [presenceKey]: event,
        }));
        const previousTimer = pageVisitorTimers.current.get(presenceKey);
        if (previousTimer) window.clearTimeout(previousTimer);
        pageVisitorTimers.current.set(
          presenceKey,
          window.setTimeout(() => {
            setRemotePageVisitors((previous) => {
              const next = { ...previous };
              delete next[presenceKey];
              return next;
            });
            pageVisitorTimers.current.delete(presenceKey);
          }, 25_000),
        );
        return;
      }
      const key = `${event.invitationId}:${event.userId}:${event.field}`;
      const orderKey = `${event.invitationId}:${event.userId}`;
      setRemoteEditors((previous) => ({ ...previous, [key]: event }));
      if (event.order) {
        setRemoteOrderPreviews((previous) => ({
          ...previous,
          [orderKey]: { ...previous[orderKey], ...event.order },
        }));
      }
      const previousTimer = remoteEditorTimers.current.get(key);
      if (previousTimer) window.clearTimeout(previousTimer);
      remoteEditorTimers.current.set(
        key,
        window.setTimeout(() => {
          setRemoteEditors((previous) => {
            const next = { ...previous };
            delete next[key];
            return next;
          });
          setRemoteOrderPreviews((previous) => {
            const next = { ...previous };
            delete next[orderKey];
            return next;
          });
          remoteEditorTimers.current.delete(key);
        }, 2200),
      );
    };
    events.onmessage = (message) => {
      try {
        receiveRealtimeEvent(JSON.parse(message.data));
      } catch {
        // Bỏ qua gói sự kiện không hợp lệ và tiếp tục nhận sự kiện tiếp theo.
      }
    };
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("afternoon-tea-live");
    realtimeChannel.current = channel;
    if (channel)
      channel.onmessage = (message) => receiveRealtimeEvent(message.data);
    const refreshLiveData = () => {
      if (document.visibilityState === "visible") load();
    };
    const intervalId = window.setInterval(refreshLiveData, 10_000);
    document.addEventListener("visibilitychange", refreshLiveData);
    return () => {
      window.clearInterval(intervalId);
      events.close();
      channel?.close();
      if (realtimeChannel.current === channel) realtimeChannel.current = null;
      document.removeEventListener("visibilitychange", refreshLiveData);
      orderAutoSaveTimers.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      orderAutoSaveTimers.current.clear();
      remoteEditorTimers.current.forEach((timer) => window.clearTimeout(timer));
      remoteEditorTimers.current.clear();
      pageVisitorTimers.current.forEach((timer) => window.clearTimeout(timer));
      pageVisitorTimers.current.clear();
    };
  }, [session?.user?.id]);

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

  const saveOrder = async (
    invitationId,
    userId,
    order,
    { silent = false, keepDraft = false } = {},
  ) => {
    const res = await fetch("/api/afternoon-tea", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, action: "order", userId, order }),
    });
    const result = await res.json();
    if (res.ok) {
      if (!keepDraft) {
        setOrderDrafts((prev) => {
          const next = { ...prev };
          delete next[`${invitationId}:${userId}`];
          return next;
        });
        setEditingOrders((prev) => ({
          ...prev,
          [`${invitationId}:${userId}`]: false,
        }));
      }
      if (!silent) toast.success("Đã lưu món đã chọn");
      load();
    } else if (!silent) {
      toast.error(result.error || "Không thể lưu món đã chọn");
    }
  };

  const updateOrderDraft = (invitationId, userId, key, order, field) => {
    setOrderDrafts((previous) => ({ ...previous, [key]: order }));
    setEditingOrders((previous) => ({ ...previous, [key]: true }));
    signalOrderActivity(invitationId, userId, field, order);
    const previousTimer = orderAutoSaveTimers.current.get(key);
    if (previousTimer) window.clearTimeout(previousTimer);
    orderAutoSaveTimers.current.set(
      key,
      window.setTimeout(() => {
        orderAutoSaveTimers.current.delete(key);
        saveOrder(invitationId, userId, order, {
          silent: true,
          keepDraft: true,
        });
      }, 800),
    );
  };

  const signalOrderActivity = (invitationId, userId, field, order) => {
    const activity = {
      type: "activity",
      invitationId,
      userId,
      field,
      order,
      clientId: realtimeClientId.current,
    };
    realtimeChannel.current?.postMessage(activity);
    fetch("/api/afternoon-tea/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    }).catch(() => {});
  };

  const signalPagePresence = (invitationId) => {
    if (!invitationId || !session?.user?.id) return;
    const activity = {
      type: "activity",
      invitationId,
      userId: session.user.id,
      field: "page",
      clientId: realtimeClientId.current,
    };
    realtimeChannel.current?.postMessage(activity);
    fetch("/api/afternoon-tea/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    }).catch(() => {});
  };

  const isRemoteEditing = (invitationId, userId, field) =>
    remoteEditors[`${invitationId}:${userId}:${field}`] || null;

  const focusOrderField = (invitationId, userId, key, field, order) => {
    setActiveOrderField({ key, field });
    signalOrderActivity(invitationId, userId, field, order);
  };

  const remoteEditingSx = (activity, isOwnField) =>
    activity
      ? {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "info.main !important",
            borderWidth: 2,
          },
          "& .MuiInputBase-root": {
            animation: "afternoonTeaRemotePulse 1.1s ease-in-out infinite",
            boxShadow: "0 0 0 3px rgba(0, 176, 255, 0.16)",
          },
          "@keyframes afternoonTeaRemotePulse": {
            "0%, 100%": { boxShadow: "0 0 0 3px rgba(0, 176, 255, 0.12)" },
            "50%": { boxShadow: "0 0 0 6px rgba(0, 176, 255, 0.04)" },
          },
        }
      : isOwnField
        ? {
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "primary.main !important",
              borderWidth: 2,
            },
            "& .MuiInputBase-root": {
              boxShadow: "0 0 0 3px rgba(115, 103, 240, 0.12)",
            },
          }
        : undefined;

  const uploadMenu = async (invitation) => {
    if (!shop.trim() || !menuFile) return;
    setUploadingMenu(true);
    setUploadProgress(10);
    setUploadStage("Đang tải ảnh menu...");
    const progressTimer = window.setInterval(() => {
      setUploadProgress((current) => {
        const next = Math.min(current + 5, 90);
        if (next >= 65) setUploadStage("Gemini đang đọc món, size và giá...");
        else if (next >= 35) setUploadStage("Đang kiểm tra menu đã lưu...");
        return next;
      });
    }, 700);
    try {
      const body = new FormData();
      body.append("invitationId", invitation.id);
      body.append("shop", shop.trim());
      body.append("image", menuFile);
      const response = await fetch("/api/afternoon-tea/menu", {
        method: "POST",
        body,
      });
      const result = await response.json().catch(() => ({}));
      window.clearInterval(progressTimer);
      setUploadProgress(95);
      setUploadStage("Đang lưu kết quả...");
      if (response.ok) {
        setShop("");
        setMenuFile(null);
        if (result.catalog?.reused && result.catalog?.status === "approved") {
          toast.success("Đã dùng lại menu đã lưu trước đó");
        } else {
          toast.success("Gemini đã đọc menu. Hãy kiểm tra trước khi xác nhận.");
          setMenuReviewDrafts({
            [result.menu?.id]: {
              shop: result.menu?.shop || shop,
              items: result.catalog?.items || [],
            },
          });
          setReviewingMenu(result.menu?.id || null);
        }
        load();
      } else {
        toast.error(
          result.error ||
            (response.status === 504
              ? "Máy chủ chờ đọc menu quá lâu. Hãy tải lại trang để kiểm tra menu trước khi thử lại."
              : "Không thể tải lên ảnh menu"),
        );
      }
    } catch {
      toast.error("Không thể tải lên ảnh menu");
    } finally {
      window.clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadingMenu(false);
    }
  };

  const openMenuReview = (menu) => {
    const menus = activeInvitation?.menus || [];
    setMenuReviewDrafts(
      Object.fromEntries(
        menus.map((item) => [
          item.id,
          { shop: item.shop || "", items: item.items || [] },
        ]),
      ),
    );
    setReviewImageFile(null);
    setReviewingMenu(menu?.id || menus[0]?.id || null);
  };

  const setReviewItems = (updater) => {
    setMenuReviewDrafts((previous) => {
      const current = previous[reviewingMenu] || { shop: "", items: [] };
      const items =
        typeof updater === "function" ? updater(current.items || []) : updater;
      return {
        ...previous,
        [reviewingMenu]: { ...current, items },
      };
    });
  };

  const saveMenuReview = async () => {
    if (!activeInvitation || !reviewingMenu) return;
    const draft = menuReviewDrafts[reviewingMenu];
    if (!draft) return;
    const response = await fetch("/api/afternoon-tea", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitationId: activeInvitation.id,
        action: "updateMenu",
        menuId: reviewingMenu,
        order: { shop: draft.shop },
        menuItems: draft.items,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(result.error || "Không thể lưu menu");
    toast.success("Đã xác nhận và lưu danh sách món");
    load();
  };

  const replaceReviewMenuImage = async (selectedFile = reviewImageFile) => {
    if (!activeInvitation || !reviewingMenu || !selectedFile) return;
    const draft = menuReviewDrafts[reviewingMenu];
    if (!draft?.shop.trim()) return toast.error("Nhập tên quán trước");
    setReplacingReviewImage(true);
    try {
      const body = new FormData();
      body.append("invitationId", activeInvitation.id);
      body.append("menuId", reviewingMenu);
      body.append("shop", draft.shop.trim());
      body.append("image", selectedFile);
      const response = await fetch("/api/afternoon-tea/menu", {
        method: "POST",
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        return toast.error(
          result.error ||
            (response.status === 504
              ? "Máy chủ chờ đọc menu quá lâu. Hãy tải lại trang để kiểm tra menu trước khi thử lại."
              : "Không thể thay ảnh menu"),
        );
      setMenuReviewDrafts((previous) => ({
        ...previous,
        [reviewingMenu]: {
          shop: result.menu?.shop || draft.shop,
          items: result.catalog?.items || [],
        },
      }));
      setReviewImageFile(null);
      toast.success("Đã đọc ảnh mới. Hãy kiểm tra lại món trước khi lưu.");
      load();
    } catch {
      toast.error("Không thể đọc ảnh menu mới");
    } finally {
      setReplacingReviewImage(false);
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
  const reviewItems = menuReviewDrafts[reviewingMenu]?.items || [];
  const reviewShop = menuReviewDrafts[reviewingMenu]?.shop || "";
  const todayKey = vietnamDateKey();
  const todayInvitation = data.invitations?.find(
    (item) => item.scheduledAt && vietnamDateKey(item.scheduledAt) === todayKey,
  );
  const isOrdersLocked = Boolean(activeInvitation?.ordersLocked);
  const isOrderClosed = Boolean(
    activeInvitation?.scheduledAt &&
      vietnamDateKey(activeInvitation.scheduledAt) !== todayKey &&
      new Date(activeInvitation.scheduledAt) < new Date(),
  );

  const canManageMenu = Boolean(activeInvitation?.canManage);

  const setOrdersLock = async (locked) => {
    if (!activeInvitation) return;
    const response = await fetch("/api/afternoon-tea", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitationId: activeInvitation.id,
        action: "lockOrders",
        order: { locked },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(result.error || "Không thể chốt món");
    toast.success(
      locked
        ? "Đã chốt món. Người dùng thường không thể chỉnh sửa thêm."
        : "Đã mở chốt món. Mọi người có thể chỉnh sửa lại.",
    );
    load();
  };

  useEffect(() => {
    if (!activeInvitation?.id || !session?.user?.id) return undefined;
    signalPagePresence(activeInvitation.id);
    const heartbeatId = window.setInterval(
      () => signalPagePresence(activeInvitation.id),
      10_000,
    );
    return () => window.clearInterval(heartbeatId);
  }, [activeInvitation?.id, session?.user?.id]);

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
                    {activeInvitation.canManage &&
                    activeInvitation.menus?.length ? (
                      <Button
                        size="small"
                        variant="tonal"
                        color="secondary"
                        startIcon={<i className="tabler-edit" />}
                        onClick={() =>
                          openMenuReview(activeInvitation.menus[0])
                        }
                      >
                        Kiểm tra menu
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
                    <Box key={m.id} sx={{ display: "flex", gap: 0.5 }}>
                      <Chip
                        icon={<i className="tabler-building-store" />}
                        label={`${m.shop}${m.menuStatus === "pending_review" ? " · Chờ duyệt" : ""}`}
                        variant="tonal"
                        color={
                          m.menuStatus === "approved" ? "primary" : "warning"
                        }
                        onClick={() => setViewingShopId(m.id)}
                        clickable
                      />
                      {canManageMenu && (
                        <Tooltip title="Kiểm tra tất cả menu">
                          <IconButton
                            size="small"
                            onClick={() => openMenuReview(m)}
                          >
                            <i className="tabler-edit" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa có menu nào được tải lên cho buổi trà chiều này.
                </Typography>
              )}

              {canManageMenu && activeInvitation.menus?.length < 3 && (
                <>
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
                      disabled={!shop.trim() || !menuFile || uploadingMenu}
                      onClick={() => uploadMenu(activeInvitation)}
                      startIcon={<i className="tabler-device-floppy" />}
                    >
                      {uploadingMenu ? "Đang đọc menu..." : "Lưu menu"}
                    </Button>
                  </Box>
                  {uploadingMenu && (
                    <Box sx={{ mt: 2, width: "100%" }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.75,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {uploadStage}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color="primary.main"
                        >
                          {uploadProgress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={uploadProgress}
                      />
                    </Box>
                  )}
                </>
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
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => create()}
                  >
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
                sx={{ "& .MuiCardHeader-action": { display: "none" } }}
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

                      {isAdmin && (
                        <Button
                          size="small"
                          variant="contained"
                          color={isOrdersLocked ? "success" : "warning"}
                          startIcon={
                            <i
                              className={
                                isOrdersLocked
                                  ? "tabler-lock"
                                  : "tabler-lock-open"
                              }
                            />
                          }
                          onClick={() =>
                            setConfirmation({
                              title: "Chốt danh sách món",
                              message: isOrdersLocked
                                ? "Mở chốt để tất cả người dùng có thể đặt hoặc sửa món trở lại?"
                                : "Sau khi chốt, người dùng thường sẽ không thể sửa quán, món, size hoặc ghi chú. Admin và Trợ lý vẫn có thể chỉnh sửa.",
                              action: () => setOrdersLock(!isOrdersLocked),
                            })
                          }
                        >
                          {isOrdersLocked ? "Mở chốt món" : "Chốt món"}
                        </Button>
                      )}

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
                    {(isOrderClosed || isOrdersLocked) && (
                      <Box sx={{ px: 5, py: 1.5, bgcolor: "action.hover" }}>
                        <Typography variant="body2" color="text.secondary">
                          {isOrdersLocked
                            ? "Danh sách món đã được chốt. Người dùng thường chỉ còn chế độ xem."
                            : "Đã hết ngày đặt trà chiều. Danh sách chỉ còn ở chế độ xem."}
                        </Typography>
                      </Box>
                    )}
                    <Box
                      sx={{
                        px: 3,
                        py: 2,
                        display: "flex",
                        gap: 1.5,
                        flexWrap: "wrap",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <TextField
                        size="small"
                        label="Lọc theo tên"
                        value={orderFilters.name}
                        onChange={(event) =>
                          setOrderFilters((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        sx={{ minWidth: 190 }}
                      />
                      <TextField
                        size="small"
                        label="Lọc theo món"
                        value={orderFilters.drink}
                        onChange={(event) =>
                          setOrderFilters((current) => ({
                            ...current,
                            drink: event.target.value,
                          }))
                        }
                        sx={{ minWidth: 210 }}
                      />
                      <TextField
                        size="small"
                        label="Lọc theo size"
                        select
                        value={orderFilters.size}
                        onChange={(event) =>
                          setOrderFilters((current) => ({
                            ...current,
                            size: event.target.value,
                          }))
                        }
                        sx={{ minWidth: 150 }}
                      >
                        <MenuItem value="">Tất cả size</MenuItem>
                        {COMMON_DRINK_SIZES.map((size) => (
                          <MenuItem key={size} value={size}>
                            {size}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                          flexWrap: "wrap",
                          ml: { md: "auto" },
                        }}
                      >
                        <Chip
                          size="small"
                          color="primary"
                          variant="tonal"
                          label={`${(activeInvitation.orders || []).filter((o) => o.drink?.trim()).length} người đã chọn món`}
                        />
                        {isAdmin && (
                          <Button
                            size="small"
                            variant="contained"
                            color={isOrdersLocked ? "success" : "warning"}
                            startIcon={
                              <i
                                className={
                                  isOrdersLocked
                                    ? "tabler-lock"
                                    : "tabler-lock-open"
                                }
                              />
                            }
                            onClick={() =>
                              setConfirmation({
                                title: "Chốt danh sách món",
                                message: isOrdersLocked
                                  ? "Mở chốt để tất cả người dùng có thể đặt hoặc sửa món trở lại?"
                                  : "Sau khi chốt, người dùng thường sẽ không thể sửa quán, món, size hoặc ghi chú. Admin và Trợ lý vẫn có thể chỉnh sửa.",
                                action: () => setOrdersLock(!isOrdersLocked),
                              })
                            }
                          >
                            {isOrdersLocked ? "Mở chốt món" : "Chốt món"}
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="tonal"
                          color="secondary"
                          disabled={exportingPdf}
                          startIcon={<i className="tabler-file-type-pdf" />}
                          endIcon={<i className="tabler-chevron-down" />}
                          onClick={(event) =>
                            setPdfMenuAnchor(event.currentTarget)
                          }
                        >
                          {exportingPdf
                            ? "Đang tải PDF..."
                            : "Tải PDF theo quán"}
                        </Button>
                      </Box>
                    </Box>
                    <Box sx={{ overflowX: "auto" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "action.hover" }}>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>
                              Nhân sự
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>
                              Quán
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 600, py: 2, minWidth: 320 }}
                            >
                              Món chọn
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
                            .filter((user) => {
                              const order = (
                                activeInvitation.orders || []
                              ).find((row) => row.userId === user.id);
                              const includes = (value, filter) =>
                                String(value || "")
                                  .toLocaleLowerCase("vi-VN")
                                  .includes(
                                    String(filter || "").toLocaleLowerCase(
                                      "vi-VN",
                                    ),
                                  );
                              return (
                                includes(user.name, orderFilters.name) &&
                                includes(order?.drink, orderFilters.drink) &&
                                (!orderFilters.size ||
                                  String(order?.size || "")
                                    .trim()
                                    .toLocaleLowerCase("vi-VN") ===
                                    orderFilters.size
                                      .trim()
                                      .toLocaleLowerCase("vi-VN"))
                              );
                            })
                            .map((user) => {
                              const order =
                                (activeInvitation.orders || []).find(
                                  (row) => row.userId === user.id,
                                ) || {};
                              const key = `${activeInvitation.id}:${user.id}`;
                              const remotePreview = remoteOrderPreviews[key];
                              const displayedOrder = remotePreview || order;
                              const draft =
                                orderDrafts[key] || remotePreview || order;
                              const canEditOrder =
                                !isOrderClosed &&
                                (!isOrdersLocked || isAdmin) &&
                                (isAdmin ||
                                  user.id === session?.user?.id ||
                                  user.email === session?.user?.email);
                              const isEditing =
                                editingOrders[key] || !displayedOrder.drink;
                              const isCurrentUser =
                                user.id === session?.user?.id;
                              const approvedMenus = (
                                activeInvitation.menus || []
                              ).filter(
                                (menu) => menu.menuStatus === "approved",
                              );
                              const selectedShop =
                                draft.shop ||
                                (approvedMenus.length === 1
                                  ? approvedMenus[0].shop
                                  : "");
                              const selectedMenu = approvedMenus.find(
                                (menu) => menu.shop === selectedShop,
                              );
                              const selectedItem = (
                                selectedMenu?.items || []
                              ).find((item) => item.id === draft.menuItemId);
                              const availableSizes = [
                                ...new Set([
                                  ...(selectedItem?.variants || [])
                                    .map((variant) => variant.size)
                                    .filter(
                                      (size) => size && size !== "Mặc định",
                                    ),
                                  ...COMMON_DRINK_SIZES,
                                ]),
                              ];
                              const remoteEditing = {
                                shop: isRemoteEditing(
                                  activeInvitation.id,
                                  user.id,
                                  "shop",
                                ),
                                drink: isRemoteEditing(
                                  activeInvitation.id,
                                  user.id,
                                  "drink",
                                ),
                                size: isRemoteEditing(
                                  activeInvitation.id,
                                  user.id,
                                  "size",
                                ),
                                note: isRemoteEditing(
                                  activeInvitation.id,
                                  user.id,
                                  "note",
                                ),
                              };
                              const isRemoteUserOnPage = Boolean(
                                remotePageVisitors[
                                  `${activeInvitation.id}:${user.id}`
                                ],
                              );
                              return (
                                <TableRow
                                  key={user.id}
                                  hover
                                  sx={{
                                    bgcolor: isCurrentUser
                                      ? "rgba(115, 103, 240, 0.04)"
                                      : "inherit",
                                    transition: "background-color 180ms ease",
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
                                          sx={
                                            isRemoteUserOnPage
                                              ? {
                                                  color: "info.main",
                                                  animation:
                                                    "afternoonTeaNamePulse 2.2s ease-in-out infinite",
                                                  "@keyframes afternoonTeaNamePulse":
                                                    {
                                                      "0%, 100%": {
                                                        opacity: 0.5,
                                                        textShadow:
                                                          "0 0 0 rgba(0, 176, 255, 0)",
                                                      },
                                                      "50%": {
                                                        opacity: 1,
                                                        textShadow:
                                                          "0 0 9px rgba(0, 176, 255, 0.42)",
                                                      },
                                                    },
                                                }
                                              : undefined
                                          }
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
                                          select
                                          size="small"
                                          placeholder="Chọn quán"
                                          value={selectedShop}
                                          onFocus={() =>
                                            focusOrderField(
                                              activeInvitation.id,
                                              user.id,
                                              key,
                                              "shop",
                                              draft,
                                            )
                                          }
                                          onChange={(event) => {
                                            const nextShop = event.target.value;
                                            updateOrderDraft(
                                              activeInvitation.id,
                                              user.id,
                                              key,
                                              {
                                                ...draft,
                                                shop: nextShop,
                                                drink: "",
                                                menuItemId: "",
                                                size: "",
                                                price: 0,
                                              },
                                              "shop",
                                            );
                                          }}
                                          sx={remoteEditingSx(
                                            remoteEditing.shop,
                                            activeOrderField?.key === key &&
                                              activeOrderField.field === "shop",
                                          )}
                                          fullWidth
                                        >
                                          <MenuItem value="">
                                            <em>Chưa chọn quán</em>
                                          </MenuItem>
                                          {approvedMenus.map((menu) => (
                                            <MenuItem
                                              key={menu.id}
                                              value={menu.shop}
                                            >
                                              {menu.shop}
                                            </MenuItem>
                                          ))}
                                        </TextField>
                                      </TableCell>
                                      <TableCell>
                                        <Autocomplete
                                          freeSolo
                                          size="small"
                                          clearOnBlur={false}
                                          selectOnFocus
                                          disabled={!selectedMenu}
                                          onFocus={() =>
                                            focusOrderField(
                                              activeInvitation.id,
                                              user.id,
                                              key,
                                              "drink",
                                              draft,
                                            )
                                          }
                                          options={selectedMenu?.items || []}
                                          value={
                                            selectedItem || draft.drink || null
                                          }
                                          getOptionLabel={(item) =>
                                            typeof item === "string"
                                              ? item
                                              : item.name || ""
                                          }
                                          filterOptions={(options, state) =>
                                            options
                                              .filter((item) =>
                                                item.name
                                                  .toLocaleLowerCase("vi-VN")
                                                  .includes(
                                                    state.inputValue.toLocaleLowerCase(
                                                      "vi-VN",
                                                    ),
                                                  ),
                                              )
                                              .slice(0, 5)
                                          }
                                          onChange={(_, item) => {
                                            if (typeof item === "string") {
                                              updateOrderDraft(
                                                activeInvitation.id,
                                                user.id,
                                                key,
                                                {
                                                  ...draft,
                                                  shop: selectedShop,
                                                  menuItemId: "",
                                                  drink: item,
                                                  size: "",
                                                  price: 0,
                                                },
                                                "drink",
                                              );
                                              return;
                                            }
                                            const variant =
                                              item?.variants?.find(
                                                (value) =>
                                                  value.size !== "Mặc định",
                                              ) || item?.variants?.[0];
                                            updateOrderDraft(
                                              activeInvitation.id,
                                              user.id,
                                              key,
                                              {
                                                ...draft,
                                                shop: selectedShop,
                                                menuItemId: item?.id || "",
                                                drink: item?.name || "",
                                                size:
                                                  variant?.size === "Mặc định"
                                                    ? ""
                                                    : variant?.size || "",
                                                price: variant?.price || 0,
                                              },
                                              "drink",
                                            );
                                          }}
                                          onInputChange={(_, value, reason) => {
                                            if (reason !== "input") return;
                                            updateOrderDraft(
                                              activeInvitation.id,
                                              user.id,
                                              key,
                                              {
                                                ...draft,
                                                shop: selectedShop,
                                                menuItemId: "",
                                                drink: value,
                                                size: "",
                                                price: 0,
                                              },
                                              "drink",
                                            );
                                          }}
                                          sx={{
                                            minWidth: 320,
                                            ...remoteEditingSx(
                                              remoteEditing.drink,
                                              activeOrderField?.key === key &&
                                                activeOrderField.field ===
                                                  "drink",
                                            ),
                                          }}
                                          renderInput={(params) => (
                                            <TextField
                                              {...params}
                                              size="small"
                                              placeholder={
                                                selectedMenu
                                                  ? "Chọn hoặc nhập món..."
                                                  : "Chọn quán trước"
                                              }
                                            />
                                          )}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <TextField
                                          select
                                          fullWidth
                                          size="small"
                                          placeholder="Size"
                                          disabled={!draft.drink}
                                          value={draft.size || ""}
                                          onFocus={() =>
                                            focusOrderField(
                                              activeInvitation.id,
                                              user.id,
                                              key,
                                              "size",
                                              draft,
                                            )
                                          }
                                          onChange={(event) => {
                                            const variants =
                                              selectedItem?.variants || [];
                                            const variant =
                                              variants.find(
                                                (item) =>
                                                  item.size ===
                                                  event.target.value,
                                              ) ||
                                              variants.find(
                                                (item) =>
                                                  item.size === "Mặc định",
                                              );
                                            updateOrderDraft(
                                              activeInvitation.id,
                                              user.id,
                                              key,
                                              {
                                                ...draft,
                                                size: event.target.value,
                                                price: variant?.price || 0,
                                              },
                                              "size",
                                            );
                                          }}
                                          sx={remoteEditingSx(
                                            remoteEditing.size,
                                            activeOrderField?.key === key &&
                                              activeOrderField.field === "size",
                                          )}
                                        >
                                          <MenuItem value="">
                                            <em>&nbsp;</em>
                                          </MenuItem>
                                          {availableSizes.map((size) => (
                                            <MenuItem key={size} value={size}>
                                              {size}
                                            </MenuItem>
                                          ))}
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
                                            onFocus={() =>
                                              focusOrderField(
                                                activeInvitation.id,
                                                user.id,
                                                key,
                                                "note",
                                                draft,
                                              )
                                            }
                                            onChange={(event) => {
                                              updateOrderDraft(
                                                activeInvitation.id,
                                                user.id,
                                                key,
                                                {
                                                  ...draft,
                                                  note: event.target.value,
                                                },
                                                "note",
                                              );
                                            }}
                                            sx={remoteEditingSx(
                                              remoteEditing.note,
                                              activeOrderField?.key === key &&
                                                activeOrderField.field ===
                                                  "note",
                                            )}
                                          />
                                          <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            onClick={() => {
                                              const pendingTimer =
                                                orderAutoSaveTimers.current.get(
                                                  key,
                                                );
                                              if (pendingTimer)
                                                window.clearTimeout(
                                                  pendingTimer,
                                                );
                                              orderAutoSaveTimers.current.delete(
                                                key,
                                              );
                                              saveOrder(
                                                activeInvitation.id,
                                                user.id,
                                                draft,
                                              );
                                            }}
                                          >
                                            Lưu
                                          </Button>
                                        </Box>
                                      </TableCell>
                                    </>
                                  ) : (
                                    <>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {displayedOrder.shop || "—"}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                          color={
                                            displayedOrder.drink
                                              ? "primary.main"
                                              : "text.secondary"
                                          }
                                        >
                                          {displayedOrder.drink ||
                                            "Chưa chọn món"}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {displayedOrder.size || "—"}
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
                                            {displayedOrder.note || "—"}
                                          </Typography>
                                          {canEditOrder &&
                                            displayedOrder.drink && (
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

      <Dialog
        open={Boolean(reviewingMenu)}
        onClose={() => setReviewingMenu(null)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle>
          Kiểm tra menu các quán
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Mỗi quán là một tab. Bạn có thể đổi tên, thay ảnh và kiểm tra lại
            món, size, giá của từng menu.
          </Typography>
        </DialogTitle>
        <Tabs
          value={reviewingMenu || false}
          onChange={(_, value) => {
            setReviewingMenu(value);
            setReviewImageFile(null);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 3, borderBottom: "1px solid", borderColor: "divider" }}
        >
          {(activeInvitation?.menus || [])
            .filter((menu) => menuReviewDrafts[menu.id])
            .map((menu) => (
              <Tab
                key={menu.id}
                value={menu.id}
                label={menuReviewDrafts[menu.id]?.shop || menu.shop}
              />
            ))}
          {!activeInvitation?.menus?.some(
            (menu) => menu.id === reviewingMenu,
          ) &&
            reviewingMenu && <Tab value={reviewingMenu} label={reviewShop} />}
        </Tabs>
        <DialogContent sx={{ display: "grid", gap: 2, pt: "20px !important" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
              gap: 2,
              alignItems: "center",
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <TextField
              label="Tên quán"
              value={reviewShop}
              onChange={(event) =>
                setMenuReviewDrafts((previous) => ({
                  ...previous,
                  [reviewingMenu]: {
                    ...(previous[reviewingMenu] || { items: [] }),
                    shop: event.target.value,
                  },
                }))
              }
              fullWidth
            />
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Button component="label" size="small" variant="tonal">
                {reviewImageFile ? reviewImageFile.name : "Chọn ảnh mới"}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setReviewImageFile(file);
                    if (file) replaceReviewMenuImage(file);
                  }}
                />
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!reviewImageFile || replacingReviewImage}
                onClick={replaceReviewMenuImage}
              >
                {replacingReviewImage ? "Đang đọc ảnh..." : "Đọc lại ảnh"}
              </Button>
            </Box>
          </Box>
          {reviewItems.map((item, itemIndex) => (
            <Box
              key={item.id || itemIndex}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
              }}
            >
              <Box
                sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1.5 }}
              >
                <TextField
                  size="small"
                  label="Tên món"
                  value={item.name}
                  onChange={(event) =>
                    setReviewItems((items) =>
                      items.map((row, index) =>
                        index === itemIndex
                          ? { ...row, name: event.target.value }
                          : row,
                      ),
                    )
                  }
                  fullWidth
                />
                <IconButton
                  color="error"
                  onClick={() =>
                    setReviewItems((items) =>
                      items.filter((_, index) => index !== itemIndex),
                    )
                  }
                >
                  <i className="tabler-trash" />
                </IconButton>
              </Box>
              {(item.variants || []).map((variant, variantIndex) => (
                <Box
                  key={`${item.id}-${variantIndex}`}
                  sx={{ display: "flex", gap: 1, mb: 1 }}
                >
                  <TextField
                    size="small"
                    label="Size"
                    value={variant.size}
                    onChange={(event) =>
                      setReviewItems((items) =>
                        items.map((row, index) =>
                          index !== itemIndex
                            ? row
                            : {
                                ...row,
                                variants: row.variants.map((value, position) =>
                                  position === variantIndex
                                    ? { ...value, size: event.target.value }
                                    : value,
                                ),
                              },
                        ),
                      )
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="Giá (đ)"
                    type="number"
                    value={variant.price}
                    onChange={(event) =>
                      setReviewItems((items) =>
                        items.map((row, index) =>
                          index !== itemIndex
                            ? row
                            : {
                                ...row,
                                variants: row.variants.map((value, position) =>
                                  position === variantIndex
                                    ? { ...value, price: event.target.value }
                                    : value,
                                ),
                              },
                        ),
                      )
                    }
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    onClick={() =>
                      setReviewItems((items) =>
                        items.map((row, index) =>
                          index === itemIndex
                            ? {
                                ...row,
                                variants: row.variants.filter(
                                  (_, position) => position !== variantIndex,
                                ),
                              }
                            : row,
                        ),
                      )
                    }
                  >
                    <i className="tabler-x" />
                  </IconButton>
                </Box>
              ))}
              <Button
                size="small"
                onClick={() =>
                  setReviewItems((items) =>
                    items.map((row, index) =>
                      index === itemIndex
                        ? {
                            ...row,
                            variants: [
                              ...(row.variants || []),
                              { size: "", price: 0 },
                            ],
                          }
                        : row,
                    ),
                  )
                }
              >
                + Thêm size
              </Button>
            </Box>
          ))}
          <Button
            variant="tonal"
            onClick={() =>
              setReviewItems((items) => [
                ...items,
                {
                  id: `menu_item_${Date.now()}`,
                  name: "",
                  variants: [{ size: "Mặc định", price: 0 }],
                },
              ])
            }
          >
            + Thêm món
          </Button>
        </DialogContent>
        <DialogActions>
          <Button color="secondary" onClick={() => setReviewingMenu(null)}>
            Hủy
          </Button>
          <Button variant="contained" onClick={saveMenuReview}>
            Xác nhận lưu menu
          </Button>
        </DialogActions>
      </Dialog>

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
                  <ZoomableMenuImage
                    key={`${viewingShopId}-${menu.id}-${menu.imageUrl}`}
                    src={menu.imageUrl}
                    alt={`Menu ${menu.shop}`}
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
                <ZoomableMenuImage
                  key={`${viewingShopId}-${menu.id}-${menu.imageUrl}`}
                  src={menu.imageUrl}
                  alt={`Menu ${menu.shop}`}
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
