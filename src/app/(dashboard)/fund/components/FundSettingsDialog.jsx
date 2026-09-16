"use client";
import VietnameseDateField from "@/components/VietnameseDateField";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Typography,
  Autocomplete,
  Checkbox,
  Avatar,
} from "@mui/material";
import { toast } from "react-toastify";
import {
  fundCategories,
  defaultFundAmounts,
  currentFundPeriod,
  periodKey,
} from "@/libs/fundRules";
import { resolveAvatar } from "@/utils/getDefaultAvatar";
export default function FundSettingsDialog({ open, onClose, onSaved, users }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setForm(null);
    fetch("/api/fund-settings")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        if (active)
          setForm({
            amounts: data.window?.amounts || { ...defaultFundAmounts },
            startPeriod:
              data.window?.startPeriod || periodKey(currentFundPeriod()),
            endPeriod: data.window?.endPeriod || periodKey(currentFundPeriod()),
            voluntaryUserIds: data.voluntaryUserIds || [],
          });
      })
      .catch((e) => toast.error(e.message));
    return () => {
      active = false;
    };
  }, [open]);
  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/fund-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await onSaved(data);
      onClose();
      toast.success("Đã lưu cài đặt đóng quỹ");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        Cài đặt mức đóng quỹ
        <IconButton
          aria-label="Đóng"
          onClick={onClose}
          disabled={saving}
          sx={{ float: "right" }}
        >
          <i className="tabler-x" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {!form ? (
          <Typography>Đang tải cài đặt…</Typography>
        ) : (
          <>
            <Typography color="text.secondary" mb={3}>
              Bốn mức đóng dùng chung thời gian áp dụng. Hết hạn, hệ thống trở
              về mức cố định 150.000 / 150.000 / 100.000 / 100.000 đ. Mức cơ bản
              của các kỳ đã phát sinh được giữ nguyên.
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 3,
                pt: 1,
              }}
            >
              {Object.entries(fundCategories).map(([id, label]) => (
                <TextField
                  key={id}
                  required
                  label={label + " (VNĐ)"}
                  value={
                    form.amounts[id]
                      ? Number(form.amounts[id]).toLocaleString("vi-VN")
                      : ""
                  }
                  inputProps={{ inputMode: "numeric" }}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      amounts: {
                        ...f.amounts,
                        [id]: e.target.value.replace(/\D/g, ""),
                      },
                    }))
                  }
                />
              ))}
            </Box>
            {/* Thời gian áp dụng */}
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                sx={{ display: "block", mb: 1.5, textTransform: "uppercase", letterSpacing: "0.5px" }}
              >
                Thời gian áp dụng
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <VietnameseDateField
                  required
                  fullWidth
                  type="month"
                  label="Áp dụng từ tháng"
                  InputLabelProps={{ shrink: true }}
                  value={form.startPeriod}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startPeriod: e.target.value }))
                  }
                />
                <VietnameseDateField
                  required
                  fullWidth
                  type="month"
                  label="Đến hết tháng"
                  InputLabelProps={{ shrink: true }}
                  value={form.endPeriod}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endPeriod: e.target.value }))
                  }
                />
              </Box>
            </Box>
            <Typography variant="h6" mt={5} mb={1}>
              Nhân sự đóng dư tự nguyện
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Tiền dư của người được chọn không giảm nghĩa vụ kỳ sau. Tiền thiếu
              vẫn cộng vào kỳ sau. Áp dụng cho kỳ hiện tại và kỳ mới.
            </Typography>
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={users}
              value={users.filter((u) => form.voluntaryUserIds.includes(u.id))}
              getOptionLabel={(u) => u.name || ""}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              filterOptions={(options, { inputValue }) =>
                options.filter((u) =>
                  normalize([u.name, u.email, u.code].join(" ")).includes(
                    normalize(inputValue),
                  ),
                )
              }
              onChange={(_, selected) =>
                setForm((f) => ({
                  ...f,
                  voluntaryUserIds: selected.map((u) => u.id),
                }))
              }
              renderOption={(props, u, { selected }) => {
                const { key, ...rest } = props;
                return (
                  <li {...rest} key={u.id}>
                    <Checkbox key="selection" checked={selected} />
                    <Avatar
                      key="avatar"
                      src={resolveAvatar(u)}
                      sx={{ width: 30, height: 30, mr: 2 }}
                    />
                    <Box key="identity">
                      <Typography>{u.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {u.code} · {u.email}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Chọn nhân sự"
                  placeholder="Tìm theo tên, email, mã nhân sự"
                />
              )}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Đóng
        </Button>
        <Button variant="contained" disabled={!form || saving} onClick={save}>
          {saving ? "Đang lưu…" : "Lưu cài đặt"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
