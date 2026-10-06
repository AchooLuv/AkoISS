<script setup lang="ts">
import { computed } from 'vue'
import { useSearchStore } from '@/stores/search'
import type { EngineOption } from '@/types/common'

const searchStore = useSearchStore()
const engine = computed(() => searchStore.engines.find((item) => item.id === searchStore.engineId))
const options = computed(() => engine.value?.options ?? [])

/** 分区展示：先请求参数，再结果过滤，便于理解哪些会重新发请求 */
const requestOptions = computed(() =>
  options.value.filter((option) => option.type !== 'slider' && option.id !== 'hideR18')
)
const filterOptions = computed(() =>
  options.value.filter((option) => option.type === 'slider' || option.id === 'hideR18')
)

const valueOf = (option: EngineOption) => searchStore.currentOptions[option.id]

const setOption = (option: EngineOption, value: unknown) => {
  searchStore.setOption(option.id, value)
}
</script>

<template>
  <section v-if="options.length" class="options">
    <template v-if="requestOptions.length">
      <div class="options__head">
        <span>搜索选项</span>
        <span class="luoma-muted">作用于 {{ engine?.label }}</span>
      </div>
      <el-checkbox
        v-for="option in requestOptions"
        :key="option.id"
        class="options__item"
        :model-value="Boolean(valueOf(option))"
        @update:model-value="(value: unknown) => setOption(option, value)"
      >
        <span class="options__label">{{ option.label }}</span>
        <span v-if="option.hint" class="options__hint">{{ option.hint }}</span>
      </el-checkbox>
    </template>

    <template v-if="filterOptions.length">
      <div class="options__head options__head--filter">
        <span>结果过滤</span>
        <span class="luoma-muted">即时生效，无需重新搜索</span>
      </div>
      <div v-for="option in filterOptions" :key="option.id" class="options__filter">
        <div class="options__filter-head">
          <span class="options__label">{{ option.label }}</span>
          <span v-if="option.type === 'slider'" class="options__value">
            {{ valueOf(option) }}{{ option.suffix ?? '' }}
          </span>
        </div>
        <el-slider
          v-if="option.type === 'slider'"
          class="options__slider"
          size="small"
          :model-value="Number(valueOf(option))"
          :min="option.min ?? 0"
          :max="option.max ?? 100"
          :step="option.step ?? 5"
          :show-tooltip="false"
          @update:model-value="(value: number | number[]) => setOption(option, value)"
        />
        <el-checkbox
          v-else
          class="options__item options__item--compact"
          :model-value="Boolean(valueOf(option))"
          @update:model-value="(value: unknown) => setOption(option, value)"
        >
          <span class="options__label">{{ option.label }}</span>
        </el-checkbox>
        <span v-if="option.hint" class="options__hint">{{ option.hint }}</span>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.options {
  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 12px;
    color: var(--luoma-text-2);
    margin-bottom: 6px;
    gap: 8px;

    &--filter {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed var(--luoma-border);
    }
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

    &--compact {
      padding: 2px 0;
    }
  }

  &__filter {
    padding: 6px 0;

    & + & {
      border-top: 1px solid var(--luoma-border);
    }
  }

  &__filter-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  &__value {
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--luoma-brand);
  }

  &__slider {
    margin: 2px 6px 0;
    width: calc(100% - 12px);
  }

  &__label {
    font-size: 13px;
    color: var(--luoma-text);
  }

  &__hint {
    display: block;
    font-size: 11px;
    line-height: 1.5;
    color: var(--luoma-text-3);
  }
}
</style>
