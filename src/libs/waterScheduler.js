/**
 * Thư viện hỗ trợ tính toán lịch tuần và thuật toán phân công bê nước công bằng
 * Tuân thủ theo Phần 2: Quản lý lịch bê nước (Flow tài liệu Xbus)
 */

/**
 * Thuật toán Fisher-Yates shuffle để tráo ngẫu nhiên mảng đảm bảo phân phối đều
 */
function shuffleArray(arr) {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Lấy danh sách nhân sự đủ điều kiện bê nước
 * Điều kiện mục 2.3: role = 'user', gender = 'male', status = 'able'
 */
export function getEligibleWaterUsers(users = []) {
  return users.filter(u =>
    u.role === 'user' &&
    u.status === 'able'
  )
}

/**
 * Tính toán danh sách các tuần trong một tháng nhất định
 * Tuần bắt đầu từ Thứ Hai và kết thúc vào Chủ Nhật (Mục 2.4)
 * Chỉ cho phép chọn các ngày thuộc tháng đang xét
 */
export function getWeeksOfMonth(year, month) {
  const weeks = []
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const lastDayOfMonth = new Date(year, month, 0)

  // Xác định Thứ Hai đầu tiên của tuần chứa ngày mùng 1
  let current = new Date(firstDayOfMonth)
  const dayOfWeek = current.getDay()
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek
  current.setDate(current.getDate() + diffToMonday)

  let weekIndex = 1

  while (current <= lastDayOfMonth || (weekIndex === 1 && current > firstDayOfMonth)) {
    const weekStart = new Date(current)
    const weekEnd = new Date(current)
    weekEnd.setDate(weekEnd.getDate() + 6)

    // Xác định các ngày khả dụng trong tuần này thuộc tháng đang xét
    const validDaysInMonth = []
    const dayIter = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      if (dayIter.getMonth() === month - 1) {
        const yyyy = dayIter.getFullYear()
        const mm = String(dayIter.getMonth() + 1).padStart(2, '0')
        const dd = String(dayIter.getDate()).padStart(2, '0')
        validDaysInMonth.push(`${dd}/${mm}/${yyyy}`)
      }
      dayIter.setDate(dayIter.getDate() + 1)
    }

    if (validDaysInMonth.length > 0) {
      const formatDM = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      // Chọn mặc định ngày ở giữa tuần (Thứ Tư hoặc Thứ Sáu) có trong tháng
      const defaultDate = validDaysInMonth[Math.min(2, validDaysInMonth.length - 1)]

      weeks.push({
        weekIndex,
        range: `${formatDM(weekStart)} - ${formatDM(weekEnd)}`,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        validDays: validDaysInMonth,
        defaultDate
      })
      weekIndex++
    }

    current.setDate(current.getDate() + 7)
    if (current > lastDayOfMonth && validDaysInMonth.length === 0) break
  }

  return weeks
}

/**
 * Thuật toán random phân công tự động theo tổ hợp điểm rèn luyện thấp nhất:
 * 
 * 1. Lọc nhân sự nam đủ điều kiện (loại trừ excludeUserIds nếu có).
 * 2. Gom nhóm theo Điểm rèn luyện (schedulingPoints) hiện tại.
 * 3. Lấy tổ hợp những người có điểm rèn luyện thấp nhất:
 *    - Nếu nhóm thấp nhất có số người <= số người cần chọn: Lấy toàn bộ nhóm này.
 *    - Nếu nhóm thấp nhất có số người > số người cần chọn: Random ngẫu nhiên lấy đúng số người cần.
 *    - Nếu thiếu vài người: Lấy toàn bộ nhóm thấp nhất, số người còn thiếu được RANDOM TRONG NHÓM CÓ ĐIỂM THẤP THỨ 2 (và thứ 3 nếu vẫn thiếu).
 * 
 * @param {Array} eligibleUsers Danh sách nhân sự đủ điều kiện
 * @param {number} requiredPeople Số người cần cho tuần này (mặc định 5)
 * @param {Array} excludeUserIds Các userId bị loại trừ khỏi tuần này
 */
export function selectFairParticipants({
  eligibleUsers = [],
  requiredPeople = 5,
  excludeUserIds = []
}) {
  const candidates = eligibleUsers.filter(u => !excludeUserIds.includes(u.id))
  if (candidates.length === 0) return []

  // Gom các ứng viên theo đúng Điểm rèn luyện hiện tại
  const scoreGroups = {}
  candidates.forEach(u => {
    const pts = u.schedulingPoints || 0
    if (!scoreGroups[pts]) scoreGroups[pts] = []
    scoreGroups[pts].push(u)
  })

  // Sắp xếp các mức điểm từ thấp đến cao (Mức thấp nhất -> Thấp thứ 2 -> Thấp thứ 3...)
  const sortedScores = Object.keys(scoreGroups).map(Number).sort((a, b) => a - b)

  const selected = []
  const countNeeded = Math.min(requiredPeople, candidates.length)

  for (const score of sortedScores) {
    if (selected.length >= countNeeded) break

    const group = scoreGroups[score]
    const slotsRemaining = countNeeded - selected.length

    if (group.length <= slotsRemaining) {
      // Nhóm điểm này vừa hoặc ít hơn số người còn thiếu -> Lấy toàn bộ
      selected.push(...group)
    } else {
      // Nhóm điểm này nhiều hơn số người còn thiếu -> Tráo ngẫu nhiên và lấy đủ số người cần
      const shuffled = shuffleArray(group)
      selected.push(...shuffled.slice(0, slotsRemaining))
    }
  }

  return selected.map(u => ({
    userId: u.id,
    name: u.name,
    code: u.code,
    completed: false
  }))
}
