// MUI Imports
import Box from '@mui/material/Box'
import Pagination from '@mui/material/Pagination'
import Typography from '@mui/material/Typography'

const TablePaginationComponent = ({ table, total = 0, page = 1, limit = 10, onPageChange }) => {
  const safeTotal = Number(total) || 0
  const safeLimit = Number(limit) || 10
  const safePage = Number(page) || 1
  const pageIndex = safePage - 1
  const from = safeTotal === 0 ? 0 : pageIndex * safeLimit + 1
  const to = Math.min((pageIndex + 1) * safeLimit, safeTotal)
  const pageCount = Math.ceil(safeTotal / safeLimit) || 1

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: { xs: 'column', sm: 'row' },
        px: { xs: 2, sm: 6 },
        py: 2.5,
        gap: 2
      }}
    >
      <Typography variant='body2' color='text.disabled'>{`Hiển thị ${from} đến ${to} trong ${safeTotal} mục`}</Typography>
      <Pagination
        shape='rounded'
        color='primary'
        variant='tonal'
        count={pageCount}
        page={safePage}
        onChange={(_, newPage) => {
          onPageChange(null, newPage - 1) // MUI gọi với pageIndex zero-based
        }}
        showFirstButton
        showLastButton
        siblingCount={0}
        sx={{
          maxWidth: '100%',
          '& .MuiPagination-ul': { flexWrap: 'nowrap', justifyContent: 'center' },
          '& .MuiPaginationItem-firstLast': { display: { xs: 'none', sm: 'inline-flex' } }
        }}
      />
    </Box>
  )
}

export default TablePaginationComponent
