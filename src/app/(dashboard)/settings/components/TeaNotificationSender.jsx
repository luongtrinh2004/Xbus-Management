"use client";
import { useEffect, useState } from 'react';
import { Autocomplete, Box, Button, Checkbox, TextField, Typography, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch } from '@mui/material';
import { toast } from 'react-toastify';

export default function TeaNotificationSender({ disabled, settings = {}, onChange }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState(null);
  const [open, setOpen] = useState(false);
  const excluded = new Set(settings.excludedUserIds || []);
  const selected = users.filter(user => !excluded.has(user.id));
  const setSelected = value => {
    const next = typeof value === 'function' ? value(selected) : value;
    const ids = new Set(next.map(user => user.id));
    onChange({...settings, excludedUserIds:[...new Set([...(settings.excludedUserIds || []).filter(id => !users.some(user => user.id === id)), ...users.filter(user => !ids.has(user.id)).map(user => user.id)])]});
  };
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch('/api/users?status=able&limit=10000'), fetch('/api/departments')])
      .then(async responses => {
        if (responses.some(response => !response.ok)) throw Error('Không tải được danh sách người nhận. Hãy tải lại trang.');
        const [people, groups] = await Promise.all(responses.map(response => response.json()));
        if (!cancelled) { setUsers((people.data || []).filter(user => user.email)); setDepartments(groups); }
      }).catch(err => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const query = search.trim().toLocaleLowerCase('vi');
  const filtered = users.filter(user => (!department || user.typeId === department.id) && `${user.name} ${user.code || ''} ${user.email}`.toLocaleLowerCase('vi').includes(query));
  const busy = disabled || loading || sending || Boolean(error);
  const send = async () => {
    if (busy || !selected.length) return;
    setSending(true);
    try {
      const saved = await fetch('/api/fund-config', {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'saveTeaReminder',enabled:Boolean(settings.enabled),sendTime:settings.sendTime || '10:00',excludedUserIds:settings.excludedUserIds || []})});
      if (!saved.ok) throw Error((await saved.json()).error || 'Không lưu được danh sách gửi');
      const response = await fetch('/api/notifications/run', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sendTeaNow',recipientIds:selected.map(user => user.id)})});
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Không gửi được thông báo');
      const message = `Đã gửi ${result.sent || 0} email; bỏ qua ${result.skipped || 0}; lỗi ${result.failed || 0}`;
      if (result.failed) toast.warning(message); else toast.success(message);
    } catch(err) { toast.error(err.message); }
    finally { setSending(false); }
  };
  return <Box sx={{display:'grid',gap:2}}>
    <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:2,flexWrap:'wrap'}}>
      <FormControlLabel label="Bật email thông báo Happy Hour / trà chiều" control={<Switch disabled={disabled || sending} checked={Boolean(settings.enabled)} onChange={event => onChange({...settings,enabled:event.target.checked})} />} />
      <Button variant="outlined" disabled={busy} onClick={() => setOpen(true)} startIcon={<i className="tabler-users" />}>Danh sách gửi ({selected.length})</Button>
    </Box>
    {error && <Alert severity="error">{error}</Alert>}
    <Button variant="contained" disabled={busy || !selected.length} onClick={send} startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <i className="tabler-send" />}>
      {sending ? 'Đang gửi thông báo…' : 'Gửi thông báo ngay bây giờ'}
    </Button>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Danh sách gửi thông báo</DialogTitle>
      <DialogContent sx={{display:'grid',gap:2,pt:'12px !important'}}>
        <Typography variant="body2">Mặc định chọn tất cả nhân sự đang hoạt động và có email. Bỏ tích để loại khỏi cả gửi ngay và gửi tự động.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    <Autocomplete options={departments} value={department} disabled={busy} onChange={(_,value) => setDepartment(value)} getOptionLabel={item => item.name || ''} isOptionEqualToValue={(a,b) => a.id === b.id} renderInput={params => <TextField {...params} size="small" label="Lọc theo bộ phận" />} />
    <TextField size="small" label="Tìm theo tên, mã nhân sự hoặc email" value={search} disabled={busy} onChange={event => setSearch(event.target.value)} />
    <Box sx={{maxHeight:360,overflowY:'auto',border:'1px solid',borderColor:'divider',borderRadius:1}}>
      {filtered.map(user => <FormControlLabel key={user.id} sx={{display:'flex',m:0,px:1,py:.5}} control={<Checkbox disabled={busy} checked={!excluded.has(user.id)} onChange={(_,checked) => setSelected(previous => checked ? [...previous,user] : previous.filter(item => item.id !== user.id))} />} label={<Box><Typography variant="body2">{user.name}</Typography><Typography variant="caption" color="text.secondary">{user.code} · {user.email}</Typography></Box>} />)}
      {!filtered.length && <Typography sx={{p:2}} color="text.secondary">Không có nhân sự phù hợp</Typography>}
    </Box>
    <Box sx={{display:'flex',gap:1,flexWrap:'wrap',alignItems:'center'}}>
      <Button size="small" disabled={busy || !filtered.length} onClick={() => setSelected(previous => [...new Map([...previous,...filtered].map(user => [user.id,user])).values()])}>Chọn tất cả kết quả ({filtered.length})</Button>
      <Button size="small" disabled={busy || !selected.length} onClick={() => setSelected([])}>Bỏ chọn tất cả</Button>
      <Typography variant="caption">Đã chọn {selected.length} người</Typography>
    </Box>
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>Xong</Button></DialogActions>
    </Dialog>
    <Typography variant="caption" color="text.secondary">Nhấn Lưu cài đặt để áp dụng danh sách cho lịch tự động. Gửi ngay sẽ lưu danh sách trước khi gửi.</Typography>
  </Box>;
}
