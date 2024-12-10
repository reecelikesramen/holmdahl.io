export type PreviewQuality = 'low' | 'sd' | 'hd' | '1k'
export type RenderQuality = 'sd' | 'hd' | '1k' | '4k' | '8k'
export type AspectRatio = '1:1' | '3:2' | '4:3' | '16:9' | '21:9' | '2:3' | '3:4' | '9:16' | '9:21'

export interface Dimensions {
  width: number
  height: number
}

export function calculateDimensions(quality: PreviewQuality | RenderQuality, aspectRatio: AspectRatio): Dimensions {
  // Base resolutions for 16:9
  const baseResolutions = {
    low: { width: 133, height: 75 },    // ~10K pixels
    sd: { width: 1280, height: 720 },   // ~1M pixels
    hd: { width: 1920, height: 1080 },  // ~2M pixels
    '1k': { width: 2560, height: 1440 }, // ~4M pixels
    '4k': { width: 3840, height: 2160 },
    '8k': { width: 7680, height: 4320 }
  }

  const base = baseResolutions[quality]
  const basePixels = base.width * base.height

  // Parse aspect ratio
  const [w, h] = aspectRatio.split(':').map(Number)
  const ratio = w / h

  // Calculate new dimensions maintaining pixel count
  const newHeight = Math.round(Math.sqrt(basePixels / ratio))
  const newWidth = Math.round(newHeight * ratio)

  return {
    width: newWidth,
    height: newHeight
  }
}
