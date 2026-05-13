const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Image URL from the API (absolute or /media/...) for use in <img src>.
 */
export function resolveMediaUrl(href) {
  if (!href) return ''
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  const path = href.startsWith('/') ? href : `/${href}`
  if (API_BASE) {
    try {
      const normalized = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE
      const origin = new URL(`${normalized}/`).origin
      return `${origin}${path}`
    } catch {
      return path
    }
  }
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return `http://127.0.0.1:8000${path}`
  }
  return path
}
