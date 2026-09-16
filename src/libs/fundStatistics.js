export function aggregateFundContributions(funds, users, from, to) {
  const rows = new Map(
    users
      .filter((u) => u.status === "able")
      .map((u) => [u.id, { id: u.id, name: u.name, amount: 0 }]),
  );
  for (const fund of funds) {
    const key = `${fund.year}-${String(fund.month).padStart(2, "0")}`;
    if (key < from || key > to) continue;
    for (const member of fund.members || []) {
      const user = users.find((u) => u.id === member.userId);
      const row = rows.get(member.userId) || {
        id: member.userId,
        name: user?.name || member.memberName || "Nhân sự đã nghỉ",
        amount: 0,
      };
      if (member.paid) row.amount += Number(member.amount) || 0;
      rows.set(member.userId, row);
    }
  }
  return [...rows.values()].sort(
    (a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "vi"),
  );
}
