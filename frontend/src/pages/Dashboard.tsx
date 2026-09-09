import { Link } from 'react-router-dom'

import { getStats, listReports, listRides } from '../api/endpoints'
import { useAsync } from '../api/useAsync'
import { RoadMap } from '../components/RoadMap'
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  WEATHER_LABELS,
  formatDate,
  timeAgo,
} from '../components/labels'
import { Card, Empty, ErrorNote, Loading, RatingBar, Stat } from '../components/ui'
import type { RoadReport } from '../types/api'

function conditionSummary(reports: RoadReport[]): { text: string; tone: string } {
  const open = reports.filter((report) => !report.resolved)
  if (open.length === 0) return { text: 'No open reports — road is clear', tone: 'low' }
  if (open.some((report) => report.severity === 'high'))
    return { text: 'Hazardous conditions reported', tone: 'high' }
  return { text: 'Minor issues reported', tone: 'medium' }
}

export function Dashboard() {
  const stats = useAsync(getStats)
  const reports = useAsync(() => listReports())
  const rides = useAsync(() => listRides(5))

  if (stats.error) return <ErrorNote message={stats.error} />
  if (stats.loading || !stats.data) return <Loading what="dashboard" />

  const openReports = (reports.data ?? []).filter((report) => !report.resolved)
  const condition = conditionSummary(reports.data ?? [])
  const latestRide = rides.data?.[0]

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>Current conditions on the road to Sredno Vodno.</p>
      </div>

      <div className="grid cols-4" style={{ marginBottom: '1rem' }}>
        <Stat label="Total rides" value={stats.data.total_rides} sub={`${stats.data.total_distance_km} km logged`} />
        <Stat label="Open reports" value={stats.data.open_reports} sub={`${stats.data.resolved_reports} resolved`} />
        <Stat
          label="Avg road quality"
          value={stats.data.avg_road_quality?.toFixed(1) ?? '–'}
          sub="out of 5"
        />
        <Stat
          label="Avg enjoyment"
          value={stats.data.avg_enjoyment?.toFixed(1) ?? '–'}
          sub="out of 5"
        />
      </div>

      <div className="grid cols-2">
        <Card
          title="Latest road conditions"
          action={<span className={`badge ${condition.tone}`}>{condition.text}</span>}
        >
          {reports.loading ? (
            <Loading what="reports" />
          ) : openReports.length === 0 ? (
            <Empty>Nothing reported right now. Enjoy the ride.</Empty>
          ) : (
            <ul className="list">
              {openReports.slice(0, 5).map((report) => (
                <li key={report.id}>
                  <div>
                    <strong>{CATEGORY_LABELS[report.category]}</strong>
                    <div className="meta">{report.description}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${report.severity}`}>
                      {SEVERITY_LABELS[report.severity]}
                    </span>
                    <div className="meta">{timeAgo(report.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Road map" action={<Link className="badge" to="/reports">Open reports page</Link>}>
          <RoadMap reports={reports.data ?? []} />
        </Card>

        <Card title="Recent rides" action={<Link className="badge" to="/rides">Ride log</Link>}>
          {rides.loading ? (
            <Loading what="rides" />
          ) : (rides.data ?? []).length === 0 ? (
            <Empty>No rides logged yet.</Empty>
          ) : (
            <ul className="list">
              {(rides.data ?? []).map((ride) => (
                <li key={ride.id}>
                  <div>
                    <strong>{formatDate(ride.date)}</strong>
                    <div className="meta">
                      {WEATHER_LABELS[ride.weather]}
                      {ride.distance_km ? ` · ${ride.distance_km} km` : ''}
                      {ride.motorcycle ? ` · ${ride.motorcycle.model}` : ''}
                    </div>
                  </div>
                  <span className="badge">{ride.enjoyment_rating}/5</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Average ratings">
          <RatingBar label="Road quality" value={stats.data.avg_road_quality} />
          <RatingBar label="Traffic" value={stats.data.avg_traffic} />
          <RatingBar label="Cleanliness" value={stats.data.avg_cleanliness} />
          <RatingBar label="Enjoyment" value={stats.data.avg_enjoyment} />
          {latestRide?.notes && (
            <p className="meta" style={{ marginBottom: 0 }}>
              Latest note: “{latestRide.notes}”
            </p>
          )}
        </Card>
      </div>
    </>
  )
}
