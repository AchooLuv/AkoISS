import { ref } from 'vue'
import { collectEmptyReason, collectFiltered, getEngine, toRequestOptions } from '@/engines'
import { useResultStore } from '@/stores/result'
import { useSearchStore } from '@/stores/search'
import { tipsType } from '@/utils/notify'
import type { EngineId } from '@/types/common'

/** 搜索编排：校验 → 发请求 → 解析 → 落库 → 通知 */
export const useSearch = () => {
  const searchStore = useSearchStore()
  const resultStore = useResultStore()
  const busy = ref(false)

  const run = async (engineId: EngineId = searchStore.engineId) => {
    const upload = searchStore.upload
    if (!upload) {
      tipsType(false, '请先上传或粘贴一张图片', 'warning')
      return
    }
    if (resultStore.loading[engineId]) return

    const engine = getEngine(engineId)
    const options = searchStore.options[engineId] ?? {}
    resultStore.setLoading(engineId, true)
    resultStore.setError(engineId, null)
    resultStore.setHint(engineId, null)
    busy.value = true

    try {
      // 最低匹配率与 R18 过滤只在本地筛选，不发给图源
      const raw = await engine.request(upload, toRequestOptions(options))
      const list = engine.parse(raw)
      resultStore.setResult(engineId, list)
      searchStore.markSearched(engineId)
      searchStore.pushHistory({
        engine: engineId,
        engineLabel: engine.label,
        preview: upload.preview,
        count: list.length,
      })

      // 界面上的结果条数以过滤后为准
      const { list: kept } = collectFiltered(engineId, list, options)
      if (kept.length) {
        tipsType(true, `${engine.label} 命中 ${kept.length} 条结果`)
      } else {
        const reason = collectEmptyReason(engineId, collectFiltered(engineId, list, options), list)
        tipsType(false, reason ?? '没有找到匹配结果，可尝试换一张更清晰的图片', 'warning')
      }
    } catch (error) {
      const message =
        (error as { friendly?: string }).friendly ??
        (error instanceof Error ? error.message : '搜索失败，请稍后重试')
      resultStore.setError(engineId, message)
      resultStore.setResult(engineId, [])
      tipsType(false, message)
    } finally {
      resultStore.setLoading(engineId, false)
      busy.value = false
    }
  }

  return { run, busy }
}
