import { ElNotification } from 'element-plus'

export type TipsLevel = 'success' | 'error' | 'warning' | 'info'

const TITLES: Record<TipsLevel, string> = {
  success: '搜索成功',
  error: '搜索失败',
  warning: '注意',
  info: '提示',
}

/**
 * 统一的通知出口。
 * 错误常驻并带关闭按钮（用户需要时间读完原因），其它 3.2 秒自动消失。
 */
export const tipsType = (done: boolean, msg: string, level?: TipsLevel) => {
  const finalLevel: TipsLevel = level ?? (done ? 'success' : 'error')

  ElNotification({
    type: finalLevel,
    title: TITLES[finalLevel],
    message: msg,
    position: 'top-right',
    offset: 78,
    duration: finalLevel === 'error' || finalLevel === 'warning' ? 0 : 3200,
    showClose: finalLevel === 'error' || finalLevel === 'warning',
    customClass: 'ako-notification',
  })
}
