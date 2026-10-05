/**
 * 把 Danbooru 系标签翻译成简短中文，便于快速判断这张图"是什么"。
 * 只覆盖高频且对判断有帮助的标签，未收录的原样保留英文。
 */
const TAG_MAP: Record<string, string> = {
  // 分辨率
  absurdres: '超高分辨率',
  highres: '高分辨率',
  lowres: '低分辨率',
  huge_filesize: '文件极大',

  // 内容
  '1girl': '单个少女',
  '2girls': '两名少女',
  '1boy': '单个男性',
  multiple_girls: '多名少女',
  solo: '单人',
  no_humans: '无人物',
  comic: '漫画',
  'text-only_page': '纯文字页面',
  monochrome: '单色',
  greyscale: '灰度',
  white_background: '白底',
  simple_background: '简单背景',
  transparent_background: '透明背景',
  chibi: 'Q 版',
}

export const translateTags = (tags: string | undefined): string[] => {
  if (!tags) return []
  return tags
    .split(/\s+/)
    .filter(Boolean)
    .map((tag) => TAG_MAP[tag] ?? tag)
    .slice(0, 10)
}
