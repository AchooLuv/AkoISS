<script setup lang="ts">
import { computed, ref } from 'vue'
import { useImageInput } from '@/composables/useImageInput'
import { ACCEPTED_TYPES, formatBytes } from '@/utils/file'
import type { SearchUpload } from '@/types/common'

const props = defineProps<{
  upload: SearchUpload | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'change', upload: SearchUpload): void
  (event: 'clear'): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const accept = ACCEPTED_TYPES.join(',')
const sizeText = computed(() => (props.upload ? formatBytes(props.upload.file.size) : ''))
const sourceText = computed(() => {
  switch (props.upload?.source) {
    case 'paste':
      return '来自粘贴板'
    case 'url':
      return '来自图片地址'
    default:
      return '来自本地文件'
  }
})

/** 替换图片时释放上一个本地预览地址，避免 blob URL 堆积 */
const releasePreview = () => {
  if (props.upload && props.upload.source !== 'url') URL.revokeObjectURL(props.upload.preview)
}

const onReady = (upload: SearchUpload) => {
  releasePreview()
  emit('change', upload)
}

const { urlInput, fetching, isDragging, fromUrl, onDragEnter, onDragLeave, onDrop, clear } =
  useImageInput(onReady, () => emit('clear'))

const pickFile = () => {
  if (props.loading) return
  fileInput.value?.click()
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    releasePreview()
    emit('change', { source: 'file', file, preview: URL.createObjectURL(file) })
  }
  input.value = ''
}
</script>

<template>
  <section class="upload">
    <div class="luoma-panel-title">
      <el-icon><PictureFilled /></el-icon>
      待搜索图片
      <el-button v-if="upload" class="upload__clear" link size="small" @click="clear">
        清空
      </el-button>
    </div>

    <input
      ref="fileInput"
      class="upload__input"
      type="file"
      :accept="accept"
      @change="onFileChange"
    />

    <div
      class="dropzone"
      :class="{ 'is-dragging': isDragging, 'has-image': !!upload }"
      role="button"
      tabindex="0"
      @click="pickFile"
      @keydown.enter.prevent="pickFile"
      @keydown.space.prevent="pickFile"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragEnter"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <img v-if="upload" class="dropzone__preview" :src="upload.preview" alt="待搜索图片预览" />
      <div v-else class="dropzone__empty">
        <el-icon class="dropzone__icon"><UploadFilled /></el-icon>
        <p class="dropzone__title">拖入图片 / 点击选择</p>
        <p class="dropzone__hint">也可以直接按 Ctrl + V 粘贴截图</p>
      </div>
      <div v-if="upload" class="dropzone__overlay">
        <el-button size="small" round>
          <el-icon><Refresh /></el-icon>
          重新选择
        </el-button>
      </div>
      <div v-if="isDragging" class="dropzone__dragging">松开即可载入</div>
    </div>

    <div v-if="upload" class="upload__meta">
      <span class="upload__name" :title="upload.file.name">{{ upload.file.name }}</span>
      <span class="luoma-muted">{{ sizeText }} · {{ sourceText }}</span>
    </div>

    <el-collapse class="upload__url">
      <el-collapse-item name="url">
        <template #title>
          <span class="luoma-muted">用图片地址搜索</span>
        </template>
        <div class="upload__url-row">
          <el-input
            v-model="urlInput"
            size="small"
            placeholder="https://example.com/image.jpg"
            clearable
            @keydown.enter="fromUrl(urlInput)"
          />
          <el-button
            size="small"
            type="primary"
            :loading="fetching"
            :disabled="!urlInput.trim()"
            @click="fromUrl(urlInput)"
          >
            载入
          </el-button>
        </div>
        <p class="luoma-muted upload__url-tip">
          会先下载图片再交给引擎，因此地址需允许跨域访问。
        </p>
      </el-collapse-item>
    </el-collapse>
  </section>
</template>

<style scoped lang="scss">
.upload {
  &__input {
    display: none;
  }

  &__clear {
    margin-left: auto;
    padding: 0;
    height: auto;
    font-size: 11px;
    font-weight: 400;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: 8px;
    font-size: 11px;
  }

  &__name {
    color: var(--luoma-text-2);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__url {
    margin-top: 8px;
    border-top: none;

    :deep(.el-collapse-item__header),
    :deep(.el-collapse-item__wrap) {
      border-bottom: none;
      background: transparent;
    }

    :deep(.el-collapse-item__content) {
      padding-bottom: 0;
    }
  }

  &__url-row {
    display: flex;
    gap: 6px;
  }

  &__url-tip {
    margin: 6px 0 0;
  }
}

.dropzone {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: 260px;
  overflow: hidden;
  cursor: pointer;
  border: 1.5px dashed var(--luoma-border-strong);
  border-radius: var(--luoma-radius);
  background: var(--luoma-surface-2);
  transition: border-color 0.18s ease, background 0.18s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--luoma-brand);
    background: var(--luoma-brand-soft);
    outline: none;
  }

  &.has-image {
    border-style: solid;
    background: var(--luoma-surface);
  }

  &.is-dragging {
    border-color: var(--luoma-brand);
    background: var(--luoma-brand-soft);
    transform: scale(1.01);
  }

  &__preview {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  &__empty {
    text-align: center;
    padding: 12px;
  }

  &__icon {
    font-size: 34px;
    color: var(--luoma-brand);
    margin-bottom: 6px;
  }

  &__title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--luoma-text);
  }

  &__hint {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--luoma-text-3);
  }

  &__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 12px;
    background: linear-gradient(to top, rgba(10, 12, 20, 0.62), transparent 45%);
    opacity: 0;
    transition: opacity 0.18s ease;
  }

  &.has-image:hover &__overlay,
  &.has-image:focus-visible &__overlay {
    opacity: 1;
  }

  &__dragging {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: var(--luoma-brand);
    background: var(--luoma-blur-bg);
  }
}
</style>
