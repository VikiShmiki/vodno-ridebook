import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api } from '../api/client'

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const spy = vi.fn().mockResolvedValue(response as Response)
  vi.stubGlobal('fetch', spy)
  return spy
}

afterEach(() => vi.unstubAllGlobals())

describe('api client', () => {
  it('prefixes every request with /api', async () => {
    const spy = mockFetch({ ok: true, status: 200, json: async () => ({ status: 'healthy' }) })

    await api.get('/health')

    expect(spy).toHaveBeenCalledWith('/api/health', expect.objectContaining({ headers: expect.any(Object) }))
  })

  it('surfaces the FastAPI detail message on an error response', async () => {
    mockFetch({ ok: false, status: 404, json: async () => ({ detail: 'Ride not found' }) })

    await expect(api.get('/rides/1')).rejects.toThrow(new ApiError('Ride not found', 404))
  })

  it('returns undefined for a 204 response', async () => {
    mockFetch({ ok: true, status: 204 })

    await expect(api.delete('/rides/1')).resolves.toBeUndefined()
  })
})
