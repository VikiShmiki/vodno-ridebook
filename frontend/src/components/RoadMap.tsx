import type { RoadReport } from '../types/api'
import { CATEGORY_ICONS, CATEGORY_LABELS } from './labels'

/**
 * Schematic map of the road up to Sredno Vodno.
 *
 * Reports are projected from their WGS84 coordinates into the SVG viewBox with
 * a plain linear mapping of the bounding box the API accepts. It is not a real
 * tile map, which keeps the frontend free of external map dependencies.
 */
const BOUNDS = { minLat: 41.975, maxLat: 42.01, minLon: 21.385, maxLon: 21.425 }
const WIDTH = 640
const HEIGHT = 300
const PADDING = 34

const clamp = (value: number) => Math.min(1, Math.max(0, value))

function project(latitude: number, longitude: number) {
  const xRatio = clamp((longitude - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon))
  const yRatio = clamp((latitude - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat))
  return {
    // Longitude increases eastwards, latitude increases northwards (upwards).
    x: PADDING + (WIDTH - 2 * PADDING) * (1 - xRatio),
    y: HEIGHT - PADDING - (HEIGHT - 2 * PADDING) * yRatio,
  }
}

const ROAD_PATH = `M ${WIDTH - PADDING} ${HEIGHT - PADDING}
  C ${WIDTH - 150} ${HEIGHT - 60}, ${WIDTH - 210} ${HEIGHT - 150}, ${WIDTH / 2 + 40} ${HEIGHT / 2}
  C ${WIDTH / 2 - 60} ${HEIGHT / 2 - 50}, ${PADDING + 150} ${PADDING + 110}, ${PADDING + 60} ${PADDING + 20}`

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
      <path d={ROAD_PATH} stroke="#2a2f3a" strokeWidth="18" fill="none" strokeLinecap="round" />
      <path
        d={ROAD_PATH}
        stroke="#3a4152"
        strokeWidth="2"
        strokeDasharray="10 12"
        fill="none"
        strokeLinecap="round"
      />

      <text x={WIDTH - PADDING - 6} y={HEIGHT - PADDING + 22} fill="#9aa3b2" fontSize="12" textAnchor="end">
        Skopje / Vodno base
      </text>
      <text x={PADDING + 20} y={PADDING + 4} fill="#9aa3b2" fontSize="12">
        Sredno Vodno
      </text>

      {reports.map((report) => {
        const { x, y } = project(report.latitude, report.longitude)
        const active = selectedId === report.id
        const color = report.resolved
          ? '#5b6373'
          : report.severity === 'high'
            ? '#f2635f'
            : report.severity === 'medium'
              ? '#f5b544'
              : '#3ecf8e'
        return (
          <g
            key={report.id}
            className="marker"
            onClick={() => onSelect?.(report)}
            aria-label={`${CATEGORY_LABELS[report.category]}: ${report.description}`}
          >
            <circle cx={x} cy={y} r={active ? 15 : 11} fill={color} opacity={active ? 0.35 : 0.2} />
            <circle cx={x} cy={y} r="7" fill={color} />
            <text x={x} y={y + 3.5} fontSize="8" textAnchor="middle" fill="#12151c">
              {CATEGORY_ICONS[report.category]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
