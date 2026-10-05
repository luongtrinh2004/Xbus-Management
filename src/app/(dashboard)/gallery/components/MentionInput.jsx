"use client";

import { useState, useRef, useEffect, useMemo, forwardRef } from "react";
import Box from "@mui/material/Box";
import Popper from "@mui/material/Popper";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import CustomTextField from "@core/components/mui/TextField";
import { normalizeSearch, registerUserName, getCachedUserNames } from "./mentionUtils";

const MentionInputBase = forwardRef(function MentionInputBase(props, ref) {
  const {
    className,
    style,
    value,
    onScroll,
    tokens = [],
    hasMention = false,
    multiline = false,
    rows,
    ...rest
  } = props;

  const backdropRef = useRef(null);

  const syncScroll = (el) => {
    if (el && backdropRef.current) {
      backdropRef.current.scrollLeft = el.scrollLeft;
      backdropRef.current.scrollTop = el.scrollTop;
    }
  };

  const handleScroll = (e) => {
    syncScroll(e.target);
    if (onScroll) onScroll(e);
  };

  const Component = multiline ? "textarea" : "input";

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        flexGrow: 1,
        width: "100%",
        minWidth: 0,
        height: multiline ? "auto" : "100%",
        alignItems: multiline ? "stretch" : "center",
      }}
    >
      {/* Visual Highlight Backdrop for Mentions */}
      {hasMention && (
        <span
          ref={backdropRef}
          className={className}
          aria-hidden="true"
          style={{
            ...style,
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            backgroundColor: "transparent",
            borderColor: "transparent",
            color: "var(--mui-palette-text-primary, #2F2B3D)",
            overflow: "hidden",
            whiteSpace: multiline ? "pre-wrap" : "pre",
            wordBreak: multiline ? "break-word" : "normal",
            zIndex: 0,
          }}
        >
          {tokens.map((token, idx) =>
            token.isMention ? (
              <span
                key={idx}
                style={{
                  color: "var(--mui-palette-primary-main, #7367F0)",
                  fontWeight: 600,
                  backgroundColor: "rgba(115, 103, 240, 0.12)",
                  borderRadius: "3px",
                }}
              >
                {token.text}
              </span>
            ) : (
              <span key={idx} style={{ color: "var(--mui-palette-text-primary, inherit)" }}>
                {token.text}
              </span>
            )
          )}
        </span>
      )}

      {/* Native Input / Textarea Element */}
      <Component
        ref={ref}
        className={className}
        value={value}
        rows={rows}
        onScroll={handleScroll}
        onKeyUp={(e) => {
          syncScroll(e.target);
          if (rest.onKeyUp) rest.onKeyUp(e);
        }}
        onSelect={(e) => {
          syncScroll(e.target);
          if (rest.onSelect) rest.onSelect(e);
        }}
        style={{
          ...style,
          position: "relative",
          zIndex: 1,
          width: "100%",
          backgroundColor: "transparent",
          color: hasMention ? "transparent" : "inherit",
          caretColor: "var(--mui-palette-text-primary, #2F2B3D)",
        }}
        {...rest}
      />
    </span>
  );
});

function formatInputTokens(text, usersList = []) {
  if (!text) return [];

  const names = new Set(getCachedUserNames ? Array.from(getCachedUserNames()) : []);

  const defaultNames = [
    "Quản trị viên Hệ thống",
    "Nhân viên hệ thống",
    "Nguyễn Quốc Bảo",
    "Vũ Hoàng Dũng",
    "Hà Quốc Việt",
    "Hoàng Duy Lộc",
    "Nguyễn Trung Kiên",
    "Trần Cao Khâm",
    "Trần Hoàng Hà",
    "Nguyễn Thị Hồng Quyên",
    "Bùi Đình Quý",
    "Bùi Văn Quốc Anh",
    "Lê Tuấn Long",
    "Trần Việt Dũng",
    "Phan Thành Nam",
    "Đặng Đình Khánh",
    "Nghiêm Thành Long",
    "Nguyễn Văn Bằng",
    "Nguyễn Minh Sang",
    "Nguyễn Mạnh Cường",
    "Phạm Hoàng Sơn",
    "Trần Bảo Khánh",
    "Bùi Tùng Lâm",
    "Nguyễn Bách Tùng",
    "Trịnh Phúc Lương",
    "Nguyễn Minh Hoàng",
    "Nguyễn Thị Thuyết",
    "Lê Ngọc Sơn",
  ];
  defaultNames.forEach((n) => names.add(n));

  if (Array.isArray(usersList)) {
    usersList.forEach((u) => {
      const name = typeof u === "string" ? u : u?.name;
      if (name) names.add(name.trim());
    });
  }

  const sortedNames = Array.from(names).sort((a, b) => b.length - a.length);
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const namesPattern = sortedNames.length > 0 ? sortedNames.map(escapeRegex).join("|") : "a^";

  const regex = new RegExp(
    `(@all|@\\[[^\\]]+\\]|#(?:[A-Za-z0-9À-ỹ_-]+)|@(?:${namesPattern})|@[A-Za-z0-9À-ỹ_.-]+)(?=[\\s.,!?:;"'()\\[\\]{}]|$)`,
    "gi"
  );

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isMention: false,
      });
    }
    parts.push({
      text: match[0],
      isMention: true,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isMention: false,
    });
  }

  return parts;
}

export default function MentionInput({
  inputRef: externalInputRef,
  value = "",
  onChange,
  usersList = [],
  placeholder = "Nhập nội dung",
  label,
  size = "small",
  multiline = false,
  rows,
  fullWidth = true,
  onKeyDown,
  onMentionsChange,
  placement = "bottom-start",
  sx = {},
  InputProps = {},
  ...props
}) {
  const containerRef = useRef(null);
  const backdropRef = useRef(null);
  const internalInputRef = useRef(null);
  const inputRef = externalInputRef || internalInputRef;

  const [open, setOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [internalUsers, setInternalUsers] = useState([]);

  // Fallback: fetch users automatically if parent doesn't provide them
  useEffect(() => {
    if ((!usersList || usersList.length === 0) && internalUsers.length === 0) {
      fetch("/api/users?limit=200")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const raw = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.users)
              ? data.users
              : Array.isArray(data)
                ? data
                : [];
          if (raw.length > 0) {
            setInternalUsers(
              raw
                .filter((u) => u.status === "able" || !u.status)
                .map((u) => ({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  code: u.code,
                  avatar: u.avatarUrl || u.avatar,
                }))
            );
          }
        })
        .catch(() => {});
    }
  }, [usersList, internalUsers.length]);

  const effectiveUsers = useMemo(() => {
    if (usersList && usersList.length > 0) return usersList;
    return internalUsers;
  }, [usersList, internalUsers]);

  // Filter suggestion list based on mentionQuery
  const suggestions = useMemo(() => {
    if (!open) return [];
    const q = normalizeSearch(mentionQuery.trim());

    const list = [];

    // 1. @All option (tags everybody)
    if (!q || "all".includes(q) || "tat ca".includes(q) || "moi nguoi".includes(q)) {
      list.push({
        id: "all",
        name: "All",
        displayName: "@All (Tất cả mọi người)",
        subtitle: "Gửi thông báo đến toàn bộ thành viên hệ thống",
        isAll: true,
      });
    }

    // 2. Filter users
    const matchedUsers = (effectiveUsers || []).filter((u) => {
      if (!u || !u.name) return false;
      if (!q) return true;
      const name = normalizeSearch(u.name);
      const email = normalizeSearch(u.email || "");
      const code = normalizeSearch(u.code || "");
      return name.includes(q) || email.includes(q) || code.includes(q);
    });

    for (const u of matchedUsers.slice(0, 8)) {
      list.push({
        id: u.id,
        name: u.name,
        displayName: u.name,
        subtitle: u.code ? `${u.code} • ${u.email || ""}` : u.email || "Thành viên",
        avatar: u.avatar || u.avatarUrl,
        isAll: false,
      });
    }

    return list;
  }, [open, mentionQuery, effectiveUsers]);

  // Keep selectedIndex in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length]);

  // Check if text has @All or users and notify parent
  useEffect(() => {
    if (!onMentionsChange) return;
    const isTagAll = /@all\b/i.test(value);
    const taggedUserIds = [];

    for (const u of effectiveUsers || []) {
      if (!u || !u.id || !u.name) continue;
      if (value.includes(`@${u.name}`) || value.includes(`@[${u.name}]`)) {
        taggedUserIds.push(u.id);
      }
    }

    onMentionsChange({
      isTagAll,
      taggedUserIds,
    });
  }, [value, effectiveUsers, onMentionsChange]);

  const detectMentionTrigger = (text, cursorPos) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Ensure @ is at start of line or preceded by whitespace
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      if (/\s/.test(charBeforeAt) || lastAtIndex === 0) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        // Only trigger if query doesn't contain newline or too many words
        if (!/[\n]/.test(query) && query.length < 25) {
          setMentionStartIndex(lastAtIndex);
          setMentionQuery(query);
          setOpen(true);
          return;
        }
      }
    }

    setOpen(false);
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionEnd || val.length;

    if (onChange) onChange(val);
    detectMentionTrigger(val, cursorPos);

    if (backdropRef.current) {
      backdropRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleSelectSuggestion = (item) => {
    if (!item) return;

    if (item.name) {
      registerUserName(item.name);
    }

    const before = value.substring(0, mentionStartIndex);
    const after = value.substring(mentionStartIndex + 1 + mentionQuery.length);

    const mentionToken = item.isAll ? "@All " : `@${item.name} `;
    const newValue = `${before}${mentionToken}${after}`;

    if (onChange) onChange(newValue);
    setOpen(false);

    // Focus input and move cursor after inserted tag
    setTimeout(() => {
      const input = inputRef.current?.querySelector("input, textarea") || inputRef.current;
      if (input) {
        input.focus();
        const nextPos = before.length + mentionToken.length;
        input.setSelectionRange(nextPos, nextPos);
      }
    }, 50);
  };

  const handleTriggerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const input = inputRef.current?.querySelector("input, textarea") || inputRef.current;
    if (input) {
      input.focus();
      const pos = input.selectionEnd || value.length;
      const before = value.substring(0, pos);
      const after = value.substring(pos);

      // Insert @ with a space before if needed
      const needSpace = pos > 0 && !/\s$/.test(before);
      const prefix = needSpace ? " @" : "@";
      const newValue = `${before}${prefix}${after}`;

      if (onChange) onChange(newValue);
      const nextPos = pos + prefix.length;
      setMentionStartIndex(nextPos - 1);
      setMentionQuery("");
      setOpen(true);

      setTimeout(() => {
        input.setSelectionRange(nextPos, nextPos);
      }, 30);
    }
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();

    if (open && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }

    if (onKeyDown) onKeyDown(e);
  };

  const hasMention = Boolean(value && (value.includes("@") || value.includes("#")));
  const tokens = useMemo(() => {
    if (!hasMention) return [];
    return formatInputTokens(value, effectiveUsers);
  }, [value, hasMention, effectiveUsers]);

  const hasActualMention = useMemo(() => {
    return tokens.some((t) => t.isMention);
  }, [tokens]);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={containerRef} sx={{ position: "relative", width: fullWidth ? "100%" : "auto" }}>
        <CustomTextField
          ref={inputRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          label={label}
          size={size}
          multiline={multiline}
          rows={rows}
          fullWidth={fullWidth}
          placeholder={placeholder}
          sx={{
            ...sx,
            "& .MuiInputBase-input": {
              fontSize: "0.875rem",
              lineHeight: 1.4375,
              fontFamily: "inherit",
            },
          }}
          InputProps={{
            ...InputProps,
            inputComponent: MentionInputBase,
            inputProps: {
              ...(InputProps?.inputProps || {}),
              tokens,
              hasMention: hasActualMention,
              multiline,
              rows,
            },
            endAdornment:
              InputProps?.endAdornment !== undefined ? (
                InputProps.endAdornment
              ) : (
                <InputAdornment position="end">
                  <Tooltip title="Gắn thẻ thành viên (@ hoặc @All)">
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={handleTriggerClick}
                      tabIndex={-1}
                      sx={{
                        color: open ? "primary.main" : "text.secondary",
                        bgcolor: open ? "rgba(115, 103, 240, 0.12)" : "transparent",
                        "&:hover": {
                          color: "primary.main",
                          bgcolor: "rgba(115, 103, 240, 0.08)",
                        },
                      }}
                    >
                      <i className="tabler-at" style={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
          }}
          {...props}
        />

        {/* Mentions Autocomplete Popper */}
        <Popper
          open={open}
          anchorEl={containerRef.current}
          placement={placement}
          style={{ zIndex: 100000, width: containerRef.current?.offsetWidth || 340, minWidth: 280 }}
          modifiers={[
            {
              name: "flip",
              enabled: true,
              options: {
                fallbackPlacements: ["top-start", "bottom-start", "top", "bottom"],
              },
            },
            {
              name: "preventOverflow",
              enabled: true,
              options: {
                boundary: "viewport",
                padding: 8,
              },
            },
          ]}
        >
          <Paper
            elevation={8}
            sx={{
              my: 1,
              maxHeight: 280,
              overflowY: "auto",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
                <i className="tabler-at text-primary" />
                Gợi ý gắn thẻ (Dùng phím ↑ ↓ và Enter để chọn):
              </Typography>
            </Box>

            {suggestions.length === 0 ? (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Không tìm thấy thành viên khớp với &quot;{mentionQuery}&quot;
                </Typography>
              </Box>
            ) : (
              <List disablePadding sx={{ py: 0.5 }}>
                {suggestions.map((item, idx) => {
                  const isSelected = idx === selectedIndex;

                  if (item.isAll) {
                    return (
                      <ListItemButton
                        key="item-all"
                        selected={isSelected}
                        onClick={() => handleSelectSuggestion(item)}
                        sx={{
                          py: 1,
                          px: 2,
                          gap: 1.5,
                          bgcolor: isSelected ? "rgba(115, 103, 240, 0.12) !important" : "transparent",
                          "&:hover": { bgcolor: "rgba(115, 103, 240, 0.08)" },
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: "primary.main",
                              color: "#fff",
                            }}
                          >
                            <i className="tabler-speakerphone" style={{ fontSize: 18 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                              @All (Tất cả mọi người)
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              Gửi thông báo nhắc tên đến toàn bộ thành viên
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    );
                  }

                  return (
                    <ListItemButton
                      key={item.id}
                      selected={isSelected}
                      onClick={() => handleSelectSuggestion(item)}
                      sx={{
                        py: 0.75,
                        px: 2,
                        gap: 1.5,
                        bgcolor: isSelected ? "rgba(115, 103, 240, 0.12) !important" : "transparent",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 36 }}>
                        <Avatar
                          src={item.avatar}
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: "0.8125rem",
                            bgcolor: "primary.light",
                            color: "primary.main",
                            fontWeight: 600,
                          }}
                        >
                          {item.name?.[0] || "U"}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                            @{item.displayName}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {item.subtitle}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
