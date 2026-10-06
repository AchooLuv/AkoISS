import { onBeforeUnmount, onMounted, ref } from 'vue'
import { fileFromClipboard, fileFromDataTransfer, fileFromUrl, validateFile } from '@/utils/file'
import { compressForUpload } from '@/utils/compress'
import { formatBytes } from '@/utils/file'
import { tipsType } from '@/utils/notify'
import type { SearchUpload, UploadSource } from '@/types/common'

/**
 * 统一的图片来源入口：本地文件 / 拖拽 / 粘贴板 / 远程 URL。
 * URL 模式会先下载成 File，这样下游引擎只需要处理"一个文件"。
 *
 * 所有来源都会经过一次体积检查：超过 Vercel Serverless 的请求体上限
 * （4.5MB，超了会直接 413）时自动压缩，本地开发没有这个限制，
 * 所以必须在客户端统一处理，否则线上必然搜不了大图。
 */
export const useImageInput = (
  onReady: (upload: SearchUpload) => void,
  onClear: () => void
) => {
  const urlInput = ref('')
  const fetching = ref(false)
  const isDragging = ref(false)
  /** 正在压缩（大图需要一点时间） */
  const compressing = ref(false)

  const accept = async (file: File, source: UploadSource, remoteUrl?: string) => {
    const error = validateFile(file)
    if (error) {
      tipsType(false, error, 'warning')
      return
    }

    let finalFile = file
    const originalSize = file.size
    try {
      compressing.value = true
      const result = await compressForUpload(file)
      finalFile = result.file
      if (result.compressed) {
        tipsType(
          true,
          `图片 ${formatBytes(originalSize)} 超过 4MB 上传上限，已自动压缩到 ${formatBytes(
            result.finalSize
          )}`,
          'info'
        )
      }
    } catch (compressError) {
      tipsType(
        false,
        compressError instanceof Error ? compressError.message : '图片处理失败',
        'warning'
      )
      return
    } finally {
      compressing.value = false
    }

    onReady({
      source,
      file: finalFile,
      // 预览仍用原图地址，避免压缩后的低清版本影响观看
      preview: source === 'url' && remoteUrl ? remoteUrl : URL.createObjectURL(file),
      remoteUrl,
    })
  }

  const fromUrl = async (raw: string) => {
    const url = raw.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      tipsType(false, '请输入以 http(s):// 开头的图片地址', 'warning')
      return
    }
    fetching.value = true
    try {
      const file = await fileFromUrl(url)
      await accept(file, 'url', url)
      urlInput.value = ''
    } catch (error) {
      tipsType(false, error instanceof Error ? error.message : '图片加载失败', 'warning')
    } finally {
      fetching.value = false
    }
  }

  const onPaste = (event: ClipboardEvent) => {
    const file = fileFromClipboard(event)
    if (!file) return
    event.preventDefault()
    void accept(file, 'paste')
  }

  const onDragEnter = (event: DragEvent) => {
    if (!event.dataTransfer) return
    isDragging.value = true
  }

  const onDragLeave = () => {
    isDragging.value = false
  }

  const onDrop = async (event: DragEvent) => {
    isDragging.value = false
    if (!event.dataTransfer) return
    const payload = fileFromDataTransfer(event.dataTransfer)
    if (!payload) {
      tipsType(false, '没有识别到图片，请拖入图片文件或图片链接', 'warning')
      return
    }
    if (typeof payload === 'string') {
      await fromUrl(payload)
      return
    }
    await accept(payload, 'file')
  }

  // 粘贴板事件挂在 document 上，用户不必先点中上传区
  onMounted(() => document.addEventListener('paste', onPaste))
  onBeforeUnmount(() => document.removeEventListener('paste', onPaste))

  return {
    urlInput,
    fetching,
    compressing,
    isDragging,
    /** 供文件选择框等外部入口复用同一套「校验 + 压缩」流程 */
    acceptFile: accept,
    fromUrl,
    onDragEnter,
    onDragLeave,
    onDrop,
    clear: () => {
      urlInput.value = ''
      onClear()
    },
  }
}
