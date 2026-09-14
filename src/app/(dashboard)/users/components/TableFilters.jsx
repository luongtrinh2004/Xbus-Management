'use client'

import { useState, useEffect } from 'react'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import CustomTextField from '@core/components/mui/TextField'
import DepartmentManagerModal from './DepartmentManagerModal'

const categoryOptions = [
  { value: 'category_official', label: 'Chính thức' },
  { value: 'category_probation', label: 'Thử việc' },
  { value: 'category_intern', label: 'Thực tập' },
  { value: 'category_collaborator', label: 'Cộng tác viên' }
]

const TableFilters = ({ role, setRole, type, setType, category, setCategory }) => {
  const [departments, setDepartments] = useState([])
  const [deptModalOpen, setDeptModalOpen] = useState(false)

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      const data = await res.json()
      setDepartments(Array.isArray(data) ? data : [])
    } catch {
      console.error('Không thể tải danh sách bộ phận')
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  const handleDeptChanged = () => {
    fetchDepartments()
    // Reset filter nếu bộ phận đang chọn bị xóa
    setType('')
  }

  return (
    <>
      <CardContent className='pbe-4'>
        <Grid container spacing={4}>
          {/* Lọc theo Vai trò */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <CustomTextField
              select
              fullWidth
              label='Vai trò'
              value={role}
              onChange={e => setRole(e.target.value)}
              slotProps={{ select: { displayEmpty: true } }}
              size='small'
            >
              <MenuItem value=''>Tất cả vai trò</MenuItem>
              <MenuItem value='admin'>Quản trị viên</MenuItem>
              <MenuItem value='user'>Nhân viên</MenuItem>
            </CustomTextField>
          </Grid>

          {/* Lọc theo Bộ phận + nút quản lý */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CustomTextField
                select
                fullWidth
                label='Bộ phận'
                value={type}
                onChange={e => setType(e.target.value)}
                slotProps={{ select: { displayEmpty: true } }}
                size='small'
              >
                <MenuItem value=''>Tất cả bộ phận</MenuItem>
                {departments.map(d => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </CustomTextField>
              <Tooltip title='Quản lý bộ phận'>
                <IconButton
                  size='small'
                  color='primary'
                  onClick={() => setDeptModalOpen(true)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'primary.main',
                    borderRadius: 1.5,
                    flexShrink: 0,
                    width: 36,
                    height: 36
                  }}
                >
                  <i className='tabler-settings-2 text-sm' />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>

          {/* Lọc theo Hình thức */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <CustomTextField
              select
              fullWidth
              label='Hình thức'
              value={category}
              onChange={e => setCategory(e.target.value)}
              slotProps={{ select: { displayEmpty: true } }}
              size='small'
            >
              <MenuItem value=''>Tất cả hình thức</MenuItem>
              {categoryOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
        </Grid>
      </CardContent>

      <DepartmentManagerModal
        open={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        onChanged={handleDeptChanged}
      />
    </>
  )
}

export default TableFilters
