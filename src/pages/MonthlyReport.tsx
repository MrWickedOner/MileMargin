import { useState, useEffect } from 'react'
import { getExpenses, getDetentionLogs, getRateEvaluations, getRoutes } from '../lib/db'
import { generateMonthlyReport, downloadReport } from '../lib/monthly-report'
import type { Expense, DetentionLog, RateEvaluation, Route } from '../lib/types'

function getMonths() {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) })
  }
  return months
}

export default function MonthlyReport() {
  const [selected, setSelected] = useState(0)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [detentions, setDetentions] = useState<DetentionLog[]>([])
  const [rates, setRates] = useState<RateEvaluation[]>([])
  const [routes, setRoutes] = useState<Route[]>([])

  const months = getMonths()
  const { year, month } = months[selected]

  useEffect(() => {
    Promise.all([
      getExpenses(),
      getDetentionLogs(),
      getRateEvaluations(),
      getRoutes(),
    ]).then(([e, d, r, rt]) => {
      setExpenses(e)
      setDetentions(d)
      setRates(r)
      setRoutes(rt)
    })
  }, [])

  const report = generateMonthlyReport(expenses, detentions, rates, routes, year, month)

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Monthly Report</h1>
          <p className="text-sm text-slate-400">Your ROI proof every month</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="glass rounded-xl p-4">
        <select
          value={selected}
          onChange={e => setSelected(Number(e.target.value))}
          className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
        >
          {months.map((m, i) => (
            <option key={i} value={i}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <p className={`text-2xl font-bold ${report.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(report.netProfit)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Net Profit</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{fmt(report.effectiveCPM)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Effective CPM</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{fmt(report.totalRevenue)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Revenue</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{fmt(report.totalExpenses)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Expenses</p>
        </div>
      </div>

      {/* Profit Margin */}
      <div className="glass rounded-2xl p-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-400">Profit Margin</p>
          <p className="text-xs text-slate-500">{report.totalMiles > 0 ? `${report.totalMiles} mi driven` : 'No data'}</p>
        </div>
        <span className={`text-lg font-bold ${report.profitMargin >= 15 ? 'text-emerald-400' : report.profitMargin >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
          {report.profitMargin}%
        </span>
      </div>

      {/* Activity */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-xs text-slate-400 uppercase tracking-wider">Activity</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Miles Driven</span>
            <span className="text-white font-medium">{report.totalMiles.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Rates Evaluated</span>
            <span className="text-white font-medium">{report.ratesEvaluated}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Profitable Loads</span>
            <span className="text-white font-medium">{report.loadsAccepted}/{report.ratesEvaluated}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Avg Rate/mi</span>
            <span className="text-white font-medium">{fmt(report.avgRatePerMile)}</span>
          </div>
        </div>
      </div>

      {/* Detention */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-xs text-slate-400 uppercase tracking-wider">Detention</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Earnings</span>
            <span className="text-emerald-400 font-medium">{fmt(report.detentionEarnings)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Hours</span>
            <span className="text-white font-medium">{report.detentionHours}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Sessions</span>
            <span className="text-white font-medium">{report.detentionSessions}</span>
          </div>
        </div>
      </div>

      {/* IFTA */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-xs text-slate-400 uppercase tracking-wider">IFTA Summary</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">States Visited</span>
            <span className="text-white font-medium">{report.iftaStates}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Miles</span>
            <span className="text-white font-medium">{report.iftaTotalMiles.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Est. Tax Due</span>
            <span className="text-amber-400 font-medium">{fmt(report.iftaEstimatedTax)}</span>
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-xs text-slate-400 uppercase tracking-wider">Expense Breakdown</h2>
        <div className="space-y-2">
          {report.expenseBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">No expenses recorded</p>
          ) : (
            report.expenseBreakdown.map(e => (
              <div key={e.category} className="flex justify-between text-sm">
                <span className="text-slate-400 capitalize">{e.category}</span>
                <span className="text-white font-medium">{fmt(e.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Export */}
      <button onClick={() => downloadReport(report)}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl btn-active">
        📄 Download HTML Report
      </button>
      <p className="text-[10px] text-slate-500 text-center">Opens in browser — printable & shareable</p>
    </div>
  )
}