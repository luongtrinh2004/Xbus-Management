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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import tableStyles from '@core/styles/table.module.css'
import { exportJsonToExcel } from '@/libs/excelHelper'

export default function AssetsPage() {
  const sampleAssets = [
    { code: 'DEV-MAC-01', name: 'MacBook Pro M2 16GB', category: 'Laptop', user: 'Trịnh Phúc Lương (HDK181)', status: 'in_use', serial: 'C02G1234MD6R', date: '01/09/2026' },
    { code: 'DEV-MNTR-02', name: 'Màn hình Dell Ultrasharp 27 inch', category: 'Màn hình', user: 'Trịnh Phúc Lương (HDK181)', status: 'in_use', serial: 'CN-098765-12345', date: '02/09/2026' },
    { code: 'DEV-PC-01', name: 'Workstation AP Testing', category: 'Máy tính bàn', user: 'Trần Văn B (XBS102)', status: 'in_use', serial: 'WS-AP-2026-003', date: '03/09/2026' },
    { code: 'DEV-MOUSE-01', name: 'Chuột Logitech MX Master 3S', category: 'Phụ kiện', user: '—', status: 'available', serial: 'LOGI-MX3S-889', date: '—' }
  ]

  const handleExportExcel = () => {
    const exportData = sampleAssets.map(a => ({
      'Mã tài sản': a.code,
      'Tên thiết bị': a.name,
      'Loại': a.category,
      'Người sử dụng': a.user,
      'Trạng thái': a.status === 'in_use' ? 'Đang sử dụng' : 'Trong kho',
      'Số Serial': a.serial,
      'Ngày bàn giao': a.date
    }))
    exportJsonToExcel(exportData, 'danh_sach_tai_san.xlsx')
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar variant='rounded' sx={{ bgcolor: 'rgba(255, 159, 67, 0.12)', color: 'warning.main' }}>
                  <i className='tabler-package text-2xl' />
                </Avatar>
                <Box>
                  <Typography variant='h5' fontWeight={600}>Quản Lý Tài Sản & Thiết Bị Cá Nhân</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Theo dõi việc cấp phát máy móc, màn hình và phụ kiện làm việc của từng nhân sự
                  </Typography>
                </Box>
              </Box>
            }
            action={
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant='tonal'
                  color='secondary'
                  startIcon={<i className='tabler-file-spreadsheet' />}
                  onClick={handleExportExcel}
                >
                  Xuất Excel
                </Button>
                <Button variant='contained' color='primary' startIcon={<i className='tabler-plus' />}>
                  Cấp phát mới
                </Button>
              </Box>
            }
          />
          <Divider />
          <TableContainer>
            <Table className={tableStyles.table}>
              <TableHead>
                <TableRow>
                  <TableCell>MÃ TÀI SẢN</TableCell>
                  <TableCell>TÊN THIẾT BỊ</TableCell>
                  <TableCell>PHÂN LOẠI</TableCell>
                  <TableCell>NGƯỜI ĐƯỢC CẤP</TableCell>
                  <TableCell align='center'>TRẠNG THÁI</TableCell>
                  <TableCell>SỐ SERIAL</TableCell>
                  <TableCell>NGÀY BÀN GIAO</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sampleAssets.map((asset) => (
                  <TableRow key={asset.code} hover>
                    <TableCell><Typography fontWeight={600} color='primary.main'>{asset.code}</Typography></TableCell>
                    <TableCell><Typography fontWeight={500}>{asset.name}</Typography></TableCell>
                    <TableCell><Chip size='small' label={asset.category} variant='tonal' /></TableCell>
                    <TableCell><Typography variant='body2'>{asset.user}</Typography></TableCell>
                    <TableCell align='center'>
                      <Chip
                        size='small'
                        label={asset.status === 'in_use' ? 'Đang sử dụng' : 'Trong kho'}
                        color={asset.status === 'in_use' ? 'success' : 'secondary'}
                        variant='tonal'
                      />
                    </TableCell>
                    <TableCell><Typography variant='caption'>{asset.serial}</Typography></TableCell>
                    <TableCell><Typography variant='caption'>{asset.date}</Typography></TableCell>
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
