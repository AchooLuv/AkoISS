/**
 * 图片压缩：把待搜索图片压到 Vercel Serverless 的请求体上限以内。
 *
 * 背景：Vercel 的 Node 函数有 4.5MB 的请求体硬上限，超过会在进入函数前
 * 直接返回 413 FUNCTION_PAYLOAD_TOO_LARGE（本地开发没有这个限制）。
 * 而图源本身允许 8MB，所以必须在客户端先压。
 *
 * 策略：优先保持分辨率降到合适边长，再逐步降低 JPEG 质量；
 * 若目标格式不支持有损（如 PNG 需要保留透明），则退化为缩小尺寸。
 */

/** 留出 multipart 头部等开销的余量 */
export const UPLOAD_LIMIT = 4 * 1024 * 1024
/** 超过该边长就缩放，兼顾识别精度与体积 */
const MAX_EDGE = 1600
/** 逐步尝试的质量档位 */
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.62]

export interface CompressResult {
  file: File
  /** 是否真的压缩过 */
  compressed: boolean
  originalSize: number
  finalSize: number
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败，可能格式不受支持'))
    }
    img.src = url
  })

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片编码失败'))),
      type,
      quality
    )
  })

/** 按最长边等比缩放，返回目标尺寸 */
const fitSize = (width: number, height: number, maxEdge: number) => {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const ratio = maxEdge / longest
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

/**
 * 把图片压到 UPLOAD_LIMIT 以内。
 * 体积本来就够小时直接返回原文件，不做无谓的重编码（避免损失画质）。
 */
export const compressForUpload = async (file: File): Promise<CompressResult> => {
  if (file.size <= UPLOAD_LIMIT) {
    return { file, compressed: false, originalSize: file.size, finalSize: file.size }
  }

  const img = await loadImage(file)
  const hasAlpha = file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp'

  // 逐级尝试：先按质量档位压 JPEG，仍超限则继续缩小边长
  let edge = MAX_EDGE
  for (let round = 0; round < 6; round++) {
    const { width, height } = fitSize(img.naturalWidth, img.naturalHeight, edge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('当前浏览器不支持 Canvas，无法压缩图片')
    // 透明图铺白底，避免 JPEG 出现黑块
    if (file.type !== 'image/png') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(img, 0, 0, width, height)

    // PNG 无有损质量参数，先试原格式（保留透明），失败再退 JPEG
    if (hasAlpha) {
      const png = await canvasToBlob(canvas, 'image/png')
      if (png.size <= UPLOAD_LIMIT) {
        return {
          file: new File([png], renameTo(file.name, 'png'), { type: 'image/png' }),
          compressed: true,
          originalSize: file.size,
          finalSize: png.size,
        }
      }
    }

    for (const quality of QUALITY_STEPS) {
      const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality)
      if (jpeg.size <= UPLOAD_LIMIT) {
        return {
          file: new File([jpeg], renameTo(file.name, 'jpg'), { type: 'image/jpeg' }),
          compressed: true,
          originalSize: file.size,
          finalSize: jpeg.size,
        }
      }
    }

    // 本档位都压不下去，继续缩小边长
    edge = Math.round(edge * 0.8)
  }

  throw new Error('图片过大且无法压缩到 4MB 以内，请先手动裁剪或压缩后重试')
}

const renameTo = (name: string, ext: string): string => {
  const base = name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}.${ext}`
}
