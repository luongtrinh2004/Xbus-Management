"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import GlobalStyles from "@mui/material/GlobalStyles";
import Typography from "@mui/material/Typography";

const planeUrl = (
  process.env.NEXT_PUBLIC_PLANE_URL || "http://localhost:3100"
).replace(/\/$/, "");

export default function PlaneProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [ticket, setTicket] = useState("");
  const loginForm = useRef(null);
  const submittedTicket = useRef("");
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setLoading(true);
    setSlow(false);
    setLoginUrl("");
    setTicket("");
    async function connect() {
      try {
        const response = await fetch("/api/work/plane/session", {
          method: "POST",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(25000),
          ]),
        });
        const data = await response.json();
        if (!response.ok || !data.loginUrl || !data.ticket)
          throw new Error(data.error || "Không thể mở phiên Plane.");
        if (!controller.signal.aborted) {
          setLoginUrl(data.loginUrl);
          setTicket(data.ticket);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    void connect();
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!ticket || !loginUrl || submittedTicket.current === ticket) return;
    submittedTicket.current = ticket;
    loginForm.current?.submit();
  }, [loginUrl, ticket]);

  useEffect(() => {
    if (!loginUrl || !loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setSlow(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [loginUrl, loading]);

  return (
    <>
      <GlobalStyles
        styles={{
          ".ts-vertical-layout-content-wrapper:has([data-plane-projects-root]) .ts-vertical-layout-content":
            {
              overflow: "hidden !important",
              display: "flex !important",
              flexDirection: "column !important",
              height: "calc(100vh - 70px) !important",
              maxHeight: "calc(100vh - 70px) !important",
            },
          ".ts-vertical-layout-content-wrapper:has([data-plane-projects-root]) .ts-vertical-layout-footer":
            {
              display: "none !important",
            },
          ".ts-horizontal-layout-content-wrapper:has([data-plane-projects-root]) .ts-horizontal-layout-content":
            {
              overflow: "hidden !important",
              display: "flex !important",
              flexDirection: "column !important",
              height: "calc(100vh - 70px) !important",
              maxHeight: "calc(100vh - 70px) !important",
            },
          ".ts-horizontal-layout-content-wrapper:has([data-plane-projects-root]) .ts-horizontal-layout-footer":
            {
              display: "none !important",
            },
        }}
      />
      <Box
        data-plane-projects-root=""
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          bgcolor: "background.paper",
          borderRadius: "var(--border-radius)",
          boxShadow: "var(--mui-customShadows-md)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading && !error && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1,
              px: 2,
              py: 1,
              borderRadius: 2,
              boxShadow: 2,
              pointerEvents: "none",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                {loginUrl
                  ? "Đang mở Plane…"
                  : "Đang đồng bộ nhân sự và kết nối Plane…"}
              </Typography>
            </Box>
          </Box>
        )}

        {(error || slow) && (
          <Box sx={{ maxWidth: 720, mx: "auto", pt: 8, px: 3 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error ||
                "Plane tải lâu hơn dự kiến. Bạn có thể kết nối lại hoặc mở Plane trong tab mới."}
            </Alert>
            <Button
              onClick={() => setAttempt((value) => value + 1)}
              variant="contained"
              sx={{ mr: 2 }}
            >
              Kết nối lại
            </Button>
            <Button href={planeUrl} target="_blank" rel="noreferrer">
              Mở Plane trong tab mới
            </Button>
          </Box>
        )}

        {loginUrl && (
          <form
            ref={loginForm}
            method="POST"
            action={loginUrl}
            target="plane-workspace"
            style={{ display: "none" }}
          >
            <input type="hidden" name="ticket" value={ticket} />
          </form>
        )}
        {loginUrl && (
          <Box
            component="iframe"
            name="plane-workspace"
            title="Plane — XBus Projects"
            onLoad={() => {
              setLoading(false);
              setSlow(false);
            }}
            onError={() => {
              setLoading(false);
              setError(
                "Không thể tải giao diện Plane. Hãy kiểm tra địa chỉ Plane hoặc thử kết nối lại.",
              );
            }}
            allow="clipboard-read; clipboard-write; fullscreen"
            sx={{
              display: error ? "none" : "block",
              width: "100%",
              height: "100%",
              flex: 1,
              border: 0,
              bgcolor: "background.paper",
            }}
          />
        )}
      </Box>
    </>
  );
}