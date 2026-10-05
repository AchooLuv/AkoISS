import { computed, onMounted, ref } from 'vue'
import { fetchQuota } from '@/engines/tracemoe'

/**
 * trace.moe 的匿名额度是按 IP 计算的（当前为 100 次/天），
 * 超额后接口会直接返回 429。这里把额度读出来展示，避免用户撞墙后才知道。
 */
export const useTraceQuota = () => {
  const loading = ref(false)
  const total = ref<number | null>(null)
  const used = ref<number | null>(null)
  const failed = ref(false)

  const refresh = async () => {
    loading.value = true
    try {
      const data = await fetchQuota()
      total.value = data.quota
      used.value = data.quotaUsed
      failed.value = false
    } catch {
      failed.value = true
    } finally {
      loading.value = false
    }
  }

  const remaining = computed(() =>
    total.value === null || used.value === null ? null : Math.max(0, total.value - used.value)
  )

  const percent = computed(() =>
    total.value && used.value !== null ? Math.round((used.value / total.value) * 100) : 0
  )

  const level = computed<'safe' | 'warn' | 'danger'>(() => {
    const rest = remaining.value
    if (rest === null) return 'safe'
    if (rest <= 0) return 'danger'
    if (rest <= 10) return 'warn'
    return 'safe'
  })

  onMounted(refresh)

  return { loading, total, used, remaining, percent, level, failed, refresh }
}
