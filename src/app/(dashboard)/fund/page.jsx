"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
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
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CustomTextField from "@core/components/mui/TextField";
import tableStyles from "@core/styles/table.module.css";
import { exportJsonToExcel } from "@/libs/excelHelper";
import { resolveAvatar } from "@/utils/getDefaultAvatar";
import { toast } from "react-toastify";
import ConfirmDialog from "@components/ConfirmDialog";
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
  type_web_app: "Web/App",
  type_ap: "AP",
  type_peer_admin: "Peer Admin",
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
  const [minimumAmounts, setMinimumAmounts] = useState({
    category_official: 150000,
    category_probation: 150000,
    category_intern: 100000,
    category_collaborator: 100000,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paymentMember, setPaymentMember] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentData, setPaymentData] = useState(null);
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
    Number(minimumAmounts[member.categoryId]) || 100000;
  const saveMinimumAmounts = async () => {
    const response = await fetch("/api/fund-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minimumAmounts }),
    });
    const data = await response.json();
    if (!response.ok)
      return toast.error(data.error || "Không thể lưu mức đóng");
    setMinimumAmounts(data.minimumAmounts);
    setSettingsOpen(false);
    toast.success("Đã cập nhật mức đóng tối thiểu");
  };
  const createPayment = async () => {
    const [month, year] = period.split("/").map(Number);
    const response = await fetch("/api/fund-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, amount: Number(paymentAmount) }),
    });
    const data = await response.json();
    if (!response.ok)
      return toast.error(data.error || "Không thể tạo thanh toán");
    setPaymentData(data);
  };

  useEffect(() => {
    if (!paymentData?.orderCode) return undefined;
    const timer = setInterval(async () => {
      const response = await fetch(
        `/api/fund-payments?orderCode=${paymentData.orderCode}`,
      );
      const data = await response.json();
      if (data.paid) {
        await loadFund(period);
        toast.success("PayOS đã xác nhận bạn đóng quỹ");
        setPaymentData(null);
        setPaymentMember(null);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [paymentData, period]);

  const members = useMemo(
    () =>
      users
        .map((user) => {
          const payment = (fund?.members || []).find(
            (item) => item.userId === user.id,
          );
          return {
            ...user,
            paid: Boolean(payment?.paid),
            amount: payment?.amount || 0,
            paidAt: payment?.paidAt,
          };
        })
        .sort((a, b) => {
          const rank = (member) =>
            member.id === session?.user?.id ? 0 : member.paid ? 1 : 2;
          return rank(a) - rank(b) || a.name.localeCompare(b.name, "vi");
        }),
    [users, fund, session?.user?.id],
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

  const updateMemberPayment = async (member, paid) => {
    try {
      const [month, year] = period.split("/").map(Number);
      const response = await fetch("/api/funds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "member",
          userId: member.id,
          paid,
          amount:
            member.amount ||
            (member.categoryId === "category_intern" ? 100000 : 50000),
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
    } catch (error) {
      toast.error(error.message);
    }
  };

  const exportMembers = () =>
    exportJsonToExcel(
      members.map((member) => ({
        "Mã nhân sự": member.code,
        "Họ và tên": member.name,
        "Bộ phận": departments[member.typeId] || "Chưa gán",
        "Hình thức": categories[member.categoryId] || "—",
        "Trạng thái": member.paid ? "Đã đóng" : "Chưa đóng",
        "Số tiền": member.amount,
        "Thời gian đóng": member.paidAt || "",
      })),
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
              {canManage && (
                <Button
                  size="small"
                  variant="tonal"
                  onClick={() => setSettingsOpen(true)}
                >
                  Mức đóng tối thiểu
                </Button>
              )}
              <CustomTextField
                select
                size="small"
                label="Kỳ theo dõi"
                value={period}
                onChange={async (event) => {
                  setPeriod(event.target.value);
                  await loadFund(event.target.value);
                }}
                sx={{ minWidth: 180 }}
              >
                {(fund?.availablePeriods || []).map((item) => {
                  const value = `${String(item.month).padStart(2, "0")}/${item.year}`;
                  return (
                    <MenuItem key={value} value={value}>
                      Tháng {value}
                    </MenuItem>
                  );
                })}
              </CustomTextField>
            </Box>
          }
        />
      </Card>

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
                      <TextField
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
                      </TextField>
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
                    <TableCell align="center">BỘ PHẬN</TableCell>
                    <TableCell align="center">HÌNH THỨC</TableCell>
                    <TableCell align="center">TRẠNG THÁI</TableCell>
                    <TableCell align="center">SỐ TIỀN</TableCell>
                    <TableCell align="center">THỜI GIAN ĐÓNG</TableCell>
                    {canManage && <TableCell align="center">DUYỆT</TableCell>}
                    <TableCell align="center">THAO TÁC</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => {
                    const isCurrentUser = member.id === session?.user?.id;
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
                          <Typography fontWeight={600}>
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
                          <Chip
                            size="small"
                            variant="tonal"
                            label={departments[member.typeId] || "Chưa gán"}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {categories[member.categoryId] || "—"}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            variant="tonal"
                            color={member.paid ? "success" : "secondary"}
                            label={member.paid ? "Đã đóng" : "Chưa đóng"}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            fontWeight={700}
                            color={
                              member.paid ? "text.primary" : "text.disabled"
                            }
                          >
                            {money(member.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {member.paidAt
                            ? formatVietnamDateTime(member.paidAt)
                            : "—"}
                        </TableCell>
                        {canManage && (
                          <TableCell align="center">
                            {!member.paid ? (
                              <IconButton
                                color="success"
                                size="small"
                                aria-label={`Xác nhận ${member.name} đã đóng quỹ`}
                                onClick={() =>
                                  updateMemberPayment(member, true)
                                }
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
                          {member.id === session?.user?.id && !member.paid ? (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setPaymentMember(member);
                                setPaymentAmount(String(minimumFor(member)));
                                setPaymentData(null);
                              }}
                            >
                              Đóng quỹ
                            </Button>
                          ) : (
                            "—"
                          )}
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
              <TextField
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
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
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
                    <TextField
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
              <TextField
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
              <TextField
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
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Mức đóng quỹ tối thiểu</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            {Object.entries(categories).map(([key, label]) => (
              <Grid key={key} size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" fontWeight={600} mb={1}>
                  {label}
                </Typography>
                <CustomTextField
                  fullWidth
                  size="small"
                  value={moneyInput(minimumAmounts[key])}
                  onChange={(e) =>
                    setMinimumAmounts((value) => ({
                      ...value,
                      [key]: Number(e.target.value.replace(/\D/g, "")),
                    }))
                  }
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={saveMinimumAmounts}>
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(paymentMember)}
        onClose={() => !paymentData && setPaymentMember(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Đóng quỹ phòng</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography color="text.secondary" mb={2}>
                Mức tối thiểu: {money(minimumFor(paymentMember || {}))}
              </Typography>
              <CustomTextField
                fullWidth
                label="Số tiền đóng"
                value={moneyInput(paymentAmount)}
                disabled={Boolean(paymentData)}
                onChange={(e) =>
                  setPaymentAmount(e.target.value.replace(/\D/g, ""))
                }
                helperText={`Tối thiểu ${money(minimumFor(paymentMember || {}))}`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box
                sx={{
                  minHeight: 220,
                  display: "grid",
                  placeItems: "center",
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                {paymentData?.qrDataUrl ? (
                  <Box
                    component="img"
                    src={paymentData.qrDataUrl}
                    alt="Mã QR PayOS"
                    sx={{ width: 220 }}
                  />
                ) : (
                  <Typography color="text.secondary" align="center">
                    Chọn số tiền rồi tạo mã QR để thanh toán
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPaymentMember(null)}
            disabled={Boolean(paymentData)}
          >
            Hủy
          </Button>
          {paymentData?.checkoutUrl ? (
            <Button
              component="a"
              href={paymentData.checkoutUrl}
              target="_blank"
              variant="tonal"
            >
              Mở trang PayOS
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={createPayment}
              disabled={Number(paymentAmount) < minimumFor(paymentMember || {})}
            >
              Tạo mã QR
            </Button>
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
