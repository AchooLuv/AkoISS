<script setup lang="ts">
import { computed } from 'vue'
import { useSearchStore } from '@/stores/search'
import { ENGINES } from '@/engines'

const searchStore = useSearchStore()
const badge: Record<number, string> = { 1: '可用', 0: '开发中', '-1': '已禁用' }

/** 已接入的引擎 + 预留中的引擎，后者只展示不可点，避免用户以为功能缺失 */
const planned = [
  { id: 'ascii2d', label: 'ASCII2D', subtitle: '二次元图库', status: 0 },
  { id: 'saucenao', label: 'SAUCENAO', subtitle: '综合图源', status: 0 },
  { id: 'ehentai', label: 'EHENTAI', subtitle: '同人图库', status: -1 },
]

const active = computed(() => ENGINES)
</script>

<template>
  <section class="engines">
    <div class="luoma-panel-title">
      <el-icon><Search /></el-icon>
      选择搜索引擎
    </div>
    <div class="engines__list">
      <button
        v-for="engine in active"
        :key="engine.id"
        type="button"
        class="engine"
        :class="{ 'is-active': searchStore.engineId === engine.id }"
        :style="{ '--accent': engine.accent }"
        @click="searchStore.setEngine(engine.id)"
      >
        <span class="engine__top">
          <span class="engine__name">{{ engine.label }}</span>
          <span v-if="searchStore.engineId === engine.id" class="engine__check">
            <el-icon><Select /></el-icon>
          </span>
        </span>
        <span class="engine__desc">{{ engine.description }}</span>
      </button>
    </div>
    <el-collapse class="engines__more">
      <el-collapse-item name="planned">
        <template #title>
          <span class="luoma-muted">更多引擎（{{ planned.length }}）</span>
        </template>
        <ul class="planned">
          <li v-for="item in planned" :key="item.id" class="planned__item">
            <span class="planned__name">{{ item.label }}</span>
            <span class="planned__sub">{{ item.subtitle }}</span>
            <el-tag size="small" round :type="item.status < 0 ? 'danger' : 'info'">
              {{ badge[item.status] }}
            </el-tag>
          </li>
        </ul>
      </el-collapse-item>
    </el-collapse>
  </section>
</template>

<style scoped lang="scss">
.engines {
  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__more {
    margin-top: 6px;
    border-top: none;

    :deep(.el-collapse-item__header),
    :deep(.el-collapse-item__wrap) {
      border-bottom: none;
      background: transparent;
    }
  }
}

.engine {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--luoma-border);
  border-radius: var(--luoma-radius);
  background: var(--luoma-surface);
  color: var(--luoma-text);
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;

  &:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  &.is-active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--luoma-surface));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  &__top {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__name {
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.3px;
  }

  &__check {
    margin-left: auto;
    color: var(--accent);
    display: flex;
  }

  &__desc {
    font-size: 11px;
    line-height: 1.5;
    color: var(--luoma-text-3);
  }
}

.planned {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: var(--luoma-radius-sm);
    background: var(--luoma-surface-2);
    color: var(--luoma-text-2);
  }

  &__name {
    font-weight: 600;
  }

  &__sub {
    color: var(--luoma-text-3);
    margin-right: auto;
  }
}
</style>
