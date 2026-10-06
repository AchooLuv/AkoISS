<script setup lang="ts">
import { useTraceQuota } from '@/composables/useTraceQuota'

const { loading, total, used, remaining, percent, level, failed, refresh } = useTraceQuota()
</script>

<template>
  <div class="quota" :class="`is-${level}`" v-loading="loading">
    <div class="quota__row">
      <el-icon><Timer /></el-icon>
      <span class="quota__label">今日额度</span>
      <span v-if="remaining !== null" class="quota__value">
        剩余 <b>{{ remaining }}</b> / {{ total }} 次
      </span>
      <span v-else-if="failed" class="quota__value">额度查询失败</span>
      <span v-else class="quota__value">查询中…</span>
      <el-button
        class="quota__refresh"
        link
        size="small"
        title="重新查询额度"
        @click="refresh"
      >
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>
    <el-progress
      v-if="remaining !== null"
      class="quota__bar"
      :percentage="percent"
      :stroke-width="5"
      :show-text="false"
      :color="level === 'danger' ? 'var(--luoma-danger)' : level === 'warn' ? 'var(--luoma-warning)' : 'var(--luoma-brand-2)'"
    />
    <p class="quota__hint">
      trace.moe 按访问 IP 计费，额度用尽后需等待次日重置（已用 {{ used ?? 0 }} 次）。
    </p>
  </div>
</template>

<style scoped lang="scss">
.quota {
  padding: 10px 12px;
  border: 1px solid var(--luoma-border);
  border-radius: var(--luoma-radius);
  background: var(--luoma-surface-2);

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--luoma-text-2);
  }

  &__label {
    color: var(--luoma-text-3);
  }

  &__value {
    margin-left: auto;

    b {
      color: var(--luoma-text);
      font-size: 13px;
    }
  }

  &__refresh {
    padding: 0;
    height: auto;
    color: var(--luoma-text-3);
  }

  &__bar {
    margin-top: 8px;
  }

  &__hint {
    margin: 6px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--luoma-text-3);
  }

  &.is-danger {
    border-color: var(--luoma-danger);
    background: rgba(220, 38, 38, 0.08);
  }

  &.is-warn {
    border-color: var(--luoma-warning);
    background: rgba(217, 119, 6, 0.08);
  }
}
</style>
