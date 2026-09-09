import { describe, expect, it } from 'vitest'

import { ICON_NAMES } from '../components/Icon'
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  WEATHER_ICONS,
  WEATHER_LABELS,
  formatDate,
  timeAgo,
} from '../components/labels'
import { REPORT_CATEGORIES, SEVERITIES, WEATHER_OPTIONS } from '../types/api'

describe('labels', () => {
  it('has a human readable label for every API report category', () => {
    for (const category of REPORT_CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeTruthy()
    }
  })

  it('labels every weather option and severity', () => {
    for (const weather of WEATHER_OPTIONS) expect(WEATHER_LABELS[weather]).toBeTruthy()
    for (const severity of SEVERITIES) expect(SEVERITY_LABELS[severity]).toBeTruthy()
  })

  it('maps every category and weather value to an icon that actually exists', () => {
    for (const category of REPORT_CATEGORIES) {
      expect(ICON_NAMES).toContain(CATEGORY_ICONS[category])
    }
    for (const weather of WEATHER_OPTIONS) {
      expect(ICON_NAMES).toContain(WEATHER_ICONS[weather])
    }
  })

  it('formats an ISO date without shifting the day', () => {
    expect(formatDate('2026-05-14')).toBe('14 May 2026')
  })

  it('renders a relative timestamp', () => {
    expect(timeAgo(new Date(Date.now() - 10 * 60_000).toISOString())).toBe('10 min ago')
    expect(timeAgo(new Date().toISOString())).toBe('just now')
  })
})
