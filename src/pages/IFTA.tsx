import { useState, useEffect, useCallback } from 'react'
import { getExpenses, calculateIFTA } from '../lib/db'
import { usePremium } from '../lib/usePremium'
import type { IFTACalculationResult, IFTADetailRow } from '../lib/db'

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

function getCurrentQuarter(): string {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return `${now.getFullYear()}-Q${q}`
}

function getQuarterOptions(): string[] {
  const opts: string[] = []
  const now = new Date()
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
    for (let q = 4; q >= 1; q--) {
      opts.push(`${y}-Q${q}`)
    }
  }
  return opts
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

export default function IFTA() {
  const { isPremium } = usePremium()
  const [period, setPeriod] = useState(getCurrentQuarter())
  const [stateMiles, setStateMiles] = useState<Record<string, string>>({})
  const [result, setResult] = useState<IFTACalculationResult | null>(null)
  const [fuelPurchases, setFuelPurchases] = useState<{ state: string; gallons: number }[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getExpenses().then(expenses => {
      const fuel = expenses.filter(e => e.category === 'fuel' && e.fuelGallons)
      setFuelPurchases(fuel.map(e => ({ state: e.fuelState || 'IN', gallons: e.fuelGallons || 0 })))
    }).then(() => setLoaded(true))
  }, [])

  const totalEntered = Object.values(stateMiles).reduce((s, v) => s + (parseFloat(v) || 0), 0)

  const handleCalculate = useCallback(async () => {
    const miles: Record<string, number> = {}
    for (const [state, val] of Object.entries(stateMiles)) {
      const n = parseFloat(val)
      if (n > 0) miles[state] = n
    }
    if (Object.keys(miles).length === 0) return
    const res = await calculateIFTA(period, miles)
    setResult(res)
  }, [period, stateMiles])

  const handleSetTotalMiles = useCallback((total: number) => {
    if (!total || total <= 0) return
    // Evenly distribute miles across all states (user should adjust per state)
    const perState = Math.round(total / STATES.length)
    const newMiles: Record<string, string> = {}
    let remaining = total
    for (let i = 0; i < STATES.length; i++) {
      const val = i === STATES.length - 1 ? remaining : perState
      newMiles[STATES[i]] = val.toString()
      remaining -= val
    }
    setStateMiles(newMiles)
  }, [])

  const handleExportCSV = useCallback(() => {
    if (!result) return
    let csv = 'State,Miles,Fuel Consumed (gal),Tax Rate ($/gal),Tax Due,$ Fuel Purchased,Tax Paid,Net Tax\n'
    for (const row of result.stateEntries) {
      csv += `${row.state},${row.miles},${row.fuelConsumed},${(row.taxRate / 100).toFixed(4)},${row.taxDue},${row.gallonsPurchased},${row.taxPaid},${row.netTax}\n`
    }
    csv += `\nTotal,,${result.totalGallons},,${result.totalTaxDue},,${result.totalTaxPaid},${result.balance}\n`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `IFTA_${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [result, period])

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">IFTA Tax Helper</h1>
          <p className="text-sm text-slate-400">Simplify your quarterly fuel tax filing</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 uppercase tracking-wider">Reporting Period</label>
          <select value={period} onChange={e => { setPeriod(e.target.value); setResult(null) }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm">
            {getQuarterOptions().map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <span className="text-xs text-slate-500 ml-auto">{totalEntered.toLocaleString()} mi entered</span>
        </div>
      </div>

      {/* Summary Card (before calculation) */}
      <div className="glass rounded-2xl p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total Miles</p>
          <p className="text-2xl font-bold text-white mt-1">{totalEntered.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Fuel Purchases</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{fuelPurchases.reduce((s, f) => s + f.gallons, 0).toFixed(1)} gal</p>
        </div>
      </div>

      {/* State Mileage Grid */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">State Mileage</h2>
          <div className="flex gap-2">
            <input type="number" placeholder="Set total miles..."
              className="w-28 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder:text-slate-600"
              onBlur={e => handleSetTotalMiles(parseFloat(e.target.value) || 0)}
              onKeyDown={e => { if (e.key === 'Enter') handleSetTotalMiles(parseFloat((e.target as HTMLInputElement).value) || 0) }}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-2">Enter miles driven in each state this quarter, or set total miles above to auto-fill</p>
        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {STATES.map(st => (
            <div key={st} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 w-7 text-right">{st}</span>
              <input type="number" inputMode="decimal" value={stateMiles[st] || ''}
                onChange={e => setStateMiles(p => ({ ...p, [st]: e.target.value }))}
                placeholder="0"
                className="flex-1 bg-slate-900/80 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              />
              {fuelPurchases.filter(f => f.state === st).length > 0 && (
                <span className="text-[10px] text-blue-400 w-16 text-right">
                  {fuelPurchases.filter(f => f.state === st).reduce((s, f) => s + f.gallons, 0).toFixed(1)} gal
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Calculate Button */}
      <button onClick={handleCalculate} disabled={totalEntered <= 0}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl btn-active">
        Calculate IFTA
      </button>

      {/* Results */}
      {result && (
        <>
          {/* Balance Card */}
          <div className={`rounded-2xl p-5 text-center ${result.balance >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Quarterly Balance</p>
            <p className={`text-3xl font-bold mt-1 ${result.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.balance >= 0 ? '+' : ''}{formatCurrency(result.balance)}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {result.balance >= 0
                ? `You overpaid by ${formatCurrency(result.balance)} — file for a refund`
                : `You owe ${formatCurrency(Math.abs(result.balance))} — make a payment to avoid penalties`
              }
            </p>
          </div>

          {/* Detailed Breakdown Table */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">State Breakdown</h2>
              {isPremium ? (
                <button onClick={handleExportCSV}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-600/50 btn-active">
                  Export CSV
                </button>
              ) : (
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  👑 <span>Premium only</span>
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700/50">
                    <th className="text-left py-1.5 pr-2">State</th>
                    <th className="text-right py-1.5 px-2">Miles</th>
                    <th className="text-right py-1.5 px-2">Fuel (gal)</th>
                    <th className="text-right py-1.5 px-2">Tax Rate</th>
                    <th className="text-right py-1.5 px-2">Tax Due</th>
                    <th className="text-right py-1.5 px-2">Paid</th>
                    <th className="text-right py-1.5 pl-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stateEntries.map(row => (
                    <tr key={row.state} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-1.5 pr-2 font-medium text-white">{row.state}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{row.miles.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{row.fuelConsumed.toFixed(1)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{(row.taxRate / 100).toFixed(3)}</td>
                      <td className="py-1.5 px-2 text-right text-red-400">{formatCurrency(row.taxDue)}</td>
                      <td className="py-1.5 px-2 text-right text-emerald-400">{formatCurrency(row.taxPaid)}</td>
                      <td className={`py-1.5 pl-2 text-right font-medium ${row.netTax >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(row.netTax)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold text-white border-t border-slate-600">
                    <td className="py-2 pr-2">Total</td>
                    <td className="py-2 px-2 text-right">{result.totalMiles.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{result.totalGallons.toFixed(1)}</td>
                    <td className="py-2 px-2 text-right">—</td>
                    <td className="py-2 px-2 text-right text-red-400">{formatCurrency(result.totalTaxDue)}</td>
                    <td className="py-2 px-2 text-right text-emerald-400">{formatCurrency(result.totalTaxPaid)}</td>
                    <td className={`py-2 pl-2 text-right ${result.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(result.balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400">Avg MPG</p>
              <p className="text-lg font-bold text-emerald-400">{result.averageMpg.toFixed(2)}</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400">Total Gallons</p>
              <p className="text-lg font-bold text-white">{result.totalGallons.toFixed(1)}</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400">States</p>
              <p className="text-lg font-bold text-white">{result.stateEntries.length}</p>
            </div>
          </div>
        </>
      )}

      {/* Fuel Purchase Map */}
      {fuelPurchases.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Fuel Purchases by State</h2>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set(fuelPurchases.map(f => f.state))).sort().map(st => {
              const gal = fuelPurchases.filter(f => f.state === st).reduce((s, f) => s + f.gallons, 0)
              return (
                <div key={st} className="bg-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="font-semibold text-white">{st}</span>
                  <span className="text-blue-400 ml-1">{gal.toFixed(1)} gal</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}