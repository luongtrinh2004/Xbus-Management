'use client'

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import { toast } from 'react-toastify'
import CustomTextField from '@core/components/mui/TextField'
import DialogCloseButton from './DialogCloseButton'

const DepartmentManagerModal = ({ open, onClose, onChanged }) => {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/departments')
      const data = await res.json()
      setDepartments(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Không thể tải danh sách bộ phận')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchDepartments()
  }, [open])

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error('Tên bộ phận không được để trống')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        setDepartments(prev => [...prev, data])
        setNewName('')
        setNewDesc('')
        toast.success(`Đã thêm bộ phận "${data.name}"`)
        onChanged?.()
      } else {
        toast.error(data.error || 'Thêm bộ phận thất bại')
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async dept => {
    setDeletingId(dept.id)
    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setDepartments(prev => prev.filter(d => d.id !== dept.id))
        if (data.affectedUsers > 0) {
          toast.info(`Đã xóa bộ phận "${dept.name}". ${data.affectedUsers} nhân sự được gỡ khỏi bộ phận này.`)
        } else {
          toast.success(`Đã xóa bộ phận "${dept.name}"`)
        }
        onChanged?.()
      } else {
        toast.error(data.error || 'Xóa bộ phận thất bại')
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogCloseButton onClick={onClose} />
      <DialogTitle component='div'>
        <Typography variant='h5' fontWeight={600} component='span' display='block'>
          Quản Lý Bộ Phận
        </Typography>
        <Typography variant='body2' color='text.secondary' component='span' display='block'>
          Thêm hoặc xóa bộ phận chuyên môn trong hệ thống
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Danh sách bộ phận hiện tại */}
        <Box sx={{ px: 4, py: 3 }}>
          <Typography variant='subtitle2' color='text.secondary' fontWeight={600} gutterBottom>
            Danh sách hiện tại
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : departments.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
              Chưa có bộ phận nào
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              {departments.map(dept => (
                <Box
                  key={dept.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                  }}
                >
                  <Box>
                    <Typography variant='body2' fontWeight={600}>
                      {dept.name}
                    </Typography>
                    {dept.description && (
                      <Typography variant='caption' color='text.secondary'>
                        {dept.description}
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title='Xóa bộ phận' placement='left'>
                    <span>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => handleDelete(dept)}
                        disabled={deletingId === dept.id}
                      >
                        {deletingId === dept.id ? (
                          <CircularProgress size={16} color='error' />
                        ) : (
                          <i className='tabler-trash text-sm' />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Divider />

        {/* Form thêm mới */}
        <Box sx={{ px: 4, py: 3 }}>
          <Typography variant='subtitle2' color='text.secondary' fontWeight={600} gutterBottom>
            Thêm bộ phận mới
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField
              fullWidth
              label='Tên bộ phận'
              placeholder='Ví dụ: AI Research'
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <CustomTextField
              fullWidth
              label='Mô tả (tuỳ chọn)'
              placeholder='Mô tả ngắn về bộ phận...'
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
            <Button
              variant='contained'
              color='primary'
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              startIcon={adding ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-plus' />}
            >
              Thêm bộ phận
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DepartmentManagerModal
