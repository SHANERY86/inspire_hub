/**
 * Fonts loaded in index.html for the home spotlight rotation.
 * Each `stack` is a full CSS font-family value.
 */
export const SPOTLIGHT_FONTS = [
  { id: 'cormorant', stack: "'Cormorant Garamond', Georgia, serif" },
  { id: 'spectral', stack: "'Spectral', Georgia, serif" },
  { id: 'libre', stack: "'Libre Baskerville', Georgia, serif" },
  { id: 'lora', stack: "'Lora', Georgia, serif" },
  { id: 'ebgaramond', stack: "'EB Garamond', Georgia, serif" },
  { id: 'playfair', stack: "'Playfair Display', Georgia, serif" },
  { id: 'instrument', stack: "'Instrument Serif', Georgia, serif" },
  { id: 'newsreader', stack: "'Newsreader', Georgia, serif" },
]

export const SPOTLIGHT_ROTATE_MS = 20_000
export const SPOTLIGHT_FADE_MS = 1400
/** How long prev/next arrows stay visible after a quote finishes fading in. */
export const SPOTLIGHT_ARROW_POST_FADE_MS = 5_000
