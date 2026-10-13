"use client";
import TeaNotificationSender from "./components/TeaNotificationSender";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import CustomTextField from "@core/components/mui/TextField";
import tableStyles from "@core/styles/table.module.css";
import ConfirmDialog from "@components/ConfirmDialog";
import VietnameseDateField from "@/components/VietnameseDateField";
import {
  currentFundPeriod,
  defaultFundAmounts,
  fundCategories,
  periodKey,
} from "@/libs/fundRules";

const emptyRule = () => ({
  id: "",
  categoryId: "category_official",
  amount: "",
  startPeriod: periodKey(currentFundPeriod()),
  endPeriod: periodKey(currentFundPeriod()),
  note: "",
});
const categoryOrder = [
  "category_collaborator",
  "category_intern",
  "category_probation",
  "category_official",
];
const emptyForm = () => ({
  rules: categoryOrder.map((categoryId) => ({
    ...emptyRule(),
    categoryId,
    amount: String(defaultFundAmounts[categoryId]),
  })),
});
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reminderCooldown, setReminderCooldown] = useState(0);
  const [scheduleReminderCooldown, setScheduleReminderCooldown] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tab, setTab] = useState("reminder");
  const [config, setConfig] = useState({
    reminder: {
      enabled: false,
      deadlineDay: 10,
      daysBefore: [3, 1],
      sendTime: "14:00",
    },
    scheduleReminder: { enabled: true, daysBefore: 1, sendTime: "14:00" },
    channels: [],
  });
  const [channelForm, setChannelForm] = useState(null);
  const canManage = ["admin", "assistant"].includes(session?.user?.role);
  useEffect(() => {
    const section = searchParams.get("section");
    setTab(
      ["reminder", "period", "qr"].includes(section) ? section : "reminder",
    );
  }, [searchParams]);
  const currentPeriod = periodKey(currentFundPeriod());
  const historyRules = [
    ...rules.filter((rule) => !rule.batchId && rule.endPeriod < currentPeriod),
    ...history,
  ].sort(
    (a, b) =>
      String(b.archivedAt || b.endPeriod).localeCompare(
        String(a.archivedAt || a.endPeriod),
      ) || b.startPeriod.localeCompare(a.startPeriod),
  );
  const manageableRules = rules
    .filter((rule) => rule.endPeriod >= currentPeriod)
    .sort((a, b) => a.startPeriod.localeCompare(b.startPeriod));
  const load = async () => {
    const [settingsResponse, configResponse] = await Promise.all([
      fetch("/api/fund-settings"),
      fetch("/api/fund-config"),
    ]);
    const [data, configData] = await Promise.all([
      settingsResponse.json(),
      configResponse.json(),
    ]);
    if (!settingsResponse.ok)
      throw new Error(data.error || "Không thể tải cài đặt");
    if (!configResponse.ok)
      throw new Error(configData.error || "Không thể tải cấu hình quỹ");
    setRules(data.rules || []);
    setHistory(data.history || []);
    setBatches(data.batches || []);
    setConfig(configData);
  };
  const saveConfig = async (body, successMessage) => {
    setSaving(true);
    try {
      const response = await fetch("/api/fund-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setConfig(result);
      setChannelForm(null);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const sendFundReminderNow = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/notifications/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendFundNow" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReminderCooldown(Math.max(60, result.retryAfterSeconds || 0));
      toast.success(
        `Đã gửi ${result.sent || 0} email; bỏ qua ${result.skipped || 0}; lỗi ${result.failed || 0}`,
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const sendScheduleReminderNow = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/notifications/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendScheduleNow" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setScheduleReminderCooldown(result.retryAfterSeconds || 60);
      toast.success(
        `Đã gửi ${result.sent || 0} email; bỏ qua ${result.skipped || 0}; lỗi ${result.failed || 0}`,
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (reminderCooldown <= 0) return undefined;
    const timer = window.setInterval(
      () => setReminderCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [reminderCooldown > 0]);
  useEffect(() => {
    if (scheduleReminderCooldown <= 0) return undefined;
    const timer = window.setInterval(
      () => setScheduleReminderCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [scheduleReminderCooldown > 0]);
  useEffect(() => {
    if (status === "loading") return;
    load()
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [status]);
  const updateFormRule = (index, field, value) =>
    setForm((previous) => ({
      ...previous,
      rules: previous.rules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule,
      ),
    }));
  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/fund-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: form.rules.map((rule) => ({
            ...rule,
            amount: Number(rule.amount),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRules(data.rules || []);
      setHistory(data.history || []);
      setBatches(data.batches || []);
      setForm(null);
      toast.success("Đã lưu 4 mức đóng và ghi một lần lịch sử");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/fund-settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRules(data.rules || []);
      setHistory(data.history || []);
      setBatches(data.batches || []);
      setDeleteTarget(null);
      toast.success("Đã xóa mức đóng");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  if (!canManage)
    return (
      <Card>
        <CardHeader
          title="Không có quyền truy cập"
          subheader="Chỉ Admin và Trợ lý được thay đổi cài đặt."
        />
      </Card>
    );
  const settingsTable = (items, history = false) => (
    <TableContainer>
      <Table
        className={tableStyles.table}
        sx={{
          tableLayout: "fixed",
          minWidth: 960,
          "& th, & td": {
            width: `${100 / 6}%`,
            whiteSpace: "normal",
            overflowWrap: "anywhere",
          },
          "&&& th:nth-of-type(3), &&& td:nth-of-type(3)": {
            paddingInlineEnd: "48px",
          },
          "&&& th:nth-of-type(4), &&& td:nth-of-type(4)": {
            paddingInlineStart: "48px",
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>LOẠI NHÂN SỰ</TableCell>
            <TableCell align="right" style={{ textAlign: "right" }}>
              SỐ TIỀN
            </TableCell>
            <TableCell>THỜI GIAN</TableCell>
            <TableCell>GHI CHÚ</TableCell>
            <TableCell align="center" style={{ textAlign: "center" }}>
              {history ? "TRẠNG THÁI" : "THAO TÁC"}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length ? (
            [...items]
              .sort(
                (a, b) =>
                  categoryOrder.indexOf(a.categoryId) -
                  categoryOrder.indexOf(b.categoryId),
              )
              .map((rule, index) => (
                <TableRow key={rule.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {fundCategories[rule.categoryId] || rule.categoryId}
                  </TableCell>
                  <TableCell align="right" style={{ textAlign: "right" }}>
                    <Typography fontWeight={600}>
                      {money(rule.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {rule.startPeriod} → {rule.endPeriod}
                  </TableCell>
                  <TableCell>{rule.note || "—"}</TableCell>
                  <TableCell align="center" style={{ textAlign: "center" }}>
                    {history ? (
                      <Box
                        sx={{
                          display: "grid",
                          justifyItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Chip
                          size="small"
                          color="secondary"
                          variant="tonal"
                          label={
                            rule.historyAction === "saved"
                              ? "Đã lưu"
                              : rule.historyAction === "updated"
                                ? "Bản trước khi sửa"
                                : rule.historyAction === "deleted"
                                  ? "Đã xóa"
                                  : "Đã hết hiệu lực"
                          }
                        />
                        {rule.archivedAt && (
                          <Typography variant="caption" color="text.secondary">
                            {new Date(rule.archivedAt).toLocaleString("vi-VN")}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <>
                        <IconButton
                          color="primary"
                          aria-label="Sửa mức đóng"
                          onClick={() =>
                            setForm({
                              rules: categoryOrder.map((categoryId) => {
                                const existing =
                                  categoryId === rule.categoryId
                                    ? rule
                                    : manageableRules.find(
                                        (item) =>
                                          item.categoryId === categoryId &&
                                          (rule.batchId
                                            ? item.batchId === rule.batchId
                                            : true),
                                      );
                                return existing
                                  ? {
                                      ...existing,
                                      amount: String(existing.amount),
                                    }
                                  : {
                                      ...emptyRule(),
                                      categoryId,
                                      amount: String(
                                        defaultFundAmounts[categoryId],
                                      ),
                                    };
                              }),
                            })
                          }
                        >
                          <i className="tabler-edit" />
                        </IconButton>
                        <IconButton
                          color="error"
                          aria-label="Xóa mức đóng"
                          onClick={() => setDeleteTarget(rule)}
                        >
                          <i className="tabler-trash" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center">
                {history
                  ? "Chưa có lịch sử mức đóng"
                  : "Chưa có cấu hình đang hoặc sắp áp dụng"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
  return (
    <Box>
      <Card sx={{ mb: 4 }}>
        <CardHeader
          title="Cài đặt quỹ phòng"
          subheader="Quản lý lịch nhắc, kỳ đóng và kênh thanh toán PayOS"
          avatar={<i className="tabler-settings" style={{ fontSize: 26 }} />}
        />
      </Card>

      {tab === "reminder" && (
        <Box sx={{ display: "grid", gap: 4 }}>
          <Card>
            <CardHeader
              title="Nhắc lịch đóng quỹ"
              subheader="Thiết lập ngày hết hạn và các mốc nhắc mặc định"
            />
            <Box sx={{ px: 5, pb: 5, display: "grid", gap: 3, maxWidth: 560 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(config.reminder?.enabled)}
                    onChange={(event) =>
                      setConfig((value) => ({
                        ...value,
                        reminder: {
                          ...value.reminder,
                          enabled: event.target.checked,
                        },
                      }))
                    }
                  />
                }
                label="Bật nhắc lịch đóng quỹ"
              />
              <CustomTextField
                type="number"
                label="Ngày hết hạn trong tháng"
                value={config.reminder?.deadlineDay || 10}
                inputProps={{ min: 1, max: 28 }}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    reminder: {
                      ...value.reminder,
                      deadlineDay: event.target.value,
                    },
                  }))
                }
              />
              <CustomTextField
                label="Nhắc trước (ngày)"
                value={(config.reminder?.daysBefore || []).join(", ")}
                helperText="Ví dụ: 7, 3, 1"
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    reminder: {
                      ...value.reminder,
                      daysBefore: event.target.value
                        .split(",")
                        .map((item) => item.trim()),
                    },
                  }))
                }
              />
              <CustomTextField
                type="time"
                label="Giờ gửi nhắc"
                value={config.reminder?.sendTime || "14:00"}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    reminder: {
                      ...value.reminder,
                      sendTime: event.target.value,
                    },
                  }))
                }
              />
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={() =>
                    saveConfig(
                      { action: "saveReminder", ...config.reminder },
                      "Đã lưu cài đặt nhắc đóng quỹ",
                    )
                  }
                >
                  Lưu cài đặt
                </Button>
                <Button
                  variant="tonal"
                  color="warning"
                  startIcon={<i className="tabler-mail-forward" />}
                  disabled={saving || reminderCooldown > 0}
                  onClick={sendFundReminderNow}
                >
                  {reminderCooldown > 0
                    ? `Có thể gửi lại sau ${reminderCooldown}s`
                    : "Gửi nhắc ngay người chưa đóng"}
                </Button>
              </Box>
            </Box>
          </Card>
          <Card>
            <CardHeader
              title="Nhắc lịch bê nước và đổ rác"
              subheader="Gửi email cho đúng nhân sự đã được phân công trước ngày thực hiện"
            />
            <Box sx={{ px: 5, pb: 5, display: "grid", gap: 3, maxWidth: 560 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(config.scheduleReminder?.enabled)}
                    onChange={(event) =>
                      setConfig((value) => ({
                        ...value,
                        scheduleReminder: {
                          ...value.scheduleReminder,
                          enabled: event.target.checked,
                        },
                      }))
                    }
                  />
                }
                label="Bật email nhắc lịch bê nước và đổ rác"
              />
              <CustomTextField
                type="number"
                label="Gửi trước (ngày)"
                value={config.scheduleReminder?.daysBefore ?? 1}
                inputProps={{ min: 0, max: 7 }}
                helperText="Mặc định 1 ngày trước lịch"
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    scheduleReminder: {
                      ...value.scheduleReminder,
                      daysBefore: event.target.value,
                    },
                  }))
                }
              />
              <CustomTextField
                type="time"
                label="Giờ gửi nhắc"
                value={config.scheduleReminder?.sendTime || "14:00"}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    scheduleReminder: {
                      ...value.scheduleReminder,
                      sendTime: event.target.value,
                    },
                  }))
                }
              />
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={() =>
                    saveConfig(
                      {
                        action: "saveScheduleReminder",
                        ...config.scheduleReminder,
                      },
                      "Đã lưu cài đặt nhắc lịch bê nước và đổ rác",
                    )
                  }
                >
                  Lưu cài đặt
                </Button>
                <Button
                  variant="tonal"
                  color="warning"
                  startIcon={<i className="tabler-mail-forward" />}
                  disabled={saving || scheduleReminderCooldown > 0}
                  onClick={sendScheduleReminderNow}
                >
                  {scheduleReminderCooldown > 0
                    ? `Có thể gửi lại sau ${scheduleReminderCooldown}s`
                    : "Gửi nhắc lịch gần nhất"}
                </Button>
              </Box>
            </Box>
          </Card>
          <Card>
            <CardHeader
              title="Thông báo Happy Hour / trà chiều"
              subheader="Gửi lời mời hôm nay kèm ảnh menu cho nhân sự đang hoạt động. Nút Đặt ngay dẫn đến trang Trà chiều."
            />
            <Box sx={{ p: 4, pt: 0, display: "grid", gap: 3 }}>
              <TeaNotificationSender
                disabled={saving}
                settings={
                  config.teaReminder || { enabled: false, sendTime: "10:00" }
                }
                onChange={(teaReminder) =>
                  setConfig((value) => ({ ...value, teaReminder }))
                }
              />
              <CustomTextField
                label="Giờ gửi trong ngày diễn ra (giờ Việt Nam)"
                type="time"
                value={config.teaReminder?.sendTime || "10:00"}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    teaReminder: {
                      ...value.teaReminder,
                      sendTime: event.target.value,
                    },
                  }))
                }
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={() =>
                    saveConfig(
                      {
                        action: "saveTeaReminder",
                        excludedUserIds:
                          config.teaReminder?.excludedUserIds || [],
                        enabled: Boolean(config.teaReminder?.enabled),
                        sendTime: config.teaReminder?.sendTime || "10:00",
                      },
                      "Đã lưu thông báo Happy Hour / trà chiều",
                    )
                  }
                >
                  Lưu cài đặt
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      )}

      {tab === "period" && (
        <>
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Cài đặt quỹ phòng"
              subheader="Mỗi lần lưu gồm đủ 4 loại nhân sự và ghi một bản lịch sử. Mức mới ghi đè khoảng tháng trùng với cấu hình cũ."
              avatar={
                <i className="tabler-settings" style={{ fontSize: 26 }} />
              }
              action={
                <Button
                  variant="contained"
                  startIcon={<i className="tabler-plus" />}
                  onClick={() => setForm(emptyForm())}
                >
                  Thêm lần cài đặt
                </Button>
              }
            />
            {settingsTable(manageableRules)}
          </Card>
          <Card sx={{ mt: 4 }}>
            <CardHeader
              title="Lịch sử mức đóng quỹ"
              subheader="Mỗi lần lưu ghi đủ 4 loại nhân sự, mới nhất ở trên. Lịch sử chỉ xem."
              avatar={<i className="tabler-history" style={{ fontSize: 26 }} />}
            />
            {[...batches].reverse().map((batch) => (
              <Box
                key={batch.id}
                sx={{ borderTop: "1px solid", borderColor: "divider" }}
              >
                <Typography sx={{ p: 3 }} fontWeight={600}>
                  {new Date(batch.savedAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </Typography>
                {settingsTable(batch.rules, true)}
              </Box>
            ))}
            {historyRules.length > 0 && (
              <>
                <Typography sx={{ p: 3 }}>Lịch sử cấu hình cũ</Typography>
                {settingsTable(historyRules, true)}
              </>
            )}
            {!batches.length && !historyRules.length && settingsTable([], true)}
          </Card>
        </>
      )}

      {tab === "qr" && (
        <Card>
          <CardHeader
            title="Kênh PayOS nhận tiền"
            subheader="Mỗi kênh tương ứng với một Payment Channel và tài khoản ngân hàng trên PayOS. Khóa bí mật được mã hóa khi lưu."
            action={
              <Button
                variant="contained"
                startIcon={<i className="tabler-plus" />}
                onClick={() =>
                  setChannelForm({
                    name: "",
                    clientId: "",
                    apiKey: "",
                    checksumKey: "",
                  })
                }
              >
                Thêm kênh PayOS
              </Button>
            }
          />
          <TableContainer>
            <Table className={tableStyles.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Tên kênh</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Cập nhật</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {config.channels?.length ? (
                  config.channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell>
                        <Typography fontWeight={600}>{channel.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={channel.active ? "success" : "secondary"}
                          variant="tonal"
                          label={channel.active ? "Đang sử dụng" : "Dự phòng"}
                        />
                      </TableCell>
                      <TableCell>
                        {channel.updatedAt
                          ? new Date(channel.updatedAt).toLocaleString("vi-VN")
                          : "—"}
                      </TableCell>
                      <TableCell align="center">
                        {!channel.active && (
                          <Button
                            size="small"
                            onClick={() =>
                              saveConfig(
                                { action: "activateChannel", id: channel.id },
                                `Đã chuyển sang kênh ${channel.name}`,
                              )
                            }
                          >
                            Chọn sử dụng
                          </Button>
                        )}
                        <IconButton
                          color="primary"
                          onClick={() =>
                            setChannelForm({
                              ...channel,
                              clientId: "",
                              apiKey: "",
                              checksumKey: "",
                            })
                          }
                        >
                          <i className="tabler-edit" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() =>
                            saveConfig(
                              { action: "deleteChannel", id: channel.id },
                              "Đã xóa cấu hình PayOS",
                            )
                          }
                        >
                          <i className="tabler-trash" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Chưa có kênh PayOS trong Cài đặt
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      <Dialog
        open={Boolean(channelForm)}
        onClose={() => !saving && setChannelForm(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {channelForm?.id ? "Cập nhật kênh PayOS" : "Thêm kênh PayOS"}
        </DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Box sx={{ display: "grid", gap: 3 }}>
            <CustomTextField
              required
              label="Tên kênh / người nhận"
              placeholder="Ví dụ: Quỹ phòng - Nguyễn Văn B"
              value={channelForm?.name || ""}
              onChange={(event) =>
                setChannelForm((value) => ({
                  ...value,
                  name: event.target.value,
                }))
              }
            />
            <CustomTextField
              required={!channelForm?.id}
              label="Client ID"
              type="password"
              placeholder={channelForm?.id ? "Để trống nếu không đổi" : ""}
              value={channelForm?.clientId || ""}
              onChange={(event) =>
                setChannelForm((value) => ({
                  ...value,
                  clientId: event.target.value,
                }))
              }
            />
            <CustomTextField
              required={!channelForm?.id}
              label="API Key"
              type="password"
              placeholder={channelForm?.id ? "Để trống nếu không đổi" : ""}
              value={channelForm?.apiKey || ""}
              onChange={(event) =>
                setChannelForm((value) => ({
                  ...value,
                  apiKey: event.target.value,
                }))
              }
            />
            <CustomTextField
              required={!channelForm?.id}
              label="Checksum Key"
              type="password"
              placeholder={channelForm?.id ? "Để trống nếu không đổi" : ""}
              value={channelForm?.checksumKey || ""}
              onChange={(event) =>
                setChannelForm((value) => ({
                  ...value,
                  checksumKey: event.target.value,
                }))
              }
            />
            <Typography variant="caption" color="warning.main">
              Dùng ba khóa của cùng một Payment Channel. Không nhập mật khẩu tài
              khoản PayOS hoặc ngân hàng.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="secondary" onClick={() => setChannelForm(null)}>
            Hủy
          </Button>
          <Button
            variant="contained"
            disabled={
              saving ||
              !channelForm?.name?.trim() ||
              (!channelForm?.id &&
                (!channelForm?.clientId?.trim() ||
                  !channelForm?.apiKey?.trim() ||
                  !channelForm?.checksumKey?.trim()))
            }
            onClick={() =>
              saveConfig(
                { action: "saveChannel", ...channelForm },
                channelForm.id
                  ? "Đã cập nhật kênh PayOS"
                  : "Đã thêm kênh PayOS",
              )
            }
          >
            {saving ? "Đang lưu…" : "Lưu kênh"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(form)}
        onClose={() => !saving && setForm(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Cài đặt mức đóng cho 4 loại nhân sự</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Box sx={{ display: "grid", gap: 3 }}>
            {form?.rules.map((rule, ruleIndex) => (
              <Box
                key={rule.categoryId}
                sx={{
                  display: "grid",
                  gap: 3,
                  p: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography fontWeight={600}>
                  {fundCategories[rule.categoryId]}
                </Typography>
                <CustomTextField
                  required
                  label="Số tiền (VNĐ)"
                  value={
                    rule.amount
                      ? Number(rule.amount).toLocaleString("vi-VN")
                      : ""
                  }
                  inputProps={{ inputMode: "numeric" }}
                  onChange={(event) =>
                    updateFormRule(
                      ruleIndex,
                      "amount",
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                />
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <VietnameseDateField
                    required
                    type="month"
                    label="Áp dụng từ tháng"
                    value={rule.startPeriod || ""}
                    onChange={(event) =>
                      updateFormRule(
                        ruleIndex,
                        "startPeriod",
                        event.target.value,
                      )
                    }
                  />
                  <VietnameseDateField
                    required
                    type="month"
                    label="Đến hết tháng"
                    value={rule.endPeriod || ""}
                    onChange={(event) =>
                      updateFormRule(ruleIndex, "endPeriod", event.target.value)
                    }
                  />
                </Box>
                <CustomTextField
                  multiline
                  minRows={3}
                  label="Ghi chú"
                  value={rule.note || ""}
                  onChange={(event) =>
                    updateFormRule(ruleIndex, "note", event.target.value)
                  }
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color="secondary"
            onClick={() => setForm(null)}
            disabled={saving}
          >
            Hủy
          </Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa mức đóng"
        message={
          deleteTarget
            ? `Xóa mức đóng ${fundCategories[deleteTarget.categoryId]} áp dụng từ ${deleteTarget.startPeriod} đến ${deleteTarget.endPeriod}?`
            : ""
        }
        confirmText="Xóa"
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </Box>
  );
}
