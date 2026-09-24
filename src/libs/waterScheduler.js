import { trashUserIds } from "./trashScheduleStorage.js";
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

export function getEligibleTrashUsers(users = []) {
  return users
    .filter(
      (user) =>
        ["user", "assistant", "admin"].includes(user.role) &&
        user.status === "able" &&
        !isOperationsUser(user),
    )
    .sort(
      (a, b) =>
        (a.schedulingPoints || 0) - (b.schedulingPoints || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""), "vi"),
    );
}

/** Lịch tuần dùng cùng thuật toán và phân công đã lưu của lịch tháng. */
export function getTrashSchedules(
  users = [],
  exemptUserIds = [],
  currentDateKey,
  weekOffset = 0,
  overrides = {},
) {
  const [year, month, day] = String(currentDateKey).split("-").map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day));
  const weekday = monday.getUTCDay();
  monday.setUTCDate(
    monday.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday) + weekOffset * 7,
  );
  const months = new Map();
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    const key = dateKey.slice(0, 7);
    if (!months.has(key)) {
      months.set(
        key,
        getTrashSchedulesForMonth(
          users,
          exemptUserIds,
          date.getUTCFullYear(),
          date.getUTCMonth() + 1,
          overrides,
        ),
      );
    }
    return {
      ...months.get(key).find((item) => item.dateKey === dateKey),
      weekIndex: 0,
    };
  });
}

/**
 * Xếp lịch theo điểm dự kiến thấp nhất, rồi ưu tiên người được miễn bê nước.
 * Random chỉ trong nhóm đồng hạng khi tạo lịch; lượt đọc dùng thứ tự ổn định.
 * Mỗi lượt chưa hoàn thành tăng 1 điểm dự kiến, không thay đổi điểm thực tế.
 */
export function getTrashSchedulesForMonth(
  users = [],
  exemptUserIds = [],
  year,
  month,
  overrides = {},
  autoAssign = true,
  { randomize = false, startDateKey = "", completions = {} } = {},
) {
  const participants = getEligibleTrashUsers(users, exemptUserIds);
  const usersById = new Map(users.map((person) => [person.id, person]));
  const schedules = [];
  const anchor = Date.UTC(2026, 0, 5);
  const dayMs = 86400000;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const projectedPoints = new Map(
    participants.map((person) => [
      person.id,
      Number(person.schedulingPoints || 0),
    ]),
  );
  const exemptIds = new Set(exemptUserIds);
  const lastAssignedIndex = new Map();
  let workingIndexInMonth = 0;

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
    const rotationStart =
      ((workingIndex % participants.length) + participants.length) %
      participants.length;
    const rotationRank = (person) =>
      (participants.indexOf(person) - rotationStart + participants.length) %
      participants.length;
    const defaultPerson =
      autoAssign && participants.length && dateKey >= startDateKey
        ? (randomize ? shuffleArray(participants) : [...participants]).sort(
            (a, b) =>
              (projectedPoints.get(a.id) || 0) -
                (projectedPoints.get(b.id) || 0) ||
              Number(exemptIds.has(b.id)) - Number(exemptIds.has(a.id)) ||
              (randomize
                ? 0
                : (lastAssignedIndex.get(a.id) ?? Number.NEGATIVE_INFINITY) -
                    (lastAssignedIndex.get(b.id) ?? Number.NEGATIVE_INFINITY) ||
                  rotationRank(a) - rotationRank(b) ||
                  String(a.name || "").localeCompare(
                    String(b.name || ""),
                    "vi",
                  )),
          )[0]
        : null;
    const assignedIds = hasOverride
      ? trashUserIds(overrides[dateKey])
      : defaultPerson
        ? [defaultPerson.id]
        : [];
    const assignedPeople = assignedIds.map(
      (id) => usersById.get(id) || { id, name: "Nhân sự đã nghỉ" },
    );
    const person = assignedPeople[0];
    for (const assigned of assignedPeople) {
      if (
        dateKey >= startDateKey &&
        projectedPoints.has(assigned.id) &&
        !completions[dateKey]
      ) {
        projectedPoints.set(
          assigned.id,
          (projectedPoints.get(assigned.id) || 0) + 1,
        );
        lastAssignedIndex.set(assigned.id, workingIndexInMonth);
      }
    }
    schedules.push({
      id: `trash_${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
      date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
      dateKey,
      weekday,
      userId: person?.id || "",
      userIds: assignedIds,
      participants: assignedPeople.map((user) => ({
        userId: user.id,
        name: user.name,
        code: user.code,
        avatarUrl: user.avatarUrl,
      })),
      name: assignedPeople.map((user) => user.name).join(", "),
      code: person?.code || "",
      avatarUrl: person?.avatarUrl || "",
      role: person?.role || "",
      gender: person?.gender || "",
    });
    workingIndexInMonth += 1;
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
