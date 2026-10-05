import ako from '@/utils/http'
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
  const res = await ako.post<string>('/iqdb', form, {
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
  const res = await ako.post<unknown>('/trace/search', form, {
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

/**
 * 结果区的补充说明。IQDB 与 trace.moe 的"匹配度"含义不同，
 * 需要向用户解释，否则很容易把 26% 误读成"几乎没匹配上"。
 */
export const collectHint = (id: EngineId, list: ResultType[]): string | undefined => {
  if (id === 'iqdb') {
    return list.length
      ? 'IQDB 的匹配度表示缩略图层面的视觉相似度，20% 以上即可能是同一张图的转载或裁剪版本，建议以图库详情页为准。'
      : undefined
  }

  const report = lastReport(list)
  if (report && report.total > 0 && report.rejected === report.total) {
    return `接口返回了 ${report.total} 条候选，但相似度均低于 ${Math.round(
      TRACEMOE_MIN_SIMILARITY * 100
    )}%，已全部过滤——通常说明这张图不是番剧截图，或截图经过了明显裁剪、滤镜处理。`
  }
  if (report && report.total > 0 && report.rejected > 0) {
    return `另有 ${report.rejected} 条候选因相似度低于 ${Math.round(
      TRACEMOE_MIN_SIMILARITY * 100
    )}% 未展示。`
  }
  return undefined
}

export { iqdb, tracemoe }
