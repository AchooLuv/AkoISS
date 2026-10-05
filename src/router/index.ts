import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, applySeo } from '@/utils/seo'

const Home = () => import('@/views/Main/Index.vue')
const NotFound = () => import('@/views/404/NotFound.vue')

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    description?: string
    /** 是否允许搜索引擎收录 */
    indexable?: boolean
  }
}

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      indexable: true,
    },
  },
  {
    path: '/404',
    name: 'notFound',
    component: NotFound,
    meta: {
      title: `页面不存在 - ${SITE_NAME}`,
      description: '没有找到对应的页面，请返回首页使用以图搜图功能。',
      indexable: false,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/** 路由切换后同步 title / description / canonical，让每个页面有自己的 SEO 信息 */
router.afterEach((to) => {
  applySeo({
    title: to.meta.title ?? HOME_TITLE,
    description: to.meta.description ?? HOME_DESCRIPTION,
    path: to.path,
    indexable: to.meta.indexable !== false,
  })
})

export default router
