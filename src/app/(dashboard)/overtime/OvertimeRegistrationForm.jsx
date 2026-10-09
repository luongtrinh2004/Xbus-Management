"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const currentDate = () =>
  new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const timeToMinutes = (value) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")
    ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
    : null;
const formatMinutes = (minutes) =>
  `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
export default function OvertimeRegistrationForm({
  action,
  record,
  form,
  config,
  actor,
  users,
  busy,
  error,
  onChange,
  onCancel,
  onSubmit,
}) {
  const [errors, setErrors] = useState({});
  const start = timeToMinutes(form.start),
    end = timeToMinutes(form.end);
  const overnight = start != null && end != null && end < start;
  const minutes =
    start == null || end == null || start === end
      ? 0
      : ((end - start + 1440) % 1440) - config.breakMinutes;
  const validDay =
    /^\d{4}-\d{2}-\d{2}$/.test(form.date || "") &&
    !Number.isNaN(Date.parse(form.date)) &&
    new Date(form.date).toISOString().slice(0, 10) === form.date;
  const type = !validDay
    ? "Chọn ngày làm thêm"
    : config.holidays.includes(form.date)
      ? "Làm thêm ngày lễ"
      : config.weekendDays.includes(
            new Date(`${form.date}T12:00:00+07:00`).getUTCDay(),
          )
        ? "Làm thêm cuối tuần"
        : "Làm thêm ngày thường";
  const manager = ["admin", "assistant"].includes(actor.role);
  const times = [
    ...new Set(
      [
        ...Array.from(
          { length: 48 },
          (_, index) =>
            `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
        ),
        form.start,
        form.end,
      ].filter(Boolean),
    ),
  ].sort();
  const originalDate = record
    ? new Date(Date.parse(record.startTime) + 7 * 3600000)
        .toISOString()
        .slice(0, 10)
    : null;
  function change(name, value) {
    setErrors((previous) => ({ ...previous, [name]: "", time: "" }));
    onChange(name, value);
  }
  function submit(event) {
    event.preventDefault();
    if (busy) return;
    const next = {};
    if (!validDay) next.date = "Vui lòng chọn ngày làm thêm hợp lệ.";
    else if (
      !config.allowPast &&
      form.date < currentDate() &&
      !(action === "edit" && (manager || form.date === originalDate))
    )
      next.date = "Không cho phép đăng ký trong quá khứ.";
    if (start == null) next.start = "Chọn giờ bắt đầu.";
    if (end == null) next.end = "Chọn giờ kết thúc.";
    if (start != null && end != null && minutes <= 0)
      next.time =
        "Khoảng giờ phải lớn hơn thời gian nghỉ; giờ bắt đầu và kết thúc phải khác nhau.";
    if (!form.reason.trim()) next.reason = "Vui lòng nhập lý do làm thêm giờ.";
    if (record?.status === "APPROVED" && !form.note.trim())
      next.note = "Vui lòng nhập lý do điều chỉnh đơn đã duyệt.";
    if (
      manager &&
      action === "create" &&
      !users.some(
        (user) =>
          user.id === (form.userId || actor.id) && user.status === "able",
      )
    )
      next.userId = "Vui lòng chọn nhân viên đang hoạt động.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit(event);
  }
  const inputProps = {
    fullWidth: true,
    size: "small",
    disabled: busy,
    InputLabelProps: { shrink: true },
  };
  return (
    <Box sx={{ maxWidth: 840, mx: "auto", width: "100%" }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            disabled={busy}
            aria-label="Quay lại danh sách"
            onClick={onCancel}
          >
            <i className="tabler-arrow-left" />
          </IconButton>
          <Typography variant="h5">
            {action === "create" ? "Thêm mới đăng ký" : "Sửa đăng ký"}
          </Typography>
        </Stack>
        <Accordion
          disableGutters
          sx={{
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<i className="tabler-chevron-down" />}>
            <Typography variant="h6">Quy định làm thêm giờ</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <Typography variant="body2">
                Admin hoặc trợ lý duyệt đơn đăng ký. Sau khi làm thêm, gửi báo
                cáo và thời gian thực tế để được xác nhận.
              </Typography>
              <Typography variant="body2">
                Giờ kết thúc nhỏ hơn giờ bắt đầu được tính sang ngày hôm sau.
                Mỗi đơn trừ {config.breakMinutes} phút nghỉ.
                {config.maxDailyMinutes
                  ? ` Giới hạn ngày: ${formatMinutes(config.maxDailyMinutes)}.`
                  : ""}
                {config.maxMonthlyMinutes
                  ? ` Giới hạn tháng: ${formatMinutes(config.maxMonthlyMinutes)}.`
                  : ""}
              </Typography>
            </Stack>
          </AccordionDetails>
        </Accordion>
        <Box component="form" noValidate onSubmit={submit}>
          <Stack spacing={3}>
            <Card variant="outlined" sx={{ boxShadow: "none" }}>
              <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                <Stack spacing={3}>
                  <Typography variant="h6">Thông tin đơn</Typography>
                  {error && <Alert severity="error">{error}</Alert>}
                  {manager && action === "create" && (
                    <TextField
                      {...inputProps}
                      required
                      select
                      label="Nhân viên"
                      value={form.userId || actor.id}
                      onChange={(event) => change("userId", event.target.value)}
                      error={!!errors.userId}
                      helperText={errors.userId}
                    >
                      {users
                        .filter((user) => user.status === "able")
                        .map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            {user.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  )}
                  {action === "edit" && manager && (
                    <Typography variant="body2" color="text.secondary">
                      Nhân viên: {record.userName}
                    </Typography>
                  )}
                  <TextField
                    {...inputProps}
                    required
                    label="Ngày làm thêm"
                    type="date"
                    value={form.date}
                    onChange={(event) => change("date", event.target.value)}
                    error={!!errors.date}
                    helperText={errors.date}
                  />
                  <TextField
                    {...inputProps}
                    label="Loại làm thêm"
                    value={type}
                    InputProps={{ readOnly: true }}
                    sx={{
                      "& .MuiInputBase-root": { bgcolor: "action.selected" },
                    }}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                    <TextField
                      {...inputProps}
                      required
                      select
                      label="Thời gian bắt đầu"
                      value={form.start}
                      onChange={(event) => change("start", event.target.value)}
                      error={!!errors.start || !!errors.time}
                      helperText={errors.start}
                      SelectProps={{
                        MenuProps: { PaperProps: { sx: { maxHeight: 280 } } },
                      }}
                    >
                      {times.map((time) => (
                        <MenuItem key={time} value={time}>
                          {time}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      {...inputProps}
                      required
                      select
                      label="Thời gian kết thúc"
                      value={form.end}
                      onChange={(event) => change("end", event.target.value)}
                      error={!!errors.end || !!errors.time}
                      helperText={errors.end}
                      SelectProps={{
                        MenuProps: { PaperProps: { sx: { maxHeight: 280 } } },
                      }}
                    >
                      {times.map((time) => (
                        <MenuItem key={time} value={time}>
                          {time}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  {errors.time && (
                    <Typography variant="caption" color="error.main">
                      {errors.time}
                    </Typography>
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Số giờ làm thêm
                    </Typography>
                    <Box
                      sx={{
                        maxWidth: 190,
                        bgcolor: "rgba(255,219,77,0.25)",
                        borderRadius: 1,
                        py: 1.5,
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="body2">
                        {formatMinutes(Math.max(0, minutes))}
                      </Typography>
                    </Box>
                    {(overnight || config.breakMinutes > 0) && (
                      <Typography variant="caption" color="text.secondary">
                        {overnight ? "Kết thúc vào ngày hôm sau. " : ""}
                        {config.breakMinutes > 0
                          ? `Đã trừ ${config.breakMinutes} phút nghỉ.`
                          : ""}
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    {...inputProps}
                    required
                    label="Lý do làm thêm giờ"
                    placeholder="Nhập lý do"
                    multiline
                    minRows={4}
                    value={form.reason}
                    onChange={(event) => change("reason", event.target.value)}
                    inputProps={{ maxLength: 10000 }}
                    error={!!errors.reason}
                    helperText={errors.reason}
                  />
                  {record?.status === "APPROVED" && (
                    <TextField
                      {...inputProps}
                      required
                      label="Lý do điều chỉnh"
                      multiline
                      minRows={2}
                      value={form.note}
                      onChange={(event) => change("note", event.target.value)}
                      error={!!errors.note}
                      helperText={errors.note}
                    />
                  )}
                  {manager && action === "create" && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          disabled={busy}
                          checked={form.approveImmediately}
                          onChange={(event) =>
                            change("approveImmediately", event.target.checked)
                          }
                        />
                      }
                      label="Duyệt trực tiếp đơn này"
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button disabled={busy} variant="outlined" onClick={onCancel}>
                Hủy bỏ
              </Button>
              <Button type="submit" variant="contained" disabled={busy}>
                {busy
                  ? "Đang lưu..."
                  : action === "create"
                    ? "Thêm mới"
                    : "Lưu thay đổi"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
