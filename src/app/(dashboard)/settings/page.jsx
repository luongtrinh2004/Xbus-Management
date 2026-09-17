"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const canManage = ["admin", "assistant"].includes(session?.user?.role);
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
    const response = await fetch("/api/fund-settings");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Không thể tải cài đặt");
    setRules(data.rules || []);
    setHistory(data.history || []);
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
          title="Lịch sử mức đóng quỹ"
          subheader="Các cấu hình đã hết hiệu lực, sắp xếp từ kỳ gần nhất. Lịch sử chỉ được xem và không thể sửa hoặc xóa."
          avatar={<i className="tabler-history" style={{ fontSize: 26 }} />}
        />
        {settingsTable(historyRules, true)}
      </Card>
      <Card>
        <CardHeader
          title="Mức đóng hiện tại và sắp áp dụng"
          subheader="Mỗi loại nhân sự có một mức đóng tại một thời điểm. Cấu hình mới không thay đổi các kỳ đã phát sinh."
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
