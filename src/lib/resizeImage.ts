/**
 * Resizes an image file to fit within maxSize while preserving aspect ratio.
 * Uses high-quality settings (0.92 JPEG quality) and a larger max dimension (512px)
 * so the result looks sharp even on retina displays.
 */
export function resizeImageFile(
  file: File,
  maxSize = 1024,
  quality = 0.95,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Only downscale, never upscale
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round(height * (maxSize / width))
          width = maxSize
        } else {
          width = Math.round(width * (maxSize / height))
          height = maxSize
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL('image/webp', quality))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
