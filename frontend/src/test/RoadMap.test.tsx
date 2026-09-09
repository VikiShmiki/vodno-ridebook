import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RoadMap, nearestOnRoad, snapCoordinates } from '../components/RoadMap'
import { ROAD_LENGTH_KM, ROAD_POINTS } from '../data/vodnoRoad'
import type { RoadReport } from '../types/api'

const report: RoadReport = {
  id: 1,
  category: 'gravel',
  latitude: 41.97459,
  longitude: 21.42797,
  description: 'Loose gravel on the hairpin 2.6 km up.',
  severity: 'high',
  resolved: false,
  created_at: new Date().toISOString(),
}

/** jsdom reports a zero-sized box for everything, so give the map a real one. */
function stubLayout(svg: SVGSVGElement, width = 580, height = 541) {
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0 }) as DOMRect
}

describe('RoadMap', () => {
  it('draws one marker per report', () => {
    const { container } = render(<RoadMap reports={[report, { ...report, id: 2 }]} />)

    expect(container.querySelectorAll('g.marker')).toHaveLength(2)
    expect(screen.getByRole('img', { name: /Sredno Vodno/ })).toBeInTheDocument()
  })

  it('renders with no reports at all', () => {
    const { container } = render(<RoadMap reports={[]} />)

    expect(container.querySelectorAll('g.marker')).toHaveLength(0)
  })

  it('is a plain image until pick mode is enabled', () => {
    const { container } = render(<RoadMap reports={[]} />)

    expect(container.querySelector('svg')).not.toHaveClass('pickable')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('becomes an operable control when onPick is supplied', () => {
    const { container } = render(<RoadMap reports={[]} onPick={vi.fn()} />)

    const svg = container.querySelector('svg')!
    expect(svg).toHaveClass('pickable')
    expect(screen.getByRole('button', { name: /Click the road to place/ })).toBeInTheDocument()
  })

  it('maps a click position to the nearest spot on the road', () => {
    const onPick = vi.fn()
    const { container } = render(<RoadMap reports={[]} onPick={onPick} />)

    const svg = container.querySelector('svg') as SVGSVGElement
    stubLayout(svg)
    fireEvent.click(svg, { clientX: 300, clientY: 200 })

    expect(onPick).toHaveBeenCalledTimes(1)
    const picked = onPick.mock.calls[0][0]
    expect(picked.km).toBeGreaterThanOrEqual(0)
    expect(picked.km).toBeLessThanOrEqual(ROAD_LENGTH_KM + 0.1)
    // The returned position must be a real place on the Vodno road.
    expect(picked.latitude).toBeGreaterThan(41.97)
    expect(picked.latitude).toBeLessThan(41.99)
    expect(picked.longitude).toBeGreaterThan(21.4)
    expect(picked.longitude).toBeLessThan(21.43)
  })

  it('ignores a click while the map has no measurable size', () => {
    const onPick = vi.fn()
    const { container } = render(<RoadMap reports={[]} onPick={onPick} />)

    // jsdom's default: a zero-sized rect, which would otherwise divide by zero.
    fireEvent.click(container.querySelector('svg') as SVGSVGElement)

    expect(onPick).not.toHaveBeenCalled()
  })

  it('draws the pin only when one is being placed', () => {
    const { container, rerender } = render(<RoadMap reports={[]} />)
    expect(container.querySelector('g.pin-marker')).toBeNull()

    rerender(<RoadMap reports={[]} pin={{ latitude: 41.97708, longitude: 21.42646 }} />)
    expect(container.querySelector('g.pin-marker')).not.toBeNull()
  })
})

describe('snapping', () => {
  it('leaves a point already on the road essentially where it is', () => {
    const [latitude, longitude] = ROAD_POINTS[50]

    const snapped = snapCoordinates(latitude, longitude)

    expect(snapped.latitude).toBeCloseTo(latitude, 4)
    expect(snapped.longitude).toBeCloseTo(longitude, 4)
  })

  it('pulls a point well off the road back onto it', () => {
    const offRoad = snapCoordinates(41.985, 21.405)

    // Snapping must land on the centreline, not on the requested coordinates.
    const onTheLine = snapCoordinates(offRoad.latitude, offRoad.longitude)
    expect(onTheLine.latitude).toBeCloseTo(offRoad.latitude, 4)
    expect(onTheLine.longitude).toBeCloseTo(offRoad.longitude, 4)
  })

  it('measures distance along the climb monotonically', () => {
    const foot = snapCoordinates(...ROAD_POINTS[0])
    const middle = snapCoordinates(...ROAD_POINTS[50])
    const top = snapCoordinates(...ROAD_POINTS[ROAD_POINTS.length - 1])

    expect(foot.km).toBeLessThan(middle.km)
    expect(middle.km).toBeLessThan(top.km)
    expect(top.km).toBeCloseTo(ROAD_LENGTH_KM, 0)
  })

  it('clamps a click far outside the frame to the ends of the road', () => {
    const beyond = nearestOnRoad({ x: -5000, y: -5000 })

    expect(beyond.km).toBeGreaterThanOrEqual(0)
    expect(beyond.km).toBeLessThanOrEqual(ROAD_LENGTH_KM + 0.1)
  })
})
