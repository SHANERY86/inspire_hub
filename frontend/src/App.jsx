import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const APP_BASE = import.meta.env.BASE_URL ?? '/'

function joinUrl(base, path) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${normalizedBase}${normalizedPath}`
}

function apiUrl(path) {
  if (API_BASE) {
    return `${API_BASE}${path}`
  }
  return joinUrl(APP_BASE, path)
}

function getCookie(name) {
  const cookieValue = `; ${document.cookie}`
  const parts = cookieValue.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return ''
}

async function fetchSessionCsrf() {
  const res = await fetch(apiUrl('/api/v1/auth/csrf/'), { credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  const fromBody = typeof data.csrfToken === 'string' ? data.csrfToken : ''
  return fromBody || getCookie('csrftoken')
}

function imageDataUrl(base64, filename) {
  const lower = (filename || '').toLowerCase()
  const mime = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg'
  return `data:${mime};base64,${base64}`
}

/** Heuristic: fragment begins a new sentence (OCR-friendly). */
function looksLikeSentenceStart(fragment) {
  const t = fragment.trimStart()
  if (!t) return false
  return /^[A-Z0-9"'"'(]/.test(t)
}

/** Drop a leading half-sentence: start at first clear sentence boundary inside the line. */
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

/** Drop a trailing half-sentence: end after the last full stop / ? / ! that closes a sentence. */
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

/** Same as raw, but clips first/last OCR line (and blob edges before sentence split) at sentence boundaries. */
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

function ExtractedTextPickerPanel({ text, onApply }) {
  const [trimEdges, setTrimEdges] = useState(false)
  const { mode, segments } = useMemo(
    () =>
      trimEdges
        ? segmentTextForPickerTrimmed(text)
        : segmentTextForPickerRaw(text),
    [text, trimEdges],
  )
  const [checked, setChecked] = useState(() =>
    segmentTextForPickerRaw(text).segments.map(() => true),
  )

  useEffect(() => {
    setTrimEdges(false)
    setChecked(segmentTextForPickerRaw(text).segments.map(() => true))
  }, [text])

  useEffect(() => {
    const segs = (
      trimEdges ? segmentTextForPickerTrimmed(text) : segmentTextForPickerRaw(text)
    ).segments
    setChecked(segs.map(() => true))
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
  const hint =
    mode === 'lines'
      ? 'Each row is one OCR line. Optional: trim the first and last row at sentence boundaries.'
      : mode === 'sentences'
        ? 'Rows are split by sentences. Optional: trim stray text at the start/end of the block before picking.'
        : 'One block only — add line breaks above for multiple rows, or use Keep selection only.'

  return (
    <details className="line-pick-details">
      <summary className="line-pick-summary">Pick parts to keep (easier on a phone)</summary>
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
        Replace text with checked parts
      </button>
    </details>
  )
}

const emptyStep1 = {
  source_title: '',
  essence: '',
  user_thoughts: '',
  source_type: 'book',
  reference: '',
}

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const [inspirations, setInspirations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [listAuthRequired, setListAuthRequired] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [step1Form, setStep1Form] = useState(emptyStep1)
  const [screenshotFiles, setScreenshotFiles] = useState([])
  const [draftForm, setDraftForm] = useState(null)
  const [draftScreenshots, setDraftScreenshots] = useState([])
  const screenshotTextareaRefs = useRef({})
  const cameraInputRef = useRef(null)

  const loadInspirations = useCallback(async () => {
    try {
      setLoading(true)
      setListAuthRequired(false)
      const response = await fetch(apiUrl('/api/v1/inspirations/'), {
        credentials: 'include',
      })
      if (response.status === 401 || response.status === 403) {
        setInspirations([])
        setListAuthRequired(true)
        setError('')
        return
      }
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      const data = await response.json()
      setInspirations(data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        await fetchSessionCsrf()
        if (cancelled) return
        const me = await fetch(apiUrl('/api/v1/auth/me/'), {
          credentials: 'include',
        })
        if (cancelled) return
        if (me.ok) {
          setCurrentUser(await me.json())
        } else {
          setCurrentUser(null)
        }
      } catch {
        if (!cancelled) setCurrentUser(null)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
      if (!cancelled) await loadInspirations()
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [loadInspirations])

  function onStep1Change(event) {
    const { name, value } = event.target
    setStep1Form((prev) => ({ ...prev, [name]: value }))
  }

  function onGalleryFilesChange(event) {
    setScreenshotFiles(Array.from(event.target.files ?? []))
  }

  function onCameraCaptureChange(event) {
    const added = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!added.length) return
    setScreenshotFiles((prev) => [...prev, ...added])
  }

  async function onPreviewSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!screenshotFiles.length && !step1Form.user_thoughts.trim()) {
      setFormError('Upload at least one screenshot or enter your thoughts.')
      return
    }

    setSubmitting(true)
    try {
      const csrf = await fetchSessionCsrf()
      const fd = new FormData()
      fd.append('source_title', step1Form.source_title)
      fd.append('essence', step1Form.essence)
      fd.append('user_thoughts', step1Form.user_thoughts)
      fd.append('source_type', step1Form.source_type)
      fd.append('reference', step1Form.reference)
      for (const file of screenshotFiles) {
        fd.append('screenshots', file)
      }

      const response = await fetch(apiUrl('/api/v1/inspiration-drafts/preview/'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrf,
        },
        body: fd,
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Write access requires authentication.')
        }
        const body = await response.json().catch(() => ({}))
        throw new Error(body.detail || `Preview failed (${response.status}).`)
      }

      const data = await response.json()
      setDraftForm(data.form_data)
      setDraftScreenshots(
        (data.screenshots ?? []).map((s) => ({
          ...s,
          keep: true,
        })),
      )
      setStep(2)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Preview request failed')
    } finally {
      setSubmitting(false)
    }
  }

  function onDraftFormChange(event) {
    const { name, value } = event.target
    setDraftForm((prev) => ({ ...prev, [name]: value }))
  }

  function onScreenshotTextChange(index, extracted_text) {
    setDraftScreenshots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, extracted_text } : s)),
    )
  }

  function keepExtractedSelectionOnly(index) {
    const el = screenshotTextareaRefs.current[index]
    if (!el) return
    const { selectionStart, selectionEnd, value } = el
    if (selectionStart === selectionEnd) return
    const selected = value.slice(selectionStart, selectionEnd)
    onScreenshotTextChange(index, selected)
    setTimeout(() => {
      const node = screenshotTextareaRefs.current[index]
      if (node) {
        const len = selected.length
        node.focus()
        node.setSelectionRange(len, len)
      }
    }, 0)
  }

  function onScreenshotKeepChange(index, keep) {
    setDraftScreenshots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, keep } : s)),
    )
  }

  function goBackToStep1() {
    screenshotTextareaRefs.current = {}
    setStep(1)
    setDraftForm(null)
    setDraftScreenshots([])
    setFormError('')
  }

  async function onCommitSubmit(event) {
    event.preventDefault()
    setFormError('')
    setSubmitting(true)

    try {
      const csrf = await fetchSessionCsrf()
      const payload = {
        source_title: draftForm.source_title,
        essence: draftForm.essence,
        user_thoughts: draftForm.user_thoughts ?? '',
        source_type: draftForm.source_type,
        reference: draftForm.reference ?? '',
        screenshots: draftScreenshots.map((s) => ({
          keep: s.keep,
          image_base64: s.image_base64,
          filename: s.filename,
          extracted_text: s.extracted_text ?? '',
        })),
      }

      const response = await fetch(apiUrl('/api/v1/inspiration-drafts/commit/'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Write access requires authentication.')
        }
        const body = await response.json().catch(() => ({}))
        throw new Error(body.detail || `Save failed (${response.status}).`)
      }

      const created = await response.json()
      setInspirations((prev) => [created, ...prev])
      setStep1Form(emptyStep1)
      setScreenshotFiles([])
      goBackToStep1()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Commit request failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function onLoginSubmit(event) {
    event.preventDefault()
    setLoginError('')
    setAuthBusy(true)
    try {
      const csrf = await fetchSessionCsrf()
      const response = await fetch(apiUrl('/api/v1/auth/login/'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf,
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail =
          typeof body.detail === 'string'
            ? body.detail
            : response.status === 403
              ? 'Request blocked (often CSRF). Reload and try again.'
              : `Sign-in failed (HTTP ${response.status}). For local dev, run Django on 127.0.0.1:8000 and restart Vite after proxy changes.`
        setLoginError(detail)
        return
      }
      setCurrentUser({ id: body.id, username: body.username })
      setLoginPassword('')
      setShowLoginForm(false)
      await loadInspirations()
    } finally {
      setAuthBusy(false)
    }
  }

  async function onLogout() {
    setAuthBusy(true)
    try {
      const csrf = await fetchSessionCsrf()
      await fetch(apiUrl('/api/v1/auth/logout/'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrf,
        },
      })
      setCurrentUser(null)
      await loadInspirations()
    } finally {
      setAuthBusy(false)
    }
  }

  return (
    <main className="container">
      <header className="session-bar">
        {authLoading ? (
          <p className="hint">Checking session…</p>
        ) : currentUser ? (
          <p className="session-info">
            Signed in as <strong>{currentUser.username}</strong>{' '}
            <button
              type="button"
              className="secondary"
              onClick={() => onLogout()}
              disabled={authBusy}
            >
              Log out
            </button>
          </p>
        ) : (
          <p className="session-info">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setShowLoginForm((v) => !v)
                setLoginError('')
              }}
            >
              {showLoginForm ? 'Cancel' : 'Sign in'}
            </button>
          </p>
        )}
      </header>

      {!authLoading && !currentUser && showLoginForm && (
        <section className="card login-card">
          <h2>Sign in</h2>
          <form className="form" onSubmit={onLoginSubmit}>
            <label>
              Username
              <input
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </label>
            {loginError && <p className="error">{loginError}</p>}
            <button type="submit" disabled={authBusy}>
              {authBusy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
      )}

      <h1>Inspire Hub</h1>
      <p className="subtitle">
        Add inspirations with OCR preview (sessionless API). Step {step} of 2.
      </p>

      <section className="card">
        <h2>{step === 1 ? '1 · Upload & details' : '2 · Preview & save'}</h2>

        {step === 1 && (
          <form className="form" onSubmit={onPreviewSubmit}>
            <label>
              Source title
              <input
                name="source_title"
                value={step1Form.source_title}
                onChange={onStep1Change}
              />
            </label>

            <label>
              Essence
              <input
                name="essence"
                value={step1Form.essence}
                onChange={onStep1Change}
              />
            </label>

            <label>
              Your thoughts (optional if you add screenshots)
              <textarea
                name="user_thoughts"
                value={step1Form.user_thoughts}
                onChange={onStep1Change}
                rows={3}
              />
            </label>

            <label>
              Source type
              <select
                name="source_type"
                value={step1Form.source_type}
                onChange={onStep1Change}
              >
                <option value="book">book</option>
                <option value="article">article</option>
                <option value="video">video</option>
                <option value="podcast">podcast</option>
                <option value="other">other</option>
              </select>
            </label>

            <label>
              Reference (optional)
              <input
                name="reference"
                value={step1Form.reference}
                onChange={onStep1Change}
              />
            </label>

            <div className="screenshot-block" role="group" aria-label="Screenshots">
              <p className="screenshot-block-label">
                Screenshots (optional if you added thoughts)
              </p>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="visually-hidden"
                tabIndex={-1}
                onChange={onCameraCaptureChange}
                aria-hidden
              />
              <div className="screenshot-actions">
                <button
                  type="button"
                  className="secondary camera-btn"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  Take photo
                </button>
                <label className="file-picker-label">
                  Choose from library
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onGalleryFilesChange}
                  />
                </label>
              </div>
              <p className="hint">
                Take photo adds each shot. Library picker replaces the current list.
              </p>
            </div>
            {screenshotFiles.length > 0 && (
              <p className="hint">{screenshotFiles.length} file(s) selected</p>
            )}

            <button type="submit" disabled={submitting}>
              {submitting ? 'Running OCR…' : 'Continue to preview'}
            </button>
          </form>
        )}

        {step === 2 && draftForm && (
          <form className="form" onSubmit={onCommitSubmit}>
            <p className="hint">
              Confirm title, essence, and source type before saving (required).
            </p>

            <label>
              Source title
              <input
                name="source_title"
                value={draftForm.source_title}
                onChange={onDraftFormChange}
                required
              />
            </label>

            <label>
              Essence
              <input
                name="essence"
                value={draftForm.essence}
                onChange={onDraftFormChange}
                required
              />
            </label>

            <label>
              Your thoughts
              <textarea
                name="user_thoughts"
                value={draftForm.user_thoughts ?? ''}
                onChange={onDraftFormChange}
                rows={3}
              />
            </label>

            <label>
              Source type
              <select
                name="source_type"
                value={draftForm.source_type}
                onChange={onDraftFormChange}
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
                value={draftForm.reference ?? ''}
                onChange={onDraftFormChange}
              />
            </label>

            {draftScreenshots.length > 0 && (
              <div className="preview-shots">
                <h3>Screenshots</h3>
                {draftScreenshots.map((s, index) => (
                  <div key={`${s.filename}-${index}`} className="preview-shot">
                    <img
                      src={imageDataUrl(s.image_base64, s.filename)}
                      alt={s.filename}
                      className="preview-thumb"
                    />
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={s.keep}
                        onChange={(e) =>
                          onScreenshotKeepChange(index, e.target.checked)
                        }
                      />
                      Keep this image when saving
                    </label>
                    <label>
                      Extracted text (edit before save)
                      <textarea
                        className="ocr-textarea"
                        ref={(el) => {
                          screenshotTextareaRefs.current[index] = el
                        }}
                        value={s.extracted_text ?? ''}
                        onChange={(e) =>
                          onScreenshotTextChange(index, e.target.value)
                        }
                        rows={5}
                      />
                    </label>
                    <ExtractedTextPickerPanel
                      text={s.extracted_text ?? ''}
                      onApply={(next) => onScreenshotTextChange(index, next)}
                    />
                    <button
                      type="button"
                      className="secondary"
                      title="Highlight the text you want to keep, then click to remove the rest."
                      onClick={() => keepExtractedSelectionOnly(index)}
                    >
                      Keep selection only
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={goBackToStep1}
                disabled={submitting}
              >
                Back
              </button>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save inspiration'}
              </button>
            </div>
          </form>
        )}

        {formError && <p className="error">Error: {formError}</p>}
      </section>

      {loading && <p>Loading inspirations...</p>}
      {error && <p className="error">Error: {error}</p>}

      {!loading && listAuthRequired && (
        <p className="hint">
          Log in to load your inspirations list.{' '}
          <button
            type="button"
            className="secondary"
            onClick={() => setShowLoginForm(true)}
          >
            Sign in
          </button>
        </p>
      )}

      {!loading && !error && !listAuthRequired && inspirations.length === 0 && (
        <p>No inspirations yet.</p>
      )}

      {!loading && !error && !listAuthRequired && inspirations.length > 0 && (
        <ul className="list">
          {inspirations.map((item) => (
            <li key={item.id} className="card">
              <h3>{item.essence}</h3>
              <p>
                <strong>Source:</strong> {item.source_title} ({item.source_type})
              </p>
              {item.quote && <p>{item.quote}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
