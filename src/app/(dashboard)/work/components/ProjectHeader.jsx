"use client";

import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { toast } from "react-toastify";

import {
  HEALTH_META,
  PROJECT_COLORS,
  PROJECT_ICONS,
  VIEW_OPTIONS,
  formatDate,
} from "./workConstants";

export default function ProjectHeader({
  data,
  view,
  onViewChange,
  canManage,
  onOpenMembers,
  onOpenStatusUpdate,
  onReload,
  onArchive,
  onSaveTemplate,
}) {
  const { project, members } = data;
  const [anchor, setAnchor] = useState(null);
  const [appearance, setAppearance] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(project.title);
  const [saving, setSaving] = useState(false);
  const health = HEALTH_META[project.health] || HEALTH_META.no_update;

  const patch = async (payload, successMessage) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/work/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      if (successMessage) toast.success(successMessage);
      await onReload?.();
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = async () => {
    await patch(
      { favorite: !project.favorite },
      project.favorite ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích",
    );
  };

  const changeView = (nextView) => {
    onViewChange?.(nextView);
    if (canManage && nextView !== project.defaultView)
      patch({ defaultView: nextView });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết dự án");
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  return (
    <Cardish>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Tooltip title={canManage ? "Đổi màu và biểu tượng" : project.icon}>
            <Box
              onClick={canManage ? (e) => setAppearance(e.currentTarget) : undefined}
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                bgcolor: project.color,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                cursor: canManage ? "pointer" : "default",
              }}
            >
              <i className={project.icon} style={{ fontSize: 26 }} />
            </Box>
          </Tooltip>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                {project.title}
              </Typography>
              <Chip size="small" label={project.key} />
              <Tooltip title={project.favorite ? "Bỏ yêu thích" : "Yêu thích"}>
                <IconButton
                  size="small"
                  color={project.favorite ? "warning" : "default"}
                  onClick={toggleFavorite}
                >
                  <i
                    className={
                      project.favorite ? "tabler-star-filled" : "tabler-star"
                    }
                  />
                </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={(e) => setAnchor(e.currentTarget)}
              >
                <i className="tabler-chevron-down" />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {project.description || "Chưa có mô tả dự án"}
              {project.startDate || project.dueDate
                ? ` · ${formatDate(project.startDate)} → ${formatDate(project.dueDate)}`
                : ""}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip
            size="small"
            variant="tonal"
            color={health.color}
            icon={<i className={health.icon} />}
            label={health.label}
            onClick={canManage ? onOpenStatusUpdate : undefined}
            sx={{ cursor: canManage ? "pointer" : "default" }}
          />
          <AvatarGroup max={5} sx={{ "& .MuiAvatar-root": { width: 32, height: 32, fontSize: 13 } }}>
            {members.map((member) => (
              <Tooltip key={member.userId} title={member.user?.name || ""}>
                <Avatar src={member.user?.avatarUrl}>
                  {member.user?.name?.[0]}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
          <Button
            size="small"
            variant="tonal"
            startIcon={<i className="tabler-users" />}
            onClick={onOpenMembers}
          >
            {canManage ? "Thành viên" : "Chia sẻ"}
          </Button>
          <TextField
            select
            size="small"
            value={view}
            onChange={(e) => changeView(e.target.value)}
            sx={{ minWidth: 170 }}
            SelectProps={{ renderValue: (v) => {
              const found = VIEW_OPTIONS.find((item) => item.value === v);
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <i className={found?.icon} /> {found?.label}
                </Box>
              );
            } }}
          >
            {VIEW_OPTIONS.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                <ListItemIcon>
                  <i className={item.icon} />
                </ListItemIcon>
                <ListItemText>{item.label}</ListItemText>
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {canManage && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              setDraftTitle(project.title);
              setRenameOpen(true);
            }}
          >
            <ListItemIcon>
              <i className="tabler-pencil" />
            </ListItemIcon>
            <ListItemText>Đổi tên dự án</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setAnchor(null);
            copyLink();
          }}
        >
          <ListItemIcon>
            <i className="tabler-link" />
          </ListItemIcon>
          <ListItemText>Sao chép liên kết</ListItemText>
        </MenuItem>
        {canManage && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onSaveTemplate?.();
            }}
          >
            <ListItemIcon>
              <i className="tabler-bookmark" />
            </ListItemIcon>
            <ListItemText>Lưu thành mẫu dự án</ListItemText>
          </MenuItem>
        )}
        {canManage && (
          <MenuItem
            sx={{ color: "error.main" }}
            onClick={() => {
              setAnchor(null);
              onArchive?.();
            }}
          >
            <ListItemIcon>
              <i className="tabler-archive" />
            </ListItemIcon>
            <ListItemText>Lưu trữ dự án</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Menu
        anchorEl={appearance}
        open={Boolean(appearance)}
        onClose={() => setAppearance(null)}
        PaperProps={{ sx: { p: 2, width: 280 } }}
      >
        <Typography variant="caption" color="text.secondary">
          Màu dự án
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", my: 1 }}>
          {PROJECT_COLORS.map((color) => (
            <Box
              key={color}
              onClick={async () => {
                await patch({ color }, "Đã đổi màu dự án");
                setAppearance(null);
              }}
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                bgcolor: color,
                cursor: "pointer",
                outline: project.color === color ? "2px solid" : "none",
                outlineColor: "primary.main",
                outlineOffset: 2,
              }}
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Biểu tượng
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", my: 1 }}>
          {PROJECT_ICONS.map((icon) => (
            <Box
              key={icon}
              onClick={async () => {
                await patch({ icon }, "Đã đổi biểu tượng");
                setAppearance(null);
              }}
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                bgcolor: project.icon === icon ? "action.selected" : "action.hover",
              }}
            >
              <i className={icon} />
            </Box>
          ))}
        </Box>
      </Menu>

      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Đổi tên dự án</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <TextField
            fullWidth
            autoFocus
            label="Tên dự án"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="tonal" onClick={() => setRenameOpen(false)}>
            Hủy
          </Button>
          <Button
            variant="contained"
            disabled={saving || !draftTitle.trim()}
            onClick={async () => {
              const ok = await patch({ title: draftTitle.trim() }, "Đã đổi tên dự án");
              if (ok) setRenameOpen(false);
            }}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Cardish>
  );
}

function Cardish({ children }) {
  return (
    <Box
      sx={{
        p: 3,
        bgcolor: "background.paper",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {children}
    </Box>
  );
}
