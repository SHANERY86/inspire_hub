import { useState } from 'react'
import { openLibraryCoverUrlFromIsbn } from '../lib/openLibrary.js'

function SourceCoverTile({ source, onOpen }) {
  const [broken, setBroken] = useState(false)
  const url = openLibraryCoverUrlFromIsbn(source.isbn)
  const label = source.title || 'Untitled source'

  return (
    <button
      type="button"
      className="sources-gallery-tile"
      onClick={() => onOpen(source.id)}
      aria-label={`View my inspirations for ${label}`}
    >
      <span className="sources-gallery-tile-inner">
        <span className="sources-gallery-cover-wrap">
          {url && !broken ? (
            <img
              src={url}
              alt=""
              className="sources-gallery-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <span className="sources-gallery-cover sources-gallery-cover--placeholder" aria-hidden>
              <span className="sources-gallery-placeholder-text">
                {(source.title || '?').slice(0, 2).toUpperCase()}
              </span>
            </span>
          )}
        </span>
        <span className="sources-gallery-caption" title={source.title}>
          {source.title}
        </span>
      </span>
    </button>
  )
}

export function SourcesGalleryView({ sources, sourcesLoading, sourcesError, onOpenSource }) {
  if (sourcesLoading) {
    return (
      <section className="view-panel sources-gallery-view sheet-surface-card">
        <p className="hint">Loading sources…</p>
      </section>
    )
  }

  if (sourcesError) {
    return (
      <section className="view-panel sources-gallery-view sheet-surface-card">
        <p className="error">{sourcesError}</p>
      </section>
    )
  }

  if (!sources.length) {
    return (
      <section className="view-panel sources-gallery-view sheet-surface-card">
        <h2 className="view-panel-heading">Inspiration sources</h2>
        <p className="hint">No saved sources yet. Use the menu to add one.</p>
      </section>
    )
  }

  return (
    <section className="view-panel sources-gallery-view sheet-surface-card">
      <h2 className="view-panel-heading">Inspiration sources</h2>
      <div className="sources-gallery-grid">
        {sources.map((s) => (
          <SourceCoverTile key={s.id} source={s} onOpen={onOpenSource} />
        ))}
      </div>
    </section>
  )
}
