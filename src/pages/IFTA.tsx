import { useState, useEffect } from 'react'
import { getExpenses, calculateCPM } from '../lib/db'

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function IFTA() {
  const [totalMiles, setTotalMiles] = useState(0)
  const [fuelExpenses, setFuelExpenses] = useState<{ state: string; gallons: number }[]>([])
  const [stateMiles, setStateMiles] = useState<Record<string, string>>({})

  useEffect(() => {
    calculateCPM().then(s => setTotalMiles(s.totalMiles))
    getExpenses().then(expenses => {
      const fuel = expenses.filter(e => e.category === 'fuel' && e.fuelGallons)
      setFuelExpenses(fuel.map(e => ({ state: e.fuelState || 'IN', gallons: e.fuelGallons || 0 })))
    })
  }, [])

  const totalGallons = fuelExpenses.reduce((s, f) => s + f.gallons, 0)
  const avgMpg = totalGallons > 0 ? totalMiles / totalGallons : 0

  return (
    <div className="px-4 pt-4 pb-20 space-y-4">
      <h1 className="text-xl font-bold text-white">IFTA Tax Helper</h1>
      <p className="text-sm text-slate-400">Simplify your quarterly fuel tax</p>

      {/* Summary Card */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
          <span className="text-sm text-slate-300">Total Miles</span>
          <span className="text-lg font-bold text-white">{totalMiles.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
          <span className="text-sm text-slate-300">Fuel Gallons</span>
          <span className="text-lg font-bold text-white">{totalGallons.toFixed(1)}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-slate-300">Avg MPG</span>
          <span className="text-lg font-bold text-emerald-400">{avgMpg.toFixed(2)}</span>
        </div>
      </div>

      {/* State Mileage Entry */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">State Mileage</h2>
        <p className="text-xs text-slate-400 mb-3">Enter miles driven in each state this quarter</p>
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {STATES.map(st => (
            <div key={st} className="flex items-center gap-1">
              <span className="text-xs font-medium text-slate-400 w-6">{st}</span>
              <input
                type="number"
                inputMode="numeric"
                value={stateMiles[st] || ''}
                onChange={e => setStateMiles(p => ({ ...p, [st]: e.target.value }))}
                placeholder="0"
                className="w-full bg-slate-900/80 border border-slate-700 rounded px-1.5 py-1 text-xs text-white placeholder:text-slate-700"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="glass rounded-xl p-4 text-center btn-active">
          <span className="text-sm font-medium text-emerald-400">Export Report</span>
          <p className="text-xs text-slate-400 mt-1">Download IFTA summary</p>
        </button>
        <button className="glass rounded-xl p-4 text-center btn-active">
          <span className="text-sm font-medium text-emerald-400">Clear Quarter</span>
          <p className="text-xs text-slate-400 mt-1">Start fresh period</p>
        </button>
      </div>
    </div>
  )
}