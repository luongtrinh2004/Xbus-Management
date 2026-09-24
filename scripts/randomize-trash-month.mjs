import {
  getTrashScheduleState,
  getUsers,
  getWaterExemptions,
  saveTrashScheduleState,
} from "../src/libs/dataRepository.js";
import {
  getEligibleTrashUsers,
  getTrashSchedulesForMonth,
} from "../src/libs/waterScheduler.js";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = ""] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const now = new Date();
const year = Number(args.year || now.getFullYear());
const month = Number(args.month || now.getMonth() + 1);

if (
  !Number.isInteger(year) ||
  !Number.isInteger(month) ||
  month < 1 ||
  month > 12
)
  throw new Error(
    "Dùng: npm run trash:randomize-month -- --year=2026 --month=9",
  );

const users = await getUsers();
const exemptUserIds = await getWaterExemptions();
const candidates = getEligibleTrashUsers(users, exemptUserIds);

if (!candidates.length)
  throw new Error("Không có nhân sự đủ điều kiện để random lịch đổ rác.");

const trashState = await getTrashScheduleState();
const overrides = { ...(trashState.trashScheduleOverrides || {}) };

for (const key of Object.keys(overrides))
  if (key.startsWith(`${year}-${String(month).padStart(2, "0")}-`))
    delete overrides[key];

const schedules = getTrashSchedulesForMonth(
  users,
  exemptUserIds,
  year,
  month,
  {},
  true,
  { randomize: true },
);
for (const item of schedules) overrides[item.dateKey] = item.userId;

await saveTrashScheduleState({
  ...trashState,
  trashScheduleOverrides: overrides,
});

console.log(
  `Đã random ${schedules.length} ngày đổ rác tháng ${String(month).padStart(2, "0")}/${year} cho ${candidates.length} nhân sự.`,
);
