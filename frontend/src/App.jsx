import { useCallback, useEffect, useState } from 'react'
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

async function ensureSessionCsrf() {
  await fetch(apiUrl('/api/v1/auth/csrf/'), { credentials: 'include' })
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
        await fetch(apiUrl('/api/v1/auth/csrf/'), { credentials: 'include' })
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

  function onFilesChange(event) {
    setScreenshotFiles(Array.from(event.target.files ?? []))
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
      await ensureSessionCsrf()
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
          'X-CSRFToken': getCookie('csrftoken'),
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

  function onScreenshotKeepChange(index, keep) {
    setDraftScreenshots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, keep } : s)),
    )
  }

  function goBackToStep1() {
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
      await ensureSessionCsrf()
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
          'X-CSRFToken': getCookie('csrftoken'),
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
      await fetch(apiUrl('/api/v1/auth/csrf/'), { credentials: 'include' })
      const response = await fetch(apiUrl('/api/v1/auth/login/'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
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
      await fetch(apiUrl('/api/v1/auth/csrf/'), { credentials: 'include' })
      await fetch(apiUrl('/api/v1/auth/logout/'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
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

            <label>
              Screenshots (optional if you added thoughts)
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onFilesChange}
              />
            </label>
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
                        value={s.extracted_text ?? ''}
                        onChange={(e) =>
                          onScreenshotTextChange(index, e.target.value)
                        }
                        rows={4}
                      />
                    </label>
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
