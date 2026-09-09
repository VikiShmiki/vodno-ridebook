import { Icon } from './Icon'
import { CATEGORY_ICONS, CATEGORY_LABELS, SEVERITY_LABELS } from './labels'
import {
  ROAD_ATTRIBUTION,
  ROAD_BOUNDS,
  ROAD_END_LABEL,
  ROAD_POINTS,
  ROAD_START_LABEL,
} from '../data/vodnoRoad'
import type { RoadReport } from '../types/api'

/**
 * Map of the real road from Skopje up to Sredno Vodno.
 *
 * The centreline is the actual OpenStreetMap geometry, committed to the repo
 * by scripts/fetch-road-geometry.py, so the shape on screen is the shape of
 * the road. Coordinates are drawn with a local equirectangular projection at a
 * single uniform scale, which keeps the hairpins undistorted. Nothing is
 * fetched at runtime: no tile server, no API key, no third-party request.
 */
const WIDTH = 580
const PADDING_X = 58
const PADDING_Y = 34

const MEAN_LAT = (ROAD_BOUNDS.minLat + ROAD_BOUNDS.maxLat) / 2
const METRES_PER_DEG_LAT = 111_320
const METRES_PER_DEG_LON = 111_320 * Math.cos((MEAN_LAT * Math.PI) / 180)

const SPAN_X_M = (ROAD_BOUNDS.maxLon - ROAD_BOUNDS.minLon) * METRES_PER_DEG_LON
const SPAN_Y_M = (ROAD_BOUNDS.maxLat - ROAD_BOUNDS.minLat) * METRES_PER_DEG_LAT

// One scale for both axes, so 100 m east is the same length as 100 m north.
const SCALE = (WIDTH - 2 * PADDING_X) / SPAN_X_M
const HEIGHT = SPAN_Y_M * SCALE + 2 * PADDING_Y

interface Point {
  x: number
  y: number
}

function project(latitude: number, longitude: number): Point {
  return {
    x: PADDING_X + (longitude - ROAD_BOUNDS.minLon) * METRES_PER_DEG_LON * SCALE,
    y: PADDING_Y + (ROAD_BOUNDS.maxLat - latitude) * METRES_PER_DEG_LAT * SCALE,
  }
}

const ROAD_XY: Point[] = ROAD_POINTS.map(([lat, lon]) => project(lat, lon))
const ROAD_PATH = ROAD_XY.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

const START = ROAD_XY[0]
const END = ROAD_XY[ROAD_XY.length - 1]

/** Cumulative length along the drawn road, in SVG units. */
const CUMULATIVE: number[] = ROAD_XY.reduce<number[]>((acc, point, index) => {
  acc.push(index === 0 ? 0 : acc[index - 1] + Math.hypot(point.x - ROAD_XY[index - 1].x, point.y - ROAD_XY[index - 1].y))
  return acc
}, [])
const TOTAL_LENGTH = CUMULATIVE[CUMULATIVE.length - 1]
const PX_PER_METRE = SCALE
const KM_IN_PX = 1000 * PX_PER_METRE

/** Point at a given distance along the road, for the kilometre ticks. */
function pointAtLength(distance: number): Point {
  for (let i = 1; i < CUMULATIVE.length; i += 1) {
    if (CUMULATIVE[i] >= distance) {
      const segment = CUMULATIVE[i] - CUMULATIVE[i - 1]
      const t = segment === 0 ? 0 : (distance - CUMULATIVE[i - 1]) / segment
      const a = ROAD_XY[i - 1]
      const b = ROAD_XY[i]
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
  }
  return ROAD_XY[ROAD_XY.length - 1]
}

const KM_TICKS = Array.from({ length: Math.floor(TOTAL_LENGTH / KM_IN_PX) }, (_, index) => ({
  km: index + 1,
  ...pointAtLength((index + 1) * KM_IN_PX),
}))

/**
 * Nearest point on the road to a reported position.
 *
 * A rider marks a spot from the saddle or from memory, so a report can sit a
 * few metres off the centreline. Snapping keeps every marker on the tarmac.
 */
function snapToRoad(latitude: number, longitude: number): Point {
  const target = project(latitude, longitude)
  let best = ROAD_XY[0]
  let bestDistance = Infinity

  for (let i = 1; i < ROAD_XY.length; i += 1) {
    const a = ROAD_XY[i - 1]
    const b = ROAD_XY[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSquared = dx * dx + dy * dy
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, ((target.x - a.x) * dx + (target.y - a.y) * dy) / lengthSquared))
    const candidate = { x: a.x + dx * t, y: a.y + dy * t }
    const distance = Math.hypot(target.x - candidate.x, target.y - candidate.y)
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }

  return best
}

function markerColor(report: RoadReport): string {
  if (report.resolved) return 'var(--text-3)'
  if (report.severity === 'high') return 'var(--danger)'
  if (report.severity === 'medium') return 'var(--warn)'
  return 'var(--ok)'
}

function EndpointDot({ point }: { point: Point }) {
  return (
    <circle cx={point.x} cy={point.y} r="5" fill="var(--surface)" stroke="var(--text-2)" strokeWidth="2.5" />
  )
}

/**
 * Endpoint captions are drawn above the point and last of all, with a halo, so
 * a marker sitting on the same spot cannot obscure them.
 */
function EndpointLabel({ point, label }: { point: Point; label: string }) {
  const anchor = point.x > WIDTH / 2 ? 'end' : 'start'
  return (
    <text
      x={point.x + (anchor === 'end' ? 7 : -7)}
      y={point.y - 16}
      textAnchor={anchor}
      fill="var(--text-2)"
      fontSize="12"
      fontWeight="650"
      stroke="var(--surface)"
      strokeWidth="3.5"
      paintOrder="stroke"
    >
      {label}
    </text>
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
      viewBox={`0 0 ${WIDTH} ${HEIGHT.toFixed(0)}`}
      role="img"
      aria-label="Map of the road from Skopje up to Sredno Vodno with reported conditions"
    >
      <defs>
        <linearGradient id="hillside" x1="0" y1="1" x2="0.2" y2="0">
          <stop offset="0%" stopColor="var(--surface-2)" />
          <stop offset="100%" stopColor="var(--bg-tint)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#hillside)" />

      {/* Road: dark casing, tarmac, centre line. */}
      <path d={ROAD_PATH} stroke="var(--road-edge)" strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={ROAD_PATH} stroke="var(--road)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={ROAD_PATH}
        stroke="var(--road-line)"
        strokeWidth="1.4"
        strokeDasharray="7 8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Kilometre markers along the real centreline. */}
      {KM_TICKS.map((tick) => (
        <g key={tick.km}>
          <circle cx={tick.x} cy={tick.y} r="7.5" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.2" />
          <text x={tick.x} y={tick.y + 3.2} textAnchor="middle" fontSize="8.5" fontWeight="650" fill="var(--text-3)">
            {tick.km}
          </text>
        </g>
      ))}

      <EndpointDot point={START} />
      <EndpointDot point={END} />

      {reports.map((report) => {
        const { x, y } = snapToRoad(report.latitude, report.longitude)
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
            <circle cx={x} cy={y} r={active ? 20 : 16} fill={color} opacity={active ? 0.22 : 0.13} />
            <circle
              cx={x}
              cy={y}
              r="11"
              fill={color}
              stroke="var(--surface)"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(19,26,41,.25))' }}
            />
            <Icon
              name={CATEGORY_ICONS[report.category]}
              size={12}
              x={x - 6}
              y={y - 6}
              stroke="var(--surface)"
              strokeWidth={2.2}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )
      })}

      <EndpointLabel point={START} label={ROAD_START_LABEL} />
      <EndpointLabel point={END} label={ROAD_END_LABEL} />

      <text x={WIDTH - 8} y={HEIGHT - 7} textAnchor="end" fontSize="9" fill="var(--text-3)">
        {ROAD_ATTRIBUTION}
      </text>
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
      <span className="faint" style={{ marginLeft: 'auto' }}>
        ① … ⑤ kilometres from the foot of the climb
      </span>
    </div>
  )
}
