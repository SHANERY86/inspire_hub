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

export function SourceInspirationsView({
  source,
  inspirations,
  loading,
  error,
  listAuthRequired,
  onSignInClick,
  onBack,
}) {
  if (listAuthRequired) {
    return (
      <section className="card view-panel source-inspirations-view">
        <p className="hint">
          Sign in to see inspirations for this source.{' '}
          <button type="button" className="secondary" onClick={onSignInClick}>
            Sign in
          </button>
        </p>
      </section>
    )
  }

  if (!source) {
    return (
      <section className="card view-panel source-inspirations-view">
        <p className="error">Source not found.</p>
        <button
          type="button"
          className="source-inspirations-back-btn"
          onClick={onBack}
          aria-label="Back to inspiration sources"
        >
          <span className="source-inspirations-back-icon" aria-hidden="true">
            ‹
          </span>
          <span className="source-inspirations-back-label">Back</span>
        </button>
      </section>
    )
  }

  const title = source.title || 'Untitled'
  const author = (source.author || '').trim()

  return (
    <section className="card view-panel source-inspirations-view">
      <div className="source-inspirations-header">
        <button
          type="button"
          className="source-inspirations-back-btn"
          onClick={onBack}
          aria-label="Back to inspiration sources"
        >
          <span className="source-inspirations-back-icon" aria-hidden="true">
            ‹
          </span>
          <span className="source-inspirations-back-label">Back</span>
        </button>
        <h2 className="view-panel-heading source-inspirations-title">
          Inspirations
          <span className="source-inspirations-from">
            {' '}
            from <cite className="source-inspirations-cite">{title}</cite>
            {author ? (
              <>
                {' '}
                <span className="source-inspirations-by">· {author}</span>
              </>
            ) : null}
          </span>
        </h2>
      </div>

      {loading && <p className="hint">Loading…</p>}
      {error && !loading && <p className="error">{error}</p>}

      {!loading && !error && inspirations.length === 0 && (
        <p className="hint">
          No inspirations are linked to this saved source yet. Add an inspiration and choose this
          source in the form.
        </p>
      )}

      {!loading && !error && inspirations.length > 0 && (
        <ul className="source-inspirations-list">
          {inspirations.map((i) => {
            const quote = (i.quote || '').trim()
            const essence = (i.essence || '').trim()
            const reference = (i.reference || '').trim()
            const line = essence || quote || '—'
            return (
              <li key={i.id} className="source-inspirations-item">
                <p className="source-inspirations-essence">{line}</p>
                {essence && quote && quote !== essence ? (
                  <p className="source-inspirations-quote hint">{quote}</p>
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
