export function imageDataUrl(base64, filename) {
  const lower = (filename || '').toLowerCase()
  const mime = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg'
  return `data:${mime};base64,${base64}`
}
