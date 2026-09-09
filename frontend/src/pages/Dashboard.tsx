import { Link } from 'react-router-dom'

import { getStats, listReports, listRides } from '../api/endpoints'
import { useAsync } from '../api/useAsync'
import { Icon } from '../components/Icon'
import { MapLegend, RoadMap } from '../components/RoadMap'
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  WEATHER_ICONS,
  WEATHER_LABELS,
  formatDate,
  timeAgo,
} from '../components/labels'
import {
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  RatingBar,
  Skeleton,
  SkeletonBlock,
  Stat,
} from '../components/ui'
import type { RoadReport } from '../types/api'

type Tone = 'low' | 'medium' | 'high'

function conditionSummary(reports: RoadReport[]): { text: string; tone: Tone } {
  const open = reports.filter((report) => !report.resolved)
  if (open.length === 0) return { text: 'Road is clear', tone: 'low' }
  if (open.some((report) => report.severity === 'high'))
    return { text: 'Hazardous conditions', tone: 'high' }
  return { text: 'Minor issues reported', tone: 'medium' }
}

export function Dashboard() {
  const stats = useAsync(getStats)
  const reports = useAsync(() => listReports())
  const rides = useAsync(() => listRides(5))

  if (stats.error) return <ErrorNote message={`Could not load the dashboard — ${stats.error}`} />

  const openReports = (reports.data ?? []).filter((report) => !report.resolved)
  const condition = conditionSummary(reports.data ?? [])
  const highCount = openReports.filter((report) => report.severity === 'high').length

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>Current conditions on the road to Sredno Vodno.</p>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 'var(--sp-4)' }}>
        {stats.loading || !stats.data ? (
          Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} height={96} />)
        ) : (
          <>
            <Stat
              icon="route"
              label="Total rides"
              value={stats.data.total_rides}
              sub={`${stats.data.total_distance_km} km logged`}
            />
            <Stat
              icon="reports"
              tone={stats.data.open_reports === 0 ? 'ok' : highCount > 0 ? 'danger' : 'warn'}
              label="Open reports"
              value={stats.data.open_reports}
              sub={highCount > 0 ? `${highCount} high severity` : `${stats.data.resolved_reports} resolved`}
            />
            <Stat
              icon="stats"
              label="Avg road quality"
              value={stats.data.avg_road_quality?.toFixed(1) ?? '–'}
              sub="out of 5"
            />
            <Stat
              icon="star"
              label="Avg enjoyment"
              value={stats.data.avg_enjoyment?.toFixed(1) ?? '–'}
              sub="out of 5"
            />
          </>
        )}
      </div>

      <div className="grid cols-2">
        <Card
          title="Road map"
          icon="map"
          action={
            <Link className="badge accent" to="/reports">
              All reports
              <Icon name="arrow" size={12} />
            </Link>
          }
        >
          <RoadMap reports={reports.data ?? []} />
          <MapLegend />
        </Card>

        <Card
          title="Latest road conditions"
          icon="reports"
          flush
          action={<Badge tone={condition.tone} dot>{condition.text}</Badge>}
        >
          {reports.loading ? (
            <div style={{ padding: 'var(--sp-5)' }}>
              <Skeleton lines={4} />
            </div>
          ) : openReports.length === 0 ? (
            <EmptyState icon="check">Nothing reported right now. Enjoy the ride.</EmptyState>
          ) : (
            <ul className="list hoverable">
              {openReports.slice(0, 5).map((report) => (
                <li key={report.id}>
                  <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <span className={`icon-chip ${report.severity}`}>
                      <Icon name={CATEGORY_ICONS[report.category]} size={15} />
                    </span>
                    <div>
                      <div className="item-title">{CATEGORY_LABELS[report.category]}</div>
                      <div className="meta">{report.description}</div>
                    </div>
                  </div>
                  <div className="item-side">
                    <Badge tone={report.severity}>{SEVERITY_LABELS[report.severity]}</Badge>
                    <span className="meta faint">{timeAgo(report.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent rides"
          icon="rides"
          flush
          action={
            <Link className="badge" to="/rides">
              Ride log
              <Icon name="arrow" size={12} />
            </Link>
          }
        >
          {rides.loading ? (
            <div style={{ padding: 'var(--sp-5)' }}>
              <Skeleton lines={4} />
            </div>
          ) : (rides.data ?? []).length === 0 ? (
            <EmptyState icon="rides">No rides logged yet.</EmptyState>
          ) : (
            <ul className="list hoverable">
              {(rides.data ?? []).map((ride) => (
                <li key={ride.id}>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <span className="icon-chip">
                      <Icon name={WEATHER_ICONS[ride.weather]} size={15} />
                    </span>
                    <div>
                      <div className="item-title">{formatDate(ride.date)}</div>
                      <div className="meta">
                        {WEATHER_LABELS[ride.weather]}
                        {ride.distance_km ? ` · ${ride.distance_km} km` : ''}
                        {ride.motorcycle ? ` · ${ride.motorcycle.model}` : ''}
                      </div>
                    </div>
                  </div>
                  <Badge tone={ride.enjoyment_rating >= 4 ? 'low' : 'neutral'}>
                    {ride.enjoyment_rating}/5
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Average ratings" icon="stats">
          {stats.loading || !stats.data ? (
            <Skeleton lines={4} />
          ) : (
            <>
              <RatingBar label="Road quality" value={stats.data.avg_road_quality} />
              <RatingBar label="Traffic" value={stats.data.avg_traffic} />
              <RatingBar label="Cleanliness" value={stats.data.avg_cleanliness} />
              <RatingBar label="Enjoyment" value={stats.data.avg_enjoyment} />
              {rides.data?.[0]?.notes && (
                <p className="meta" style={{ marginTop: 'var(--sp-4)', color: 'var(--text-2)' }}>
                  Latest note: “{rides.data[0].notes}”
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  )
}
