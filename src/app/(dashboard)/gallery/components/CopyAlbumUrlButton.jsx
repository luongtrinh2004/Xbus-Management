"use client";
import Button from '@mui/material/Button';
import { toast } from 'react-toastify';
import { getAlbumLink } from '@/libs/galleryAlbumLink';

export default function CopyAlbumUrlButton({ description }) {
  const url = getAlbumLink(description);
  return <Button size="small" variant="outlined" sx={{ minHeight: 36, borderRadius: 1.5, bgcolor: "background.paper", whiteSpace: "nowrap" }} disabled={!url} startIcon={<i className="tabler-copy" />} onClick={async event => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Đã sao chép URL album');
    } catch { toast.error('Không thể sao chép URL. Vui lòng cho phép truy cập clipboard.'); }
  }}>Copy URL</Button>;
}
