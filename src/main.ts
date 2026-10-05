import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './Home.vue'
import router from './router'
import { useThemeStore } from '@/stores/theme'

// ElementPlus组件
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
// 顺序要紧：先声明设计令牌，再让全局样式引用它们
import '@/assets/styles/tokens.scss'
import '@/assets/styles/main.scss'

const pinia = createPinia()
const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(router)
app.use(pinia)

// 尽早应用主题，避免首屏闪白
useThemeStore().applyTheme()

app.mount('#app')
