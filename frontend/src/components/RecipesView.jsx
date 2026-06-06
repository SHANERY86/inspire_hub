import { useEffect, useMemo, useRef, useState } from 'react'

const PAGE_SIZE = 10

export function RecipesView({
  currentUser,
  recipes,
  recipesLoading,
  recipesError,
  onScrapeUrl,
  onSaveRecipe,
  onPatchRecipe,
  onDeleteRecipe,
  onSignInClick,
  onFetchPublicRecipes,
}) {
  const [tab, setTab] = useState('list')
  const [publicOnly, setPublicOnly] = useState(false)
  const [publicItems, setPublicItems] = useState([])
  const [publicLoading, setPublicLoading] = useState(false)
  const [publicError, setPublicError] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!publicOnly) {
      setPublicItems([])
      setPublicError('')
      return
    }
    setPublicLoading(true)
    setPublicError('')
    onFetchPublicRecipes?.()
      .then((items) => setPublicItems(items))
      .catch((err) => setPublicError(err?.message || 'Could not load public recipes.'))
      .finally(() => setPublicLoading(false))
  }, [publicOnly, onFetchPublicRecipes])

  const displayRecipes = publicOnly ? publicItems : recipes

  const totalPages = Math.max(1, Math.ceil(displayRecipes.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const pagedRecipes = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return displayRecipes.slice(start, start + PAGE_SIZE)
  }, [displayRecipes, safePage])

  const rangeStart = displayRecipes.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, displayRecipes.length)

  useEffect(() => { setPage(1) }, [publicOnly])

  const skipScrollRef = useRef(true)
  useEffect(() => {
    if (skipScrollRef.current) { skipScrollRef.current = false; return }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [safePage])

  if (!currentUser) {
    return (
      <section className="view-panel recipe-view my-inspirations-view--sheet">
        <h1 className="my-inspirations-page-title">Recipes</h1>
        <p className="hint" style={{ textAlign: 'center' }}>
          <button type="button" className="app-guest-intro-link" onClick={onSignInClick}>
            Sign in
          </button>{' '}
          to view your recipe collection.
        </p>
      </section>
    )
  }

  return (
    <section className="view-panel recipe-view my-inspirations-view--sheet">
      <h1 className="my-inspirations-page-title">Recipes</h1>

      <div className="recipe-tab-bar">
        <button
          type="button"
          className={`recipe-tab-btn${tab === 'list' ? ' is-active' : ''}`}
          onClick={() => setTab('list')}
        >
          {publicOnly ? `Public recipes (${displayRecipes.length})` : `My recipes (${recipes.length})`}
        </button>
        <button
          type="button"
          className={`recipe-tab-btn${tab === 'add' ? ' is-active' : ''}`}
          onClick={() => setTab('add')}
        >
          + Add recipe
        </button>
      </div>

      {tab === 'add' && (
        <AddRecipeForm
          onScrapeUrl={onScrapeUrl}
          onSave={(payload) => {
            onSaveRecipe(payload)
            setTab('list')
          }}
        />
      )}

      {tab === 'list' && (
        <>
          <label className="checkbox-row" style={{ marginBottom: '0.75rem' }}>
            <input
              type="checkbox"
              checked={publicOnly}
              onChange={(e) => setPublicOnly(e.target.checked)}
            />
            Public
          </label>
          {(recipesLoading || publicLoading) && <p className="hint">Loading…</p>}
          {recipesError && <p className="error">{recipesError}</p>}
          {publicError && <p className="error">{publicError}</p>}
          {!recipesLoading && !publicLoading && displayRecipes.length === 0 && (
            <p className="hint" style={{ textAlign: 'center' }}>
              {publicOnly ? 'No public recipes found.' : (
                <>No recipes yet.{' '}
                  <button type="button" className="app-guest-intro-link" onClick={() => setTab('add')}>
                    Add your first one
                  </button>.
                </>
              )}
            </p>
          )}
          {displayRecipes.length > 0 && (
            <>
              <ul className="my-inspirations-list">
                {pagedRecipes.map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    onPatch={onPatchRecipe}
                    onDelete={onDeleteRecipe}
                    readOnly={publicOnly}
                  />
                ))}
              </ul>
              {totalPages > 1 && (
                <nav className="my-inspirations-pagination" aria-label="Recipe pages">
                  <button
                    type="button"
                    className="my-inspirations-pagination-btn"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <p className="my-inspirations-pagination-status">
                    Page {safePage} of {totalPages}
                    <span className="my-inspirations-pagination-range">
                      {' '}· Showing {rangeStart}–{rangeEnd} of {displayRecipes.length}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="my-inspirations-pagination-btn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

function AddRecipeForm({ onScrapeUrl, onSave }) {
  const [url, setUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [preview, setPreview] = useState(null)

  const [title, setTitle] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [isInspiring, setIsInspiring] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleScrape(e) {
    e.preventDefault()
    if (!url.trim()) return
    setScraping(true)
    setScrapeError('')
    setPreview(null)
    try {
      const data = await onScrapeUrl(url.trim())
      setPreview(data)
      setTitle(data.title || '')
      setIngredients((data.ingredients || []).join('\n'))
      setImageUrl(data.image_url || '')
      setIsInspiring(false)
      setIsPublic(false)
      setSaveError('')
    } catch (err) {
      setScrapeError(err.message || 'Could not extract recipe.')
    } finally {
      setScraping(false)
    }
  }

  function handleManual(e) {
    e.preventDefault()
    setPreview({ manual: true })
    setTitle('')
    setIngredients('')
    setImageUrl('')
    setSaveError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!title.trim()) {
      setSaveError('Title is required.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await onSave({
        url: url.trim(),
        title: title.trim(),
        ingredients: ingredients.trim(),
        image_url: imageUrl.trim(),
        notes: notes.trim(),
        tags: tags.trim(),
        is_inspiring: isInspiring,
        is_public: isPublic,
      })
      setUrl('')
      setPreview(null)
      setTitle('')
      setIngredients('')
      setImageUrl('')
      setNotes('')
      setTags('')
      setIsInspiring(false)
      setIsPublic(false)
    } catch (err) {
      setSaveError(err.message || 'Could not save recipe.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="recipe-add-form">
      {!preview && (
        <form className="form" onSubmit={handleScrape}>
          <label>
            Recipe URL
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.example.com/recipe/..."
              required
            />
          </label>
          {scrapeError && <p className="error">{scrapeError}</p>}
          <div className="actions">
            <button type="submit" disabled={scraping}>
              {scraping ? 'Fetching…' : 'Extract recipe'}
            </button>
            <button type="button" className="secondary" onClick={handleManual}>
              Enter manually
            </button>
          </div>
        </form>
      )}

      {preview && (
        <form className="form" onSubmit={handleSave}>
          {preview.image_url && (
            <img src={preview.image_url} alt={title} className="recipe-preview-image" />
          )}

          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label>
            Ingredients <span className="hint-inline">(one per line)</span>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={10}
            />
          </label>

          <label>
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Substitutions, tips, modifications…"
            />
          </label>

          <label>
            Tags (optional)
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. vegetarian, weeknight, irish"
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isInspiring}
              onChange={(e) => {
                setIsInspiring(e.target.checked)
                if (!e.target.checked) setIsPublic(false)
              }}
            />
            Inspiring
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isPublic}
              disabled={!isInspiring}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Public{!isInspiring && <span className="hint-inline"> — mark as inspiring first</span>}
          </label>

          {saveError && <p className="error">{saveError}</p>}

          <div className="actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save recipe'}
            </button>
            <button type="button" className="secondary" onClick={() => setPreview(null)}>
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function RecipeCard({ recipe: r, onPatch, onDelete, readOnly = false }) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const ingredientLines = (r.ingredients || '').split('\n').filter(Boolean)

  function openEdit() {
    setEditForm({
      title: r.title,
      ingredients: r.ingredients,
      image_url: r.image_url || '',
      notes: r.notes || '',
      tags: r.tags || '',
      is_inspiring: r.is_inspiring ?? false,
      is_public: r.is_public ?? false,
    })
    setEditError('')
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setBusy(true)
    setEditError('')
    try {
      await onPatch(r.id, {
        title: editForm.title,
        ingredients: editForm.ingredients,
        image_url: editForm.image_url,
        notes: editForm.notes,
        tags: editForm.tags,
        is_inspiring: editForm.is_inspiring,
        is_public: editForm.is_public,
      })
      setEditing(false)
      setEditForm(null)
    } catch (err) {
      setEditError(err.message || 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(r.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (editing && editForm) {
    return (
      <li className="my-inspirations-list-item recipe-card">
        <form className="form" onSubmit={handleSave}>
          <label>
            Title
            <input
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label>
            Ingredients <span className="hint-inline">(one per line)</span>
            <textarea
              value={editForm.ingredients}
              onChange={(e) => setEditForm((f) => ({ ...f, ingredients: e.target.value }))}
              rows={10}
            />
          </label>
          <label>
            Notes
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </label>
          <label>
            Tags
            <input
              value={editForm.tags}
              onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </label>
          <label>
            Image URL
            <input
              value={editForm.image_url}
              onChange={(e) => setEditForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://…"
            />
          </label>
          {editForm.image_url && (
            <img src={editForm.image_url} alt="preview" className="recipe-preview-image" loading="lazy" />
          )}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={editForm.is_inspiring}
              onChange={(e) => setEditForm((f) => ({
                ...f,
                is_inspiring: e.target.checked,
                is_public: e.target.checked ? f.is_public : false,
              }))}
            />
            Inspiring
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={editForm.is_public}
              disabled={!editForm.is_inspiring}
              onChange={(e) => setEditForm((f) => ({ ...f, is_public: e.target.checked }))}
            />
            Public{!editForm.is_inspiring && <span className="hint-inline"> — mark as inspiring first</span>}
          </label>

          {editError && <p className="error">{editError}</p>}
          <div className="actions">
            <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="my-inspirations-list-item recipe-card">
      {r.image_url && (
        <img src={r.image_url} alt={r.title} className="recipe-card-image" loading="lazy" />
      )}
      <div className="recipe-card-header">
        <h3 className="recipe-card-title">{r.title}</h3>
        {r.is_inspiring && <span className="word-card-inspiring-badge">Inspiring</span>}
      </div>
      {r.url && (
        <p className="recipe-card-source">
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="recipe-card-link">
            View original
          </a>
        </p>
      )}

      {ingredientLines.length > 0 && (
        <div className="recipe-card-ingredients">
          <p className="recipe-card-section-label">Ingredients</p>
          <ul className="recipe-ingredients-list">
            {(expanded ? ingredientLines : ingredientLines.slice(0, 5)).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {ingredientLines.length > 5 && (
            <button
              type="button"
              className="recipe-expand-btn"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : `Show all ${ingredientLines.length} ingredients`}
            </button>
          )}
        </div>
      )}

      {r.notes && (
        <p className="recipe-card-notes">{r.notes}</p>
      )}
      {r.tags && (
        <p className="recipe-card-tags">{r.tags}</p>
      )}
      <p className="my-inspirations-meta">
        Saved {new Date(r.created_at).toLocaleDateString()}
      </p>

      {!readOnly && (
        <div className="my-inspirations-row-actions">
          <button type="button" className="my-inspirations-edit-btn" onClick={openEdit}>Edit</button>
          {!confirmDelete ? (
            <button type="button" className="my-inspirations-delete-btn" onClick={() => setConfirmDelete(true)}>Delete</button>
          ) : (
            <>
              <button type="button" className="my-inspirations-delete-btn" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button type="button" className="secondary" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
