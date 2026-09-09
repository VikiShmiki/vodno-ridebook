export const REPORT_CATEGORIES = [
  'gravel',
  'wet_road',
  'damaged_asphalt',
  'roadworks',
  'traffic',
  'animals',
  'poor_visibility',
  'other',
] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export const SEVERITIES = ['low', 'medium', 'high'] as const
export type Severity = (typeof SEVERITIES)[number]

export const WEATHER_OPTIONS = ['sunny', 'cloudy', 'rain', 'fog', 'wind', 'cold'] as const
export type Weather = (typeof WEATHER_OPTIONS)[number]

export interface Motorcycle {
  id: number
  manufacturer: string
  model: string
  year: number
  odometer: number
  created_at: string
}

export interface Ride {
  id: number
  date: string
  time: string | null
  motorcycle_id: number | null
  motorcycle: Motorcycle | null
  weather: Weather
  distance_km: number | null
  traffic_rating: number
  road_quality_rating: number
  road_cleanliness_rating: number
  enjoyment_rating: number
  notes: string | null
  created_at: string
}

export type RideCreate = Omit<Ride, 'id' | 'created_at' | 'motorcycle'>

export interface RoadReport {
  id: number
  category: ReportCategory
  latitude: number
  longitude: number
  description: string
  severity: Severity
  resolved: boolean
  created_at: string
}

export type RoadReportCreate = Omit<RoadReport, 'id' | 'created_at' | 'resolved'>

export interface MonthCount {
  month: string
  rides: number
}

export interface Stats {
  total_rides: number
  total_distance_km: number
  total_motorcycles: number
  open_reports: number
  resolved_reports: number
  avg_road_quality: number | null
  avg_traffic: number | null
  avg_cleanliness: number | null
  avg_enjoyment: number | null
  rides_by_month: MonthCount[]
  best_rides: Ride[]
  reports_by_category: Record<string, number>
}

export interface Health {
  status: string
  database: string
  version: string
  environment: string
}
