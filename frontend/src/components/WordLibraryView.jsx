import { useEffect, useMemo, useRef, useState } from 'react'

const WORDS_PAGE_SIZE = 10

export function WordLibraryView({
  words,
  wordsLoading,
  wordsError,
  currentUser,
  sources,
  onPatchWord,
  onDeleteWord,
  onSignInClick,
  onFetchPublicWords,
  onSearchImages,
}) {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [inspiringFilter, setInspiringFilter] = useState('all')
  const [publicOnly, setPublicOnly] = useState(false)
  const [publicItems, setPublicItems] = useState([])
  const [publicLoading, setPublicLoading] = useState(false)
  const [publicError, setPublicError] = useState('')

  useEffect(() => {
    if (!publicOnly) {
      setPublicItems([])
      setPublicError('')
      return
    }
    setPublicLoading(true)
    setPublicError('')
    onFetchPublicWords?.()
      .then((items) => setPublicItems(items))
      .catch((err) => setPublicError(err?.message || 'Could not load public words.'))
      .finally(() => setPublicLoading(false))
  }, [publicOnly, onFetchPublicWords])

  const baseList = publicOnly ? publicItems : words

  const filtered = useMemo(() => {
    let result = baseList
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.definition.toLowerCase().includes(q) ||
          (w.context_sentence || '').toLowerCase().includes(q),
      )
    }
    if (!publicOnly && sourceFilter) {
      result = result.filter((w) => String(w.source) === sourceFilter)
    }
    if (inspiringFilter === 'inspiring') {
      result = result.filter((w) => w.is_inspiring)
    } else if (inspiringFilter === 'learning') {
      result = result.filter((w) => !w.is_inspiring)
    }
    return result
  }, [baseList, search, sourceFilter, inspiringFilter, publicOnly])

  const [listPage, setListPage] = useState(1)

  const totalFiltered = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / WORDS_PAGE_SIZE))
  const safeListPage = Math.min(Math.max(1, listPage), totalPages)

  useEffect(() => {
    setListPage(1)
  }, [search, sourceFilter, inspiringFilter, publicOnly])

  const pagedRows = useMemo(() => {
    const start = (safeListPage - 1) * WORDS_PAGE_SIZE
    return filtered.slice(start, start + WORDS_PAGE_SIZE)
  }, [filtered, safeListPage])

  const rangeStart = totalFiltered === 0 ? 0 : (safeListPage - 1) * WORDS_PAGE_SIZE + 1
  const rangeEnd = Math.min(safeListPage * WORDS_PAGE_SIZE, totalFiltered)

  const skipScrollRef = useRef(true)
  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false
      return
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [safeListPage])

  if (!currentUser) {
    return (
      <section className="view-panel word-library-view my-inspirations-view--sheet">
        <h1 className="my-inspirations-page-title">Word library</h1>
        <p className="hint" style={{ textAlign: 'center' }}>
          <button type="button" className="app-guest-intro-link" onClick={onSignInClick}>
            Sign in
          </button>{' '}
          to view your word library.
        </p>
      </section>
    )
  }

  return (
    <section className="view-panel word-library-view my-inspirations-view--sheet">
      <h1 className="my-inspirations-page-title">Word library</h1>
      <p className="my-inspirations-lead">
        {publicOnly
          ? `${baseList.length} public ${baseList.length === 1 ? 'word' : 'words'}`
          : `${words.length} ${words.length === 1 ? 'word' : 'words'} collected`}
      </p>

      {(words.length > 0 || publicOnly) && (
        <>
          <div className="my-inspirations-search-row">
            <label className="my-inspirations-search">
              <input
                className="my-inspirations-search-input"
                type="search"
                placeholder="Search words, definitions, or context…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <div className="my-inspirations-filters">
            <label className="my-inspirations-sort">
              <span className="my-inspirations-sort-label">Show</span>
              <select
                className="my-inspirations-toolbar-select"
                value={inspiringFilter}
                onChange={(e) => setInspiringFilter(e.target.value)}
              >
                <option value="all">All words</option>
                <option value="inspiring">Inspiring only</option>
                <option value="learning">Learning only</option>
              </select>
            </label>
            {sources.length > 0 && (
              <label className="my-inspirations-sort">
                <span className="my-inspirations-sort-label">Source</span>
                <select
                  className="my-inspirations-toolbar-select"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                >
                  <option value="">All sources</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="checkbox-row my-inspirations-sort">
              <input
                type="checkbox"
                checked={publicOnly}
                onChange={(e) => setPublicOnly(e.target.checked)}
              />
              Public
            </label>
          </div>
        </>
      )}

      {(wordsLoading || publicLoading) && <p className="hint">Loading…</p>}
      {wordsError && <p className="error">{wordsError}</p>}
      {publicError && <p className="error">{publicError}</p>}

      {!wordsLoading && !publicLoading && filtered.length === 0 && baseList.length > 0 && (
        <p className="my-inspirations-filter-empty">No words match your search.</p>
      )}

      {!wordsLoading && !publicLoading && baseList.length === 0 && (
        <p className="hint" style={{ textAlign: 'center' }}>
          {publicOnly
            ? 'No public words found.'
            : <>No words yet. Use <strong>Add word</strong> to start building your library.</>}
        </p>
      )}

      {pagedRows.length > 0 && (
        <>
          <ul className="my-inspirations-list">
            {pagedRows.map((w) => (
              <WordCard key={w.id} word={w} sources={sources} onPatch={onPatchWord} onDelete={onDeleteWord} readOnly={publicOnly} onSearchImages={onSearchImages} />
            ))}
          </ul>
          <nav className="my-inspirations-pagination" aria-label="Word library pages">
              <button
                type="button"
                className="my-inspirations-pagination-btn"
                disabled={safeListPage <= 1}
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <p className="my-inspirations-pagination-status">
                Page {safeListPage} of {totalPages}
                <span className="my-inspirations-pagination-range">
                  {' '}· Showing {rangeStart}–{rangeEnd} of {totalFiltered}
                </span>
              </p>
              <button
                type="button"
                className="my-inspirations-pagination-btn"
                disabled={safeListPage >= totalPages}
                onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </nav>
        </>
      )}
    </section>
  )
}

function WordCard({ word: w, sources, onPatch, onDelete, readOnly = false, onSearchImages }) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [imageQuery, setImageQuery] = useState('')
  const [imageResults, setImageResults] = useState([])
  const [imageSearchBusy, setImageSearchBusy] = useState(false)
  const [imageSearchError, setImageSearchError] = useState('')
  const [imageSearchOpen, setImageSearchOpen] = useState(false)

  async function handleImageSearch(e) {
    e.preventDefault()
    if (!imageQuery.trim()) return
    setImageSearchBusy(true)
    setImageSearchError('')
    setImageResults([])
    try {
      const results = await onSearchImages(imageQuery.trim())
      setImageResults(results)
      if (results.length === 0) setImageSearchError('No images found.')
    } catch (err) {
      setImageSearchError(err?.message || 'Image search failed.')
    } finally {
      setImageSearchBusy(false)
    }
  }

  function openEdit() {
    setEditForm({
      definition: w.definition,
      context_sentence: w.context_sentence,
      source: w.source ?? '',
      image_url: w.image_url ?? '',
      tags: w.tags ?? '',
      is_inspiring: w.is_inspiring,
      is_public: w.is_public,
    })
    setImageQuery(w.word)
    setImageResults([])
    setImageSearchError('')
    setImageSearchOpen(false)
    setEditError('')
    setEditing(true)
  }

  function closeEdit() {
    setEditing(false)
    setEditForm(null)
    setEditError('')
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setBusy(true)
    setEditError('')
    try {
      await onPatch(w.id, {
        definition: editForm.definition,
        context_sentence: editForm.context_sentence,
        source: editForm.source === '' ? null : Number(editForm.source),
        image_url: editForm.image_url,
        tags: editForm.tags,
        is_inspiring: editForm.is_inspiring,
        is_public: editForm.is_public,
      })
      closeEdit()
    } catch (err) {
      setEditError(err.message || 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(w.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (editing && editForm) {
    return (
      <li className="my-inspirations-list-item word-card">
        <form className="form word-edit-form" onSubmit={handleSaveEdit}>
          <div className="word-card-header">
            <h3 className="word-card-word">{w.word}</h3>
            {w.part_of_speech && (
              <span className="word-card-pos">{w.part_of_speech}</span>
            )}
          </div>

          <label>
            Definition
            <textarea
              value={editForm.definition}
              onChange={(e) => setEditForm((f) => ({ ...f, definition: e.target.value }))}
              rows={3}
              required
            />
          </label>

          <label>
            Context sentence
            <textarea
              value={editForm.context_sentence}
              onChange={(e) => setEditForm((f) => ({ ...f, context_sentence: e.target.value }))}
              rows={3}
            />
          </label>

          <label>
            Tags (optional)
            <input
              value={editForm.tags}
              onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. vocabulary, philosophy"
            />
          </label>

          <div className="word-image-search-block">
            <button
              type="button"
              className="word-image-search-toggle secondary"
              onClick={() => setImageSearchOpen((o) => !o)}
            >
              {imageSearchOpen ? 'Hide image search' : 'Search for an image'}
            </button>

            {imageSearchOpen && (
              <div className="word-image-search-panel">
                <div className="word-image-search-row">
                  <input
                    className="word-image-search-input"
                    value={imageQuery}
                    onChange={(e) => setImageQuery(e.target.value)}
                    placeholder="Search term…"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImageSearch(e) } }}
                  />
                  <button
                    type="button"
                    onClick={handleImageSearch}
                    disabled={imageSearchBusy || !imageQuery.trim()}
                  >
                    {imageSearchBusy ? 'Searching…' : 'Search'}
                  </button>
                </div>
                {imageSearchError && <p className="error">{imageSearchError}</p>}
                {editForm.image_url && (
                  <div className="word-image-selected">
                    <img src={editForm.image_url} alt="Selected" className="word-image-preview" />
                    <button
                      type="button"
                      className="secondary word-image-clear"
                      onClick={() => setEditForm((f) => ({ ...f, image_url: '' }))}
                    >
                      Remove
                    </button>
                  </div>
                )}
                {imageResults.length > 0 && (
                  <ul className="word-image-grid">
                    {imageResults.map((img, i) => (
                      <li key={i} className={`word-image-grid-item${editForm.image_url === img.url ? ' is-selected' : ''}`}>
                        <button
                          type="button"
                          className="word-image-thumb-btn"
                          onClick={() => setEditForm((f) => ({ ...f, image_url: f.image_url === img.url ? '' : img.url }))}
                          title={img.title}
                        >
                          <img src={img.thumbnail} alt={img.title} loading="lazy" className="word-image-thumb" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!imageSearchOpen && editForm.image_url && (
              <div className="word-image-selected" style={{ marginTop: '0.5rem' }}>
                <img src={editForm.image_url} alt="Current" className="word-image-preview" />
                <button
                  type="button"
                  className="secondary word-image-clear"
                  onClick={() => setEditForm((f) => ({ ...f, image_url: '' }))}
                >
                  Remove image
                </button>
              </div>
            )}
          </div>

          <label>
            Source
            <select
              value={editForm.source === null ? '' : String(editForm.source)}
              onChange={(e) => setEditForm((f) => ({ ...f, source: e.target.value }))}
            >
              <option value="">— none —</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={editForm.is_inspiring}
              onChange={(e) => setEditForm((f) => ({ ...f, is_inspiring: e.target.checked }))}
            />
            Inspiring
          </label>

          {editForm.is_inspiring && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={editForm.is_public}
                onChange={(e) => setEditForm((f) => ({ ...f, is_public: e.target.checked }))}
              />
              Public
            </label>
          )}

          {editError && <p className="error">{editError}</p>}

          <div className="actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={closeEdit}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="my-inspirations-list-item word-card">
      {w.image_url && (
        <img src={w.image_url} alt={w.word} className="word-card-image" loading="lazy" />
      )}
      <div className="word-card-header">
        <h3 className="word-card-word">{w.word}</h3>
        {w.part_of_speech && (
          <span className="word-card-pos">{w.part_of_speech}</span>
        )}
        {w.is_inspiring && (
          <span className="word-card-inspiring-badge">Inspiring</span>
        )}
      </div>
      <blockquote className="word-card-context">
        <p>{w.definition}</p>
      </blockquote>
      {w.context_sentence && (
        <p className="word-card-context-sentence">{w.context_sentence}</p>
      )}
      {w.source_title && (
        <p className="my-inspirations-detail">
          <span className="my-inspirations-detail-label">Source: </span>
          {w.source_title}
        </p>
      )}
      <p className="my-inspirations-meta">
        Added {new Date(w.created_at).toLocaleDateString()}
        {w.added_by_username ? ` · ${w.added_by_username}` : ''}
      </p>
      {!readOnly && (
        <div className="my-inspirations-row-actions">
          <button
            type="button"
            className="my-inspirations-edit-btn"
            onClick={openEdit}
          >
            Edit
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              className="my-inspirations-delete-btn"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          ) : (
            <>
              <button
                type="button"
                className="my-inspirations-delete-btn"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
