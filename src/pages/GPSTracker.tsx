import { useState, useEffect, useRef, useCallback } from 'react'
import { saveRoute, getRoutes, deleteRoute, haversineDistance, computeRouteDistance, detectState } from '../lib/db'
import type { Route, RoutePoint, TripStateSegment } from '../lib/types'

export default function GPSTracker() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [tracking, setTracking] = useState(false)
  const [activeRoute, setActiveRoute] = useState<Route | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [currentState, setCurrentState] = useState<string | null>(null)
  const [routeName, setRouteName] = useState('')
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => { getRoutes().then(setRoutes) }, [])

  // Timer for active tracking
  useEffect(() => {
    if (!tracking || !activeRoute) { setElapsed(0); return }
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(activeRoute.startedAt).getTime()
      setElapsed(Math.floor(diff / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [tracking, activeRoute])

  // Calculate total distance from all route points
  const totalDistance = activeRoute ? computeRouteDistance(activeRoute.points) : 0

  const handleStart = useCallback(async () => {
    if (!navigator.geolocation) { alert('GPS not available on this device'); return }

    const route: Route = {
      id: crypto.randomUUID(),
      name: routeName || `Trip ${new Date().toLocaleDateString()}`,
      points: [],
      totalMiles: 0,
      durationMinutes: 0,
      stateSegments: [],
      status: 'active',
      startedAt: new Date().toISOString(),
    }

    setActiveRoute(route)
    setTracking(true)

    // Start watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: RoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: new Date().toISOString(),
        }
        // Detect state
        const state = detectState(point.lat, point.lng)
        point.state = state || undefined
        setCurrentState(state)

        setActiveRoute(prev => {
          if (!prev) return prev
          const newPoints = [...prev.points, point]
          return { ...prev, points: newPoints }
        })
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [routeName])

  const handleStop = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (!activeRoute) return

    const endTime = new Date().toISOString()
    const durationMinutes = Math.round((Date.now() - new Date(activeRoute.startedAt).getTime()) / 60000)
    const miles = computeRouteDistance(activeRoute.points)

    // Compute state segments from points
    const stateMap = new Map<string, { miles: number; fromIdx: number; toIdx: number }>()
    let lastState: string | null = null
    let segmentStartIdx = 0

    for (let i = 0; i < activeRoute.points.length; i++) {
      const pt = activeRoute.points[i]
      const st = pt.state || null
      if (st !== lastState) {
        if (lastState && segmentStartIdx < i) {
          // Calculate miles for this segment
          let segMiles = 0
          for (let j = segmentStartIdx + 1; j <= i; j++) {
            segMiles += haversineDistance(
              activeRoute.points[j - 1].lat, activeRoute.points[j - 1].lng,
              activeRoute.points[j].lat, activeRoute.points[j].lng
            )
          }
          const existing = stateMap.get(lastState)
          stateMap.set(lastState, {
            miles: Math.round((existing?.miles || 0) + segMiles),
            fromIdx: existing?.fromIdx ?? segmentStartIdx,
            toIdx: i,
          })
        }
        lastState = st
        segmentStartIdx = i
      }
    }

    // Last segment
    if (lastState && segmentStartIdx < activeRoute.points.length - 1) {
      let segMiles = 0
      for (let j = segmentStartIdx + 1; j < activeRoute.points.length; j++) {
        segMiles += haversineDistance(
          activeRoute.points[j - 1].lat, activeRoute.points[j - 1].lng,
          activeRoute.points[j].lat, activeRoute.points[j].lng
        )
      }
      const existing = stateMap.get(lastState)
      stateMap.set(lastState, {
        miles: Math.round((existing?.miles || 0) + segMiles),
        fromIdx: existing?.fromIdx ?? segmentStartIdx,
        toIdx: activeRoute.points.length - 1,
      })
    }

    const stateSegments: TripStateSegment[] = Array.from(stateMap.entries())
      .map(([state, data]) => ({ state, miles: data.miles, fromPointIndex: data.fromIdx, toPointIndex: data.toIdx }))
      .sort((a, b) => b.miles - a.miles)

    const completed: Route = {
      ...activeRoute,
      totalMiles: Math.round(miles * 100) / 100,
      durationMinutes,
      stateSegments,
      status: 'completed',
      completedAt: endTime,
    }

    await saveRoute(completed)
    setRoutes(prev => [completed, ...prev])
    setActiveRoute(null)
    setTracking(false)
    setCurrentState(null)
  }, [activeRoute])

  const handleDelete = useCallback(async (id: string) => {
    await deleteRoute(id)
    setRoutes(prev => prev.filter(r => r.id !== id))
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">GPS Route Tracker</h1>
          <p className="text-sm text-slate-400">Record trips & state mileage automatically</p>
        </div>
      </div>

      {/* Active Tracking Card */}
      <div className={`rounded-2xl p-5 ${tracking ? 'bg-emerald-500/10 border-2 border-emerald-500/30' : 'glass'}`}>
        {!tracking ? (
          <div className="space-y-3">
            <p className="text-center text-slate-400 text-sm">🚛 Tap start to begin tracking</p>
            <input type="text" value={routeName} onChange={e => setRouteName(e.target.value)}
              placeholder="Trip name (e.g. Chicago → Dallas)"
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600"
            />
            <button onClick={handleStart}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl btn-active text-lg">
              ▶ Start GPS Tracking
            </button>
          </div>
        ) : (
          <div className="text-center space-y-3">
            {/* Live Timer */}
            <p className="text-4xl font-mono font-bold text-emerald-400 tracking-wider">{formatTime(elapsed)}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Elapsed Time</p>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-2xl font-bold text-white">{totalDistance.toFixed(1)}</p>
                <p className="text-xs text-slate-400">Miles Tracked</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-2xl font-bold text-white">{currentState || '—'}</p>
                <p className="text-xs text-slate-400">Current State</p>
              </div>
            </div>

            {/* Points count */}
            <p className="text-xs text-slate-500">{activeRoute?.points.length || 0} GPS points collected</p>

            {/* Stop button */}
            <button onClick={handleStop}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl btn-active text-lg">
              ⏹ Stop & Save Route
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Saved Routes</h2>
      {routes.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">No routes tracked yet</p>
          <p className="text-slate-500 text-xs mt-1">Start GPS tracking above to record your first trip</p>
        </div>
      ) : (
        <div className="space-y-2">
          {routes.map(route => (
            <div key={route.id} className="glass rounded-xl p-3 group">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{route.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-400">
                    <span>{route.totalMiles.toFixed(1)} mi</span>
                    <span>{route.durationMinutes} min</span>
                    <span>{route.stateSegments.length} states</span>
                    <span className="text-slate-500">{new Date(route.startedAt).toLocaleDateString()}</span>
                  </div>
                  {/* State breakdown chips */}
                  {route.stateSegments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {route.stateSegments.slice(0, 5).map(seg => (
                        <span key={seg.state} className="text-[10px] bg-slate-800 rounded px-1.5 py-0.5 text-slate-300">
                          {seg.state}: {seg.miles}mi
                        </span>
                      ))}
                      {route.stateSegments.length > 5 && (
                        <span className="text-[10px] text-slate-500">+{route.stateSegments.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(route.id)}
                  className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}