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

/** A place on the road: where to draw it, where it is, and how far up it is. */
export interface RoadPosition extends Point {
  latitude: number
  longitude: number
  /** Distance from the foot of the climb, in kilometres. */
  km: number
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

function unproject(x: number, y: number): { latitude: number; longitude: number } {
  return {
    longitude: ROAD_BOUNDS.minLon + (x - PADDING_X) / (METRES_PER_DEG_LON * SCALE),
    latitude: ROAD_BOUNDS.maxLat - (y - PADDING_Y) / (METRES_PER_DEG_LAT * SCALE),
  }
}

/**
 * Nearest point on the road to an arbitrary point in the drawing.
 *
 * Used both for placing existing reports - a rider marks a spot from the
 * saddle, so it can sit a few metres off the centreline - and for turning a
 * click anywhere on the map into a position on the tarmac.
 */
export function nearestOnRoad(target: Point): RoadPosition {
  let best = ROAD_XY[0]
  let bestDistance = Infinity
  let bestAlong = 0

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
      bestAlong = CUMULATIVE[i - 1] + t * Math.sqrt(lengthSquared)
    }
  }

  return {
    ...best,
    ...unproject(best.x, best.y),
    // CUMULATIVE is in drawing units; SCALE converts back to metres.
    km: bestAlong / SCALE / 1000,
  }
}

/** Convenience wrapper for a report that already has coordinates. */
export function snapCoordinates(latitude: number, longitude: number): RoadPosition {
  return nearestOnRoad(project(latitude, longitude))
}

/**
 * Decorative contour lines. They are not survey data - they only give the
 * frame a sense of a hillside rising towards the summit, which is south of
 * the city and therefore towards the bottom of the drawing.
 */
const CONTOURS = Array.from({ length: 6 }, (_, index) => {
  const y = HEIGHT * (0.16 + index * 0.145)
  const sag = 26 + index * 5
  return `M -20 ${y.toFixed(0)} C ${WIDTH * 0.28} ${(y - sag).toFixed(0)}, ${(
    WIDTH * 0.62
  ).toFixed(0)} ${(y + sag * 0.7).toFixed(0)}, ${WIDTH + 20} ${(y - sag * 0.4).toFixed(0)}`
})

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
  onPick,
  pin,
}: {
  reports: RoadReport[]
  selectedId?: number | null
  onSelect?: (report: RoadReport) => void
  /** Enables pick mode: a click anywhere returns the nearest spot on the road. */
  onPick?: (position: RoadPosition) => void
  /** Coordinates of the pin being placed, drawn on top of the reports. */
  pin?: { latitude: number; longitude: number } | null
}) {
  const pickable = Boolean(onPick)

  /** Translate a click into drawing coordinates, then onto the road. */
  function pick(event: { clientX: number; clientY: number; currentTarget: SVGSVGElement }) {
    if (!onPick) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    // The element always keeps the viewBox aspect ratio (width:100%, height:auto),
    // so the viewBox maps onto the box linearly and this scaling is exact.
    onPick(
      nearestOnRoad({
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      }),
    )
  }

  const pinAt = pin ? snapCoordinates(pin.latitude, pin.longitude) : null

  return (
    <svg
      className={pickable ? 'roadmap pickable' : 'roadmap'}
      viewBox={`0 0 ${WIDTH} ${HEIGHT.toFixed(0)}`}
      role={pickable ? 'button' : 'img'}
      tabIndex={pickable ? 0 : undefined}
      aria-label={
        pickable
          ? 'Map of the road up to Sredno Vodno. Click the road to place the report pin.'
          : 'Map of the road from Skopje up to Sredno Vodno with reported conditions'
      }
      onClick={pickable ? pick : undefined}
    >
      <defs>
        {/* North (Skopje) is at the top of the frame and the mountain rises
            southwards, so the green deepens towards the bottom. */}
        <linearGradient id="hillside" x1="0.15" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--terrain-high)" />
          <stop offset="100%" stopColor="var(--terrain-low)" />
        </linearGradient>
        <clipPath id="frame">
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="9" />
        </clipPath>
      </defs>

      <g clipPath="url(#frame)">
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#hillside)" />
        {/* Contour lines, evenly spaced up the slope. */}
        <g stroke="var(--terrain-line)" strokeWidth="1" fill="none" opacity="0.7">
          {CONTOURS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>

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
        const { x, y } = snapCoordinates(report.latitude, report.longitude)
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

      {pinAt && (
        <g className="pin-marker" aria-hidden="true">
          <circle cx={pinAt.x} cy={pinAt.y} r="19" fill="var(--accent)" opacity="0.16" />
          <circle cx={pinAt.x} cy={pinAt.y} r="10.5" fill="var(--accent)" opacity="0.28" />
          <path
            d={`M ${pinAt.x} ${pinAt.y - 30} a 9.5 9.5 0 0 1 9.5 9.5 c 0 6.6 -9.5 20.5 -9.5 20.5 s -9.5 -13.9 -9.5 -20.5 a 9.5 9.5 0 0 1 9.5 -9.5 z`}
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 2px 3px rgba(19,26,41,.3))' }}
          />
          <circle cx={pinAt.x} cy={pinAt.y - 20.5} r="3.4" fill="var(--surface)" />
        </g>
      )}

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
