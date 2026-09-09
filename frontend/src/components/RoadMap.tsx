import { Icon } from './Icon'
import { CATEGORY_ICONS, CATEGORY_LABELS, SEVERITY_LABELS } from './labels'
import type { RoadReport } from '../types/api'

/**
 * Schematic map of the road up to Sredno Vodno.
 *
 * Reports are projected from their WGS84 coordinates and snapped onto the
 * drawn road, so a marker always sits on the tarmac. It is deliberately not a
 * real tile map, which keeps the frontend free of an external map dependency
 * and of any runtime network call to a third party.
 */
const BOUNDS = { minLat: 41.985, maxLat: 42.003, minLon: 21.393, maxLon: 21.417 }
const WIDTH = 640
const HEIGHT = 292

// The road as a polyline, from the city end (bottom right) up to the summit.
const ROAD: Array<[number, number]> = [
  [604, 252], // Skopje / Vodno base
  [520, 247],
  [300, 237],
  [150, 219],
  [96, 196], // hairpin
  [150, 172],
  [330, 164],
  [500, 152],
  [556, 128], // hairpin
  [500, 104],
  [320, 96],
  [170, 86],
  [108, 64], // hairpin
  [150, 44],
  [252, 40], // Sredno Vodno
]

const ROAD_PATH = ROAD.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** Fraction along the climb: 0 at the city end, 1 at Sredno Vodno. */
function progress(latitude: number, longitude: number): number {
  const north = clamp((latitude - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat))
  const west = clamp((BOUNDS.maxLon - longitude) / (BOUNDS.maxLon - BOUNDS.minLon))
  return (north + west) / 2
}

const SEGMENTS = ROAD.slice(1).map(([x, y], index) =>
  Math.hypot(x - ROAD[index][0], y - ROAD[index][1]),
)
const TOTAL_LENGTH = SEGMENTS.reduce((sum, length) => sum + length, 0)

function pointAt(fraction: number): { x: number; y: number } {
  let remaining = clamp(fraction) * TOTAL_LENGTH
  for (let index = 0; index < SEGMENTS.length; index += 1) {
    const length = SEGMENTS[index]
    if (remaining <= length || index === SEGMENTS.length - 1) {
      const ratio = length === 0 ? 0 : Math.min(1, remaining / length)
      const [x1, y1] = ROAD[index]
      const [x2, y2] = ROAD[index + 1]
      return { x: x1 + (x2 - x1) * ratio, y: y1 + (y2 - y1) * ratio }
    }
    remaining -= length
  }
  return { x: ROAD[0][0], y: ROAD[0][1] }
}

function markerColor(report: RoadReport): string {
  if (report.resolved) return 'var(--text-3)'
  if (report.severity === 'high') return 'var(--danger)'
  if (report.severity === 'medium') return 'var(--warn)'
  return 'var(--ok)'
}

function Endpoint({ x, y, label, anchor }: { x: number; y: number; label: string; anchor: 'start' | 'end' }) {
  return (
    <g>
      <circle cx={x} cy={y} r="4.5" fill="var(--surface)" stroke="var(--text-3)" strokeWidth="2" />
      <text
        x={anchor === 'end' ? x - 9 : x + 10}
        y={y + 4}
        textAnchor={anchor}
        fill="var(--text-2)"
        fontSize="11.5"
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  )
}

export function RoadMap({
  reports,
  selectedId,
  onSelect,
}: {
  reports: RoadReport[]
  selectedId?: number | null
  onSelect?: (report: RoadReport) => void
}) {
  return (
    <svg
      className="roadmap"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Schematic map of the Sredno Vodno road with reported conditions"
    >
      <defs>
        {/* Barely-there altitude wash: cooler towards the summit. */}
        <linearGradient id="hillside" x1="0" y1="1" x2="0.15" y2="0">
          <stop offset="0%" stopColor="var(--surface-2)" />
          <stop offset="100%" stopColor="var(--bg-tint)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#hillside)" />

      <path
        d={ROAD_PATH}
        stroke="var(--road-edge)"
        strokeWidth="20"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={ROAD_PATH}
        stroke="var(--road)"
        strokeWidth="16"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={ROAD_PATH}
        stroke="var(--road-line)"
        strokeWidth="2"
        strokeDasharray="11 13"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Endpoint x={ROAD[0][0]} y={ROAD[0][1]} label="Skopje" anchor="end" />
      <Endpoint x={ROAD.at(-1)![0]} y={ROAD.at(-1)![1]} label="Sredno Vodno" anchor="start" />

      {reports.map((report) => {
        const { x, y } = pointAt(progress(report.latitude, report.longitude))
        const active = selectedId === report.id
        const color = markerColor(report)
        return (
          <g
            key={report.id}
            className="marker"
            onClick={() => onSelect?.(report)}
            aria-label={`${CATEGORY_LABELS[report.category]}: ${report.description}`}
          >
            <title>
              {CATEGORY_LABELS[report.category]} · {SEVERITY_LABELS[report.severity]} —{' '}
              {report.description}
            </title>
            <circle cx={x} cy={y} r={active ? 21 : 17} fill={color} opacity={active ? 0.22 : 0.13} />
            <circle
              cx={x}
              cy={y}
              r="12"
              fill={color}
              stroke="var(--surface)"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(19,26,41,.25))' }}
            />
            {/* Nested SVG: renders the category glyph inside the marker. */}
            <Icon
              name={CATEGORY_ICONS[report.category]}
              size={13}
              x={x - 6.5}
              y={y - 6.5}
              stroke="var(--surface)"
              strokeWidth={2.2}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )
      })}
    </svg>
  )
}

export function MapLegend() {
  return (
    <div className="map-legend">
      <span>
        <i style={{ background: 'var(--ok)' }} /> Low
      </span>
      <span>
        <i style={{ background: 'var(--warn)' }} /> Medium
      </span>
      <span>
        <i style={{ background: 'var(--danger)' }} /> High
      </span>
      <span>
        <i style={{ background: 'var(--text-3)' }} /> Resolved
      </span>
    </div>
  )
}
