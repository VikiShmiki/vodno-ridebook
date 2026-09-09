import type { RoadReport } from '../types/api'
import { CATEGORY_ICONS, CATEGORY_LABELS } from './labels'

/**
 * Schematic map of the road up to Sredno Vodno.
 *
 * Reports are projected from their WGS84 coordinates with a linear mapping of
 * the bounding box the API accepts, then snapped onto the drawn road so a
 * marker always sits on the tarmac. It is deliberately not a real tile map,
 * which keeps the frontend free of external map dependencies and API keys.
 */
const BOUNDS = { minLat: 41.985, maxLat: 42.003, minLon: 21.393, maxLon: 21.417 }
const WIDTH = 640
const HEIGHT = 300
const PADDING = 38

// The road as a polyline, drawn bottom-right (city side) to top-left (summit).
const ROAD: Array<[number, number]> = [
  [WIDTH - PADDING, HEIGHT - PADDING],
  [WIDTH - 140, HEIGHT - 78],
  [WIDTH - 205, HEIGHT - 96],
  [WIDTH - 255, HEIGHT - 145],
  [WIDTH - 330, HEIGHT - 158],
  [WIDTH - 400, HEIGHT - 196],
  [WIDTH - 470, HEIGHT - 200],
  [WIDTH - 545, HEIGHT - 236],
  [PADDING + 22, PADDING + 18],
]

const ROAD_PATH = ROAD.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** Fraction along the climb, 0 at the city end and 1 at Sredno Vodno. */
function progress(latitude: number, longitude: number): number {
  const north = clamp((latitude - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat))
  const west = clamp((BOUNDS.maxLon - longitude) / (BOUNDS.maxLon - BOUNDS.minLon))
  // The road climbs north-west, so both axes contribute to the position.
  return (north + west) / 2
}

const SEGMENT_LENGTHS = ROAD.slice(1).map(([x, y], index) =>
  Math.hypot(x - ROAD[index][0], y - ROAD[index][1]),
)
const TOTAL_LENGTH = SEGMENT_LENGTHS.reduce((sum, length) => sum + length, 0)

/** Point at the given fraction of the polyline's total length. */
function pointAt(fraction: number): { x: number; y: number } {
  let remaining = clamp(fraction) * TOTAL_LENGTH
  for (let index = 0; index < SEGMENT_LENGTHS.length; index += 1) {
    const length = SEGMENT_LENGTHS[index]
    if (remaining <= length || index === SEGMENT_LENGTHS.length - 1) {
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
  if (report.resolved) return '#5b6373'
  if (report.severity === 'high') return '#f2635f'
  if (report.severity === 'medium') return '#f5b544'
  return '#3ecf8e'
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
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#12151c" rx="10" />

      <path
        d={ROAD_PATH}
        stroke="#2a2f3a"
        strokeWidth="20"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={ROAD_PATH}
        stroke="#454d5e"
        strokeWidth="2"
        strokeDasharray="11 13"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx={ROAD[0][0]} cy={ROAD[0][1]} r="4" fill="#9aa3b2" />
      <text
        x={ROAD[0][0]}
        y={ROAD[0][1] + 20}
        fill="#9aa3b2"
        fontSize="12"
        textAnchor="end"
      >
        Skopje
      </text>

      <circle cx={ROAD.at(-1)![0]} cy={ROAD.at(-1)![1]} r="4" fill="#9aa3b2" />
      <text x={ROAD.at(-1)![0] + 10} y={ROAD.at(-1)![1] + 4} fill="#9aa3b2" fontSize="12">
        Sredno Vodno
      </text>

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
              {CATEGORY_LABELS[report.category]} — {report.description}
            </title>
            <circle cx={x} cy={y} r={active ? 17 : 13} fill={color} opacity={active ? 0.4 : 0.22} />
            <circle cx={x} cy={y} r="8" fill={color} stroke="#12151c" strokeWidth="1.5" />
            <text
              x={x}
              y={y + 3.5}
              fontSize="9"
              textAnchor="middle"
              fill="#12151c"
              style={{ pointerEvents: 'none' }}
            >
              {CATEGORY_ICONS[report.category]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
