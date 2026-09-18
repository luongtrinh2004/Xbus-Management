import {
  getSettings,
  getUsers,
  getWaterExemptions,
  saveSettings,
} from "../src/libs/dataRepository.js";
import { getEligibleTrashUsers } from "../src/libs/waterScheduler.js";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = ""] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const now = new Date();
const year = Number(args.year || now.getFullYear());
const month = Number(args.month || now.getMonth() + 1);

if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12)
  throw new Error("Dùng: npm run trash:randomize-month -- --year=2026 --month=9");

const shuffle = (items) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const dateKeyOf = (day) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const users = await getUsers();
const exemptUserIds = await getWaterExemptions();
const candidates = getEligibleTrashUsers(users, exemptUserIds);

if (!candidates.length)
  throw new Error("Không có nhân sự đủ điều kiện để random lịch đổ rác.");

const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
const workingDateKeys = [];
for (let day = 1; day <= daysInMonth; day += 1) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  if (weekday !== 0 && weekday !== 6) workingDateKeys.push(dateKeyOf(day));
}

const groupedByPoints = candidates.reduce((map, user) => {
  const points = Number(user.schedulingPoints) || 0;
  map.set(points, [...(map.get(points) || []), user]);
  return map;
}, new Map());
const randomizedPool = [...groupedByPoints.entries()]
  .sort(([left], [right]) => left - right)
  .flatMap(([, group]) => shuffle(group));

const settings = await getSettings();
const overrides = { ...(settings.trashScheduleOverrides || {}) };

for (const key of Object.keys(overrides))
  if (key.startsWith(`${year}-${String(month).padStart(2, "0")}-`))
    delete overrides[key];

workingDateKeys.forEach((dateKey, index) => {
  overrides[dateKey] = randomizedPool[index % randomizedPool.length].id;
});

await saveSettings({
  ...settings,
  trashScheduleOverrides: overrides,
});

console.log(
  `Đã random ${workingDateKeys.length} ngày đổ rác tháng ${String(month).padStart(2, "0")}/${year} cho ${randomizedPool.length} nhân sự.`,
);
