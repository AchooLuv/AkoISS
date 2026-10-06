import { onBeforeUnmount, onMounted, ref } from 'vue'
import { fileFromClipboard, fileFromDataTransfer, fileFromUrl, validateFile } from '@/utils/file'
import { tipsType } from '@/utils/notify'
import type { SearchUpload, UploadSource } from '@/types/common'

/**
 * 统一的图片来源入口：本地文件 / 拖拽 / 粘贴板 / 远程 URL。
 * 除 URL 模式外都只做本地校验，不发请求；URL 模式会先下载成 File，
 * 这样下游引擎只需要处理"一个文件"。
 */
export const useImageInput = (
  onReady: (upload: SearchUpload) => void,
  onClear: () => void
) => {
  const urlInput = ref('')
  const fetching = ref(false)
  const isDragging = ref(false)

  const accept = (file: File, source: UploadSource, remoteUrl?: string) => {
    const error = validateFile(file)
    if (error) {
      tipsType(false, error, 'warning')
      return
    }
    onReady({
      source,
      file,
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
      accept(file, 'url', url)
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
    accept(file, 'paste')
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
    accept(payload, 'file')
  }

  // 粘贴板事件挂在 document 上，用户不必先点中上传区
  onMounted(() => document.addEventListener('paste', onPaste))
  onBeforeUnmount(() => document.removeEventListener('paste', onPaste))

  return {
    urlInput,
    fetching,
    isDragging,
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
