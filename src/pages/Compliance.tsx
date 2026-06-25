import { useState, useEffect, useCallback } from 'react'
import { getComplianceDocuments, saveComplianceDocument, deleteComplianceDocument, getActiveComplianceAlerts, computeDocStatus } from '../lib/db'
import { usePremium } from '../lib/usePremium'
import type { ComplianceDocument } from '../lib/types'

const DEFAULT_DOCUMENTS = [
  { name: 'MC/DOT Authority', authority: 'FMCSA', refPrefix: 'MC-' },
  { name: 'UCR (Unified Carrier Registration)', authority: 'UCR Board', refPrefix: 'UCR-' },
  { name: 'IFTA License', authority: 'IFTA', refPrefix: 'IFTA-' },
  { name: 'IRP Apportioned Plates', authority: 'IRP', refPrefix: 'IRP-' },
  { name: 'Medical Examiner Certificate', authority: 'FMCSA', refPrefix: 'MED-' },
  { name: 'CDL', authority: 'State DMV', refPrefix: 'CDL-' },
  { name: 'KYU (Kentucky Weight Distance)', authority: 'KYTC', refPrefix: 'KYU-' },
  { name: 'NY HUT (New York Highway Use)', authority: 'NYSDOT', refPrefix: 'NYHUT-' },
  { name: 'NM Permit', authority: 'NMDOT', refPrefix: 'NM-' },
  { name: 'OR Permit (Oregon)', authority: 'ODOT', refPrefix: 'OR-' },
]

const FREE_TIER_LIMIT = 3

export default function Compliance() {
  const { isPremium } = usePremium()
  const [docs, setDocs] = useState<ComplianceDocument[]>([])
  const [showForm, setShowForm] = useState(false)
  const [alertsCount, setAlertsCount] = useState(0)

  // Form state
  const [name, setName] = useState('')
  const [issuingAuthority, setIssuingAuthority] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    getComplianceDocuments().then(setDocs)
    getActiveComplianceAlerts().then(setAlertsCount)
  }, [])

  const handleAdd = useCallback(async () => {
    if (!name || !expirationDate) return
    const doc: ComplianceDocument = {
      id: crypto.randomUUID(),
      name,
      issuingAuthority,
      referenceNumber,
      expirationDate,
      status: computeDocStatus(expirationDate),
      notes,
      createdAt: new Date().toISOString(),
      notifyAtDays: [60, 30, 7],
    }
    await saveComplianceDocument(doc)
    setDocs(prev => [...prev, doc].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()))
    setAlertsCount(prev => doc.status !== 'active' ? prev + 1 : prev)
    setShowForm(false)
    setName('')
    setIssuingAuthority('')
    setReferenceNumber('')
    setExpirationDate('')
    setNotes('')
  }, [name, issuingAuthority, referenceNumber, expirationDate, notes])

  const handleDelete = useCallback(async (id: string) => {
    await deleteComplianceDocument(id)
    const updated = docs.filter(d => d.id !== id)
    setDocs(updated)
    setAlertsCount(updated.filter(d => d.status !== 'active').length)
  }, [docs])

  const handleQuickAdd = useCallback(async (template: typeof DEFAULT_DOCUMENTS[0]) => {
    if (!isPremium && alertsCount >= FREE_TIER_LIMIT) {
      alert(`Free tier limited to ${FREE_TIER_LIMIT} active alerts. Upgrade to Premium for unlimited compliance tracking!`)
      return
    }
    const expiry = new Date()
    expiry.setFullYear(expiry.getFullYear() + 1)
    const doc: ComplianceDocument = {
      id: crypto.randomUUID(),
      name: template.name,
      issuingAuthority: template.authority,
      referenceNumber: template.refPrefix + Math.random().toString(36).slice(2, 8).toUpperCase(),
      expirationDate: expiry.toISOString().split('T')[0],
      status: 'active',
      createdAt: new Date().toISOString(),
      notifyAtDays: [60, 30, 7],
    }
    await saveComplianceDocument(doc)
    setDocs(prev => [...prev, doc].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()))
    setAlertsCount(prev => prev + 1)
  }, [alertsCount])

  // Group docs by status
  const expired = docs.filter(d => d.status === 'expired')
  const expiring = docs.filter(d => d.status === 'expiring')
  const active = docs.filter(d => d.status === 'active')

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Compliance</h1>
          <p className="text-sm text-slate-400">Never miss a renewal</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">{isPremium ? '∞' : `${alertsCount}/${FREE_TIER_LIMIT}`} active alerts</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{active.length}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{expiring.length}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Expiring</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{expired.length}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Expired</p>
        </div>
      </div>

      {/* Quick Add Templates */}
      <div className="glass rounded-2xl p-4">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-2">Quick Add Document</p>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_DOCUMENTS.map(t => (
            <button
              key={t.name}
              onClick={() => handleQuickAdd(t)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors btn-active"
            >
              + {t.name.split('(')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Add Custom Form */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full glass rounded-xl py-3 text-emerald-400 font-medium btn-active border border-dashed border-emerald-500/30"
      >
        {showForm ? '− Cancel' : '+ Add Custom Document'}
      </button>

      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Document Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. KYU Permit"
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Issuing Authority</label>
              <input type="text" value={issuingAuthority} onChange={e => setIssuingAuthority(e.target.value)}
                placeholder="e.g. KYTC"
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Reference Number</label>
              <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. MC-123456"
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Expiration Date</label>
              <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <button onClick={handleAdd} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl">
            Save Document
          </button>
        </div>
      )}

      {/* Expired Documents */}
      {expired.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Expired</h2>
          {expired.map(doc => <DocCard key={doc.id} doc={doc} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Expiring Documents */}
      {expiring.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Expiring Soon</h2>
          {expiring.map(doc => <DocCard key={doc.id} doc={doc} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Active Documents */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
          All Documents ({docs.length})
        </h2>
        {docs.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-slate-400 text-sm">No documents tracked yet</p>
            <p className="text-slate-500 text-xs mt-1">Add your first compliance document using the Quick Add buttons</p>
          </div>
        ) : (
          docs.map(doc => <DocCard key={doc.id} doc={doc} onDelete={handleDelete} />)
        )}
      </div>
    </div>
  )
}

function DocCard({ doc, onDelete }: { doc: ComplianceDocument; onDelete: (id: string) => void }) {
  const daysLeft = Math.ceil((new Date(doc.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return (
    <div className="glass rounded-xl p-3 mb-2 group">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${doc.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : doc.status === 'expiring' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {doc.status === 'active' ? '✅' : doc.status === 'expiring' ? '⚠️' : '❌'}
            </span>
            <p className="text-sm font-medium text-white truncate">{doc.name}</p>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{doc.issuingAuthority} · {doc.referenceNumber}</p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-slate-500">Expires: {new Date(doc.expirationDate).toLocaleDateString()}</p>
            <p className={`text-xs font-medium ${daysLeft > 60 ? 'text-emerald-400' : daysLeft > 7 ? 'text-amber-400' : daysLeft >= 0 ? 'text-red-400' : 'text-red-500'}`}>
              {daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`}
            </p>
          </div>
          {doc.notes && <p className="text-[10px] text-slate-600 mt-1">{doc.notes}</p>}
        </div>
        <button onClick={() => onDelete(doc.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}