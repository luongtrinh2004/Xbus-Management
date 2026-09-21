"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const TokenBalance = () => {
  const [points, setPoints] = useState(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((response) => (response.ok ? response.json() : null))
      .then((profile) => setPoints(Number(profile?.schedulingPoints || 0)))
      .catch(() => setPoints(0));
  }, []);

  return (
    <Box
      aria-label={`Điểm rèn luyện: ${points ?? 0}`}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
        width: 76,
        height: 34,
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: 999,
        bgcolor: "rgba(115, 103, 240, 0.08)",
        color: "text.primary",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <Typography
        component="span"
        sx={{
          minWidth: "3ch",
          fontFamily: '"Inter Tight", "Public Sans", sans-serif',
          fontSize: "0.9375rem",
          fontWeight: 600,
          lineHeight: 1,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {points ?? "—"}
      </Typography>
      <Box
        component="img"
        src="/images/icons/token.svg"
        alt=""
        aria-hidden="true"
        sx={{ width: 28, height: 28, display: "block", flexShrink: 0 }}
      />
    </Box>
  );
};

export default TokenBalance;
