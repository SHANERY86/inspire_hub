/**
 * @param {string} url Object URL or image src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (e) => reject(e))
    img.src = url
  })
}

/**
 * Crop image pixels from a source image (react-easy-crop `croppedAreaPixels`).
 * @param {string} imageSrc
 * @param {{ x: number; y: number; width: number; height: number }} pixelCrop
 * @param {string} [outputType='image/jpeg']
 * @param {number} [quality=0.92]
 * @returns {Promise<Blob>}
 */
export async function getCroppedImageBlob(
  imageSrc,
  pixelCrop,
  outputType = 'image/jpeg',
  quality = 0.92,
) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  const w = Math.max(1, Math.round(pixelCrop.width))
  const h = Math.max(1, Math.round(pixelCrop.height))
  canvas.width = w
  canvas.height = h

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    w,
    h,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Crop produced an empty image'))
        else resolve(blob)
      },
      outputType,
      quality,
    )
  })
}
