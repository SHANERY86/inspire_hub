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
  currentUser,
  sources,
  sourcesLoading,
  onPatchInspiration,
  onDeleteInspiration,
}) {
  const [lightboxSrc, setLightboxSrc] = useState(/** @type {string | null} */ (null))
  const [editRow, setEditRow] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const overlayOpen = Boolean(lightboxSrc || editRow)

  useEffect(() => {
    if (!overlayOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [overlayOpen])

  useEffect(() => {
    if (!overlayOpen) return
    function onKey(e) {
      if (e.key !== 'Escape') return
      if (lightboxSrc) {
        setLightboxSrc(null)
        return
      }
      if (editRow && !actionBusy) setEditRow(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [overlayOpen, lightboxSrc, editRow, actionBusy])

  function openEdit(i) {
    setActionError('')
    setEditRow({
      id: i.id,
      source_title: i.source_title ?? '',
      essence: i.essence ?? '',
      user_thoughts: i.user_thoughts ?? '',
      source_type: i.source_type ?? 'book',
      reference: i.reference ?? '',
      quote: i.quote ?? '',
      source: i.source ?? null,
    })
  }

  function onEditFieldChange(event) {
    const { name, value } = event.target
    if (!editRow) return
    if (name === 'source') {
      const next = value === '' ? null : Number(value)
      setEditRow((prev) => {
        if (!prev) return prev
        if (next == null) return { ...prev, source: null }
        const src = sources.find((s) => s.id === next)
        return {
          ...prev,
          source: next,
          source_title: src ? src.title : prev.source_title,
        }
      })
      return
    }
    setEditRow((prev) => (prev ? { ...prev, [name]: value } : prev))
  }

  async function submitEdit(event) {
    event.preventDefault()
    if (!editRow || !onPatchInspiration) return
    setActionBusy(true)
    setActionError('')
    try {
      await onPatchInspiration(editRow.id, {
        source_title: editRow.source_title,
        essence: editRow.essence,
        user_thoughts: editRow.user_thoughts,
        source_type: editRow.source_type,
        reference: editRow.reference,
        quote: editRow.quote,
        source: editRow.source,
      })
      setEditRow(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleDelete(i) {
    if (!onDeleteInspiration) return
    if (
      !window.confirm(
        'Delete this inspiration? Screenshots attached to it will be removed too. This cannot be undone.',
      )
    ) {
      return
    }
    setActionBusy(true)
    setActionError('')
    if (editRow?.id === i.id) setEditRow(null)
    try {
      await onDeleteInspiration(i.id)
      setActionError('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete.')
    } finally {
      setActionBusy(false)
    }
  }

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

  const editDialog =
    editRow &&
    createPortal(
      <div
        className="my-inspirations-lightbox-backdrop"
        role="presentation"
        onClick={() => {
          if (!actionBusy) setEditRow(null)
        }}
      >
        <div
          className="my-inspirations-edit-dialog card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-inspirations-edit-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="my-inspirations-edit-header">
            <h2 id="my-inspirations-edit-title" className="my-inspirations-edit-heading">
              Edit inspiration
            </h2>
            <button
              type="button"
              className="my-inspirations-lightbox-close"
              disabled={actionBusy}
              onClick={() => setEditRow(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <form className="form my-inspirations-edit-form" onSubmit={submitEdit}>
            <label>
              Source title
              <input
                name="source_title"
                value={editRow.source_title}
                onChange={onEditFieldChange}
                required
              />
            </label>
            <label>
              Essence or summary
              <input
                name="essence"
                value={editRow.essence}
                onChange={onEditFieldChange}
                required
              />
            </label>
            <label>
              Captured text / quote
              <textarea
                name="quote"
                value={editRow.quote}
                onChange={onEditFieldChange}
                rows={4}
              />
            </label>
            <label>
              Your thoughts
              <textarea
                name="user_thoughts"
                value={editRow.user_thoughts}
                onChange={onEditFieldChange}
                rows={3}
              />
            </label>
            <label>
              Source type
              <select
                name="source_type"
                value={editRow.source_type}
                onChange={onEditFieldChange}
                required
              >
                <option value="book">book</option>
                <option value="article">article</option>
                <option value="video">video</option>
                <option value="podcast">podcast</option>
                <option value="other">other</option>
              </select>
            </label>
            <label>
              Reference
              <input
                name="reference"
                value={editRow.reference}
                onChange={onEditFieldChange}
              />
            </label>
            {currentUser && (
              <label>
                Link to saved source (optional)
                <select
                  name="source"
                  value={editRow.source == null ? '' : String(editRow.source)}
                  onChange={onEditFieldChange}
                  disabled={sourcesLoading}
                >
                  <option value="">None</option>
                  {editRow.source != null &&
                    !sources.some((s) => s.id === editRow.source) && (
                      <option value={String(editRow.source)}>
                        Source #{editRow.source} (not in list)
                      </option>
                    )}
                  {sources.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.title}
                      {s.author ? ` — ${s.author}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {actionError ? <p className="error">{actionError}</p> : null}
            <div className="my-inspirations-edit-actions">
              <button type="submit" disabled={actionBusy}>
                {actionBusy ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={actionBusy}
                onClick={() => setEditRow(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body,
    )

  return (
    <section className="card view-panel my-inspirations-view">
      {lightbox}
      {editDialog}
      <h2 className="view-panel-heading">My inspirations</h2>
      <p className="hint my-inspirations-lead">
        Everything you have saved, newest first.
      </p>

      {actionError && !editRow ? <p className="error">{actionError}</p> : null}

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
                <div className="my-inspirations-row-actions">
                  <button
                    type="button"
                    className="my-inspirations-edit-btn"
                    disabled={actionBusy}
                    onClick={() => openEdit(i)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="my-inspirations-delete-btn"
                    disabled={actionBusy}
                    onClick={() => handleDelete(i)}
                  >
                    Delete
                  </button>
                </div>
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
