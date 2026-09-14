// MUI Imports
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
    <div className='flex justify-between items-center flex-wrap pli-6 bs-auto plb-[10.5px] gap-2'>
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
      />
    </div>
  )
}

export default TablePaginationComponent
