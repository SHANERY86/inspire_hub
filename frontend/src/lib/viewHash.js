/**
 * Deep-link views with the same SPA document as Home (needed for BarcodeDetector
 * and other APIs that depend on origin / secure context / top-level page).
 *
 * @typedef {'home' | 'addInspiration' | 'sourcesGallery' | 'addSource'} AppView
 */

const SLUG_BY_VIEW = {
  home: '',
  addInspiration: 'add-inspiration',
  sourcesGallery: 'sources',
  addSource: 'add-source',
}

/** @type {Record<string, AppView>} */
const VIEW_BY_SLUG = {
  '': 'home',
  'add-inspiration': 'addInspiration',
  sources: 'sourcesGallery',
  'add-source': 'addSource',
}

export function parseViewFromLocation() {
  if (typeof window === 'undefined') return 'home'
  const raw = (window.location.hash || '').replace(/^#/, '').trim()
  if (!raw) return 'home'
  const first = raw.split('/')[0]
  return VIEW_BY_SLUG[first] ?? 'home'
}

/** @param {AppView} view */
export function syncHashToView(view) {
  if (typeof window === 'undefined') return
  const slug = SLUG_BY_VIEW[view] ?? ''
  const { pathname, search } = window.location
  const nextHash = slug ? `#${slug}` : ''
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, '', `${pathname}${search}${nextHash}`)
  }
}
