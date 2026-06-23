import { useState, useEffect, useRef, useCallback } from 'react'
import { getDetentionLogs, saveDetentionLog, deleteDetentionLog, haversineDistance } from '../lib/db'
import type { DetentionLog } from '../lib/types'

const DETENTION_RATE = 25 // $ per hour after free period
const FREE_PERIOD_MINUTES = 120 // industry standard 2-hour free window
const GEOFENCE_RADIUS_MILES = 0.5 // radius to auto-detect arrival

export default function Detention() {
  const [logs, setLogs] = useState<DetentionLog[]>([])
  const [running, setRunning] = useState<DetentionLog | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [customer, setCustomer] = useState('')
  const [location, setLocation] = useState('')
  const [rate, setRate] = useState(DETENTION_RATE)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [watchMode, setWatchMode] = useState<'manual' | 'auto'>('manual')
  const watchIdRef = useRef<number | null>(null)
  const [currentLogs, setCurrentLogs] = useState<DetentionLog[]>([])

  useEffect(() => { getDetentionLogs().then(setLogs) }, [])
  useEffect(() => { getDetentionLogs().then(setCurrentLogs) }, [])

  // Timer effect
  useEffect(() => {
    if (!running) { setElapsed(0); return }
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(running.startTime).getTime()
      setElapsed(Math.floor(diff / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  // Auto-detect GPS position
  useEffect(() => {
    if (watchMode !== 'auto') return
    if (!navigator.geolocation) { setWatchMode('manual'); return }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
    watchIdRef.current = watchId
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [watchMode])

  const handleStart = useCallback(() => {
    const log: DetentionLog = {
      id: crypto.randomUUID(),
      customer,
      location,
      startTime: new Date().toISOString(),
      status: 'active',
      startLat: gpsCoords?.lat,
      startLng: gpsCoords?.lng,
    }
    setRunning(log)
    // Save immediately so it persists even if browser closes
    saveDetentionLog(log)
  }, [customer, location, gpsCoords])

  const handleStop = useCallback(async () => {
    if (!running) return
    if (!customer) { alert('Please enter customer/broker name'); return }
    if (!location) { alert('Please enter location'); return }

    const endTime = new Date().toISOString()
    const durationMinutes = Math.round((Date.now() - new Date(running.startTime).getTime()) / 60000)

    // Calculate billable hours (after free period)
    const billableMinutes = Math.max(0, durationMinutes - FREE_PERIOD_MINUTES)
    const billableHours = Math.ceil(billableMinutes / 60) // rounded up to nearest hour
    const earnings = billableHours * rate

    const completed: DetentionLog = {
      ...running,
      customer,
      location,
      endTime,
      durationMinutes,
      status: 'completed',
      notes: `Billable: ${billableHours}h × $${rate}/hr = $${earnings.toFixed(2)}`,
    }

    await saveDetentionLog(completed)
    setLogs(prev => [completed, ...prev])
    setRunning(null)
    setCustomer('')
    setLocation('')
  }, [running, customer, location, rate])

  const handleDelete = useCallback(async (id: string) => {
    await deleteDetentionLog(id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }, [])

  const handleAutoDetect = useCallback(() => {
    if (!navigator.geolocation) { alert('GPS not available'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4)
        const lng = pos.coords.longitude.toFixed(4)
        setLocation(`GPS: ${lat}, ${lng}`)
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => alert('Could not get GPS position'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Calculate stats
  const totalDetentions = logs.length
  const totalBillableHours = logs.reduce((s, l) => {
    if (!l.durationMinutes) return s
    return s + Math.max(0, Math.ceil((l.durationMinutes - FREE_PERIOD_MINUTES) / 60))
  }, 0)
  const totalEarnings = logs.reduce((s, l) => {
    if (!l.durationMinutes) return s
    const billableMin = Math.max(0, l.durationMinutes - FREE_PERIOD_MINUTES)
    const billableHrs = Math.ceil(billableMin / 60)
    return s + billableHrs * DETENTION_RATE
  }, 0)

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Detention Timer</h1>
          <p className="text-sm text-slate-400">Track wait time & claim detention pay</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{totalDetentions}</p>
          <p className="text-[10px] text-slate-400">Detentions</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-400">{totalBillableHours}h</p>
          <p className="text-[10px] text-slate-400">Billable</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">${totalEarnings}</p>
          <p className="text-[10px] text-slate-400">Earned</p>
        </div>
      </div>

      {/* Timer Card */}
      <div className={`rounded-2xl p-6 ${running ? 'bg-amber-500/10 border-2 border-amber-500/30' : 'glass'}`}>
        {/* Timer Display */}
        <p className="text-5xl font-mono font-bold text-white text-center tracking-wider">
          {running ? formatTime(elapsed) : '00:00:00'}
        </p>
        <p className="text-xs text-slate-400 text-center mt-2 uppercase tracking-wider">
          {running ? 'Currently Waiting' : 'Press Start to begin tracking'}
        </p>

        {/* Form Inputs (only when not running or when starting) */}
        {!running && (
          <div className="mt-5 space-y-3">
            <div className="flex gap-2">
              <input type="text" value={customer} onChange={e => setCustomer(e.target.value)}
                placeholder="Customer / Broker name"
                className="flex-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-600" />
              <button onClick={handleAutoDetect}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 rounded-lg text-sm border border-slate-600 btn-active">
                📍 GPS
              </button>
            </div>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Location (e.g. Chicago, IL or shipper name)"
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-600" />
            <div>
              <label className="text-xs text-slate-400">Detention Rate ($/hr after {FREE_PERIOD_MINUTES}min free)</label>
              <input type="number" value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            {gpsCoords && (
              <p className="text-[10px] text-emerald-400">📍 GPS: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</p>
            )}

            <button onClick={handleStart}
              disabled={!customer || !location}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl btn-active text-lg">
              ▶ Start Detention Timer
            </button>
          </div>
        )}

        {running && (
          <div className="mt-5">
            <div className="glass rounded-xl p-3 mb-3 text-sm">
              <p className="text-slate-300">{running.customer || customer}</p>
              <p className="text-slate-400 text-xs">{running.location || location}</p>
              {running.startLat && running.startLng && (
                <p className="text-[10px] text-emerald-400 mt-1">📍 GPS locked at start</p>
              )}
            </div>
            <button onClick={handleStop}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl btn-active text-lg">
              ⏹ Stop & Calculate Detention
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Detention History</h2>
      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">No detentions logged yet</p>
          </div>
        ) : (
          logs.slice(0, 20).map(log => {
            const billableMin = log.durationMinutes ? Math.max(0, log.durationMinutes - FREE_PERIOD_MINUTES) : 0
            const billableHrs = Math.ceil(billableMin / 60)
            const earnings = billableHrs * DETENTION_RATE
            return (
              <div key={log.id} className="glass rounded-xl p-3 group">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${log.status === 'active' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                      <p className="text-sm font-medium text-white truncate">{log.customer}</p>
                    </div>
                    <p className="text-xs text-slate-400">{log.location}</p>
                    <div className="flex gap-3 mt-1 text-xs text-slate-500">
                      {log.durationMinutes && <span>{log.durationMinutes} min</span>}
                      {log.durationMinutes && (
                        <span className="text-emerald-400 font-medium">${earnings.toFixed(2)} earned</span>
                      )}
                      <span>{new Date(log.startTime).toLocaleDateString()}</span>
                    </div>
                    {log.durationMinutes && billableHrs > 0 && (
                      <p className="text-[10px] text-amber-400">{billableHrs}h billable (${rate}/hr)</p>
                    )}
                    {log.startLat && log.startLng && (
                      <p className="text-[10px] text-slate-600">📍 {log.startLat.toFixed(3)}, {log.startLng.toFixed(3)}</p>
                    )}
                  </div>
                  <button onClick={() => handleDelete(log.id)}
                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}