"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const vietnamDateKey = (value = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date(value))
    .reduce((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

const toKey = (value) => {
  const date = vietnamDateKey(value);
  return `${date.year}-${date.month}-${date.day}`;
};

const displayDate = (value) => {
  const date = vietnamDateKey(value);
  return `${date.day}/${date.month}`;
};

const birthdayMonthDay = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return date.toISOString().slice(5, 10);
  }
  const text = String(value).trim();
  const iso = text.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const vietnamese = text.match(/^(\d{1,2})\/(\d{1,2})\/\d{4}$/);
  if (vietnamese)
    return `${vietnamese[2].padStart(2, "0")}-${vietnamese[1].padStart(2, "0")}`;
  return "";
};

export default function HeaderAnnouncements({ onActiveChange }) {
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    Promise.all([fetch("/api/users?limit=200"), fetch("/api/afternoon-tea")])
      .then(async ([usersResponse, teaResponse]) => {
        const [usersData, teaData] = await Promise.all([
          usersResponse.json(),
          teaResponse.json(),
        ]);
        setUsers(usersData.data || []);
        setInvitations(teaData.invitations || []);
      })
      .catch(() => {});
  }, []);

  const messages = useMemo(() => {
    const today = new Date();
    const todayKey = toKey(today);
    const weekAhead = new Date(today);
    weekAhead.setDate(today.getDate() + 7);
    const weekAheadKey = toKey(weekAhead);
    const birthdayNames = users
      .filter(
        (user) =>
          user.status === "able" &&
          birthdayMonthDay(user.birthday) === todayKey.slice(5),
      )
      .map((user) => user.name)
      .filter(Boolean);
    const teaMessages = invitations
      .filter((invitation) => {
        const scheduledKey = toKey(invitation.scheduledAt);
        return scheduledKey >= todayKey && scheduledKey <= weekAheadKey;
      })
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      .map((invitation) => {
        const prefix =
          toKey(invitation.scheduledAt) === todayKey
            ? "Hôm nay có"
            : `Lịch ${displayDate(invitation.scheduledAt)}:`;
        if (invitation.type !== "happy-hour")
          return `${prefix} lời mời trà chiều — Mời mọi người vào đặt món!`;
        return `${prefix} Happy Hour, mời mọi người vào đặt món nha!!!`;
      });

    return [
      ...(birthdayNames.length
        ? [`Chúc mừng sinh nhật ${birthdayNames.join(", ")}!`]
        : []),
      ...teaMessages,
    ];
  }, [invitations, users]);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    onActiveChange?.(hasMessages);
  }, [hasMessages, onActiveChange]);

  if (!hasMessages) return null;

  return (
    <Box
      aria-label="Thông báo"
      sx={{
        flex: 1,
        minWidth: 0,
        height: 36,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        borderRadius: 2,
        bgcolor: "error.main",
        color: "common.white",
        px: 2,
        boxShadow: "0 2px 8px rgba(255, 76, 81, 0.28)",
        position: "relative",
        cursor: "default",
        userSelect: "none",
        "&:hover .header-marquee-track": {
          animationPlayState: "paused",
        },
        "@keyframes header-marquee-ltr": {
          "0%": {
            left: 0,
            transform: "translateY(-50%) translateX(-100%)",
          },
          "100%": {
            left: "100%",
            transform: "translateY(-50%) translateX(0%)",
          },
        },
      }}
    >
      <Box
        className="header-marquee-track"
        sx={{
          position: "absolute",
          top: "50%",
          left: 0,
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          animation: "header-marquee-ltr 22s linear infinite",
          willChange: "transform, left",
        }}
      >
        <Typography
          component="span"
          sx={{
            color: "#fff !important",
            fontSize: "0.9375rem",
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: 0.2,
            display: "inline-block",
            verticalAlign: "middle",
          }}
        >
          {messages.join("     •     ")}
        </Typography>
      </Box>
    </Box>
  );
}
