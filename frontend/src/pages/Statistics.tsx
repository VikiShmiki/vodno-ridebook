import { getStats } from '../api/endpoints'
import { useAsync } from '../api/useAsync'
import { CATEGORY_LABELS, WEATHER_LABELS, formatDate } from '../components/labels'
import { Card, Empty, ErrorNote, Loading, RatingBar, Stat } from '../components/ui'
import type { ReportCategory } from '../types/api'

export function Statistics() {
  const stats = useAsync(getStats)

  if (stats.loading) return <Loading what="statistics" />
  if (stats.error) return <ErrorNote message={stats.error} />
  if (!stats.data) return <Empty>No statistics available.</Empty>

  const { rides_by_month: byMonth } = stats.data
  const peak = Math.max(1, ...byMonth.map((entry) => entry.rides))
  const categories = Object.entries(stats.data.reports_by_category).toSorted((a, b) => b[1] - a[1])

  return (
    <>
      <div className="page-head">
        <h1>Statistics</h1>
        <p>Everything logged for the Sredno Vodno road so far.</p>
      </div>

      <div className="grid cols-4" style={{ marginBottom: '1rem' }}>
        <Stat label="Rides" value={stats.data.total_rides} />
        <Stat label="Distance" value={`${stats.data.total_distance_km} km`} />
        <Stat label="Motorcycles" value={stats.data.total_motorcycles} />
        <Stat
          label="Reports"
          value={stats.data.open_reports + stats.data.resolved_reports}
          sub={`${stats.data.open_reports} still open`}
        />
      </div>

      <div className="grid cols-2">
        <Card title="Rides per month">
          {byMonth.length === 0 ? (
            <Empty>No rides logged yet.</Empty>
          ) : (
            <div className="month-bars">
              {byMonth.map((entry) => (
                <div className="col" key={entry.month}>
                  <span className="tick">{entry.rides}</span>
                  <div className="fill" style={{ height: `${(entry.rides / peak) * 100}%` }} />
                  <span className="tick">{entry.month.slice(5)}/{entry.month.slice(2, 4)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Average ratings">
          <RatingBar label="Road quality" value={stats.data.avg_road_quality} />
          <RatingBar label="Traffic" value={stats.data.avg_traffic} />
          <RatingBar label="Cleanliness" value={stats.data.avg_cleanliness} />
          <RatingBar label="Enjoyment" value={stats.data.avg_enjoyment} />
        </Card>

        <Card title="Best rated rides">
          {stats.data.best_rides.length === 0 ? (
            <Empty>No rides logged yet.</Empty>
          ) : (
            <ul className="list">
              {stats.data.best_rides.map((ride) => (
                <li key={ride.id}>
                  <div>
                    <strong>{formatDate(ride.date)}</strong>
                    <div className="meta">
                      {WEATHER_LABELS[ride.weather]}
                      {ride.notes ? ` · ${ride.notes}` : ''}
                    </div>
                  </div>
                  <span className="badge low">{ride.enjoyment_rating}/5</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Reports by category">
          {categories.length === 0 ? (
            <Empty>Nothing reported yet.</Empty>
          ) : (
            <ul className="list">
              {categories.map(([category, count]) => (
                <li key={category}>
                  <span>{CATEGORY_LABELS[category as ReportCategory] ?? category}</span>
                  <span className="badge">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
