import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Remove leading text only when the string starts mid-sentence (first
 * non-whitespace character is lowercase).  Finds the first `. [A-Z]`
 * boundary and cuts everything before the capital.  If the text already
 * begins with a capital letter the start is a proper sentence boundary
 * and nothing is trimmed.
 */
function trimLeadingBeforeCapitalAfterFullStop(s) {
  if (!s) return s
  if (/^\s*[A-Z]/.test(s)) return s
  const m = s.match(/\.\s+[A-Z]/)
  if (!m || m.index === undefined) return s
  const capIdx = m.index + m[0].length - 1
  return s.slice(capIdx)
}

/** Remove text after the last full stop (period); keeps the period. */
function trimAfterLastFullStop(s) {
  if (!s) return s
  const t = s.replace(/\s+$/, '')
  if (/\.\s*$/.test(t)) return t
  const i = t.lastIndexOf('.')
  if (i === -1) return s
  return t.slice(0, i + 1).trimEnd()
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

function joinSegments(mode, segments) {
  if (!segments.length) return ''
  if (mode === 'lines') return segments.join('\n')
  if (mode === 'sentences') return segments.join(' ')
  return segments[0] ?? ''
}

/** Global trim on full text; rows/sentences that are checked keep their original text. */
function mergeTrimmedWithPreservedChecked(text, checked, mode, originalSegments) {
  const trimmed = trimAfterLastFullStop(trimLeadingBeforeCapitalAfterFullStop(text))
  const next = segmentTextForPickerRaw(trimmed)
  if (next.mode !== mode) {
    return trimmed
  }
  const out = next.segments.slice()
  const m = Math.min(originalSegments.length, out.length, checked.length)
  for (let i = 0; i < m; i += 1) {
    if (checked[i]) {
      out[i] = originalSegments[i]
    }
  }
  return joinSegments(mode, out)
}

/** Keep picker selections when parent text edits change length (pad/truncate); preserve all when length matches. */
function reconcileChecked(prev, newLength) {
  if (newLength === prev.length) return prev
  if (newLength > prev.length) {
    return [...prev, ...Array(newLength - prev.length).fill(false)]
  }
  return prev.slice(0, newLength)
}

export function ExtractedTextPickerPanel({ text, onApply }) {
  /** Drives checkbox rows only — stays full OCR until you edit the field or trim (not shrunk by Apply checked). */
  const [pickerListSource, setPickerListSource] = useState(() => text ?? '')

  const { mode: listMode, segments: listSegments } = useMemo(
    () => segmentTextForPickerRaw(pickerListSource ?? ''),
    [pickerListSource],
  )

  const { mode: fieldMode, segments: fieldSegments } = useMemo(
    () => segmentTextForPickerRaw(text ?? ''),
    [text],
  )

  const [checked, setChecked] = useState(() =>
    segmentTextForPickerRaw(pickerListSource ?? '').segments.map(() => false),
  )

  const prevTextRef = useRef(text)
  /** Full extracted text before Trim edges (one-step undo). */
  const preTrimSnapshot = useRef(null)
  /** When true, the next `text` change came from `handleTrimExtractedField` — do not clear undo snapshot. */
  const trimJustAppliedRef = useRef(false)
  /** When true, the next `text` change came from Apply checked — keep picker list source unchanged. */
  const applyCheckedJustAppliedRef = useRef(false)

  useEffect(() => {
    const textChanged = prevTextRef.current !== text
    prevTextRef.current = text

    if (textChanged) {
      if (trimJustAppliedRef.current) {
        trimJustAppliedRef.current = false
        setPickerListSource(text)
        const newLen = segmentTextForPickerRaw(text).segments.length
        setChecked((prev) => reconcileChecked(prev, newLen))
        return
      }
      if (applyCheckedJustAppliedRef.current) {
        applyCheckedJustAppliedRef.current = false
        const pickLen = segmentTextForPickerRaw(pickerListSource).segments.length
        // List rows no longer line up with merged textarea lines — clear checks so Trim / next apply stay consistent.
        setChecked(Array.from({ length: pickLen }, () => false))
        return
      }
      preTrimSnapshot.current = null
      setPickerListSource(text)
      const newLen = segmentTextForPickerRaw(text).segments.length
      setChecked((prev) => reconcileChecked(prev, newLen))
      return
    }

    setChecked((prev) => {
      const segs = segmentTextForPickerRaw(pickerListSource).segments
      if (prev.length === segs.length) return prev
      const next = prev.slice(0, segs.length)
      while (next.length < segs.length) next.push(false)
      return next
    })
  }, [text, pickerListSource])

  function toggleRow(i) {
    setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)))
  }

  function handleApply() {
    const kept = listSegments.filter((_, i) => checked[i])
    if (!kept.length) return
    applyCheckedJustAppliedRef.current = true
    onApply(joinSegments(listMode, kept))
    setPickerOpen(false)
  }

  function handleTrimExtractedField() {
    if (!text) return
    if (preTrimSnapshot.current === null) {
      preTrimSnapshot.current = text
    }
    trimJustAppliedRef.current = true
    const merged = mergeTrimmedWithPreservedChecked(
      text,
      checked,
      fieldMode,
      fieldSegments,
    )
    onApply(merged)
  }

  function handleUndoTrim() {
    if (preTrimSnapshot.current == null) return
    const snap = preTrimSnapshot.current
    preTrimSnapshot.current = null
    onApply(snap)
  }

  const keptCount = checked.filter(Boolean).length
  const canUndoTrim = preTrimSnapshot.current != null
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="line-pick-wrapper">
      <div className="line-pick-toolbar">
        <button
          type="button"
          className="line-pick-summary"
          onClick={() => setPickerOpen((v) => !v)}
        >
          Pick parts to keep
        </button>
        <button
          type="button"
          className="line-pick-summary"
          disabled={!text}
          onClick={handleTrimExtractedField}
        >
          Trim edges
        </button>
        <button
          type="button"
          className="line-pick-summary"
          disabled={!canUndoTrim}
          onClick={handleUndoTrim}
        >
          Undo trim
        </button>
      </div>
      {pickerOpen && (
        <div className="line-pick-details">
          <p className="hint line-pick-hint">
            Select lines below.
          </p>
          <ul className="line-pick-list" aria-label="Text chunks to include or exclude">
            {listSegments.map((seg, i) => (
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
            className="line-pick-apply"
            disabled={keptCount === 0}
            onClick={handleApply}
          >
            Apply checked parts to extracted text
          </button>
        </div>
      )}
    </div>
  )
}
