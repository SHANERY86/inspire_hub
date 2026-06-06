import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveMediaUrl } from '../lib/mediaUrl.js'
import {
  SPOTLIGHT_ARROW_POST_FADE_MS,
  SPOTLIGHT_FADE_MS,
  SPOTLIGHT_FONTS,
  SPOTLIGHT_ROTATE_MS,
} from '../lib/spotlightFonts.js'

/** Quote, OCR text, or summary — anything we can show in the rotating spotlight. */
function inspirationSpotlightPrimaryText(i) {
  return (
    (i.quote || '').trim() ||
    (i.essence || '').trim() ||
    (i.user_thoughts || '').trim()
  )
}

function inspirationHasSpotlightContent(i) {
  const shots = Array.isArray(i.screenshots) ? i.screenshots : []
  return Boolean(inspirationSpotlightPrimaryText(i)) || shots.length > 0
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

/** Fisher–Yates shuffle (new array) so guest spotlight rotation order is random, not API order. */
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

export function HomeView({
  loading,
  error,
  listAuthRequired,
  guestHome = false,
  onSignInClick,
  inspirations,
  words = [],
  recipes = [],
}) {
  const captures = useMemo(() => {
    const pool = inspirations.filter(
      (i) => i.is_inspiring && (!guestHome || i.is_public),
    )
    const eligible = pool.filter(inspirationHasSpotlightContent)

    const inspiringWords = words
      .filter((w) => w.is_inspiring && (!guestHome || w.is_public))
      .map((w) => ({
        _type: 'word',
        id: `word-${w.id}`,
        word: w.word,
        definition: w.definition,
        part_of_speech: w.part_of_speech,
        context_sentence: w.context_sentence,
        source_title: w.source_title || '',
        image_url: w.image_url || '',
      }))

    const inspiringRecipes = recipes
      .filter((r) => r.is_inspiring && (!guestHome || r.is_public))
      .map((r) => ({
        _type: 'recipe',
        id: `recipe-${r.id}`,
        title: r.title,
        ingredients: r.ingredients || '',
        image_url: r.image_url || '',
        url: r.url || '',
      }))

    const combined = [
      ...eligible.map((i) => ({ ...i, _type: 'inspiration' })),
      ...inspiringWords,
      ...inspiringRecipes,
    ]

    if (guestHome && combined.length > 1) return shuffleArray(combined)
    return combined
  }, [inspirations, words, recipes, guestHome])
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

  const flashArrowsBriefly = useCallback(() => {
    if (fadeInArrowsTimerRef.current != null) {
      window.clearTimeout(fadeInArrowsTimerRef.current)
      fadeInArrowsTimerRef.current = null
    }
    setFadeInArrows(true)
    fadeInArrowsTimerRef.current = window.setTimeout(() => {
      setFadeInArrows(false)
      fadeInArrowsTimerRef.current = null
    }, SPOTLIGHT_ARROW_POST_FADE_MS)
  }, [])

  useEffect(() => {
    if (fadeInArrowsTimerRef.current != null) {
      window.clearTimeout(fadeInArrowsTimerRef.current)
      fadeInArrowsTimerRef.current = null
    }
    if (prevVisibleRef.current === false && visible === true) {
      flashArrowsBriefly()
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
  }, [visible, flashArrowsBriefly])

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
      if (captures.length > 1) {
        flashArrowsBriefly()
      }
    } else {
      setDisplayIdx((d) =>
        Math.min(Math.max(0, d), Math.max(0, captures.length - 1)),
      )
    }
  }, [captureIds, captures.length, clearTimers, flashArrowsBriefly])

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
      <section className="view-panel home-view sheet-surface-card">
        <p className="hint">Loading inspirations…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="view-panel home-view sheet-surface-card">
        <p className="error">Error: {error}</p>
      </section>
    )
  }

  if (listAuthRequired) {
    return (
      <section className="view-panel home-view sheet-surface-card">
        <p className="hint">
          Log in to see inspirations from your library.{' '}
          <button type="button" className="secondary" onClick={onSignInClick}>
            Sign in
          </button>
        </p>
      </section>
    )
  }

  if (!inspirations.length && !words.length && !recipes.length) {
    return (
      <section className="view-panel home-view sheet-surface-card">
        <h2 className="home-view-title">Welcome</h2>
        {guestHome ? (
          <p className="hint">
            The public spotlight is empty for now. Creators can mark an inspiration as
            visible on this home page after they sign in.{' '}
            <button type="button" className="secondary" onClick={onSignInClick}>
              Sign in
            </button>{' '}
            for your full library.
          </p>
        ) : (
          <p className="hint">
            Nothing here yet. Add an inspiration, word, or recipe and mark it as inspiring to see it here.
          </p>
        )}
      </section>
    )
  }

  if (captures.length === 0) {
    return (
      <section className="view-panel home-view sheet-surface-card">
        <p className="hint">
          {guestHome
            ? 'No public items in the spotlight yet.'
            : 'Mark an inspiration, word, or recipe as inspiring to show it here.'}
        </p>
      </section>
    )
  }

  const safeIdx = Math.min(displayIdx, captures.length - 1)
  const active = captures[safeIdx]
  const isWord = active._type === 'word'
  const isRecipe = active._type === 'recipe'
  const shots = (isWord || isRecipe) ? [] : (Array.isArray(active.screenshots) ? active.screenshots : [])
  const showScreenshots = shots.length > 0
  const captured = (isWord || isRecipe) ? '' : inspirationSpotlightPrimaryText(active)
  const fontStack = SPOTLIGHT_FONTS[fontIdx % SPOTLIGHT_FONTS.length].stack

  const contributor = (guestHome && !isWord && !isRecipe) ? (active.added_by_username || '').trim() : ''
  const srcTitle = (isWord || isRecipe) ? '' : (active.source_display_title ?? '').trim()
  const workTitle = (isWord || isRecipe)
    ? (active.source_title || '').trim()
    : (srcTitle || (active.source_title || '').trim()).trim()
  const srcAuthor = (isWord || isRecipe) ? '' : (active.source_display_author ?? '').trim()

  const showAttribution = (isWord || isRecipe)
    ? Boolean(workTitle)
    : guestHome
      ? Boolean(contributor || workTitle || srcAuthor)
      : Boolean(workTitle || srcAuthor)

  const fadeStyle = {
    opacity: visible ? 1 : 0,
    transition: `opacity ${SPOTLIGHT_FADE_MS}ms ease`,
  }

  const multi = captures.length > 1
  const showArrows =
    multi && (fadeInArrows || hoverQuote || touchReveal)

  const spotlightBody = (
    <div className="home-spotlight-capture-wrap" style={fadeStyle}>
      {isWord && active.image_url ? (
        <div className="home-spotlight-word">
          <img src={active.image_url} alt={active.word} className="home-spotlight-word-image" />
          <p className="home-spotlight-word-term" style={{ fontFamily: fontStack }}>
            {active.word}
          </p>
          {active.part_of_speech && (
            <p className="home-spotlight-word-pos">{active.part_of_speech}</p>
          )}
          <blockquote className="home-spotlight-word-context">
            <p>{active.definition}</p>
          </blockquote>
        </div>
      ) : isRecipe ? (
        <div className="home-spotlight-recipe">
          <p className="home-spotlight-recipe-title" style={{ fontFamily: fontStack }}>
            {active.title}
          </p>
          {active.ingredients && (
            <ul className="home-spotlight-recipe-ingredients">
              {active.ingredients.split('\n').filter(Boolean).slice(0, 4).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      ) : isWord ? (
        <div className="home-spotlight-word">
          <p className="home-spotlight-word-term" style={{ fontFamily: fontStack }}>
            {active.word}
          </p>
          {active.part_of_speech && (
            <p className="home-spotlight-word-pos">{active.part_of_speech}</p>
          )}
          <blockquote className="home-spotlight-word-context">
            <p>{active.definition}</p>
          </blockquote>
          {active.context_sentence && (
            <p className="home-spotlight-word-context-sentence">{active.context_sentence}</p>
          )}
        </div>
      ) : showScreenshots ? (
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
      {showAttribution && (
        <p className="home-spotlight-attribution" lang="en">
          {guestHome && contributor ? (
            <>
              <span className="home-spotlight-attribution-by">{contributor}</span>
              {(workTitle || srcAuthor) ? (
                <span className="home-spotlight-attribution-sep" aria-hidden="true">
                  {' '}
                  ·{' '}
                </span>
              ) : null}
            </>
          ) : null}
          {workTitle ? (
            <span className="home-spotlight-attribution-title">{workTitle}</span>
          ) : null}
          {workTitle && srcAuthor ? (
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
