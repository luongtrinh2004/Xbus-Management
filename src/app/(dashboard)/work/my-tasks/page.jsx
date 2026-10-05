'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'

const priority = { low: ['Thấp', 'info'], medium: ['Trung bình', 'primary'], high: ['Cao', 'warning'], urgent: ['Khẩn cấp', 'error'] }

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('open')
  const load = async () => { setLoading(true); try { const res = await fetch('/api/work/my-tasks', { cache: 'no-store' }); const body = await res.json(); if (!res.ok) throw new Error(body.error); setTasks(body.tasks); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const visible = useMemo(() => tasks.filter(task => filter === 'all' || (filter === 'done' ? task.completed : !task.completed)), [tasks, filter])
  const toggle = async task => { try { const res = await fetch(`/api/work/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: !task.completed, status: !task.completed ? 'done' : 'todo' }) }); const body = await res.json(); if (!res.ok) throw new Error(body.error); await load() } catch (e) { toast.error(e.message) } }
  if (loading) return <Box textAlign='center' py={10}><CircularProgress /></Box>
  return <Card><CardContent>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 3 }}><Box><Typography variant='h5' fontWeight={700}>Công việc của tôi</Typography><Typography color='text.secondary'>{tasks.filter(task => !task.completed).length} công việc đang mở</Typography></Box><TextField select size='small' value={filter} onChange={e => setFilter(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value='open'>Đang mở</MenuItem><MenuItem value='done'>Hoàn thành</MenuItem><MenuItem value='all'>Tất cả</MenuItem></TextField></Box>
    {error && <Alert severity='error'>{error}</Alert>}
    {visible.length ? <Box sx={{ display: 'flex', flexDirection: 'column' }}>{visible.map(task => { const overdue = task.dueDate && task.dueDate < '2026-10-05' && !task.completed; return <Box key={task.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}><Checkbox checked={task.completed} onChange={() => toggle(task)} /><Box sx={{ width: 10, height: 38, borderRadius: 1, bgcolor: task.project.color }} /><Box component={Link} href={`/work/projects/${task.projectId}`} sx={{ flex: 1, textDecoration: 'none', color: 'inherit' }}><Typography fontWeight={600} sx={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</Typography><Typography variant='caption' color='text.secondary'>{task.project.key} · {task.code}</Typography></Box><Chip size='small' label={priority[task.priority]?.[0]} color={priority[task.priority]?.[1]} variant='tonal' />{task.dueDate && <Chip size='small' icon={<i className='tabler-calendar' />} label={new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('vi-VN')} color={overdue ? 'error' : 'default'} variant={overdue ? 'tonal' : 'outlined'} />}</Box> })}</Box> : <Box textAlign='center' py={8}><i className='tabler-circle-check' style={{ fontSize: 60, opacity: .35 }} /><Typography variant='h6' mt={2}>Không có công việc trong nhóm này</Typography></Box>}
  </CardContent></Card>
}
