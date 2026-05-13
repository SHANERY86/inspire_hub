import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { AddInspirationView } from './components/AddInspirationView.jsx'
import { AddSourceView } from './components/AddSourceView.jsx'
import { HamburgerNav } from './components/HamburgerNav.jsx'
import { HomeView } from './components/HomeView.jsx'
import { SourceInspirationsView } from './components/SourceInspirationsView.jsx'
import { SourcesGalleryView } from './components/SourcesGalleryView.jsx'

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

const emptyStep1 = {
  source_title: '',
  essence: '',
  user_thoughts: '',
  source_type: 'book',
  reference: '',
  source: null,
}

const emptyNewSource = {
  title: '',
  author: '',
  isbn: '',
  source_type: 'book',
  notes: '',
}

/** @typedef {'home' | 'addInspiration' | 'sourcesGallery' | 'sourceInspirations' | 'addSource'} AppView */

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const [activeView, setActiveView] = useState(/** @type {AppView} */ ('home'))
  const [navOpen, setNavOpen] = useState(false)

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
  const cameraInputRef = useRef(null)
  const barcodeIsbnRef = useRef(null)

  const [sources, setSources] = useState([])
  const [sourcesLoading, setSourcesLoading] = useState(false)
  const [sourcesError, setSourcesError] = useState('')
  const [newSource, setNewSource] = useState(emptyNewSource)
  const [sourceFormBusy, setSourceFormBusy] = useState(false)
  const [sourceFormMessage, setSourceFormMessage] = useState('')
  const [isbnCoverPreviewUrl, setIsbnCoverPreviewUrl] = useState('')

  const [selectedSourceId, setSelectedSourceId] = useState(
    /** @type {number | null} */ (null),
  )
  const [sourceInspirations, setSourceInspirations] = useState([])
  const [sourceInspirationsLoading, setSourceInspirationsLoading] = useState(false)
  const [sourceInspirationsError, setSourceInspirationsError] = useState('')
  const [sourceInspirationsAuthRequired, setSourceInspirationsAuthRequired] =
    useState(false)

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

  const loadInspirationsForSource = useCallback(async (sourceId) => {
    try {
      setSourceInspirationsLoading(true)
      setSourceInspirationsAuthRequired(false)
      setSourceInspirationsError('')
      const params = new URLSearchParams({ source: String(sourceId) })
      const response = await fetch(
        apiUrl(`/api/v1/inspirations/?${params.toString()}`),
        { credentials: 'include' },
      )
      if (response.status === 401 || response.status === 403) {
        setSourceInspirations([])
        setSourceInspirationsAuthRequired(true)
        return
      }
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      const data = await response.json()
      setSourceInspirations(data.results ?? [])
    } catch (err) {
      setSourceInspirationsError(
        err instanceof Error ? err.message : 'Request failed',
      )
      setSourceInspirations([])
    } finally {
      setSourceInspirationsLoading(false)
    }
  }, [])

  const loadSources = useCallback(async () => {
    setSourcesLoading(true)
    setSourcesError('')
    try {
      const response = await fetch(apiUrl('/api/v1/sources/'), {
        credentials: 'include',
      })
      if (response.status === 401 || response.status === 403) {
        setSources([])
        return
      }
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      const data = await response.json()
      setSources(data.results ?? [])
    } catch (err) {
      setSourcesError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSourcesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentUser) void loadSources()
    else {
      setSources([])
      setSourcesError('')
    }
  }, [currentUser, loadSources])

  useEffect(() => {
    if (
      activeView !== 'sourceInspirations' ||
      selectedSourceId == null ||
      !currentUser
    ) {
      return
    }
    void loadInspirationsForSource(selectedSourceId)
  }, [activeView, selectedSourceId, currentUser, loadInspirationsForSource])

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

  function goHome() {
    setActiveView('home')
    setNavOpen(false)
    setSelectedSourceId(null)
  }

  function openSourceInspirations(sourceId) {
    setSelectedSourceId(sourceId)
    setActiveView('sourceInspirations')
    setNavOpen(false)
  }

  function backFromSourceInspirations() {
    setActiveView('sourcesGallery')
    setSelectedSourceId(null)
  }

  function onStep1Change(event) {
    const { name, value } = event.target
    if (name === 'source') {
      const newSourceId = value === '' ? null : Number(value)
      setStep1Form((prev) => {
        if (newSourceId == null) {
          return { ...prev, source: null }
        }
        const src = sources.find((s) => s.id === newSourceId)
        return {
          ...prev,
          source: newSourceId,
          source_title: src ? src.title : prev.source_title,
        }
      })
      return
    }
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
      if (step1Form.source != null) {
        fd.append('source', String(step1Form.source))
      }
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
    if (name === 'source') {
      const newSourceId = value === '' ? null : Number(value)
      setDraftForm((prev) => {
        if (!prev) return prev
        if (newSourceId == null) {
          return { ...prev, source: null }
        }
        const src = sources.find((s) => s.id === newSourceId)
        return {
          ...prev,
          source: newSourceId,
          source_title: src ? src.title : prev.source_title,
        }
      })
      return
    }
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

  function onNewSourceFieldChange(event) {
    const { name, value } = event.target
    if (name === 'isbn') setIsbnCoverPreviewUrl('')
    setNewSource((prev) => ({ ...prev, [name]: value }))
  }

  async function lookupIsbnForNewSource() {
    const q = newSource.isbn.trim()
    if (!q) {
      setSourceFormMessage('Enter an ISBN first.')
      setIsbnCoverPreviewUrl('')
      return
    }
    setSourceFormBusy(true)
    setSourceFormMessage('')
    try {
      const params = new URLSearchParams({ isbn: q })
      const response = await fetch(
        apiUrl(`/api/v1/sources/isbn-lookup/?${params.toString()}`),
        { credentials: 'include' },
      )
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setIsbnCoverPreviewUrl('')
        setSourceFormMessage(
          typeof body.detail === 'string'
            ? body.detail
            : `Lookup failed (${response.status}).`,
        )
        return
      }
      setNewSource((p) => ({
        ...p,
        title: body.title || p.title,
        author:
          Array.isArray(body.authors) && body.authors.length
            ? body.authors.join(', ')
            : p.author,
      }))
      setIsbnCoverPreviewUrl(
        typeof body.cover_url === 'string' ? body.cover_url : '',
      )
      setSourceFormMessage('Filled title and author from Open Library.')
    } finally {
      setSourceFormBusy(false)
    }
  }

  async function onBarcodeIsbnPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setSourceFormMessage('')
    if (!file) return
    if (!('BarcodeDetector' in window)) {
      const secure =
        typeof window !== 'undefined' && window.isSecureContext === true
      setSourceFormMessage(
        secure
          ? 'Barcode scan needs a Chromium-based browser (Chrome or Edge). Safari and many in-app browsers do not expose BarcodeDetector. You can type the ISBN and use Look up ISBN.'
          : 'Barcode scan only works on a secure page (HTTPS, or localhost). Open the app with https:// (not plain http:// to a LAN address), then try again—or enter the ISBN and use Look up ISBN.',
      )
      return
    }
    setSourceFormBusy(true)
    try {
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
      })
      const bmp = await createImageBitmap(file)
      const codes = await detector.detect(bmp)
      const raw = codes.find((c) => c.rawValue)?.rawValue
      const digits = raw
        ? String(raw)
            .replace(/[^0-9X]/gi, '')
            .replace(/x/g, 'X')
        : ''
      if (!digits || digits.length < 10) {
        setSourceFormMessage(
          'No usable barcode in that photo. Try more light and a straight-on shot.',
        )
        return
      }
      setIsbnCoverPreviewUrl('')
      setNewSource((p) => ({ ...p, isbn: digits }))
      setSourceFormMessage('ISBN read from photo. Use Look up ISBN to fetch title if needed.')
    } catch {
      setSourceFormMessage('Could not read a barcode from that image.')
    } finally {
      setSourceFormBusy(false)
    }
  }

  async function onAddSourceSubmit(event) {
    event.preventDefault()
    if (!newSource.title.trim()) {
      setSourceFormMessage('Title is required.')
      return
    }
    setSourceFormBusy(true)
    setSourceFormMessage('')
    try {
      const csrf = await fetchSessionCsrf()
      const response = await fetch(apiUrl('/api/v1/sources/'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf,
        },
        body: JSON.stringify({
          title: newSource.title.trim(),
          author: newSource.author.trim(),
          isbn: newSource.isbn.trim(),
          source_type: newSource.source_type,
          notes: newSource.notes.trim(),
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        let msg = typeof body.detail === 'string' ? body.detail : ''
        if (!msg && body && typeof body === 'object') {
          for (const v of Object.values(body)) {
            if (Array.isArray(v) && typeof v[0] === 'string') {
              msg = v[0]
              break
            }
          }
        }
        setSourceFormMessage(msg || `Could not save (${response.status}).`)
        return
      }
      setNewSource({ ...emptyNewSource })
      setIsbnCoverPreviewUrl('')
      setSourceFormMessage('Source saved.')
      await loadSources()
    } finally {
      setSourceFormBusy(false)
    }
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
        source: draftForm.source ?? null,
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
      setActiveView('home')
      setNavOpen(false)
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

  function onNavSelect(view) {
    setActiveView(view)
    setNavOpen(false)
    if (view !== 'sourceInspirations') {
      setSelectedSourceId(null)
    }
  }

  return (
    <main className="container app-shell">
      <div className="app-top-bar">
        <header className="session-bar session-bar--top">
          {authLoading ? (
            <p className="hint">Checking session…</p>
          ) : currentUser ? (
            <p className="session-info session-info--compact">
              Signed in as <strong>{currentUser.username}</strong>
            </p>
          ) : (
            <span className="session-bar-spacer" aria-hidden />
          )}
        </header>

        <button type="button" className="app-brand" onClick={goHome}>
          <h1 className="app-brand-title">Inspire Hub</h1>
        </button>

        <HamburgerNav
          open={navOpen}
          onOpen={() => setNavOpen(true)}
          onClose={() => setNavOpen(false)}
          activeView={activeView}
          onSelect={onNavSelect}
          currentUser={currentUser}
          authLoading={authLoading}
          authBusy={authBusy}
          onSignIn={() => {
            setShowLoginForm(true)
            setLoginError('')
          }}
          onLogout={onLogout}
        />
      </div>

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
            <div className="login-actions">
              <button type="submit" disabled={authBusy}>
                {authBusy ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={authBusy}
                onClick={() => {
                  setShowLoginForm(false)
                  setLoginError('')
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {activeView === 'addInspiration' && (
        <p className="subtitle">
          {`Add inspirations with OCR preview. Step ${step} of 2.`}
        </p>
      )}

      {activeView === 'home' && (
        <HomeView
          loading={loading}
          error={error}
          listAuthRequired={listAuthRequired}
          onSignInClick={() => setShowLoginForm(true)}
          inspirations={inspirations}
        />
      )}

      {activeView === 'addInspiration' && (
        <AddInspirationView
          currentUser={currentUser}
          step={step}
          step1Form={step1Form}
          onStep1Change={onStep1Change}
          sources={sources}
          sourcesLoading={sourcesLoading}
          screenshotFiles={screenshotFiles}
          cameraInputRef={cameraInputRef}
          onCameraCaptureChange={onCameraCaptureChange}
          onGalleryFilesChange={onGalleryFilesChange}
          onPreviewSubmit={onPreviewSubmit}
          submitting={submitting}
          draftForm={draftForm}
          onDraftFormChange={onDraftFormChange}
          draftScreenshots={draftScreenshots}
          onScreenshotTextChange={onScreenshotTextChange}
          onScreenshotKeepChange={onScreenshotKeepChange}
          onCommitSubmit={onCommitSubmit}
          goBackToStep1={goBackToStep1}
          formError={formError}
        />
      )}

      {activeView === 'sourcesGallery' && (
        <SourcesGalleryView
          sources={sources}
          sourcesLoading={sourcesLoading}
          sourcesError={sourcesError}
          onOpenSource={openSourceInspirations}
        />
      )}

      {activeView === 'sourceInspirations' && (
        <SourceInspirationsView
          source={sources.find((s) => s.id === selectedSourceId) ?? null}
          inspirations={sourceInspirations}
          loading={sourceInspirationsLoading}
          error={sourceInspirationsError}
          listAuthRequired={sourceInspirationsAuthRequired}
          onSignInClick={() => setShowLoginForm(true)}
          onBack={backFromSourceInspirations}
        />
      )}

      {activeView === 'addSource' && (
        <AddSourceView
          currentUser={currentUser}
          newSource={newSource}
          onNewSourceFieldChange={onNewSourceFieldChange}
          onAddSourceSubmit={onAddSourceSubmit}
          sourceFormBusy={sourceFormBusy}
          sourceFormMessage={sourceFormMessage}
          isbnCoverPreviewUrl={isbnCoverPreviewUrl}
          setIsbnCoverPreviewUrl={setIsbnCoverPreviewUrl}
          barcodeIsbnRef={barcodeIsbnRef}
          onBarcodeIsbnPhoto={onBarcodeIsbnPhoto}
          lookupIsbnForNewSource={lookupIsbnForNewSource}
        />
      )}
    </main>
  )
}

export default App
