import { useCallback, useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { getCroppedImageBlob } from '../lib/cropImage.js'

function outputFileName(originalName) {
  const base = originalName.replace(/\.[^.]+$/i, '') || 'screenshot'
  return `${base}-crop.jpg`
}

const ASPECT_MIN = 0.25
const ASPECT_MAX = 4

function clampAspect(n) {
  return Math.min(ASPECT_MAX, Math.max(ASPECT_MIN, n))
}

/**
 * Full-screen style modal: zoom + drag crop region before OCR.
 */
export function ScreenshotCropModal({ file, onCancel, onComplete }) {
  const [imageUrl, setImageUrl] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  /** Width ÷ height of the OCR frame; higher = wider selection. */
  const [frameAspect, setFrameAspect] = useState(4 / 3)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setFrameAspect(4 / 3)
    setError('')
    setCroppedAreaPixels(null)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const onMediaLoaded = useCallback(({ naturalWidth, naturalHeight }) => {
    if (naturalWidth > 0 && naturalHeight > 0) {
      const photoAspect = naturalWidth / naturalHeight
      setFrameAspect(clampAspect(photoAspect))
    }
  }, [])

  useEffect(() => {
    if (!file) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [file])

  useEffect(() => {
    if (!file) return
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [file, onCancel])

  async function handleUseSelection() {
    if (!imageUrl || !croppedAreaPixels || !file) return
    setBusy(true)
    setError('')
    try {
      const blob = await getCroppedImageBlob(imageUrl, croppedAreaPixels)
      const out = new File([blob], outputFileName(file.name), {
        type: blob.type || 'image/jpeg',
      })
      onComplete(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not crop image')
    } finally {
      setBusy(false)
    }
  }

  function handleUseFullImage() {
    if (!file) return
    onComplete(file)
  }

  if (!file || !imageUrl) return null

  return (
    <div className="screenshot-crop-overlay" role="presentation">
      <div
        className="screenshot-crop-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="screenshot-crop-title"
      >
        <h2 id="screenshot-crop-title" className="screenshot-crop-heading">
          Frame text for OCR
        </h2>
        <p className="hint screenshot-crop-hint">
          Pinch or scroll to zoom, drag to move the image. Use <strong>Frame shape</strong> to make
          the selection wider or taller without changing zoom.
        </p>

        <div className="screenshot-crop-stage">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={0}
            aspect={frameAspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={() => {}}
            onCropComplete={onCropComplete}
            onMediaLoaded={onMediaLoaded}
            minZoom={1}
            maxZoom={3}
            cropShape="rect"
            showGrid
            objectFit="contain"
            zoomSpeed={1}
            restrictPosition
            zoomWithScroll
            keyboardStep={1}
            style={{}}
            classes={{}}
            mediaProps={{}}
            cropperProps={{}}
          />
        </div>

        <label className="screenshot-crop-zoom-label">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.02}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        <label className="screenshot-crop-zoom-label screenshot-crop-aspect-label">
          <span className="screenshot-crop-aspect-caption">
            <span>Frame shape</span>
            <span className="screenshot-crop-aspect-ends">
              <span className="hint">Taller</span>
              <span className="hint">Wider</span>
            </span>
          </span>
          <input
            type="range"
            min={ASPECT_MIN}
            max={ASPECT_MAX}
            step={0.02}
            value={frameAspect}
            onChange={(e) => setFrameAspect(clampAspect(Number(e.target.value)))}
            aria-valuetext={`Selection width to height ratio ${frameAspect.toFixed(2)}`}
          />
        </label>

        {error ? <p className="error screenshot-crop-error">{error}</p> : null}

        <div className="actions screenshot-crop-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={handleUseFullImage}
          >
            Use full image
          </button>
          <button type="button" disabled={busy || !croppedAreaPixels} onClick={handleUseSelection}>
            {busy ? 'Working…' : 'Use selection'}
          </button>
        </div>
      </div>
    </div>
  )
}
