import { useState, useEffect } from 'react'
import { getLoads, getExpenses, calculateCPM } from '../lib/db'
import type { Load, Expense } from '../lib/types'

export default function Dashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [loads, setLoads] = useState<Load[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState({ totalMiles: 0, totalExpenses: 0, cpm: 0 })

  useEffect(() => {
    getLoads().then(setLoads)
    getExpenses().then(setExpenses)
    calculateCPM().then(setStats)
  }, [])

  const activeLoads = loads.filter(l => l.status === 'accepted')
  const recentEarnings = loads.filter(l => l.status === 'completed').reduce((s, l) => s + l.revenue, 0)

  return (
    <div className="px-4 pt-4 pb-20 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">MileMargin</h1>
          <p className="text-sm text-slate-400">Your profit co-pilot</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <span className="text-emerald-400 font-bold text-lg">$</span>
        </div>
      </div>

      {/* CPM Hero Card */}
      <div className="glass rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Cost Per Mile</p>
        <p className="text-4xl font-bold text-white mt-1">
          ${stats.cpm.toFixed(2)}
          <span className="text-base font-normal text-slate-400 ml-1">/mi</span>
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700/50">
          <div>
            <p className="text-xs text-slate-400">Total Miles</p>
            <p className="text-lg font-semibold text-white">{stats.totalMiles.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Expenses</p>
            <p className="text-lg font-semibold text-white">${stats.totalExpenses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onNavigate('rate')} className="glass rounded-xl p-4 text-left btn-active">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Active Loads</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeLoads.length}</p>
        </button>
        <button onClick={() => onNavigate('expenses')} className="glass rounded-xl p-4 text-left btn-active">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Earnings</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${recentEarnings.toLocaleString()}</p>
        </button>
      </div>

      {/* Recent Loads */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Recent Loads</h2>
        {loads.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">No loads yet</p>
            <p className="text-slate-500 text-xs mt-1">Add your first load in Rate Evaluator</p>
          </div>
        ) : (
          <div className="space-y-2">
            {loads.slice(0, 5).map(load => (
              <div key={load.id} className="glass rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-white">{load.customer}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{load.origin} → {load.destination}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">${load.revenue.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{load.miles} mi</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Recent Expenses</h2>
        {expenses.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">No expenses yet</p>
            <p className="text-slate-500 text-xs mt-1">Log fuel, tolls, and maintenance</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.slice(0, 5).map(exp => (
              <div key={exp.id} className="glass rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-white capitalize">{exp.category}</p>
                  <p className="text-xs text-slate-400">{exp.description}</p>
                </div>
                <p className="text-sm font-semibold text-red-400">-${exp.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}