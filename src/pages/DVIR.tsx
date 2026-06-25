import { useState, useEffect, useRef, useCallback } from 'react'
import { getDVIRInspections, saveDVIRInspection, deleteDVIRInspection } from '../lib/db'
import { generateDVIRPdf } from '../lib/pdf'
import { usePremium } from '../lib/usePremium'
import type { DVIRInspection, DVIRItem } from '../lib/types'

const CHECKLIST_CATEGORIES: { category: string; items: string[] }[] = [
  { category: 'Brakes', items: ['Service Brakes', 'Parking Brake', 'Brake Hoses', 'Brake Chambers/Slack Adjusters'] },
  { category: 'Tires & Wheels', items: ['Tire Condition', 'Tire Inflation', 'Wheel/Rim Condition', 'Lug Nuts'] },
  { category: 'Lights', items: ['Headlights', 'Taillights', 'Turn Signals', 'Brake Lights', 'Clearance Lights'] },
  { category: 'Coupling Devices', items: ['Fifth Wheel', 'Kingpin', 'Air/Electric Lines', 'Gladhands'] },
  { category: 'Cab Interior', items: ['Windshield/Wipers', 'Mirrors', 'Horn', 'Seat Belt', 'Dashboard Gauges'] },
  { category: 'Steering', items: ['Steering Wheel', 'Steering Linkage', 'Power Steering Fluid'] },
  { category: 'Suspension', items: ['Springs/Air Bags', 'Shock Absorbers', 'Torque Rods'] },
  { category: 'Exhaust', items: ['Exhaust System', 'DPF/Regen Status'] },
  { category: 'Fuel System', items: ['Fuel Tanks', 'Fuel Lines', 'DEF System'] },
  { category: 'Emergency', items: ['Fire Extinguisher', 'Reflective Triangles', 'Spare Fuses', 'First Aid Kit'] },
]

export default function DVIR() {
  const { isPremium, loading } = usePremium()
  const [inspections, setInspections] = useState<DVIRInspection[]>([])
  const [mode, setMode] = useState<'list' | 'inspect'>('list')
  const [inspectionType, setInspectionType] = useState<'pre-trip' | 'post-trip'>('pre-trip')
  const [driverName, setDriverName] = useState('')
  const [truckNumber, setTruckNumber] = useState('')
  const [odometer, setOdometer] = useState('')
  const [trailerNumber, setTrailerNumber] = useState('')
  const [location, setLocation] = useState('')
  const [remarks, setRemarks] = useState('')
  const [items, setItems] = useState<DVIRItem[]>([])
  const [signature, setSignature] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => { getDVIRInspections().then(setInspections) }, [])

  // Capture GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  const initChecklist = useCallback(() => {
    const list: DVIRItem[] = []
    for (const cat of CHECKLIST_CATEGORIES) {
      for (const item of cat.items) {
        list.push({ category: cat.category, name: item, status: 'pass' })
      }
    }
    setItems(list)
  }, [])

  const startInspection = useCallback(() => {
    initChecklist()
    setSignature(null)
    setMode('inspect')
  }, [initChecklist])

  const updateItem = (index: number, status: DVIRItem['status']) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, status } : item))
  }

  const updateItemNote = (index: number, note: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, note } : item))
  }

  // Signature pad
  const startSign = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 280
    canvas.height = 80
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    let drawing = false
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onStart = (e: MouseEvent | TouchEvent) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
    const onMove = (e: MouseEvent | TouchEvent) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke() }
    const onEnd = () => { drawing = false; setSignature(canvas.toDataURL()) }

    canvas.addEventListener('mousedown', onStart)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseup', onEnd)
    canvas.addEventListener('touchstart', onStart as any, { passive: false })
    canvas.addEventListener('touchmove', onMove as any, { passive: false })
    canvas.addEventListener('touchend', onEnd)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignature(null)
  }

  const handleSubmit = async () => {
    const defectCount = items.filter(i => i.status === 'fail').length
    const status: DVIRInspection['status'] = defectCount === 0 ? 'pass' : 'conditional'
    const inspection: DVIRInspection = {
      id: crypto.randomUUID(),
      type: inspectionType,
      driverName,
      truckNumber,
      odometer: parseInt(odometer) || 0,
      trailerNumber,
      date: new Date().toISOString(),
      latitude: coordinates?.lat,
      longitude: coordinates?.lng,
      location,
      items,
      signature: signature || undefined,
      defectCount,
      status,
      remarks,
      createdAt: new Date().toISOString(),
    }
    await saveDVIRInspection(inspection)
    setInspections(prev => [inspection, ...prev])
    setMode('list')
  }

  const handleDelete = async (id: string) => {
    await deleteDVIRInspection(id)
    setInspections(prev => prev.filter(i => i.id !== id))
  }

  const handleExportPdf = useCallback((inspection: DVIRInspection) => {
    generateDVIRPdf(inspection)
  }, [])

  // Group checklist by category for display
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, DVIRItem[]>)

  if (loading) {
    return <div className="px-4 pt-4 text-center"><div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" /></div>
  }

  if (!isPremium) {
    return (
      <div className="px-4 pt-4 pb-24 space-y-4">
        <h1 className="text-xl font-bold text-white">DVIR</h1>
        <div className="glass rounded-2xl p-8 text-center space-y-3">
          <span className="text-4xl">👑</span>
          <h2 className="text-lg font-bold text-white">Premium Feature</h2>
          <p className="text-sm text-slate-400">
            Driver Vehicle Inspection Reports (DVIR) are available exclusively on the Premium plan.
          </p>
          <a href="/account"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl btn-active">
            Upgrade to Premium
          </a>
        </div>
      </div>
    )
  }

  if (mode === 'inspect') {
    return (
      <div className="px-4 pt-4 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white capitalize">{inspectionType} Inspection</h1>
          <button onClick={() => setMode('list')} className="text-sm text-slate-400 hover:text-white">← Back</button>
        </div>

        {/* Vehicle Info */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Driver Name</label>
              <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)}
                placeholder="John Doe"
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Truck #</label>
              <input type="text" value={truckNumber} onChange={e => setTruckNumber(e.target.value)}
                placeholder="TRK-001"
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Odometer</label>
              <input type="number" value={odometer} onChange={e => setOdometer(e.target.value)}
                placeholder="123456"
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Trailer #</label>
              <input type="text" value={trailerNumber} onChange={e => setTrailerNumber(e.target.value)}
                placeholder="TRL-001"
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Dallas, TX"
              className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          {coordinates && (
            <p className="text-[10px] text-emerald-400">📍 GPS: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}</p>
          )}
        </div>

        {/* Inspection Checklist */}
        {Object.entries(groupedItems).map(([category, catItems]) => (
          <div key={category} className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-emerald-400 mb-2">{category}</h3>
            <div className="space-y-2">
              {catItems.map((item) => {
                const globalIdx = items.indexOf(item)
                return (
                  <div key={item.name} className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/50">
                    <button onClick={() => updateItem(globalIdx, 'pass')}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${item.status === 'pass' ? 'bg-emerald-500/30 border-emerald-400 text-emerald-400' : 'border-slate-600 text-slate-500'}`}>✓</button>
                    <button onClick={() => updateItem(globalIdx, 'fail')}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${item.status === 'fail' ? 'bg-red-500/30 border-red-400 text-red-400' : 'border-slate-600 text-slate-500'}`}>✗</button>
                    <button onClick={() => updateItem(globalIdx, 'na')}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border ${item.status === 'na' ? 'bg-slate-500/30 border-slate-400 text-slate-300' : 'border-slate-600 text-slate-500'}`}>—</button>
                    <div className="flex-1 ml-1">
                      <p className={`text-sm ${item.status === 'fail' ? 'text-red-400' : 'text-white'}`}>{item.name}</p>
                      {item.status === 'fail' && (
                        <input type="text" value={item.note || ''}
                          onChange={e => updateItemNote(globalIdx, e.target.value)}
                          placeholder="Describe defect..."
                          className="w-full mt-1 bg-slate-800 border border-red-500/30 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Remarks */}
        <div className="glass rounded-2xl p-4">
          <label className="text-xs text-slate-400">Remarks</label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>

        {/* Signature */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Digital Signature</h3>
          {!signature ? (
            <button onClick={startSign} className="w-full bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded-xl py-4 text-slate-400 text-sm">
              ✍️ Tap to Sign
            </button>
          ) : (
            <div>
              <img src={signature} alt="Signature" className="w-full max-w-xs mx-auto rounded-lg bg-slate-900" />
              <button onClick={clearSignature} className="text-xs text-red-400 mt-1">Clear</button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit}
          disabled={!driverName || !truckNumber}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl btn-active">
          Submit {inspectionType === 'pre-trip' ? 'Pre-Trip' : 'Post-Trip'} Report
        </button>
      </div>
    )
  }

  // === LIST VIEW ===
  const failedCount = inspections.reduce((s, i) => s + i.defectCount, 0)

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">DVIR</h1>
          <p className="text-sm text-slate-400">Driver Vehicle Inspection Reports</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Inspections</p>
          <p className="text-2xl font-bold text-white mt-1">{inspections.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Defects Found</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{failedCount}</p>
        </div>
      </div>

      {/* Start New */}
      <div className="flex gap-3">
        <button onClick={() => { setInspectionType('pre-trip'); startInspection() }}
          className="flex-1 glass rounded-xl py-4 text-center hover:bg-slate-700/60 btn-active">
          <p className="text-lg">🔍</p>
          <p className="text-sm font-medium text-emerald-400 mt-1">Pre-Trip</p>
        </button>
        <button onClick={() => { setInspectionType('post-trip'); startInspection() }}
          className="flex-1 glass rounded-xl py-4 text-center hover:bg-slate-700/60 btn-active">
          <p className="text-lg">✅</p>
          <p className="text-sm font-medium text-emerald-400 mt-1">Post-Trip</p>
        </button>
      </div>

      {/* History */}
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Inspection History</h2>
      {inspections.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">No inspections yet</p>
          <p className="text-slate-500 text-xs mt-1">Start a pre-trip or post-trip inspection above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inspections.map(insp => (
            <div key={insp.id} className="glass rounded-xl p-3 group">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${insp.status === 'pass' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {insp.status === 'pass' ? '✅ Pass' : '⚠️ Conditional'}
                    </span>
                    <p className="text-sm font-medium text-white capitalize">{insp.type}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {insp.driverName} · {insp.truckNumber} · {insp.odometer} mi
                  </p>
                  <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                    <span>{new Date(insp.date).toLocaleDateString()}</span>
                    {insp.defectCount > 0 && <span className="text-red-400">{insp.defectCount} defects</span>}
                    {insp.location && <span>📍 {insp.location}</span>}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => handleExportPdf(insp)}
                    className="text-slate-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all p-1" title="Export PDF">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(insp.id)}
                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1" title="Delete">
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
  )
}