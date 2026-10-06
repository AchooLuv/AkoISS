<script setup lang="ts">
import { computed } from 'vue'
import ResultCard from './ResultCard.vue'
import { collectEmptyReason, collectFields, collectFiltered, collectHint, getEngine } from '@/engines'
import { useResultStore } from '@/stores/result'
import { useSearchStore } from '@/stores/search'
import type { EngineId } from '@/types/common'

const props = defineProps<{
  engineId: EngineId
  loading: boolean
  error: string | null
  /** 该引擎是否已经执行过至少一次搜索 */
  searched: boolean
}>()

const emit = defineEmits<{ (event: 'retry'): void }>()

const searchStore = useSearchStore()
const resultStore = useResultStore()

const engine = computed(() => getEngine(props.engineId))
const fields = computed(() => collectFields(props.engineId))
/** 解析层返回的原始结果（过滤器以它为输入，单独保留用于解释"为什么一条都没有"） */
const rawList = computed(() => resultStore.results[props.engineId])
/**
 * 过滤在渲染时计算，因此调整「最低匹配率」或「R18 过滤」会即时生效，
 * 不需要重新请求图源。
 */
const filtered = computed(() =>
  collectFiltered(props.engineId, rawList.value, searchStore.options[props.engineId] ?? {})
)
const list = computed(() => resultStore.ordered(props.engineId, filtered.value.list))
const hint = computed(() => collectHint(props.engineId, list.value, filtered.value) ?? null)
const emptyReason = computed(
  () => collectEmptyReason(props.engineId, filtered.value, rawList.value) ?? null
)
/** 被过滤条件隐藏的总条数，用于空态时给出可操作的提示 */
const filteredHidden = computed(
  () => filtered.value.hiddenBySimilarity + filtered.value.hiddenByR18
)
</script>

<template>
  <section class="results">
    <header class="results__head luoma-card">
      <div class="results__title">
        <span class="results__engine" :style="{ '--accent': engine.accent }">
          {{ engine.label }}
        </span>
        <span v-if="!loading && searched" class="results__count">
          共 <b>{{ list.length }}</b> 条结果
        </span>
        <span v-else-if="loading" class="luoma-muted">正在检索…</span>
        <span v-else class="luoma-muted">尚未搜索</span>
      </div>
      <div class="results__actions">
        <el-tag v-if="resultStore.markCount" size="small" type="warning" round effect="plain">
          已标记 {{ resultStore.markCount }} 条
        </el-tag>
        <el-button
          v-if="searchStore.upload"
          size="small"
          type="primary"
          :loading="loading"
          @click="emit('retry')"
        >
          <el-icon><Refresh /></el-icon>
          重新搜索
        </el-button>
      </div>
    </header>

    <div v-if="loading && !list.length" class="results__skeleton">
      <div v-for="index in 3" :key="index" class="skeleton luoma-card">
        <el-skeleton :rows="3" animated />
      </div>
    </div>

    <el-alert
      v-else-if="error"
      class="luoma-fade-up"
      type="error"
      :closable="false"
      show-icon
      title="搜索未成功"
    >
      <template #default>
        <div class="results__alert-body">
          <p>{{ error }}</p>
          <el-button size="small" @click="emit('retry')">重新搜索</el-button>
        </div>
      </template>
    </el-alert>

    <el-empty
      v-else-if="!list.length"
      :image-size="140"
      :description="searched ? '没有匹配到结果，试试换一张更清晰的图' : '上传图片并选择引擎后开始搜索'"
    >
      <template v-if="searched && (emptyReason || filteredHidden)" #description>
        <p class="results__empty-text">
          {{ emptyReason ?? `有 ${filteredHidden} 条结果因过滤条件被隐藏，可以调低过滤条件再看。` }}
        </p>
      </template>
    </el-empty>

    <template v-else>
      <el-alert
        v-if="hint"
        class="luoma-fade-up"
        type="info"
        :closable="false"
        show-icon
        :title="hint"
      />
      <div class="results__list">
        <ResultCard
          v-for="(item, index) in list"
          :key="item.id"
          :item="item"
          :index="index"
          :fields="fields"
          :marked="resultStore.isMarked(item.id)"
          @mark="resultStore.toggleMark"
        />
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.results {
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__empty-text {
    max-width: 460px;
    margin: 0 auto;
    font-size: 12px;
    line-height: 1.7;
    color: var(--luoma-text-3);
  }

  &__head {
    position: sticky;
    top: 68px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    box-shadow: var(--luoma-shadow-sm);
    background: var(--luoma-blur-bg);
    backdrop-filter: saturate(180%) blur(10px);
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  &__engine {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.4px;
    color: var(--luoma-on-brand);
    background: var(--accent);
  }

  &__count {
    font-size: 13px;
    color: var(--luoma-text-2);

    b {
      color: var(--luoma-text);
      font-size: 15px;
    }
  }

  &__actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__skeleton {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__alert-body {
    display: flex;
    align-items: center;
    gap: 10px;

    p {
      margin: 0;
    }
  }
}

.skeleton {
  padding: 18px;
}

@media (max-width: 767px) {
  .results__head {
    position: static;
    flex-wrap: wrap;
  }
}
</style>
