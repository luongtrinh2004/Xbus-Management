"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { PRIORITY_LABELS, formatDate } from "./workConstants";
import WorkAvatar from "./WorkAvatar";

const draftSectionFor = (sections, completed) => {
  if (completed)
    return (
      sections.find((section) => section.status === "done")?.id ||
      sections.at(-1)?.id
    );
  return (
    sections.find((section) => section.status !== "done")?.id || sections[0]?.id
  );
};

export default function TaskDrawer({
  task,
  data,
  users,
  canManage,
  canWorkflow,
  onClose,
  onUpdate,
  comment,
  setComment,
  addComment,
}) {
  const [draft, setDraft] = useState(task || {});
  useEffect(() => {
    setDraft(task || {});
  }, [task]);

  const sections = useMemo(() => data?.sections || [], [data]);
  const taskActivities = useMemo(
    () => (data?.activities || []).filter((item) => item.taskId === task?.id),
    [data, task],
  );

  if (!task) return null;
  const comments = (data?.comments || []).filter(
    (item) => item.taskId === task.id,
  );
  const editable = canManage || canWorkflow;

  const saveManaged = () =>
    onUpdate(task.id, {
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      startDate: draft.startDate || "",
      dueDate: draft.dueDate || "",
      assigneeId: draft.assigneeId,
      sectionId: draft.sectionId,
      subtasks: draft.subtasks || [],
    });

  const toggleCompleted = (checked) => {
    const sectionId = draftSectionFor(sections, checked);
    setDraft({ ...draft, completed: checked, sectionId });
    if (!canManage) onUpdate(task.id, { sectionId });
  };

  return (
    <Drawer
      anchor="right"
      open={Boolean(task)}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 540 }, p: 3 } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {task.code}
        </Typography>
        <Chipish status={task.status} completed={task.completed} />
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose}>
          <i className="tabler-x" />
        </IconButton>
      </Box>

      <TextField
        variant="standard"
        fullWidth
        value={draft.title || ""}
        disabled={!canManage}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        inputProps={{ style: { fontSize: 22, fontWeight: 700 } }}
        sx={{ mt: 2 }}
      />
      {!canManage && canWorkflow && (
        <Typography variant="caption" color="text.secondary">
          Bạn chỉ có thể cập nhật nhóm/trạng thái của công việc này.
        </Typography>
      )}

      <TextField
        label="Mô tả"
        multiline
        minRows={4}
        fullWidth
        value={draft.description || ""}
        disabled={!canManage}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        sx={{ mt: 3 }}
      />

      <Box
        sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 2 }}
      >
        <TextField
          select
          label="Nhóm công việc"
          value={draft.sectionId || ""}
          disabled={!editable}
          onChange={(e) => {
            const sectionId = e.target.value;
            const section = sections.find((item) => item.id === sectionId);
            setDraft({
              ...draft,
              sectionId,
              completed: section?.status === "done",
              status: section?.status,
            });
            if (!canManage) onUpdate(task.id, { sectionId });
          }}
        >
          {sections.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Người phụ trách"
          value={draft.assigneeId || ""}
          disabled={!canManage}
          onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}
        >
          <MenuItem value="">Chưa giao</MenuItem>
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Độ ưu tiên"
          value={draft.priority || "medium"}
          disabled={!canManage}
          onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
        >
          {Object.entries(PRIORITY_LABELS).map(([key, value]) => (
            <MenuItem key={key} value={key}>
              {value[0]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Ngày bắt đầu"
          type="date"
          value={draft.startDate || ""}
          disabled={!canManage}
          onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Hạn hoàn thành"
          type="date"
          value={draft.dueDate || ""}
          disabled={!canManage}
          onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Checkbox
            checked={Boolean(draft.completed)}
            disabled={!editable}
            onChange={(e) => toggleCompleted(e.target.checked)}
          />
          <Typography variant="body2">Hoàn thành</Typography>
        </Box>
      </Box>

      {canManage && (
        <Button variant="contained" onClick={saveManaged} sx={{ mt: 2 }}>
          Lưu thay đổi
        </Button>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          mt: 2,
          p: 1.5,
          bgcolor: "action.hover",
          borderRadius: 2,
        }}
      >
        <Meta label="Ưu tiên" value={PRIORITY_LABELS[task.priority]?.[0]} />
        <Meta label="Hạn" value={formatDate(task.dueDate)} />
        <Meta
          label="Người phụ trách"
          value={
            users.find((user) => user.id === task.assigneeId)?.name ||
            "Chưa giao"
          }
        />
        <Meta label="Tạo lúc" value={formatDate(task.createdAt)} />
      </Box>

      <Divider sx={{ my: 3 }} />
      <Typography fontWeight={700}>Công việc con</Typography>
      {(draft.subtasks || []).map((sub, index) => (
        <Box key={sub.id} sx={{ display: "flex", alignItems: "center" }}>
          <Checkbox
            checked={sub.completed}
            disabled={!canManage}
            onChange={(e) => {
              const next = [...draft.subtasks];
              next[index] = { ...sub, completed: e.target.checked };
              setDraft({ ...draft, subtasks: next });
            }}
          />
          <TextField
            variant="standard"
            fullWidth
            value={sub.title}
            disabled={!canManage}
            onChange={(e) => {
              const next = [...draft.subtasks];
              next[index] = { ...sub, title: e.target.value };
              setDraft({ ...draft, subtasks: next });
            }}
          />
        </Box>
      ))}
      {canManage && (
        <Button
          size="small"
          startIcon={<i className="tabler-plus" />}
          onClick={() =>
            setDraft({
              ...draft,
              subtasks: [
                ...(draft.subtasks || []),
                { id: `new_${Date.now()}`, title: "", completed: false },
              ],
            })
          }
        >
          Thêm việc con
        </Button>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography fontWeight={700}>Hoạt động của công việc</Typography>
      {taskActivities.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Chưa có hoạt động.
        </Typography>
      )}
      {taskActivities.map((item) => (
        <Typography
          key={item.id}
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          {item.details} · {new Date(item.createdAt).toLocaleString("vi-VN")}
        </Typography>
      ))}

      <Divider sx={{ my: 3 }} />
      <Typography fontWeight={700}>Bình luận ({comments.length})</Typography>
      {comments.map((item) => (
        <Box key={item.id} sx={{ display: "flex", gap: 1.5, mt: 2 }}>
          <WorkAvatar user={item.author} sx={{ width: 32, height: 32 }} />
          <Box
            sx={{ bgcolor: "action.hover", borderRadius: 2, p: 1.5, flex: 1 }}
          >
            <Typography variant="caption" fontWeight={700}>
              {item.author?.name || "Thành viên"}
            </Typography>
            <Typography variant="body2">{item.content}</Typography>
          </Box>
        </Box>
      ))}
      <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Viết bình luận..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              addComment();
            }
          }}
        />
        <IconButton color="primary" onClick={addComment}>
          <i className="tabler-send" />
        </IconButton>
      </Box>
    </Drawer>
  );
}

function Meta({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}

function Chipish({ status, completed }) {
  const meta =
    completed || status === "done"
      ? { label: "Hoàn thành", className: "tabler-circle-check" }
      : status === "blocked"
        ? { label: "Bị chặn", className: "tabler-circle-x" }
        : status === "in_progress"
          ? { label: "Đang thực hiện", className: "tabler-clock" }
          : { label: "Cần làm", className: "tabler-circle-dotted" };
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <i className={meta.className} />
      <Typography variant="caption">{meta.label}</Typography>
    </Box>
  );
}
