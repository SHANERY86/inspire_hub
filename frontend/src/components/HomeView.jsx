import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  SPOTLIGHT_FADE_MS,
  SPOTLIGHT_FONTS,
  SPOTLIGHT_ROTATE_MS,
} from '../lib/spotlightFonts.js'

function pickDifferentIndex(prev, len) {
  if (len <= 1) return 0
  let n = Math.floor(Math.random() * len)
  let guard = 0
  while (n === prev && guard < 28) {
    n = Math.floor(Math.random() * len)
    guard += 1
  }
  return n
}

export function HomeView({
  loading,
  error,
  listAuthRequired,
  onSignInClick,
  inspirations,
}) {
  const captures = useMemo(
    () => inspirations.filter((i) => (i.quote || '').trim()),
    [inspirations],
  )
  const captureIds = useMemo(() => captures.map((c) => c.id).join(','), [captures])

  const capturesRef = useRef(captures)
  capturesRef.current = captures

  const [displayIdx, setDisplayIdx] = useState(0)
  const [fontIdx, setFontIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  const randomInitRef = useRef(false)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)

  const clearTimers = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const applyRandomSwap = useCallback(() => {
    const list = capturesRef.current
    if (!list.length) return
    setDisplayIdx((prev) => pickDifferentIndex(prev, list.length))
    setFontIdx((prev) => pickDifferentIndex(prev, SPOTLIGHT_FONTS.length))
  }, [])

  const fadeThenSwap = useCallback(() => {
    setVisible(false)
    timeoutRef.current = window.setTimeout(() => {
      applyRandomSwap()
      setVisible(true)
      timeoutRef.current = null
    }, SPOTLIGHT_FADE_MS)
  }, [applyRandomSwap])

  const scheduleAutoRotate = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (capturesRef.current.length <= 1) return
    intervalRef.current = window.setInterval(fadeThenSwap, SPOTLIGHT_ROTATE_MS)
  }, [fadeThenSwap])

  const navigateBy = useCallback(
    (delta) => {
      const list = capturesRef.current
      if (list.length <= 1) return
      clearTimers()
      setVisible(false)
      timeoutRef.current = window.setTimeout(() => {
        setDisplayIdx((prev) => (prev + delta + list.length) % list.length)
        setVisible(true)
        timeoutRef.current = null
        scheduleAutoRotate()
      }, SPOTLIGHT_FADE_MS)
    },
    [clearTimers, scheduleAutoRotate],
  )

  useEffect(() => {
    if (captures.length === 0) {
      randomInitRef.current = false
      clearTimers()
      return
    }
    if (!randomInitRef.current) {
      randomInitRef.current = true
      setDisplayIdx(Math.floor(Math.random() * captures.length))
      setFontIdx(Math.floor(Math.random() * SPOTLIGHT_FONTS.length))
      setVisible(true)
    } else {
      setDisplayIdx((d) =>
        Math.min(Math.max(0, d), Math.max(0, captures.length - 1)),
      )
    }
  }, [captureIds, captures.length, clearTimers])

  useEffect(() => {
    if (captures.length <= 1) {
      clearTimers()
      return undefined
    }
    scheduleAutoRotate()
    return clearTimers
  }, [captureIds, captures.length, clearTimers, scheduleAutoRotate])

  if (loading) {
    return (
      <section className="card view-panel home-view">
        <p className="hint">Loading inspirations…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card view-panel home-view">
        <p className="error">Error: {error}</p>
      </section>
    )
  }

  if (listAuthRequired) {
    return (
      <section className="card view-panel home-view">
        <p className="hint">
          Log in to see inspirations from your library.{' '}
          <button type="button" className="secondary" onClick={onSignInClick}>
            Sign in
          </button>
        </p>
      </section>
    )
  }

  if (!inspirations.length) {
    return (
      <section className="card view-panel home-view">
        <h2 className="home-view-title">Welcome</h2>
        <p className="hint">
          No inspirations yet. Use the menu to add one or save a source.
        </p>
      </section>
    )
  }

  if (captures.length === 0) {
    return (
      <section className="card view-panel home-view">
        <p className="hint">
          None of your saved inspirations include captured text from a screenshot
          yet. When you save with OCR text kept, it can appear here.
        </p>
      </section>
    )
  }

  const safeIdx = Math.min(displayIdx, captures.length - 1)
  const active = captures[safeIdx]
  const captured = (active.quote || '').trim()
  const fontStack = SPOTLIGHT_FONTS[fontIdx % SPOTLIGHT_FONTS.length].stack

  const fadeStyle = {
    opacity: visible ? 1 : 0,
    transition: `opacity ${SPOTLIGHT_FADE_MS}ms ease`,
  }

  return (
    <section className="home-spotlight-hero" aria-label="Captured text">
      <div className="home-spotlight-carousel">
        {captures.length > 1 && (
          <button
            type="button"
            className="home-spotlight-arrow"
            aria-label="Previous inspiration"
            onClick={() => navigateBy(-1)}
          >
            ←
          </button>
        )}
        <div className="home-spotlight-capture-wrap" style={fadeStyle}>
          <p
            className="home-spotlight-capture"
            lang="en"
            style={{ fontFamily: fontStack }}
          >
            {captured}
          </p>
        </div>
        {captures.length > 1 && (
          <button
            type="button"
            className="home-spotlight-arrow"
            aria-label="Next inspiration"
            onClick={() => navigateBy(1)}
          >
            →
          </button>
        )}
      </div>
    </section>
  )
}
