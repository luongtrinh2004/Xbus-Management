'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'

const initial = { title: '', key: '', description: '', visibility: 'private', template: 'basic', color: '#7367F0' }
const colors = ['#7367F0', '#00BAD1', '#28C76F', '#FF9F43', '#EA5455', '#A8AAAE']
const templates = [
  { value: 'basic', label: 'Dự án cơ bản', text: 'Việc cần làm · Đang thực hiện · Hoàn thành' },
  { value: 'sprint', label: 'Sprint phần mềm', text: 'Backlog · Sẵn sàng · Thực hiện · Kiểm thử' },
  { value: 'campaign', label: 'Chiến dịch', text: 'Ý tưởng · Chuẩn bị · Đang chạy · Hoàn tất' }
]

export default function ProjectsPage() {
  const [data, setData] = useState({ projects: [], users: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const load = async () => {
    setLoading(true)
    try { const res = await fetch('/api/work/projects', { cache: 'no-store' }); const body = await res.json(); if (!res.ok) throw new Error(body.error); setData(body); setError('') }
    catch (e) { setError(e.message || 'Không thể tải dự án') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const projects = useMemo(() => data.projects.filter(project => {
    const query = search.trim().toLocaleLowerCase('vi')
    const matchesSearch = !query || `${project.title} ${project.key} ${project.description}`.toLocaleLowerCase('vi').includes(query)
    const matchesFilter = filter === 'all' || (filter === 'mine' ? ['owner', 'editor'].includes(project.role) : project.visibility === filter)
    return matchesSearch && matchesFilter
  }), [data.projects, search, filter])
  const create = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/work/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const body = await res.json(); if (!res.ok) throw new Error(body.error)
      toast.success('Đã tạo dự án'); setOpen(false); setForm(initial); await load()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }
  return <>
    <Card>
      <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size='small' placeholder='Tìm theo tên hoặc mã dự án...' value={search} onChange={e => setSearch(e.target.value)} sx={{ flex: '1 1 280px' }} InputProps={{ startAdornment: <i className='tabler-search' style={{ marginRight: 8 }} /> }} />
        <TextField select size='small' value={filter} onChange={e => setFilter(e.target.value)} sx={{ minWidth: 170 }}>
          <MenuItem value='all'>Tất cả dự án</MenuItem><MenuItem value='mine'>Tôi quản lý</MenuItem><MenuItem value='public'>Công khai</MenuItem><MenuItem value='private'>Riêng tư</MenuItem>
        </TextField>
        <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setOpen(true)}>Tạo dự án</Button>
      </CardContent>
    </Card>
    {error && <Alert severity='error'>{error}</Alert>}
    {loading ? <Box textAlign='center' py={8}><CircularProgress /></Box> : projects.length ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 3 }}>
      {projects.map(project => <Card key={project.id} component={Link} href={`/work/projects/${project.id}`} sx={{ textDecoration: 'none', color: 'inherit', transition: 'transform .2s, box-shadow .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: 8 } }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Avatar variant='rounded' sx={{ bgcolor: project.color, width: 48, height: 48, fontWeight: 700 }}>{project.key.slice(0, 2)}</Avatar>
            <Chip size='small' icon={<i className={project.visibility === 'public' ? 'tabler-world' : 'tabler-lock'} />} label={project.visibility === 'public' ? 'Công khai' : 'Riêng tư'} variant='tonal' />
          </Box>
          <Typography variant='h6' fontWeight={700} mt={2}>{project.title}</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ minHeight: 42, mt: .5 }}>{project.description || 'Chưa có mô tả dự án'}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}><Typography variant='caption'>{project.taskCount} công việc</Typography><Typography variant='caption' fontWeight={700}>{project.progress}%</Typography></Box>
          <LinearProgress variant='determinate' value={project.progress} sx={{ mt: .75, height: 6, borderRadius: 4 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5 }}><Box sx={{ display: 'flex' }}>{project.members.slice(0, 4).map((member, index) => <Avatar key={member.id} src={member.user?.avatarUrl} sx={{ width: 28, height: 28, ml: index ? -1 : 0, border: '2px solid', borderColor: 'background.paper', fontSize: 11 }}>{member.user?.name?.[0]}</Avatar>)}</Box><Chip size='small' label={project.role === 'owner' ? 'Chủ dự án' : project.role === 'editor' ? 'Biên tập' : 'Thành viên'} color={project.role === 'owner' ? 'primary' : 'default'} variant='tonal' /></Box>
        </CardContent>
      </Card>)}
    </Box> : <Card><CardContent sx={{ textAlign: 'center', py: 8 }}><i className='tabler-folders' style={{ fontSize: 56, opacity: .4 }} /><Typography variant='h6' mt={2}>Chưa có dự án phù hợp</Typography><Typography color='text.secondary'>Tạo dự án đầu tiên để bắt đầu phân công công việc.</Typography></CardContent></Card>}
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='sm'>
      <DialogTitle>Tạo dự án mới</DialogTitle><DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 2 }}><TextField label='Tên dự án' value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus /><TextField label='Mã dự án' value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase().replace(/\s+/g, '-') })} helperText='VD: WEB-1' /></Box>
        <TextField label='Mô tả' multiline minRows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <TextField select label='Mẫu dự án' value={form.template} onChange={e => setForm({ ...form, template: e.target.value })}>{templates.map(item => <MenuItem key={item.value} value={item.value}><Box><Typography variant='body2' fontWeight={600}>{item.label}</Typography><Typography variant='caption' color='text.secondary'>{item.text}</Typography></Box></MenuItem>)}</TextField>
        <TextField select label='Quyền riêng tư' value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}><MenuItem value='private'>Riêng tư — chỉ thành viên</MenuItem><MenuItem value='public'>Công khai — mọi tài khoản hoạt động</MenuItem></TextField>
        <Box><Typography variant='body2' mb={1}>Màu dự án</Typography><Box sx={{ display: 'flex', gap: 1 }}>{colors.map(color => <Box key={color} onClick={() => setForm({ ...form, color })} sx={{ width: 30, height: 30, bgcolor: color, borderRadius: 1, cursor: 'pointer', outline: form.color === color ? '3px solid' : 'none', outlineColor: 'primary.light', outlineOffset: 2 }} />)}</Box></Box>
      </DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Hủy</Button><Button variant='contained' disabled={saving || !form.title || !form.key} onClick={create}>{saving ? 'Đang tạo...' : 'Tạo dự án'}</Button></DialogActions>
    </Dialog>
  </>
}
