import { describe, expect, it } from 'vitest'

import { CATEGORY_LABELS, formatDate, timeAgo } from '../components/labels'
import { REPORT_CATEGORIES } from '../types/api'

describe('labels', () => {
  it('has a human readable label for every API report category', () => {
    for (const category of REPORT_CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeTruthy()
    }
  })

  it('formats an ISO date without shifting the day', () => {
    expect(formatDate('2026-05-14')).toBe('14 May 2026')
  })

  it('renders a relative timestamp', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString()
    expect(timeAgo(tenMinutesAgo)).toBe('10 min ago')
  })
})
