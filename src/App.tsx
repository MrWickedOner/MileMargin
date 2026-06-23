import { useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import RateEvaluator from './pages/RateEvaluator'
import Expenses from './pages/Expenses'
import Detention from './pages/Detention'
import DVIR from './pages/DVIR'
import Compliance from './pages/Compliance'
import IFTA from './pages/IFTA'

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <div className="min-h-screen bg-slate-950 safe-top">
      <main className="max-w-lg mx-auto">
        {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
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