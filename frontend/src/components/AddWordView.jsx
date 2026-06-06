import { useState } from 'react'

export function AddWordView({
  currentUser,
  sources,
  onLookupWord,
  onSaveWord,
  wordFormBusy,
  wordFormMessage,
}) {
  const [word, setWord] = useState('')
  const [lookupResults, setLookupResults] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const [selectedDef, setSelectedDef] = useState(null)
  const [contextSentence, setContextSentence] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [tags, setTags] = useState('')
  const [isInspiring, setIsInspiring] = useState(false)
  const [isPublic, setIsPublic] = useState(false)

  if (!currentUser) {
    return (
      <section className="view-panel add-word-view sheet-surface-card">
        <p className="hint">Sign in to add words.</p>
      </section>
    )
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

  async function handleSave(e) {
    e.preventDefault()
    if (!selectedDef) return

    try {
      await onSaveWord({
        word: lookupResults?.word || word.trim().toLowerCase(),
        definition: selectedDef.definition,
        part_of_speech: selectedDef.part_of_speech || '',
        context_sentence: contextSentence.trim(),
        source: sourceId ? Number(sourceId) : null,
        tags: tags.trim(),
        is_inspiring: isInspiring,
        is_public: isPublic,
      })
      setWord('')
      setLookupResults(null)
      setSelectedDef(null)
      setContextSentence('')
      setSourceId('')
      setTags('')
      setIsInspiring(false)
      setIsPublic(false)
      setLookupError('')
    } catch {
      // error handled by parent via wordFormMessage
    }
  }

  function handleReset() {
    setWord('')
    setLookupResults(null)
    setSelectedDef(null)
    setContextSentence('')
    setSourceId('')
    setTags('')
    setIsInspiring(false)
    setIsPublic(false)
    setLookupError('')
  }

  return (
    <section className="view-panel add-word-view sheet-surface-card">
      <h2 className="view-panel-heading">Add word</h2>
      <p className="hint">
        Type a word you discovered while reading, look it up, choose the
        definition that fits, and note the sentence where you found it.
      </p>

      {/* Step 1: Lookup */}
      {!lookupResults && (
        <form className="form" onSubmit={handleLookup}>
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
          {lookupError && <p className="error">{lookupError}</p>}
          <button type="submit" disabled={lookupBusy || !word.trim()}>
            {lookupBusy ? 'Looking up…' : 'Look up'}
          </button>
        </form>
      )}

      {/* Step 2: Pick a definition */}
      {lookupResults && !selectedDef && (
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
                  onClick={() => setSelectedDef(def_)}
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
          <button type="button" className="secondary" onClick={handleReset}>
            Search a different word
          </button>
        </div>
      )}

      {/* Step 3: Add context and save */}
      {selectedDef && (
        <form className="form word-save-form" onSubmit={handleSave}>
          <div className="word-selected-summary">
            <h3 className="word-lookup-word">{lookupResults.word}</h3>
            {selectedDef.part_of_speech && (
              <span className="word-def-pos">{selectedDef.part_of_speech}</span>
            )}
            <p className="word-selected-def">{selectedDef.definition}</p>
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

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isInspiring}
              onChange={(e) => setIsInspiring(e.target.checked)}
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
            <button
              type="button"
              className="secondary"
              disabled={wordFormBusy}
              onClick={() => setSelectedDef(null)}
            >
              Pick different definition
            </button>
            <button
              type="button"
              className="secondary"
              disabled={wordFormBusy}
              onClick={handleReset}
            >
              Start over
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
