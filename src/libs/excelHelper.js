import * as XLSX from 'xlsx'

/**
 * Xuất dữ liệu mảng JSON sang file Excel (.xlsx) trên trình duyệt
 * @param {Array<Object>} data Mảng các đối tượng dữ liệu
 * @param {string} fileName Tên file xuất ra (mặc định: 'export.xlsx')
 * @param {string} sheetName Tên sheet (mặc định: 'Sheet1')
 */
export function exportJsonToExcel(data, fileName = 'export.xlsx', sheetName = 'Sheet1') {
  if (!data || data.length === 0) {
    console.warn('[ExcelHelper] Không có dữ liệu để xuất Excel')
    return false
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
    XLSX.writeFile(workbook, finalFileName)
    return true
  } catch (error) {
    console.error('[ExcelHelper] Lỗi khi xuất file Excel:', error)
    return false
  }
}

/**
 * Tạo Buffer Excel ở phía Server/API route
 * @param {Array<Object>} data 
 * @param {string} sheetName 
 * @returns {Buffer}
 */
export function generateExcelBuffer(data, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}
