"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  IconButton,
  Menu,
  Typography,
} from "@mui/material";
import CustomTextField from "@core/components/mui/TextField";
import TablePaginationComponent from "@components/TablePaginationComponent";
import Link from "next/link";
import OvertimePageHeader from "./OvertimePageHeader";
import OvertimeRegistrationForm from "./OvertimeRegistrationForm";
import tableStyles from "@core/styles/table.module.css";

const statuses = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  WAITING_CONFIRMATION: "Chờ xác nhận",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};
const types = {
  WEEKDAY: "Ngày thường",
  WEEKEND: "Cuối tuần",
  HOLIDAY: "Ngày lễ",
};
const colors = {
  PENDING: "warning",
  APPROVED: "info",
  REJECTED: "error",
  WAITING_CONFIRMATION: "primary",
  COMPLETED: "success",
  CANCELLED: "secondary",
};
const today = () =>
  new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const dateOnly = (value) =>
  new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10);
const clock = (value) =>
  new Date(value).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "—";
const hours = (minutes) =>
  minutes == null
    ? "—"
    : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}p`;
const newForm = () => ({
  date: today(),
  start: "18:00",
  end: "20:00",
  reason: "",
  userId: "",
  approveImmediately: false,
  note: "",
});
async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Không thể xử lý yêu cầu");
  return body;
}
const Field = (props) => <CustomTextField fullWidth size="small" {...props} />;

export default function OvertimeClient() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(() => ({
    year: today().slice(0, 4),
    month: today().slice(5, 7),
    status: "",
    type: "",
    userId: "",
    from: "",
    to: "",
    search: "",
  }));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [rowMenu, setRowMenu] = useState(null);
  const [scope, setScope] = useState("mine");
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(newForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const params = new URLSearchParams({
    ...filters,
    scope,
    page: String(page),
    limit: String(limit),
  }).toString();
  const {
    data,
    isPending,
    isFetching,
    error: loadError,
  } = useQuery({
    queryKey: ["overtime", params],
    queryFn: ({ signal }) => request(`/api/overtime?${params}`, { signal }),
  });
  const admin = ["admin", "assistant"].includes(data?.actor.role);
  const selected = dialog?.record;
  const {
    data: detail,
    error: detailError,
    isPending: detailPending,
  } = useQuery({
    queryKey: ["overtime-detail", selected?.id],
    enabled: dialog?.action === "detail",
    queryFn: ({ signal }) =>
      request(`/api/overtime?id=${selected.id}`, { signal }),
  });
  const changeFilter = (name, value) => {
    setFilters((old) => ({ ...old, [name]: value }));
    setPage(1);
  };
  const setValue = (name, value) =>
    setForm((old) => ({ ...old, [name]: value }));
  function open(action, record) {
    setError("");
    if (action === "settings")
      setForm({
        ...data.config,
        holidaysText: data.config.holidays.join("\n"),
      });
    else if (action === "edit")
      setForm({
        ...newForm(),
        date: dateOnly(record.startTime),
        start: clock(record.startTime),
        end: clock(record.endTime),
        reason: record.reason,
        userId: record.userId,
      });
    else if (action === "report")
      setForm({
        actualMinutes: record.actualMinutes ?? record.registeredMinutes,
        workReport: record.workReport,
        note: record.reportNote || "",
      });
    else if (action === "confirm")
      setForm({ confirmedMinutes: record.actualMinutes, note: "" });
    else setForm(newForm());
    setDialog({ action, record });
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || !dialog) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const action = dialog.action;
      const payload =
        action === "settings"
          ? {
              action,
              config: {
                allowPast: form.allowPast,
                maxDailyMinutes: Number(form.maxDailyMinutes),
                maxMonthlyMinutes: Number(form.maxMonthlyMinutes),
                breakMinutes: Number(form.breakMinutes),
                weekendDays: form.weekendDays,
                holidays: form.holidaysText.split(/[\s,]+/).filter(Boolean),
              },
            }
          : { ...form, action, id: selected?.id, version: selected?.version };
      await request("/api/overtime", {
        method: action === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setDialog(null);
      setPage(1);
      setSuccess("Đã lưu thay đổi OT.");
      await queryClient.invalidateQueries({ queryKey: ["overtime"] });
      await queryClient.invalidateQueries({ queryKey: ["overtime-detail"] });
    } catch (err) {
      setError(err.message);
      if (selected)
        await queryClient.invalidateQueries({ queryKey: ["overtime"] });
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/overtime/export?${new URLSearchParams({ ...filters, scope })}`,
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Không thể xuất báo cáo");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `OT-${filters.year}${filters.month ? `-${filters.month}` : ""}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const availableActions = (record) =>
    [
      ["detail", "Xem chi tiết", true],
      [
        "edit",
        "Sửa đơn",
        record.status === "PENDING" || (admin && record.status === "APPROVED"),
      ],
      [
        "cancel",
        "Hủy đơn",
        record.status === "PENDING" ||
          (admin &&
            ["APPROVED", "WAITING_CONFIRMATION"].includes(record.status)),
      ],
      ["approve", "Duyệt đơn", admin && record.status === "PENDING"],
      ["reject", "Từ chối", admin && record.status === "PENDING"],
      ["report", "Báo cáo công việc", record.status === "APPROVED"],
      [
        "confirm",
        "Xác nhận giờ thực tế",
        admin && record.status === "WAITING_CONFIRMATION",
      ],
      [
        "return",
        "Yêu cầu sửa báo cáo",
        admin && record.status === "WAITING_CONFIRMATION",
      ],
    ].filter((item) => item[2]);
  const columns = [
    {
      header: "STT",
      id: "index",
      cell: ({ row }) => (page - 1) * limit + row.index + 1,
    },
    { header: "Nhân viên", accessorKey: "userName" },
    {
      header: "Ngày làm thêm",
      accessorKey: "startTime",
      cell: ({ row }) => (
        <Box sx={{ width: 220 }}>
          <Typography variant="body2">
            {new Date(row.original.startTime).toLocaleDateString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Typography>
        </Box>
      ),
    },
    {
      header: "Loại làm thêm",
      accessorKey: "otType",
      cell: ({ getValue }) => (
        <Chip
          size="small"
          variant="tonal"
          color="info"
          label={types[getValue()]}
        />
      ),
    },
    {
      header: "Số giờ đăng ký",
      accessorKey: "registeredMinutes",
      cell: ({ row }) => (
        <Typography variant="body2">
          {clock(row.original.startTime)} – {clock(row.original.endTime)}
          {dateOnly(row.original.endTime) !== dateOnly(row.original.startTime)
            ? " (+1 ngày)"
            : ""}
        </Typography>
      ),
    },
    {
      header: "Số giờ thực tế",
      accessorKey: "actualMinutes",
      cell: ({ row }) =>
        hours(row.original.actualMinutes ?? row.original.registeredMinutes),
    },
    {
      header: "Trạng thái",
      id: "approver",
      cell: ({ row }) => (
        <Stack spacing={0.5} alignItems="flex-start">
          <Chip
            size="small"
            variant="tonal"
            color={colors[row.original.status]}
            label={statuses[row.original.status]}
          />
        </Stack>
      ),
    },
    {
      header: "Người phê duyệt",
      accessorKey: "approvedByName",
      cell: ({ row }) =>
        row.original.approvedByName || row.original.rejectedByName || "",
    },
    {
      header: "Lý do",
      accessorKey: "reason",
      cell: ({ getValue }) => (
        <Typography
          variant="body2"
          title={getValue() || ""}
          sx={{
            width: 240,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            whiteSpace: "normal",
          }}
        >
          {getValue() || "—"}
        </Typography>
      ),
    },
    {
      header: "Ngày tạo đơn",
      accessorKey: "createdAt",
      cell: ({ getValue }) =>
        new Date(getValue()).toLocaleDateString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        }),
    },
    {
      header: "",
      id: "actions",
      cell: ({ row }) => (
        <IconButton
          size="small"
          aria-label="Thao tác đơn OT"
          onClick={(event) =>
            setRowMenu({
              position: {
                top: Math.round(
                  event.currentTarget.getBoundingClientRect().bottom,
                ),
                left: Math.round(
                  event.currentTarget.getBoundingClientRect().right,
                ),
              },
              record: row.original,
            })
          }
        >
          <i className="tabler-dots-vertical" />
        </IconButton>
      ),
    },
  ];
  const table = useReactTable({
    data: data?.entries || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const registration = dialog && ["create", "edit"].includes(dialog.action);
  const titles = {
    create: "Đăng ký làm thêm giờ",
    edit: "Sửa đơn OT",
    cancel: "Hủy đơn OT",
    approve: "Duyệt đơn OT",
    reject: "Từ chối đơn OT",
    report: "Báo cáo công việc thực tế",
    confirm: "Xác nhận giờ OT thực tế",
    return: "Yêu cầu cập nhật báo cáo",
    settings: "Cấu hình OT",
    detail: "Chi tiết và lịch sử OT",
  };
  if (registration)
    return (
      <OvertimeRegistrationForm
        key={`${dialog.action}:${selected?.id || "new"}`}
        action={dialog.action}
        record={selected}
        form={form}
        config={data.config}
        actor={data.actor}
        users={data.users}
        busy={busy}
        error={error}
        onChange={setValue}
        onCancel={() => setDialog(null)}
        onSubmit={submit}
      />
    );
  return (
    <Stack spacing={3}>
      <OvertimePageHeader
        title="Làm thêm giờ"
        subtitle="Quản lý đăng ký, phê duyệt và báo cáo thời gian làm thêm giờ"
        actions={
          <>
            <Button
              variant={showFilters ? "tonal" : "outlined"}
              startIcon={<i className="tabler-filter" />}
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
            >
              Bộ lọc
            </Button>
            <Button
              variant="outlined"
              startIcon={<i className="tabler-download" />}
              disabled={!data || busy || isFetching}
              onClick={download}
            >
              Xuất Excel
            </Button>
            {admin && (
              <Button
                component={Link}
                href="/overtime/statistics"
                variant="tonal"
                startIcon={<i className="tabler-chart-bar" />}
              >
                Thống kê
              </Button>
            )}
            {data?.actor.role === "admin" && (
              <Button
                variant="tonal"
                color="secondary"
                startIcon={<i className="tabler-settings" />}
                onClick={() => open("settings")}
              >
                Cấu hình
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<i className="tabler-plus" />}
              disabled={!data || busy}
              onClick={() => open("create")}
            >
              Thêm mới
            </Button>
          </>
        }
      />
      {success && (
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      {loadError && <Alert severity="error">{loadError.message}</Alert>}
      {error && !dialog && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <CustomTextField
          select
          size="small"
          value={filters.status}
          SelectProps={{
            displayEmpty: true,
            renderValue: (value) => statuses[value] || "Tất cả",
          }}
          sx={{ width: 165 }}
          onChange={(event) => changeFilter("status", event.target.value)}
        >
          <MenuItem value="">Tất cả</MenuItem>
          {Object.entries(statuses).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </CustomTextField>
        {admin && (
          <CustomTextField
            select
            size="small"
            value={scope}
            sx={{ width: 170 }}
            onChange={(event) => {
              setScope(event.target.value);
              changeFilter("userId", "");
            }}
          >
            <MenuItem value="mine">Đơn của tôi</MenuItem>
            <MenuItem value="all">Tất cả nhân viên</MenuItem>
          </CustomTextField>
        )}
      </Stack>
      {showFilters && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          <Field
            label="Tháng"
            select
            value={filters.month}
            SelectProps={{ displayEmpty: true }}
            onChange={(event) => changeFilter("month", event.target.value)}
          >
            <MenuItem value="">Cả năm</MenuItem>
            {Array.from({ length: 12 }, (_, i) => (
              <MenuItem key={i} value={String(i + 1).padStart(2, "0")}>
                Tháng {i + 1}
              </MenuItem>
            ))}
          </Field>
          <Field
            label="Năm"
            type="number"
            value={filters.year}
            onChange={(event) => changeFilter("year", event.target.value)}
          />
          <Field
            label="Loại làm thêm"
            select
            value={filters.type}
            SelectProps={{ displayEmpty: true }}
            onChange={(event) => changeFilter("type", event.target.value)}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {Object.entries(types).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Field>
          <Field
            label="Từ ngày"
            type="date"
            value={filters.from}
            onChange={(event) => changeFilter("from", event.target.value)}
          />
          <Field
            label="Đến ngày"
            type="date"
            value={filters.to}
            onChange={(event) => changeFilter("to", event.target.value)}
          />
          {admin && scope === "all" && (
            <Field
              label="Nhân viên"
              select
              value={filters.userId}
              SelectProps={{ displayEmpty: true }}
              onChange={(event) => changeFilter("userId", event.target.value)}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {data.users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Field>
          )}
        </Box>
      )}
      <Typography variant="h6">
        {admin && scope === "all" ? "Đơn của nhân viên" : "Đơn của tôi"}
      </Typography>
      <Card variant="outlined" sx={{ boxShadow: "none" }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
          <CustomTextField
            size="small"
            placeholder="Tìm kiếm đơn..."
            value={filters.search}
            onChange={(event) => changeFilter("search", event.target.value)}
          />
        </Stack>
        {isPending ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                overflowX: "auto",
                opacity: isFetching ? 0.6 : 1,
                "& td, & th": { px: 3, py: 2.5 },
                "& th": { textTransform: "none", fontWeight: 500 },
                "& tbody tr:hover": { bgcolor: "action.hover" },
              }}
            >
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => (
                        <th key={header.id}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!data?.entries.length && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        style={{ textAlign: "center" }}
                      >
                        Không có đơn phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems="center"
              justifyContent="space-between"
              sx={{ borderTop: "1px solid", borderColor: "divider", px: 3 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <CustomTextField
                  select
                  size="small"
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 25, 50].map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <Typography variant="caption">bản ghi/trang</Typography>
              </Stack>
              <TablePaginationComponent
                total={data?.total || 0}
                page={page}
                limit={limit}
                onPageChange={(_, index) => setPage(index + 1)}
              />
            </Stack>
          </>
        )}
      </Card>
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={rowMenu?.position}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        open={!!rowMenu}
        onClose={() => setRowMenu(null)}
      >
        {rowMenu &&
          availableActions(rowMenu.record).map(([action, label]) => (
            <MenuItem
              key={action}
              onClick={() => {
                open(action, rowMenu.record);
                setRowMenu(null);
              }}
            >
              {label}
            </MenuItem>
          ))}
      </Menu>
      <Dialog
        open={!!dialog}
        onClose={() => !busy && setDialog(null)}
        fullWidth
        maxWidth={dialog?.action === "detail" ? "md" : "sm"}
      >
        <Box component="form" onSubmit={submit}>
          <DialogTitle>{titles[dialog?.action]}</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {selected && (
                <Typography color="text.secondary">
                  {selected.userName} · {dateOnly(selected.startTime)} ·{" "}
                  {clock(selected.startTime)} – {clock(selected.endTime)} ·{" "}
                  {hours(selected.registeredMinutes)}
                </Typography>
              )}
              {dialog?.action === "report" && (
                <>
                  {selected.returnReason && (
                    <Alert severity="warning">
                      Yêu cầu cập nhật: {selected.returnReason}
                    </Alert>
                  )}
                  <Field
                    required
                    label="Thời gian thực tế (phút)"
                    type="number"
                    inputProps={{ min: 1, max: 1440, step: 1 }}
                    value={form.actualMinutes}
                    onChange={(e) => setValue("actualMinutes", e.target.value)}
                    helperText={hours(Number(form.actualMinutes))}
                  />
                  <Field
                    required
                    label="Báo cáo công việc đã thực hiện"
                    multiline
                    minRows={4}
                    value={form.workReport}
                    onChange={(e) => setValue("workReport", e.target.value)}
                  />
                  <Field
                    label="Ghi chú thay đổi so với đăng ký"
                    multiline
                    value={form.note}
                    onChange={(e) => setValue("note", e.target.value)}
                  />
                </>
              )}
              {dialog?.action === "confirm" && (
                <>
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>
                    Báo cáo: {selected.workReport}
                  </Typography>
                  <Typography>
                    Giờ thực tế: {hours(selected.actualMinutes)}
                  </Typography>
                  {selected.reportNote && (
                    <Typography>Ghi chú: {selected.reportNote}</Typography>
                  )}
                  <Field
                    required
                    label="Thời gian xác nhận (phút)"
                    type="number"
                    inputProps={{ min: 1, max: 1440, step: 1 }}
                    value={form.confirmedMinutes}
                    onChange={(e) =>
                      setValue("confirmedMinutes", e.target.value)
                    }
                  />
                  <Field
                    required={
                      Number(form.confirmedMinutes) !== selected.actualMinutes
                    }
                    label="Ghi chú xác nhận"
                    multiline
                    value={form.note}
                    onChange={(e) => setValue("note", e.target.value)}
                    helperText="Bắt buộc nếu giờ xác nhận khác giờ thực tế."
                  />
                </>
              )}
              {dialog &&
                ["reject", "return", "cancel"].includes(dialog.action) && (
                  <>
                    <Alert severity="warning">
                      {dialog.action === "cancel"
                        ? "Xác nhận hủy đơn này? Đơn đã hủy sẽ không được tính vào tổng giờ OT."
                        : dialog.action === "reject"
                          ? "Nhập lý do từ chối để nhân viên xem và đối chiếu."
                          : "Đơn sẽ quay về trạng thái Đã duyệt để nhân viên cập nhật báo cáo."}
                    </Alert>
                    {(dialog.action !== "cancel" ||
                      selected.status !== "PENDING") && (
                      <Field
                        required
                        label={
                          dialog.action === "return"
                            ? "Nội dung cần cập nhật"
                            : "Lý do"
                        }
                        multiline
                        minRows={3}
                        value={form.note}
                        onChange={(e) => setValue("note", e.target.value)}
                      />
                    )}
                  </>
                )}
              {dialog?.action === "approve" && (
                <>
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>
                    Lý do: {selected.reason}
                  </Typography>
                  <Alert severity="info">
                    Xác nhận duyệt đơn đăng ký làm thêm này?
                  </Alert>
                </>
              )}
              {dialog?.action === "settings" && (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.allowPast}
                        onChange={(e) =>
                          setValue("allowPast", e.target.checked)
                        }
                      />
                    }
                    label="Cho phép đăng ký OT trong quá khứ"
                  />
                  <Field
                    required
                    label="Giới hạn mỗi ngày (phút)"
                    type="number"
                    inputProps={{ min: 0, max: 1440 }}
                    value={form.maxDailyMinutes}
                    onChange={(e) =>
                      setValue("maxDailyMinutes", e.target.value)
                    }
                    helperText="0: không giới hạn."
                  />
                  <Field
                    required
                    label="Giới hạn mỗi tháng (phút)"
                    type="number"
                    inputProps={{ min: 0, max: 44640 }}
                    value={form.maxMonthlyMinutes}
                    onChange={(e) =>
                      setValue("maxMonthlyMinutes", e.target.value)
                    }
                    helperText="0: không giới hạn."
                  />
                  <Field
                    required
                    label="Thời gian nghỉ mỗi đơn (phút)"
                    type="number"
                    inputProps={{ min: 0, max: 1439 }}
                    value={form.breakMinutes}
                    onChange={(e) => setValue("breakMinutes", e.target.value)}
                  />
                  <Field
                    label="Ngày nghỉ hàng tuần"
                    select
                    SelectProps={{ multiple: true }}
                    value={form.weekendDays}
                    onChange={(e) => setValue("weekendDays", e.target.value)}
                  >
                    {[
                      "Chủ nhật",
                      "Thứ hai",
                      "Thứ ba",
                      "Thứ tư",
                      "Thứ năm",
                      "Thứ sáu",
                      "Thứ bảy",
                    ].map((name, index) => (
                      <MenuItem key={index} value={index}>
                        {name}
                      </MenuItem>
                    ))}
                  </Field>
                  <Field
                    label="Danh sách ngày lễ"
                    multiline
                    minRows={4}
                    value={form.holidaysText}
                    onChange={(e) => setValue("holidaysText", e.target.value)}
                    helperText="Mỗi dòng một ngày theo định dạng YYYY-MM-DD. Cấu hình áp dụng cho đơn mới và lần chỉnh sửa tiếp theo."
                  />
                </>
              )}
              {dialog?.action === "detail" && (
                <>
                  {detailError && (
                    <Alert severity="error">{detailError.message}</Alert>
                  )}
                  {detailPending && <CircularProgress />}
                  {detail && (
                    <>
                      <Chip
                        sx={{ alignSelf: "flex-start" }}
                        color={colors[detail.record.status]}
                        label={statuses[detail.record.status]}
                      />
                      <Typography sx={{ whiteSpace: "pre-wrap" }}>
                        Lý do: {detail.record.reason}
                      </Typography>
                      <Typography>
                        Giờ đăng ký: {hours(detail.record.registeredMinutes)} ·
                        Thực tế: {hours(detail.record.actualMinutes)} · Xác
                        nhận: {hours(detail.record.confirmedMinutes)}
                      </Typography>
                      {detail.record.workReport && (
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>
                          Báo cáo: {detail.record.workReport}
                        </Typography>
                      )}
                      {detail.record.reportNote && (
                        <Typography>
                          Ghi chú: {detail.record.reportNote}
                        </Typography>
                      )}
                      {detail.record.rejectionReason && (
                        <Alert severity="error">
                          Lý do từ chối: {detail.record.rejectionReason}
                        </Alert>
                      )}
                      {detail.record.returnReason && (
                        <Alert severity="warning">
                          Yêu cầu cập nhật: {detail.record.returnReason}
                        </Alert>
                      )}
                      <Typography variant="h5">Lịch sử thao tác</Typography>
                      {detail.history.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            borderLeft: "3px solid",
                            borderColor: "primary.main",
                            pl: 3,
                          }}
                        >
                          <Typography>
                            {item.actorName} ·{" "}
                            {titles[item.action] || item.action}
                          </Typography>
                          <Typography variant="caption">
                            {dateTime(item.changedAt)} ·{" "}
                            {statuses[item.oldStatus] || "Tạo mới"} →{" "}
                            {statuses[item.newStatus]}
                          </Typography>
                          {item.note && (
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: "pre-wrap" }}
                            >
                              {item.note}
                            </Typography>
                          )}
                          {item.before && item.action === "edit" && (
                            <Typography variant="body2">
                              Trước: {dateTime(item.before.startTime)} –{" "}
                              {dateTime(item.before.endTime)},{" "}
                              {hours(item.before.registeredMinutes)}. Sau:{" "}
                              {dateTime(item.after.startTime)} –{" "}
                              {dateTime(item.after.endTime)},{" "}
                              {hours(item.after.registeredMinutes)}.
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </>
                  )}
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={busy} onClick={() => setDialog(null)}>
              {dialog?.action === "detail" ? "Đóng" : "Bỏ qua"}
            </Button>
            {dialog?.action !== "detail" && (
              <Button
                type="submit"
                variant="contained"
                color={
                  ["cancel", "reject"].includes(dialog?.action)
                    ? "error"
                    : "primary"
                }
                disabled={busy}
              >
                {busy ? "Đang lưu..." : "Xác nhận"}
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
