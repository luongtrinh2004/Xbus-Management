"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import GlobalStyles from "@mui/material/GlobalStyles";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FocusTrap from "@mui/material/Unstable_TrapFocus";

const planeUrl = (process.env.NEXT_PUBLIC_PLANE_URL || "").replace(/\/$/, "");

export default function PlaneProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [ticket, setTicket] = useState("");
  const loginForm = useRef(null);
  const submittedTicket = useRef("");
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [language, setLanguage] = useState("vi-VN");
  const workspaceFrame = useRef(null);
  const focusToggle = useRef(null);

  const sendFocusMode = useCallback(() => {
    if (!loginUrl) return;
    workspaceFrame.current?.contentWindow?.postMessage(
      { type: "xbus-work-focus", enabled: focusMode },
      new URL(loginUrl, window.location.href).origin,
    );
  }, [focusMode, loginUrl]);

  useEffect(() => {
    if (!loginUrl) return;
    const origin = new URL(loginUrl, window.location.href).origin;
    const handleMessage = (event) => {
      if (
        event.source !== workspaceFrame.current?.contentWindow ||
        event.origin !== origin
      )
        return;
      if (event.data?.type === "xbus-work-ready") {
        if (["en", "vi-VN"].includes(event.data.language))
          setLanguage(event.data.language);
        event.source.postMessage(
          { type: "xbus-work-focus", enabled: focusMode },
          origin,
        );
      }
      if (event.data?.type === "xbus-work-exit-focus") {
        setFocusMode(false);
        focusToggle.current?.focus();
      }
    };
    window.addEventListener("message", handleMessage);
    sendFocusMode();
    return () => window.removeEventListener("message", handleMessage);
  }, [focusMode, loginUrl, sendFocusMode]);

  useEffect(() => {
    if (!focusMode) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setFocusMode(false);
        focusToggle.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusMode]);

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
          throw new Error(data.error || "Không thể mở phiên XBus Office.");
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
      <FocusTrap open={focusMode} disableAutoFocus>
        <Box
          data-plane-projects-root=""
          data-plane-focus={focusMode ? "" : undefined}
          role={focusMode ? "dialog" : undefined}
          aria-modal={focusMode ? true : undefined}
          aria-label={
            focusMode
              ? language === "en"
                ? "Work management focus mode"
                : "Quản lý công việc — chế độ tập trung"
              : undefined
          }
          sx={{
            position: focusMode ? "fixed" : "relative",
            inset: focusMode ? 0 : undefined,
            zIndex: focusMode ? 1600 : undefined,
            width: "100%",
            height: focusMode ? "100dvh" : "100%",
            bgcolor: "background.paper",
            borderRadius: focusMode ? 0 : "var(--border-radius)",
            boxShadow: "var(--mui-customShadows-md)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Tooltip
            title={
              language === "en"
                ? focusMode
                  ? "Exit focus mode (Esc)"
                  : "Focus mode"
                : focusMode
                  ? "Thoát chế độ tập trung (Esc)"
                  : "Chế độ tập trung"
            }
          >
            <IconButton
              ref={focusToggle}
              aria-label={
                language === "en"
                  ? focusMode
                    ? "Exit focus mode"
                    : "Focus mode"
                  : focusMode
                    ? "Thoát chế độ tập trung"
                    : "Chế độ tập trung"
              }
              aria-pressed={focusMode}
              onClick={() => setFocusMode((value) => !value)}
              sx={{
                position: "absolute",
                right: 16,
                bottom: 72,
                zIndex: 5,
                width: 42,
                height: 42,
                borderRadius: 2,
                bgcolor: focusMode ? "primary.main" : "background.paper",
                color: focusMode ? "primary.contrastText" : "text.primary",
                border: "1px solid",
                borderColor: focusMode ? "primary.main" : "divider",
                boxShadow: 3,
                "&:hover": {
                  bgcolor: focusMode ? "primary.dark" : "action.hover",
                },
              }}
            >
              <i
                className={focusMode ? "tabler-minimize" : "tabler-maximize"}
                aria-hidden="true"
              />
            </IconButton>
          </Tooltip>
          {loading && !error && (
            <Box
              role="status"
              aria-label="Đang tải quản lý công việc"
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                display: "grid",
                placeItems: "center",
                pointerEvents: "none",
              }}
            >
              <Box
                component="img"
                src="/images/icons/loading.svg"
                alt=""
                aria-hidden="true"
                sx={{ width: 64, height: 64 }}
              />
            </Box>
          )}

          {(error || slow) && (
            <Box sx={{ maxWidth: 720, mx: "auto", pt: 8, px: 3 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {error ||
                  "XBus Office tải lâu hơn dự kiến. Bạn có thể kết nối lại hoặc mở XBus Office trong tab mới."}
              </Alert>
              <Button
                onClick={() => setAttempt((value) => value + 1)}
                variant="contained"
                sx={{ mr: 2 }}
              >
                Kết nối lại
              </Button>
              <Button
                href={`${planeUrl}/xbus-office/projects/`}
                target="_blank"
                rel="noreferrer"
              >
                Mở XBus Office trong tab mới
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
              ref={workspaceFrame}
              name="plane-workspace"
            tabIndex={0}
              title="XBus Office — XBus Projects"
              onLoad={() => {
                sendFocusMode();
                setLoading(false);
                setSlow(false);
              }}
              onError={() => {
                setLoading(false);
                setError(
                  "Không thể tải giao diện XBus Office. Hãy kiểm tra địa chỉ XBus Office hoặc thử kết nối lại.",
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
      </FocusTrap>
    </>
  );
}
