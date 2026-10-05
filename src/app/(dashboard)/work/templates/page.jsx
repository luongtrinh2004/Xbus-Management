"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { TEMPLATE_CATEGORIES, listTemplates } from "@/libs/workTemplates";

export default function TemplatesPage() {
  const router = useRouter();
  const [category, setCategory] = useState("all");
  const [custom, setCustom] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/work/templates", { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        setCustom(body.templates.filter((item) => item.id.startsWith("wtp_")));
        setError("");
      } catch (e) {
        setError(e.message || "Không thể tải thư viện mẫu");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const templates = useMemo(
    () => listTemplates({ category, custom }),
    [category, custom],
  );
  const featured = templates.filter((item) => item.featured);
  const compact = templates.filter((item) => !item.featured);

  const useTemplate = (template) =>
    router.push(`/work/projects?template=${encodeURIComponent(template.id)}`);

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>
            Thư viện mẫu dự án
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Chọn một mẫu để tạo dự án với nhóm công việc và việc mẫu sẵn có.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
            {TEMPLATE_CATEGORIES.map((item) => (
              <Chip
                key={item.id}
                icon={<i className={item.icon} />}
                label={item.label}
                variant={category === item.id ? "filled" : "tonal"}
                color={category === item.id ? "primary" : "default"}
                onClick={() => setCategory(item.id)}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {loading && (
        <Box textAlign="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {!loading && featured.length > 0 && (
        <Box>
          <Typography fontWeight={700} mb={1.5}>
            Nổi bật
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 3,
            }}
          >
            {featured.map((template) => (
              <Card
                key={template.id}
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "primary.light",
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "primary.main",
                        color: "#fff",
                      }}
                    >
                      <i className={template.icon} />
                    </Box>
                    <Box>
                      <Typography fontWeight={700}>{template.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.sections.length} nhóm ·{" "}
                        {template.tasks?.length || 0} việc mẫu
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {template.description}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1.5 }}>
                    {template.sections.map((section) => (
                      <Chip key={section.name} size="small" label={section.name} />
                    ))}
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => useTemplate(template)}
                  >
                    Sử dụng mẫu
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {!loading && compact.length > 0 && (
        <Box>
          <Typography fontWeight={700} mb={1.5}>
            Tất cả mẫu ({compact.length})
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
                xl: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            {compact.map((template) => (
              <Card key={template.id}>
                <CardContent sx={{ p: "16px !important" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <i className={template.icon} />
                    <Typography variant="body2" fontWeight={700}>
                      {template.name}
                    </Typography>
                    {template.id.startsWith("wtp_") && (
                      <Chip size="small" label="Đội" variant="tonal" />
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5, minHeight: 32 }}
                  >
                    {template.description}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
                    {template.sections.slice(0, 4).map((section) => (
                      <Chip key={section.name} size="small" label={section.name} />
                    ))}
                    {template.sections.length > 4 && (
                      <Chip
                        size="small"
                        variant="tonal"
                        label={`+${template.sections.length - 4}`}
                      />
                    )}
                  </Box>
                  <Button
                    size="small"
                    variant="tonal"
                    fullWidth
                    sx={{ mt: 1.5 }}
                    onClick={() => useTemplate(template)}
                  >
                    Sử dụng
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {!loading && templates.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h6">Không có mẫu nào trong danh mục này</Typography>
          </CardContent>
        </Card>
      )}
    </>
  );
}
