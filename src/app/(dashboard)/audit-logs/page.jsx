'use client'

import { useState } from 'react'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import tableStyles from '@core/styles/table.module.css'
import { exportJsonToExcel } from '@/libs/excelHelper'

export default function AuditLogsPage() {
  const sampleLogs = [
    {
      id: 'log_001',
      admin: 'Quản trị viên Hệ thống (admin@phenikaa-x.com)',
      action: 'KÍCH HOẠT',
      actionColor: 'success',
      target: 'Nhân sự',
      details: 'Kích hoạt tài khoản Trịnh Phúc Lương (HDK181) và gán phòng ban Web/App',
      ip: '127.0.0.1',
      time: '01/09/2026 08:30:00'
    },
    {
      id: 'log_002',
      admin: 'Quản trị viên Hệ thống (admin@phenikaa-x.com)',
      action: 'TẠO BỘ PHẬN',
      actionColor: 'info',
      target: 'Danh mục',
      details: 'Tạo bộ phận chuyên môn mới: Web/App',
      ip: '127.0.0.1',
      time: '01/09/2026 08:35:00'
    },
    {
      id: 'log_003',
      admin: 'Quản trị viên Hệ thống (admin@phenikaa-x.com)',
      action: 'XÁC NHẬN BÊ NƯỚC',
      actionColor: 'primary',
      target: 'Lịch bê nước',
      details: 'Xác nhận hoàn thành lịch tuần 1 tháng 09/2026 cho 3 người (+1 điểm/lượt)',
      ip: '127.0.0.1',
      time: '04/09/2026 10:00:00'
    },
    {
      id: 'log_004',
      admin: 'Quản trị viên Hệ thống (admin@phenikaa-x.com)',
      action: 'GHI NHẬN ĐÓNG QUỸ',
      actionColor: 'warning',
      target: 'Quỹ phòng',
      details: 'Xác nhận thu 100.000 VNĐ quỹ tháng 09/2026 của Trịnh Phúc Lương',
      ip: '127.0.0.1',
      time: '05/09/2026 09:30:00'
    }
  ]

  const handleExportExcel = () => {
    const exportData = sampleLogs.map(l => ({
      'Thời gian': l.time,
      'Quản trị viên': l.admin,
      'Hành động': l.action,
      'Đối tượng': l.target,
      'Nội dung chi tiết': l.details,
      'Địa chỉ IP': l.ip
    }))
    exportJsonToExcel(exportData, 'nhat_ky_kiem_toan.xlsx')
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' icon={<i className='tabler-shield-lock text-xl' />} sx={{ mb: 4 }}>
          <strong>Chế độ Kiểm toán Quản trị:</strong> Nhật ký này chỉ dành riêng cho Admin theo dõi toàn bộ các thao tác đã thực hiện trên hệ thống. Dữ liệu mang tính kiểm toán minh bạch, ở chế độ <strong>chỉ đọc (Read-only)</strong> và không được phép chỉnh sửa hoặc xóa bỏ.
        </Alert>

        <Card>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar variant='rounded' sx={{ bgcolor: 'rgba(115, 103, 240, 0.12)', color: 'primary.main' }}>
                  <i className='tabler-history text-2xl' />
                </Avatar>
                <Box>
                  <Typography variant='h5' fontWeight={600}>Lịch Sử Hoạt Động Quản Trị</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Nhật ký kiểm toán ghi nhận mọi thao tác cấu hình, kích hoạt, quỹ và lịch trình
                  </Typography>
                </Box>
              </Box>
            }
            action={
              <Button
                variant='tonal'
                color='secondary'
                startIcon={<i className='tabler-file-spreadsheet' />}
                onClick={handleExportExcel}
              >
                Xuất Excel
              </Button>
            }
          />
          <Divider />
          <TableContainer>
            <Table className={tableStyles.table}>
              <TableHead>
                <TableRow>
                  <TableCell>THỜI GIAN</TableCell>
                  <TableCell>QUẢN TRỊ VIÊN</TableCell>
                  <TableCell>HÀNH ĐỘNG</TableCell>
                  <TableCell>ĐỐI TƯỢNG</TableCell>
                  <TableCell>CHI TIẾT THAO TÁC</TableCell>
                  <TableCell>IP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sampleLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell><Typography variant='caption' fontWeight={500}>{log.time}</Typography></TableCell>
                    <TableCell><Typography variant='body2' fontWeight={500}>{log.admin}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={log.action}
                        color={log.actionColor}
                        variant='tonal'
                      />
                    </TableCell>
                    <TableCell><Typography variant='body2'>{log.target}</Typography></TableCell>
                    <TableCell><Typography variant='body2'>{log.details}</Typography></TableCell>
                    <TableCell><Typography variant='caption' color='text.secondary'>{log.ip}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>
    </Grid>
  )
}
