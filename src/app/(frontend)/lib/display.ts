/** Small display helpers shared by the home page's server-rendered cards. */

const countryDisplayNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' })
  } catch {
    return null
  }
})()

export function countryName(code?: string | null): string {
  if (!code) return ''
  return countryDisplayNames?.of(code.toUpperCase()) ?? code
}

// Simple gray silhouette used when a researcher has no photo (or none downloaded yet).
export const PLACEHOLDER_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">' +
      '<rect width="180" height="180" fill="#e4ddcd"/>' +
      '<circle cx="90" cy="70" r="34" fill="#c9bfa5"/>' +
      '<ellipse cx="90" cy="168" rx="58" ry="46" fill="#c9bfa5"/>' +
      '</svg>',
  )

/** Picks black or white text for a given hex background, by relative luminance. */
export function contrastTextColor(hex?: string | null): string {
  if (!hex) return '#fff'
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16) / 255
  const g = parseInt(c.substring(2, 4), 16) / 255
  const b = parseInt(c.substring(4, 6), 16) / 255
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 0.6 ? '#000' : '#fff'
}
