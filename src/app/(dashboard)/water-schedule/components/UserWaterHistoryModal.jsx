"use client";

import { useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import tableStyles from "@core/styles/table.module.css";

export default function UserWaterHistoryModal({
  open,
  onClose,
  user,
  allSchedules = [],
}) {
  // Tìm tất cả các lịch mà nhân sự này đã/đang được phân công
  const userHistory = useMemo(() => {
    if (!user) return [];
    const uid = user.id;
    const code = user.code;
    const name = user.name;

    return allSchedules
      .filter((s) =>
        (s.participants || []).some((p) => {
          if (typeof p === "string")
            return p.includes(name) || (code && p.includes(code));
          return p.userId === uid || (code && p.code === code);
        }),
      )
      .map((s) => {
        const myP = (s.participants || []).find((p) => {
          if (typeof p === "string")
            return p.includes(name) || (code && p.includes(code));
          return p.userId === uid || (code && p.code === code);
        });

        const isCompleted = s.status === "completed";
        const isAttended =
          typeof myP === "object" ? myP.completed !== false : isCompleted;

        return {
          id: s.id,
          weekIndex: s.weekIndex,
          range: s.range,
          date: s.date,
          time: s.time || "09:00",
          note: s.note,
          status: s.status,
          isAttended,
        };
      });
  }, [user, allSchedules]);

  if (!user) return null;

  const trips = user.waterTripCount || 0;
  const points = user.schedulingPoints || 0;
  const isFemale = user.gender === "female";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle component="div">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: isFemale
                  ? "rgba(255, 76, 81, 0.15)"
                  : "rgba(115, 103, 240, 0.15)",
                color: isFemale ? "error.main" : "primary.main",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {user.name?.charAt(0)}
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h5" fontWeight={700}>
                  {user.name}
                </Typography>
                {user.code && (
                  <Chip
                    size="small"
                    label={user.code}
                    color="primary"
                    variant="tonal"
                    sx={{ height: 22 }}
                  />
                )}
                <Chip
                  size="small"
                  label={isFemale ? "Nữ" : "Nam"}
                  color={isFemale ? "error" : "info"}
                  variant="tonal"
                  sx={{ height: 22 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {user.email} ·{" "}
                {{
                  web_app: "Web/App",
                  ap: "AP",
                  peer_admin: "Peer Admin",
                  van_hanh: "Vận Hành",
                }[user.typeId] || "Chưa phân loại"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip
              size="small"
              label={`Đã đi: ${trips} lượt`}
              color="success"
              variant="tonal"
            />
            <Chip
              size="small"
              label={`Điểm: ${points} điểm`}
              color="primary"
              variant="tonal"
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          Chi tiết các hôm được phân công đi lấy nước:
        </Typography>

        {userHistory.length > 0 ? (
          <Box sx={{ overflowX: "auto" }}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Tuần</th>
                  <th>Ngày lấy nước</th>
                  <th>Giờ</th>
                  <th>Trạng thái / Kết quả</th>
                  <th style={{ textAlign: "center" }}>Điểm ghi nhận</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {userHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-actionHover">
                    <td>
                      <Typography variant="body2" fontWeight={600}>
                        Tuần {h.weekIndex}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {h.range}
                      </Typography>
                    </td>
                    <td>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <i className="tabler-calendar text-primary text-sm" />
                        <Typography variant="body2" fontWeight={600}>
                          {h.date}
                        </Typography>
                      </Box>
                    </td>
                    <td>{h.time}</td>
                    <td>
                      {h.status === "completed" ? (
                        h.isAttended ? (
                          <Chip
                            size="small"
                            label="Đã tham gia"
                            color="success"
                            variant="tonal"
                          />
                        ) : (
                          <Chip
                            size="small"
                            label="Vắng mặt"
                            color="secondary"
                            variant="tonal"
                          />
                        )
                      ) : h.status === "cancelled" ? (
                        <Chip
                          size="small"
                          label="Đã hủy ca"
                          color="error"
                          variant="tonal"
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Sắp tới"
                          color="info"
                          variant="tonal"
                        />
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {h.status === "completed" && h.isAttended ? (
                        <Chip
                          size="small"
                          label="+1 điểm"
                          color="success"
                          variant="tonal"
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="0 điểm"
                          color="secondary"
                          variant="tonal"
                        />
                      )}
                    </td>
                    <td>{h.note || "Lấy nước tại tầng 1"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        ) : (
          <Alert severity="info" icon={<i className="tabler-info-circle" />}>
            Nhân sự <strong>{user.name}</strong> chưa có lịch sử đi lấy nước nào
            trong các tháng đã lập lịch.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button variant="tonal" color="secondary" onClick={onClose}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
