<script setup lang="ts">
import { useSearchStore } from '@/stores/search'
import { fromNow } from '@/utils/format'

const searchStore = useSearchStore()
</script>

<template>
  <section v-if="searchStore.history.length" class="history">
    <div class="ako-panel-title">
      <el-icon><Clock /></el-icon>
      最近搜索
      <el-button class="history__clear" link size="small" @click="searchStore.clearHistory()">
        清空
      </el-button>
    </div>
    <ul class="history__list">
      <li v-for="item in searchStore.history" :key="item.id" class="history__item">
        <img class="history__thumb" :src="item.preview" :alt="`${item.engineLabel} 搜索记录`" />
        <div class="history__meta">
          <span class="history__engine">{{ item.engineLabel }}</span>
          <span class="ako-muted">{{ item.count }} 条结果 · {{ fromNow(item.at) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.history {
  &__clear {
    margin-left: auto;
    padding: 0;
    height: auto;
    font-size: 11px;
    font-weight: 400;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0 0 4px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
  }

  &__item {
    flex: 0 0 auto;
    width: 132px;
    border: 1px solid var(--ako-border);
    border-radius: var(--ako-radius-sm);
    overflow: hidden;
    background: var(--ako-surface-2);
  }

  &__thumb {
    display: block;
    width: 100%;
    height: 68px;
    object-fit: cover;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    padding: 5px 7px;
    font-size: 11px;
    line-height: 1.4;
  }

  &__engine {
    font-weight: 600;
    color: var(--ako-text-2);
  }
}
</style>
