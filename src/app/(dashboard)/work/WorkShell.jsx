'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const links = [
  { href: '/work/projects', label: 'Dự án', icon: 'tabler-layout-grid' },
  { href: '/work/templates', label: 'Mẫu dự án', icon: 'tabler-layout-grid' },
  { href: '/work/my-tasks', label: 'Công việc của tôi', icon: 'tabler-checkbox' }
]

export default function WorkShell({ children }) {
  const pathname = usePathname()
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
      <Box>
        <Typography variant='h4' fontWeight={700}>Quản lý công việc</Typography>
        <Typography color='text.secondary'>Theo dõi dự án, nhiệm vụ và tiến độ của đội ngũ</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, p: .5, bgcolor: 'action.hover', borderRadius: 2 }}>
        {links.map(link => <Button key={link.href} component={Link} href={link.href} variant={pathname.startsWith(link.href) ? 'contained' : 'text'} color='primary' startIcon={<i className={link.icon} />}>{link.label}</Button>)}
      </Box>
    </Box>
    {children}
  </Box>
}
