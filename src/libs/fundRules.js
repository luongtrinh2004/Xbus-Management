export const fundCategories = {
  category_official: "Chính thức",
  category_probation: "Thử việc",
  category_intern: "Thực tập",
  category_collaborator: "Cộng tác viên",
};
export const defaultFundAmounts = {
  category_official: 150000,
  category_probation: 150000,
  category_intern: 100000,
  category_collaborator: 100000,
};
export const minimumOnlinePaymentAmount = 3000;
export const periodKey = (fund) =>
  `${fund.year}-${String(fund.month).padStart(2, "0")}`;
export const currentFundPeriod = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((p) => p.type === "year").value),
    month: Number(parts.find((p) => p.type === "month").value),
  };
};
export function amountForPeriod(settings, categoryId, fund) {
  const key = periodKey(fund);
  const rule = (settings.fundContributionRules || []).find(
    (r) =>
      r.categoryId === categoryId &&
      r.startPeriod <= key &&
      (!r.endPeriod || r.endPeriod >= key),
  );
  if (rule) return Number(rule.amount);
  if (settings.fundContributionWindow) {
    const window = settings.fundContributionWindow;
    if (key >= window.startPeriod && key <= window.endPeriod)
      return Number(
        window.amounts[categoryId] ?? defaultFundAmounts[categoryId],
      );
  }
  return Number(defaultFundAmounts[categoryId] ?? 100000);
}
export function snapshotFund(fund, users, settings) {
  if (periodKey(fund) > periodKey(currentFundPeriod())) {
    const before = JSON.stringify(fund);
    const records = new Map((fund.members || []).map((m) => [m.userId, m]));
    fund.contributionSnapshot = Object.fromEntries(
      Object.keys(fundCategories).map((id) => [
        id,
        amountForPeriod(settings, id, fund),
      ]),
    );
    fund.members = users
      .filter((u) => u.status === "able")
      .map((user) => {
        const previous = records.get(user.id) || { paid: false, amount: 0 };
        return {
          ...previous,
          userId: user.id,
          memberName: user.name,
          categoryId: user.categoryId,
          baseAmount: amountForPeriod(settings, user.categoryId, fund),
          requiredAmount: amountForPeriod(settings, user.categoryId, fund),
          voluntarySurplus: (
            settings.fundVoluntarySurplusUserIds || []
          ).includes(user.id),
        };
      });
    // Retain actual transactions for removed staff without displaying them in the live roster.
    for (const [id, member] of records)
      if (
        !fund.members.some((m) => m.userId === id) &&
        (member.paid || member.orderCode)
      )
        fund.members.push({ ...member, rosterHidden: true });
    for (const member of fund.members)
      if (users.some((u) => u.id === member.userId && u.status === "able"))
        member.rosterHidden = false;
    return JSON.stringify(fund) !== before;
  }
  const initialized = Boolean(fund.contributionSnapshot);
  const key = periodKey(fund);
  const currentKey = periodKey(currentFundPeriod());
  const window = settings.fundContributionWindow;
  const inWindow = Boolean(
    window && key >= window.startPeriod && key <= window.endPeriod,
  );

  if (initialized && key < currentKey && !inWindow) return false;

  let changed = !initialized;
  if (!fund.contributionSnapshot || inWindow || key === currentKey) {
    const newSnapshot = Object.fromEntries(
      Object.keys(fundCategories).map((id) => [
        id,
        amountForPeriod(settings, id, fund),
      ]),
    );
    if (
      JSON.stringify(fund.contributionSnapshot) !== JSON.stringify(newSnapshot)
    ) {
      fund.contributionSnapshot = newSnapshot;
      changed = true;
    }
  }

  const records = new Map((fund.members || []).map((m) => [m.userId, m]));
  for (const user of users) {
    if (user.status !== "able" && !records.has(user.id)) continue;
    const previous = records.get(user.id);
    const expectedBase = amountForPeriod(settings, user.categoryId, fund);
    const voluntary = (settings.fundVoluntarySurplusUserIds || []).includes(
      user.id,
    );

    if (!previous) {
      records.set(user.id, {
        userId: user.id,
        paid: false,
        amount: 0,
        memberName: user.name,
        categoryId: user.categoryId,
        baseAmount: expectedBase,
        voluntarySurplus: voluntary,
        requiredAmount: expectedBase,
      });
      changed = true;
    } else {
      let memberChanged = false;
      if (
        (inWindow || key === currentKey) &&
        !previous.obligationCancelled &&
        previous.baseAmount !== expectedBase
      ) {
        previous.baseAmount = expectedBase;
        memberChanged = true;
      }
      if (previous.voluntarySurplus !== voluntary && key === currentKey) {
        previous.voluntarySurplus = voluntary;
        memberChanged = true;
      }
      if (memberChanged) {
        changed = true;
      }
    }
  }
  fund.members = [...records.values()];
  return changed;
}
export function fundPaymentStatus(member) {
  if (member.obligationCancelled)
    return { key: "cancelled", label: "Hủy", color: "secondary", rank: 5 };
  if (
    Number(member.requiredAmount) === 0 &&
    (!member.paid || !Number(member.amount))
  )
    return { key: "paid", label: "Đã đóng", color: "success", rank: 2 };
  if (!member.paid || Number(member.amount) <= 0)
    return { key: "unpaid", label: "Chưa đóng", color: "secondary", rank: 4 };
  if (Number(member.amount) < Number(member.requiredAmount))
    return { key: "underpaid", label: "Đóng thiếu", color: "error", rank: 3 };
  if (Number(member.amount) > Number(member.requiredAmount))
    return { key: "overpaid", label: "Đóng thừa", color: "primary", rank: 1 };
  return { key: "paid", label: "Đã đóng", color: "success", rank: 2 };
}

// Chỉ khoản đóng thiếu được chuyển thành nghĩa vụ của kỳ sau. Đóng thừa là tự nguyện
// trong đúng kỳ đó và không làm giảm mức đóng của các kỳ kế tiếp.
export function applyFundBalances(funds) {
  const balances = new Map();
  for (const fund of [...funds].sort((a, b) =>
    periodKey(a).localeCompare(periodKey(b)),
  )) {
    for (const member of fund.members || []) {
      if (member.requiredAmount == null && member.baseAmount == null) continue;
      member.baseAmount ??= Number(member.requiredAmount);
      member.carryIn = balances.get(member.userId) || 0;
      const base =
        member.obligationCancelled || member.rosterHidden
          ? 0
          : Number(member.baseAmount);
      member.requiredAmount =
        member.obligationCancelled || member.rosterHidden
          ? 0
          : base + member.carryIn;
      const actual = member.paid ? Number(member.amount) || 0 : 0;
      const underpaid =
        member.paid && actual > 0 && actual < member.requiredAmount;
      member.difference = underpaid ? actual - member.requiredAmount : 0;
      member.carryOut = underpaid ? member.requiredAmount - actual : 0;
      balances.set(member.userId, member.carryOut);
    }
  }
  return funds;
}
