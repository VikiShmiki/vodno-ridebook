import { useState } from 'react'

import { createRide, deleteRide, listMotorcycles, listRides } from '../api/endpoints'
import { useAsync } from '../api/useAsync'
import { Icon } from '../components/Icon'
import { WEATHER_ICONS, WEATHER_LABELS, formatDate } from '../components/labels'
import { Card, EmptyState, ErrorNote, Skeleton, SuccessNote } from '../components/ui'
import { WEATHER_OPTIONS, type Weather } from '../types/api'

const RATINGS = [
  { field: 'road_quality_rating', label: 'Road quality' },
  { field: 'traffic_rating', label: 'Traffic' },
  { field: 'road_cleanliness_rating', label: 'Cleanliness' },
  { field: 'enjoyment_rating', label: 'Enjoyment' },
] as const

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  time: '',
  motorcycle_id: '',
  weather: 'sunny' as Weather,
  distance_km: '',
  road_quality_rating: 3,
  traffic_rating: 3,
  road_cleanliness_rating: 3,
  enjoyment_rating: 4,
  notes: '',
})

export function RideLog() {
  const rides = useAsync(() => listRides(100))
  const motorcycles = useAsync(listMotorcycles)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSaved(false)
    try {
      await createRide({
        date: form.date,
        time: form.time ? `${form.time}:00` : null,
        motorcycle_id: form.motorcycle_id ? Number(form.motorcycle_id) : null,
        weather: form.weather,
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        road_quality_rating: form.road_quality_rating,
        traffic_rating: form.traffic_rating,
        road_cleanliness_rating: form.road_cleanliness_rating,
        enjoyment_rating: form.enjoyment_rating,
        notes: form.notes.trim() || null,
      })
      setForm(emptyForm())
      setSaved(true)
      rides.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the ride')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: number) {
    await deleteRide(id)
    rides.reload()
  }

  const items = rides.data ?? []

  return (
    <>
      <div className="page-head">
        <h1>Ride log</h1>
        <p>Log a run up Vodno and rate the conditions you found.</p>
      </div>

      <div className="stack">
        <Card title="Log a new ride" icon="plus">
          <form onSubmit={submit}>
            <div className="form-grid">
              <label className="field">
                <span className="label">Date</span>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                />
              </label>
              <label className="field">
                <span className="label">Time</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm({ ...form, time: event.target.value })}
                />
              </label>
              <label className="field">
                <span className="label">Motorcycle</span>
                <select
                  value={form.motorcycle_id}
                  onChange={(event) => setForm({ ...form, motorcycle_id: event.target.value })}
                >
                  <option value="">Not specified</option>
                  {(motorcycles.data ?? []).map((motorcycle) => (
                    <option key={motorcycle.id} value={motorcycle.id}>
                      {motorcycle.manufacturer} {motorcycle.model}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="label">Weather</span>
                <select
                  value={form.weather}
                  onChange={(event) => setForm({ ...form, weather: event.target.value as Weather })}
                >
                  {WEATHER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {WEATHER_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="label">Distance (km)</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.5"
                  placeholder="0"
                  value={form.distance_km}
                  onChange={(event) => setForm({ ...form, distance_km: event.target.value })}
                />
              </label>

              {RATINGS.map(({ field, label }) => {
                const value = form[field]
                return (
                  <label className="field" key={field}>
                    <span className="label">
                      {label}
                      <span className="rating-value">{value}/5</span>
                    </span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={value}
                      // Drives the filled portion of the WebKit slider track.
                      style={{ '--fill': `${((value - 1) / 4) * 100}%` } as React.CSSProperties}
                      onChange={(event) =>
                        setForm({ ...form, [field]: Number(event.target.value) })
                      }
                    />
                  </label>
                )
              })}

              <label className="field full">
                <span className="label">Notes</span>
                <textarea
                  placeholder="Anything worth remembering about this ride"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="primary" type="submit" disabled={submitting}>
                <Icon name="check" size={15} />
                {submitting ? 'Saving…' : 'Save ride'}
              </button>
              {error && <ErrorNote message={error} />}
              {saved && !error && <SuccessNote message="Ride saved." />}
            </div>
          </form>
        </Card>

        <Card
          title="Previous rides"
          icon="rides"
          flush
          action={<span className="badge">{items.length}</span>}
        >
          {rides.loading ? (
            <div style={{ padding: 'var(--sp-5)' }}>
              <Skeleton lines={5} />
            </div>
          ) : rides.error ? (
            <div style={{ padding: 'var(--sp-5)' }}>
              <ErrorNote message={rides.error} />
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon="rides">No rides yet — log your first run above.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weather</th>
                    <th>Km</th>
                    <th>Road</th>
                    <th>Traffic</th>
                    <th>Clean</th>
                    <th>Fun</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((ride) => (
                    <tr key={ride.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(ride.date)}</td>
                      <td>
                        <span className="row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
                          <Icon name={WEATHER_ICONS[ride.weather]} size={14} className="faint" />
                          {WEATHER_LABELS[ride.weather]}
                        </span>
                      </td>
                      <td className="num">{ride.distance_km ?? '–'}</td>
                      <td className="num">{ride.road_quality_rating}</td>
                      <td className="num">{ride.traffic_rating}</td>
                      <td className="num">{ride.road_cleanliness_rating}</td>
                      <td className="num">{ride.enjoyment_rating}</td>
                      <td className="notes">{ride.notes ?? '–'}</td>
                      <td className="actions">
                        <button
                          className="ghost danger icon"
                          onClick={() => remove(ride.id)}
                          aria-label={`Delete the ride on ${formatDate(ride.date)}`}
                          title="Delete ride"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
