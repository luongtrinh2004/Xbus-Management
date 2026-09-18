"use client";

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
import { currentFundPeriod, fundCategories, periodKey } from "@/libs/fundRules";

const emptyForm = () => ({
  id: "",
  categoryId: "category_official",
  amount: "",
  startPeriod: periodKey(currentFundPeriod()),
  endPeriod: periodKey(currentFundPeriod()),
  note: "",
});
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tab, setTab] = useState("reminder");
  const [config, setConfig] = useState({
    reminder: { enabled: false, deadlineDay: 10, daysBefore: [3, 1] },
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
    ...rules.filter((rule) => rule.endPeriod < currentPeriod),
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
  useEffect(() => {
    if (status === "loading") return;
    load()
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [status]);
  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/fund-settings", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRules(data.rules || []);
      setHistory(data.history || []);
      setForm(null);
      toast.success(form.id ? "Đã cập nhật mức đóng" : "Đã thêm mức đóng");
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
      <Table className={tableStyles.table}>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>LOẠI NHÂN SỰ</TableCell>
            <TableCell align="right">SỐ TIỀN</TableCell>
            <TableCell>THỜI GIAN</TableCell>
            <TableCell>GHI CHÚ</TableCell>
            <TableCell align="center">
              {history ? "TRẠNG THÁI" : "THAO TÁC"}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length ? (
            items.map((rule, index) => (
              <TableRow key={rule.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  {fundCategories[rule.categoryId] || rule.categoryId}
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={600}>{money(rule.amount)}</Typography>
                </TableCell>
                <TableCell>
                  {rule.startPeriod} → {rule.endPeriod}
                </TableCell>
                <TableCell>{rule.note || "—"}</TableCell>
                <TableCell align="center">
                  {history ? (
                    <Box
                      sx={{ display: "grid", justifyItems: "center", gap: 0.5 }}
                    >
                      <Chip
                        size="small"
                        color="secondary"
                        variant="tonal"
                        label={
                          rule.historyAction === "updated"
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
                          setForm({ ...rule, amount: String(rule.amount) })
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
            <Button
              variant="contained"
              disabled={saving}
              onClick={() =>
                saveConfig(
                  { action: "saveReminder", ...config.reminder },
                  "Đã lưu cài đặt nhắc lịch",
                )
              }
            >
              Lưu cài đặt
            </Button>
          </Box>
        </Card>
      )}

      {tab === "period" && (
        <>
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Cài đặt quỹ phòng"
              subheader="Quản lý mức đóng theo loại nhân sự và thời gian áp dụng. Các kỳ đã phát sinh không bị thay đổi."
              avatar={
                <i className="tabler-settings" style={{ fontSize: 26 }} />
              }
              action={
                <Button
                  variant="contained"
                  startIcon={<i className="tabler-plus" />}
                  onClick={() => setForm(emptyForm())}
                >
                  Thêm mức đóng
                </Button>
              }
            />
            {settingsTable(manageableRules)}
          </Card>
          <Card sx={{ mt: 4 }}>
            <CardHeader
              title="Lịch sử mức đóng quỹ"
              subheader="Các cấu hình đã hết hiệu lực, sắp xếp từ kỳ gần nhất. Lịch sử chỉ xem và không thể sửa hoặc xóa."
              avatar={<i className="tabler-history" style={{ fontSize: 26 }} />}
            />
            {settingsTable(historyRules, true)}
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
        <DialogTitle>{form?.id ? "Sửa mức đóng" : "Thêm mức đóng"}</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Box sx={{ display: "grid", gap: 3 }}>
            <CustomTextField
              select
              required
              label="Loại nhân sự"
              value={form?.categoryId || ""}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  categoryId: event.target.value,
                }))
              }
            >
              {Object.entries(fundCategories).map(([id, label]) => (
                <MenuItem key={id} value={id}>
                  {label}
                </MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              required
              label="Số tiền (VNĐ)"
              value={
                form?.amount ? Number(form.amount).toLocaleString("vi-VN") : ""
              }
              inputProps={{ inputMode: "numeric" }}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  amount: event.target.value.replace(/\D/g, ""),
                }))
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
                value={form?.startPeriod || ""}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    startPeriod: event.target.value,
                  }))
                }
              />
              <VietnameseDateField
                required
                type="month"
                label="Đến hết tháng"
                value={form?.endPeriod || ""}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    endPeriod: event.target.value,
                  }))
                }
              />
            </Box>
            <CustomTextField
              multiline
              minRows={3}
              label="Ghi chú"
              value={form?.note || ""}
              onChange={(event) =>
                setForm((value) => ({ ...value, note: event.target.value }))
              }
            />
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
