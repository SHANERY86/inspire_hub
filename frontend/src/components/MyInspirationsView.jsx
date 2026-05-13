import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveMediaUrl } from '../lib/mediaUrl.js'

function formatInspirationDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function MyInspirationsView({
  loading,
  error,
  listAuthRequired,
  onSignInClick,
  inspirations,
}) {
  const [lightboxSrc, setLightboxSrc] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!lightboxSrc) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lightboxSrc])

  useEffect(() => {
    if (!lightboxSrc) return
    function onKey(e) {
      if (e.key === 'Escape') setLightboxSrc(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxSrc])

  if (listAuthRequired) {
    return (
      <section className="card view-panel my-inspirations-view">
        <h2 className="view-panel-heading">My inspirations</h2>
        <p className="hint">
          Sign in to see your saved inspirations.{' '}
          <button type="button" className="secondary" onClick={onSignInClick}>
            Sign in
          </button>
        </p>
      </section>
    )
  }

  const lightbox =
    lightboxSrc &&
    createPortal(
      <div
        className="my-inspirations-lightbox-backdrop"
        role="presentation"
        onClick={() => setLightboxSrc(null)}
      >
        <div
          className="my-inspirations-lightbox-dialog card"
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="my-inspirations-lightbox-close"
            onClick={() => setLightboxSrc(null)}
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className="my-inspirations-lightbox-img"
          />
        </div>
      </div>,
      document.body,
    )

  return (
    <section className="card view-panel my-inspirations-view">
      {lightbox}
      <h2 className="view-panel-heading">My inspirations</h2>
      <p className="hint my-inspirations-lead">
        Everything you have saved, newest first.
      </p>

      {loading && <p className="hint">Loading…</p>}
      {error && !loading && <p className="error">{error}</p>}

      {!loading && !error && inspirations.length === 0 && (
        <p className="hint">
          No inspirations yet. Use <strong>Add inspiration</strong> in the menu to create one.
        </p>
      )}

      {!loading && !error && inspirations.length > 0 && (
        <ul className="source-inspirations-list">
          {inspirations.map((i) => {
            const quote = (i.quote || '').trim()
            const essence = (i.essence || '').trim()
            const sourceTitle = (i.source_title || '').trim()
            const linkedTitle = (i.source_display_title || '').trim()
            const linkedAuthor = (i.source_display_author || '').trim()
            const reference = (i.reference || '').trim()
            const thoughts = (i.user_thoughts || '').trim()
            const headline = essence || quote || '—'
            const shots = Array.isArray(i.screenshots) ? i.screenshots : []

            return (
              <li key={i.id} className="source-inspirations-item">
                {shots.length > 0 ? (
                  <div className="my-inspirations-shots">
                    {shots.map((shot) => {
                      const src = resolveMediaUrl(shot.image)
                      return src ? (
                        <button
                          key={shot.id}
                          type="button"
                          className="my-inspirations-shot-thumb-btn"
                          onClick={() => setLightboxSrc(src)}
                          aria-label="View screenshot larger"
                        >
                          <img
                            src={src}
                            alt=""
                            className="my-inspirations-shot-thumb"
                            loading="lazy"
                          />
                        </button>
                      ) : null
                    })}
                  </div>
                ) : null}
                <p className="source-inspirations-essence">{headline}</p>
                {essence && quote && quote !== essence ? (
                  <p className="source-inspirations-quote hint">{quote}</p>
                ) : null}
                {thoughts ? (
                  <p className="my-inspirations-thoughts hint">
                    <span className="source-inspirations-reference-label">Your thoughts</span>
                    {': '}
                    {thoughts}
                  </p>
                ) : null}
                {sourceTitle ? (
                  <p className="my-inspirations-source-title hint">
                    <span className="source-inspirations-reference-label">Work</span>
                    {': '}
                    {sourceTitle}
                  </p>
                ) : null}
                {i.source != null && (linkedTitle || linkedAuthor) ? (
                  <p className="my-inspirations-linked hint">
                    <span className="source-inspirations-reference-label">Linked source</span>
                    {': '}
                    {linkedTitle || '—'}
                    {linkedAuthor ? ` · ${linkedAuthor}` : ''}
                  </p>
                ) : null}
                {reference ? (
                  <p className="source-inspirations-reference hint">
                    <span className="source-inspirations-reference-label">Reference</span>
                    {': '}
                    {reference}
                  </p>
                ) : null}
                <p className="source-inspirations-meta hint">
                  {formatInspirationDate(i.date)}
                  {i.source_type ? ` · ${i.source_type}` : ''}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
