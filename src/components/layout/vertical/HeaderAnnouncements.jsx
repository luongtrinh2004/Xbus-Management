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

export default function HeaderAnnouncements() {
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
          user.birthday?.slice(5) === todayKey.slice(5),
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

  if (!messages.length) return null;

  return (
    <Box
      aria-label="Thông báo"
      sx={{
        width: { xs: 180, sm: 360 },
        maxWidth: "35vw",
        overflow: "hidden",
        borderRadius: 1.5,
        bgcolor: "error.main",
        color: "common.white",
        px: 2,
        py: 1.1,
        boxShadow: "0 2px 8px rgba(255,76,81,.28)",
        "@keyframes header-announcement": {
          "0%": { transform: "translateX(-105%)" },
          "100%": { transform: "translateX(100vw)" },
        },
      }}
    >
      <Typography
        component="div"
        style={{ color: "#fff" }}
        sx={{
          color: "#fff !important",
          fontSize: "1.0625rem",
          fontWeight: 800,
          lineHeight: 1.5,
          letterSpacing: 0.2,
          display: "inline-block",
          minWidth: "max-content",
          animation: "header-announcement 14s linear infinite",
        }}
      >
        {messages.join("     •     ")}
      </Typography>
    </Box>
  );
}
