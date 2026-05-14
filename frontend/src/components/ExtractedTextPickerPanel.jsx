import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Remove leading text only when the cut is at a capital letter immediately
 * preceded by a full stop and whitespace (`." + whitespace + "[A-Z]`).
 * If that pattern never appears, the string is unchanged.
 */
function trimLeadingBeforeCapitalAfterFullStop(s) {
  if (!s) return s
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

  const lead =
    'Apply checked writes the merged lines into the extracted text field above; the pick list stays on the full OCR so you can choose again (checkboxes clear after each apply). '
  const hint =
    listMode === 'lines'
      ? `${lead}Each row is one OCR line. Trim edges updates the large extracted field: leading text is removed only from the start up to the first capital letter that follows a full stop and whitespace (e.g. ". "), and trailing text after the last full stop (.) is removed. Checked rows are left unchanged. Editing the extracted field refreshes the pick list to match.`
      : listMode === 'sentences'
        ? `${lead}Trim edges updates the whole block: leading text is removed only up to the first capital letter that follows a full stop and whitespace (e.g. ". "), and trailing text after the last full stop (.) is removed. Checked sentences are left unchanged. Editing the extracted field refreshes the pick list to match.`
        : `${lead}Trim edges: leading text is removed only up to the first capital after ". ", then trailing text after the last "." Check a row to preserve it, or Undo.`

  return (
    <details className="line-pick-details">
      <summary className="line-pick-summary">Pick parts to keep</summary>
      <p className="hint line-pick-hint">
        {hint}
        {listSegments.length > 5
          ? ' Scroll inside the list below to see every row.'
          : ''}
      </p>
      <div className="line-pick-trim-actions">
        <button
          type="button"
          className="secondary"
          disabled={!text}
          onClick={handleTrimExtractedField}
        >
          Trim edges
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!canUndoTrim}
          onClick={handleUndoTrim}
        >
          Undo trim
        </button>
      </div>
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
        className="secondary line-pick-apply"
        disabled={keptCount === 0}
        onClick={handleApply}
      >
        Apply checked parts to extracted text
      </button>
    </details>
  )
}
