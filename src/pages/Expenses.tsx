import { useState, useEffect, useCallback, useRef } from 'react'
import { getExpenses, saveExpense, deleteExpense } from '../lib/db'
import type { Expense, ExpenseCategory } from '../lib/types'
import { createWorker } from 'tesseract.js'

const CATEGORIES: ExpenseCategory[] = ['fuel', 'maintenance', 'tolls', 'food', 'lodging', 'insurance', 'payment', 'other']
const CATEGORY_ICONS: Record<string, string> = {
  fuel: '⛽', maintenance: '🔧', tolls: '🛣️', food: '🍔',
  lodging: '🏨', insurance: '🛡️', payment: '💳', other: '📋',
}

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('fuel')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [odometerMiles, setOdometerMiles] = useState('')
  const [fuelState, setFuelState] = useState('')
  const [fuelGallons, setFuelGallons] = useState('')
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [receiptText, setReceiptText] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { getExpenses().then(setExpenses) }, [])

  // Receipt OCR
  const handleReceiptUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      setReceiptImage(dataUrl)
      // Run OCR
      setOcrLoading(true)
      try {
        const worker = await createWorker('eng')
        const { data } = await worker.recognize(dataUrl)
        setReceiptText(data.text)
        // Try to extract amount
        const match = data.text.match(/\$\s*(\d+\.?\d{0,2})/)
        if (match && !amount) setAmount(match[1])
        await worker.terminate()
      } catch (err) {
        console.warn('OCR failed:', err)
        setReceiptText('')
      }
      setOcrLoading(false)
    }
    reader.readAsDataURL(file)
  }, [amount])

  const handleAdd = useCallback(async () => {
    if (!amount || !description) return
    const exp: Expense = {
      id: crypto.randomUUID(),
      amount: parseFloat(amount),
      category,
      description,
      date: new Date(date).toISOString(),
      odometerMiles: parseFloat(odometerMiles) || undefined,
      receiptText: receiptText || undefined,
      receiptImage: receiptImage || undefined,
      fuelState: category === 'fuel' ? fuelState : undefined,
      fuelGallons: category === 'fuel' ? parseFloat(fuelGallons) || undefined : undefined,
    }
    await saveExpense(exp)
    setExpenses(prev => [exp, ...prev])
    setAmount(''); setDescription(''); setReceiptImage(null); setReceiptText('')
    setOdometerMiles(''); setFuelGallons(''); setFuelState('')
    setShowForm(false)
  }, [amount, category, description, date, odometerMiles, fuelState, fuelGallons, receiptText, receiptImage])

  const handleDelete = useCallback(async (id: string) => {
    await deleteExpense(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleExportCSV = useCallback(() => {
    let csv = 'Date,Category,Description,Amount,Odometer,Fuel State,Fuel Gallons,Receipt Text\n'
    for (const e of expenses) {
      csv += `${e.date.split('T')[0]},${e.category},"${e.description}",${e.amount},${e.odometerMiles||''},${e.fuelState||''},${e.fuelGallons||''},"${(e.receiptText||'').replace(/"/g,'""')}"\n`
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'MileMargin_Expenses.csv'; a.click()
    URL.revokeObjectURL(url)
  }, [expenses])

  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat)
  const allTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const fuelTotal = expenses.filter(e => e.category === 'fuel').reduce((s, e) => s + e.amount, 0)
  const fuelGallonsTotal = expenses.filter(e => e.fuelGallons).reduce((s, e) => s + (e.fuelGallons || 0), 0)

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-slate-400">Track fuel, tolls & maintenance</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-red-400">-${allTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{expenses.length}</p>
          <p className="text-[10px] text-slate-400">Entries</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-orange-400">{fuelTotal.toFixed(0)}</p>
          <p className="text-[10px] text-slate-400">Fuel $</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-400">{fuelGallonsTotal.toFixed(1)}</p>
          <p className="text-[10px] text-slate-400">Gallons</p>
        </div>
      </div>

      {/* Add & Export Buttons */}
      <div className="flex gap-2">
        <button onClick={() => setShowForm(!showForm)}
          className="flex-1 glass rounded-xl py-3 text-emerald-400 font-medium btn-active border border-dashed border-emerald-500/30">
          {showForm ? '− Cancel' : '+ Log Expense'}
        </button>
        {expenses.length > 0 && (
          <button onClick={handleExportCSV}
            className="glass rounded-xl px-4 py-3 text-slate-300 text-sm btn-active">
            CSV
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilterCat('all')}
          className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${filterCat === 'all' ? 'bg-emerald-500/30 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
          All
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap capitalize ${filterCat === c ? 'bg-emerald-500/30 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
            {CATEGORY_ICONS[c]} {c}
          </button>
        ))}
      </div>

      {/* Expense Form */}
      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Amount ($)</label>
              <input type="number" inputMode="decimal" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 text-white">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{CATEGORY_ICONS[c]} {c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Fuel at Pilot #123" className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Odometer (mi)</label>
              <input type="number" value={odometerMiles} onChange={e => setOdometerMiles(e.target.value)}
                placeholder="123456" className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            {category === 'fuel' && (
              <>
                <div>
                  <label className="text-xs text-slate-400">State</label>
                  <select value={fuelState} onChange={e => setFuelState(e.target.value)}
                    className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 text-white">
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Gallons</label>
                  <input type="number" inputMode="decimal" value={fuelGallons}
                    onChange={e => setFuelGallons(e.target.value)} placeholder="0.0"
                    className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                </div>
              </>
            )}
          </div>

          {/* Receipt OCR */}
          <div>
            <label className="text-xs text-slate-400">Receipt Scan (OCR)</label>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
              onChange={handleReceiptUpload} className="hidden" />
            <div className="mt-1 flex gap-2">
              <button onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded-lg py-3 text-sm text-slate-400">
                {ocrLoading ? '📷 Scanning...' : '📷 Capture Receipt'}
              </button>
              {receiptImage && (
                <button onClick={() => { setReceiptImage(null); setReceiptText('') }}
                  className="text-xs text-red-400">Clear</button>
              )}
            </div>
            {receiptImage && (
              <div className="mt-2">
                <img src={receiptImage} alt="Receipt" className="max-h-32 rounded-lg mx-auto" />
                {receiptText && (
                  <textarea value={receiptText} onChange={e => setReceiptText(e.target.value)}
                    rows={2} className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white" />
                )}
              </div>
            )}
          </div>

          <button onClick={handleAdd} disabled={!amount || !description}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2.5 rounded-xl">
            Save Expense
          </button>
        </div>
      )}

      {/* Expense List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-slate-400">No expenses logged yet</p>
            <p className="text-slate-500 text-xs mt-1">Tap "+ Log Expense" to get started</p>
          </div>
        ) : (
          filtered.map(exp => (
            <div key={exp.id} className="glass rounded-xl p-3 group">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[exp.category] || '📋'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white capitalize">{exp.category}</p>
                      <span className="text-[10px] text-slate-500">{new Date(exp.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-400">{exp.description}</p>
                    {exp.odometerMiles && <p className="text-[10px] text-slate-500">Odometer: {exp.odometerMiles} mi</p>}
                    {exp.fuelState && exp.fuelGallons && (
                      <p className="text-[10px] text-blue-400">{exp.fuelState} · {exp.fuelGallons} gal</p>
                    )}
                    {exp.receiptImage && <p className="text-[10px] text-slate-600 mt-0.5">📷 Receipt scanned</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-red-400">-${exp.amount.toFixed(2)}</p>
                  <button onClick={() => handleDelete(exp.id)}
                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}