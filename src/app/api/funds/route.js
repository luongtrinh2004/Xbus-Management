import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getFunds,
  saveFunds,
  saveFundSnapshots,
  getUsers,
  getSettings,
  saveUsers,
  appendAuditLog,
} from "@/libs/dataRepository";
import {
  currentFundPeriod,
  periodKey,
  snapshotFund,
  fundPaymentStatus,
  summarizeFundCash,
} from "@/libs/fundRules";

const secret = process.env.NEXTAUTH_SECRET;
const fundLabels = {
  explanation_penalty: "Phạt giải trình công",
  shirt_penalty: "Phạt áo",
  happy_hour: "Happy Hour",
  food_drink: "Ăn uống",
  office: "Văn phòng",
  event: "Sự kiện",
  support: "Hỗ trợ thành viên",
  other: "Khác",
};
// Ngày nhập trong form là ngày nghiệp vụ Việt Nam, không phải ngày UTC.
const businessDateToIso = (date, fallback) =>
  date ? new Date(`${date}T12:00:00+07:00`).toISOString() : fallback;
const reminderDefaults = (period, settings) => {
  const reminder = settings.fundReminderSettings;
  if (!reminder) return {};
  const lastDay = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
  const day = Math.min(Number(reminder.deadlineDay || 10), lastDay);
  return {
    paymentDeadline: `${period.year}-${String(period.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    reminderDaysBefore: reminder.daysBefore || [],
    emailReminderEnabled: Boolean(reminder.enabled),
  };
};

const buildFundResponse = (fund, allFunds) => {
  const summary = summarizeFundCash(allFunds, periodKey(fund));

  return {
    ...fund,
    members: (fund.members || []).filter((m) => !m.rosterHidden),
    isFuture: periodKey(fund) > periodKey(currentFundPeriod()),
    incomes: fund.incomes || [],
    expenses: fund.expenses || [],
    ...summary,
    paidCount: (fund.members || []).filter((member) =>
      ["paid", "overpaid"].includes(fundPaymentStatus(member).key),
    ).length,
    totalMembers: (fund.members || []).length,
    availablePeriods: allFunds
      .map((item) => ({ month: item.month, year: item.year }))
      .sort((a, b) => b.year - a.year || b.month - a.month),
  };
};

const buildAllFundsResponse = (funds, users = []) => {
  const names = new Map(users.map((user) => [user.id, user.name]));
  const incomes = funds.flatMap((fund) => [
    ...(fund.incomes || []).map((income) => ({
      ...income,
      month: fund.month,
      year: fund.year,
      userName: income.userName || names.get(income.userId) || "",
    })),
    ...(fund.members || [])
      .filter((member) => member.paid)
      .map((member) => ({
        id: `monthly-fund-${fund.id}-${member.userId}`,
        title: "Quỹ tháng này",
        category: "monthly_fund",
        amount: member.amount || 0,
        note: "",
        userId: member.userId,
        userName:
          member.memberName ||
          member.userName ||
          names.get(member.userId) ||
          "Nhân sự đã nghỉ",
        month: fund.month,
        year: fund.year,
        receivedAt: member.paidAt,
        createdAt: member.updatedAt,
        locked: true,
      })),
  ]);
  const expenses = funds.flatMap((fund) => fund.expenses || []);

  return {
    id: "all",
    month: null,
    year: null,
    isAllPeriods: true,
    members: [],
    incomes,
    expenses,
    ...summarizeFundCash(funds),
    // Member payments are already included as income rows in all-period mode.
    memberIncome: 0,
    paidCount: 0,
    totalMembers: 0,
    availablePeriods: funds
      .map((item) => ({ month: item.month, year: item.year }))
      .sort((a, b) => b.year - a.year || b.month - a.month),
  };
};

export async function GET(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id)
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get("month") || null;
    const year = searchParams.get("year") || null;
    const allPeriods = searchParams.get("all") === "1";

    const allFunds = await getFunds();
    const current = currentFundPeriod();
    const users = await getUsers();
    const settings = await getSettings();
    const selected =
      month && year ? { month: Number(month), year: Number(year) } : current;
    if (
      !allPeriods &&
      (!Number.isInteger(selected.month) ||
        selected.month < 1 ||
        selected.month > 12 ||
        !Number.isInteger(selected.year) ||
        selected.year < 2000 ||
        selected.year > 2100)
    )
      return NextResponse.json({ error: "Kỳ không hợp lệ" }, { status: 400 });
    let changed = false;
    const startYear = 2025;
    const endYear = Math.max(current.year, selected.year, 2026);
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 1; m <= 12; m++) {
        if (!allFunds.some((f) => f.month === m && f.year === y)) {
          const p = { month: m, year: y };
          allFunds.push({
            id: `fund_${y}_${m}`,
            month: m,
            year: y,
            ...reminderDefaults(p, settings),
            openingBalance: 0,
            members: [],
            incomes: [],
            expenses: [],
          });
          changed = true;
        }
      }
    }
    for (const item of allFunds)
      changed = snapshotFund(item, users, settings) || changed;
    if (changed) await saveFundSnapshots(allFunds);

    if (allPeriods)
      return NextResponse.json(buildAllFundsResponse(allFunds, users));

    // Lấy quỹ hiện tại (mới nhất hoặc theo tháng/năm)
    let fund = null;
    if (month && year) {
      fund = allFunds.find(
        (f) => f.month === parseInt(month) && f.year === parseInt(year),
      );
    } else {
      // Lấy quỹ mới nhất
      fund = allFunds.find(
        (f) => f.month === current.month && f.year === current.year,
      );
    }

    if (!fund) {
      return NextResponse.json({
        balance: 0,
        totalIncome: 0,
        totalExpense: 0,
        paidCount: 0,
        members: [],
        incomes: [],
        expenses: [],
        availablePeriods: [],
      });
    }

    return NextResponse.json(buildFundResponse(fund, allFunds));
  } catch (error) {
    console.error("[API Funds] GET:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!["admin", "assistant"].includes(token?.role)) {
      return NextResponse.json(
        { error: "Bạn không có quyền cập nhật quỹ phòng" },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Dữ liệu import không hợp lệ hoặc request không có nội dung" },
        { status: 400 },
      );
    }
    let month = Number(body.month);
    let year = Number(body.year);
    if (body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      const [dYear, dMonth] = body.date.split("-").map(Number);
      if (dMonth >= 1 && dMonth <= 12 && dYear >= 2000 && dYear <= 2100) {
        month = dMonth;
        year = dYear;
      }
    }
    if (
      !["income", "expense"].includes(body.kind) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !month ||
      !year
    ) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ nội dung và số tiền hợp lệ" },
        { status: 400 },
      );
    }

    const funds = await getFunds();
    let fundIndex = funds.findIndex(
      (item) => item.month === month && item.year === year,
    );
    if (fundIndex === -1) {
      const settings = await getSettings();
      funds.push({
        id: `fund_${year}_${month}`,
        month,
        year,
        ...reminderDefaults({ month, year }, settings),
        openingBalance: 0,
        members: [],
        incomes: [],
        expenses: [],
      });
      fundIndex = funds.length - 1;
    }

    const isPenalty =
      body.kind === "income" &&
      ["explanation_penalty", "shirt_penalty"].includes(body.category);
    const needsPerson =
      body.kind === "income" && body.category !== "happy_hour";
    const users = await getUsers();
    const relatedUser = needsPerson
      ? users.find((user) => user.id === body.userId)
      : null;
    if (needsPerson && !relatedUser) {
      return NextResponse.json(
        { error: "Vui lòng chọn nhân sự nộp tiền" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const transaction = {
      id: `${body.kind === "income" ? "inc" : "exp"}_${Date.now()}`,
      title: fundLabels[body.category] || "Giao dịch quỹ",
      category: body.category || "other",
      amount,
      note: body.note?.trim() || "",
      userId: relatedUser?.id || "",
      userName: relatedUser?.name || "",
      [body.kind === "income" ? "receivedAt" : "spentAt"]: businessDateToIso(
        body.date,
        now,
      ),
      createdBy: token.id,
      createdByName: token.name || token.email,
      createdAt: now,
    };

    if (body.kind === "income") {
      funds[fundIndex].incomes = [
        transaction,
        ...(funds[fundIndex].incomes || []),
      ];
      if (isPenalty) {
        const userIndex = users.findIndex((user) => user.id === relatedUser.id);
        users[userIndex] = {
          ...users[userIndex],
          schedulingPoints: (users[userIndex].schedulingPoints || 0) - 1,
          updatedAt: now,
        };
        await saveUsers(users);
      }
    } else {
      funds[fundIndex].expenses = [
        transaction,
        ...(funds[fundIndex].expenses || []),
      ];
    }
    funds[fundIndex].updatedAt = now;
    await saveFunds(funds);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || token.email,
      adminEmail: token.email,
      action:
        body.kind === "income" ? "CREATE_FUND_INCOME" : "CREATE_FUND_EXPENSE",
      targetType: "FUND",
      targetId: funds[fundIndex].id,
      details: `${body.kind === "income" ? "Ghi nhận khoản thu" : "Ghi nhận khoản chi"} ${transaction.title}: ${amount.toLocaleString("vi-VN")} đồng`,
    });

    return NextResponse.json(buildFundResponse(funds[fundIndex], funds), {
      status: 201,
    });
  } catch (error) {
    console.error("[API Funds] POST:", error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Không thể lưu khoản import: ${error.message}`
            : "Lỗi hệ thống",
      },
      { status: 500 },
    );
  }
}

async function changeTransaction(req, removing) {
  try {
    const token = await getToken({ req, secret });
    if (!["admin", "assistant"].includes(token?.role))
      return NextResponse.json(
        { error: "Bạn không có quyền cập nhật quỹ phòng" },
        { status: 403 },
      );
    const body = await req.json();
    const funds = await getFunds();
    const fundIndex = funds.findIndex(
      (item) =>
        item.month === Number(body.month) && item.year === Number(body.year),
    );
    if (fundIndex < 0)
      return NextResponse.json(
        { error: "Không tìm thấy kỳ quỹ đã chọn" },
        { status: 404 },
      );
    if (body.kind === "member") {
      const user = (await getUsers()).find((item) => item.id === body.userId);
      if (!user)
        return NextResponse.json(
          { error: "Không tìm thấy nhân sự" },
          { status: 404 },
        );
      const now = new Date().toISOString();
      snapshotFund(funds[fundIndex], await getUsers(), await getSettings());
      const currentMember = funds[fundIndex].members.find(
        (m) => m.userId === user.id,
      );
      if (body.obligationCancelled !== undefined) {
        const cancelled = body.obligationCancelled === true;
        const reason = String(body.cancellationReason || "").trim();
        if (cancelled && !reason)
          return NextResponse.json(
            { error: "Vui lòng nhập lý do hủy nghĩa vụ đóng quỹ" },
            { status: 400 },
          );
        if (!currentMember)
          return NextResponse.json(
            { error: "Nhân sự không thuộc kỳ quỹ này" },
            { status: 400 },
          );
        Object.assign(currentMember, {
          obligationCancelled: cancelled,
          cancellationReason: cancelled ? reason : "",
          cancelledAt: cancelled ? now : null,
          cancelledBy: cancelled ? token.id : null,
        });
        await saveFunds(funds);
        await appendAuditLog({
          adminId: token.id,
          adminName: token.name,
          adminEmail: token.email,
          action: cancelled
            ? "CANCEL_FUND_OBLIGATION"
            : "RESTORE_FUND_OBLIGATION",
          targetType: "FUND",
          targetId: funds[fundIndex].id,
          details: `${cancelled ? "Hủy" : "Khôi phục"} nghĩa vụ đóng quỹ của ${user.name} tháng ${body.month}/${body.year}${cancelled ? `: ${reason}` : ""}. Các khoản tiền đã thu được giữ nguyên.`,
        });
        return NextResponse.json(buildFundResponse(funds[fundIndex], funds));
      }
      if (currentMember?.obligationCancelled)
        return NextResponse.json(
          { error: "Nghĩa vụ đóng quỹ đã hủy. Khôi phục trước khi chỉnh sửa." },
          { status: 409 },
        );
      const paid = body.paid !== false;
      const amount = Number(body.amount);
      if (paid && (!Number.isInteger(amount) || amount <= 0)) {
        return NextResponse.json(
          { error: "Vui lòng nhập số tiền đã đóng hợp lệ" },
          { status: 400 },
        );
      }
      const members = funds[fundIndex].members || [];
      const memberIndex = members.findIndex(
        (item) => item.userId === body.userId,
      );
      const payment = {
        ...currentMember,
        userId: user.id,
        paid,
        amount: paid ? amount : 0,
        paidAt: paid ? now : null,
        updatedAt: now,
        approvedBy: token.id,
      };
      if (memberIndex >= 0) members[memberIndex] = payment;
      else members.push(payment);
      funds[fundIndex].members = members;
      funds[fundIndex].updatedAt = now;
      await saveFunds(funds);
      await appendAuditLog({
        adminId: token.id,
        adminName: token.name || token.email,
        adminEmail: token.email,
        action: paid ? "APPROVE_FUND_PAYMENT" : "CANCEL_FUND_PAYMENT",
        targetType: "FUND",
        targetId: funds[fundIndex].id,
        details: paid
          ? `Xác nhận ${user.name} đã đóng ${payment.amount.toLocaleString("vi-VN")} đồng quỹ tháng ${funds[fundIndex].month}/${funds[fundIndex].year}`
          : `Hủy xác nhận đóng quỹ tháng ${funds[fundIndex].month}/${funds[fundIndex].year} của ${user.name}`,
      });
      return NextResponse.json(buildFundResponse(funds[fundIndex], funds));
    }
    const key = body.kind === "income" ? "incomes" : "expenses";
    const items = funds[fundIndex][key] || [];
    const index = items.findIndex((item) => item.id === body.transactionId);
    if (index < 0)
      return NextResponse.json(
        { error: "Không tìm thấy giao dịch" },
        { status: 404 },
      );
    const previous = items[index];
    const users = await getUsers();
    const penalties = ["explanation_penalty", "shirt_penalty"];
    const adjust = (id, delta) => {
      const userIndex = users.findIndex((user) => user.id === id);
      if (userIndex >= 0)
        users[userIndex] = {
          ...users[userIndex],
          schedulingPoints: (users[userIndex].schedulingPoints || 0) + delta,
          updatedAt: new Date().toISOString(),
        };
    };
    if (body.kind === "income" && penalties.includes(previous.category))
      adjust(previous.userId, 1);
    if (removing) items.splice(index, 1);
    else {
      const personRequired =
        body.kind === "income" && body.category !== "happy_hour";
      const person = personRequired
        ? users.find((user) => user.id === body.userId)
        : null;
      if (!(Number(body.amount) > 0) || (personRequired && !person))
        return NextResponse.json(
          { error: "Vui lòng nhập đầy đủ thông tin giao dịch" },
          { status: 400 },
        );
      items[index] = {
        ...previous,
        category: body.category,
        title: fundLabels[body.category] || "Giao dịch quỹ",
        amount: Number(body.amount),
        note: body.note?.trim() || "",
        userId: person?.id || "",
        userName: person?.name || "",
        [body.kind === "income" ? "receivedAt" : "spentAt"]: businessDateToIso(
          body.date,
          previous.receivedAt || previous.spentAt,
        ),
        updatedAt: new Date().toISOString(),
      };
      if (body.kind === "income" && penalties.includes(body.category))
        adjust(person.id, -1);
    }
    funds[fundIndex][key] = items;
    funds[fundIndex].updatedAt = new Date().toISOString();
    await saveFunds(funds);
    await saveUsers(users);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || token.email,
      adminEmail: token.email,
      action: removing ? "DELETE_FUND_TRANSACTION" : "UPDATE_FUND_TRANSACTION",
      targetType: "FUND",
      targetId: funds[fundIndex].id,
      details: `${removing ? "Xóa" : "Cập nhật"} giao dịch quỹ ${previous.title}`,
    });
    return NextResponse.json(buildFundResponse(funds[fundIndex], funds));
  } catch (error) {
    console.error("[API Funds] mutation:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PATCH(req) {
  return changeTransaction(req, false);
}
export async function DELETE(req) {
  return changeTransaction(req, true);
}
