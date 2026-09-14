'use client'

import { useState, useMemo } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Alert from '@mui/material/Alert'
import CustomTextField from '@core/components/mui/TextField'
import InputAdornment from '@mui/material/InputAdornment'

export default function ChangeMemberModal({
  open,
  onClose,
  currentParticipants = [],
  eligibleUsers = [],
  onSelectUser
}) {
  const [search, setSearch] = useState('')

  // Lọc ra các nhân sự chưa có trong danh sách của tuần này
  const availableUsers = useMemo(() => {
    const currentIds = currentParticipants.map(p => p.userId || p)
    return eligibleUsers.filter(u => !currentIds.includes(u.id))
  }, [eligibleUsers, currentParticipants])

  // Sắp xếp theo điểm rèn luyện từ thấp đến cao (Mục 2.10)
  const sortedUsers = useMemo(() => {
    const list = [...availableUsers]
    list.sort((a, b) => (a.schedulingPoints || 0) - (b.schedulingPoints || 0))
    if (!search) return list
    const q = search.toLowerCase().trim()
    return list.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.code && u.code.toLowerCase().includes(q))
    )
  }, [availableUsers, search])

  const minPoints = sortedUsers[0]?.schedulingPoints ?? 0

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle component='div'>
        <Typography variant='h5' fontWeight={600} component='span' display='block'>
          Chọn Nhân Sự Bê Nước
        </Typography>
        <Typography variant='body2' color='text.secondary' component='span' display='block'>
          Danh sách nhân sự nam đủ điều kiện — Ưu tiên người có điểm thấp nhất để đảm bảo công bằng
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <CustomTextField
          fullWidth
          size='small'
          placeholder='Tìm theo tên hoặc mã nhân sự...'
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='tabler-search text-muted' />
                </InputAdornment>
              )
            }
          }}
          sx={{ mb: 2 }}
        />

        <Box sx={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sortedUsers.map(u => {
            const isPriority = (u.schedulingPoints || 0) === minPoints

            return (
              <Box
                key={u.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' },
                  transition: 'all 0.2s'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 34, height: 34, fontSize: 13, bgcolor: 'rgba(115,103,240,.15)', color: 'primary.main' }}>
                    {u.name?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant='body2' fontWeight={600}>{u.name}</Typography>
                      {u.code && <Chip size='small' label={u.code} sx={{ height: 20, fontSize: 11 }} />}
                      {isPriority && (
                        <Chip size='small' label='Ưu tiên' color='success' variant='tonal' sx={{ height: 20, fontSize: 10 }} />
                      )}
                    </Box>
                    <Typography variant='caption' color='text.secondary'>
                      Đã đi: {u.waterTripCount || 0} lượt · Điểm: {u.schedulingPoints || 0}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  size='small'
                  variant='contained'
                  color={isPriority ? 'primary' : 'secondary'}
                  onClick={() => {
                    onSelectUser({
                      userId: u.id,
                      name: u.name,
                      code: u.code,
                      completed: false
                    })
                    onClose()
                  }}
                  startIcon={<i className='tabler-user-plus text-sm' />}
                >
                  Chọn
                </Button>
              </Box>
            )
          })}

          {sortedUsers.length === 0 && (
            <Alert severity='warning' sx={{ mt: 1 }}>
              Không tìm thấy nhân sự phù hợp
            </Alert>
          )}
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
