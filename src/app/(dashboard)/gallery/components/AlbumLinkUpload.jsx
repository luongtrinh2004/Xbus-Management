"use client";
import { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import { getAlbumLink } from '@/libs/galleryAlbumLink';

export default function AlbumLinkUpload({ onUploadSuccess, onClose, onBusyChange, defaultChannel = "memory" }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const submit = async () => {
    if (busy || !file || !getAlbumLink(description)) return;
    setBusy(true); onBusyChange(true);
    try {
      const data = new FormData();
      data.set('title', title.trim());
      data.set('postType', 'album_link'); data.set('description', description.trim());
      data.set('channel', defaultChannel || 'memory');
      data.set('file', file);
      const response = await fetch('/api/gallery/upload', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Không thể đăng link album');
      onUploadSuccess(result.items, result.storage);
      toast.success('Đã đăng link album'); onClose();
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); onBusyChange(false); }
  };
  return <Box sx={{ display: 'grid', gap: 3, pt: 2 }}>
    <TextField label="Tiêu đề" placeholder="Nhập tiêu đề album" value={title} disabled={busy} onChange={e => setTitle(e.target.value)} />
    <TextField label="URL album" placeholder="Dán link Google Drive, Google Photos hoặc link album…" multiline minRows={4} value={description} disabled={busy} onChange={e => setDescription(e.target.value)} helperText="Dán link bắt đầu bằng https://. Người xem sẽ mở album tại trang gốc." />
    <Button component="label" variant="outlined" disabled={busy}>
      {file ? 'Thay ảnh thumbnail' : 'Chọn 1 ảnh thumbnail'}
      <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {
        const selected = e.target.files?.[0]; e.target.value = '';
        if (!selected) return;
        if (!['image/jpeg','image/png','image/webp'].includes(selected.type) || selected.size > 10 * 1024 ** 2) return toast.error('Chọn ảnh JPG, PNG hoặc WebP tối đa 10 MB');
        setFile(selected);
      }} />
    </Button>
    {preview && <Box component="img" src={preview} alt="Ảnh thumbnail album" sx={{ maxHeight: 240, maxWidth: '100%', mx: 'auto', objectFit: 'contain', borderRadius: 1 }} />}
    <Typography variant="caption">Bài đăng hiển thị cho toàn bộ thành viên Xbus. Quyền truy cập album do trang chứa album quản lý.</Typography>
    <Button variant="contained" disabled={busy || !file || !getAlbumLink(description)} onClick={submit} startIcon={busy ? <CircularProgress size={18} /> : <i className="tabler-link" />}>
      {busy ? 'Đang đăng album…' : 'Đăng link album'}
    </Button>
  </Box>;
}
