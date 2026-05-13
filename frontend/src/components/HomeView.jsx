import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveMediaUrl } from '../lib/mediaUrl.js'
import {
  SPOTLIGHT_ARROW_POST_FADE_MS,
  SPOTLIGHT_FADE_MS,
  SPOTLIGHT_FONTS,
  SPOTLIGHT_ROTATE_MS,
} from '../lib/spotlightFonts.js'

function inspirationHasSpotlightContent(i) {
  const quote = (i.quote || '').trim()
  const shots = Array.isArray(i.screenshots) ? i.screenshots : []
  return Boolean(quote) || shots.length > 0
}

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
    () => inspirations.filter(inspirationHasSpotlightContent),
    [inspirations],
  )
  const captureIds = useMemo(() => captures.map((c) => c.id).join(','), [captures])

  const capturesRef = useRef(captures)
  capturesRef.current = captures

  const [displayIdx, setDisplayIdx] = useState(0)
  const [fontIdx, setFontIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [fadeInArrows, setFadeInArrows] = useState(false)
  const [hoverQuote, setHoverQuote] = useState(false)
  const [touchReveal, setTouchReveal] = useState(false)
  const [touchUi, setTouchUi] = useState(false)

  const randomInitRef = useRef(false)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const prevVisibleRef = useRef(true)
  const fadeInArrowsTimerRef = useRef(null)
  const touchHideTimerRef = useRef(null)

  useEffect(() => {
    const mql = window.matchMedia('(hover: none), (pointer: coarse)')
    const sync = () => setTouchUi(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (fadeInArrowsTimerRef.current != null) {
      window.clearTimeout(fadeInArrowsTimerRef.current)
      fadeInArrowsTimerRef.current = null
    }
    if (prevVisibleRef.current === false && visible === true) {
      setFadeInArrows(true)
      fadeInArrowsTimerRef.current = window.setTimeout(() => {
        setFadeInArrows(false)
        fadeInArrowsTimerRef.current = null
      }, SPOTLIGHT_ARROW_POST_FADE_MS)
    }
    if (!visible) {
      setFadeInArrows(false)
    }
    prevVisibleRef.current = visible
    return () => {
      if (fadeInArrowsTimerRef.current != null) {
        window.clearTimeout(fadeInArrowsTimerRef.current)
        fadeInArrowsTimerRef.current = null
      }
    }
  }, [visible])

  const clearTouchHideTimer = useCallback(() => {
    if (touchHideTimerRef.current != null) {
      window.clearTimeout(touchHideTimerRef.current)
      touchHideTimerRef.current = null
    }
  }, [])

  const scheduleTouchHide = useCallback(() => {
    clearTouchHideTimer()
    touchHideTimerRef.current = window.setTimeout(() => {
      setTouchReveal(false)
      touchHideTimerRef.current = null
    }, 4200)
  }, [clearTouchHideTimer])

  useEffect(() => {
    setTouchReveal(false)
    clearTouchHideTimer()
  }, [captureIds, clearTouchHideTimer])

  useEffect(
    () => () => {
      clearTouchHideTimer()
      if (fadeInArrowsTimerRef.current != null) {
        window.clearTimeout(fadeInArrowsTimerRef.current)
        fadeInArrowsTimerRef.current = null
      }
    },
    [clearTouchHideTimer],
  )

  const onQuotePointerDown = useCallback(() => {
    if (!touchUi) return
    clearTouchHideTimer()
    setTouchReveal(true)
  }, [clearTouchHideTimer, touchUi])

  const onQuotePointerUp = useCallback(() => {
    if (!touchUi) return
    scheduleTouchHide()
  }, [scheduleTouchHide, touchUi])

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
          None of your saved inspirations have captured text or a saved panel image yet.
          OCR text or “Save image only” uploads can appear here.
        </p>
      </section>
    )
  }

  const safeIdx = Math.min(displayIdx, captures.length - 1)
  const active = captures[safeIdx]
  const shots = Array.isArray(active.screenshots) ? active.screenshots : []
  const showScreenshots = shots.length > 0
  const captured = (active.quote || '').trim()
  const fontStack = SPOTLIGHT_FONTS[fontIdx % SPOTLIGHT_FONTS.length].stack

  const srcTitle = (active.source_display_title ?? '').trim()
  const srcAuthor = (active.source_display_author ?? '').trim()

  const fadeStyle = {
    opacity: visible ? 1 : 0,
    transition: `opacity ${SPOTLIGHT_FADE_MS}ms ease`,
  }

  const multi = captures.length > 1
  const showArrows =
    multi && (fadeInArrows || hoverQuote || touchReveal)

  const spotlightBody = (
    <div className="home-spotlight-capture-wrap" style={fadeStyle}>
      {showScreenshots ? (
        <div className="home-spotlight-shots">
          {shots.map((shot) => {
            const src = resolveMediaUrl(shot.image)
            return src ? (
              <img
                key={shot.id}
                src={src}
                alt=""
                className="home-spotlight-shot"
              />
            ) : null
          })}
        </div>
      ) : (
        <p
          className="home-spotlight-capture"
          lang="en"
          style={{ fontFamily: fontStack }}
        >
          {captured}
        </p>
      )}
      {(srcTitle || srcAuthor) && (
        <p className="home-spotlight-attribution" lang="en">
          {srcTitle ? (
            <span className="home-spotlight-attribution-title">{srcTitle}</span>
          ) : null}
          {srcTitle && srcAuthor ? (
            <span className="home-spotlight-attribution-sep" aria-hidden="true">
              {' '}
              ·{' '}
            </span>
          ) : null}
          {srcAuthor ? (
            <span className="home-spotlight-attribution-author">{srcAuthor}</span>
          ) : null}
        </p>
      )}
    </div>
  )

  return (
    <section className="home-spotlight-hero" aria-label="Spotlight inspiration">
      <div
        className={
          multi ? 'home-spotlight-carousel home-spotlight-carousel--multi' : 'home-spotlight-carousel'
        }
      >
        {multi ? (
          <div
            className={
              showArrows
                ? 'home-spotlight-quote-zone home-spotlight-quote-zone--arrows-on'
                : 'home-spotlight-quote-zone'
            }
            onMouseEnter={() => setHoverQuote(true)}
            onMouseLeave={() => setHoverQuote(false)}
            onPointerDown={onQuotePointerDown}
            onPointerUp={onQuotePointerUp}
            onPointerCancel={onQuotePointerUp}
          >
            <button
              type="button"
              className="home-spotlight-arrow home-spotlight-arrow--prev"
              aria-label="Previous inspiration"
              tabIndex={0}
              onClick={() => navigateBy(-1)}
            >
              ←
            </button>
            {spotlightBody}
            <button
              type="button"
              className="home-spotlight-arrow home-spotlight-arrow--next"
              aria-label="Next inspiration"
              tabIndex={0}
              onClick={() => navigateBy(1)}
            >
              →
            </button>
          </div>
        ) : (
          spotlightBody
        )}
      </div>
    </section>
  )
}
