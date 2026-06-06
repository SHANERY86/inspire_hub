import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { AddInspirationView } from './components/AddInspirationView.jsx'
import { AddSourceView } from './components/AddSourceView.jsx'
import { AddWordView } from './components/AddWordView.jsx'
import { HamburgerNav } from './components/HamburgerNav.jsx'
import { HomeView } from './components/HomeView.jsx'
import { MyInspirationsView } from './components/MyInspirationsView.jsx'
import { RequestAccountView } from './components/RequestAccountView.jsx'
import { ScreenshotCropModal } from './components/ScreenshotCropModal.jsx'
import { SourcesGalleryView } from './components/SourcesGalleryView.jsx'
import { WordLibraryView } from './components/WordLibraryView.jsx'
import {
  initialAppViewFromLocation,
  spaPathKey,
  syncBrowserPathToAppView,
} from './lib/spaPath.js'

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
  tags: '',
  source: null,
  is_comic_panel: false,
  is_inspiring: false,
  is_public: false,
}

const emptyNewSource = {
  title: '',
  author: '',
  isbn: '',
  source_type: 'book',
  notes: '',
}

/** @typedef {'home' | 'myInspirations' | 'addInspiration' | 'sourcesGallery' | 'addSource' | 'wordLibrary' | 'addWord' | 'requestAccount'} AppView */

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const [activeView, setActiveView] = useState(
    /** @type {AppView} */ (() => initialAppViewFromLocation()),
  )
  const [navOpen, setNavOpen] = useState(false)

  const [inspirations, setInspirations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [listAuthRequired, setListAuthRequired] = useState(false)
  const [formError, setFormError] = useState('')
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [step1Form, setStep1Form] = useState(emptyStep1)
  const [screenshotFiles, setScreenshotFiles] = useState([])
  const [draftForm, setDraftForm] = useState(null)
  const [draftScreenshots, setDraftScreenshots] = useState([])
  const cameraInputRef = useRef(null)
  const barcodeIsbnRef = useRef(null)
  const saveSuccessRef = useRef(/** @type {HTMLParagraphElement | null} */ (null))

  const [sources, setSources] = useState([])
  const [sourcesLoading, setSourcesLoading] = useState(false)
  const [sourcesError, setSourcesError] = useState('')
  const [newSource, setNewSource] = useState(emptyNewSource)
  const [sourceFormBusy, setSourceFormBusy] = useState(false)
  const [sourceFormMessage, setSourceFormMessage] = useState('')
  const [isbnCoverPreviewUrl, setIsbnCoverPreviewUrl] = useState('')

  const [screenshotCropQueue, setScreenshotCropQueue] = useState(
    /** @type {File[]} */ ([]),
  )
  const [screenshotCropReplaceList, setScreenshotCropReplaceList] = useState(false)
  const [screenshotCropReplaceAccum, setScreenshotCropReplaceAccum] = useState(
    /** @type {File[]} */ ([]),
  )

  const [selectedSourceId, setSelectedSourceId] = useState(
    /** @type {number | null} */ (null),
  )

  const [words, setWords] = useState([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordsError, setWordsError] = useState('')
  const [wordFormBusy, setWordFormBusy] = useState(false)
  const [wordFormMessage, setWordFormMessage] = useState('')

  const loadInspirations = useCallback(async () => {
    try {
      setLoading(true)
      setListAuthRequired(false)
      const all = []
      let page = 1
      const maxPages = 200
      while (page <= maxPages) {
        const qs = new URLSearchParams({ page: String(page) })
        const response = await fetch(
          apiUrl(`/api/v1/inspirations/?${qs.toString()}`),
          {
            credentials: 'include',
          },
        )
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
        const batch = data.results ?? []
        all.push(...batch)
        if (!data.next || batch.length === 0) {
          break
        }
        page += 1
      }
      setInspirations(all)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const patchInspiration = useCallback(
    async (id, body) => {
      const csrf = await fetchSessionCsrf()
      const response = await fetch(apiUrl(`/api/v1/inspirations/${id}/`), {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf,
        },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Sign in again to save changes.')
        }
        const errBody = await response.json().catch(() => ({}))
        let msg =
          typeof errBody.detail === 'string'
            ? errBody.detail
            : `Update failed (${response.status}).`
        const firstField = Object.values(errBody).find((v) => Array.isArray(v))
        if (firstField?.[0]) msg = String(firstField[0])
        throw new Error(msg)
      }
      await loadInspirations()
    },
    [loadInspirations],
  )

  const deleteInspirationById = useCallback(
    async (id) => {
      const csrf = await fetchSessionCsrf()
      const response = await fetch(apiUrl(`/api/v1/inspirations/${id}/`), {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrf,
        },
      })
      if (response.status === 204) {
        await loadInspirations()
        return
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error('Sign in again to delete.')
      }
      const errBody = await response.json().catch(() => ({}))
      const msg =
        typeof errBody.detail === 'string'
          ? errBody.detail
          : `Delete failed (${response.status}).`
      throw new Error(msg)
    },
    [loadInspirations],
  )

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

  const loadWords = useCallback(async () => {
    setWordsLoading(true)
    setWordsError('')
    try {
      const all = []
      let page = 1
      const maxPages = 200
      while (page <= maxPages) {
        const qs = new URLSearchParams({ page: String(page) })
        const response = await fetch(
          apiUrl(`/api/v1/words/?${qs.toString()}`),
          { credentials: 'include' },
        )
        if (response.status === 401 || response.status === 403) {
          setWords([])
          return
        }
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }
        const data = await response.json()
        const batch = data.results ?? []
        all.push(...batch)
        if (!data.next || batch.length === 0) {
          break
        }
        page += 1
      }
      setWords(all)
    } catch (err) {
      setWordsError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setWordsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      void loadSources()
    } else {
      setSources([])
      setSourcesError('')
    }
    void loadWords()
  }, [currentUser, loadSources, loadWords])

  useEffect(() => {
    if (
      screenshotCropReplaceList &&
      screenshotCropQueue.length === 0 &&
      screenshotCropReplaceAccum.length > 0
    ) {
      setScreenshotFiles(screenshotCropReplaceAccum)
      setScreenshotCropReplaceAccum([])
      setScreenshotCropReplaceList(false)
    }
  }, [
    screenshotCropReplaceList,
    screenshotCropQueue.length,
    screenshotCropReplaceAccum,
  ])

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

  const submitSignupRequest = useCallback(async (payload) => {
    const csrf = await fetchSessionCsrf()
    const response = await fetch(apiUrl('/api/v1/auth/signup-request/'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrf,
      },
      body: JSON.stringify(payload),
    })
    let data = {}
    try {
      data = await response.json()
    } catch {
      data = {}
    }
    if (!response.ok) {
      const msg =
        typeof data.detail === 'string'
          ? data.detail
          : `Request failed (${response.status}).`
      throw new Error(msg)
    }
  }, [])

  useEffect(() => {
    if (currentUser && activeView === 'requestAccount') {
      setActiveView('home')
    }
  }, [currentUser, activeView])

  useEffect(() => {
    syncBrowserPathToAppView(activeView)
  }, [activeView])

  useEffect(() => {
    function onPopState() {
      const key = spaPathKey(window.location.pathname)
      if (key === 'request-account') {
        setActiveView('requestAccount')
      } else {
        setActiveView((prev) => (prev === 'requestAccount' ? 'home' : prev))
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    document.title =
      activeView === 'requestAccount' && !currentUser
        ? 'Request an account · Inspire Hub'
        : 'Inspire Hub'
  }, [activeView, currentUser])

  useEffect(() => {
    if (
      (activeView !== 'addInspiration' || step !== 1) &&
      activeView !== 'addWord'
    ) {
      return
    }
    if (!saveSuccessMessage) {
      return
    }
    const id = requestAnimationFrame(() => {
      saveSuccessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [activeView, step, saveSuccessMessage])

  function goHome() {
    setActiveView('home')
    setNavOpen(false)
    setSelectedSourceId(null)
  }

  function openMyInspirationsForSource(sourceId) {
    setSelectedSourceId(sourceId)
    setActiveView('myInspirations')
    setNavOpen(false)
  }

  function onStep1Change(event) {
    const { name, value, type, checked } = event.target
    if (type === 'checkbox' && name === 'is_comic_panel') {
      setStep1Form((prev) => ({ ...prev, is_comic_panel: checked }))
      return
    }
    if (type === 'checkbox' && name === 'is_inspiring') {
      setStep1Form((prev) => ({
        ...prev,
        is_inspiring: checked,
        is_public: checked ? prev.is_public : false,
      }))
      return
    }
    if (type === 'checkbox' && name === 'is_public') {
      setStep1Form((prev) => ({ ...prev, is_public: checked }))
      return
    }
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

  const handleScreenshotCropCancel = useCallback(() => {
    setScreenshotCropQueue([])
    setScreenshotCropReplaceList(false)
    setScreenshotCropReplaceAccum([])
  }, [])

  const handleScreenshotCropComplete = useCallback(
    (file) => {
      if (screenshotCropReplaceList) {
        setScreenshotCropReplaceAccum((a) => [...a, file])
      } else {
        setScreenshotFiles((prev) => [...prev, file])
      }
      setScreenshotCropQueue((q) => q.slice(1))
    },
    [screenshotCropReplaceList],
  )

  function onGalleryFilesChange(event) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    setScreenshotCropQueue((q) => [...q, ...files])
  }

  function onRemoveScreenshotFile(index) {
    setScreenshotFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function onCameraCaptureChange(event) {
    const added = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!added.length) return
    setScreenshotCropQueue((q) => [...q, ...added])
  }

  async function onPreviewSubmit(event) {
    event.preventDefault()
    setFormError('')
    setSaveSuccessMessage('')

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
      fd.append('tags', step1Form.tags)
      if (step1Form.source != null) {
        fd.append('source', String(step1Form.source))
      }
      fd.append('comic_panel', step1Form.is_comic_panel ? '1' : '0')
      if (currentUser) {
        fd.append('is_inspiring', step1Form.is_inspiring ? '1' : '0')
        fd.append('is_public', step1Form.is_public ? '1' : '0')
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
      const formData = data.form_data ?? {}
      const inspiring = Boolean(formData.is_inspiring ?? step1Form.is_inspiring)
      setDraftForm({
        ...formData,
        is_comic_panel: Boolean(formData.is_comic_panel),
        tags: formData.tags ?? step1Form.tags ?? '',
        is_inspiring: inspiring,
        is_public: inspiring && Boolean(formData.is_public ?? step1Form.is_public),
      })
      const shots = data.screenshots ?? []
      if (
        shots.length > 1 &&
        !Boolean(formData.is_comic_panel)
      ) {
        const combined = shots
          .map((s) => (s.extracted_text ?? '').trim())
          .filter(Boolean)
          .join('\n')
        setDraftScreenshots([
          { ...shots[0], extracted_text: combined },
        ])
      } else {
        setDraftScreenshots(shots)
      }
      setStep(2)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Preview request failed')
    } finally {
      setSubmitting(false)
    }
  }

  function onDraftFormChange(event) {
    const { name, value, type, checked } = event.target
    if (type === 'checkbox' && name === 'is_inspiring') {
      setDraftForm((prev) =>
        prev
          ? { ...prev, is_inspiring: checked, is_public: checked ? prev.is_public : false }
          : prev,
      )
      return
    }
    if (type === 'checkbox' && name === 'is_public') {
      setDraftForm((prev) => (prev ? { ...prev, is_public: checked } : prev))
      return
    }
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

  function step1PreservingSourceFields(from) {
    if (!from) return { ...emptyStep1 }
    return {
      ...emptyStep1,
      source_title: from.source_title ?? '',
      source_type: from.source_type ?? 'book',
      reference: from.reference ?? '',
      source: from.source ?? null,
      tags: from.tags ?? '',
      is_inspiring: Boolean(from.is_inspiring),
      is_public: Boolean(from.is_public),
    }
  }

  function goBackToStep1() {
    setStep(1)
    setStep1Form((prev) =>
      draftForm != null
        ? { ...prev, is_inspiring: Boolean(draftForm.is_inspiring), is_public: Boolean(draftForm.is_public) }
        : prev,
    )
    setDraftForm(null)
    setDraftScreenshots([])
    setFormError('')
    setSaveSuccessMessage('')
    handleScreenshotCropCancel()
  }

  function returnToStep1AfterSave(draft) {
    setStep(1)
    setStep1Form(step1PreservingSourceFields(draft))
    setDraftForm(null)
    setDraftScreenshots([])
    setScreenshotFiles([])
    setFormError('')
    setSaveSuccessMessage('Inspiration saved successfully!')
    handleScreenshotCropCancel()
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

  const lookupWord = useCallback(async (word) => {
    const params = new URLSearchParams({ word })
    const response = await fetch(
      apiUrl(`/api/v1/words/dictionary-lookup/?${params.toString()}`),
      { credentials: 'include' },
    )
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(
        typeof body.detail === 'string'
          ? body.detail
          : `Lookup failed (${response.status}).`,
      )
    }
    return body
  }, [])

  const saveWord = useCallback(
    async (payload) => {
      setWordFormBusy(true)
      setWordFormMessage('')
      try {
        const csrf = await fetchSessionCsrf()
        const response = await fetch(apiUrl('/api/v1/words/'), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf,
          },
          body: JSON.stringify(payload),
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
          throw new Error(msg || `Could not save (${response.status}).`)
        }
        setSaveSuccessMessage('Word successfully saved!')
        await loadWords()
      } finally {
        setWordFormBusy(false)
      }
    },
    [loadWords],
  )

  const patchWord = useCallback(
    async (id, body) => {
      const csrf = await fetchSessionCsrf()
      const response = await fetch(apiUrl(`/api/v1/words/${id}/`), {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf,
        },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Sign in again to save changes.')
        }
        const errBody = await response.json().catch(() => ({}))
        let msg =
          typeof errBody.detail === 'string'
            ? errBody.detail
            : `Update failed (${response.status}).`
        const firstField = Object.values(errBody).find((v) => Array.isArray(v))
        if (firstField?.[0]) msg = String(firstField[0])
        throw new Error(msg)
      }
      await loadWords()
    },
    [loadWords],
  )

  const deleteWord = useCallback(
    async (id) => {
      const csrf = await fetchSessionCsrf()
      const response = await fetch(apiUrl(`/api/v1/words/${id}/`), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRFToken': csrf },
      })
      if (response.status === 204) {
        await loadWords()
        return
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error('Sign in again to delete.')
      }
      const errBody = await response.json().catch(() => ({}))
      throw new Error(
        typeof errBody.detail === 'string'
          ? errBody.detail
          : `Delete failed (${response.status}).`,
      )
    },
    [loadWords],
  )

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
        tags: draftForm.tags ?? '',
        source: draftForm.source ?? null,
        is_comic_panel: Boolean(draftForm.is_comic_panel),
        is_inspiring: Boolean(draftForm.is_inspiring),
        is_public: Boolean(draftForm.is_public),
        screenshots: draftScreenshots.map((s) => ({
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
        let errMsg = typeof body.detail === 'string' ? body.detail : ''
        if (!errMsg && body && typeof body === 'object') {
          const firstField = Object.values(body).find((v) => Array.isArray(v))
          if (firstField?.[0]) errMsg = String(firstField[0])
        }
        throw new Error(errMsg || `Save failed (${response.status}).`)
      }

      const created = await response.json()
      setInspirations((prev) => [created, ...prev])
      returnToStep1AfterSave(draftForm)
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
    if (view === 'requestAccount') {
      setShowLoginForm(false)
      setLoginError('')
    }
    if (view !== 'addInspiration' && view !== 'addWord') {
      setSaveSuccessMessage('')
    }
    setSelectedSourceId(null)
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

        <div className="app-brand-block">
          <button type="button" className="app-brand" onClick={goHome}>
            <h1 className="app-brand-title">Inspire Hub</h1>
          </button>
        </div>

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

      {!authLoading && !currentUser && activeView !== 'requestAccount' ? (
        <div className="app-guest-intro">
          <p>
            Save inspiring things you read by snapshotting a page and use AI Driven OCR to convert
            the image to text
          </p>
          <p>
            Keep a log of special things that inspire you or build a base for your own creative
            endeavours. 
          </p>
          <p>
            An inspiring turn of phrase.. a beautiful comic panel.. These things will no longer disappear into the ether,
            they are memorialized here.
          </p>
          <p>
            If you would like to request a login{' '}
            <button
              type="button"
              className="app-guest-intro-link"
              onClick={() => setActiveView('requestAccount')}
            >
              click here!
            </button>
          </p>
        </div>
      ) : null}

      {!authLoading && !currentUser && showLoginForm && (
        <section className="login-card sheet-surface-card">
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

      {(activeView === 'addInspiration' || activeView === 'addWord') && saveSuccessMessage ? (
        <p ref={saveSuccessRef} className="subtitle" role="status">
          {saveSuccessMessage}
        </p>
      ) : null}

      {activeView === 'home' && (
        <HomeView
          loading={loading}
          error={error}
          listAuthRequired={listAuthRequired}
          guestHome={!authLoading && !currentUser}
          onSignInClick={() => setShowLoginForm(true)}
          inspirations={inspirations}
          words={words}
        />
      )}

      {activeView === 'requestAccount' && !currentUser && (
        <div className="request-account-page">
          <RequestAccountView
            isPageLayout
            onSubmitRequest={submitSignupRequest}
            onCancel={() => setActiveView('home')}
          />
        </div>
      )}

      {activeView === 'myInspirations' && (
        <MyInspirationsView
          loading={loading}
          error={error}
          listAuthRequired={listAuthRequired}
          onSignInClick={() => setShowLoginForm(true)}
          inspirations={inspirations}
          currentUser={currentUser}
          sources={sources}
          sourcesLoading={sourcesLoading}
          onPatchInspiration={patchInspiration}
          onDeleteInspiration={deleteInspirationById}
          initialSourceFilterId={selectedSourceId}
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
          onRemoveScreenshotFile={onRemoveScreenshotFile}
          onPreviewSubmit={onPreviewSubmit}
          submitting={submitting}
          draftForm={draftForm}
          onDraftFormChange={onDraftFormChange}
          draftScreenshots={draftScreenshots}
          onScreenshotTextChange={onScreenshotTextChange}
          onCommitSubmit={onCommitSubmit}
          goBackToStep1={goBackToStep1}
          formError={formError}
        />
      )}

      {activeView === 'addInspiration' &&
        step === 1 &&
        screenshotCropQueue.length > 0 && (
          <ScreenshotCropModal
            key={`${screenshotCropQueue[0].name}-${screenshotCropQueue[0].lastModified}`}
            file={screenshotCropQueue[0]}
            onCancel={handleScreenshotCropCancel}
            onComplete={handleScreenshotCropComplete}
          />
        )}

      {activeView === 'sourcesGallery' && (
        <SourcesGalleryView
          sources={sources}
          sourcesLoading={sourcesLoading}
          sourcesError={sourcesError}
          onOpenSource={openMyInspirationsForSource}
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

      {activeView === 'wordLibrary' && (
        <WordLibraryView
          words={words}
          wordsLoading={wordsLoading}
          wordsError={wordsError}
          currentUser={currentUser}
          sources={sources}
          onPatchWord={patchWord}
          onDeleteWord={deleteWord}
          onSignInClick={() => setShowLoginForm(true)}
        />
      )}

      {activeView === 'addWord' && (
        <AddWordView
          currentUser={currentUser}
          sources={sources}
          onLookupWord={lookupWord}
          onSaveWord={saveWord}
          wordFormBusy={wordFormBusy}
          wordFormMessage={wordFormMessage}
        />
      )}
    </main>
  )
}

export default App
