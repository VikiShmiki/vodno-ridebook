import { api } from './client'
import type {
  Health,
  Motorcycle,
  Ride,
  RideCreate,
  RoadReport,
  RoadReportCreate,
  Stats,
} from '../types/api'

export const getHealth = () => api.get<Health>('/health')

export const listRides = (limit = 50) => api.get<Ride[]>(`/rides?limit=${limit}`)
export const createRide = (ride: RideCreate) => api.post<Ride>('/rides', ride)
export const deleteRide = (id: number) => api.delete(`/rides/${id}`)

export const listReports = (resolved?: boolean) =>
  api.get<RoadReport[]>(resolved === undefined ? '/reports' : `/reports?resolved=${resolved}`)
export const createReport = (report: RoadReportCreate) =>
  api.post<RoadReport>('/reports', report)
export const resolveReport = (id: number, resolved: boolean) =>
  api.patch<RoadReport>(`/reports/${id}`, { resolved })
export const deleteReport = (id: number) => api.delete(`/reports/${id}`)

export const listMotorcycles = () => api.get<Motorcycle[]>('/motorcycles')
export const createMotorcycle = (payload: Omit<Motorcycle, 'id' | 'created_at'>) =>
  api.post<Motorcycle>('/motorcycles', payload)

export const getStats = () => api.get<Stats>('/stats')
