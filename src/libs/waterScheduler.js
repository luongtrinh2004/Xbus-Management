/**
 * Thư viện hỗ trợ tính toán lịch tuần và thuật toán phân công bê nước công bằng
 * Tuân thủ theo Phần 2: Quản lý lịch bê nước và đổ rác (Flow tài liệu Xbus)
 */

/**
 * Thuật toán Fisher-Yates shuffle để tráo ngẫu nhiên mảng đảm bảo phân phối đều
 */
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Nhóm Vận Hành không tham gia trực bê nước/đổ rác.
const isOperationsUser = (user) =>
  ["type_operations", "van_hanh", "vận_hành"].includes(
    String(user.typeId || "")
      .trim()
      .toLowerCase(),
  );

const toLocalDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Lấy danh sách nhân sự đủ điều kiện bê nước
 * Admin và Trợ lý được xem như nhân sự thường. Chỉ danh sách miễn mới loại
 * một người khỏi việc phân công.
 */
export function getEligibleWaterUsers(users = []) {
  return users.filter(
    (user) =>
      ["user", "assistant", "admin"].includes(user.role) &&
      user.status === "able" &&
      !isOperationsUser(user),
  );
}

/** Lịch đổ rác cho 5 ngày làm việc của tuần hiện tại và tuần kế tiếp. */
export function getTrashSchedules(
  users = [],
  exemptUserIds = [],
  currentDateKey,
  weekOffset = 0,
  overrides = {},
  waterSchedules = [],
) {
  const exemptSet = new Set(exemptUserIds);
  const participants = users
    .filter(
      (user) =>
        exemptSet.has(user.id) &&
        user.status === "able" &&
        !isOperationsUser(user),
    )
    .sort((a, b) => (a.schedulingPoints || 0) - (b.schedulingPoints || 0));
  if (!participants.length) return [];

  const [currentYear, currentMonth, currentDay] = String(currentDateKey)
    .split("-")
    .map(Number);
  const today = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay));
  const weekday = today.getUTCDay();
  const daysToMonday = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + daysToMonday + weekOffset * 7);

  const dayMs = 24 * 60 * 60 * 1000;
  const rotationAnchor = Date.UTC(2026, 0, 5);
  const schedules = [];
  const usersById = new Map(participants.map((person) => [person.id, person]));
  for (let weekIndex = 0; weekIndex < 1; weekIndex += 1) {
    for (let workday = 0; workday < 5; workday += 1) {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + weekIndex * 7 + workday);
      const workingDaysFromAnchor =
        Math.floor((date.getTime() - rotationAnchor) / (dayMs * 7)) * 5 +
        workday;
      const recentWaterUserIds = new Set(
        waterSchedules
          .filter((schedule) => {
            const [d, m, y] = String(schedule.date || "")
              .split("/")
              .map(Number);
            const scheduledAt = Date.UTC(y, m - 1, d);
            return (
              Number.isFinite(scheduledAt) &&
              Math.abs(scheduledAt - date.getTime()) <= 21 * dayMs
            );
          })
          .flatMap((schedule) =>
            (schedule.participants || []).map(
              (person) => person.userId || person,
            ),
          ),
      );
      const prioritized = [...participants].sort(
        (a, b) =>
          Number(recentWaterUserIds.has(a.id)) -
            Number(recentWaterUserIds.has(b.id)) ||
          (a.schedulingPoints || 0) - (b.schedulingPoints || 0),
      );
      const defaultPerson =
        prioritized[
          ((workingDaysFromAnchor % prioritized.length) + prioritized.length) %
            prioritized.length
        ];
      const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      const hasOverride = Object.prototype.hasOwnProperty.call(
        overrides,
        dateKey,
      );
      const person = hasOverride
        ? usersById.get(overrides[dateKey]) || null
        : defaultPerson;
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      schedules.push({
        id: `trash_${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
        date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
        dateKey,
        weekday: workday + 1,
        weekIndex,
        userId: person?.id || "",
        name: person?.name || "",
        code: person?.code || "",
        avatarUrl: person?.avatarUrl || "",
        role: person?.role || "",
        gender: person?.gender || "",
      });
    }
  }
  return schedules;
}

/** Tạo lịch đổ rác cho toàn bộ ngày làm việc trong một tháng. */
export function getTrashSchedulesForMonth(
  users = [],
  exemptUserIds = [],
  year,
  month,
  overrides = {},
  autoAssign = true,
) {
  const exemptSet = new Set(exemptUserIds);
  const participants = users
    .filter(
      (user) =>
        exemptSet.has(user.id) &&
        user.status === "able" &&
        !isOperationsUser(user),
    )
    .sort(
      (a, b) =>
        (a.schedulingPoints || 0) - (b.schedulingPoints || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""), "vi"),
    );
  const usersById = new Map(users.map((person) => [person.id, person]));
  const schedules = [];
  const anchor = Date.UTC(2026, 0, 5);
  const dayMs = 86400000;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasOverride = Object.prototype.hasOwnProperty.call(
      overrides,
      dateKey,
    );
    const elapsedDays = Math.floor((date.getTime() - anchor) / dayMs);
    const workingIndex =
      Math.floor(elapsedDays / 7) * 5 + Math.max(0, weekday - 1);
    const defaultPerson =
      autoAssign && participants.length
        ? participants[
            ((workingIndex % participants.length) + participants.length) %
              participants.length
          ]
        : null;
    const person = hasOverride
      ? usersById.get(overrides[dateKey]) || null
      : defaultPerson;
    schedules.push({
      id: `trash_${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
      date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
      dateKey,
      weekday,
      userId: person?.id || "",
      name: person?.name || "",
      code: person?.code || "",
      avatarUrl: person?.avatarUrl || "",
      role: person?.role || "",
      gender: person?.gender || "",
    });
  }
  return schedules;
}

/**
 * Tính toán danh sách các tuần trong một tháng nhất định
 * Tuần bắt đầu từ Thứ Hai và kết thúc vào Chủ Nhật (Mục 2.4)
 * Chỉ cho phép chọn các ngày thuộc tháng đang xét
 */
export function getWeeksOfMonth(year, month) {
  const weeks = [];
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);

  // Xác định Thứ Hai đầu tiên của tuần chứa ngày mùng 1
  let current = new Date(firstDayOfMonth);
  const dayOfWeek = current.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  current.setDate(current.getDate() + diffToMonday);

  let weekIndex = 1;

  while (
    current <= lastDayOfMonth ||
    (weekIndex === 1 && current > firstDayOfMonth)
  ) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Xác định các ngày khả dụng trong tuần này thuộc tháng đang xét
    const validDaysInMonth = [];
    const dayIter = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      if (dayIter.getMonth() === month - 1) {
        const yyyy = dayIter.getFullYear();
        const mm = String(dayIter.getMonth() + 1).padStart(2, "0");
        const dd = String(dayIter.getDate()).padStart(2, "0");
        validDaysInMonth.push(`${dd}/${mm}/${yyyy}`);
      }
      dayIter.setDate(dayIter.getDate() + 1);
    }

    if (validDaysInMonth.length > 0) {
      const formatDM = (d) =>
        `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      // Chọn mặc định ngày ở giữa tuần (Thứ Tư hoặc Thứ Sáu) có trong tháng
      const defaultDate =
        validDaysInMonth[Math.min(2, validDaysInMonth.length - 1)];

      weeks.push({
        weekIndex,
        range: `${formatDM(weekStart)} - ${formatDM(weekEnd)}`,
        weekStart: toLocalDateKey(weekStart),
        weekEnd: toLocalDateKey(weekEnd),
        validDays: validDaysInMonth,
        defaultDate,
      });
      weekIndex++;
    }

    current.setDate(current.getDate() + 7);
    if (current > lastDayOfMonth && validDaysInMonth.length === 0) break;
  }

  return weeks;
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
  excludeUserIds = [],
}) {
  const candidates = eligibleUsers.filter(
    (u) => !excludeUserIds.includes(u.id),
  );
  if (candidates.length === 0) return [];

  // Gom các ứng viên theo đúng Điểm rèn luyện hiện tại
  const scoreGroups = {};
  candidates.forEach((u) => {
    const pts = u.schedulingPoints || 0;
    if (!scoreGroups[pts]) scoreGroups[pts] = [];
    scoreGroups[pts].push(u);
  });

  // Sắp xếp các mức điểm từ thấp đến cao (Mức thấp nhất -> Thấp thứ 2 -> Thấp thứ 3...)
  const sortedScores = Object.keys(scoreGroups)
    .map(Number)
    .sort((a, b) => a - b);

  const selected = [];
  const countNeeded = Math.min(requiredPeople, candidates.length);

  for (const score of sortedScores) {
    if (selected.length >= countNeeded) break;

    const group = scoreGroups[score];
    const slotsRemaining = countNeeded - selected.length;

    if (group.length <= slotsRemaining) {
      // Nhóm điểm này vừa hoặc ít hơn số người còn thiếu -> Lấy toàn bộ
      selected.push(...group);
    } else {
      // Nhóm điểm này nhiều hơn số người còn thiếu -> Tráo ngẫu nhiên và lấy đủ số người cần
      const shuffled = shuffleArray(group);
      selected.push(...shuffled.slice(0, slotsRemaining));
    }
  }

  return selected.map((u) => ({
    userId: u.id,
    name: u.name,
    code: u.code,
    completed: false,
  }));
}
