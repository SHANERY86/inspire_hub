import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ScreenshotCropModal } from './ScreenshotCropModal.jsx'

/**
 * "Your thoughts" textarea with a small corner button that opens the camera (library on
 * desktop), lets the user frame the text in the crop modal, then appends the raw OCR text
 * (no line picking).
 */
export function ThoughtsTextarea({ label, value, onChange, onOcrImageText, onAppendText }) {
  const fileInputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cropFile, setCropFile] = useState(/** @type {File | null} */ (null))

  function onFileChange(event) {
    const file = event.target.files?.[0]
    // Reset so picking the same image again still fires change.
    event.target.value = ''
    if (!file) return
    setError('')
    setCropFile(file)
  }

  const onCropCancel = useCallback(() => setCropFile(null), [])

  async function onCropComplete(file) {
    setCropFile(null)
    setBusy(true)
    setError('')
    try {
      const text = (await onOcrImageText(file)).trim()
      if (text) {
        onAppendText(text)
      } else {
        setError('No text found in that image.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Text recognition failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <label className="thoughts-field">
        {label}
        <textarea name="user_thoughts" value={value} onChange={onChange} rows={3} />
        <button
          type="button"
          className="thoughts-ocr-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Add text from an image"
          title="Add text from an image"
        >
          {busy ? (
            <span className="thoughts-ocr-spinner" aria-hidden />
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path
                d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9h8M8 12h8M8 15h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          tabIndex={-1}
          onChange={onFileChange}
          aria-hidden
        />
      </label>
      {busy && <p className="hint thoughts-ocr-status">Reading text from image…</p>}
      {error && <p className="error thoughts-ocr-status">{error}</p>}
      {cropFile &&
        createPortal(
          <ScreenshotCropModal
            key={`${cropFile.name}-${cropFile.lastModified}`}
            file={cropFile}
            onCancel={onCropCancel}
            onComplete={onCropComplete}
          />,
          document.body,
        )}
    </>
  )
}
