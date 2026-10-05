<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ellipsisName } from '@/utils/format'
import type { ResultField, ResultType } from '@/types/common'

const props = defineProps<{
  item: ResultType
  index: number
  engineId: string
  fields: ResultField[]
  marked: boolean
}>()

const emit = defineEmits<{ (event: 'mark', id: string): void }>()

const showVideo = ref(false)
const loaded = ref(false)

// 换一条结果时重置卡片内部状态，避免上一条的视频状态残留
watch(
  () => props.item.id,
  () => {
    showVideo.value = false
    loaded.value = false
  }
)

const cover = computed(() => props.item.thumbnail ?? props.item.preview)

/** 匹配度直接映射成 0~120 的色相，越高越偏绿 */
const similarityColor = computed(
  () => `hsl(${(props.item.similarity / 100) * 120}, 68%, 42%)`
)

const headerTitle = computed(
  () =>
    props.item.title ??
    props.item.animeName ??
    props.item.filename ??
    `候选结果 #${props.index + 1}`
)

/** 展示字段：有值的排前面，空值不占位 */
const visibleFields = computed(() =>
  props.fields
    .map((field) => ({ field, value: field.value(props.item) }))
    .filter((entry): entry is { field: ResultField; value: string } => Boolean(entry.value))
)

/** 标签字段单独用 chip 渲染，不重复占用描述列表 */
const fieldRows = computed(() => visibleFields.value.filter((entry) => entry.field.kind !== 'tags'))
const tagItems = computed(() => props.item.tags ?? [])
</script>

<template>
  <el-card class="result ako-fade-up" :class="{ 'is-marked': marked }" shadow="hover">
    <div class="result__head">
      <span class="result__index">#{{ index + 1 }}</span>
      <span class="result__name" :title="headerTitle">{{ headerTitle }}</span>
      <el-button
        class="result__mark"
        link
        :title="marked ? '取消标记' : '标记为重点候选'"
        @click="emit('mark', item.id)"
      >
        <el-icon :class="{ 'is-on': marked }">
          <StarFilled v-if="marked" />
          <Star v-else />
        </el-icon>
      </el-button>
    </div>

    <div class="result__body">
      <div class="result__cover">
        <video
          v-if="showVideo && item.video"
          class="result__media"
          :src="item.video"
          :poster="cover"
          autoplay
          muted
          loop
          playsinline
        />
        <el-image
          v-else
          class="result__media"
          :src="cover"
          alt="搜索结果预览"
          fit="contain"
          lazy
          :preview-src-list="item.preview ? [item.preview] : []"
          :initial-index="0"
          preview-teleported
          hide-on-click-modal
          @load="loaded = true"
        >
          <template #error>
            <div class="result__media-fallback">
              <el-icon><Picture /></el-icon>
              <span>预览不可用</span>
            </div>
          </template>
          <template #placeholder>
            <div class="result__media-fallback">
              <el-icon class="is-spin"><Loading /></el-icon>
              <span>加载中</span>
            </div>
          </template>
        </el-image>

        <el-button
          v-if="item.video"
          class="result__video-toggle"
          size="small"
          round
          @click="showVideo = !showVideo"
        >
          <el-icon>
            <VideoPause v-if="showVideo" />
            <VideoPlay v-else />
          </el-icon>
          {{ showVideo ? '看图片' : '看片段' }}
        </el-button>
      </div>

      <div class="result__info">
        <div class="result__similarity">
          <div class="result__similarity-head">
            <span class="result__similarity-num" :style="{ color: similarityColor }">
              {{ item.similarity }}%
            </span>
            <span class="result__similarity-label">匹配度</span>
          </div>
          <el-progress
            class="result__similarity-bar"
            :percentage="item.similarity"
            :stroke-width="6"
            :show-text="false"
            :color="similarityColor"
          />
        </div>

        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item
            v-for="entry in fieldRows"
            :key="entry.field.label"
            class="result__field"
            :label="entry.field.label"
            label-align="right"
          >
            <el-tag
              v-if="entry.field.kind === 'tag'"
              size="small"
              round
              effect="dark"
              :type="entry.field.tagType?.(item) ?? 'info'"
            >
              {{ entry.value }}
            </el-tag>
            <el-link
              v-else-if="entry.field.kind === 'link'"
              type="primary"
              underline="never"
              :href="entry.value"
              target="_blank"
              rel="noopener noreferrer"
            >
              <el-icon><Link /></el-icon>
              进入传送门
            </el-link>
            <span v-else-if="entry.field.kind === 'timestamp'" class="result__time">
              <el-icon><Clock /></el-icon>
              {{ entry.value }}
            </span>
            <span v-else :title="entry.value">{{ ellipsisName(entry.value, 60) }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="tagItems.length" class="result__tags">
          <span class="result__tags-label">图片特征</span>
          <el-tag v-for="tag in tagItems" :key="tag" size="small" round effect="plain" type="info">
            {{ tag }}
          </el-tag>
        </div>

        <div class="result__actions">
          <el-link
            v-if="item.url"
            type="primary"
            underline="never"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <el-icon><Link /></el-icon>
            查看原图页面
            <img v-if="item.serviceIcon" class="result__favicon" :src="item.serviceIcon" alt="" />
          </el-link>
          <el-link
            v-if="item.preview && item.preview !== item.url"
            underline="never"
            :href="item.preview"
            target="_blank"
            rel="noopener noreferrer"
          >
            <el-icon><View /></el-icon>
            直接打开原图
          </el-link>
          <span v-if="item.episode" class="result__meta">第 {{ item.episode }} 集</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.result {
  border-radius: var(--ako-radius-lg);
  border-color: var(--ako-border);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: var(--ako-border-strong);
    box-shadow: var(--ako-shadow);
  }

  &.is-marked {
    border-color: var(--ako-brand);
    box-shadow: 0 0 0 3px var(--ako-brand-soft);
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__index {
    flex: 0 0 auto;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ako-text-3);
    background: var(--ako-surface-2);
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--ako-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__mark {
    margin-left: auto;
    padding: 0;
    height: auto;
    font-size: 17px;
    color: var(--ako-text-3);

    .is-on {
      color: #f5a623;
    }
  }

  &__body {
    display: grid;
    grid-template-columns: minmax(190px, 250px) minmax(0, 1fr);
    gap: 18px;
  }

  &__cover {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--ako-radius);
    overflow: hidden;
    background: var(--ako-surface-2);
    min-height: 190px;
  }

  &__media {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 260px;
    object-fit: contain;
  }

  &__media-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 190px;
    font-size: 11px;
    color: var(--ako-text-3);

    .el-icon {
      font-size: 22px;
    }

    .is-spin {
      animation: ako-spin 1s linear infinite;
    }
  }

  &__video-toggle {
    position: absolute;
    left: 8px;
    bottom: 8px;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  &__similarity {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__similarity-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  &__similarity-num {
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  &__similarity-label {
    font-size: 11px;
    color: var(--ako-text-3);
  }

  &__time {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }

  &__field {
    :deep(.el-descriptions__label) {
      width: 82px;
    }
  }

  &__tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__tags-label {
    font-size: 11px;
    color: var(--ako-text-3);
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 12px;
  }

  &__favicon {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    margin-left: 4px;
    vertical-align: -2px;
  }

  &__meta {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--ako-text-3);
  }
}

@keyframes ako-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .result__body {
    grid-template-columns: 1fr;
  }

  .result__cover {
    min-height: 140px;
  }

  .result__media {
    max-height: 200px;
  }
}
</style>
