import { useState, useEffect } from 'react'
import { getSettings } from '../lib/db'
import { useUser, UserButton } from '@clerk/clerk-react'

const STRIPE_MONTHLY = 'https://buy.stripe.com/9B6eVc7rw2u54U12JEeME00'
const STRIPE_ANNUAL = 'https://buy.stripe.com/3cIfZg4fk0lX7293NIeME01'

const FREE_FEATURES = [
  'Quick Rate Evaluator (5 checks/mo)',
  'Basic Load Log',
  'Compliance Alerts (3 active)',
  'Expense Tracking',
  'Detention Timer',
]

const PREMIUM_FEATURES = [
  'Unlimited Rate Checks',
  'OCR Receipt Scanning',
  'GPS Route & State Mileage Tracking',
  'IFTA Tax Helper with Export',
  'DVIR (Digital Inspection Reports)',
  'Unlimited Compliance Alerts',
  'DOT-ready PDF Exports',
  'QuickBooks/Xero Ready Exports',
  'Fleet Dashboard (2+ trucks)',
  'Monthly Value Reports',
]

export default function Upgrade() {
  const [settings, setSettings] = useState<{ isPremium: boolean; premiumExpiry?: string } | null>(null)
  const { user } = useUser()

  useEffect(() => {
    getSettings().then(s => setSettings(s))
  }, [])

  const isPremium = settings?.isPremium || false

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Account</h1>
          <p className="text-sm text-slate-400">Manage your subscription</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User'}</span>
          <UserButton />
        </div>
      </div>

      {/* Current Plan */}
      <div className={`rounded-2xl p-5 ${isPremium ? 'bg-emerald-500/10 border border-emerald-500/30' : 'glass'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Current Plan</p>
            <p className={`text-2xl font-bold mt-1 ${isPremium ? 'text-emerald-400' : 'text-white'}`}>
              {isPremium ? 'Premium' : 'Free'}
            </p>
            {isPremium && settings?.premiumExpiry && (
              <p className="text-xs text-slate-400 mt-1">
                Expires: {new Date(settings.premiumExpiry).toLocaleDateString()}
              </p>
            )}
          </div>
          {isPremium && (
            <span className="text-3xl">👑</span>
          )}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="space-y-3">
        {/* Monthly Plan */}
        <div className={`glass rounded-2xl p-5 ${!isPremium ? 'border-2 border-emerald-500/30' : ''}`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-white">Monthly</h2>
              <p className="text-3xl font-bold text-emerald-400 mt-1">$14.99<span className="text-base text-slate-400 font-normal">/month</span></p>
              <span className="inline-block mt-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">7-day free trial</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Cancel anytime. Full access to all premium features.</p>
          {!isPremium ? (
            <a href={STRIPE_MONTHLY} target="_blank" rel="noopener noreferrer"
              className="mt-4 block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-center btn-active">
              Subscribe Monthly
            </a>
          ) : (
            <p className="mt-4 text-sm text-emerald-400 text-center">✅ Active</p>
          )}
        </div>

        {/* Annual Plan */}
        <div className={`glass rounded-2xl p-5 ${!isPremium ? 'border-2 border-amber-500/30' : ''}`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-white">Annual</h2>
              <p className="text-3xl font-bold text-amber-400 mt-1">$129<span className="text-base text-slate-400 font-normal">/year</span></p>
              <span className="inline-block mt-2 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Save $51</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Best value — 2 months free compared to monthly.</p>
          {!isPremium ? (
            <a href={STRIPE_ANNUAL} target="_blank" rel="noopener noreferrer"
              className="mt-4 block w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-xl text-center btn-active">
              Subscribe Annual
            </a>
          ) : (
            <p className="mt-4 text-sm text-emerald-400 text-center">✅ Active</p>
          )}
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">What's Included</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Free</p>
            <ul className="space-y-1.5">
              {FREE_FEATURES.map(f => (
                <li key={f} className="text-xs text-slate-400 flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Premium</p>
            <ul className="space-y-1.5">
              {PREMIUM_FEATURES.map(f => (
                <li key={f} className="text-xs text-slate-300 flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      </div>
  )
}