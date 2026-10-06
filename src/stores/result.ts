import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { EngineId, ResultType } from '@/types/common'

export const useResultStore = defineStore('result', () => {
  const results = ref<Record<EngineId, ResultType[]>>({ iqdb: [], tracemoe: [] })
  const loading = ref<Record<EngineId, boolean>>({ iqdb: false, tracemoe: false })
  const errors = ref<Record<EngineId, string | null>>({ iqdb: null, tracemoe: null })
  /** 结果区的补充说明，例如被相似度阈值过滤掉的候选数量 */
  const hints = ref<Record<EngineId, string | null>>({ iqdb: null, tracemoe: null })
  /** 用户标记的候选，标记项置顶 */
  const marked = ref<string[]>([])
  const lastRunAt = ref<Record<EngineId, number | null>>({ iqdb: null, tracemoe: null })

  const isMarked = (id: string) => marked.value.includes(id)

  const setResult = (id: EngineId, payload: ResultType[]) => {
    results.value[id] = payload
    lastRunAt.value[id] = Date.now()
  }

  const setLoading = (id: EngineId, value: boolean) => {
    loading.value[id] = value
  }

  const setError = (id: EngineId, message: string | null) => {
    errors.value[id] = message
  }

  const setHint = (id: EngineId, message: string | null) => {
    hints.value[id] = message
  }

  const toggleMark = (id: string) => {
    marked.value = isMarked(id) ? marked.value.filter((item) => item !== id) : [...marked.value, id]
  }

  /**
   * 已标记的排前面，其余保持引擎返回的相似度顺序。
   * 传入 list 时以它为准（用于过滤后的结果），否则取该引擎的原始结果。
   */
  const ordered = (id: EngineId, list?: ResultType[]): ResultType[] =>
    [...(list ?? results.value[id])].sort(
      (a, b) => Number(isMarked(b.id)) - Number(isMarked(a.id))
    )

  const markCount = computed(() => marked.value.length)

  return {
    results,
    loading,
    errors,
    hints,
    marked,
    lastRunAt,
    markCount,
    isMarked,
    setResult,
    setLoading,
    setError,
    setHint,
    toggleMark,
    ordered,
  }
})
