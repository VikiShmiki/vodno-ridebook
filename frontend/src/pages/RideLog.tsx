import { useState } from 'react'

import { createRide, deleteRide, listMotorcycles, listRides } from '../api/endpoints'
import { useAsync } from '../api/useAsync'
import { WEATHER_LABELS, formatDate } from '../components/labels'
import { Card, Empty, ErrorNote, Loading } from '../components/ui'
import { WEATHER_OPTIONS, type RideCreate, type Weather } from '../types/api'

const RATINGS: Array<{ field: keyof RideCreate; label: string }> = [
  { field: 'road_quality_rating', label: 'Road quality' },
  { field: 'traffic_rating', label: 'Traffic' },
  { field: 'road_cleanliness_rating', label: 'Cleanliness' },
  { field: 'enjoyment_rating', label: 'Enjoyment' },
]

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

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
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

  return (
    <>
      <div className="page-head">
        <h1>Ride log</h1>
        <p>Log a run up Vodno and rate the conditions you found.</p>
      </div>

      <div className="grid" style={{ gap: '1rem' }}>
        <Card title="Log a new ride">
          <form onSubmit={submit}>
            <div className="form-grid">
              <label>
                Date
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                />
              </label>
              <label>
                Time
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm({ ...form, time: event.target.value })}
                />
              </label>
              <label>
                Motorcycle
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
              <label>
                Weather
                <select
                  value={form.weather}
                  onChange={(event) =>
                    setForm({ ...form, weather: event.target.value as Weather })
                  }
                >
                  {WEATHER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {WEATHER_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Distance (km)
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.5"
                  value={form.distance_km}
                  onChange={(event) => setForm({ ...form, distance_km: event.target.value })}
                />
              </label>

              {RATINGS.map(({ field, label }) => (
                <label key={field}>
                  {label}: {form[field as keyof typeof form] as number}/5
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={form[field as keyof typeof form] as number}
                    onChange={(event) =>
                      setForm({ ...form, [field]: Number(event.target.value) })
                    }
                  />
                </label>
              ))}

              <label className="full">
                Notes
                <textarea
                  placeholder="Anything worth remembering about this ride"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </label>
            </div>
            <div className="row" style={{ marginTop: '0.9rem' }}>
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save ride'}
              </button>
              {error && <span className="error">{error}</span>}
            </div>
          </form>
        </Card>

        <Card title={`Previous rides${rides.data ? ` (${rides.data.length})` : ''}`}>
          {rides.loading ? (
            <Loading what="rides" />
          ) : rides.error ? (
            <ErrorNote message={rides.error} />
          ) : (rides.data ?? []).length === 0 ? (
            <Empty>No rides yet — log your first run above.</Empty>
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
                  {(rides.data ?? []).map((ride) => (
                    <tr key={ride.id}>
                      <td>{formatDate(ride.date)}</td>
                      <td>{WEATHER_LABELS[ride.weather]}</td>
                      <td>{ride.distance_km ?? '–'}</td>
                      <td>{ride.road_quality_rating}</td>
                      <td>{ride.traffic_rating}</td>
                      <td>{ride.road_cleanliness_rating}</td>
                      <td>{ride.enjoyment_rating}</td>
                      <td className="muted">{ride.notes ?? '–'}</td>
                      <td>
                        <button className="ghost" onClick={() => remove(ride.id)}>
                          Delete
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
