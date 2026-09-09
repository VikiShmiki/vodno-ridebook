import { useState } from 'react'

import { createReport, deleteReport, listReports, resolveReport } from '../api/endpoints'
import { useAsync } from '../api/useAsync'
import { Icon } from '../components/Icon'
import { MapLegend, RoadMap } from '../components/RoadMap'
import { CATEGORY_ICONS, CATEGORY_LABELS, SEVERITY_LABELS, timeAgo } from '../components/labels'
import { Badge, Card, EmptyState, ErrorNote, Skeleton, SuccessNote } from '../components/ui'
import { REPORT_CATEGORIES, SEVERITIES, type ReportCategory, type Severity } from '../types/api'

// Roughly the middle of the climb, used as the default pin position.
const DEFAULT_POSITION = { latitude: '41.9938', longitude: '21.4051' }

export function Reports() {
  const [showResolved, setShowResolved] = useState(false)
  const reports = useAsync(() => listReports(showResolved ? undefined : false), [showResolved])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    category: 'gravel' as ReportCategory,
    severity: 'medium' as Severity,
    description: '',
    ...DEFAULT_POSITION,
  })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSaved(false)
    try {
      await createReport({
        category: form.category,
        severity: form.severity,
        description: form.description.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      })
      setForm({ ...form, description: '' })
      setSaved(true)
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
          icon="map"
          action={
            <label className="checkbox">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(event) => setShowResolved(event.target.checked)}
              />
              Show resolved
            </label>
          }
        >
          <RoadMap reports={items} selectedId={selectedId} onSelect={(r) => setSelectedId(r.id)} />
          <MapLegend />
        </Card>

        <Card title="Report a condition" icon="pin">
          <form onSubmit={submit}>
            <div className="form-grid">
              <label className="field">
                <span className="label">Category</span>
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
              <label className="field">
                <span className="label">Severity</span>
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
              <label className="field">
                <span className="label">Latitude</span>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={form.latitude}
                  onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                />
              </label>
              <label className="field">
                <span className="label">Longitude</span>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={form.longitude}
                  onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                />
              </label>
              <label className="field full">
                <span className="label">Description</span>
                <textarea
                  required
                  placeholder="What should other riders know?"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="primary" type="submit" disabled={submitting}>
                <Icon name="pin" size={15} />
                {submitting ? 'Saving…' : 'Submit report'}
              </button>
              {error && <ErrorNote message={error} />}
              {saved && !error && <SuccessNote message="Report submitted." />}
            </div>
          </form>
        </Card>
      </div>

      <div style={{ marginTop: 'var(--sp-4)' }}>
        <Card
          title={showResolved ? 'All reports' : 'Open reports'}
          icon="reports"
          flush
          action={<span className="badge">{items.length}</span>}
        >
          {reports.loading ? (
            <div style={{ padding: 'var(--sp-5)' }}>
              <Skeleton lines={5} />
            </div>
          ) : reports.error ? (
            <div style={{ padding: 'var(--sp-5)' }}>
              <ErrorNote message={reports.error} />
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon="check">No reports match the current filter.</EmptyState>
          ) : (
            <ul className="list hoverable">
              {items.map((report) => (
                <li
                  key={report.id}
                  onMouseEnter={() => setSelectedId(report.id)}
                  onMouseLeave={() => setSelectedId(null)}
                >
                  <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <span className={`icon-chip ${report.resolved ? 'resolved' : report.severity}`}>
                      <Icon name={CATEGORY_ICONS[report.category]} size={16} />
                    </span>
                    <div>
                      <div className="item-title">
                        {CATEGORY_LABELS[report.category]}
                        <Badge tone={report.resolved ? 'resolved' : report.severity}>
                          {report.resolved ? 'Resolved' : SEVERITY_LABELS[report.severity]}
                        </Badge>
                      </div>
                      <div className="meta">{report.description}</div>
                      <div className="meta faint mono">
                        {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)} ·{' '}
                        {timeAgo(report.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: '0.25rem', flexWrap: 'nowrap' }}>
                    <button
                      className="ghost"
                      onClick={() => toggleResolved(report.id, !report.resolved)}
                    >
                      <Icon name={report.resolved ? 'undo' : 'check'} size={14} />
                      {report.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                    <button
                      className="ghost danger icon"
                      onClick={() => remove(report.id)}
                      aria-label="Delete report"
                      title="Delete report"
                    >
                      <Icon name="trash" size={15} />
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
