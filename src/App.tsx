import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import RateEvaluator from './pages/RateEvaluator'
import Expenses from './pages/Expenses'
import Detention from './pages/Detention'
import DVIR from './pages/DVIR'
import GPSTracker from './pages/GPSTracker'
import Compliance from './pages/Compliance'
import IFTA from './pages/IFTA'
import Upgrade from './pages/Upgrade'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'

export default function App() {
  const { isSignedIn, isLoaded } = useUser()
  const [page, setPage] = useState(() => {
    const path = window.location.pathname
    if (path === '/' || path === '/landing') return 'landing'
    if (path === '/sign-in' || path === '/sign-up') return 'auth'
    return 'dashboard'
  })

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (path === '/' || path === '/landing') setPage('landing')
      else if (path === '/sign-in' || path === '/sign-up') setPage('auth')
      else setPage('dashboard')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (p: string) => {
    setPage(p)
    window.scrollTo(0, 0)
    if (p === 'landing') {
      window.history.pushState(null, '', '/')
    } else if (p === 'auth') {
      window.history.pushState(null, '', '/sign-in')
    } else {
      window.history.pushState(null, '', `/app/${p === 'dashboard' ? '' : p}`)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm mt-3">Loading...</p>
        </div>
      </div>
    )
  }

  // Landing page (public)
  if (page === 'landing') {
    return <Landing onNavigate={navigate} />
  }

  // Auth page (public)
  if (page === 'auth') {
    return <AuthPage onNavigate={navigate} />
  }

  // App pages require sign-in
  if (!isSignedIn) {
    return <AuthPage onNavigate={navigate} />
  }

  return (
    <div className="min-h-screen bg-slate-950 safe-top">
      <main className="max-w-lg mx-auto pb-16">
        {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {page === 'route' && <GPSTracker />}
        {page === 'dvir' && <DVIR />}
        {page === 'rate' && <RateEvaluator />}
        {page === 'expenses' && <Expenses />}
        {page === 'detention' && <Detention />}
        {page === 'compliance' && <Compliance />}
        {page === 'ifta' && <IFTA />}
        {page === 'account' && <Upgrade />}
      </main>
      <Navbar active={page} onNavigate={navigate} />
    </div>
  )
}