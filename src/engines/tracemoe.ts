import type { ResultType } from '@/types/common'

export const TRACEMOE_ORIGIN = 'https://api.trace.moe'
/** 展示用的最低相似度，低于该值的结果基本没有参考价值 */
export const TRACEMOE_MIN_SIMILARITY = 0.7
/** trace.moe 单张图片最多返回的候选数量 */
export const TRACEMOE_LIMIT = 12

export const TRACEMOE_URL_PARAM = 'url'

export interface TraceMoeQuota {
  id: string
  /** 每日额度上限（按 IP 计算） */
  quota: number
  quotaUsed: number
  /** 每秒并发上限 */
  concurrency: number
}

interface TraceMoeAnime {
  title: {
    native?: string | null
    romaji?: string | null
    english?: string | null
    chinese?: string | null
  }
}

interface TraceMoeHit {
  anilist?: TraceMoeAnime
  filename?: string
  episode?: number | null
  episode_start?: number | null
  from?: number
  to?: number
  at?: number
  duration?: number
  similarity: number
  video?: string
  image?: string
}

interface TraceMoeResponse {
  error?: string
  quota?: number
  quotaUsed?: number
  result?: TraceMoeHit[]
}

/** 中文标题优先，便于中文界面直接展示 */
const pickTitle = (hit: TraceMoeHit): string | undefined => {
  const title = hit.anilist?.title
  if (!title) return undefined
  return title.chinese || title.native || title.romaji || title.english || undefined
}

/** 查询当前 IP 的额度使用情况 */
export const fetchQuota = async (): Promise<TraceMoeQuota> => {
  const res = await fetch(`${TRACEMOE_ORIGIN}/me`)
  if (!res.ok) throw new Error(`额度接口返回 HTTP ${res.status}`)
  const data = (await res.json()) as TraceMoeQuota
  if (typeof data?.quota !== 'number') throw new Error('额度接口返回结构异常')
  return data
}

/**
 * 解析结果附带"被相似度阈值挡掉多少条"的信息，
 * 用于在全部低于阈值时给出可解释的提示，而不是只显示一句"没有结果"。
 */
export interface ParseReport {
  list: ResultType[]
  /** 接口返回但相似度不足被过滤掉的条数 */
  rejected: number
  /** 接口返回的总条数 */
  total: number
}

const reports = new WeakMap<ResultType[], Omit<ParseReport, 'list'>>()

export const lastReport = (list: ResultType[]): Omit<ParseReport, 'list'> | undefined =>
  reports.get(list)

export const parse = (raw: unknown): ResultType[] => {
  const data = (raw ?? {}) as TraceMoeResponse
  const hits = Array.isArray(data.result) ? data.result : []
  if (data.error) throw new Error(data.error)

  const kept = hits.filter(
    (hit) => typeof hit?.similarity === 'number' && hit.similarity > TRACEMOE_MIN_SIMILARITY
  )

  const list = kept
    .map((hit) => {
      const episode = hit.episode ?? hit.episode_start ?? undefined
      // from === to 时（同帧命中）只展示一个时间点，避免出现 "00:11:27 — 00:11:27"
      return {
        id: `trace-${hit.filename ?? hit.image ?? 'unknown'}-${hit.at ?? hit.from ?? 0}`,
        title: pickTitle(hit),
        similarity: Math.round(hit.similarity * 100),
        thumbnail: hit.image,
        preview: hit.image,
        animeName: pickTitle(hit),
        episode: episode ?? undefined,
        filename: hit.filename,
        from: hit.from,
        to: hit.to,
        at: hit.at,
        duration: hit.duration,
        video: hit.video,
      } satisfies ResultType
    })
    .sort((a, b) => b.similarity - a.similarity)

  reports.set(list, { rejected: hits.length - kept.length, total: hits.length })
  return list
}
