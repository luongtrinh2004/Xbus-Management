"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const TokenBalance = () => {
  const [points, setPoints] = useState(null);

  useEffect(() => {
    const refresh = () =>
      fetch("/api/profile")
        .then((response) => (response.ok ? response.json() : null))
        .then((profile) => setPoints(Number(profile?.schedulingPoints || 0)))
        .catch(() => setPoints(0));
    refresh();
    window.addEventListener("scheduling-points-updated", refresh);
    return () =>
      window.removeEventListener("scheduling-points-updated", refresh);
  }, []);

  return (
    <Box
      aria-label={`Điểm rèn luyện: ${points ?? 0}`}
      title={`Điểm rèn luyện: ${points ?? 0}`}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        height: 27,
        pl: "9px",
        pr: "3px",
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: 9999,
        bgcolor: "rgba(115, 103, 240, 0.08)",
        color: "text.primary",
        cursor: "default",
        userSelect: "none",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: '"Inter Tight", sans-serif',
          fontSize: "0.875rem",
          fontWeight: 700,
          lineHeight: "16px",
          letterSpacing: "-0.03em",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          color: (theme) =>
            theme.palette.mode === "dark" ? "text.primary" : "#383838",
          textAlign: "center",
        }}
      >
        {points ?? "—"}
      </Typography>
      <Box
        component="img"
        src="/images/icons/token.svg"
        alt=""
        aria-hidden="true"
        sx={{ width: 25, height: 25, display: "block", flexShrink: 0 }}
      />
    </Box>
  );
};

export default TokenBalance;
