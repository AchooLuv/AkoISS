import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'ako:theme'

const readStored = (): ThemeMode | null => {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'dark' || value === 'light' ? value : null
}

const prefersDark = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches

export const useThemeStore = defineStore('theme', () => {
  /** 默认跟随系统，用户手动切换后写入 localStorage 并长期记住 */
  const mode = ref<ThemeMode>(readStored() ?? (prefersDark() ? 'dark' : 'light'))
  const isDark = computed(() => mode.value === 'dark')

  /** 把主题写到 <html> 上；命名避开 Function.prototype.apply 造成的类型冲突 */
  const applyTheme = (value: ThemeMode = mode.value) => {
    const root = document.documentElement
    root.classList.toggle('dark', value === 'dark')
    root.style.colorScheme = value
  }

  const toggle = () => {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  watch(
    mode,
    (value) => {
      applyTheme(value)
      localStorage.setItem(STORAGE_KEY, value)
    },
    { immediate: true }
  )

  return { mode, isDark, toggle, applyTheme }
})
