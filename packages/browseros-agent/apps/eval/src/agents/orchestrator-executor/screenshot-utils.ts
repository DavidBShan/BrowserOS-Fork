import sharp from 'sharp'

const CLADO_IMAGE_MAX_BYTES = 2 * 1024 * 1024
const CLADO_IMAGE_WIDTH_STEPS = [1280, 1024, 896, 768, 640]

export async function optimizeScreenshotForRequest(
  base64Image: string,
): Promise<string> {
  const original = Buffer.from(base64Image, 'base64')
  if (original.byteLength <= CLADO_IMAGE_MAX_BYTES) {
    return base64Image
  }

  for (const width of CLADO_IMAGE_WIDTH_STEPS) {
    const resized = await sharp(original)
      .resize({ width, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, quality: 80 })
      .toBuffer()
    if (resized.byteLength <= CLADO_IMAGE_MAX_BYTES) {
      return resized.toString('base64')
    }
  }

  const smallest = await sharp(original)
    .resize({ width: 512, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 70 })
    .toBuffer()
  return smallest.toString('base64')
}

export async function compressScreenshotDataUrl(
  dataUrl: string | undefined,
  maxChars: number,
): Promise<string | undefined> {
  if (!dataUrl || dataUrl.length <= maxChars) return dataUrl

  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  if (!match) return dataUrl

  const original = Buffer.from(match[1], 'base64')
  let smallest: { mime: string; buffer: Buffer } | null = null

  const candidates = [
    { width: 512, quality: 55 },
    { width: 384, quality: 45 },
    { width: 256, quality: 35 },
    { width: 192, quality: 28 },
    { width: 128, quality: 22 },
    { width: 96, quality: 18 },
  ]

  for (const candidate of candidates) {
    const buffer = await sharp(original)
      .resize({ width: candidate.width, withoutEnlargement: true })
      .webp({ quality: candidate.quality })
      .toBuffer()
    const compressed = `data:image/webp;base64,${buffer.toString('base64')}`
    if (compressed.length <= maxChars) return compressed
    if (!smallest || buffer.byteLength < smallest.buffer.byteLength) {
      smallest = { mime: 'image/webp', buffer }
    }
  }

  if (!smallest) return dataUrl
  return `data:${smallest.mime};base64,${smallest.buffer.toString('base64')}`
}
