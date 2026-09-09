import type { IconName } from './Icon'
import type { ReportCategory, Severity, Weather } from '../types/api'

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  gravel: 'Gravel / debris',
  wet_road: 'Wet / slippery',
  damaged_asphalt: 'Damaged asphalt',
  roadworks: 'Roadworks',
  traffic: 'Heavy traffic',
  animals: 'Animals',
  poor_visibility: 'Poor visibility',
  other: 'Other',
}

export const CATEGORY_ICONS: Record<ReportCategory, IconName> = {
  gravel: 'gravel',
  wet_road: 'wet_road',
  damaged_asphalt: 'damaged_asphalt',
  roadworks: 'roadworks',
  traffic: 'traffic',
  animals: 'animals',
  poor_visibility: 'poor_visibility',
  other: 'other',
}

export const WEATHER_LABELS: Record<Weather, string> = {
  sunny: 'Sunny',
  cloudy: 'Cloudy',
  rain: 'Rain',
  fog: 'Fog',
  wind: 'Wind',
  cold: 'Cold',
}

export const WEATHER_ICONS: Record<Weather, IconName> = {
  sunny: 'sunny',
  cloudy: 'cloudy',
  rain: 'rain',
  fog: 'fog',
  wind: 'wind',
  cold: 'cold',
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function timeAgo(isoTimestamp: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(isoTimestamp)) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}
