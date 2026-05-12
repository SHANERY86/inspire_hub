import { useState } from 'react'
import { openLibraryCoverUrlFromIsbn } from '../lib/openLibrary.js'

function SourceCoverTile({ source }) {
  const [broken, setBroken] = useState(false)
  const url = openLibraryCoverUrlFromIsbn(source.isbn)

  return (
    <figure className="sources-gallery-tile">
      <div className="sources-gallery-cover-wrap">
        {url && !broken ? (
          <img
            src={url}
            alt=""
            className="sources-gallery-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="sources-gallery-cover sources-gallery-cover--placeholder" aria-hidden>
            <span className="sources-gallery-placeholder-text">
              {(source.title || '?').slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <figcaption className="sources-gallery-caption" title={source.title}>
        {source.title}
      </figcaption>
    </figure>
  )
}

export function SourcesGalleryView({ sources, sourcesLoading, sourcesError }) {
  if (sourcesLoading) {
    return (
      <section className="card view-panel sources-gallery-view">
        <p className="hint">Loading sources…</p>
      </section>
    )
  }

  if (sourcesError) {
    return (
      <section className="card view-panel sources-gallery-view">
        <p className="error">{sourcesError}</p>
      </section>
    )
  }

  if (!sources.length) {
    return (
      <section className="card view-panel sources-gallery-view">
        <h2 className="view-panel-heading">Inspiration sources</h2>
        <p className="hint">No saved sources yet. Use the menu to add one.</p>
      </section>
    )
  }

  return (
    <section className="card view-panel sources-gallery-view">
      <h2 className="view-panel-heading">Inspiration sources</h2>
      <div className="sources-gallery-grid">
        {sources.map((s) => (
          <SourceCoverTile key={s.id} source={s} />
        ))}
      </div>
    </section>
  )
}
