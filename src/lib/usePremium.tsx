import { useState, useEffect } from 'react'
import { getSettings } from './db'

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then(s => {
      setIsPremium(s.isPremium)
      setLoading(false)
    })
  }, [])

  return { isPremium, loading }
}

export function PremiumGate({ children, feature }: { children: React.ReactNode; feature: string }) {
  const { isPremium, loading } = usePremium()

  if (loading) return null

  if (!isPremium) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-3">
        <span className="text-4xl">👑</span>
        <h2 className="text-lg font-bold text-white">Premium Feature</h2>
        <p className="text-sm text-slate-400">
          {feature} is available exclusively on the Premium plan.
        </p>
        <a href="/account"
          className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl btn-active">
          Upgrade to Premium
        </a>
      </div>
    )
  }

  return <>{children}</>
}