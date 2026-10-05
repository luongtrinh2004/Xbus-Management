"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { listTemplates } from "@/libs/workTemplates";
import { splitFavoriteProjects } from "@/libs/workUi";
import ProjectWizard from "../components/ProjectWizard";
import { HEALTH_META } from "../components/workConstants";

const START_ACTIONS = [
  {
    source: "blank",
    title: "Dự án trống",
    description: "Bắt đầu với ba nhóm cơ bản và tự cấu trúc sau.",
    icon: "tabler-file-plus",
  },
  {
    source: "template",
    title: "Chọn mẫu dự án",
    description: "Sprint, bug tracker, kanban, XBus vận hành...",
    icon: "tabler-layout-grid",
  },
  {
    source: "import",
    title: "Import CSV",
    description: "Nạp danh sách công việc từ tệp .csv tối đa 2 MB.",
    icon: "tabler-file-spreadsheet",
  },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [data, setData] = useState({
    projects: [],
    users: [],
    candidateUsers: [],
    templates: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [wizard, setWizard] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [projectsRes, templatesRes] = await Promise.all([
        fetch("/api/work/projects", { cache: "no-store" }),
        fetch("/api/work/templates", { cache: "no-store" }),
      ]);
      const [projectsBody, templatesBody] = await Promise.all([
        projectsRes.json(),
        templatesRes.json(),
      ]);
      if (!projectsRes.ok) throw new Error(projectsBody.error);
      if (!templatesRes.ok) throw new Error(templatesBody.error);
      setData({
        ...projectsBody,
        candidateUsers: [],
        templates: templatesBody.templates || [],
      });
      setError("");
    } catch (e) {
      setError(e.message || "Không thể tải dự án");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const template = new URLSearchParams(window.location.search).get("template");
    if (template) setWizard({ source: "template", templateId: template });
  }, []);

  useEffect(() => {
    if (!wizard || data.candidateUsers.length) return;
    let active = true;
    fetch("/api/work/project-candidates", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        if (active)
          setData((current) => ({
            ...current,
            candidateUsers: body.users || [],
          }));
      })
      .catch((e) => {
        if (active) setError(e.message || "Không thể tải danh sách thành viên");
      });
    return () => {
      active = false;
    };
  }, [wizard, data.candidateUsers.length]);

  const projects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return data.projects.filter((project) => {
      const matchesSearch =
        !query ||
        `${project.title} ${project.key} ${project.description}`
          .toLocaleLowerCase("vi")
          .includes(query);
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "mine"
            ? ["owner", "editor"].includes(project.role)
            : filter === "favorites"
              ? project.favorite
              : project.visibility === filter;
      return matchesSearch && matchesFilter;
    });
  }, [data.projects, search, filter]);

  const { favorites, nonFavorites } = splitFavoriteProjects(projects);
  const featured = useMemo(
    () =>
      (data.templates.length ? data.templates : listTemplates())
        .filter((template) => template.featured)
        .slice(0, 3),
    [data.templates],
  );
  const openWizard = (source) => setWizard({ source, templateId: "" });

  return (
    <>
      <Card sx={{ overflow: "hidden" }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box
            sx={{
              display: "flex",
              gap: { xs: 2, md: 4 },
              flexDirection: { xs: "column", md: "row" },
              alignItems: { md: "center" },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                Bắt đầu dự án mới
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Tạo dự án trống, dùng mẫu có sẵn hoặc nhập công việc từ CSV.
              </Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(3, minmax(170px, 1fr))",
                },
                gap: 2,
                width: { md: "62%" },
              }}
            >
              {START_ACTIONS.map((action) => (
                <Box
                  key={action.source}
                  onClick={() => openWizard(action.source)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                    transition: "transform .15s, box-shadow .15s",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "primary.main",
                      color: "#fff",
                      mb: 1,
                    }}
                  >
                    <i className={action.icon} />
                  </Box>
                  <Typography variant="body2" fontWeight={700}>
                    {action.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {action.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent
          sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}
        >
          <TextField
            size="small"
            placeholder="Tìm theo tên hoặc mã dự án..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: "1 1 280px" }}
            InputProps={{
              startAdornment: (
                <i className="tabler-search" style={{ marginRight: 8 }} />
              ),
            }}
          />
          <TextField
            select
            size="small"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">Tất cả dự án</MenuItem>
            <MenuItem value="mine">Tôi quản lý</MenuItem>
            <MenuItem value="favorites">Yêu thích</MenuItem>
            <MenuItem value="public">Công khai</MenuItem>
            <MenuItem value="private">Riêng tư</MenuItem>
          </TextField>
          <Button
            variant="contained"
            startIcon={<i className="tabler-plus" />}
            onClick={() => openWizard("blank")}
          >
            Tạo dự án
          </Button>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box textAlign="center" py={8}>
          <CircularProgress />
        </Box>
      ) : projects.length ? (
        <>
          {favorites.length > 0 && (
            <Section title="Yêu thích" icon="tabler-star-filled">
              <ProjectGrid projects={favorites} />
            </Section>
          )}
          {nonFavorites.length > 0 && (
            <Section
              title="Dự án của tôi"
              icon="tabler-folders"
              count={nonFavorites.length}
            >
              <ProjectGrid projects={nonFavorites} />
            </Section>
          )}
        </>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <i className="tabler-folders" style={{ fontSize: 56, opacity: 0.4 }} />
            <Typography variant="h6" mt={2}>
              Chưa có dự án phù hợp
            </Typography>
            <Typography color="text.secondary">
              Bắt đầu dự án mới phía trên để phân công công việc.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Khám phá mẫu dự án
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sprint, bug tracker, sự cố, vận hành XBus và nhiều mẫu khác.
              </Typography>
            </Box>
            <Button component={Link} href="/work/templates" variant="tonal">
              Xem thư viện mẫu
            </Button>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2,
              mt: 2,
            }}
          >
            {featured.map((template) => (
              <Box
                key={template.id}
                onClick={() =>
                  setWizard({ source: "template", templateId: template.id })
                }
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <i className={template.icon} />
                  <Typography fontWeight={700}>{template.name}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {template.description}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
                  {template.sections.slice(0, 4).map((section) => (
                    <Chip key={section.name} size="small" label={section.name} />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {wizard && (
        <ProjectWizard
          open
          initialSource={wizard.source}
          initialTemplateId={wizard.templateId}
          users={data.candidateUsers || []}
          availableTemplates={data.templates || []}
          onClose={() => setWizard(null)}
          onCreated={(project) => {
            setWizard(null);
            router.push(`/work/projects/${project.id}`);
          }}
        />
      )}
    </>
  );
}

function Section({ title, icon, count, children }) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <i className={icon} />
        <Typography fontWeight={700}>{title}</Typography>
        {count !== undefined && <Chip size="small" label={count} />}
      </Box>
      {children}
    </Box>
  );
}

function ProjectGrid({ projects }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "repeat(2, 1fr)",
          xl: "repeat(3, 1fr)",
        },
        gap: 3,
      }}
    >
      {projects.map((project) => {
        const health = HEALTH_META[project.health] || HEALTH_META.no_update;
        return (
          <Card
            key={project.id}
            component={Link}
            href={`/work/projects/${project.id}`}
            sx={{
              textDecoration: "none",
              color: "inherit",
              transition: "transform .2s, box-shadow .2s",
              "&:hover": { transform: "translateY(-3px)", boxShadow: 8 },
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: project.color,
                    width: 48,
                    height: 48,
                    fontWeight: 700,
                  }}
                >
                  <i className={project.icon || "tabler-folder"} />
                </Avatar>
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {project.favorite && (
                    <i className="tabler-star-filled" style={{ color: "#FF9F43" }} />
                  )}
                  <Chip
                    size="small"
                    variant="tonal"
                    color={health.color}
                    icon={<i className={health.icon} />}
                    label={health.label}
                  />
                  <Chip
                    size="small"
                    icon={
                      <i
                        className={
                          project.visibility === "public"
                            ? "tabler-world"
                            : "tabler-lock"
                        }
                      />
                    }
                    label={project.visibility === "public" ? "Công khai" : "Riêng tư"}
                    variant="tonal"
                  />
                </Box>
              </Box>
              <Typography variant="h6" fontWeight={700} mt={2}>
                {project.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ minHeight: 42, mt: 0.5 }}
              >
                {project.description || "Chưa có mô tả dự án"}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                <Typography variant="caption">{project.taskCount} công việc</Typography>
                <Typography variant="caption" fontWeight={700}>
                  {project.progress}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={project.progress}
                sx={{ mt: 0.75, height: 6, borderRadius: 4 }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mt: 2.5,
                }}
              >
                <Box sx={{ display: "flex" }}>
                  {project.members.slice(0, 4).map((member, index) => (
                    <Avatar
                      key={member.id}
                      src={member.user?.avatarUrl}
                      sx={{
                        width: 28,
                        height: 28,
                        ml: index ? -1 : 0,
                        border: "2px solid",
                        borderColor: "background.paper",
                        fontSize: 11,
                      }}
                    >
                      {member.user?.name?.[0]}
                    </Avatar>
                  ))}
                </Box>
                <Chip
                  size="small"
                  label={
                    project.role === "owner"
                      ? "Chủ dự án"
                      : project.role === "editor"
                        ? "Biên tập"
                        : project.role === "member"
                          ? "Thành viên"
                          : "Người xem"
                  }
                  color={project.role === "owner" ? "primary" : "default"}
                  variant="tonal"
                />
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
