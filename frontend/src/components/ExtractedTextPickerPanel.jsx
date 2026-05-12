import { useEffect, useMemo, useState } from 'react'

function looksLikeSentenceStart(fragment) {
  const t = fragment.trimStart()
  if (!t) return false
  return /^[A-Z0-9"'"'(]/.test(t)
}

function trimToSentenceStart(s) {
  if (!s) return s
  const leading = s.match(/^\s*/)[0].length
  const rest = s.slice(leading)
  if (looksLikeSentenceStart(rest)) return s.slice(leading)

  const re = /[.!?]\s+/g
  let m
  while ((m = re.exec(s)) !== null) {
    const idx = m.index + m[0].length
    const from = s.slice(idx)
    const trimFrom = from.search(/\S/)
    if (trimFrom === -1) continue
    if (looksLikeSentenceStart(from.slice(trimFrom))) return s.slice(idx + trimFrom)
  }
  return s
}

function trimToSentenceEnd(s) {
  if (!s) return s
  const t = s.replace(/\s+$/, '')
  if (/[.!?]\s*$/.test(t)) return t

  let lastPunct = -1
  const re = /[.!?]\s+/g
  let m
  while ((m = re.exec(t)) !== null) {
    lastPunct = m.index
  }
  if (lastPunct >= 0) return t.slice(0, lastPunct + 1).trimEnd()
  return s
}

function trimLineSegmentsForPicker(lines) {
  if (lines.length <= 1) return lines
  const out = lines.slice()
  const first = trimToSentenceStart(out[0])
  out[0] = first.length ? first : out[0]
  const li = out.length - 1
  const last = trimToSentenceEnd(out[li])
  out[li] = last.length ? last : out[li]
  return out
}

function segmentTextForPickerRaw(text) {
  const t = text ?? ''
  if (!t) return { mode: 'lines', segments: [''] }
  const lines = t.split('\n')
  if (lines.length > 1) {
    return { mode: 'lines', segments: lines }
  }
  const one = lines[0]
  const sentences = one
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (sentences.length > 1) {
    return { mode: 'sentences', segments: sentences }
  }
  return { mode: 'single', segments: [one] }
}

function segmentTextForPickerTrimmed(text) {
  const t = text ?? ''
  if (!t) return { mode: 'lines', segments: [''] }
  const lines = t.split('\n')
  if (lines.length > 1) {
    return { mode: 'lines', segments: trimLineSegmentsForPicker(lines) }
  }
  let one = lines[0]
  const trimmedBlob = trimToSentenceEnd(trimToSentenceStart(one))
  if (trimmedBlob.length) one = trimmedBlob
  const sentences = one
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (sentences.length > 1) {
    return { mode: 'sentences', segments: sentences }
  }
  return { mode: 'single', segments: [one] }
}

function joinSegments(mode, segments) {
  if (!segments.length) return ''
  if (mode === 'lines') return segments.join('\n')
  if (mode === 'sentences') return segments.join(' ')
  return segments[0] ?? ''
}

export function ExtractedTextPickerPanel({ text, onApply }) {
  const [trimEdges, setTrimEdges] = useState(false)
  const { mode, segments } = useMemo(
    () =>
      trimEdges
        ? segmentTextForPickerTrimmed(text)
        : segmentTextForPickerRaw(text),
    [text, trimEdges],
  )
  const [checked, setChecked] = useState(() =>
    segmentTextForPickerRaw(text).segments.map(() => false),
  )

  useEffect(() => {
    setTrimEdges(false)
    setChecked(segmentTextForPickerRaw(text).segments.map(() => false))
  }, [text])

  useEffect(() => {
    const segs = (
      trimEdges ? segmentTextForPickerTrimmed(text) : segmentTextForPickerRaw(text)
    ).segments
    setChecked(segs.map(() => false))
  }, [trimEdges])

  function toggleRow(i) {
    setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)))
  }

  function handleApply() {
    const kept = segments.filter((_, i) => checked[i])
    if (!kept.length) return
    onApply(joinSegments(mode, kept))
  }

  const keptCount = checked.filter(Boolean).length
  const trimLabel = mode === 'lines' ? 'Trim line edges' : 'Trim text edges'
  const fullLabel = mode === 'lines' ? 'Show full lines' : 'Show full text'
  const lead =
    'Apply merges checked rows into the read-only extracted text above. '
  const hint =
    mode === 'lines'
      ? `${lead}Each row is one OCR line. Optional: trim the first and last row at sentence boundaries.`
      : mode === 'sentences'
        ? `${lead}Optional: trim stray text at the start/end of the block before picking rows.`
        : `${lead}Only one chunk — try Trim text edges to split into sentences, or go back to adjust the image.`

  return (
    <details className="line-pick-details">
      <summary className="line-pick-summary">Pick parts to keep</summary>
      <p className="hint line-pick-hint">
        {hint}
        {segments.length > 5
          ? ' Scroll inside the list below to see every row.'
          : ''}
      </p>
      <div className="line-pick-trim-actions">
        <button
          type="button"
          className="secondary"
          disabled={trimEdges}
          onClick={() => setTrimEdges(true)}
        >
          {trimLabel}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!trimEdges}
          onClick={() => setTrimEdges(false)}
        >
          {fullLabel}
        </button>
      </div>
      <ul className="line-pick-list" aria-label="Text chunks to include or exclude">
        {segments.map((seg, i) => (
          <li key={i} className="line-pick-row">
            <label className="line-pick-label">
              <input
                type="checkbox"
                checked={checked[i] ?? false}
                onChange={() => toggleRow(i)}
              />
              <span className="line-pick-text">
                {seg === '' ? (
                  <em className="line-pick-empty">(blank line)</em>
                ) : (
                  seg
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="secondary line-pick-apply"
        disabled={keptCount === 0}
        onClick={handleApply}
      >
        Apply checked parts to extracted text
      </button>
    </details>
  )
}
