import type { DetentionLog, Expense, RateEvaluation, Route } from './types'

export interface MonthlyReport {
  month: string
  year: number
  totalMiles: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  effectiveCPM: number
  expenseBreakdown: { category: string; amount: number }[]
  detentionEarnings: number
  detentionHours: number
  detentionSessions: number
  ratesEvaluated: number
  loadsAccepted: number
  avgRatePerMile: number
  iftaStates: number
  iftaTotalMiles: number
  iftaEstimatedTax: number
}

export function generateMonthlyReport(
  expenses: Expense[],
  detentions: DetentionLog[],
  rates: RateEvaluation[],
  routes: Route[],
  year: number,
  month: number
): MonthlyReport {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const inRange = (dateStr: string) => {
    const d = new Date(dateStr)
    return d >= startDate && d <= endDate
  }

  // Expenses
  const monthExpenses = expenses.filter(e => inRange(e.date))
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const expenseBreakdown: Record<string, number> = {}
  for (const exp of monthExpenses) {
    expenseBreakdown[exp.category] = (expenseBreakdown[exp.category] || 0) + exp.amount
  }

  // Detentions
  const monthDetentions = detentions.filter(d => inRange(d.startTime))
  const detentionEarnings = monthDetentions.reduce((s, d) => {
    const hours = Math.max(0, (d.durationMinutes || 0) - 120) / 60 // 2hr free window
    return s + hours * 25
  }, 0)
  const detentionHours = monthDetentions.reduce((s, d) => s + Math.max(0, (d.durationMinutes || 0) - 120) / 60, 0)

  // Rates
  const monthRates = rates.filter(r => inRange(r.createdAt))
  const avgRate = monthRates.length > 0
    ? monthRates.reduce((s, r) => s + (r.revenue / (r.miles || 1)), 0) / monthRates.length
    : 0

  // Routes (GPS tracked miles)
  const monthRoutes = routes.filter(r => inRange(r.startedAt))
  const totalMiles = monthRoutes.reduce((s, r) => s + (r.totalMiles || 0), 0)

  // Revenue from rates
  const totalRevenue = monthRates.reduce((s, r) => s + (r.revenue || 0), 0)

  // IFTA estimate
  const iftaTotalMiles = totalMiles
  const iftaEstimatedTax = iftaTotalMiles * 0.06 // rough $0.06/mi estimate

  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const effectiveCPM = totalMiles > 0 ? ((totalExpenses - detentionEarnings) / totalMiles) * 100 : 0

  // Count only profitable loads as "accepted"
  const loadsAccepted = monthRates.filter(r => {
    const rev = r.revenue || 0
    const cost = (r.miles || 0) * (r.operatingCPM || 1.85)
    return rev >= cost
  }).length

  return {
    month: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
    year,
    totalMiles: Math.round(totalMiles),
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    effectiveCPM: Math.round(effectiveCPM * 100) / 100,
    expenseBreakdown: Object.entries(expenseBreakdown)
      .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount),
    detentionEarnings: Math.round(detentionEarnings * 100) / 100,
    detentionHours: Math.round(detentionHours * 100) / 100,
    detentionSessions: monthDetentions.length,
    ratesEvaluated: monthRates.length,
    loadsAccepted,
    avgRatePerMile: Math.round(avgRate * 100) / 100,
    iftaStates: new Set(monthRoutes.flatMap(r => r.stateSegments?.map(s => s.state) || [])).size,
    iftaTotalMiles: Math.round(iftaTotalMiles),
    iftaEstimatedTax: Math.round(iftaEstimatedTax * 100) / 100,
  }
}

export function generateReportHtml(report: MonthlyReport): string {
  const formatCurrency = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; max-width: 500px; margin: 0 auto; padding: 20px; }
h1 { color: #34d399; font-size: 24px; margin: 0 0 4px; }
.subtitle { color: #94a3b8; font-size: 14px; margin: 0 0 24px; }
.section { background: #1e293b; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
.section h2 { font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.label { color: #94a3b8; font-size: 14px; }
.value { color: #e2e8f0; font-size: 14px; font-weight: 600; }
.value.green { color: #34d399; }
.value.red { color: #f87171; }
.value.amber { color: #fbbf24; }
.big { font-size: 32px; font-weight: 700; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.card { background: #0f172a; border-radius: 12px; padding: 12px; text-align: center; }
.card .big { font-size: 22px; }
.card p { color: #64748b; font-size: 11px; margin: 4px 0 0; }
hr { border: none; border-top: 1px solid #334155; margin: 8px 0; }
</style></head>
<body>
  <h1>🚛 MileMargin Report</h1>
  <p class="subtitle">${report.month} ${report.year} · Your Monthly Profit Summary</p>

  <div class="section">
    <div class="grid">
      <div class="card">
        <div class="big ${report.netProfit >= 0 ? 'green' : 'red'}">${formatCurrency(report.netProfit)}</div>
        <p>Net Profit</p>
      </div>
      <div class="card">
        <div class="big">${formatCurrency(report.effectiveCPM)}</div>
        <p>Effective CPM</p>
      </div>
      <div class="card">
        <div class="big">${formatCurrency(report.totalRevenue)}</div>
        <p>Revenue</p>
      </div>
      <div class="card">
        <div class="big">${formatCurrency(report.totalExpenses)}</div>
        <p>Expenses</p>
      </div>
    </div>
    <div class="row" style="margin-top:12px">
      <span class="label">Profit Margin</span>
      <span class="value ${report.profitMargin >= 15 ? 'green' : report.profitMargin >= 5 ? 'amber' : 'red'}">${report.profitMargin}%</span>
    </div>
  </div>

  <div class="section">
    <h2>Activity</h2>
    <div class="row">
      <span class="label">Miles Driven</span>
      <span class="value">${report.totalMiles.toLocaleString()}</span>
    </div>
    <div class="row">
      <span class="label">Rates Evaluated</span>
      <span class="value">${report.ratesEvaluated}</span>
    </div>
    <div class="row">
      <span class="label">Profitable Loads</span>
      <span class="value">${report.loadsAccepted}/${report.ratesEvaluated}</span>
    </div>
    <div class="row">
      <span class="label">Avg Rate/mi</span>
      <span class="value">${formatCurrency(report.avgRatePerMile)}</span>
    </div>
  </div>

  <div class="section">
    <h2>Detention & IFTA</h2>
    <div class="row">
      <span class="label">Detention Earnings</span>
      <span class="value green">${formatCurrency(report.detentionEarnings)}</span>
    </div>
    <div class="row">
      <span class="label">Detention Hours</span>
      <span class="value">${report.detentionHours}</span>
    </div>
    <div class="row">
      <span class="label">Detention Sessions</span>
      <span class="value">${report.detentionSessions}</span>
    </div>
    <hr/>
    <div class="row">
      <span class="label">IFTA States</span>
      <span class="value">${report.iftaStates}</span>
    </div>
    <div class="row">
      <span class="label">IFTA Miles</span>
      <span class="value">${report.iftaTotalMiles.toLocaleString()}</span>
    </div>
    <div class="row">
      <span class="label">Est. IFTA Tax</span>
      <span class="value amber">${formatCurrency(report.iftaEstimatedTax)}</span>
    </div>
  </div>

  <div class="section">
    <h2>Expense Breakdown</h2>
    ${report.expenseBreakdown.map(e => `
    <div class="row">
      <span class="label" style="text-transform:capitalize">${e.category}</span>
      <span class="value">${formatCurrency(e.amount)}</span>
    </div>`).join('')}
    <hr/>
    <div class="row">
      <span class="label" style="font-weight:700">Total Expenses</span>
      <span class="value" style="font-weight:700">${formatCurrency(report.totalExpenses)}</span>
    </div>
  </div>

  <p style="text-align:center;color:#475569;font-size:11px;margin-top:24px">
    Generated by MileMargin · Your Profit Co-Pilot<br/>
    <a href="https://milemargin.vercel.app" style="color:#34d399">milemargin.vercel.app</a>
  </p>
</body></html>`
}

export function downloadReport(report: MonthlyReport) {
  const html = generateReportHtml(report)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `MileMargin_Report_${report.month}_${report.year}.html`
  a.click()
  URL.revokeObjectURL(url)
}