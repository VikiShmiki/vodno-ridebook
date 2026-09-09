import { getStats } from '../api/endpoints'
import { useAsync } from '../api/useAsync'
import { Icon } from '../components/Icon'
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_TONES,
  WEATHER_ICONS,
  WEATHER_LABELS,
  WEATHER_TONES,
  formatDate,
} from '../components/labels'
import { Badge, Card, EmptyState, ErrorNote, RatingBar, SkeletonBlock, Stat } from '../components/ui'
import type { ReportCategory } from '../types/api'

export function Statistics() {
  const stats = useAsync(getStats)

  if (stats.error) return <ErrorNote message={`Could not load statistics — ${stats.error}`} />

  if (stats.loading || !stats.data) {
    return (
      <>
        <div className="page-head">
          <h1>Statistics</h1>
          <p>Everything logged for the Sredno Vodno road so far.</p>
        </div>
        <div className="grid cols-4" style={{ marginBottom: 'var(--sp-4)' }}>
          {Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} height={96} />)}
        </div>
        <div className="grid cols-2">
          <SkeletonBlock height={230} />
          <SkeletonBlock height={230} />
        </div>
      </>
    )
  }

  const byMonth = stats.data.rides_by_month
  const peak = Math.max(1, ...byMonth.map((entry) => entry.rides))
  const categories = Object.entries(stats.data.reports_by_category).toSorted((a, b) => b[1] - a[1])
  const totalReports = stats.data.open_reports + stats.data.resolved_reports

  return (
    <>
      <div className="page-head">
        <h1>Statistics</h1>
        <p>Everything logged for the Sredno Vodno road so far.</p>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 'var(--sp-4)' }}>
        <Stat icon="route" label="Rides" value={stats.data.total_rides} sub="logged runs" />
        <Stat icon="map" tone="sky" label="Distance" value={`${stats.data.total_distance_km} km`} sub="total" />
        <Stat
          icon="motorcycle"
          tone="violet"
          label="Motorcycles"
          value={stats.data.total_motorcycles}
          sub="in the garage"
        />
        <Stat
          icon="reports"
          tone={stats.data.open_reports === 0 ? 'ok' : 'warn'}
          label="Reports"
          value={totalReports}
          sub={`${stats.data.open_reports} still open`}
        />
      </div>

      <div className="grid cols-2">
        <Card title="Rides per month" icon="stats">
          {byMonth.length === 0 ? (
            <EmptyState icon="rides">No rides logged yet.</EmptyState>
          ) : (
            <>
              <div className="chart">
                {byMonth.map((entry) => (
                  <div className="col" key={entry.month} title={`${entry.rides} rides in ${entry.month}`}>
                    <span className="count">{entry.rides}</span>
                    <div className="fill" style={{ height: `${(entry.rides / peak) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="chart-labels">
                {byMonth.map((entry) => (
                  <span key={entry.month}>
                    {entry.month.slice(5)}/{entry.month.slice(2, 4)}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Average ratings" icon="star">
          <RatingBar label="Road quality" value={stats.data.avg_road_quality} />
          <RatingBar label="Traffic" value={stats.data.avg_traffic} />
          <RatingBar label="Cleanliness" value={stats.data.avg_cleanliness} />
          <RatingBar label="Enjoyment" value={stats.data.avg_enjoyment} />
        </Card>

        <Card title="Best rated rides" icon="star" flush>
          {stats.data.best_rides.length === 0 ? (
            <EmptyState icon="rides">No rides logged yet.</EmptyState>
          ) : (
            <ul className="list hoverable">
              {stats.data.best_rides.map((ride) => (
                <li key={ride.id}>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <span className={`icon-chip ${WEATHER_TONES[ride.weather]}`}>
                      <Icon name={WEATHER_ICONS[ride.weather]} size={15} />
                    </span>
                    <div>
                      <div className="item-title">{formatDate(ride.date)}</div>
                      <div className="meta">
                        {WEATHER_LABELS[ride.weather]}
                        {ride.notes ? ` · ${ride.notes}` : ''}
                      </div>
                    </div>
                  </div>
                  <Badge tone="low">{ride.enjoyment_rating}/5</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Reports by category" icon="reports" flush>
          {categories.length === 0 ? (
            <EmptyState icon="check">Nothing reported yet.</EmptyState>
          ) : (
            <ul className="list hoverable">
              {categories.map(([category, count]) => (
                <li key={category}>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <span className={`icon-chip ${CATEGORY_TONES[category as ReportCategory] ?? 'slate'}`}>
                      <Icon name={CATEGORY_ICONS[category as ReportCategory] ?? 'other'} size={15} />
                    </span>
                    <span className="item-title">
                      {CATEGORY_LABELS[category as ReportCategory] ?? category}
                    </span>
                  </div>
                  <Badge>{count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
