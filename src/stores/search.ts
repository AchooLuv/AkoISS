import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ENGINES, defaultOptions } from '@/engines'
import { uid } from '@/utils/format'
import type { EngineId, SearchRecord, SearchUpload } from '@/types/common'

export const useSearchStore = defineStore('search', () => {
  /** 当前待搜索的图片 */
  const upload = ref<SearchUpload | null>(null)
  /** 当前选中的引擎 */
  const engineId = ref<EngineId>('iqdb')
  /** 各引擎的选项，互不干扰 */
  const options = ref<Record<EngineId, Record<string, unknown>>>({
    iqdb: defaultOptions('iqdb'),
    tracemoe: defaultOptions('tracemoe'),
  })
  /** 最近搜索记录，仅保留本次会话 */
  const history = ref<SearchRecord[]>([])
  /** 各引擎是否已完成过至少一次搜索（用于区分空态文案） */
  const searched = ref<Record<EngineId, boolean>>({ iqdb: false, tracemoe: false })

  const currentOptions = computed(() => options.value[engineId.value])

  const setUpload = (value: SearchUpload | null) => {
    upload.value = value
  }

  const clearUpload = () => {
    if (upload.value && upload.value.source !== 'url') URL.revokeObjectURL(upload.value.preview)
    upload.value = null
  }

  const setEngine = (id: EngineId) => {
    engineId.value = id
  }

  const setOption = (id: string, value: unknown) => {
    options.value[engineId.value] = { ...options.value[engineId.value], [id]: value }
  }

  const pushHistory = (record: Omit<SearchRecord, 'id' | 'at'>) => {
    history.value = [
      { ...record, id: uid(), at: Date.now() },
      ...history.value.filter(
        (item) => item.preview !== record.preview || item.engine !== record.engine
      ),
    ].slice(0, 6)
  }

  const clearHistory = () => {
    history.value = []
  }

  const markSearched = (id: EngineId) => {
    searched.value = { ...searched.value, [id]: true }
  }

  return {
    engines: ENGINES,
    upload,
    engineId,
    options,
    currentOptions,
    history,
    searched,
    setUpload,
    clearUpload,
    setEngine,
    setOption,
    pushHistory,
    clearHistory,
    markSearched,
  }
})
