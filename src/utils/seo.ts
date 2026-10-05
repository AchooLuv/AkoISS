/**
 * 站点 SEO 相关的集中定义。
 * 站点地址与主标题/描述在 index.html 里也有一份（供爬虫与社交卡片直接读取），
 * 修改时请两处同步。
 */
export const SITE_URL = 'https://img.muri.life'
export const SITE_NAME = 'AKO 以图搜源'

export const HOME_TITLE = 'AKO 以图搜源 - 在线以图搜图，反查图片出处与番剧截图来源'
export const HOME_DESCRIPTION =
  'AKO 以图搜源是一个免费的在线以图搜图工具：上传、拖拽或粘贴一张动漫截图，即可通过 IQDB 在 Danbooru、yande.re、Konachan 等 8 个图库中反查原图出处，或通过 TRACE.MOE 定位截图出自哪部番剧的第几集第几秒。'

/** 更新 head 里的 <meta name="..."> 内容，不存在则创建（含 og:/twitter: 前缀） */
const setMeta = (key: string, content: string, attr: 'name' | 'property' = 'name') => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

const setCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export interface SeoInput {
  title: string
  description: string
  /** 规范化路径，如 '/' 或 '/404' */
  path: string
  /** 是否允许收录 */
  indexable?: boolean
}

/** 客户端路由切换后同步 head，保证标题与描述随页面变化 */
export const applySeo = ({ title, description, path, indexable = true }: SeoInput) => {
  const url = `${SITE_URL}${path}`

  document.title = title
  setMeta('description', description)
  setMeta('robots', indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow')

  setMeta('og:title', title, 'property')
  setMeta('og:description', description, 'property')
  setMeta('og:url', url, 'property')
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)
  setMeta('twitter:url', url)

  setCanonical(url)
}
