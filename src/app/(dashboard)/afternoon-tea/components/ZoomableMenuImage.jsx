"use client";

import { useRef, useState } from "react";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";

const clampZoom = (value) => Math.max(100, Math.min(400, value));

export default function ZoomableMenuImage({ src, alt }) {
  const [zoom, setZoom] = useState(100);
  const [dragging, setDragging] = useState(false);
  const viewport = useRef(null);
  const dragStart = useRef(null);

  const reset = () => {
    setZoom(100);
    viewport.current?.scrollTo({ top: 0, left: 0 });
  };
  const changeZoom = (delta, anchor) => {
    setZoom((current) => {
      const next = clampZoom(current + delta);
      const view = viewport.current;
      if (!view || next === current) return next;
      const point = anchor || {
        x: view.clientWidth / 2,
        y: view.clientHeight / 2,
      };
      const ratio = next / current;
      requestAnimationFrame(() => {
        view.scrollLeft = (view.scrollLeft + point.x) * ratio - point.x;
        view.scrollTop = (view.scrollTop + point.y) * ratio - point.y;
      });
      return next;
    });
  };
  const onWheel = (event) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    changeZoom(event.deltaY < 0 ? 15 : -15, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };
  const onMouseDown = (event) => {
    if (event.button !== 0 || !viewport.current) return;
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      left: viewport.current.scrollLeft,
      top: viewport.current.scrollTop,
    };
    setDragging(true);
  };
  const onMouseMove = (event) => {
    if (!dragging || !dragStart.current || !viewport.current) return;
    viewport.current.scrollLeft =
      dragStart.current.left - event.clientX + dragStart.current.x;
    viewport.current.scrollTop =
      dragStart.current.top - event.clientY + dragStart.current.y;
  };
  const stopDragging = () => {
    dragStart.current = null;
    setDragging(false);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          mb: 1.5,
        }}
      >
        <Tooltip title="Thu nhỏ">
          <span>
            <IconButton
              aria-label="Thu nhỏ menu"
              disabled={zoom <= 100}
              onClick={() => changeZoom(-25)}
            >
              <i className="tabler-zoom-out" />
            </IconButton>
          </span>
        </Tooltip>
        <Typography
          variant="body2"
          aria-live="polite"
          sx={{ minWidth: 45, textAlign: "center", fontWeight: 600 }}
        >
          {zoom}%
        </Typography>
        <Tooltip title="Phóng to">
          <span>
            <IconButton
              aria-label="Phóng to menu"
              disabled={zoom >= 400}
              onClick={() => changeZoom(25)}
            >
              <i className="tabler-zoom-in" />
            </IconButton>
          </span>
        </Tooltip>
        <Button size="small" onClick={reset}>
          Vừa khung
        </Button>
        <Typography variant="caption" color="text.secondary">
          Lăn chuột để zoom · Giữ chuột trái để kéo ảnh
        </Typography>
      </Box>
      <Box
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label={alt}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        sx={{
          maxHeight: "72vh",
          overflow: "auto",
          borderRadius: 2,
          bgcolor: "action.hover",
          border: "1px solid",
          borderColor: "divider",
          cursor: dragging ? "grabbing" : zoom > 100 ? "grab" : "default",
          userSelect: "none",
        }}
      >
        <Box sx={{ width: `${zoom}%` }}>
          <Box
            component="img"
            src={src}
            alt={alt}
            draggable={false}
            sx={{
              display: "block",
              width: "100%",
              maxWidth: "none",
              objectFit: "contain",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
