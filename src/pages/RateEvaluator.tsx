import { useState, useEffect, useCallback } from 'react'
import { evaluateRate, getRateEvaluations, getRateEvaluationsThisMonth, getSettings } from '../lib/db'
import { generateRateVerificationPdf } from '../lib/pdf'
import type { RateEvaluation, UserSettings } from '../lib/types'

const FREE_TIER_LIMIT = 5

export default function RateEvaluator() {
  // Form inputs
  const [customer, setCustomer] = useState('')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [revenue, setRevenue] = useState('')
  const [miles, setMiles] = useState('')
  const [cpm, setCpm] = useState(1.85)
  const [fuelPrice, setFuelPrice] = useState(3.50)
  const [mpg, setMpg] = useState(6.5)
  const [tolls, setTolls] = useState('')
  const [accessorials, setAccessorials] = useState('')
  const [brokerFees, setBrokerFees] = useState('')
  const [notes, setNotes] = useState('')

  // State
  const [result, setResult] = useState<RateEvaluation | null>(null)
  const [history, setHistory] = useState<RateEvaluation[]>([])
  const [loading, setLoading] = useState(false)
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [settings, setSettings] = useState<UserSettings | null>(null)

  // Load settings and history on mount
  useEffect(() => {
    getSettings().then(s => {
      setSettings(s)
      setCpm(s.operatingCPM)
      setFuelPrice(s.fuelPricePerGallon)
      setMpg(s.averageMpg)
    })
    getRateEvaluations().then(setHistory)
    getRateEvaluationsThisMonth().then(setMonthlyCount)
  }, [])

  // Real-time calculations (derived, not stored)
  const numMiles = parseFloat(miles) || 0
  const numRevenue = parseFloat(revenue) || 0
  const numTolls = parseFloat(tolls) || 0
  const numAccessorials = parseFloat(accessorials) || 0
  const numBrokerFees = parseFloat(brokerFees) || 0
  const numFuelCost = numMiles > 0 ? (numMiles / mpg) * fuelPrice : 0

  const ratePerMile = numMiles > 0 ? numRevenue / numMiles : 0
  const estOperatingCost = numMiles * cpm
  const totalAdditional = numFuelCost + numTolls + numAccessorials + numBrokerFees
  const totalCost = estOperatingCost + totalAdditional
  const estProfit = numRevenue - totalCost
  const profitMargin = numRevenue > 0 ? (estProfit / numRevenue) * 100 : 0
  const isProfitable = estProfit >= 0

  const atLimit = monthlyCount >= FREE_TIER_LIMIT && !settings // free tier check

  const handleEvaluate = useCallback(async () => {
    if (!revenue || !miles || numMiles <= 0) return
    if (atLimit) {
      alert(`Free tier limited to ${FREE_TIER_LIMIT} evaluations per month. Upgrade to Premium for unlimited checks!`)
      return
    }
    setLoading(true)
    try {
      const res = await evaluateRate(
        numRevenue,
        numMiles,
        cpm,
        numFuelCost,
        numTolls,
        numAccessorials,
        numBrokerFees,
        customer,
        origin,
        destination,
        notes || undefined,
      )
      setResult(res)
      setHistory(prev => [res, ...prev])
      setMonthlyCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }, [revenue, miles, numRevenue, numMiles, cpm, numFuelCost, numTolls, numAccessorials, numBrokerFees, customer, origin, destination, notes, atLimit])

  const handleExportPdf = useCallback((evalResult: RateEvaluation) => {
    generateRateVerificationPdf(evalResult)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const { deleteRateEvaluation } = await import('../lib/db')
    await deleteRateEvaluation(id)
    setHistory(prev => prev.filter(e => e.id !== id))
  }, [])

  const formatCurrency = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Quick Rate Evaluator</h1>
          <p className="text-sm text-slate-400">Check if a load is worth taking</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">
            {monthlyCount}/{FREE_TIER_LIMIT} free checks
          </p>
        </div>
      </div>

      {/* Input Form */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Customer / Broker</label>
            <input type="text" value={customer} onChange={e => setCustomer(e.target.value)}
              placeholder="e.g. Swift Transport"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Reference #"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Origin</label>
            <input type="text" value={origin} onChange={e => setOrigin(e.target.value)}
              placeholder="Chicago, IL"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Destination</label>
            <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
              placeholder="Dallas, TX"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Gross Revenue ($)</label>
            <input type="number" inputMode="decimal" value={revenue}
              onChange={e => setRevenue(e.target.value)}
              placeholder="2500"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-lg font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Total Miles</label>
            <input type="number" inputMode="decimal" value={miles}
              onChange={e => setMiles(e.target.value)}
              placeholder="1200"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-lg font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-400">Your CPM ($)</label>
            <input type="number" value={cpm} onChange={e => setCpm(parseFloat(e.target.value) || 0)}
              step="0.01"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Fuel $/gal</label>
            <input type="number" value={fuelPrice} onChange={e => setFuelPrice(parseFloat(e.target.value) || 0)}
              step="0.01"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">MPG</label>
            <input type="number" value={mpg} onChange={e => setMpg(parseFloat(e.target.value) || 0)}
              step="0.1"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-400">Tolls ($)</label>
            <input type="number" inputMode="decimal" value={tolls}
              onChange={e => setTolls(e.target.value)}
              placeholder="0"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Accessorials ($)</label>
            <input type="number" inputMode="decimal" value={accessorials}
              onChange={e => setAccessorials(e.target.value)}
              placeholder="0"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Broker Fees ($)</label>
            <input type="number" inputMode="decimal" value={brokerFees}
              onChange={e => setBrokerFees(e.target.value)}
              placeholder="0"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <button
          onClick={handleEvaluate}
          disabled={loading || !revenue || !miles || atLimit}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-all btn-active mt-1"
        >
          {atLimit
            ? `Free Limit Reached (${FREE_TIER_LIMIT}/mo)`
            : loading
              ? 'Calculating...'
              : 'Evaluate Rate'
          }
        </button>
      </div>

      {/* Real-Time Preview */}
      {revenue && miles && numMiles > 0 && (
        <div className="glass rounded-2xl p-5 space-y-2">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Live Preview</p>
          <div className="flex justify-between py-1.5 border-b border-slate-700/50">
            <span className="text-sm text-slate-300">Rate Per Mile</span>
            <span className="text-base font-bold text-white">{ratePerMile.toFixed(2)}¢/mi</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-700/50">
            <span className="text-sm text-slate-300">
              Fuel Cost ({numMiles.toFixed(0)}mi ÷ {mpg}mpg × ${fuelPrice.toFixed(2)})
            </span>
            <span className="text-base font-bold text-orange-400">{formatCurrency(numFuelCost)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-700/50">
            <span className="text-sm text-slate-300">Operating Cost ({numMiles}mi × ${cpm.toFixed(2)})</span>
            <span className="text-base font-bold text-red-400">{formatCurrency(estOperatingCost)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-700/50">
            <span className="text-sm text-slate-300">Additional (Tolls + Accessorials + Broker)</span>
            <span className="text-base font-bold text-red-400">{formatCurrency(totalAdditional)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-700/50">
            <span className="text-sm text-slate-300 font-medium">Total Cost</span>
            <span className="text-base font-bold text-red-400">{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-sm text-slate-300 font-medium">Est. Profit</span>
            <div className="text-right">
              <span className={`text-base font-bold ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(estProfit)}
              </span>
              <span className={`text-xs ml-1.5 ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                ({profitMargin.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Result with PDF Export */}
      {result && (
        <div className={`rounded-2xl p-5 ${result.isProfitable ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-lg font-bold ${result.isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.isProfitable ? '✅ Profitable Load' : '⚠️ Below Cost'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {result.isProfitable
                  ? `Net profit of ${formatCurrency(result.estimatedProfit)} (${result.profitMargin.toFixed(1)}% margin)`
                  : `Net loss of ${formatCurrency(Math.abs(result.estimatedProfit))} at this rate`
                }
              </p>
            </div>
            <p className="text-xs text-slate-500">#{result.id.slice(0, 6).toUpperCase()}</p>
          </div>
          <button
            onClick={() => handleExportPdf(result)}
            className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 rounded-xl border border-white/20 transition-all btn-active"
          >
            📄 Generate Rate Verification PDF
          </button>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Evaluation History ({history.length})
        </h2>
        {history.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">No evaluations saved yet</p>
            <p className="text-slate-500 text-xs mt-1">Complete a rate check to see it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 20).map(eval_ => (
              <div key={eval_.id} className="glass rounded-xl p-3 group">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${eval_.isProfitable ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <p className="text-sm font-medium text-white truncate">
                        {eval_.customer || 'Unknown'} — {eval_.origin || '?'} → {eval_.destination || '?'}
                      </p>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-slate-400">
                      <span>{eval_.miles} mi</span>
                      <span>{formatCurrency(eval_.revenue)}</span>
                      <span className={eval_.isProfitable ? 'text-emerald-400' : 'text-red-400'}>
                        {eval_.isProfitable ? '+' : ''}{formatCurrency(eval_.estimatedProfit)}
                      </span>
                      <span className="text-slate-500">{eval_.profitMargin.toFixed(1)}%</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {new Date(eval_.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleExportPdf(eval_)}
                      className="text-slate-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                      title="Export PDF"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(eval_.id)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}