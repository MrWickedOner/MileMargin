import { SignIn, SignUp } from '@clerk/clerk-react'
import { useState } from 'react'

export default function AuthPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <button onClick={() => onNavigate?.('landing')} className="text-2xl font-bold text-white hover:text-emerald-400 transition-colors">
            <span className="text-emerald-400">Mile</span>Margin
          </button>
          <p className="text-sm text-slate-400 mt-1">Your Profit Co-Pilot</p>
        </div>

        {/* Clerk Auth Components */}
        <div className="glass rounded-2xl p-6">
          {mode === 'sign-in' ? (
            <div>
              <SignIn
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'bg-transparent shadow-none',
                    headerTitle: 'text-white text-xl',
                    headerSubtitle: 'text-slate-400',
                    socialButtonsBlockButton: 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700',
                    dividerLine: 'bg-slate-700',
                    dividerText: 'text-slate-500',
                    formFieldLabel: 'text-slate-300',
                    formFieldInput: 'bg-slate-900 border-slate-600 text-white',
                    formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-500',
                    footerActionText: 'text-slate-400',
                    footerActionLink: 'text-emerald-400 hover:text-emerald-300',
                  },
                }}
              />
              <p className="text-center text-sm text-slate-400 mt-4">
                Don't have an account?{' '}
                <button onClick={() => setMode('sign-up')} className="text-emerald-400 hover:text-emerald-300">
                  Sign up
                </button>
              </p>
            </div>
          ) : (
            <div>
              <SignUp
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'bg-transparent shadow-none',
                    headerTitle: 'text-white text-xl',
                    headerSubtitle: 'text-slate-400',
                    socialButtonsBlockButton: 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700',
                    dividerLine: 'bg-slate-700',
                    dividerText: 'text-slate-500',
                    formFieldLabel: 'text-slate-300',
                    formFieldInput: 'bg-slate-900 border-slate-600 text-white',
                    formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-500',
                    footerActionText: 'text-slate-400',
                    footerActionLink: 'text-emerald-400 hover:text-emerald-300',
                  },
                }}
              />
              <p className="text-center text-sm text-slate-400 mt-4">
                Already have an account?{' '}
                <button onClick={() => setMode('sign-in')} className="text-emerald-400 hover:text-emerald-300">
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}