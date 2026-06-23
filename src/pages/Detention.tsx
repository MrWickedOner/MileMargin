import { useState, useEffect } from 'react'
import { getDetentionLogs, saveDetentionLog, deleteDetentionLog } from '../lib/db'
import type { DetentionLog } from '../lib/types'

export default function Detention() {
  const [logs, setLogs] = useState<DetentionLog[]>([])
  const [running, setRunning] = useState<DetentionLog | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => { getDetentionLogs().then(setLogs) }, [])

  // Timer effect for active detention
  useEffect(() => {
    if (!running) { setElapsed(0); return }
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(running.startTime).getTime()
      setElapsed(Math.floor(diff / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  const handleStart = () => {
    const log: DetentionLog = {
      id: crypto.randomUUID(),
      customer: '',
      location: '',
      startTime: new Date().toISOString(),
      status: 'active',
    }
    setRunning(log)
  }

  const handleStop = async () => {
    if (!running) return
    const customer = prompt('Customer/Broker name:') || 'Unknown'
    const location = prompt('Location:') || 'Unknown'
    const endTime = new Date().toISOString()
    const durationMinutes = Math.round((Date.now() - new Date(running.startTime).getTime()) / 60000)
    const completed: DetentionLog = {
      ...running,
      customer,
      location,
      endTime,
      durationMinutes,
      status: 'completed',
    }
    await saveDetentionLog(completed)
    setLogs(prev => [completed, ...prev])
    setRunning(null)
  }

  const handleDelete = async (id: string) => {
    await deleteDetentionLog(id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="px-4 pt-4 pb-20 space-y-4">
      <h1 className="text-xl font-bold text-white">Detention Timer</h1>
      <p className="text-sm text-slate-400">Track wait time & claim detention pay</p>

      {/* Timer */}
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-5xl font-mono font-bold text-white tracking-wider">
          {running ? formatTime(elapsed) : '00:00:00'}
        </p>
        <p className="text-xs text-slate-400 mt-2 uppercase tracking-wider">
          {running ? 'Currently Waiting' : 'Press Start to begin tracking'}
        </p>
        <div className="mt-6 flex justify-center gap-4">
          {!running ? (
            <button onClick={handleStart} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-xl btn-active text-lg">
              ▶ Start
            </button>
          ) : (
            <button onClick={handleStop} className="bg-red-600 hover:bg-red-500 text-white font-semibold px-8 py-3 rounded-xl btn-active text-lg">
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* History */}
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Recent Detentions</h2>
      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">No detentions logged yet</p>
          </div>
        ) : (
          logs.slice(0, 10).map(log => (
            <div key={log.id} className="glass rounded-xl p-3 flex justify-between items-center group">
              <div>
                <p className="text-sm font-medium text-white">{log.customer}</p>
                <p className="text-xs text-slate-400">{log.location}</p>
                {log.durationMinutes && (
                  <p className="text-xs text-emerald-400">{log.durationMinutes} min detention</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">{new Date(log.startTime).toLocaleDateString()}</p>
                <button onClick={() => handleDelete(log.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}