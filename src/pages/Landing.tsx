import { useEffect, useState } from 'react'

const STRIPE_MONTHLY = 'https://buy.stripe.com/9B6eVc7rw2u54U12JEeME00'
const STRIPE_ANNUAL = 'https://buy.stripe.com/3cIfZg4fk0lX7293NIeME01'

const FEATURES = [
  {
    icon: '📊',
    title: 'Cost-Per-Mile Calculator',
    desc: 'Know your true operational costs instantly. Calculate CPM with all expenses factored in — no more guessing if a load is profitable.',
  },
  {
    icon: '✅',
    title: 'Compliance Dashboard',
    desc: 'Never miss a renewal. Track MC/DOT, UCR, IFTA, IRP, medical cards, and CDL endorsements with push notifications at 60/30/7 days.',
  },
  {
    icon: '📋',
    title: 'DVIR Inspections',
    desc: 'Digital pre-trip and post-trip inspection reports with photo capture, GPS timestamp, and DOT-ready PDF export. Replace paper logbooks.',
  },
  {
    icon: '⛽',
    title: 'IFTA Tax Helper',
    desc: 'Automatic state-mileage logging via GPS. Eliminate manual state-line tracking for quarterly fuel tax filing. Saves hours every quarter.',
  },
  {
    icon: '💰',
    title: 'Detention Timer',
    desc: 'Automatically log detention time with GPS geofencing. Know exactly how much unpaid detention you left on the table.',
  },
  {
    icon: '📱',
    title: 'Offline-First PWA',
    desc: 'Works in the cab with no signal. Install on your homescreen — no app store needed. Your data stays with you wherever you go.',
  },
]

const BENEFITS = [
  { stat: '$2,400+', label: 'Average annual savings from bad-rate avoidance' },
  { stat: '15 hrs', label: 'Saved per quarter on IFTA filing' },
  { stat: '3 min', label: 'To run a full rate evaluation' },
  { stat: '100%', label: 'Offline capable — works anywhere' },
]

export default function Landing({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/90 backdrop-blur-md border-b border-slate-800/50' : 'bg-transparent'}`}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-emerald-400">Mile</span>Margin
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">Pricing</a>
            <button onClick={() => onNavigate?.('auth')} className="text-slate-300 hover:text-white transition-colors text-sm">Sign In</button>
            <a href="https://buy.stripe.com/9B6eVc7rw2u54U12JEeME00" target="_blank" rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm btn-active">
              Get Started Free
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Built for owner-operators & small fleets</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            Maximize Every Mile
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mt-4 max-w-2xl mx-auto leading-relaxed">
            MileMargin helps truckers calculate true Cost-Per-Mile, stay compliant with DOT regulations, 
            and never leave money on the table — all from an app that works offline in the cab.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <a href="https://buy.stripe.com/9B6eVc7rw2u54U12JEeME00" target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl text-center btn-active">
              Start Free Trial
            </a>
            <a href="#features"
              className="w-full sm:w-auto glass text-slate-300 hover:text-white font-semibold px-8 py-3 rounded-xl text-center btn-active">
              See Features
            </a>
          </div>
          <p className="text-xs text-slate-500 mt-3">7-day free trial · No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BENEFITS.map(b => (
              <div key={b.label} className="glass rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{b.stat}</p>
                <p className="text-xs text-slate-400 mt-1">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Everything You Need to Run Profitable</h2>
            <p className="text-slate-400 mt-2">One app replaces a back-office staffer</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="glass rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="text-sm font-semibold text-white mt-3">{f.title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Simple Pricing</h2>
            <p className="text-slate-400 mt-2">One plan. Everything included. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Monthly */}
            <div className="glass rounded-2xl p-6 border-2 border-emerald-500/30">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">Monthly</h3>
                  <p className="text-3xl font-bold text-emerald-400 mt-2">$14.99<span className="text-base text-slate-400 font-normal">/month</span></p>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">7-day free trial</span>
              </div>
              <p className="text-xs text-slate-400 mt-3">Cancel anytime. Full access to all features.</p>
              <a href={STRIPE_MONTHLY} target="_blank" rel="noopener noreferrer"
                className="mt-5 block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-center btn-active">
                Subscribe Monthly
              </a>
            </div>

            {/* Annual */}
            <div className="glass rounded-2xl p-6 border-2 border-amber-500/30">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">Annual</h3>
                  <p className="text-3xl font-bold text-amber-400 mt-2">$129<span className="text-base text-slate-400 font-normal">/year</span></p>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Save $51</span>
              </div>
              <p className="text-xs text-slate-400 mt-3">Best value — 2 months free vs monthly billing.</p>
              <a href={STRIPE_ANNUAL} target="_blank" rel="noopener noreferrer"
                className="mt-5 block w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-xl text-center btn-active">
                Subscribe Annual
              </a>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="glass rounded-2xl p-6 mt-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Everything Included</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Unlimited Rate Checks', 'OCR Receipt Scanning', 'GPS Mileage Tracking', 'IFTA Tax Helper', 'DVIR Inspections', 'Compliance Alerts', 'Detention Timer', 'Fleet Dashboard', 'QB/Xero Exports', 'Broker Scorecard', 'Monthly Reports', 'Offline Mode'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-emerald-400">✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <span className="text-4xl">🚛</span>
          <h2 className="text-3xl font-bold mt-4">Ready to Maximize Every Mile?</h2>
          <p className="text-slate-400 mt-3">Join thousands of owner-operators who never leave money on the table.</p>
          <a href="https://buy.stripe.com/9B6eVc7rw2u54U12JEeME00" target="_blank" rel="noopener noreferrer"
            className="inline-block mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-10 py-3.5 rounded-xl btn-active">
            Start Your Free Trial
          </a>
          <p className="text-xs text-slate-500 mt-3">7-day free trial · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            <span className="text-emerald-400">Mile</span>Margin · Made for owner-operators
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <button onClick={() => onNavigate?.('auth')} className="hover:text-white">Sign In</button>
            <span>·</span>
            <a href="https://buy.stripe.com/9B6eVc7rw2u54U12JEeME00" target="_blank" rel="noopener noreferrer" className="hover:text-white">Subscribe</a>
          </div>
        </div>
      </footer>
    </div>
  )
}