import { useState, useEffect } from 'react'
import { getExpenses } from '../lib/db'
import { exportQuickBooksCSV, exportXeroCSV, exportPnLCSV, downloadCSV } from '../lib/qb-export'
import { usePremium } from '../lib/usePremium'
import type { Expense } from '../lib/types'

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

export default function QBExport() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [period, setPeriod] = useState(getCurrentMonth())
  const { isPremium } = usePremium()

  useEffect(() => {
    getExpenses().then(setExpenses)
  }, [])

  const handleExport = (format: 'quickbooks' | 'xero' | 'pnl') => {
    let csv: string
    let filename: string

    switch (format) {
      case 'quickbooks':
        csv = exportQuickBooksCSV(expenses, period)
        filename = `MileMargin_QuickBooks_${period}.csv`
        break
      case 'xero':
        csv = exportXeroCSV(expenses, period)
        filename = `MileMargin_Xero_${period}.csv`
        break
      case 'pnl':
        csv = exportPnLCSV(expenses, period)
        filename = `MileMargin_PnL_${period}.csv`
        break
    }

    downloadCSV(csv!, filename!)
  }

  const periodExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return p === period
  })

  if (!isPremium) {
    return (
      <div className="px-4 pt-4 pb-24 space-y-4">
        <h1 className="text-xl font-bold text-white">QuickBooks / Xero Export</h1>
        <div className="glass rounded-2xl p-8 text-center space-y-3">
          <span className="text-4xl">👑</span>
          <h2 className="text-lg font-bold text-white">Premium Feature</h2>
          <p className="text-sm text-slate-400">
            QuickBooks and Xero CSV exports are available exclusively on the Premium plan. 
            Export expense data formatted for easy accounting software import.
          </p>
          <a href="/app/account"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl btn-active">
            Upgrade to Premium
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">QB / Xero Export</h1>
          <p className="text-sm text-slate-400">Accounting-ready CSV exports</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="glass rounded-xl p-4">
        <label className="text-xs text-slate-400">Reporting Period</label>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
        >
          {MONTHS.map(m => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-2">
          {periodExpenses.length} expense{periodExpenses.length !== 1 ? 's' : ''} in this period
        </p>
      </div>

      {/* Export Buttons */}
      <div className="space-y-3">
        <div className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white">QuickBooks</h2>
          <p className="text-xs text-slate-400 mt-1">CSV formatted for QuickBooks Online import</p>
          <button onClick={() => handleExport('quickbooks')}
            disabled={periodExpenses.length === 0}
            className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm btn-active">
            Export QuickBooks CSV
          </button>
        </div>

        <div className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white">Xero</h2>
          <p className="text-xs text-slate-400 mt-1">Bank statement format CSV for Xero import</p>
          <button onClick={() => handleExport('xero')}
            disabled={periodExpenses.length === 0}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm btn-active">
            Export Xero CSV
          </button>
        </div>

        <div className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white">P&L Summary</h2>
          <p className="text-xs text-slate-400 mt-1">Profit & Loss by category, mapped to both QB & Xero accounts</p>
          <button onClick={() => handleExport('pnl')}
            disabled={periodExpenses.length === 0}
            className="mt-3 w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm btn-active">
            Export P&L CSV
          </button>
        </div>
      </div>

      {/* Account Mappings */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Account Mapping</h3>
        <div className="space-y-1.5">
          {[
            { cat: 'fuel', name: 'Fuel' },
            { cat: 'maintenance', name: 'Maintenance' },
            { cat: 'tolls', name: 'Tolls' },
            { cat: 'insurance', name: 'Insurance' },
            { cat: 'repairs', name: 'Repairs' },
            { cat: 'tires', name: 'Tires' },
            { cat: 'food', name: 'Meals' },
            { cat: 'lodging', name: 'Lodging' },
            { cat: 'parking', name: 'Parking' },
            { cat: 'permits', name: 'Permits' },
            { cat: 'other', name: 'Other' },
          ].map(m => (
            <div key={m.cat} className="flex text-xs text-slate-400 py-1 border-b border-slate-800/50 last:border-0">
              <span className="w-20 text-slate-300">{m.name}</span>
              <span className="flex-1 truncate">QB: {m.cat === 'fuel' ? 'Fuel - Diesel/Gasoline (5010)' :
                m.cat === 'maintenance' ? 'Repairs & Maintenance (5020)' :
                m.cat === 'tolls' ? 'Tolls & Permits (5030)' :
                m.cat === 'insurance' ? 'Insurance (5040)' :
                m.cat === 'repairs' ? 'Repairs & Maintenance (5020)' :
                m.cat === 'tires' ? 'Tires (5060)' :
                m.cat === 'food' ? 'Meals & Entertainment (6000)' :
                m.cat === 'lodging' ? 'Travel (6010)' :
                m.cat === 'parking' ? 'Parking & Tolls (5030)' :
                m.cat === 'permits' ? 'Licenses & Permits (5070)' :
                'Other Business Expenses (5090)'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-xs text-slate-400 uppercase tracking-wider">How to Import</h3>
        <div className="space-y-2 mt-3 text-xs text-slate-400">
          <p><span className="text-emerald-400">QuickBooks:</span> Go to Transactions → Import → Upload CSV. Map columns to your chart of accounts.</p>
          <p><span className="text-blue-400">Xero:</span> Go to Accounting → Bank Accounts → Import Bank Statement. Select the CSV file.</p>
          <p><span className="text-amber-400">P&L:</span> Use this for your accountant — shows expense totals per category with mapped account codes.</p>
        </div>
      </div>
    </div>
  )
}