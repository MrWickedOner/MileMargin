import { useState } from 'react'
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
import AuthPage from './pages/AuthPage'

export default function App() {
  const { isSignedIn, isLoaded } = useUser()
  const [page, setPage] = useState('dashboard')

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

  if (!isSignedIn) {
    return <AuthPage />
  }

  return (
    <div className="min-h-screen bg-slate-950 safe-top">
      <main className="max-w-lg mx-auto pb-16">
        {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
        {page === 'route' && <GPSTracker />}
        {page === 'dvir' && <DVIR />}
        {page === 'rate' && <RateEvaluator />}
        {page === 'expenses' && <Expenses />}
        {page === 'detention' && <Detention />}
        {page === 'compliance' && <Compliance />}
        {page === 'ifta' && <IFTA />}
      </main>
      <Navbar active={page} onNavigate={setPage} />
    </div>
  )
}