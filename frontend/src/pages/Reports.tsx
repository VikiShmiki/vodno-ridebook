import { useState } from 'react'

import { createReport, deleteReport, listReports, resolveReport } from '../api/endpoints'
import { useAsync } from '../api/useAsync'
import { RoadMap } from '../components/RoadMap'
import { CATEGORY_LABELS, SEVERITY_LABELS, timeAgo } from '../components/labels'
import { Card, Empty, ErrorNote, Loading } from '../components/ui'
import {
  REPORT_CATEGORIES,
  SEVERITIES,
  type ReportCategory,
  type Severity,
} from '../types/api'

// Roughly the middle of the climb, used as the default pin position.
const DEFAULT_POSITION = { latitude: 41.9938, longitude: 21.4051 }

export function Reports() {
  const [showResolved, setShowResolved] = useState(false)
  const reports = useAsync(() => listReports(showResolved ? undefined : false), [showResolved])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    category: 'gravel' as ReportCategory,
    severity: 'medium' as Severity,
    description: '',
    latitude: String(DEFAULT_POSITION.latitude),
    longitude: String(DEFAULT_POSITION.longitude),
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await createReport({
        category: form.category,
        severity: form.severity,
        description: form.description.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      })
      setForm({ ...form, description: '' })
      reports.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the report')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleResolved(id: number, resolved: boolean) {
    await resolveReport(id, resolved)
    reports.reload()
  }

  async function remove(id: number) {
    await deleteReport(id)
    reports.reload()
  }

  const items = reports.data ?? []

  return (
    <>
      <div className="page-head">
        <h1>Road reports</h1>
        <p>Conditions on the Sredno Vodno road that matter on two wheels.</p>
      </div>

      <div className="grid cols-2">
        <Card
          title="Map"
          action={
            <label className="row" style={{ fontSize: '0.8rem' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={showResolved}
                onChange={(event) => setShowResolved(event.target.checked)}
              />
              Show resolved
            </label>
          }
        >
          <RoadMap reports={items} selectedId={selectedId} onSelect={(r) => setSelectedId(r.id)} />
        </Card>

        <Card title="Report a condition">
          <form onSubmit={submit}>
            <div className="form-grid">
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value as ReportCategory })
                  }
                >
                  {REPORT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Severity
                <select
                  value={form.severity}
                  onChange={(event) =>
                    setForm({ ...form, severity: event.target.value as Severity })
                  }
                >
                  {SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {SEVERITY_LABELS[severity]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Latitude
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={form.latitude}
                  onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={form.longitude}
                  onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                />
              </label>
              <label className="full">
                Description
                <textarea
                  required
                  placeholder="What should other riders know?"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
            </div>
            <div className="row" style={{ marginTop: '0.9rem' }}>
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Submit report'}
              </button>
              {error && <span className="error">{error}</span>}
            </div>
          </form>
        </Card>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Card title={`Reports (${items.length})`}>
          {reports.loading ? (
            <Loading what="reports" />
          ) : reports.error ? (
            <ErrorNote message={reports.error} />
          ) : items.length === 0 ? (
            <Empty>No reports match the current filter.</Empty>
          ) : (
            <ul className="list">
              {items.map((report) => (
                <li
                  key={report.id}
                  onMouseEnter={() => setSelectedId(report.id)}
                  onMouseLeave={() => setSelectedId(null)}
                >
                  <div>
                    <strong>{CATEGORY_LABELS[report.category]}</strong>{' '}
                    <span className={`badge ${report.resolved ? 'resolved' : report.severity}`}>
                      {report.resolved ? 'Resolved' : SEVERITY_LABELS[report.severity]}
                    </span>
                    <div className="meta">{report.description}</div>
                    <div className="meta">
                      {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)} ·{' '}
                      {timeAgo(report.created_at)}
                    </div>
                  </div>
                  <div className="row">
                    <button className="ghost" onClick={() => toggleResolved(report.id, !report.resolved)}>
                      {report.resolved ? 'Reopen' : 'Mark resolved'}
                    </button>
                    <button className="ghost" onClick={() => remove(report.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
