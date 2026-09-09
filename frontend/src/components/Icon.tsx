import type { SVGProps } from 'react'

/**
 * Inline SVG icon set.
 *
 * Hand-drawn on a 24x24 grid in a single consistent stroke style, so the app
 * needs no icon-font or icon-library dependency and every glyph inherits
 * `currentColor` and the surrounding font size.
 */
const PATHS = {
  // navigation
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="8.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.6" />
      <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.6" />
    </>
  ),
  rides: (
    <>
      <path d="M5 3.5h11.5a2.5 2.5 0 0 1 2.5 2.5v14.5H7.5A2.5 2.5 0 0 1 5 18z" />
      <path d="M5 16.5h14" />
      <path d="M9 7.5h6M9 11h4" />
    </>
  ),
  reports: (
    <>
      <path d="M12 3.2 2.6 19.5h18.8z" />
      <path d="M12 9.5v4" />
      <path d="M12 16.7h.01" />
    </>
  ),
  stats: (
    <>
      <path d="M3.5 20.5h17" />
      <rect x="5" y="12" width="3.6" height="6" rx="1" />
      <rect x="10.2" y="7.5" width="3.6" height="10.5" rx="1" />
      <rect x="15.4" y="4" width="3.6" height="14" rx="1" />
    </>
  ),

  // report categories
  gravel: (
    <>
      <circle cx="7" cy="8" r="1.7" />
      <circle cx="13.5" cy="6.5" r="1.3" />
      <circle cx="17.5" cy="11" r="1.9" />
      <circle cx="9.5" cy="13.5" r="1.5" />
      <circle cx="15" cy="17" r="1.4" />
      <circle cx="6" cy="18" r="1.2" />
    </>
  ),
  wet_road: (
    <>
      <path d="M12 3.4c3.1 3.4 5.3 6.2 5.3 8.8A5.3 5.3 0 0 1 12 17.5a5.3 5.3 0 0 1-5.3-5.3c0-2.6 2.2-5.4 5.3-8.8Z" />
      <path d="M8.5 20.6c1.4-.9 2.3-.9 3.5 0 1.2.9 2.1.9 3.5 0" />
    </>
  ),
  damaged_asphalt: (
    <>
      <path d="M13.5 2.5 9 10.5h4.5L8.5 21.5" />
      <path d="M3.5 12h3M17.5 8.5h3" />
    </>
  ),
  roadworks: (
    <>
      <path d="M10.4 3.5h3.2l4.4 15.5H6z" />
      <path d="M8.3 12.5h7.4" />
      <path d="M3 19h18" />
    </>
  ),
  traffic: (
    <>
      <path d="M4.5 15.5V11l1.9-4.4A2 2 0 0 1 8.2 5.4h7.6a2 2 0 0 1 1.8 1.2L19.5 11v4.5" />
      <path d="M4.5 15.5h15" />
      <path d="M4.5 11h15" />
      <circle cx="8" cy="18" r="1.6" />
      <circle cx="16" cy="18" r="1.6" />
    </>
  ),
  animals: (
    <>
      <ellipse cx="7" cy="9" rx="1.9" ry="2.5" />
      <ellipse cx="17" cy="9" rx="1.9" ry="2.5" />
      <ellipse cx="10.6" cy="5.4" rx="1.6" ry="2.2" />
      <ellipse cx="15" cy="5.6" rx="1.5" ry="2" />
      <path d="M12 12.6c2.7 0 4.6 1.9 4.6 4.1 0 2-1.6 3.2-3.3 2.9-.9-.2-1.7-.2-2.6 0-1.7.3-3.3-.9-3.3-2.9 0-2.2 1.9-4.1 4.6-4.1Z" />
    </>
  ),
  poor_visibility: (
    <>
      <path d="M2.6 12.4S6 6.6 12 6.6c1.5 0 2.9.4 4.1 1" />
      <path d="M21.4 12.4a17 17 0 0 1-3 3.6" />
      <path d="M9.5 15a3.5 3.5 0 0 0 5-4.9" />
      <path d="M3.5 3.5 20.5 20.5" />
    </>
  ),
  other: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4" />
      <path d="M12 17.4h.01" />
    </>
  ),

  // weather
  sunny: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6" />
    </>
  ),
  cloudy: (
    <path d="M17.3 19.5a4.4 4.4 0 0 0 .3-8.8 6.2 6.2 0 0 0-11.9 1.4 3.7 3.7 0 0 0 .6 7.4z" />
  ),
  rain: (
    <>
      <path d="M17.3 15.6a4.2 4.2 0 0 0 .3-8.4 6 6 0 0 0-11.6 1.4 3.6 3.6 0 0 0 .6 7z" />
      <path d="M8.6 18.2 7.7 20.6M12.4 18.2l-.9 2.4M16.2 18.2l-.9 2.4" />
    </>
  ),
  fog: (
    <>
      <path d="M17.3 13.4a4.2 4.2 0 0 0 .3-8.4A6 6 0 0 0 6 6.4a3.6 3.6 0 0 0 .6 7z" />
      <path d="M4.5 17h15M7 20.5h12" />
    </>
  ),
  wind: (
    <>
      <path d="M3.5 8.5h9.2a2.7 2.7 0 1 0-2.7-2.7" />
      <path d="M3.5 12.5h13a2.7 2.7 0 1 1-2.7 2.7" />
      <path d="M3.5 16.5h6" />
    </>
  ),
  cold: (
    <>
      <path d="M12 2.8v18.4M4 7.4l16 9.2M20 7.4 4 16.6" />
      <path d="M9.6 4.6 12 6.9l2.4-2.3M9.6 19.4 12 17.1l2.4 2.3" />
    </>
  ),

  // general
  route: (
    <>
      <circle cx="5.5" cy="18.5" r="2.3" />
      <circle cx="18.5" cy="5.5" r="2.3" />
      <path d="M8 17.5c4.5-1 4.5-4.5 1.5-6S8.5 6.5 16 6" />
    </>
  ),
  motorcycle: (
    <>
      <circle cx="5.3" cy="16.5" r="3.4" />
      <circle cx="18.7" cy="16.5" r="3.4" />
      <path d="M5.3 16.5 9 9.5h6l3.7 7" />
      <path d="M9.5 9.5h6.8" />
      <path d="M14.4 6.5h2.9" />
    </>
  ),
  star: <path d="m12 3.2 2.65 5.55 6.05.82-4.4 4.3 1.07 6.03L12 17.05l-5.37 2.85 1.07-6.03-4.4-4.3 6.05-.82z" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.2M12 16.4h.01" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  trash: (
    <>
      <path d="M4 6.5h16" />
      <path d="M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7" />
      <path d="M6.2 6.5 7 19.3c.05.9.8 1.6 1.7 1.6h6.6c.9 0 1.65-.7 1.7-1.6l.8-12.8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  undo: (
    <>
      <path d="M3.5 5.5v5.2h5.2" />
      <path d="M4.4 10.7a8 8 0 1 1 1.4 6.6" />
    </>
  ),
  map: (
    <>
      <path d="M9.2 3.6 3.5 6v14.4l5.7-2.4 5.6 2.4 5.7-2.4V3.6l-5.7 2.4z" />
      <path d="M9.2 3.6v14.4M14.8 6v14.4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
      <circle cx="12" cy="10.3" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8V12l3.4 2" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 12.5h4l1.5 3h6l1.5-3h4" />
      <path d="M5.6 4.8 3.5 12.5v4.4c0 1.2 1 2.2 2.2 2.2h12.6c1.2 0 2.2-1 2.2-2.2v-4.4L18.4 4.8a2.2 2.2 0 0 0-2-1.3H7.6a2.2 2.2 0 0 0-2 1.3Z" />
    </>
  ),
  arrow: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  filter: <path d="M3.5 5.5h17l-6.6 7.8v5.6l-3.8 2v-7.6z" />,
} as const

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  filled?: boolean
}

export function Icon({ name, size = 16, filled = false, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[]
