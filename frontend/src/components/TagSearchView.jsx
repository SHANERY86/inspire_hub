import { useMemo, useState } from 'react'
import { resolveMediaUrl } from '../lib/mediaUrl.js'

function flowQuoteText(text) {
  return text.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

function matchesTags(itemTags, query) {
  if (!query.trim()) return false
  const stored = (itemTags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  const searched = query
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  return searched.every((q) => stored.some((t) => t.includes(q)))
}

export function TagSearchView({ inspirations, words }) {
  const [query, setQuery] = useState('')

  const trimmed = query.trim()

  const matchedInspirations = useMemo(() => {
    if (!trimmed) return []
    return inspirations.filter((i) => matchesTags(i.tags, trimmed))
  }, [inspirations, trimmed])

  const matchedWords = useMemo(() => {
    if (!trimmed) return []
    return words.filter((w) => matchesTags(w.tags, trimmed))
  }, [words, trimmed])

  const hasResults = matchedInspirations.length > 0 || matchedWords.length > 0
  const searched = trimmed.length > 0

  return (
    <section className="view-panel tag-search-view sheet-surface-card">
      <h2 className="view-panel-heading">Search by tag</h2>
      <p className="hint">
        Enter one or more tags to find matching inspirations and words. Separate multiple tags with commas.
      </p>

      <div className="tag-search-input-row">
        <input
          className="tag-search-input"
          type="search"
          placeholder="e.g. productivity, creativity"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {searched && !hasResults && (
        <p className="hint tag-search-empty">No inspirations or words tagged with "{trimmed}".</p>
      )}

      {matchedInspirations.length > 0 && (
        <div className="tag-search-section">
          <h3 className="tag-search-section-heading">
            Inspirations <span className="tag-search-count">({matchedInspirations.length})</span>
          </h3>
          <ul className="tag-search-list">
            {matchedInspirations.map((i) => {
              const quote = (i.quote || '').trim()
              const essence = (i.essence || '').trim()
              const essenceDisplay = essence || (quote && !essence ? quote : '') || '—'
              const showQuoteBlock = Boolean(essence) && Boolean(quote) && quote !== essence
              const shots = Array.isArray(i.screenshots) ? i.screenshots : []
              const firstShot = shots[0] ? resolveMediaUrl(shots[0].image) : null
              return (
                <li key={i.id} className="tag-search-item">
                  {firstShot && (
                    <img
                      src={firstShot}
                      alt=""
                      className="tag-search-item-screenshot"
                      loading="lazy"
                    />
                  )}
                  <p className="tag-search-item-primary">{essenceDisplay}</p>
                  {showQuoteBlock && (
                    <blockquote className="my-inspirations-item-quote">
                      <p>{flowQuoteText(quote)}</p>
                    </blockquote>
                  )}
                  {i.source_title && (
                    <p className="tag-search-item-meta">{i.source_title}</p>
                  )}
                  {i.user_thoughts && (
                    <p className="tag-search-item-meta">{i.user_thoughts}</p>
                  )}
                  <p className="tag-search-item-tags">{i.tags}</p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {matchedWords.length > 0 && (
        <div className="tag-search-section">
          <h3 className="tag-search-section-heading">
            Words <span className="tag-search-count">({matchedWords.length})</span>
          </h3>
          <ul className="tag-search-list">
            {matchedWords.map((w) => (
              <li key={w.id} className="tag-search-item">
                <p className="tag-search-item-primary">
                  <strong>{w.word}</strong>
                  {w.part_of_speech && (
                    <span className="tag-search-item-pos"> · {w.part_of_speech}</span>
                  )}
                </p>
                <p className="tag-search-item-meta">{w.definition}</p>
                <p className="tag-search-item-tags">{w.tags}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
