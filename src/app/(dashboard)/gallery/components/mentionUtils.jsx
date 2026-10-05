"use client";

import React from "react";
import Box from "@mui/material/Box";

/**
 * Normalizes text for accent-insensitive search
 */
export function normalizeSearch(str = "") {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim();
}

// Initial cached list of system users to guarantee full Vietnamese names are recognized
let cachedUserNames = new Set([
  "Nhân viên hệ thống",
  "Quản trị viên Hệ thống",
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
]);

export function registerUserName(name) {
  if (name && typeof name === "string") {
    cachedUserNames.add(name.trim());
  }
}

export function getCachedUserNames() {
  return cachedUserNames;
}

// Auto-fetch and register new users if client-side
if (typeof window !== "undefined") {
  fetch("/api/users?limit=200")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const list = data?.data || data?.users || (Array.isArray(data) ? data : []);
      if (Array.isArray(list) && list.length > 0) {
        list.forEach((u) => {
          if (u?.name) cachedUserNames.add(u.name.trim());
        });
      }
    })
    .catch(() => {});
}

/**
 * Parses text and returns React nodes with styled mentions and hashtags.
 * Properly recognizes full Vietnamese multi-word names (e.g. @Trịnh Phúc Lương).
 */
export function renderWithMentions(text, usersList = []) {
  if (!text || typeof text !== "string") return text || "";

  // Register any names passed in usersList prop
  if (Array.isArray(usersList) && usersList.length > 0) {
    usersList.forEach((u) => {
      const name = typeof u === "string" ? u : u?.name;
      if (name && typeof name === "string") {
        cachedUserNames.add(name.trim());
      }
    });
  }

  // Sort names by length descending so longer full names match first
  const sortedNames = Array.from(cachedUserNames).sort(
    (a, b) => b.length - a.length
  );

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const namesPattern = sortedNames.map(escapeRegex).join("|");

  // Regex matches:
  // 1. @all
  // 2. @[Name With Spaces]
  // 3. #hashtag
  // 4. @Exact Full User Name (e.g. @Trịnh Phúc Lương)
  // 5. Fallback single word @mention (e.g. @Thanh)
  const patternString = `(@all|@\\[[^\\]]+\\]|#(?:[A-Za-z0-9À-ỹ_-]+)|@(?:${namesPattern})|@[A-Za-z0-9À-ỹ_.-]+)(?=[\\s.,!?:;"'()\\[\\]{}]|$)`;
  const regex = new RegExp(patternString, "gi");

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    const isTagAll = /^@all$/i.test(token);
    const isHashTag = token.startsWith("#");

    if (isTagAll) {
      parts.push(
        <Box
          key={`mention-all-${match.index}`}
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.3,
            color: "primary.main",
            bgcolor: "rgba(115, 103, 240, 0.12)",
            px: 0.75,
            py: 0.15,
            borderRadius: 1,
            fontWeight: 700,
            fontSize: "0.85em",
            userSelect: "none",
            verticalAlign: "baseline",
            mx: 0.25,
          }}
        >
          <i className="tabler-speakerphone" style={{ fontSize: "1.1em" }} />
          @All
        </Box>
      );
    } else if (isHashTag) {
      parts.push(
        <Box
          key={`hashtag-${match.index}`}
          component="span"
          sx={{
            color: "primary.main",
            fontWeight: 600,
            cursor: "pointer",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {token}
        </Box>
      );
    } else {
      // User mention: @Name or @[Name]
      const cleanName = token.startsWith("@[") && token.endsWith("]")
        ? token.slice(2, -1)
        : token.startsWith("@")
          ? token.slice(1)
          : token;

      parts.push(
        <Box
          key={`mention-user-${match.index}`}
          component="span"
          sx={{
            display: "inline-block",
            color: "primary.main",
            bgcolor: "rgba(115, 103, 240, 0.12)",
            px: 0.75,
            py: 0.15,
            borderRadius: 1,
            fontWeight: 600,
            fontSize: "0.88em",
            userSelect: "none",
            verticalAlign: "baseline",
            mx: 0.2,
          }}
        >
          @{cleanName}
        </Box>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Resolves the latest avatar URL for a given author or uploader from usersList.
 * If the user updated their avatar, this guarantees older comments/posts display the new avatar.
 */
export function resolveAuthorAvatar(author, usersList = []) {
  if (!author) return "/images/avatars/male-user.png";

  const authorId = author.id || author._id;
  const authorEmail = author.email?.toLowerCase();
  const authorName = author.name?.trim()?.toLowerCase();

  const matchedUser = Array.isArray(usersList)
    ? usersList.find((u) => {
        if (authorId && (u.id === authorId || u._id === authorId)) return true;
        if (authorEmail && u.email && u.email.toLowerCase() === authorEmail) return true;
        if (authorName && u.name && u.name.trim().toLowerCase() === authorName) return true;
        return false;
      })
    : null;

  if (matchedUser?.avatar) {
    return matchedUser.avatar;
  }

  return author.avatar || "/images/avatars/male-user.png";
}

