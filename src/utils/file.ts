/** 文件相关的纯函数工具 */

const MAX_FILE_SIZE = 8 * 1024 * 1024 // IQDB 限制 8MiB（表单 MAX_FILE_SIZE）
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const isImageFile = (file: File): boolean =>
  file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name)

/** 校验上传文件，返回错误文案（通过则为 null） */
export const validateFile = (file: File): string | null => {
  if (!isImageFile(file)) return '仅支持 JPG / PNG / GIF / WebP 格式的图片'
  if (file.size > MAX_FILE_SIZE) return `图片体积 ${formatBytes(file.size)} 超出 8 MB 上限`
  return null
}

/** 从 URL 中猜测文件名 */
const nameFromUrl = (url: string, type: string): string => {
  try {
    const { pathname } = new URL(url)
    const name = pathname.split('/').filter(Boolean).pop()
    if (name && /\.[a-z0-9]{2,5}$/i.test(name)) return name
  } catch {
    /* 忽略非法 URL */
  }
  return `remote-image.${EXT_MAP[type] ?? 'png'}`
}

/**
 * 把远程图片地址下载成 File。
 * 拖入链接与"以图搜图"URL 模式都走这里，保证下游引擎只需处理文件。
 */
export const fileFromUrl = async (url: string): Promise<File> => {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`图片下载失败（HTTP ${res.status}）`)
  const blob = await res.blob()
  const type = blob.type || 'image/png'
  if (!type.startsWith('image/')) throw new Error('该地址返回的不是图片')
  return new File([blob], nameFromUrl(url, type), { type })
}

/** 从粘贴板事件中取出图片文件 */
export const fileFromClipboard = (event: ClipboardEvent): File | null => {
  const items = event.clipboardData?.items
  if (!items) return null
  for (const item of Array.from(items)) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) {
      const ext = EXT_MAP[file.type] ?? 'png'
      return new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type })
    }
  }
  return null
}

/** 从 DataTransfer（拖拽）中取出图片文件或图片地址 */
export const fileFromDataTransfer = (dt: DataTransfer): File | string | null => {
  const files = Array.from(dt.files)
  if (files.length) {
    const image = files.find(isImageFile)
    if (image) return image
    return null
  }
  const uri = dt.getData('text/uri-list') || dt.getData('text/plain')
  if (uri && /^https?:\/\//i.test(uri.trim())) return uri.trim()
  return null
}
