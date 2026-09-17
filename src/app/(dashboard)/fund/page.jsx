"use client";
import VietnameseDateField from "@/components/VietnameseDateField";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputBase from "@mui/material/InputBase";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import CustomTextField from "@core/components/mui/TextField";
import tableStyles from "@core/styles/table.module.css";
import { exportJsonToExcel } from "@/libs/excelHelper";
import { resolveAvatar } from "@/utils/getDefaultAvatar";
import { toast } from "react-toastify";
import ConfirmDialog from "@components/ConfirmDialog";
import FundStatistics from "./components/FundStatistics";
import {
  fundPaymentStatus,
  minimumOnlinePaymentAmount,
} from "@/libs/fundRules";
import DataTableToolbar from "@components/DataTableToolbar";
import TablePaginationComponent from "@components/TablePaginationComponent";
import {
  formatVietnamDate,
  formatVietnamDateTime,
  toVietnamDateKey,
} from "@/libs/dateTime";

const money = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(value || 0)} đ`;
const moneyInput = (value) =>
  value ? `${new Intl.NumberFormat("vi-VN").format(Number(value))} VNĐ` : "";
const localDate = () => toVietnamDateKey();
const departments = {
  web_app: "Web/App",
  ap: "AP",
  peer_admin: "Peer Admin",
  van_hanh: "Vận Hành",
};
const categories = {
  category_official: "Chính thức",
  category_probation: "Thử việc",
  category_intern: "Thực tập",
  category_collaborator: "Cộng tác viên",
};
const incomeTypes = [
  [
    "explanation_penalty",
    "Phạt giải trình công",
    "tabler-file-alert",
    "warning",
  ],
  ["shirt_penalty", "Phạt áo", "tabler-shirt", "error"],
  ["monthly_fund", "Quỹ tháng này", "tabler-calendar-dollar", "success"],
  ["happy_hour", "Happy Hour", "tabler-confetti", "primary"],
  ["other", "Thu khác", "tabler-cash-banknote", "info"],
];
const expenseTypes = [
  ["food_drink", "Ăn uống"],
  ["office", "Văn phòng"],
  ["event", "Sự kiện"],
  ["support", "Hỗ trợ thành viên"],
  ["other", "Chi khác"],
];

export default function FundPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [fund, setFund] = useState(null);
  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [membersOpen, setMembersOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("income");
  const [dialog, setDialog] = useState("");
  const [editingId, setEditingId] = useState("");
  const [incomeFilter, setIncomeFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cancelPaymentTarget, setCancelPaymentTarget] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState("");
  const [inlinePaymentAmount, setInlinePaymentAmount] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [minimumAmounts, setMinimumAmounts] = useState({
    category_official: 150000,
    category_probation: 150000,
    category_intern: 100000,
    category_collaborator: 100000,
  });
  const [cancelObligationTarget, setCancelObligationTarget] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("Được miễn");
  const [savingObligation, setSavingObligation] = useState(false);
  const [paymentMember, setPaymentMember] = useState(null);
  const [paymentThousands, setPaymentThousands] = useState("");
  const [paymentData, setPaymentData] = useState(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [pendingOrderCode, setPendingOrderCode] = useState("");
  const amountInputRef = useRef(null);
  const handledOrderCodesRef = useRef(new Set());

  const actualPaymentAmount =
    (Number(String(paymentThousands).replace(/\D/g, "")) || 0) * 1000;
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomePage, setIncomePage] = useState(1);
  const [incomeLimit, setIncomeLimit] = useState(10);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expensePage, setExpensePage] = useState(1);
  const [expenseLimit, setExpenseLimit] = useState(10);
  const [form, setForm] = useState({
    category: "explanation_penalty",
    amount: "",
    date: localDate(),
    note: "",
    userId: "",
  });
  const canManage = ["admin", "assistant"].includes(session?.user?.role);

  useEffect(() => {
    const section = searchParams.get("section");
    setActiveSection(
      ["income", "expense", "members"].includes(section) ? section : "income",
    );
    const returnedOrderCode = searchParams.get("orderCode");
    if (
      returnedOrderCode &&
      !handledOrderCodesRef.current.has(returnedOrderCode)
    )
      setPendingOrderCode(returnedOrderCode);
  }, [searchParams]);

  const loadFund = async (selected) => {
    const [month, year] = selected ? selected.split("/") : [];
    const response = await fetch(
      selected ? `/api/funds?month=${+month}&year=${+year}` : "/api/funds",
    );
    if (!response.ok) throw new Error("Không thể tải dữ liệu quỹ");
    const data = await response.json();
    setFund(data);
    if (!selected && data.month)
      setPeriod(`${String(data.month).padStart(2, "0")}/${data.year}`);
  };

  useEffect(() => {
    Promise.all([
      loadFund(""),
      fetch("/api/users?limit=200").then((r) => r.json()),
      fetch("/api/fund-settings").then((r) => r.json()),
    ])
      .then(([, data, settings]) => {
        setUsers(data.data || []);
        setMinimumAmounts(settings.minimumAmounts || minimumAmounts);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const minimumFor = (member) =>
    Number(
      member.requiredAmount ??
        fund?.contributionSnapshot?.[member.categoryId] ??
        minimumAmounts[member.categoryId] ??
        100000,
    );
  const paymentStatusFor = (member) => {
    return fundPaymentStatus({ ...member, requiredAmount: minimumFor(member) });
  };
  const beginPaymentEdit = (member) => {
    setEditingPaymentId(member.id);
    setInlinePaymentAmount(member.paid ? String(member.amount || "") : "");
  };
  const cancelPaymentEdit = () => {
    setEditingPaymentId("");
    setInlinePaymentAmount("");
  };
  const createPayment = async () => {
    if (creatingPayment) return;
    if (
      !Number.isSafeInteger(actualPaymentAmount) ||
      actualPaymentAmount < minimumOnlinePaymentAmount
    ) {
      toast.error(`Số tiền đóng phải từ ${money(minimumOnlinePaymentAmount)}`);
      return;
    }
    setCreatingPayment(true);
    try {
      const [month, year] = period.split("/").map(Number);
      const response = await fetch("/api/fund-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, amount: actualPaymentAmount }),
      });
      const data = await response.json();
      if (!response.ok) {
        return toast.error(data.error || "Không thể tạo thanh toán");
      }
      setPaymentData(data);
      setPendingOrderCode(String(data.orderCode));
    } catch {
      toast.error("Không thể tạo mã QR. Vui lòng thử lại.");
    } finally {
      setCreatingPayment(false);
    }
  };
  const closePaymentDialog = () => {
    setPaymentMember(null);
    setPaymentData(null);
    setPaymentThousands("");
  };

  useEffect(() => {
    const orderCode = paymentData?.orderCode || pendingOrderCode;
    if (!orderCode || paymentData?.status === "PAID") return undefined;
    let active = true;
    let inFlight = false;
    let finished = false;
    const clearReturnedOrder = () => {
      handledOrderCodesRef.current.add(String(orderCode));
      const url = new URL(window.location.href);
      if (url.searchParams.get("orderCode") === String(orderCode)) {
        ["orderCode", "status", "cancel", "code", "id"].forEach((key) =>
          url.searchParams.delete(key),
        );
        router.replace(url.pathname + url.search, { scroll: false });
      }
    };
    const checkPayment = async () => {
      if (!active || inFlight || finished) return;
      inFlight = true;
      try {
        const response = await fetch(
          `/api/fund-payments?orderCode=${orderCode}`,
        );
        const data = await response.json();
        if (!active) return;
        if ([400, 403, 404].includes(response.status)) {
          finished = true;
          setPendingOrderCode("");
          setPaymentData(null);
          clearReturnedOrder();
          toast.error(
            data.error ||
              "Không tìm thấy đơn thanh toán. Vui lòng kiểm tra lại.",
          );
          return;
        }
        if (active && response.ok && data.paid) {
          await loadFund(period);
          if (!active) return;
          finished = true;
          toast.success("Bạn đã đóng quỹ thành công");
          setPaymentData((current) =>
            current ? { ...current, status: "PAID" } : current,
          );
          setPendingOrderCode("");
          clearReturnedOrder();
        }
      } catch {
        // Retry transient network errors on the next poll.
      } finally {
        inFlight = false;
      }
    };
    checkPayment();
    const timer = setInterval(checkPayment, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [paymentData, pendingOrderCode, period, router]);

  const members = useMemo(
    () =>
      (fund?.members || [])
        .map((payment) => {
          const user = users.find((user) => user.id === payment.userId) || {
            id: payment.userId,
            name: payment.memberName || "Nhân sự đã nghỉ",
          };
          return {
            ...user,
            ...payment,
            id: payment.userId,
            paid: Boolean(payment?.paid),
            amount: payment?.amount || 0,
            paidAt: payment?.paidAt,
          };
        })
        .sort((a, b) => {
          const rank = (member) => {
            if (member.id === session?.user?.id) return 0;
            return fundPaymentStatus(member).rank;
          };
          return rank(a) - rank(b) || a.name.localeCompare(b.name, "vi");
        }),
    [users, fund, session?.user?.id, minimumAmounts],
  );

  const incomeTotals = useMemo(() => {
    const values = Object.fromEntries(incomeTypes.map(([key]) => [key, 0]));
    values.monthly_fund = fund?.memberIncome || 0;
    (fund?.incomes || []).forEach((item) => {
      values[item.category || "other"] += item.amount || 0;
    });
    return values;
  }, [fund]);

  const incomeRows = useMemo(
    () =>
      [
        ...(fund?.members || [])
          .filter((member) => member.paid)
          .map((member) => ({
            id: `monthly-fund-${member.userId}`,
            category: "monthly_fund",
            userId: member.userId,
            userName:
              users.find((user) => user.id === member.userId)?.name || "—",
            amount: member.amount || 0,
            receivedAt: member.paidAt,
            locked: true,
          })),
        ...(fund?.incomes || []),
      ].sort(
        (a, b) =>
          new Date(a.receivedAt || a.createdAt) -
          new Date(b.receivedAt || b.createdAt),
      ),
    [fund, users],
  );
  const filteredIncomeRows = useMemo(
    () =>
      incomeFilter === "all"
        ? incomeRows
        : incomeRows.filter((item) => item.category === incomeFilter),
    [incomeFilter, incomeRows],
  );
  const visibleIncomeRows = useMemo(
    () =>
      filteredIncomeRows.filter((item) => {
        const date = item.receivedAt || item.createdAt;
        return `${item.userName} ${item.note} ${item.title} ${formatVietnamDate(date)} ${toVietnamDateKey(date)}`
          .toLowerCase()
          .includes(incomeSearch.toLowerCase().trim());
      }),
    [filteredIncomeRows, incomeSearch],
  );
  const visibleExpenseRows = useMemo(
    () =>
      (fund?.expenses || []).filter((item) => {
        const date = item.spentAt || item.createdAt;
        return `${item.note} ${item.createdByName} ${item.title} ${formatVietnamDate(date)} ${toVietnamDateKey(date)}`
          .toLowerCase()
          .includes(expenseSearch.toLowerCase().trim());
      }),
    [fund, expenseSearch],
  );

  const openDialog = (kind) => {
    setForm({
      category: kind === "income" ? "explanation_penalty" : "food_drink",
      amount: "",
      date: localDate(),
      note: "",
      userId: "",
    });
    setEditingId("");
    setDialog(kind);
  };

  const editTransaction = (kind, item) => {
    setForm({
      category: item.category || "other",
      amount: String(item.amount || ""),
      date: toVietnamDateKey(item.receivedAt || item.spentAt || item.createdAt),
      note: item.note || "",
      userId: item.userId || "",
    });
    setEditingId(item.id);
    setDialog(kind);
  };

  const saveTransaction = async () => {
    try {
      setSaving(true);
      const [month, year] = period.split("/").map(Number);
      const response = await fetch("/api/funds", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          transactionId: editingId,
          kind: dialog,
          amount: +form.amount,
          month,
          year,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Không thể lưu giao dịch");
      setFund(data);
      const usersData = await fetch("/api/users?limit=200").then((response) =>
        response.json(),
      );
      setUsers(usersData.data || []);
      setDialog("");
      setEditingId("");
      toast.success("Đã lưu giao dịch quỹ");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (kind, item) => {
    try {
      const [month, year] = period.split("/").map(Number);
      const response = await fetch("/api/funds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, transactionId: item.id, month, year }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Không thể xóa giao dịch");
      setFund(data);
      const usersData = await fetch("/api/users?limit=200").then((response) =>
        response.json(),
      );
      setUsers(usersData.data || []);
      toast.success("Đã xóa giao dịch quỹ");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateMemberPayment = async (member, paid, amountOverride) => {
    try {
      const amount = paid ? Number(amountOverride) : 0;
      if (paid && (!Number.isInteger(amount) || amount <= 0)) {
        toast.error("Vui lòng nhập số tiền đã đóng hợp lệ");
        return;
      }
      setSavingPayment(true);
      const [month, year] = period.split("/").map(Number);
      const response = await fetch("/api/funds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "member",
          userId: member.id,
          paid,
          amount,
          month,
          year,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Không thể duyệt đóng quỹ");
      setFund(result);
      toast.success(
        paid
          ? `Đã xác nhận ${member.name} đóng quỹ`
          : `Đã hủy duyệt đóng quỹ của ${member.name}`,
      );
      setCancelPaymentTarget(null);
      cancelPaymentEdit();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingPayment(false);
    }
  };

  const exportMembers = () =>
    exportJsonToExcel(
      members.map((member) => {
        const pStatus = paymentStatusFor(member);
        const hideDiff =
          pStatus.key === "cancelled" ||
          pStatus.key === "unpaid" ||
          Boolean(member.voluntarySurplus);
        return {
          "Mã nhân sự": member.code || "—",
          "Họ và tên": member.name,
          "Hình thức": categories[member.categoryId] || "—",
          "Trạng thái": pStatus.label,
          "Số tiền cần đóng": member.requiredAmount || 0,
          "Số tiền thực tế": member.paid ? member.amount : 0,
          "Chênh lệch": hideDiff ? "—" : member.difference || 0,
          "Thời gian đóng": member.paidAt || "—",
        };
      }),
      `quy_phong_${period.replace("/", "_")}.xlsx`,
    );

  if (loading)
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Box textAlign="center">
          <CircularProgress />
          <Typography color="text.secondary" mt={2}>
            Đang tải dữ liệu quỹ...
          </Typography>
        </Box>
      </Box>
    );

  return (
    <Box>
      <Card sx={{ mb: 4 }}>
        <CardHeader
          sx={{ alignItems: "center", "& .MuiCardHeader-action": { m: 0 } }}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: "rgba(115,103,240,.12)", color: "primary.main" }}
              >
                <i className="tabler-wallet" />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Quản lý quỹ phòng
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Theo dõi nguồn thu, khoản chi và số dư minh bạch theo từng kỳ
                </Typography>
              </Box>
            </Box>
          }
          action={
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <CustomTextField
                type="month"
                size="small"
                label="Kỳ theo dõi"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: "2000-01", max: "2100-12" }}
                value={period.split("/").reverse().join("-")}
                onChange={async (event) => {
                  if (!/^\d{4}-\d{2}$/.test(event.target.value)) return;
                  const value = event.target.value
                    .split("-")
                    .reverse()
                    .join("/");
                  setPeriod(value);
                  try {
                    await loadFund(value);
                  } catch (error) {
                    toast.error(error.message);
                  }
                }}
                sx={{ minWidth: 180 }}
              />
            </Box>
          }
        />
      </Card>

      {fund?.isFuture && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Kỳ tương lai — danh sách theo nhân sự hiện tại. Chỉ quản trị viên và
          trợ lý được cập nhật trước; thành viên chưa thể thanh toán.
        </Typography>
      )}
      {activeSection !== "members" && (
        <Grid container spacing={4} mb={4}>
          <Grid size={{ xs: 12 }}>
            {activeSection === "income" && (
              <Card sx={{ height: "100%" }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          bgcolor: "rgba(115,103,240,.12)",
                          color: "primary.main",
                        }}
                      >
                        <i className="tabler-trending-up" />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight={700}>
                          Nguồn thu
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Phân loại rõ từng nguồn tiền vào quỹ
                        </Typography>
                      </Box>
                    </Box>
                  }
                  action={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <CustomTextField
                        select
                        size="small"
                        label="Loại nguồn thu"
                        value={incomeFilter}
                        onChange={(event) =>
                          setIncomeFilter(event.target.value)
                        }
                        sx={{ minWidth: 190 }}
                      >
                        <MenuItem value="all">Tất cả nguồn thu</MenuItem>
                        {incomeTypes.map(([key, label]) => (
                          <MenuItem key={key} value={key}>
                            {label}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                      {canManage && (
                        <Button
                          color="success"
                          variant="tonal"
                          startIcon={<i className="tabler-plus" />}
                          onClick={() => openDialog("income")}
                        >
                          Thêm khoản thu
                        </Button>
                      )}
                    </Box>
                  }
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={1.5}>
                    {[
                      [
                        "all",
                        "Tổng nguồn thu",
                        "tabler-cash-banknote",
                        "primary",
                      ],
                      ...incomeTypes,
                    ].map(([key, label, icon]) => (
                      <Grid key={key} size={{ xs: 12, sm: 6, lg: 2 }}>
                        <Box
                          role="button"
                          tabIndex={0}
                          onClick={() => setIncomeFilter(key)}
                          sx={{
                            p: 1.5,
                            display: "flex",
                            gap: 1.5,
                            alignItems: "center",
                            borderRadius: 2,
                            bgcolor:
                              incomeFilter === key
                                ? "rgba(115,103,240,.12)"
                                : "action.hover",
                            border: "1px solid",
                            borderColor:
                              incomeFilter === key
                                ? "primary.main"
                                : "transparent",
                            cursor: "pointer",
                          }}
                        >
                          <Avatar
                            variant="rounded"
                            sx={{
                              bgcolor: "rgba(115,103,240,.12)",
                              color: "primary.main",
                            }}
                          >
                            <i className={icon} />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {label}
                            </Typography>
                            <Typography fontWeight={700}>
                              {money(
                                key === "all"
                                  ? fund?.totalIncome
                                  : incomeTotals[key],
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <DataTableToolbar
                    search={incomeSearch}
                    onSearchChange={(value) => {
                      setIncomeSearch(value);
                      setIncomePage(1);
                    }}
                    limit={incomeLimit}
                    onLimitChange={(value) => {
                      setIncomeLimit(value);
                      setIncomePage(1);
                    }}
                    placeholder="Tìm người nộp, nội dung hoặc ngày thu..."
                  />
                  <TableContainer
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {incomeFilter === "all" && (
                            <TableCell>LOẠI THU</TableCell>
                          )}
                          <TableCell>NGƯỜI NỘP</TableCell>
                          <TableCell>GHI CHÚ</TableCell>
                          <TableCell>NGÀY THU</TableCell>
                          <TableCell align="right">SỐ TIỀN</TableCell>
                          <TableCell align="center">THAO TÁC</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {visibleIncomeRows
                          .slice(
                            (incomePage - 1) * incomeLimit,
                            incomePage * incomeLimit,
                          )
                          .map((item) => (
                            <TableRow key={item.id} hover>
                              {incomeFilter === "all" && (
                                <TableCell>
                                  <Chip
                                    size="small"
                                    variant="tonal"
                                    color={
                                      incomeTypes.find(
                                        ([key]) => key === item.category,
                                      )?.[3] || "info"
                                    }
                                    label={
                                      incomeTypes.find(
                                        ([key]) => key === item.category,
                                      )?.[1] || "Thu khác"
                                    }
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                {item.userName || "Công ty"}
                              </TableCell>
                              <TableCell>{item.note || "—"}</TableCell>
                              <TableCell>
                                {item.locked
                                  ? `Tháng ${period}`
                                  : formatVietnamDate(
                                      item.receivedAt || item.createdAt,
                                    )}
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  color="success.main"
                                  fontWeight={700}
                                >
                                  +{money(item.amount)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {item.locked || !canManage ? (
                                  "—"
                                ) : (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() =>
                                        editTransaction("income", item)
                                      }
                                    >
                                      <i className="tabler-edit" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        setDeleteTarget({
                                          kind: "income",
                                          item,
                                        })
                                      }
                                    >
                                      <i className="tabler-trash" />
                                    </IconButton>
                                  </Box>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        {!visibleIncomeRows.length && (
                          <TableRow>
                            <TableCell
                              colSpan={incomeFilter === "all" ? 6 : 5}
                              align="center"
                            >
                              <Typography color="text.secondary" py={4}>
                                Chưa có nguồn thu trong kỳ
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePaginationComponent
                    page={incomePage}
                    total={visibleIncomeRows.length}
                    limit={incomeLimit}
                    onPageChange={(_, nextPage) => setIncomePage(nextPage + 1)}
                  />
                </CardContent>
              </Card>
            )}

            {activeSection === "expense" && (
              <Card sx={{ height: "100%" }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          bgcolor: "rgba(115,103,240,.12)",
                          color: "primary.main",
                        }}
                      >
                        <i className="tabler-trending-down" />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight={700}>
                          Tiền chi
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Theo dõi rõ từng khoản tiền ra khỏi quỹ
                        </Typography>
                      </Box>
                    </Box>
                  }
                  action={
                    canManage && (
                      <Button
                        color="error"
                        variant="tonal"
                        startIcon={<i className="tabler-plus" />}
                        onClick={() => openDialog("expense")}
                      >
                        Thêm khoản chi
                      </Button>
                    )
                  }
                />
                <Divider />
                <DataTableToolbar
                  search={expenseSearch}
                  onSearchChange={(value) => {
                    setExpenseSearch(value);
                    setExpensePage(1);
                  }}
                  limit={expenseLimit}
                  onLimitChange={(value) => {
                    setExpenseLimit(value);
                    setExpensePage(1);
                  }}
                  placeholder="Tìm nội dung, người thực hiện hoặc ngày chi..."
                />
                <Divider />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>NHÓM CHI</TableCell>
                        <TableCell>GHI CHÚ</TableCell>
                        <TableCell>NGƯỜI THỰC HIỆN</TableCell>
                        <TableCell>NGÀY CHI</TableCell>
                        <TableCell align="right">SỐ TIỀN</TableCell>
                        <TableCell align="center">THAO TÁC</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleExpenseRows
                        .slice(
                          (expensePage - 1) * expenseLimit,
                          expensePage * expenseLimit,
                        )
                        .map((item) => (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Chip
                                size="small"
                                variant="tonal"
                                color="error"
                                label={
                                  expenseTypes.find(
                                    ([key]) => key === item.category,
                                  )?.[1] || "Chi khác"
                                }
                              />
                            </TableCell>
                            <TableCell>{item.note || "—"}</TableCell>
                            <TableCell>{item.createdByName || "—"}</TableCell>
                            <TableCell>
                              {formatVietnamDate(
                                item.spentAt || item.createdAt,
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography color="error.main" fontWeight={700}>
                                −{money(item.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {canManage ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                  }}
                                >
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() =>
                                      editTransaction("expense", item)
                                    }
                                  >
                                    <i className="tabler-edit" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      setDeleteTarget({ kind: "expense", item })
                                    }
                                  >
                                    <i className="tabler-trash" />
                                  </IconButton>
                                </Box>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      {!visibleExpenseRows.length && (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography color="text.secondary" py={4}>
                              Chưa có khoản chi trong kỳ
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePaginationComponent
                  page={expensePage}
                  total={visibleExpenseRows.length}
                  limit={expenseLimit}
                  onPageChange={(_, nextPage) => setExpensePage(nextPage + 1)}
                />
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {activeSection === "members" && (
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: "rgba(115,103,240,.12)",
                    color: "primary.main",
                  }}
                >
                  <i className="tabler-list-check" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Danh sách đóng quỹ
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bảng theo dõi đóng quỹ thành viên theo từng tháng
                  </Typography>
                </Box>
              </Box>
            }
            action={
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Chip
                  size="small"
                  color="success"
                  variant="tonal"
                  label={`${fund?.paidCount || 0}/${members.length} đã đóng`}
                  sx={{ width: 124, height: 32 }}
                />
                <Button
                  size="small"
                  variant="tonal"
                  color="secondary"
                  startIcon={<i className="tabler-file-spreadsheet" />}
                  onClick={exportMembers}
                  sx={{ width: 124, height: 32 }}
                >
                  Xuất Excel
                </Button>
                <IconButton
                  aria-label={membersOpen ? "Ẩn danh sách" : "Mở danh sách"}
                  onClick={() => setMembersOpen((value) => !value)}
                >
                  <i
                    className={
                      membersOpen ? "tabler-chevron-up" : "tabler-chevron-down"
                    }
                  />
                </IconButton>
              </Box>
            }
          />
          <Collapse in={membersOpen}>
            <Divider />
            <TableContainer>
              <Table className={tableStyles.table}>
                <TableHead>
                  <TableRow>
                    <TableCell>MÃ</TableCell>
                    <TableCell>NHÂN SỰ</TableCell>
                    <TableCell align="center" sx={{ width: 170 }}>
                      <Box
                        component="span"
                        sx={{ display: "flex", justifyContent: "center" }}
                      >
                        HÌNH THỨC
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ width: 170 }}>
                      <Box
                        component="span"
                        sx={{ display: "flex", justifyContent: "center" }}
                      >
                        TRẠNG THÁI
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ width: 170 }}>
                      <Box
                        component="span"
                        sx={{ display: "flex", justifyContent: "center" }}
                      >
                        SỐ TIỀN CẦN ĐÓNG
                      </Box>
                    </TableCell>
                    <TableCell align="center">SỐ TIỀN THỰC TẾ</TableCell>
                    <TableCell align="center">CHÊNH LỆCH</TableCell>
                    <TableCell align="center">THỜI GIAN ĐÓNG</TableCell>
                    {canManage && <TableCell align="center">DUYỆT</TableCell>}
                    <TableCell align="center">THAO TÁC</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => {
                    const isCurrentUser = member.id === session?.user?.id;
                    const paymentStatus = paymentStatusFor(member);
                    const isEditingPayment = editingPaymentId === member.id;
                    return (
                      <TableRow
                        key={member.id}
                        hover
                        sx={{
                          bgcolor: isCurrentUser
                            ? "rgba(115, 103, 240, 0.04)"
                            : "inherit",
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {member.code || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.5,
                              alignItems: "center",
                            }}
                          >
                            <Avatar
                              src={resolveAvatar(member)}
                              sx={{ width: 32, height: 32 }}
                            />
                            <Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "baseline",
                                  gap: 0.75,
                                }}
                              >
                                <Typography variant="body2" fontWeight={600}>
                                  {member.name}
                                </Typography>
                                {isCurrentUser && (
                                  <Typography
                                    variant="caption"
                                    color="primary.main"
                                    fontWeight={600}
                                    sx={{ whiteSpace: "nowrap" }}
                                  >
                                    (Bạn)
                                  </Typography>
                                )}
                              </Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {member.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">
                            {categories[member.categoryId] || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              width: "100%",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Chip
                              size="small"
                              variant="tonal"
                              color={paymentStatus.color}
                              label={paymentStatus.label}
                              sx={
                                member.obligationCancelled
                                  ? {
                                      bgcolor: "rgba(115,103,240,.16)",
                                      color: "#7367f0",
                                    }
                                  : undefined
                              }
                            />
                            {member.obligationCancelled && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  maxWidth: 170,
                                  textAlign: "center",
                                  whiteSpace: "normal",
                                }}
                              >
                                {member.cancellationReason || "Đã hủy"}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>
                            {money(member.requiredAmount || 0)}
                          </Typography>
                          {Boolean(member.carryIn) && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              {member.carryIn > 0
                                ? "Trừ dư kỳ trước: "
                                : "Cộng thiếu kỳ trước: "}
                              {money(Math.abs(member.carryIn))}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {isEditingPayment ? (
                            <CustomTextField
                              autoFocus
                              size="small"
                              value={moneyInput(inlinePaymentAmount)}
                              placeholder="Nhập số tiền"
                              onChange={(event) =>
                                setInlinePaymentAmount(
                                  event.target.value.replace(/\D/g, ""),
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter")
                                  updateMemberPayment(
                                    member,
                                    true,
                                    inlinePaymentAmount,
                                  );
                                if (event.key === "Escape") cancelPaymentEdit();
                              }}
                              inputProps={{ inputMode: "numeric" }}
                              sx={{ width: 155 }}
                              helperText={`Mức đóng của kỳ: ${money(minimumFor(member))}`}
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color={
                                member.paid ? "text.primary" : "text.disabled"
                              }
                            >
                              {money(member.paid ? member.amount : 0)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {paymentStatus.key === "cancelled" ||
                          paymentStatus.key === "unpaid" ||
                          member.voluntarySurplus ? (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          ) : (
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color={
                                member.difference > 0
                                  ? "primary.main"
                                  : member.difference < 0
                                    ? "error.main"
                                    : "text.secondary"
                              }
                            >
                              {member.difference > 0
                                ? "+"
                                : member.difference < 0
                                  ? "−"
                                  : ""}
                              {money(Math.abs(member.difference || 0))}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">
                            {member.paidAt
                              ? formatVietnamDateTime(member.paidAt)
                              : "—"}
                          </Typography>
                        </TableCell>
                        {canManage && (
                          <TableCell align="center">
                            {isEditingPayment ||
                            member.obligationCancelled ||
                            (!member.paid && member.requiredAmount === 0) ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            ) : !member.paid ? (
                              <IconButton
                                color="success"
                                size="small"
                                aria-label={`Xác nhận ${member.name} đã đóng quỹ`}
                                onClick={() => beginPaymentEdit(member)}
                              >
                                <i className="tabler-circle-check" />
                              </IconButton>
                            ) : (
                              <IconButton
                                color="error"
                                size="small"
                                aria-label={`Hủy duyệt đóng quỹ của ${member.name}`}
                                onClick={() => setCancelPaymentTarget(member)}
                              >
                                <i className="tabler-circle-x" />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 1,
                            }}
                          >
                            {isEditingPayment && canManage ? (
                              <>
                                <IconButton
                                  color="success"
                                  size="small"
                                  disabled={savingPayment}
                                  aria-label={`Lưu số tiền đóng quỹ của ${member.name}`}
                                  onClick={() =>
                                    updateMemberPayment(
                                      member,
                                      true,
                                      inlinePaymentAmount,
                                    )
                                  }
                                >
                                  {savingPayment ? (
                                    <CircularProgress size={18} />
                                  ) : (
                                    <i className="tabler-check" />
                                  )}
                                </IconButton>
                                <IconButton
                                  color="secondary"
                                  size="small"
                                  disabled={savingPayment}
                                  aria-label="Hủy chỉnh sửa"
                                  onClick={cancelPaymentEdit}
                                >
                                  <i className="tabler-x" />
                                </IconButton>
                              </>
                            ) : canManage &&
                              member.paid &&
                              !member.obligationCancelled ? (
                              <IconButton
                                color="primary"
                                size="small"
                                aria-label={`Sửa số tiền đóng quỹ của ${member.name}`}
                                onClick={() => beginPaymentEdit(member)}
                              >
                                <i className="tabler-edit" />
                              </IconButton>
                            ) : member.id === session?.user?.id &&
                              !member.paid &&
                              !fund?.isFuture &&
                              member.requiredAmount > 0 &&
                              !member.obligationCancelled ? (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => {
                                  setPaymentMember(member);
                                  const required = minimumFor(member);
                                  const inThousands =
                                    Math.floor(required / 1000) || "";
                                  setPaymentThousands(
                                    inThousands
                                      ? Number(inThousands).toLocaleString(
                                          "vi-VN",
                                        )
                                      : "",
                                  );
                                  setPaymentData(null);
                                }}
                              >
                                Đóng quỹ
                              </Button>
                            ) : (
                              !canManage && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  —
                                </Typography>
                              )
                            )}
                            {canManage && (
                              <IconButton
                                color={
                                  member.obligationCancelled
                                    ? "primary"
                                    : "warning"
                                }
                                size="small"
                                aria-label={
                                  member.obligationCancelled
                                    ? "Khôi phục nghĩa vụ đóng"
                                    : "Hủy nghĩa vụ đóng"
                                }
                                title={
                                  member.obligationCancelled
                                    ? "Khôi phục nghĩa vụ đóng"
                                    : "Hủy nghĩa vụ đóng"
                                }
                                onClick={() => {
                                  setCancelObligationTarget(member);
                                  setCancellationReason("Được miễn");
                                }}
                              >
                                <i
                                  className={
                                    member.obligationCancelled
                                      ? "tabler-restore"
                                      : "tabler-ban"
                                  }
                                />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Card>
      )}

      {activeSection === "members" && (
        <FundStatistics period={period} revision={fund} />
      )}
      <Dialog
        open={Boolean(cancelObligationTarget)}
        onClose={() => !savingObligation && setCancelObligationTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {cancelObligationTarget?.obligationCancelled
            ? "Khôi phục nghĩa vụ đóng quỹ"
            : "Hủy nghĩa vụ đóng quỹ"}
        </DialogTitle>
        <DialogContent>
          <Typography mb={3}>
            {cancelObligationTarget?.name} — kỳ {period}. Các khoản đã thu vẫn
            được giữ nguyên.
          </Typography>
          {!cancelObligationTarget?.obligationCancelled && (
            <>
              <CustomTextField
                select
                fullWidth
                label="Lý do"
                value={
                  ["Được miễn", "Nghỉ việc"].includes(cancellationReason)
                    ? cancellationReason
                    : "Khác"
                }
                onChange={(e) =>
                  setCancellationReason(
                    e.target.value === "Khác" ? "" : e.target.value,
                  )
                }
                sx={{ mt: 1, mb: 3 }}
              >
                <MenuItem value="Được miễn">Được miễn</MenuItem>
                <MenuItem value="Nghỉ việc">Nghỉ việc</MenuItem>
                <MenuItem value="Khác">Khác</MenuItem>
              </CustomTextField>
              <CustomTextField
                fullWidth
                required
                multiline
                label="Chi tiết lý do"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={savingObligation}
            onClick={() => setCancelObligationTarget(null)}
          >
            Đóng
          </Button>
          <Button
            variant="contained"
            disabled={
              savingObligation ||
              (!cancelObligationTarget?.obligationCancelled &&
                !cancellationReason.trim())
            }
            onClick={async () => {
              setSavingObligation(true);
              try {
                const [month, year] = period.split("/").map(Number);
                const response = await fetch("/api/funds", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    kind: "member",
                    userId: cancelObligationTarget.id,
                    month,
                    year,
                    obligationCancelled:
                      !cancelObligationTarget.obligationCancelled,
                    cancellationReason,
                  }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                setFund(data);
                setCancelObligationTarget(null);
                toast.success("Đã cập nhật nghĩa vụ đóng quỹ");
              } catch (error) {
                toast.error(error.message);
              } finally {
                setSavingObligation(false);
              }
            }}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(dialog)}
        onClose={() => !saving && setDialog("")}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingId
            ? "Chỉnh sửa giao dịch"
            : dialog === "income"
              ? "Thêm khoản thu"
              : "Thêm khoản chi"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2.5} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                select
                fullWidth
                label={dialog === "income" ? "Nguồn thu" : "Nhóm chi"}
                value={form.category}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    category: event.target.value,
                  }))
                }
              >
                {(dialog === "income"
                  ? incomeTypes.filter(([key]) => key !== "monthly_fund")
                  : expenseTypes
                ).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <VietnameseDateField
                fullWidth
                type="date"
                label="Ngày giao dịch"
                value={form.date}
                onChange={(event) =>
                  setForm((value) => ({ ...value, date: event.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {dialog === "income" && form.category !== "happy_hour" && (
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={users.filter((user) => user.status === "able")}
                  value={users.find((user) => user.id === form.userId) || null}
                  onChange={(_, user) =>
                    setForm((value) => ({ ...value, userId: user?.id || "" }))
                  }
                  getOptionLabel={(user) =>
                    `${user.name} — ${user.code || "Chưa có mã"}`
                  }
                  filterOptions={(options, state) => {
                    const keyword = state.inputValue.toLowerCase().trim();
                    return options.filter((user) =>
                      [user.name, user.email, user.code].some((value) =>
                        String(value || "")
                          .toLowerCase()
                          .includes(keyword),
                      ),
                    );
                  }}
                  noOptionsText="Không tìm thấy nhân sự phù hợp"
                  renderOption={(props, user) => {
                    const { key, ...optionProps } = props;

                    return (
                      <Box
                        component="li"
                        key={key}
                        {...optionProps}
                        sx={{ display: "flex", gap: 1.5 }}
                      >
                        <Avatar
                          src={resolveAvatar(user)}
                          sx={{ width: 32, height: 32 }}
                        />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {user.name} · {user.code || "Chưa có mã"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      required
                      label="Nhân sự nộp tiền"
                      placeholder="Tìm theo tên, email hoặc mã nhân sự"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <i
                              className="tabler-search"
                              style={{ marginRight: 8 }}
                            />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                required
                label="Số tiền"
                value={moneyInput(form.amount)}
                placeholder="32.000 VNĐ"
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    amount: event.target.value.replace(/\D/g, ""),
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                multiline
                minRows={3}
                label="Ghi chú"
                value={form.note}
                onChange={(event) =>
                  setForm((value) => ({ ...value, note: event.target.value }))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialog("")} disabled={saving}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color={dialog === "income" ? "success" : "error"}
            onClick={saveTransaction}
            disabled={
              saving ||
              +form.amount <= 0 ||
              (dialog === "income" &&
                form.category !== "happy_hour" &&
                !form.userId)
            }
          >
            {saving ? "Đang lưu..." : "Lưu giao dịch"}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa giao dịch"
        message="Bạn có chắc muốn xóa giao dịch quỹ này? Dữ liệu sau khi xóa sẽ không thể khôi phục."
        confirmText="Xóa giao dịch"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTransaction(deleteTarget.kind, deleteTarget.item)
        }
      />
      <Dialog
        open={Boolean(paymentMember)}
        onClose={closePaymentDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            maxWidth: 680,
            width: "100%",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                color: "primary.main",
                bgcolor: "rgba(115, 103, 240, 0.12)",
              }}
            >
              <i className="tabler-wallet" />
            </Box>
            <Box>
              <Typography variant="h5">Đóng quỹ phòng</Typography>
              <Typography variant="body2" color="text.secondary">
                Quét mã QR hoặc mở trang thanh toán
              </Typography>
            </Box>
            <IconButton
              aria-label="Đóng cửa sổ đóng quỹ"
              onClick={closePaymentDialog}
              sx={{ ml: "auto" }}
            >
              <i className="tabler-x" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {paymentData?.status === "PAID" ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  mx: "auto",
                  mb: 2,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "success.main",
                  bgcolor: "rgba(40, 199, 111, 0.12)",
                  fontSize: 38,
                }}
              >
                <i className="tabler-circle-check-filled" />
              </Box>
              <Typography variant="h4" mb={1}>
                Bạn đã đóng quỹ thành công
              </Typography>
              <Typography color="text.secondary" mb={2}>
                Khoản đóng của bạn đã được cập nhật vào danh sách.
              </Typography>
              <Chip
                color="success"
                variant="tonal"
                label={money(paymentData.amount)}
              />
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{ p: 2, mb: 2, bgcolor: "action.hover", borderRadius: 2 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Mức đóng của kỳ
                  </Typography>
                  <Typography variant="h6">
                    {money(minimumFor(paymentMember || {}))}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mb: 0.75,
                      fontWeight: 500,
                      color: "text.secondary",
                    }}
                  >
                    Số tiền đóng
                  </Typography>
                  <Box
                    onClick={() => amountInputRef.current?.focus()}
                    sx={{
                      cursor:
                        Boolean(paymentData) || creatingPayment
                          ? "default"
                          : "text",
                      display: "inline-flex",
                      alignItems: "center",
                      width: "100%",
                      px: 2,
                      py: 1,
                      minHeight: 48,
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor:
                        Boolean(paymentData) || creatingPayment
                          ? "action.hover"
                          : "background.paper",
                      transition: "all 0.15s ease",
                      lineHeight: 1,
                      "&:hover": {
                        borderColor:
                          Boolean(paymentData) || creatingPayment
                            ? "divider"
                            : "text.secondary",
                      },
                      "&:focus-within": {
                        borderColor: "primary.main",
                        boxShadow:
                          "0 0 0 3px rgba(var(--mui-palette-primary-mainChannel) / 0.16)",
                      },
                    }}
                  >
                    <InputBase
                      inputRef={amountInputRef}
                      value={paymentThousands}
                      disabled={Boolean(paymentData) || creatingPayment}
                      placeholder="0"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setPaymentThousands(
                          raw ? Number(raw).toLocaleString("vi-VN") : "",
                        );
                      }}
                      inputProps={{
                        inputMode: "numeric",
                        style: {
                          fontSize: "1.15rem",
                          fontWeight: 600,
                          padding: 0,
                          lineHeight: 1.2,
                          height: "1.2em",
                          width: `${Math.max(1, (paymentThousands || "").length) * 1.15 + 0.3}ch`,
                          textAlign: "right",
                        },
                      }}
                      sx={{ display: "flex", alignItems: "center" }}
                    />
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "1.15rem",
                        fontWeight: 600,
                        color: "text.secondary",
                        ml: 0.5,
                        userSelect: "none",
                        letterSpacing: "0.2px",
                      }}
                    >
                      .000 VNĐ
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color={
                      actualPaymentAmount > 0 &&
                      actualPaymentAmount < minimumOnlinePaymentAmount
                        ? "error.main"
                        : actualPaymentAmount > 0
                          ? "text.secondary"
                          : "text.disabled"
                    }
                    sx={{ mt: 0.75, display: "block" }}
                  >
                    {actualPaymentAmount > 0 &&
                    actualPaymentAmount < minimumOnlinePaymentAmount
                      ? `Số tiền tối thiểu là ${money(minimumOnlinePaymentAmount)}`
                      : actualPaymentAmount > 0
                        ? `Số tiền thực tế: ${money(actualPaymentAmount)}`
                        : `Nhập tối thiểu ${money(minimumOnlinePaymentAmount)}`}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "action.hover",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 0,
                    minHeight: 192,
                  }}
                >
                  <Box
                    component="img"
                    src={(() => {
                      const required = minimumFor(paymentMember || {});
                      if (actualPaymentAmount > required) {
                        return "/images/background/high-payment.png";
                      }
                      if (actualPaymentAmount < required) {
                        return "/images/background/low-payment.png";
                      }
                      return "/images/background/normal-payment.png";
                    })()}
                    alt="Trạng thái số tiền đóng quỹ"
                    sx={{
                      width: "100%",
                      height: "100%",
                      minHeight: 192,
                      objectFit: "cover",
                      borderRadius: 0,
                      display: "block",
                      transition: "all 0.2s ease-in-out",
                    }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{
                    minHeight: 280,
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    boxSizing: "border-box",
                  }}
                >
                  {creatingPayment ? (
                    <Box
                      role="status"
                      aria-live="polite"
                      sx={{
                        p: 3,
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                      }}
                    >
                      <CircularProgress size={44} />
                      <Typography mt={2} variant="body2" color="text.secondary">
                        Đang tạo mã QR thanh toán…
                      </Typography>
                    </Box>
                  ) : paymentData?.qrDataUrl ? (
                    <Box sx={{ textAlign: "center", p: 2 }}>
                      <Box
                        component="img"
                        src={paymentData.qrDataUrl}
                        alt="Mã QR thanh toán"
                        sx={{
                          width: 210,
                          height: 210,
                          objectFit: "contain",
                          display: "block",
                          mx: "auto",
                          borderRadius: 1,
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: "block" }}
                      >
                        Chủ tài khoản
                      </Typography>
                      <Typography
                        fontWeight={700}
                        sx={{ textTransform: "uppercase" }}
                      >
                        {paymentData.accountName || "Đang cập nhật"}
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        px: 2,
                        py: 4,
                        textAlign: "center",
                        color: "text.secondary",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i className="tabler-qrcode" style={{ fontSize: 42 }} />
                      <Typography
                        mt={1.5}
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        Nhập số tiền để tạo mã QR thanh toán
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {paymentData?.status === "PAID" ? (
            <Button variant="contained" onClick={closePaymentDialog}>
              Hoàn tất
            </Button>
          ) : paymentData?.checkoutUrl ? (
            <Button
              component="a"
              href={paymentData.checkoutUrl}
              target="_blank"
              variant="contained"
              startIcon={<i className="tabler-external-link" />}
            >
              Mở trang thanh toán
            </Button>
          ) : (
            <>
              <Button
                variant="tonal"
                color="secondary"
                onClick={closePaymentDialog}
              >
                Hủy
              </Button>
              <Button
                variant="contained"
                onClick={createPayment}
                startIcon={
                  creatingPayment ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <i className="tabler-qrcode" />
                  )
                }
                disabled={
                  creatingPayment ||
                  !Number.isSafeInteger(actualPaymentAmount) ||
                  actualPaymentAmount < minimumOnlinePaymentAmount
                }
              >
                {creatingPayment ? "Đang tạo mã QR…" : "Tạo mã QR"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={Boolean(cancelPaymentTarget)}
        title="Xác nhận hủy duyệt đóng quỹ"
        message={
          cancelPaymentTarget
            ? `Hủy xác nhận đóng quỹ của ${cancelPaymentTarget.name}? Khoản tiền đã duyệt sẽ được trừ khỏi tổng quỹ tháng.`
            : ""
        }
        confirmText="Hủy duyệt"
        onClose={() => setCancelPaymentTarget(null)}
        onConfirm={() => updateMemberPayment(cancelPaymentTarget, false)}
      />
    </Box>
  );
}
