/**
 * 纯格式化工具：不依赖 Vue / Element Plus，便于单测与复用。
 */

/** 秒 → HH:MM:SS。原来用 toISOString 取时分秒会输出 UTC 时间，存在时区偏移。 */
export const getHMS = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((value) => String(value).padStart(2, '0')).join(':')
}

/** 时间戳 → "刚刚 / 3 分钟前" */
export const fromNow = (at: number): string => {
  const diff = Math.max(0, Date.now() - at)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

/** 过长文本中间省略，保留头尾便于辨认 */
export const ellipsisName = (name: string, keep = 42): string => {
  if (name.length <= keep) return name
  const head = name.slice(0, Math.ceil(keep / 2) - 2)
  const tail = name.slice(-Math.floor(keep / 2))
  return `${head}…${tail}`
}

/** 轻量唯一 id，仅用于列表 key 与历史记录 */
export const uid = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
