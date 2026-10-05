<script setup lang="ts">
import { computed } from 'vue'
import { useSearchStore } from '@/stores/search'

const searchStore = useSearchStore()
const engine = computed(() => searchStore.engines.find((item) => item.id === searchStore.engineId))
const options = computed(() => engine.value?.options ?? [])
</script>

<template>
  <section v-if="options.length" class="options">
    <div class="options__head">
      <span>搜索选项</span>
      <span class="ako-muted">作用于 {{ engine?.label }}</span>
    </div>
    <el-checkbox
      v-for="option in options"
      :key="option.id"
      class="options__item"
      :model-value="Boolean(searchStore.currentOptions[option.id])"
      @update:model-value="(value: unknown) => searchStore.setOption(option.id, value)"
    >
      <span class="options__label">{{ option.label }}</span>
      <span v-if="option.hint" class="options__hint">{{ option.hint }}</span>
    </el-checkbox>
  </section>
</template>

<style scoped lang="scss">
.options {
  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 12px;
    color: var(--ako-text-2);
    margin-bottom: 6px;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    height: auto;
    margin-right: 0;
    padding: 6px 0;

    :deep(.el-checkbox__label) {
      display: flex;
      flex-direction: column;
      line-height: 1.45;
      white-space: normal;
    }
  }

  &__label {
    font-size: 13px;
    color: var(--ako-text);
  }

  &__hint {
    font-size: 11px;
    color: var(--ako-text-3);
  }
}
</style>
