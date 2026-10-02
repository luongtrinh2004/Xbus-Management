"use client";
import { useState, useRef } from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';

export default function ZoomableMenuImage({ src, alt }) {
  const [zoom, setZoom] = useState(100);
  const viewport = useRef(null);
  const reset = () => {
    setZoom(100);
    viewport.current?.scrollTo({ top: 0, left: 0 });
  };
  return <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
      <Tooltip title="Thu nhỏ">
        <span><IconButton aria-label="Thu nhỏ menu" disabled={zoom <= 100} onClick={() => setZoom(value => Math.max(100, value - 25))}><i className="tabler-zoom-out" /></IconButton></span>
      </Tooltip>
      <Typography variant="body2" aria-live="polite" sx={{ minWidth: 45, textAlign: 'center', fontWeight: 600 }}>{zoom}%</Typography>
      <Tooltip title="Phóng to">
        <span><IconButton aria-label="Phóng to menu" disabled={zoom >= 400} onClick={() => setZoom(value => Math.min(400, value + 25))}><i className="tabler-zoom-in" /></IconButton></span>
      </Tooltip>
      <Button size="small" onClick={reset}>Vừa khung</Button>
      <Typography variant="caption" color="text.secondary">Cuộn ngang/dọc để xem khi phóng to</Typography>
    </Box>
    <Box ref={viewport} tabIndex={0} role="region" aria-label={alt} sx={{ maxHeight: '72vh', overflow: 'auto', borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ width: `${zoom}%` }}>
        <Box component="img" src={src} alt={alt} draggable={false} sx={{ display: 'block', width: '100%', maxWidth: 'none', maxHeight: `${72 * zoom / 100}vh`, objectFit: 'contain' }} />
      </Box>
    </Box>
  </Box>;
}
