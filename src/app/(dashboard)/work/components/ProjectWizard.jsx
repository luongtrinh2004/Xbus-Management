"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";

import {
  SAMPLE_IMPORT_CSV,
  assertSafeCsvFile,
  mapImportRows,
  parseSpreadsheetBuffer,
} from "@/libs/workImport";
import { TEMPLATE_CATEGORIES, listTemplates } from "@/libs/workTemplates";
import { instantiateProjectTemplate } from "@/libs/workUi";
import {
  PRIORITY_LABELS,
  PROJECT_COLORS,
  PROJECT_ICONS,
  VIEW_OPTIONS,
} from "./workConstants";

const STEPS = [
  "Nguồn",
  "Thông tin dự án",
  "Cấu trúc",
  "Thành viên",
  "Xem lại & tạo",
];

const blankInfo = () => ({
  title: "",
  key: "",
  description: "",
  ownerId: "",
  startDate: "",
  dueDate: "",
  visibility: "private",
  color: PROJECT_COLORS[0],
  icon: "tabler-folder",
  defaultView: "list",
});

const stripDiacritics = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d");

const suggestKey = (title) => {
  const key = stripDiacritics(title)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);
  if (!/^[A-Z]/.test(key)) return `P-${key}`.slice(0, 12).replace(/-+$/, "");
  return key;
};

const sectionFromTemplate = (template) =>
  template.sections.map((section, index) => ({
    name: section.name,
    status: section.status || (index === 0 ? "todo" : "in_progress"),
  }));

const tasksFromTemplate = (template) =>
  (template.tasks || []).map((task) => ({
    title: task.title,
    description: task.description || "",
    section: Math.max(
      0,
      template.sections.findIndex((section) => section.name === task.section),
    ),
    priority: task.priority || "medium",
    assigneeId: "",
    dueDate: "",
    startDate: "",
    include: true,
  }));

const defaultSections = () => [
  { name: "Cần làm", status: "todo" },
  { name: "Đang làm", status: "in_progress" },
  { name: "Hoàn thành", status: "done" },
];

export default function ProjectWizard({
  open,
  onClose,
  onCreated,
  users = [],
  availableTemplates = [],
  initialTemplateId = null,
  initialSource = null,
}) {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState(initialSource || "blank");
  const [info, setInfo] = useState(blankInfo());
  const [sections, setSections] = useState(defaultSections);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [templateId, setTemplateId] = useState(initialTemplateId || "");
  const [templateCategory, setTemplateCategory] = useState("all");
  const [importErrors, setImportErrors] = useState([]);
  const [importName, setImportName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const templateCatalog = useMemo(
    () => (availableTemplates.length ? availableTemplates : listTemplates()),
    [availableTemplates],
  );
  const templates = useMemo(
    () =>
      templateCatalog.filter(
        (template) =>
          templateCategory === "all" || template.category === templateCategory,
      ),
    [templateCatalog, templateCategory],
  );
  const selectedTemplate = useMemo(
    () => templateCatalog.find((item) => item.id === templateId) || null,
    [templateCatalog, templateId],
  );

  const reset = () => {
    setStep(0);
    setSource(initialSource || "blank");
    setInfo(blankInfo());
    setSections(defaultSections());
    setTasks([]);
    setMembers([]);
    setTemplateId(initialTemplateId || "");
    setImportErrors([]);
    setImportName("");
    setError("");
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const applyTemplate = (template) => {
    const instantiated = instantiateProjectTemplate(template);
    if (!instantiated) return;
    setTemplateId(instantiated.templateId);
    setSections(instantiated.sections);
    setTasks(instantiated.tasks);
    if (!info.title) {
      setInfo((current) => ({
        ...current,
        title: template.name,
        key: suggestKey(template.name),
        icon: template.icon || current.icon,
      }));
    }
  };

  useEffect(() => {
    if (!open || source !== "template" || !initialTemplateId) return;
    const template = templateCatalog.find(
      (item) => item.id === initialTemplateId,
    );
    if (template) applyTemplate(template);
  }, [open, source, initialTemplateId, templateCatalog]);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_IMPORT_CSV], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mau-cong-viec.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setParsing(true);
    setError("");
    setImportErrors([]);
    try {
      assertSafeCsvFile(file);
      const rows = await parseSpreadsheetBuffer(await file.text(), {
        type: "string",
        filename: file.name,
      });
      const result = mapImportRows(rows);
      if (!result.sections.length && !result.tasks.length)
        throw new Error("Không đọc được dữ liệu từ tệp");
      setSections(
        result.sections.length
          ? result.sections.map((section) => ({
              name: section.name,
              status: section.status,
            }))
          : defaultSections(),
      );
      setTasks(
        result.tasks.map((task) => ({
          title: task.title,
          description: task.description,
          section: Math.max(
            0,
            result.sections.findIndex(
              (section) => section.name === task.section,
            ),
          ),
          priority: task.priority,
          status:
            task.status ||
            result.sections.find((section) => section.name === task.section)
              ?.status,
          assigneeId: "",
          startDate: task.startDate || "",
          dueDate: task.dueDate || "",
          include: true,
        })),
      );
      setImportErrors(result.errors);
      setImportName(file.name);
      if (!info.title)
        setInfo((current) => ({
          ...current,
          title: file.name.replace(/\.[^.]+$/, ""),
          key: suggestKey(file.name.replace(/\.[^.]+$/, "")),
        }));
      toast.success(
        `Đã đọc ${result.tasks.length} công việc, ${result.sections.length} nhóm`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const setSectionField = (index, patch) =>
    setSections((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  const setTaskField = (index, patch) =>
    setTasks((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  const canNext = () => {
    if (step === 0) return source !== "template" || Boolean(templateId);
    if (step === 1)
      return Boolean(info.title.trim()) && Boolean(info.key.trim());
    if (step === 2) return sections.length > 0;
    return true;
  };

  const create = async () => {
    setCreating(true);
    setError("");
    try {
      const payload = {
        title: info.title.trim(),
        key: info.key.trim(),
        description: info.description,
        visibility: info.visibility,
        color: info.color,
        icon: info.icon,
        defaultView: info.defaultView,
        startDate: info.startDate || undefined,
        dueDate: info.dueDate || undefined,
        ownerId: info.ownerId || undefined,
        templateId: templateId || undefined,
        sections: sections.map((section) => ({
          name: section.name,
          status: section.status,
        })),
        tasks: tasks
          .filter((task) => task.include !== false && task.title.trim())
          .map((task) => ({
            title: task.title.trim(),
            description: task.description || "",
            sectionIndex: Number(task.section) || 0,
            priority: task.priority,
            assigneeId: task.assigneeId || undefined,
            startDate: task.startDate || undefined,
            dueDate: task.dueDate || undefined,
            status: task.status || sections[Number(task.section) || 0]?.status,
          })),
        members: members.map((member) => ({
          userId: member.userId,
          role: member.role,
        })),
      };
      const res = await fetch("/api/work/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      toast.success("Đã tạo dự án");
      reset();
      onCreated?.(body);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const canManageOwner = true; // owner step: admins may assign someone else

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="lg" scroll="body">
      <DialogTitle sx={{ pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h5" fontWeight={700}>
            Bắt đầu dự án mới
          </Typography>
          <Box sx={{ flex: 1 }} />
          {STEPS.map((label, index) => (
            <Chip
              key={label}
              size="small"
              variant={index === step ? "filled" : "tonal"}
              color={index === step ? "primary" : "default"}
              label={`${index + 1}. ${label}`}
            />
          ))}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 0 && (
          <Box>
            <RadioGroup
              row
              value={source}
              onChange={(e) => setSource(e.target.value)}
              sx={{ mb: 2 }}
            >
              <Radio value="blank" />
              <Typography variant="body2" sx={{ mr: 3 }}>
                Dự án trống
              </Typography>
              <Radio value="template" />
              <Typography variant="body2" sx={{ mr: 3 }}>
                Dùng mẫu dự án
              </Typography>
              <Radio value="import" />
              <Typography variant="body2">Nhập tệp CSV</Typography>
            </RadioGroup>

            {source === "template" && (
              <Box>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <Chip
                      key={category.id}
                      label={category.label}
                      variant={
                        templateCategory === category.id ? "filled" : "tonal"
                      }
                      color={
                        templateCategory === category.id ? "primary" : "default"
                      }
                      onClick={() => setTemplateCategory(category.id)}
                      icon={<i className={category.icon} />}
                    />
                  ))}
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      lg: "repeat(3, 1fr)",
                    },
                    gap: 2,
                    maxHeight: 360,
                    overflowY: "auto",
                    pr: 1,
                  }}
                >
                  {templates.map((template) => (
                    <Box
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor:
                          templateId === template.id
                            ? "primary.main"
                            : "divider",
                        cursor: "pointer",
                        bgcolor:
                          templateId === template.id
                            ? "action.selected"
                            : "background.paper",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <i className={template.icon} />
                        <Typography fontWeight={700}>
                          {template.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {template.description}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          flexWrap: "wrap",
                          mt: 1,
                        }}
                      >
                        {template.sections.slice(0, 5).map((section) => (
                          <Chip
                            key={section.name}
                            size="small"
                            label={section.name}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {source === "import" && (
              <Box
                sx={{
                  p: 3,
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <i
                  className="tabler-file-spreadsheet"
                  style={{ fontSize: 42, opacity: 0.5 }}
                />
                <Typography fontWeight={700} mt={1}>
                  Chọn tệp .csv (tối đa 2 MB)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cột gợi ý: Nhóm công việc, Tiêu đề, Mô tả, Độ ưu tiên, Trạng
                  thái, Hạn hoàn thành, Người phụ trách.
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    justifyContent: "center",
                    mt: 2,
                  }}
                >
                  <Button
                    variant="contained"
                    component="label"
                    disabled={parsing}
                  >
                    Chọn tệp
                    <input
                      hidden
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => handleImportFile(e.target.files?.[0])}
                    />
                  </Button>
                  <Button variant="tonal" onClick={downloadSample}>
                    Tải tệp mẫu CSV
                  </Button>
                </Box>
                {parsing && <LinearProgress sx={{ mt: 2 }} />}
                {importName && !parsing && (
                  <Chip
                    size="small"
                    sx={{ mt: 2 }}
                    label={`${importName} · ${tasks.length} công việc`}
                  />
                )}
                {importErrors.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2, textAlign: "left" }}>
                    {importErrors.length} dòng bị bỏ qua:{" "}
                    {importErrors
                      .slice(0, 4)
                      .map((item) => `dòng ${item.row} (${item.message})`)
                      .join(", ")}
                    {importErrors.length > 4 ? "..." : ""}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}

        {step === 1 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Tên dự án"
              autoFocus
              value={info.title}
              onChange={(e) =>
                setInfo({
                  ...info,
                  title: e.target.value,
                  key: info.keyTouched ? info.key : suggestKey(e.target.value),
                })
              }
            />
            <TextField
              label="Mã dự án"
              value={info.key}
              onChange={(e) =>
                setInfo({
                  ...info,
                  key: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                  keyTouched: true,
                })
              }
              helperText="VD: WEB-1 (2-12 ký tự in hoa, số, gạch ngang)"
            />
            <TextField
              label="Mô tả"
              multiline
              minRows={2}
              value={info.description}
              onChange={(e) =>
                setInfo({ ...info, description: e.target.value })
              }
              sx={{ gridColumn: "1 / -1" }}
            />
            <TextField
              select
              label="Chủ dự án"
              value={info.ownerId}
              onChange={(e) => setInfo({ ...info, ownerId: e.target.value })}
              helperText={
                canManageOwner
                  ? "Mặc định là bạn. Chỉ quản trị viên được chỉ định người khác."
                  : ""
              }
            >
              <MenuItem value="">Tôi (người tạo)</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name} — {user.email}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Giao diện mặc định"
              value={info.defaultView}
              onChange={(e) =>
                setInfo({ ...info, defaultView: e.target.value })
              }
            >
              {VIEW_OPTIONS.map((view) => (
                <MenuItem key={view.value} value={view.value}>
                  {view.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Ngày bắt đầu"
              type="date"
              value={info.startDate}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setInfo({ ...info, startDate: e.target.value })}
            />
            <TextField
              label="Hạn hoàn thành"
              type="date"
              value={info.dueDate}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setInfo({ ...info, dueDate: e.target.value })}
            />
            <TextField
              select
              label="Quyền riêng tư"
              value={info.visibility}
              onChange={(e) => setInfo({ ...info, visibility: e.target.value })}
            >
              <MenuItem value="private">Riêng tư — chỉ thành viên</MenuItem>
              <MenuItem value="public">
                Công khai — mọi tài khoản hoạt động
              </MenuItem>
            </TextField>
            <Box>
              <Typography variant="body2" mb={1}>
                Màu dự án
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {PROJECT_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setInfo({ ...info, color })}
                    sx={{
                      width: 30,
                      height: 30,
                      bgcolor: color,
                      borderRadius: 1,
                      cursor: "pointer",
                      outline: info.color === color ? "3px solid" : "none",
                      outlineColor: "primary.light",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </Box>
              <Typography variant="body2" mt={2} mb={1}>
                Biểu tượng
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {PROJECT_ICONS.map((icon) => (
                  <Box
                    key={icon}
                    onClick={() => setInfo({ ...info, icon })}
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      bgcolor:
                        info.icon === icon ? "action.selected" : "action.hover",
                    }}
                  >
                    <i className={icon} />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography fontWeight={700}>
                Nhóm công việc ({sections.length})
              </Typography>
              <Button
                size="small"
                startIcon={<i className="tabler-plus" />}
                onClick={() =>
                  setSections((current) => [
                    ...current,
                    {
                      name: `Nhóm ${current.length + 1}`,
                      status: "in_progress",
                    },
                  ])
                }
              >
                Thêm nhóm
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {sections.map((section, index) => (
                <Box key={index} sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    size="small"
                    value={section.name}
                    onChange={(e) =>
                      setSectionField(index, { name: e.target.value })
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    select
                    size="small"
                    value={section.status}
                    onChange={(e) =>
                      setSectionField(index, { status: e.target.value })
                    }
                    sx={{ width: 170 }}
                  >
                    <MenuItem value="todo">Cần làm</MenuItem>
                    <MenuItem value="in_progress">Đang thực hiện</MenuItem>
                    <MenuItem value="blocked">Bị chặn</MenuItem>
                    <MenuItem value="done">Hoàn thành</MenuItem>
                  </TextField>
                  <IconButton
                    color="error"
                    disabled={sections.length <= 1}
                    onClick={() =>
                      setSections((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <i className="tabler-trash" />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography fontWeight={700}>
                Công việc khởi tạo (
                {tasks.filter((t) => t.include !== false).length})
              </Typography>
              <Button
                size="small"
                startIcon={<i className="tabler-plus" />}
                onClick={() =>
                  setTasks((current) => [
                    ...current,
                    {
                      title: "",
                      description: "",
                      section: 0,
                      priority: "medium",
                      assigneeId: "",
                      dueDate: "",
                      startDate: "",
                      include: true,
                    },
                  ])
                }
              >
                Thêm công việc
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {tasks.map((task, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "24px 1.6fr 1fr 130px 130px 40px",
                    },
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={task.include !== false}
                    onChange={(e) =>
                      setTaskField(index, { include: e.target.checked })
                    }
                  />
                  <TextField
                    size="small"
                    placeholder="Tiêu đề công việc"
                    value={task.title}
                    onChange={(e) =>
                      setTaskField(index, { title: e.target.value })
                    }
                  />
                  <TextField
                    select
                    size="small"
                    value={Number(task.section) || 0}
                    onChange={(e) =>
                      setTaskField(index, { section: Number(e.target.value) })
                    }
                  >
                    {sections.map((section, i) => (
                      <MenuItem key={i} value={i}>
                        {section.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    value={task.priority}
                    onChange={(e) =>
                      setTaskField(index, { priority: e.target.value })
                    }
                  >
                    {Object.entries(PRIORITY_LABELS).map(([key, value]) => (
                      <MenuItem key={key} value={key}>
                        {value[0]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    type="date"
                    value={task.dueDate || ""}
                    InputLabelProps={{ shrink: true }}
                    onChange={(e) =>
                      setTaskField(index, { dueDate: e.target.value })
                    }
                  />
                  <IconButton
                    color="error"
                    onClick={() =>
                      setTasks((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <i className="tabler-trash" />
                  </IconButton>
                </Box>
              ))}
              {tasks.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Chưa có công việc khởi tạo — dự án sẽ bắt đầu với các nhóm
                  trống.
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {step === 3 && (
          <Box>
            <Typography fontWeight={700} mb={1}>
              Thành viên dự án
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Bạn luôn là chủ dự án. Chọn thêm biên tập viên (quản lý công việc)
              hoặc thành viên (chỉ cập nhật công việc được giao).
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {users.map((user) => {
                const selected = members.find(
                  (item) => item.userId === user.id,
                );
                return (
                  <Box
                    key={user.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: selected ? "primary.main" : "divider",
                    }}
                  >
                    <Checkbox
                      checked={Boolean(selected)}
                      onChange={(e) =>
                        setMembers((current) =>
                          e.target.checked
                            ? [...current, { userId: user.id, role: "member" }]
                            : current.filter((item) => item.userId !== user.id),
                        )
                      }
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {user.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                    {selected && (
                      <TextField
                        select
                        size="small"
                        value={selected.role}
                        onChange={(e) =>
                          setMembers((current) =>
                            current.map((item) =>
                              item.userId === user.id
                                ? { ...item, role: e.target.value }
                                : item,
                            ),
                          )
                        }
                        sx={{ width: 140 }}
                      >
                        <MenuItem value="member">Thành viên</MenuItem>
                        <MenuItem value="editor">Biên tập</MenuItem>
                      </TextField>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {step === 4 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 3,
            }}
          >
            <Box>
              <Typography fontWeight={700} mb={1}>
                Thông tin dự án
              </Typography>
              <Summary label="Tên" value={info.title} />
              <Summary label="Mã" value={info.key} />
              <Summary label="Mô tả" value={info.description || "—"} />
              <Summary
                label="Thời gian"
                value={`${info.startDate || "—"} → ${info.dueDate || "—"}`}
              />
              <Summary
                label="Quyền riêng tư"
                value={info.visibility === "public" ? "Công khai" : "Riêng tư"}
              />
              <Summary
                label="Giao diện mặc định"
                value={
                  VIEW_OPTIONS.find((v) => v.value === info.defaultView)?.label
                }
              />
              <Summary
                label="Nguồn"
                value={
                  source === "template"
                    ? `Mẫu: ${selectedTemplate?.name || templateId}`
                    : source === "import"
                      ? `Import: ${importName || "tệp CSV"}`
                      : "Dự án trống"
                }
              />
              <Summary
                label="Chủ dự án"
                value={
                  info.ownerId
                    ? users.find((user) => user.id === info.ownerId)?.name
                    : "Tôi (người tạo)"
                }
              />
            </Box>
            <Box>
              <Typography fontWeight={700} mb={1}>
                Cấu trúc ({sections.length} nhóm ·{" "}
                {tasks.filter((t) => t.include !== false).length} công việc)
              </Typography>
              {sections.map((section, index) => (
                <Box key={index} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Chip
                      size="small"
                      label={section.name}
                      color="primary"
                      variant="tonal"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {
                        tasks.filter(
                          (task) =>
                            task.include !== false &&
                            Number(task.section) === index,
                        ).length
                      }{" "}
                      việc
                    </Typography>
                  </Box>
                  <Box sx={{ pl: 1 }}>
                    {tasks
                      .filter(
                        (task) =>
                          task.include !== false &&
                          Number(task.section) === index,
                      )
                      .map((task, i) => (
                        <Typography
                          key={i}
                          variant="body2"
                          color="text.secondary"
                        >
                          • {task.title}
                        </Typography>
                      ))}
                  </Box>
                </Box>
              ))}
              <Typography fontWeight={700} mt={2} mb={1}>
                Thành viên ({members.length})
              </Typography>
              {members.map((member) => (
                <Chip
                  key={member.userId}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                  label={`${users.find((user) => user.id === member.userId)?.name} · ${
                    member.role === "editor" ? "Biên tập" : "Thành viên"
                  }`}
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="tonal"
          onClick={step === 0 ? close : () => setStep(step - 1)}
        >
          {step === 0 ? "Hủy" : "Quay lại"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            disabled={!canNext()}
            onClick={() => setStep(step + 1)}
          >
            Tiếp tục
          </Button>
        ) : (
          <Button variant="contained" disabled={creating} onClick={create}>
            {creating ? "Đang tạo..." : "Tạo dự án"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function Summary({ label, value }) {
  return (
    <Box sx={{ display: "flex", gap: 2, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 140 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}
