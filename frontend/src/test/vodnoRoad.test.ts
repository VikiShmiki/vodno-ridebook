import { describe, expect, it } from 'vitest'

import { ROAD_BOUNDS, ROAD_LENGTH_KM, ROAD_POINTS } from '../data/vodnoRoad'

/**
 * Guards the generated OpenStreetMap geometry. If someone regenerates
 * src/data/vodnoRoad.ts with the wrong route, these assertions fail rather
 * than the map quietly drawing a road somewhere else.
 */
describe('Vodno road geometry', () => {
  it('is a usable polyline', () => {
    expect(ROAD_POINTS.length).toBeGreaterThan(40)
    expect(ROAD_LENGTH_KM).toBeGreaterThan(4)
    expect(ROAD_LENGTH_KM).toBeLessThan(7)
  })

  it('keeps every point inside the declared bounds', () => {
    for (const [latitude, longitude] of ROAD_POINTS) {
      expect(latitude).toBeGreaterThanOrEqual(ROAD_BOUNDS.minLat)
      expect(latitude).toBeLessThanOrEqual(ROAD_BOUNDS.maxLat)
      expect(longitude).toBeGreaterThanOrEqual(ROAD_BOUNDS.minLon)
      expect(longitude).toBeLessThanOrEqual(ROAD_BOUNDS.maxLon)
    }
  })

  it('starts at the foot of the climb and ends at Sredno Vodno', () => {
    const [startLat, startLon] = ROAD_POINTS[0]
    const [endLat, endLon] = ROAD_POINTS[ROAD_POINTS.length - 1]

    expect(startLat).toBeCloseTo(41.988, 2)
    expect(startLon).toBeCloseTo(21.418, 2)
    // Sredno Vodno, per the Nominatim lookup used when the route was captured.
    expect(endLat).toBeCloseTo(41.976, 2)
    expect(endLon).toBeCloseTo(21.409, 2)
  })

  it('has no duplicated consecutive points', () => {
    for (let i = 1; i < ROAD_POINTS.length; i += 1) {
      expect(ROAD_POINTS[i]).not.toEqual(ROAD_POINTS[i - 1])
    }
  })
})
