import * as cheerio from 'cheerio'
import { translateTags } from '@/utils/tags'
import type { ResultType } from '@/types/common'

const IQDB_ORIGIN = 'https://iqdb.org'
/** 默认检索的图库，与 iqdb.org 表单里默认勾选的 8 项一致（1-6 / 11 / 13） */
export const IQDB_SERVICES = [1, 2, 3, 4, 5, 6, 11, 13]
/** 需要发送给 IQDB 的 URL 检索参数名 */
export const IQDB_URL_PARAM = 'url'

const absolute = (url: string | undefined, base: string): string | undefined => {
  if (!url) return undefined
  try {
    return new URL(url, base).toString()
  } catch {
    return undefined
  }
}

/** 详情页路径最后一段就是原站文件名，拿来当标题比纯序号有用 */
const nameFromDetail = (detailUrl: string): string | undefined => {
  const last = detailUrl.split('?')[0].split('/').filter(Boolean).pop()
  if (!last) return undefined
  let decoded = last
  try {
    decoded = decodeURIComponent(last)
  } catch {
    /* 保留原样 */
  }
  return decoded.length > 3 ? decoded : undefined
}

/**
 * IQDB 会为同一张图的每个来源各放一个图标，而单元格文本可能把多个站名连在一起
 * （如 "Danbooru Gelbooru"）。用图标文件名反查站点名更准确。
 * 注意：图标后缀不统一（danbooru.ico / gelbooru.png），所以按去掉后缀的名字匹配。
 */
const SERVICE_BY_ICON: Record<string, string> = {
  danbooru: 'Danbooru',
  konachan: 'Konachan',
  yandere: 'yande.re',
  gelbooru: 'Gelbooru',
  sankaku: 'Sankaku',
  'e-shuushuu': 'e-shuushuu',
  zerochan: 'Zerochan',
  'anime-pictures': 'Anime-Pictures',
  moe: 'moe.imouto',
}

const serviceName = (iconSrc: string | undefined): string | undefined => {
  if (!iconSrc) return undefined
  const file = iconSrc.split('/').pop()?.toLowerCase()
  if (!file) return undefined
  return SERVICE_BY_ICON[file.replace(/\.[a-z0-9]+$/, '')]
}

/** 从详情页 URL 里取原站帖子号，用作卡片标题（如 danbooru 的 11998773） */
const postId = (detailUrl: string): string | undefined => {
  const last = detailUrl.split('?')[0].split('/').filter(Boolean).pop()
  return last && /^\d+$/.test(last) ? last : undefined
}

/**
 * 解析 IQDB 的 HTML 结果页。
 *
 * 每个命中项是一个 <table>：
 *   <tr><th>Possible match</th></tr>
 *   <tr><td class='image'><a href="<原站详情页>"><img src="<缩略图>"></a></td></tr>
 *   <tr><td><img alt="icon" src="/icon/yandere.ico" class="service-icon">yande.re</td></tr>  ← 图库名
 *   <tr><td>2112×2565 [Ero]</td></tr>
 *   <tr><td>26% similarity</td></tr>
 *
 * 另有两类非结果表格会被过滤：查询图自身（th 为 "Your image"，缩略图 alt 为 [IMG]）
 * 以及无命中提示（th 为 "No relevant matches"）——它们的详情链接指向 iqdb.org 自身。
 * 对站点改版保持宽容：取不到的字段留空，不抛异常。
 */
export const parse = (raw: unknown): ResultType[] => {
  if (typeof raw !== 'string' || !raw.trim()) return []
  const $ = cheerio.load(raw)

  const rows = $('table')
    .map((_, table): ResultType | undefined => {
      const imageCell = $('td.image', table).first()
      const link = $('a', imageCell).first()
      const img = $('img', imageCell).first()
      const src = img.attr('src')
      const href = link.attr('href')
      if (!src || !href) return undefined

      const detailUrl = absolute(href, IQDB_ORIGIN)
      // 查询图自身的详情链接就是 iqdb.org 首页，无参考价值
      if (!detailUrl || detailUrl.replace(/\/+$/, '') === IQDB_ORIGIN) return undefined

      const cells = $('td', table)
        .map((__, cell) => $(cell).text().trim())
        .get()
      const body = cells.join(' ')

      const similarity = /(\d+)% similarity/.exec(body)?.[1]
      const level = /\[([A-Za-z]+)\]/.exec(body)?.[1]
      const size = /(\d+×\d+)/.exec(body)?.[1]

      // 主来源图标用于卡片上的小徽标，与 source 的第一项对应
      const iconImg = $('img.service-icon', table).first()
      const iconSrc = absolute(iconImg.attr('src'), IQDB_ORIGIN)
      // 同一张图可能同时命中多个图库（如 Danbooru + Gelbooru），单元格里有多个来源图标，
      // 且站名会被连写成 "Danbooru Gelbooru"，所以以图标文件名反查为准。
      const names: string[] = []
      $('img.service-icon', table).each((__, icon) => {
        const name = serviceName($(icon).attr('src'))
        if (name && !names.includes(name)) names.push(name)
      })
      const cellText = iconImg.length ? iconImg.parent().text().trim() : ''
      const source = names.length
        ? names.slice(0, 2).join(' · ') + (names.length > 2 ? ` 等 ${names.length} 个图库` : '')
        : cellText || undefined

      const rawAlt = [img.attr('title'), img.attr('alt')].find((text) => text?.includes('Tags:'))
      const tags = translateTags(rawAlt ? /Tags:\s*(.+)$/.exec(rawAlt)?.[1] : undefined)

      const thumbnail = absolute(src, IQDB_ORIGIN)
      // iqdb 自己的缓存地址形如 /<service>.iqdb.org/<page>，反推成大图
      const cached = detailUrl.replace(/^https?:\/\//, '').match(/^([^/]+\.iqdb\.org)\/(.+)$/)

      return {
        id: `iqdb-${detailUrl}`,
        similarity: similarity ? Number.parseInt(similarity, 10) : 0,
        thumbnail,
        preview: cached ? `https://${cached[1]}/${cached[2]}` : detailUrl,
        url: detailUrl,
        // 标题优先用原站帖子号（如 danbooru 的 11998773），退回文件名
        title: postId(detailUrl) ?? nameFromDetail(detailUrl) ?? source,
        source,
        serviceIcon: iconSrc,
        level: level?.toLowerCase() === 'safe' ? 'Safe' : level,
        size,
        tags: tags.length ? tags : undefined,
      }
    })
    .get()

  return rows
    .filter((item): item is ResultType => Boolean(item))
    .sort((a, b) => b.similarity - a.similarity)
}
