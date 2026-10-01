import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getFunds, getUsers, getSettings } from "@/libs/dataRepository";
import { currentFundPeriod, periodKey, summarizeFundCash, fundPaymentStatus } from "@/libs/fundRules";

const secret = process.env.NEXTAUTH_SECRET;

const incomeCategoryLabels = {
  monthly_fund: "Quỹ đóng thành viên",
  explanation_penalty: "Phạt giải trình công",
  shirt_penalty: "Phạt áo",
  happy_hour: "Happy Hour",
  other: "Thu khác",
};

const expenseCategoryLabels = {
  food_drink: "Ăn uống",
  office: "Văn phòng",
  event: "Sự kiện",
  support: "Hỗ trợ thành viên",
  other: "Chi khác",
};

export async function GET(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("mode") || "all"; // "all" | "single" | "range"
    const fromParam = searchParams.get("from") || ""; // YYYY-MM
    const toParam = searchParams.get("to") || "";     // YYYY-MM
    const monthParam = searchParams.get("month") ? Number(searchParams.get("month")) : null;
    const yearParam = searchParams.get("year") ? Number(searchParams.get("year")) : null;

    const [allFunds, users] = await Promise.all([getFunds(), getUsers()]);
    const current = currentFundPeriod();
    const currentKey = periodKey(current);

    // Sắp xếp các kỳ theo thứ tự thời gian tăng dần
    const sortedFunds = [...allFunds].sort((a, b) => periodKey(a).localeCompare(periodKey(b)));

    // Xây dựng timeline dữ liệu tài chính theo từng tháng
    let runningBalance = Number(sortedFunds[0]?.openingBalance) || 0;
    const allMonthlyTimeline = [];

    for (const fund of sortedFunds) {
      const pKey = periodKey(fund);
      const startBal = runningBalance;

      const memberIncome = (fund.members || []).reduce(
        (sum, m) => sum + (m.paid ? Number(m.amount) || 0 : 0),
        0
      );
      const otherIncome = (fund.incomes || []).reduce(
        (sum, inc) => sum + (Number(inc.amount) || 0),
        0
      );
      const totalIncome = memberIncome + otherIncome;

      const totalExpense = (fund.expenses || []).reduce(
        (sum, exp) => sum + (Number(exp.amount) || 0),
        0
      );

      const netCashFlow = totalIncome - totalExpense;
      runningBalance = startBal + netCashFlow;

      const visibleMembers = (fund.members || []).filter((m) => !m.rosterHidden);
      const paidMembers = visibleMembers.filter((m) =>
        ["paid", "overpaid"].includes(fundPaymentStatus(m).key)
      ).length;
      const totalMembers = visibleMembers.length;
      const paymentRate = totalMembers > 0 ? Math.round((paidMembers / totalMembers) * 100) : 0;

      allMonthlyTimeline.push({
        id: fund.id,
        periodKey: pKey,
        label: `Tháng ${String(fund.month).padStart(2, "0")}/${fund.year}`,
        month: fund.month,
        year: fund.year,
        isFuture: pKey > currentKey,
        openingBalance: startBal,
        memberIncome,
        otherIncome,
        totalIncome,
        totalExpense,
        netCashFlow,
        closingBalance: runningBalance,
        paidMembers,
        totalMembers,
        paymentRate,
        rawFund: fund,
      });
    }

    // Tìm kỳ đầu tiên có phát sinh dữ liệu thực tế (thu, chi, số dư đầu, hoặc người đóng)
    const firstActiveIndex = allMonthlyTimeline.findIndex(
      (item) => item.totalIncome > 0 || item.totalExpense > 0 || item.openingBalance > 0 || item.paidMembers > 0
    );
    const activeStartKey = firstActiveIndex !== -1 ? allMonthlyTimeline[firstActiveIndex].periodKey : `${current.year}-01`;

    // Danh sách các kỳ khả dụng (từ kỳ bắt đầu hoạt động đến kỳ hiện tại hoặc có dữ liệu)
    const availablePeriods = sortedFunds
      .filter((f) => periodKey(f) >= activeStartKey && (periodKey(f) <= currentKey || (f.incomes?.length || f.expenses?.length || f.members?.some(m => m.paid))))
      .map((f) => ({
        key: periodKey(f),
        label: `Tháng ${String(f.month).padStart(2, "0")}/${f.year}`,
        month: f.month,
        year: f.year,
      }))
      .reverse(); // Mới nhất lên đầu

    // Lọc timeline theo khoảng thời gian được yêu cầu
    let filteredTimeline = allMonthlyTimeline;

    if (fromParam && toParam) {
      filteredTimeline = allMonthlyTimeline.filter(
        (item) => item.periodKey >= fromParam && item.periodKey <= toParam
      );
    } else if (mode === "single" && monthParam && yearParam) {
      const targetKey = `${yearParam}-${String(monthParam).padStart(2, "0")}`;
      filteredTimeline = allMonthlyTimeline.filter((item) => item.periodKey === targetKey);
    } else if (mode === "year" && yearParam) {
      filteredTimeline = allMonthlyTimeline.filter((item) => item.year === yearParam);
    } else {
      // Default / All: Lấy các kỳ từ khi bắt đầu có hoạt động đến kỳ hiện tại
      filteredTimeline = allMonthlyTimeline.filter(
        (item) => item.periodKey >= activeStartKey && (item.periodKey <= currentKey || item.totalIncome > 0 || item.totalExpense > 0)
      );
    }

    // Nếu không khớp kỳ nào, fallback về các kỳ trong năm hiện tại
    if (filteredTimeline.length === 0) {
      filteredTimeline = allMonthlyTimeline.filter((item) => item.periodKey <= currentKey);
    }

    // Tính toán tổng hợp cho khoảng thời gian được lọc
    const summary = {
      totalIncome: 0,
      memberIncome: 0,
      otherIncome: 0,
      totalExpense: 0,
      netCashFlow: 0,
      totalPaidTransactions: 0,
      totalExpenseTransactions: 0,
      openingBalance: filteredTimeline[0]?.openingBalance || 0,
      closingBalance: filteredTimeline[filteredTimeline.length - 1]?.closingBalance || 0,
      currentFundBalance: runningBalance,
    };

    const incomeCategoriesMap = {
      monthly_fund: { key: "monthly_fund", label: incomeCategoryLabels.monthly_fund, amount: 0, count: 0, color: "#7367F0" },
      explanation_penalty: { key: "explanation_penalty", label: incomeCategoryLabels.explanation_penalty, amount: 0, count: 0, color: "#FF9F43" },
      shirt_penalty: { key: "shirt_penalty", label: incomeCategoryLabels.shirt_penalty, amount: 0, count: 0, color: "#FF4C51" },
      happy_hour: { key: "happy_hour", label: incomeCategoryLabels.happy_hour, amount: 0, count: 0, color: "#28C76F" },
      other: { key: "other", label: incomeCategoryLabels.other, amount: 0, count: 0, color: "#00BAD1" },
    };

    const expenseCategoriesMap = {
      food_drink: { key: "food_drink", label: expenseCategoryLabels.food_drink, amount: 0, count: 0, color: "#FF9F43" },
      office: { key: "office", label: expenseCategoryLabels.office, amount: 0, count: 0, color: "#00BAD1" },
      event: { key: "event", label: expenseCategoryLabels.event, amount: 0, count: 0, color: "#28C76F" },
      support: { key: "support", label: expenseCategoryLabels.support, amount: 0, count: 0, color: "#7367F0" },
      other: { key: "other", label: expenseCategoryLabels.other, amount: 0, count: 0, color: "#FF4C51" },
    };

    const memberStatusMap = {
      paid: { key: "paid", label: "Đã đóng", count: 0, amount: 0, color: "#28C76F" },
      overpaid: { key: "overpaid", label: "Đóng thừa", count: 0, amount: 0, color: "#7367F0" },
      underpaid: { key: "underpaid", label: "Đóng thiếu", count: 0, amount: 0, color: "#FF9F43" },
      unpaid: { key: "unpaid", label: "Chưa đóng", count: 0, amount: 0, color: "#808390" },
      cancelled: { key: "cancelled", label: "Miễn / Hủy", count: 0, amount: 0, color: "#999CA6" },
    };

    let topExpenses = [];
    let topIncomes = [];

    for (const item of filteredTimeline) {
      summary.totalIncome += item.totalIncome;
      summary.memberIncome += item.memberIncome;
      summary.otherIncome += item.otherIncome;
      summary.totalExpense += item.totalExpense;

      // Cộng tiền quỹ đóng thành viên vào category breakdown
      incomeCategoriesMap.monthly_fund.amount += item.memberIncome;
      incomeCategoriesMap.monthly_fund.count += item.paidMembers;
      summary.totalPaidTransactions += item.paidMembers;

      const rawFund = item.rawFund;

      // Chi tiết các khoản thu khác
      for (const inc of rawFund.incomes || []) {
        const amt = Number(inc.amount) || 0;
        const cat = incomeCategoriesMap[inc.category] || incomeCategoriesMap.other;
        cat.amount += amt;
        cat.count += 1;
        summary.totalPaidTransactions += 1;

        topIncomes.push({
          id: inc.id,
          title: inc.title || cat.label,
          category: inc.category,
          categoryLabel: cat.label,
          amount: amt,
          period: item.label,
          date: inc.receivedAt || inc.createdAt,
          userName: inc.userName,
        });
      }

      // Chi tiết các khoản chi
      for (const exp of rawFund.expenses || []) {
        const amt = Number(exp.amount) || 0;
        const cat = expenseCategoriesMap[exp.category] || expenseCategoriesMap.other;
        cat.amount += amt;
        cat.count += 1;
        summary.totalExpenseTransactions += 1;

        topExpenses.push({
          id: exp.id,
          title: exp.title || cat.label,
          category: exp.category,
          categoryLabel: cat.label,
          amount: amt,
          period: item.label,
          date: exp.spentAt || exp.createdAt,
          note: exp.note,
        });
      }

      // Thống kê thành viên
      for (const m of (rawFund.members || []).filter((m) => !m.rosterHidden)) {
        const st = fundPaymentStatus(m);
        const statusKey = st.key;
        if (memberStatusMap[statusKey]) {
          memberStatusMap[statusKey].count += 1;
          if (m.paid) {
            memberStatusMap[statusKey].amount += Number(m.amount) || 0;
          }
        }
      }
    }

    summary.netCashFlow = summary.totalIncome - summary.totalExpense;

    // Sắp xếp top chi & top thu
    topExpenses.sort((a, b) => b.amount - a.amount);
    topIncomes.sort((a, b) => b.amount - a.amount);

    // Tính trung bình mỗi tháng trong khoảng lọc
    const monthsCount = Math.max(1, filteredTimeline.length);
    summary.avgMonthlyIncome = Math.round(summary.totalIncome / monthsCount);
    summary.avgMonthlyExpense = Math.round(summary.totalExpense / monthsCount);

    // Xác định đơn vị thời gian: Nếu khoảng cách <= 3 tháng thì chia nhỏ theo từng ngày
    // Nếu > 3 tháng thì đơn vị là tháng
    const forcedGranularity = searchParams.get("granularity"); // "day" | "month" | null
    const granularity = forcedGranularity || (filteredTimeline.length <= 3 ? "day" : "month");

    const nowVietnam = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const curYear = parseInt(nowVietnam.find((p) => p.type === "year")?.value || "2026", 10);
    const curMonth = parseInt(nowVietnam.find((p) => p.type === "month")?.value || "10", 10);
    const curDay = parseInt(nowVietnam.find((p) => p.type === "day")?.value || "1", 10);

    let chartTimeline = [];

    if (granularity === "day") {
      let runningBal = filteredTimeline[0]?.openingBalance || 0;

      for (const item of filteredTimeline) {
        const rawFund = item.rawFund;
        const lastDayOfMonth = new Date(Date.UTC(item.year, item.month, 0)).getUTCDate();

        let maxDay = lastDayOfMonth;
        const isCurrentMonth = item.year === curYear && item.month === curMonth;
        const isFutureMonth = item.year > curYear || (item.year === curYear && item.month > curMonth);

        const getTxDay = (dateStr) => {
          if (!dateStr) return null;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return null;
          const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
          }).formatToParts(d);
          return parseInt(parts.find((p) => p.type === "day")?.value || "1", 10);
        };

        if (isCurrentMonth) {
          // Tháng hiện tại: lấy đến ngày hiện tại (hoặc ngày có giao dịch muộn nhất nếu có)
          let latestTxDay = curDay;
          for (const m of (rawFund.members || []).filter((m) => m.paid)) {
            const d = getTxDay(m.paidAt || m.updatedAt);
            if (d && d > latestTxDay) latestTxDay = d;
          }
          for (const inc of rawFund.incomes || []) {
            const d = getTxDay(inc.receivedAt || inc.createdAt);
            if (d && d > latestTxDay) latestTxDay = d;
          }
          for (const exp of rawFund.expenses || []) {
            const d = getTxDay(exp.spentAt || exp.createdAt);
            if (d && d > latestTxDay) latestTxDay = d;
          }
          maxDay = Math.min(lastDayOfMonth, latestTxDay);
        } else if (isFutureMonth) {
          // Tháng tương lai chưa tới: chỉ lấy nếu có giao dịch
          let latestTxDay = 0;
          for (const m of (rawFund.members || []).filter((m) => m.paid)) {
            const d = getTxDay(m.paidAt || m.updatedAt);
            if (d && d > latestTxDay) latestTxDay = d;
          }
          for (const inc of rawFund.incomes || []) {
            const d = getTxDay(inc.receivedAt || inc.createdAt);
            if (d && d > latestTxDay) latestTxDay = d;
          }
          for (const exp of rawFund.expenses || []) {
            const d = getTxDay(exp.spentAt || exp.createdAt);
            if (d && d > latestTxDay) latestTxDay = d;
          }
          maxDay = latestTxDay;
        }

        const days = [];
        for (let d = 1; d <= maxDay; d++) {
          days.push({
            day: d,
            month: item.month,
            year: item.year,
            label: `${d}/${item.month}`,
            fullLabel: `Ngày ${String(d).padStart(2, "0")}/${String(item.month).padStart(2, "0")}/${item.year}`,
            periodKey: item.periodKey,
            totalIncome: 0,
            memberIncome: 0,
            otherIncome: 0,
            totalExpense: 0,
            netCashFlow: 0,
            closingBalance: 0,
          });
        }

        // Nếu tháng tương lai không có ngày nào thì bỏ qua
        if (days.length === 0) continue;

        // Thu từ thành viên đóng quỹ
        for (const m of (rawFund.members || []).filter((m) => m.paid)) {
          const d = getTxDay(m.paidAt || m.updatedAt) || 10;
          const target = days.find((x) => x.day === d) || days[days.length - 1];
          if (target) {
            const amt = Number(m.amount) || 0;
            target.memberIncome += amt;
            target.totalIncome += amt;
          }
        }

        // Thu từ các nguồn thu khác
        for (const inc of rawFund.incomes || []) {
          const d = getTxDay(inc.receivedAt || inc.createdAt) || 15;
          const target = days.find((x) => x.day === d) || days[days.length - 1];
          if (target) {
            const amt = Number(inc.amount) || 0;
            target.otherIncome += amt;
            target.totalIncome += amt;
          }
        }

        // Các khoản chi
        for (const exp of rawFund.expenses || []) {
          const d = getTxDay(exp.spentAt || exp.createdAt) || 15;
          const target = days.find((x) => x.day === d) || days[days.length - 1];
          if (target) {
            const amt = Number(exp.amount) || 0;
            target.totalExpense += amt;
          }
        }

        for (const dayItem of days) {
          dayItem.netCashFlow = dayItem.totalIncome - dayItem.totalExpense;
          runningBal += dayItem.netCashFlow;
          dayItem.closingBalance = runningBal;
          chartTimeline.push(dayItem);
        }
      }
    } else {
      // Đơn vị là tháng (> 3 tháng)
      chartTimeline = filteredTimeline.map((item) => ({
        periodKey: item.periodKey,
        label: `Tháng ${String(item.month).padStart(2, "0")}/${String(item.year).slice(2)}`,
        fullLabel: `Tháng ${String(item.month).padStart(2, "0")}/${item.year}`,
        month: item.month,
        year: item.year,
        totalIncome: item.totalIncome,
        memberIncome: item.memberIncome,
        otherIncome: item.otherIncome,
        totalExpense: item.totalExpense,
        netCashFlow: item.netCashFlow,
        closingBalance: item.closingBalance,
        paymentRate: item.paymentRate,
        paidMembers: item.paidMembers,
        totalMembers: item.totalMembers,
      }));
    }

    // Bảng dữ liệu theo từng tháng
    const monthlyTimeline = filteredTimeline.map((item) => ({
      periodKey: item.periodKey,
      label: item.label,
      month: item.month,
      year: item.year,
      openingBalance: item.openingBalance,
      totalIncome: item.totalIncome,
      memberIncome: item.memberIncome,
      otherIncome: item.otherIncome,
      totalExpense: item.totalExpense,
      netCashFlow: item.netCashFlow,
      closingBalance: item.closingBalance,
      paymentRate: item.paymentRate,
      paidMembers: item.paidMembers,
      totalMembers: item.totalMembers,
    }));

    return NextResponse.json({
      summary,
      timelineData: chartTimeline,
      chartTimeline,
      monthlyTimeline,
      granularity,
      granularityLabel: granularity === "day" ? "Theo ngày" : "Theo tháng",
      incomeCategories: Object.values(incomeCategoriesMap),
      expenseCategories: Object.values(expenseCategoriesMap),
      memberStatus: Object.values(memberStatusMap),
      topExpenses: topExpenses.slice(0, 5),
      topIncomes: topIncomes.slice(0, 5),
      availablePeriods,
      filter: {
        mode,
        from: fromParam || filteredTimeline[0]?.periodKey,
        to: toParam || filteredTimeline[filteredTimeline.length - 1]?.periodKey,
        month: monthParam,
        year: yearParam,
      },
    });
  } catch (error) {
    console.error("[API Funds Overview Error]:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải báo cáo tổng quan tài chính" },
      { status: 500 }
    );
  }
}
