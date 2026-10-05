/** 被支持的引擎标识 */
export type EngineId = 'iqdb' | 'tracemoe'

/** 上传来源 */
export type UploadSource = 'file' | 'paste' | 'url'

/** 一次搜索的输入：统一抽象掉"本地文件 / 远程 URL"的差异 */
export interface SearchUpload {
  source: UploadSource
  /** 预览用的地址（本地文件为 blob URL，远程为原 URL） */
  preview: string
  /** 实际发送给引擎的文件，远程 URL 会先下载再转成 File */
  file: File
  /** 原始远程地址，仅 source === 'url' 时有值 */
  remoteUrl?: string
}

/** 引擎可选项（对应原来 treeData 的二级节点） */
interface EngineOption {
  /** 选项标识，同时作为配置项 key */
  id: string
  label: string
  hint?: string
  /** 传给引擎的请求参数名 */
  param: string
  /** 参数值，默认 true / 'on' */
  value?: unknown
  defaultChecked?: boolean
}

/** 引擎定义：把"请求怎么发、响应怎么解析、结果怎么展示"收拢到一处 */
export interface EngineDef {
  id: EngineId
  label: string
  subtitle: string
  /** 简要说明，展示在引擎选择卡上 */
  description: string
  /** 状态标签：已部署 / 开发中 / 已禁用 */
  status: -1 | 0 | 1
  /** 品牌色，用于选中态与匹配度进度条 */
  accent: string
  options: EngineOption[]
  /** 发起搜索请求 */
  request: (upload: SearchUpload, options: Record<string, unknown>) => Promise<unknown>
  /** 把引擎原始响应转换成统一的 ResultType[] */
  parse: (raw: unknown) => ResultType[]
}

/** 归一化后的单条搜索结果 */
export interface ResultType {
  id: string
  /** 卡片标题：番剧名 / 原站文件名 */
  title?: string
  /** 缩略图 */
  thumbnail?: string
  /** 相似度，统一为 0~100 的整数 */
  similarity: number
  /** 可用于大图预览的地址 */
  preview?: string
  /** 结果详情页 */
  url?: string
  /** 番剧名 */
  animeName?: string
  /** 集数 */
  episode?: number
  /** 匹配片段的起止秒数 */
  from?: number
  to?: number
  /** 匹配到的帧对应的秒数 */
  at?: number
  /** 片段时长（秒） */
  duration?: number
  /** 视频文件名 */
  filename?: string
  /** 预览视频 / 动图 */
  video?: string
  /** 图片评级（IQDB） */
  level?: string
  /** 图片尺寸（IQDB），如 1280×720 */
  size?: string
  /** 来源图库名（IQDB），如 yande.re */
  source?: string
  /** 来源图库图标（IQDB） */
  serviceIcon?: string
  /** 已翻译的图片特征标签（IQDB） */
  tags?: string[]
}

type ResultFieldKind = 'tag' | 'link' | 'text' | 'timestamp' | 'tags'

/** 结果卡片上的一个字段描述 */
export interface ResultField {
  label: string
  kind: ResultFieldKind
  /** 从结果里取值 */
  value: (item: ResultType) => string | undefined
  /** tag 类型专用 */
  tagType?: (item: ResultType) => 'success' | 'warning' | 'info' | 'danger'
}

export interface SearchRecord {
  id: string
  engine: EngineId
  engineLabel: string
  /** 预览地址 */
  preview: string
  count: number
  at: number
}
