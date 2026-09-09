import { NavLink, Route, Routes } from 'react-router-dom'

import { getHealth } from './api/endpoints'
import { useAsync } from './api/useAsync'
import { Icon, type IconName } from './components/Icon'
import { Dashboard } from './pages/Dashboard'
import { Reports } from './pages/Reports'
import { RideLog } from './pages/RideLog'
import { Statistics } from './pages/Statistics'

const NAV: Array<{ to: string; label: string; icon: IconName; end: boolean }> = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/rides', label: 'Ride log', icon: 'rides', end: false },
  { to: '/reports', label: 'Road reports', icon: 'reports', end: false },
  { to: '/stats', label: 'Statistics', icon: 'stats', end: false },
]

/** Live indicator backed by the same /api/health endpoint the probes use. */
function HealthIndicator() {
  const health = useAsync(getHealth)
  const healthy = health.data?.status === 'healthy'
  const state = health.loading ? 'pending' : healthy ? 'ok' : 'bad'

  return (
    <div className="health" title={health.error ?? health.data?.database ?? 'checking'}>
      <span className={`dot ${state}`} />
      {health.loading ? 'Checking API…' : healthy ? `API v${health.data?.version}` : 'API unavailable'}
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark">
            <Icon name="motorcycle" size={17} />
          </span>
          Vodno Ridebook
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <Icon name={item.icon} size={15} />
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
