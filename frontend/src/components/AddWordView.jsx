import { useState } from 'react'

export function AddWordView({
  currentUser,
  sources,
  onLookupWord,
  onSearchImages,
  onSaveWord,
  wordFormBusy,
  wordFormMessage,
}) {
  const [mode, setMode] = useState('lookup') // 'lookup' | 'manual'

  // Lookup mode state
  const [word, setWord] = useState('')
  const [lookupResults, setLookupResults] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const [selectedDef, setSelectedDef] = useState(null)

  // Manual mode state
  const [manualWord, setManualWord] = useState('')
  const [manualDefinition, setManualDefinition] = useState('')
  const [manualPos, setManualPos] = useState('')
  const [manualReady, setManualReady] = useState(false)

  // Save form state (shared)
  const [contextSentence, setContextSentence] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [tags, setTags] = useState('')
  const [isInspiring, setIsInspiring] = useState(false)
  const [isPublic, setIsPublic] = useState(false)

  // Image search state
  const [imageQuery, setImageQuery] = useState('')
  const [imageResults, setImageResults] = useState([])
  const [imageSearchBusy, setImageSearchBusy] = useState(false)
  const [imageSearchError, setImageSearchError] = useState('')
  const [imageSearchOpen, setImageSearchOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState('')

  if (!currentUser) {
    return (
      <section className="view-panel add-word-view sheet-surface-card">
        <p className="hint">Sign in to add words.</p>
      </section>
    )
  }

  // Derived: are we on the save form?
  const onSaveForm = mode === 'manual' ? manualReady : selectedDef !== null

  // The word being saved
  const activeWord =
    mode === 'manual'
      ? manualWord.trim().toLowerCase()
      : (lookupResults?.word || word.trim().toLowerCase())

  function resetAll() {
    setMode('lookup')
    setWord('')
    setLookupResults(null)
    setLookupError('')
    setSelectedDef(null)
    setManualWord('')
    setManualDefinition('')
    setManualPos('')
    setManualReady(false)
    setContextSentence('')
    setSourceId('')
    setTags('')
    setIsInspiring(false)
    setIsPublic(false)
    setImageQuery('')
    setImageResults([])
    setImageSearchError('')
    setImageSearchOpen(false)
    setSelectedImageUrl('')
  }

  function switchMode(next) {
    setMode(next)
    setLookupResults(null)
    setLookupError('')
    setSelectedDef(null)
    setManualReady(false)
  }

  async function handleLookup(e) {
    e.preventDefault()
    const trimmed = word.trim()
    if (!trimmed) return
    setLookupError('')
    setLookupResults(null)
    setSelectedDef(null)
    setLookupBusy(true)
    try {
      const result = await onLookupWord(trimmed)
      if (result.definitions && result.definitions.length > 0) {
        setLookupResults(result)
      } else {
        setLookupError(`No definitions found for "${trimmed}".`)
      }
    } catch (err) {
      setLookupError(err.message || 'Lookup failed.')
    } finally {
      setLookupBusy(false)
    }
  }

  function handleDefSelect(def_) {
    setSelectedDef(def_)
    setImageQuery(lookupResults?.word || word.trim())
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualWord.trim() || !manualDefinition.trim()) return
    setManualReady(true)
    setImageQuery(manualWord.trim())
  }

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
      setImageSearchError(err.message || 'Image search failed.')
    } finally {
      setImageSearchBusy(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    const def_ = mode === 'manual'
      ? { definition: manualDefinition.trim(), part_of_speech: manualPos.trim() }
      : selectedDef
    try {
      await onSaveWord({
        word: activeWord,
        definition: def_.definition,
        part_of_speech: def_.part_of_speech || '',
        context_sentence: contextSentence.trim(),
        source: sourceId ? Number(sourceId) : null,
        image_url: selectedImageUrl,
        tags: tags.trim(),
        is_inspiring: isInspiring,
        is_public: isPublic,
      })
      resetAll()
    } catch {
      // error handled by parent via wordFormMessage
    }
  }

  return (
    <section className="view-panel add-word-view sheet-surface-card">
      <h2 className="view-panel-heading">Add word</h2>

      {/* Mode toggle — only show when not on save form */}
      {!onSaveForm && (
        <div className="word-mode-toggle">
          <button
            type="button"
            className={mode === 'lookup' ? 'word-mode-btn is-active' : 'word-mode-btn'}
            onClick={() => switchMode('lookup')}
          >
            Look up word
          </button>
          <button
            type="button"
            className={mode === 'manual' ? 'word-mode-btn is-active' : 'word-mode-btn'}
            onClick={() => switchMode('manual')}
          >
            Enter manually
          </button>
        </div>
      )}

      {/* ── Lookup: step 1 — word input ── */}
      {mode === 'lookup' && !lookupResults && (
        <form className="form" onSubmit={handleLookup}>
          <p className="hint">
            Type a word you discovered while reading, look it up, then choose the definition that fits.
          </p>
          <label>
            Word
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g. ephemeral"
              required
              autoComplete="off"
              autoCapitalize="none"
            />
          </label>
          {lookupError && (
            <>
              <p className="error">{lookupError}</p>
              <p className="hint">
                Can't find it?{' '}
                <button type="button" className="word-mode-link" onClick={() => switchMode('manual')}>
                  Enter the definition manually.
                </button>
              </p>
            </>
          )}
          <button type="submit" disabled={lookupBusy || !word.trim()}>
            {lookupBusy ? 'Looking up…' : 'Look up'}
          </button>
        </form>
      )}

      {/* ── Lookup: step 2 — pick definition ── */}
      {mode === 'lookup' && lookupResults && !selectedDef && (
        <div className="word-lookup-results">
          <div className="word-lookup-header">
            <h3 className="word-lookup-word">{lookupResults.word}</h3>
            {lookupResults.definitions[0]?.phonetic && (
              <span className="word-lookup-phonetic">
                {lookupResults.definitions[0].phonetic}
              </span>
            )}
          </div>
          <p className="hint">Select the definition that matches how it was used.</p>
          <ul className="word-def-list">
            {lookupResults.definitions.map((def_, i) => (
              <li key={i} className="word-def-item">
                <button
                  type="button"
                  className="word-def-btn"
                  onClick={() => handleDefSelect(def_)}
                >
                  {def_.part_of_speech && (
                    <span className="word-def-pos">{def_.part_of_speech}</span>
                  )}
                  <span className="word-def-text">{def_.definition}</span>
                  {def_.example && (
                    <span className="word-def-example">"{def_.example}"</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="secondary" onClick={() => { setLookupResults(null); setWord('') }}>
            Search a different word
          </button>
        </div>
      )}

      {/* ── Manual: word + definition form ── */}
      {mode === 'manual' && !manualReady && (
        <form className="form" onSubmit={handleManualSubmit}>
          <p className="hint">Enter the word and write your own definition.</p>
          <label>
            Word
            <input
              value={manualWord}
              onChange={(e) => setManualWord(e.target.value)}
              placeholder="e.g. ephemeral"
              required
              autoComplete="off"
              autoCapitalize="none"
            />
          </label>
          <label>
            Definition
            <textarea
              value={manualDefinition}
              onChange={(e) => setManualDefinition(e.target.value)}
              placeholder="Write the definition…"
              rows={3}
              required
            />
          </label>
          <label>
            Part of speech (optional)
            <input
              value={manualPos}
              onChange={(e) => setManualPos(e.target.value)}
              placeholder="e.g. adjective"
            />
          </label>
          <button type="submit" disabled={!manualWord.trim() || !manualDefinition.trim()}>
            Continue
          </button>
        </form>
      )}

      {/* ── Save form (shared between lookup + manual) ── */}
      {onSaveForm && (
        <form className="form word-save-form" onSubmit={handleSave}>
          <div className="word-selected-summary">
            <h3 className="word-lookup-word">{activeWord}</h3>
            {(mode === 'manual' ? manualPos : selectedDef?.part_of_speech) && (
              <span className="word-def-pos">
                {mode === 'manual' ? manualPos : selectedDef.part_of_speech}
              </span>
            )}
            <p className="word-selected-def">
              {mode === 'manual' ? manualDefinition : selectedDef.definition}
            </p>
          </div>

          <label>
            Context sentence
            <textarea
              value={contextSentence}
              onChange={(e) => setContextSentence(e.target.value)}
              placeholder="Write the sentence from the book where you encountered this word…"
              rows={3}
            />
          </label>

          <label>
            Tags (optional)
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. vocabulary, philosophy"
            />
          </label>

          <label>
            Source (optional)
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">— none —</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>

          {/* Image search */}
          <div className="word-image-search-block">
            <button
              type="button"
              className="word-image-search-toggle secondary"
              onClick={() => setImageSearchOpen((o) => !o)}
            >
              {imageSearchOpen ? 'Hide image search' : 'Search for an image (optional)'}
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

                {selectedImageUrl && (
                  <div className="word-image-selected">
                    <img src={selectedImageUrl} alt="Selected" className="word-image-preview" />
                    <button
                      type="button"
                      className="secondary word-image-clear"
                      onClick={() => setSelectedImageUrl('')}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {imageResults.length > 0 && (
                  <ul className="word-image-grid">
                    {imageResults.map((img, i) => (
                      <li key={i} className={`word-image-grid-item${selectedImageUrl === img.url ? ' is-selected' : ''}`}>
                        <button
                          type="button"
                          className="word-image-thumb-btn"
                          onClick={() => setSelectedImageUrl(selectedImageUrl === img.url ? '' : img.url)}
                          title={img.title}
                        >
                          <img
                            src={img.thumbnail}
                            alt={img.title}
                            loading="lazy"
                            className="word-image-thumb"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isInspiring}
              onChange={(e) => {
                setIsInspiring(e.target.checked)
                if (!e.target.checked) setIsPublic(false)
              }}
            />
            Inspiring — show on home page spotlight
          </label>

          {isInspiring && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Public — visitors without an account can see this word
            </label>
          )}

          {wordFormMessage && <p className="hint">{wordFormMessage}</p>}

          <div className="actions">
            <button type="submit" disabled={wordFormBusy}>
              {wordFormBusy ? 'Saving…' : 'Save word'}
            </button>
            {mode === 'lookup' && (
              <button
                type="button"
                className="secondary"
                disabled={wordFormBusy}
                onClick={() => setSelectedDef(null)}
              >
                Pick different definition
              </button>
            )}
            {mode === 'manual' && (
              <button
                type="button"
                className="secondary"
                disabled={wordFormBusy}
                onClick={() => setManualReady(false)}
              >
                Edit definition
              </button>
            )}
            <button
              type="button"
              className="secondary"
              disabled={wordFormBusy}
              onClick={resetAll}
            >
              Start over
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
