"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";
import { serializeEditableMembers } from "@/libs/workUi";

const EMPTY = { userId: "", role: "member" };

export default function MemberDialog({
  open,
  project,
  members = [],
  users = [],
  canManage,
  onClose,
  onSaved,
}) {
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentIds = useMemo(
    () => new Set(members.map((member) => member.userId)),
    [members],
  );
  const candidates = useMemo(
    () => users.filter((user) => !currentIds.has(user.id)),
    [users, currentIds],
  );

  const persist = async (nextMembers) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/work/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: serializeEditableMembers(nextMembers, project.ownerId),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      toast.success("Đã cập nhật thành viên");
      onSaved?.();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    if (!draft.userId) return;
    const user = users.find((item) => item.id === draft.userId);
    const ok = await persist([
      ...members.map((member) => ({
        userId: member.userId,
        role: member.role,
      })),
      { userId: draft.userId, role: draft.role },
    ]);
    if (ok) {
      toast.success(`Đã thêm ${user?.name || "thành viên"}`);
      setDraft(EMPTY);
    }
  };

  const changeRole = async (member, role) => {
    await persist(
      members.map((item) => ({
        userId: item.userId,
        role: item.userId === member.userId ? role : item.role,
      })),
    );
  };

  const remove = async (member) => {
    await persist(
      members
        .filter((item) => item.userId !== member.userId)
        .map((item) => ({ userId: item.userId, role: item.role })),
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Thành viên dự án</DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {members.map((member) => (
          <Box
            key={member.userId}
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}
          >
            <Avatar src={member.user?.avatarUrl}>
              {member.user?.name?.[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {member.user?.name || member.userId}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {member.user?.email}
              </Typography>
            </Box>
            {member.role === "owner" || !canManage ? (
              <Chip
                size="small"
                variant="tonal"
                label={
                  member.role === "owner"
                    ? "Chủ dự án"
                    : member.role === "editor"
                      ? "Biên tập"
                      : "Thành viên"
                }
              />
            ) : (
              <>
                <TextField
                  select
                  size="small"
                  value={member.role}
                  onChange={(e) => changeRole(member, e.target.value)}
                  disabled={saving}
                  sx={{ width: 130 }}
                >
                  <MenuItem value="editor">Biên tập</MenuItem>
                  <MenuItem value="member">Thành viên</MenuItem>
                </TextField>
                <IconButton
                  size="small"
                  color="error"
                  disabled={saving}
                  onClick={() => remove(member)}
                >
                  <i className="tabler-trash" />
                </IconButton>
              </>
            )}
          </Box>
        ))}
        {canManage && (
          <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center" }}>
            <TextField
              select
              size="small"
              value={draft.userId}
              onChange={(e) => setDraft({ ...draft, userId: e.target.value })}
              sx={{ flex: 1 }}
            >
              <MenuItem value="">Chọn thành viên...</MenuItem>
              {candidates.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name} — {user.email}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              sx={{ width: 130 }}
            >
              <MenuItem value="member">Thành viên</MenuItem>
              <MenuItem value="editor">Biên tập</MenuItem>
            </TextField>
            <Button
              variant="contained"
              disabled={saving || !draft.userId}
              onClick={add}
            >
              Thêm
            </Button>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
          Không thể bỏ thành viên đang phụ trách công việc chưa lưu trữ — hãy
          chuyển người phụ trách trước.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="tonal" onClick={onClose}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
