/** Vite `import.meta.env.BASE_URL`, e.g. `/inspire-hub/` or `/` */
const BASE = import.meta.env.BASE_URL ?? '/'

function trimSlashes(s) {
  return s.replace(/^\/+|\/+$/g, '')
}

/** Base path with leading slash, no trailing slash: `/inspire-hub` or `` when site is at `/`. */
export function spaBasePath() {
  const t = trimSlashes(BASE)
  return t ? `/${t}` : ''
}

/** App root URL path ending with `/` */
export function spaRootHref() {
  const b = spaBasePath()
  return b ? `${b}/` : '/'
}

/** Dedicated request-account page URL */
export function requestAccountHref() {
  const b = spaBasePath()
  return b ? `${b}/request-account/` : '/request-account/'
}

/**
 * Segment after SPA base: `request-account` or `` (home).
 * @param {string} pathname `window.location.pathname`
 */
export function spaPathKey(pathname) {
  const raw = pathname || '/'
  const p = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw
  const b = spaBasePath()
  if (!b) {
    if (p === '/request-account') return 'request-account'
    return ''
  }
  if (p === b) return ''
  const prefix = `${b}/`
  if (!p.startsWith(prefix)) return ''
  const rest = p.slice(prefix.length)
  return trimSlashes(rest) || ''
}

export function initialAppViewFromLocation() {
  if (typeof window === 'undefined') return 'home'
  return spaPathKey(window.location.pathname) === 'request-account' ? 'requestAccount' : 'home'
}

/**
 * Sync visible URL with request-account vs other views (bookmarkable page + back button).
 * @param {string} activeView
 */
export function syncBrowserPathToAppView(activeView) {
  if (typeof window === 'undefined') return
  const root = spaRootHref()
  const req = requestAccountHref()
  const cur = window.location.pathname.replace(/\/+$/, '') || '/'
  const rootNorm = root.replace(/\/+$/, '') || '/'
  const reqNorm = req.replace(/\/+$/, '') || '/'

  if (activeView === 'requestAccount') {
    if (cur !== reqNorm) {
      window.history.pushState({ appView: 'requestAccount' }, '', req)
    }
  } else if (cur === reqNorm) {
    window.history.replaceState({}, '', root)
  }
}
