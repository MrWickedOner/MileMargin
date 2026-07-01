import type { Expense } from './types'

// QB/Xero account mapping for expense categories
const QB_ACCOUNT_MAP: Record<string, { quickbooks: string; xero: string }> = {
  fuel: { quickbooks: 'Fuel - Diesel/Gasoline (5010)', xero: 'Motor Vehicle Expenses (Fuel)' },
  maintenance: { quickbooks: 'Repairs & Maintenance (5020)', xero: 'Repairs & Maintenance' },
  tolls: { quickbooks: 'Tolls & Permits (5030)', xero: 'Motor Vehicle Expenses (Tolls)' },
  insurance: { quickbooks: 'Insurance (5040)', xero: 'Insurance' },
  lease: { quickbooks: 'Equipment Rental (5050)', xero: 'Lease Payments' },
  repairs: { quickbooks: 'Repairs & Maintenance (5020)', xero: 'Repairs & Maintenance' },
  tires: { quickbooks: 'Tires (5060)', xero: 'Motor Vehicle Expenses (Tires)' },
  food: { quickbooks: 'Meals & Entertainment (6000)', xero: 'Travel & Accommodation (Meals)' },
  lodging: { quickbooks: 'Travel (6010)', xero: 'Travel & Accommodation (Lodging)' },
  parking: { quickbooks: 'Parking & Tolls (5030)', xero: 'Motor Vehicle Expenses (Parking)' },
  permits: { quickbooks: 'Licenses & Permits (5070)', xero: 'Motor Vehicle Expenses (Permits)' },
  accounting: { quickbooks: 'Professional Fees (5080)', xero: 'Accounting & Bookkeeping' },
  phone: { quickbooks: 'Utilities - Telephone (6020)', xero: 'Telephone & Internet' },
  other: { quickbooks: 'Other Business Expenses (5090)', xero: 'General Expenses' },
}

// QB/Xero account mapping for income
export const QB_INCOME_ACCOUNT = { quickbooks: 'Freight Income (4000)', xero: 'Sales (Freight Revenue)' }

function getMonthRange(period: string): { start: Date; end: Date } {
  const [year, month] = period.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)
  return { start, end }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

// Generate QB-compatible CSV
export function exportQuickBooksCSV(expenses: Expense[], period: string): string {
  const { start, end } = getMonthRange(period)
  const filtered = expenses.filter(e => {
    const d = new Date(e.date)
    return d >= start && d <= end
  })

  const lines: string[] = [
    // Header row
    ['Date', 'Transaction Type', 'Account', 'Amount', 'Memo', 'Name'].join(','),
  ]

  for (const exp of filtered) {
    const accountInfo = QB_ACCOUNT_MAP[exp.category] || QB_ACCOUNT_MAP.other
    const amount = exp.amount
    lines.push([
      formatDate(new Date(exp.date)),
      'Expense',
      accountInfo.quickbooks,
      amount.toFixed(2),
      csvEscape(exp.description || exp.category),
      '',
    ].join(','))
  }

  return lines.join('\n')
}

// Generate Xero-compatible CSV
export function exportXeroCSV(expenses: Expense[], period: string): string {
  const { start, end } = getMonthRange(period)
  const filtered = expenses.filter(e => {
    const d = new Date(e.date)
    return d >= start && d <= end
  })

  const lines: string[] = [
    // Xero bank statement format
    ['Date', 'Amount', 'Payee', 'Description', 'Reference'].join(','),
  ]

  for (const exp of filtered) {
    const amount = -Math.abs(exp.amount) // Negative for expenses
    lines.push([
      formatDate(new Date(exp.date)),
      amount.toFixed(2),
      '',
      csvEscape(exp.description || exp.category),
      '',
    ].join(','))
  }

  return lines.join('\n')
}

// Generate combined P&L summary CSV
export function exportPnLCSV(expenses: Expense[], period: string): string {
  const { start, end } = getMonthRange(period)
  const filtered = expenses.filter(e => {
    const d = new Date(e.date)
    return d >= start && d <= end
  })

  // Aggregate by category
  const categoryTotals: Record<string, number> = {}
  for (const exp of filtered) {
    const amt = exp.amount || 0
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amt
  }

  const lines: string[] = [
    ['Category', 'Account (QuickBooks)', 'Account (Xero)', 'Amount'].join(','),
  ]

  for (const [cat, total] of Object.entries(categoryTotals)) {
    const accounts = QB_ACCOUNT_MAP[cat] || QB_ACCOUNT_MAP.other
    lines.push([
      csvEscape(cat),
      csvEscape(accounts.quickbooks),
      csvEscape(accounts.xero),
      total.toFixed(2),
    ].join(','))
  }

  const grandTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0)
  lines.push(['', '', 'Total Expenses', grandTotal.toFixed(2)].join(','))

  return lines.join('\n')
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}