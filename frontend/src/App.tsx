import { NavLink, Route, Routes } from 'react-router-dom'

import { getHealth } from './api/endpoints'
import { useAsync } from './api/useAsync'
import { Dashboard } from './pages/Dashboard'
import { Reports } from './pages/Reports'
import { RideLog } from './pages/RideLog'
import { Statistics } from './pages/Statistics'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/rides', label: 'Ride log', end: false },
  { to: '/reports', label: 'Road reports', end: false },
  { to: '/stats', label: 'Statistics', end: false },
]

function HealthIndicator() {
  const health = useAsync(getHealth)
  const healthy = health.data?.status === 'healthy'
  return (
    <div className="health" title={health.error ?? health.data?.database ?? 'checking'}>
      <span className={`dot ${health.loading ? '' : healthy ? 'ok' : 'bad'}`} />
      API {health.loading ? 'checking…' : healthy ? `v${health.data?.version}` : 'unavailable'}
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark">▲</span>
          Vodno Ridebook
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <HealthIndicator />
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rides" element={<RideLog />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/stats" element={<Statistics />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}
