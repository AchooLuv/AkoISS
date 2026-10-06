<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :title="theme.isDark ? '切换到浅色主题' : '切换到深色主题'"
    :aria-label="theme.isDark ? '切换到浅色主题' : '切换到深色主题'"
    @click="theme.toggle()"
  >
    <span class="theme-toggle__track" :class="{ 'is-dark': theme.isDark }">
      <el-icon class="theme-toggle__icon">
        <Moon v-if="theme.isDark" />
        <Sunny v-else />
      </el-icon>
    </span>
  </button>
</template>

<style scoped lang="scss">
.theme-toggle {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  cursor: pointer;
  background: transparent;

  &:focus-visible {
    outline: 2px solid var(--luoma-brand);
    outline-offset: 3px;
    border-radius: 999px;
  }

  &__track {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid var(--luoma-border-strong);
    background: var(--luoma-surface-2);
    transition: background 0.24s ease, border-color 0.24s ease;

    &.is-dark {
      background: color-mix(in srgb, var(--luoma-brand) 26%, var(--luoma-surface-2));
      border-color: var(--luoma-brand);

      .theme-toggle__icon {
        transform: rotate(180deg);
        color: var(--luoma-brand);
      }
    }
  }

  &__icon {
    font-size: 14px;
    color: var(--luoma-text-2);
    transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}
</style>
