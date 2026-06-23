import { useState, useEffect } from 'react'
import { getExpenses, saveExpense, deleteExpense } from '../lib/db'
import type { Expense, ExpenseCategory } from '../lib/types'

const CATEGORIES: ExpenseCategory[] = ['fuel', 'maintenance', 'tolls', 'food', 'lodging', 'insurance', 'payment', 'other']
const CATEGORY_COLORS: Record<string, string> = {
  fuel: 'text-orange-400',
  maintenance: 'text-yellow-400',
  tolls: 'text-blue-400',
  food: 'text-green-400',
  lodging: 'text-purple-400',
  insurance: 'text-cyan-400',
  payment: 'text-pink-400',
  other: 'text-slate-400',
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('fuel')
  const [description, setDescription] = useState('')

  useEffect(() => { getExpenses().then(setExpenses) }, [])

  const handleAdd = async () => {
    if (!amount || !description) return
    const exp: Expense = {
      id: crypto.randomUUID(),
      amount: parseFloat(amount),
      category,
      description,
      date: new Date().toISOString(),
    }
    await saveExpense(exp)
    setExpenses(prev => [exp, ...prev])
    setAmount('')
    setDescription('')
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    await deleteExpense(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="px-4 pt-4 pb-20 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-slate-400">Track fuel, tolls & maintenance</p>
        </div>
        <p className="text-lg font-bold text-red-400">-${total.toFixed(2)}</p>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full glass rounded-xl py-3 text-emerald-400 font-medium btn-active border border-dashed border-emerald-500/30"
      >
        {showForm ? '− Cancel' : '+ Log Expense'}
      </button>

      {/* Add Form */}
      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-3 animate-in">
          <div>
            <label className="text-xs text-slate-400">Amount ($)</label>
            <input
              type="number" inputMode="decimal" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 text-white"
            >
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Description</label>
            <input
              type="text" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Fuel at Pilot #123"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <button onClick={handleAdd} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl">
            Save Expense
          </button>
        </div>
      )}

      {/* Expense List */}
      <div className="space-y-2">
        {expenses.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-slate-400">No expenses logged yet</p>
            <p className="text-slate-500 text-xs mt-1">Tap "+ Log Expense" to get started</p>
          </div>
        ) : (
          expenses.map(exp => (
            <div key={exp.id} className="glass rounded-xl p-3 flex justify-between items-center group">
              <div className="flex items-center gap-3">
                <span className={`text-lg ${CATEGORY_COLORS[exp.category] || 'text-slate-400'}`}>●</span>
                <div>
                  <p className="text-sm font-medium text-white capitalize">{exp.category}</p>
                  <p className="text-xs text-slate-400">{exp.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-red-400">-${exp.amount.toFixed(2)}</p>
                <button onClick={() => handleDelete(exp.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}