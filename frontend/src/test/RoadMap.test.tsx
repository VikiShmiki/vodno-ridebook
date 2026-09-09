import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RoadMap } from '../components/RoadMap'
import type { RoadReport } from '../types/api'

const report: RoadReport = {
  id: 1,
  category: 'gravel',
  latitude: 41.9906,
  longitude: 21.4098,
  description: 'Loose gravel on the second hairpin.',
  severity: 'high',
  resolved: false,
  created_at: new Date().toISOString(),
}

describe('RoadMap', () => {
  it('draws one marker per report', () => {
    const { container } = render(<RoadMap reports={[report, { ...report, id: 2 }]} />)

    expect(container.querySelectorAll('g.marker')).toHaveLength(2)
    expect(screen.getByRole('img', { name: /Sredno Vodno road/ })).toBeInTheDocument()
  })

  it('renders with no reports at all', () => {
    const { container } = render(<RoadMap reports={[]} />)

    expect(container.querySelectorAll('g.marker')).toHaveLength(0)
  })
})
