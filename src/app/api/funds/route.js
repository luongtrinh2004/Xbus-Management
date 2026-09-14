import { NextResponse } from 'next/server'
import { getFunds } from '@/libs/jsonRepository'

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams
    const month = searchParams.get('month') || null
    const year = searchParams.get('year') || null

    const allFunds = getFunds()

    // Lấy quỹ hiện tại (mới nhất hoặc theo tháng/năm)
    let fund = null
    if (month && year) {
      fund = allFunds.find(f => f.month === parseInt(month) && f.year === parseInt(year))
    } else {
      // Lấy quỹ mới nhất
      fund = allFunds.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      })[0]
    }

    if (!fund) {
      return NextResponse.json({ balance: 0, totalIncome: 0, totalExpense: 0, paidCount: 0, members: [], expenses: [] })
    }

    const totalIncome = fund.members.reduce((s, m) => s + (m.paid ? m.amount : 0), 0)
    const totalExpense = fund.expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const balance = (fund.openingBalance || 0) + totalIncome - totalExpense
    const paidCount = fund.members.filter(m => m.paid).length

    return NextResponse.json({
      id: fund.id,
      year: fund.year,
      month: fund.month,
      openingBalance: fund.openingBalance,
      totalIncome,
      totalExpense,
      balance,
      paidCount,
      totalMembers: fund.members.length,
      members: fund.members,
      expenses: fund.expenses
    })
  } catch (error) {
    console.error('[API Funds] GET:', error)
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
