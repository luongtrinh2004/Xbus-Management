"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";

import ConfirmDialog from "@/components/ConfirmDialog";
import MemberDialog from "../../components/MemberDialog";
import ProjectHeader from "../../components/ProjectHeader";
import StatusUpdateDialog from "../../components/StatusUpdateDialog";
import TaskDrawer from "../../components/TaskDrawer";
import {
  CalendarView,
  DashboardView,
  TimelineView,
} from "../../components/ProjectViews";
import {
  HEALTH_META,
  PRIORITY_LABELS,
  VIEW_OPTIONS,
  todayIso,
} from "../../components/workConstants";

const blank = {
  title: "",
  description: "",
  sectionId: "",
  assigneeId: "",
  priority: "medium",
  dueDate: "",
  subtasks: [],
};

export default function ProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(blank);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "agile",
    description: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work/projects/${id}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setData(body);
      setError("");
      return body;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  useEffect(() => {
    if (data?.project?.defaultView) setView(data.project.defaultView);
  }, [data?.project?.id]);

  const memberUsers = useMemo(
    () => data?.members.map((item) => item.user).filter(Boolean) || [],
    [data],
  );

  const role = data?.project?.role;
  const canManage = Boolean(data?.project?.canManage);
  const canManageTasks = ["admin", "owner", "editor"].includes(role);
  const viewerId = data?.project?.viewerId;
  const isAssignedToMe = (task) =>
    !canManageTasks && role === "member" && task.assigneeId === viewerId;
  const canWorkflow = (task) => canManageTasks || isAssignedToMe(task);

  const tasks = useMemo(
    () =>
      (data?.tasks || []).filter((task) => {
        const q = query.toLocaleLowerCase("vi");
        return (
          (!q ||
            `${task.code} ${task.title}`
              .toLocaleLowerCase("vi")
              .includes(q)) &&
          (assignee === "all" || task.assigneeId === assignee)
        );
      }),
    [data, query, assignee],
  );

  const openCreate = (sectionId) => {
    setForm({ ...blank, sectionId: sectionId || data.sections[0]?.id || "" });
    setDialog(true);
  };

  const create = async () => {
    try {
      const res = await fetch(`/api/work/projects/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      toast.success("Đã tạo công việc");
      setDialog(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const update = async (taskId, patch, silent = false) => {
    try {
      const res = await fetch(`/api/work/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      if (!silent) toast.success("Đã cập nhật");
      const { audit, ...task } = body;
      setSelected((current) =>
        current?.id === taskId ? { ...current, ...task } : current,
      );
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const addComment = async () => {
    if (!comment.trim() || !selected) return;
    try {
      const res = await fetch(`/api/work/tasks/${selected.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setComment("");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onDrop = (event, section) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/task-id");
    if (!taskId) return;
    const task = (data?.tasks || []).find((item) => item.id === taskId);
    if (!task || !canWorkflow(task)) {
      toast.error("Bạn không có quyền chuyển công việc này");
      return;
    }
    update(
      taskId,
      {
        sectionId: section.id,
        status: section.status,
        completed: section.status === "done",
      },
      true,
    );
  };

  const archive = async () => {
    try {
      const res = await fetch(`/api/work/projects/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      toast.success("Đã lưu trữ dự án");
      setArchiveOpen(false);
      router.push("/work/projects");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const saveTemplate = async () => {
    try {
      const res = await fetch("/api/work/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateForm.name.trim(),
          category: templateForm.category,
          description: templateForm.description,
          sections: data.sections.map((section) => ({
            name: section.name,
            status: section.status,
          })),
          tasks: data.tasks.slice(0, 100).map((task) => ({
            title: task.title,
            section:
              data.sections.find((section) => section.id === task.sectionId)
                ?.name || data.sections[0]?.name,
            priority: task.priority,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      toast.success("Đã lưu mẫu dự án");
      setTemplateOpen(false);
      setTemplateForm({ name: "", category: "agile", description: "" });
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading && !data)
    return (
      <Box textAlign="center" py={10}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  const completed = data.tasks.filter((task) => task.completed).length;
  const overdue = data.tasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate < todayIso() &&
      !task.completed,
  ).length;
  const latestStatus =
    data.statusUpdates?.[0] ||
    (data.project.health ? { health: data.project.health, note: "" } : null);

  return (
    <>
      <ProjectHeader
        data={data}
        view={view}
        onViewChange={setView}
        canManage={canManage}
        onOpenMembers={() => setMembersOpen(true)}
        onOpenStatusUpdate={() => setStatusOpen(true)}
        onReload={load}
        onArchive={() => setArchiveOpen(true)}
        onSaveTemplate={() => setTemplateOpen(true)}
      />

      <Card>
        <CardContent sx={{ py: "12px !important" }}>
          <Tabs
            value={view}
            onChange={(_, value) => setView(value)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {VIEW_OPTIONS.map((item) => (
              <Tab
                key={item.value}
                value={item.value}
                label={item.label}
                icon={<i className={item.icon} />}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {view === "overview" && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
            gap: 3,
          }}
        >
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  Tình hình dự án
                </Typography>
                <Chip
                  size="small"
                  variant="tonal"
                  color={
                    HEALTH_META[data.project.health]?.color || "default"
                  }
                  icon={
                    <i
                      className={
                        HEALTH_META[data.project.health]?.icon ||
                        "tabler-circle-dotted"
                      }
                    />
                  }
                  label={
                    HEALTH_META[data.project.health]?.label || "Chưa cập nhật"
                  }
                />
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(4, 1fr)",
                  },
                  gap: 2,
                  mt: 3,
                }}
              >
                {[
                  [data.tasks.length, "Tổng công việc", "tabler-list-check", "primary"],
                  [completed, "Đã hoàn thành", "tabler-circle-check", "success"],
                  [overdue, "Quá hạn", "tabler-alert-triangle", "error"],
                  [
                    data.tasks.filter((task) => !task.assigneeId).length,
                    "Chưa giao",
                    "tabler-user-off",
                    "warning",
                  ],
                ].map(([value, label, icon, color]) => (
                  <Box
                    key={label}
                    sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}
                  >
                    <i className={icon} style={{ fontSize: 26 }} />
                    <Typography
                      variant="h4"
                      color={`${color}.main`}
                      fontWeight={700}
                      mt={1}
                    >
                      {value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="caption">Tiến độ</Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {data.project.progress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={data.project.progress}
                  sx={{ mt: 0.7, height: 8, borderRadius: 5 }}
                />
              </Box>

              {latestStatus?.note && (
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Cập nhật gần nhất
                  </Typography>
                  <Typography variant="body2">{latestStatus.note}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />
              <Typography fontWeight={700} mb={2}>
                Công việc gần đây
              </Typography>
              {data.tasks
                .slice(-6)
                .reverse()
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    users={memberUsers}
                    sections={data.sections}
                    canManageTasks={canManageTasks}
                    canWorkflow={canWorkflow(task)}
                    onOpen={setSelected}
                    onSectionChange={(sectionId) =>
                      update(task.id, { sectionId }, true)
                    }
                    onToggle={() =>
                      update(
                        task.id,
                        {
                          completed: !task.completed,
                          status: !task.completed ? "done" : "todo",
                        },
                        true,
                      )
                    }
                  />
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                Thành viên ({data.members.length})
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                {data.members.map((member) => (
                  <Box
                    key={member.id}
                    sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                  >
                    <Avatar src={member.user?.avatarUrl}>
                      {member.user?.name?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {member.user?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.user?.email}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={
                        member.role === "owner"
                          ? "Chủ dự án"
                          : member.role === "editor"
                            ? "Biên tập"
                            : "Thành viên"
                      }
                    />
                  </Box>
                ))}
              </Box>
              <Divider sx={{ my: 3 }} />
              <Typography fontWeight={700}>Hoạt động gần đây</Typography>
              {data.activities.slice(0, 8).map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    mt: 2,
                    pl: 2,
                    borderLeft: "2px solid",
                    borderColor: "primary.main",
                  }}
                >
                  <Typography variant="body2">{item.details}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      )}

      {(view === "list" || view === "board") && (
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
              <TextField
                size="small"
                placeholder="Tìm công việc..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ flex: 1, minWidth: 220 }}
              />
              <TextField
                select
                size="small"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                sx={{ minWidth: 190 }}
              >
                <MenuItem value="all">Tất cả người phụ trách</MenuItem>
                {memberUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </TextField>
              {canManageTasks && (
                <Button
                  variant="contained"
                  startIcon={<i className="tabler-plus" />}
                  onClick={() => openCreate()}
                >
                  Thêm công việc
                </Button>
              )}
            </Box>

            {view === "list" ? (
              data.sections.map((section) => (
                <Box key={section.id} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography fontWeight={700}>{section.name}</Typography>
                    <Chip
                      size="small"
                      label={tasks.filter((task) => task.sectionId === section.id).length}
                    />
                    {canManageTasks && (
                      <IconButton
                        size="small"
                        onClick={() => openCreate(section.id)}
                      >
                        <i className="tabler-plus" />
                      </IconButton>
                    )}
                  </Box>
                  {tasks
                    .filter((task) => task.sectionId === section.id)
                    .map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        users={memberUsers}
                        sections={data.sections}
                        canManageTasks={canManageTasks}
                        canWorkflow={canWorkflow(task)}
                        onOpen={setSelected}
                        onSectionChange={(sectionId) =>
                          update(task.id, { sectionId }, true)
                        }
                        onToggle={() =>
                          update(
                            task.id,
                            {
                              completed: !task.completed,
                              status: !task.completed ? "done" : "todo",
                            },
                            true,
                          )
                        }
                      />
                    ))}
                </Box>
              ))
            ) : (
              <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1 }}>
                {data.sections.map((section) => (
                  <Box
                    key={section.id}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => onDrop(event, section)}
                    sx={{
                      minWidth: 280,
                      width: 300,
                      bgcolor: "action.hover",
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1.5,
                      }}
                    >
                      <Typography fontWeight={700}>
                        {section.name} ·{" "}
                        {tasks.filter((t) => t.sectionId === section.id).length}
                      </Typography>
                      {canManageTasks && (
                        <IconButton
                          size="small"
                          onClick={() => openCreate(section.id)}
                        >
                          <i className="tabler-plus" />
                        </IconButton>
                      )}
                    </Box>
                    {tasks
                      .filter((task) => task.sectionId === section.id)
                      .map((task) => (
                        <Card
                          key={task.id}
                          draggable={canWorkflow(task)}
                          onDragStart={(event) => {
                            if (canWorkflow(task))
                              event.dataTransfer.setData("text/task-id", task.id);
                          }}
                          onClick={() => setSelected(task)}
                          sx={{
                            mb: 1.5,
                            cursor: canWorkflow(task) ? "grab" : "pointer",
                            "&:hover": { boxShadow: 4 },
                          }}
                        >
                          <CardContent sx={{ p: "14px !important" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {task.code}
                            </Typography>
                            <Typography
                              fontWeight={600}
                              sx={{
                                textDecoration: task.completed
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {task.title}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mt: 2,
                              }}
                            >
                              <Chip
                                size="small"
                                label={PRIORITY_LABELS[task.priority]?.[0]}
                                color={PRIORITY_LABELS[task.priority]?.[1]}
                                variant="tonal"
                              />
                              <Avatar
                                src={task.assignee?.avatarUrl}
                                sx={{ width: 28, height: 28, fontSize: 12 }}
                              >
                                {task.assignee?.name?.[0] || "?"}
                              </Avatar>
                            </Box>
                            {task.dueDate && (
                              <Typography
                                variant="caption"
                                color={
                                  task.dueDate < todayIso() &&
                                  !task.completed
                                    ? "error.main"
                                    : "text.secondary"
                                }
                                sx={{ display: "block", mt: 1 }}
                              >
                                <i className="tabler-calendar" />{" "}
                                {new Date(
                                  `${task.dueDate}T00:00:00`,
                                ).toLocaleDateString("vi-VN")}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {view === "timeline" && (
        <TimelineView
          project={data.project}
          tasks={tasks}
          onOpenTask={setSelected}
        />
      )}

      {view === "calendar" && (
        <CalendarView tasks={tasks} onOpenTask={setSelected} />
      )}

      {view === "dashboard" && (
        <DashboardView
          project={data.project}
          tasks={tasks}
          members={data.members}
          activities={data.activities}
        />
      )}

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Tạo công việc</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "12px !important",
          }}
        >
          <TextField
            label="Tiêu đề"
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            label="Mô tả"
            multiline
            minRows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              select
              label="Nhóm"
              value={form.sectionId}
              onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
            >
              {data.sections.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Người phụ trách"
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
            >
              <MenuItem value="">Chưa giao</MenuItem>
              {memberUsers.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Độ ưu tiên"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {Object.entries(PRIORITY_LABELS).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  {value[0]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Hạn hoàn thành"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            disabled={!form.title.trim()}
            onClick={create}
          >
            Tạo công việc
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Lưu dự án thành mẫu</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}
        >
          <TextField
            label="Tên mẫu"
            autoFocus
            value={templateForm.name}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, name: e.target.value })
            }
          />
          <TextField
            select
            label="Danh mục"
            value={templateForm.category}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, category: e.target.value })
            }
          >
            <MenuItem value="agile">Agile & Kanban</MenuItem>
            <MenuItem value="engineering">Kỹ thuật</MenuItem>
            <MenuItem value="product">Sản phẩm</MenuItem>
            <MenuItem value="operations">Vận hành</MenuItem>
            <MenuItem value="xbus">XBus</MenuItem>
          </TextField>
          <TextField
            label="Mô tả"
            multiline
            minRows={2}
            value={templateForm.description}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, description: e.target.value })
            }
          />
          <Typography variant="caption" color="text.secondary">
            Mẫu sẽ lưu {data.sections.length} nhóm và{" "}
            {Math.min(data.tasks.length, 100)} công việc mẫu.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="tonal" onClick={() => setTemplateOpen(false)}>
            Hủy
          </Button>
          <Button
            variant="contained"
            disabled={!templateForm.name.trim()}
            onClick={saveTemplate}
          >
            Lưu mẫu
          </Button>
        </DialogActions>
      </Dialog>

      <MemberDialog
        open={membersOpen}
        project={data.project}
        members={data.members}
        users={data.candidateUsers || memberUsers}
        canManage={canManage}
        onClose={() => setMembersOpen(false)}
        onSaved={load}
      />

      <StatusUpdateDialog
        open={statusOpen}
        project={data.project}
        statusUpdates={data.statusUpdates || []}
        canManage={canManage}
        onClose={() => setStatusOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog
        open={archiveOpen}
        title="Lưu trữ dự án?"
        message={`Dự án "${data.project.title}" sẽ bị ẩn khỏi danh sách. Công việc và lịch sử vẫn được giữ lại.`}
        confirmText="Lưu trữ"
        onClose={() => setArchiveOpen(false)}
        onConfirm={archive}
      />

      <TaskDrawer
        task={selected}
        data={data}
        users={memberUsers}
        canManage={canManageTasks}
        canWorkflow={selected ? canWorkflow(selected) : false}
        onClose={() => setSelected(null)}
        onUpdate={update}
        comment={comment}
        setComment={setComment}
        addComment={addComment}
      />
    </>
  );
}

function TaskRow({
  task,
  users,
  sections,
  canManageTasks,
  canWorkflow,
  onOpen,
  onToggle,
  onSectionChange,
}) {
  const user = task.assignee || users.find((item) => item.id === task.assigneeId);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 1,
        px: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        flexWrap: "wrap",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Checkbox
        checked={Boolean(task.completed)}
        disabled={!canWorkflow}
        onChange={onToggle}
      />
      <Typography variant="caption" color="text.secondary" sx={{ width: 70 }}>
        {task.code}
      </Typography>
      <Typography
        onClick={() => onOpen(task)}
        sx={{
          flex: 1,
          minWidth: 160,
          cursor: "pointer",
          textDecoration: task.completed ? "line-through" : "none",
        }}
      >
        {task.title}
      </Typography>
      {!canManageTasks && canWorkflow && (
        <TextField
          select
          size="small"
          value={task.sectionId}
          onChange={(e) => onSectionChange(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {sections.map((section) => (
            <MenuItem key={section.id} value={section.id}>
              {section.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Chip
        size="small"
        label={PRIORITY_LABELS[task.priority]?.[0]}
        color={PRIORITY_LABELS[task.priority]?.[1]}
        variant="tonal"
      />
      <Avatar src={user?.avatarUrl} sx={{ width: 28, height: 28, fontSize: 12 }}>
        {user?.name?.[0] || "?"}
      </Avatar>
      <Typography variant="caption" color="text.secondary" sx={{ width: 85 }}>
        {task.dueDate
          ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("vi-VN")
          : "—"}
      </Typography>
    </Box>
  );
}
