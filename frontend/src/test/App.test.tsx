import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'

const EMPTY_STATS = {
  total_rides: 0,
  total_distance_km: 0,
  total_motorcycles: 0,
  open_reports: 0,
  resolved_reports: 0,
  avg_road_quality: null,
  avg_traffic: null,
  avg_cleanliness: null,
  avg_enjoyment: null,
  rides_by_month: [],
  best_rides: [],
  reports_by_category: {},
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = url.includes('/stats')
        ? EMPTY_STATS
        : url.includes('/health')
          ? { status: 'healthy', database: 'connected', version: '1.0.0', environment: 'test' }
          : []
      return { ok: true, status: 200, json: async () => body } as Response
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('renders the navigation and the dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Vodno Ridebook')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Road reports' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument())
  })

  it('shows the API health indicator once the health check resolves', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText(/API v1\.0\.0/)).toBeInTheDocument())
  })
})
