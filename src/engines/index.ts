import luoma from '@/utils/http'
import * as iqdb from './iqdb'
import * as tracemoe from './tracemoe'
import { ellipsisName, getHMS } from '@/utils/format'
import { IQDB_SERVICES, IQDB_URL_PARAM } from './iqdb'
import { TRACEMOE_LIMIT, TRACEMOE_MIN_SIMILARITY, TRACEMOE_URL_PARAM, lastReport } from './tracemoe'
import type { EngineDef, EngineId, ResultField, ResultType, SearchUpload } from '@/types/common'

/**
 * IQDB：multipart 表单，service[] 可重复以指定图库，forcegray 为「忽略色彩」。
 * axios 会把扁平数组序列化成 service[]=1&service[]=2…，与站点表单字段名一致。
 */
const requestIqdb = async (upload: SearchUpload, options: Record<string, unknown>) => {
  const form = new FormData()
  const services = (options.services as number[] | undefined) ?? IQDB_SERVICES
  services.forEach((service) => form.append('service[]', String(service)))
  if (options.forcegray) form.append('forcegray', 'on')
  form.append('file', upload.file, upload.file.name)
  // IQDB 也支持直接给图片地址，省一次上传
  if (upload.source === 'url' && upload.remoteUrl) {
    form.append(IQDB_URL_PARAM, upload.remoteUrl)
  }
  const res = await luoma.post<string>('/iqdb', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'text',
    transformResponse: [(data: string) => data],
  })
  return res.data
}

/**
 * trace.moe：multipart 上传，附加参数走 query。
 * 命中帧图片在 result.image，可播放的片段在 result.video。
 */
const requestTraceMoe = async (upload: SearchUpload, options: Record<string, unknown>) => {
  const form = new FormData()
  form.append('image', upload.file, upload.file.name)
  const params: Record<string, unknown> = {
    anilistInfo: true,
    cutBorders: Boolean(options.cutBorders),
    limit: TRACEMOE_LIMIT,
  }
  if (upload.source === 'url' && upload.remoteUrl) {
    params[TRACEMOE_URL_PARAM] = upload.remoteUrl
  }
  const res = await luoma.post<unknown>('/trace/search', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params,
  })
  return res.data
}

const similarityField: ResultField = {
  label: '匹配度',
  kind: 'tag',
  value: (item) => `${item.similarity}%`,
  tagType: (item) =>
    item.similarity >= 90 ? 'success' : item.similarity >= 75 ? 'warning' : 'info',
}

const iqdbFields: ResultField[] = [
  similarityField,
  {
    label: '来源图库',
    kind: 'tag',
    value: (item) => item.source,
    tagType: () => 'info',
  },
  {
    label: '图片评级',
    kind: 'tag',
    value: (item) => item.level,
    tagType: (item) => (item.level === 'Safe' ? 'success' : 'danger'),
  },
  { label: '原图尺寸', kind: 'text', value: (item) => item.size },
  {
    label: '图片特征',
    kind: 'tags',
    value: (item) => (item.tags?.length ? item.tags.join('、') : undefined),
  },
]

const traceMoeFields: ResultField[] = [
  similarityField,
  {
    label: '番剧名',
    kind: 'tag',
    value: (item) => item.animeName,
    tagType: () => 'info',
  },
  {
    label: '出现集数',
    kind: 'text',
    value: (item) => (item.episode ? `第 ${item.episode} 集` : undefined),
  },
  {
    label: '出现时间',
    kind: 'timestamp',
    value: (item) => {
      if (item.from === undefined) return undefined
      // from 与 to 落到同一秒时只显示一个时间点，避免「00:11:27 — 00:11:27」
      if (item.to === undefined || Math.floor(item.to) === Math.floor(item.from)) {
        return getHMS(item.from)
      }
      return `${getHMS(item.from)} — ${getHMS(item.to)}`
    },
  },
  {
    label: '视频文件',
    kind: 'text',
    value: (item) => (item.filename ? ellipsisName(item.filename, 52) : undefined),
  },
]

/**
 * IQDB 结果「匹配率」的默认下限（界面上的百分比整数）。
 *
 * 注意量纲差异：IQDB 的匹配度是缩略图层面的视觉相似度，实测同一张图的
 * 候选普遍落在 15%~26%，远低于 trace.moe 的帧级相似度（常见 80%~95%）。
 * 若照搬 trace.moe 那种 60% 阈值，会把全部结果挡掉、看起来像搜索坏了，
 * 所以这里按实测分布取 20%：能滤掉明显不相关的结果，又不会清空列表。
 */
export const IQDB_MIN_SIMILARITY = 20
/** TRACE.MOE 结果「匹配率」的默认下限：与解析层的保留阈值一致 */
export const TRACEMOE_FILTER_DEFAULT = Math.round(TRACEMOE_MIN_SIMILARITY * 100)

/**
 * IQDB 判定为 R18 的图库评级。
 * Danbooru 系分级：Safe / Questionable / Explicit，另加 IQDB 自身的 Ero、Unrated。
 * 其中 Ero、Explicit 属于明确的 R18；Questionable 也按 R18 处理（预期用户是要挡掉这类内容）。
 * Unrated 无法判断，保守起见不算 R18。
 */
const R18_LEVELS = new Set(['ero', 'explicit', 'questionable'])

/** 过滤项不需要发给图源接口，这里统一切掉 */
const REQUEST_OPTION_IDS = new Set(['minSimilarity', 'hideR18'])

export const ENGINES: EngineDef[] = [
  {
    id: 'iqdb',
    label: 'IQDB',
    subtitle: '综合图源',
    description: '检索 Danbooru、yande.re、Konachan 等 8 个图库的原始出处',
    status: 1,
    accent: '#6d4df6',
    options: [
      {
        id: 'forcegray',
        label: '忽略色彩',
        hint: '以灰度特征匹配，适合截图被调过色的情况',
        param: 'forcegray',
        value: 'on',
        // 灰度匹配会牺牲彩色特征，默认不开启
        defaultChecked: false,
      },
      {
        id: 'minSimilarity',
        label: '最低匹配率',
        hint: '低于该匹配率的结果不展示',
        type: 'slider',
        min: 0,
        max: 90,
        step: 5,
        suffix: '%',
        value: IQDB_MIN_SIMILARITY,
        defaultChecked: true,
      },
      {
        id: 'hideR18',
        label: '过滤 R18 内容',
        hint: '隐藏图库标记为 Ero / Questionable 的结果，默认不过滤',
        type: 'switch',
        defaultChecked: false,
      },
    ],
    request: requestIqdb,
    parse: iqdb.parse,
  },
  {
    id: 'tracemoe',
    label: 'TRACE.MOE',
    subtitle: '番剧定位',
    description: '定位截图出自哪部番剧的第几集第几秒，并给出片段预览',
    status: 1,
    accent: '#0f9d8f',
    options: [
      {
        id: 'cutBorders',
        label: '裁剪图片边缘',
        hint: '去掉上下黑边或水印边框后再匹配，可提升命中率',
        param: 'cutBorders',
        value: true,
        defaultChecked: true,
      },
      {
        id: 'minSimilarity',
        label: '最低匹配率',
        hint: '低于该匹配率的结果不展示',
        type: 'slider',
        min: 0,
        max: 95,
        step: 5,
        suffix: '%',
        value: TRACEMOE_FILTER_DEFAULT,
        defaultChecked: true,
      },
    ],
    request: requestTraceMoe,
    parse: tracemoe.parse,
  },
]

const ENGINE_MAP = new Map<EngineId, EngineDef>(ENGINES.map((engine) => [engine.id, engine]))

export const getEngine = (id: EngineId): EngineDef => {
  const engine = ENGINE_MAP.get(id)
  if (!engine) throw new Error(`未注册的引擎：${id}`)
  return engine
}

/** 取引擎选项的默认值，形如 { cutBorders: true }；只有显式声明 defaultChecked: true 的才默认开启 */
export const defaultOptions = (id: EngineId): Record<string, unknown> =>
  Object.fromEntries(
    getEngine(id)
      .options.filter((option) => option.defaultChecked === true)
      .map((option) => [option.id, option.value ?? true])
  )

export const collectFields = (id: EngineId): ResultField[] =>
  id === 'iqdb' ? iqdbFields : traceMoeFields

export interface FilterResult {
  /** 过滤后保留下来的结果 */
  list: ResultType[]
  /** 因最低匹配率被隐藏的条数 */
  hiddenBySimilarity: number
  /** 因 R18 过滤被隐藏的条数 */
  hiddenByR18: number
  /** 当前生效的最低匹配率 */
  threshold: number
  /** 是否开启了 R18 过滤 */
  hideR18: boolean
}

/**
 * 客户端结果过滤：最低匹配率 + R18。
 * 这两项都作用于已取回的结果（图源接口本身不提供这些参数），
 * 所以调整选项时会立即重新筛选，不需要重新请求。
 */
export const collectFiltered = (
  id: EngineId,
  list: ResultType[],
  options: Record<string, unknown>
): FilterResult => {
  const rawThreshold = Number(options.minSimilarity)
  const threshold = Number.isFinite(rawThreshold) ? rawThreshold : 0
  const hideR18 = Boolean(options.hideR18)

  let hiddenBySimilarity = 0
  let hiddenByR18 = 0
  const kept: ResultType[] = []

  for (const item of list) {
    if (item.similarity < threshold) {
      hiddenBySimilarity++
      continue
    }
    if (hideR18 && id === 'iqdb' && item.level && R18_LEVELS.has(item.level.toLowerCase())) {
      hiddenByR18++
      continue
    }
    kept.push(item)
  }

  return { list: kept, hiddenBySimilarity, hiddenByR18, threshold, hideR18 }
}

/** 从选项里挑出真正要发给图源的参数（过滤项只作用于本地结果） */
export const toRequestOptions = (options: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(options).filter(([key]) => !REQUEST_OPTION_IDS.has(key)))

/**
 * 结果区的补充说明。
 * - IQDB 与 trace.moe 的「匹配度」含义不同，需要向用户解释
 * - 被过滤掉多少条也要如实说明，否则用户会以为"结果丢了"
 * - filter 由界面在渲染时算好传入，这样调整阈值后说明会同步更新
 */
export const collectHint = (
  id: EngineId,
  kept: ResultType[],
  filter?: FilterResult | null
): string | undefined => {
  if (!kept.length) return undefined

  const parts: string[] = []
  if (filter?.hiddenBySimilarity) {
    parts.push(`已按最低匹配率 ${filter.threshold}% 隐藏 ${filter.hiddenBySimilarity} 条候选`)
  }
  if (filter?.hiddenByR18) {
    parts.push(`已隐藏 ${filter.hiddenByR18} 条 R18 结果`)
  }

  if (id === 'iqdb') {
    parts.push(
      'IQDB 的匹配度表示缩略图层面的视觉相似度，20% 以上即可能是同一张图的转载或裁剪版本，建议以图库详情页为准'
    )
  }

  return parts.length ? parts.join('；') + '。' : undefined
}

/**
 * 结果整体为空时的原因说明（区别于 collectHint：那条只在有结果时展示）。
 * rawList 必须是解析层返回的原始数组——解析层用它作为 key 记录了
 * "因相似度不足被丢弃"的条数，用来解释为什么一条都没有。
 */
export const collectEmptyReason = (
  id: EngineId,
  filter?: FilterResult | null,
  rawList?: ResultType[]
): string | undefined => {
  if (id === 'iqdb') {
    if (filter?.hiddenBySimilarity || filter?.hiddenByR18) {
      const parts: string[] = []
      if (filter.hiddenBySimilarity) {
        parts.push(`有结果低于当前的 ${filter.threshold}% 最低匹配率`)
      }
      if (filter.hiddenByR18) parts.push('有结果被 R18 过滤隐藏')
      return `${parts.join('，')}。可以调低过滤条件再看。`
    }
    return undefined
  }

  const report = rawList ? lastReport(rawList) : undefined
  if (report && report.total > 0) {
    return `接口返回了 ${report.total} 条候选，但相似度均低于 ${Math.round(
      TRACEMOE_MIN_SIMILARITY * 100
    )}%，已全部过滤——通常说明这张图不是番剧截图，或截图经过了明显裁剪、滤镜处理。`
  }
  if (filter?.hiddenBySimilarity) {
    return `有 ${filter.hiddenBySimilarity} 条候选低于当前的 ${filter.threshold}% 最低匹配率，可以调低阈值再看。`
  }
  return undefined
}

export { iqdb, tracemoe }
