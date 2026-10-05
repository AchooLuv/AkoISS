import { ref } from 'vue'
import { collectHint, getEngine } from '@/engines'
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
    resultStore.setLoading(engineId, true)
    resultStore.setError(engineId, null)
    resultStore.setHint(engineId, null)
    busy.value = true

    try {
      const raw = await engine.request(upload, searchStore.options[engineId] ?? {})
      const list = engine.parse(raw)
      resultStore.setResult(engineId, list)
      // 解析层可能记录了"被阈值过滤掉多少条"，转成用户能看懂的一句话
      resultStore.setHint(engineId, collectHint(engineId, list) ?? null)
      searchStore.markSearched(engineId)
      searchStore.pushHistory({
        engine: engineId,
        engineLabel: engine.label,
        preview: upload.preview,
        count: list.length,
      })

      if (list.length) {
        tipsType(true, `${engine.label} 命中 ${list.length} 条结果`)
      } else {
        const reason = resultStore.hints[engineId]
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
