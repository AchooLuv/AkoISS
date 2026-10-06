<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSearchStore } from '@/stores/search'
import { useResultStore } from '@/stores/result'
import { useSearch } from '@/composables/useSearch'
import UploadPanel from '@/components/UploadPanel.vue'
import EngineSelector from '@/components/EngineSelector.vue'
import EngineOptions from '@/components/EngineOptions.vue'
import TraceQuota from '@/components/TraceQuota.vue'
import SearchHistory from '@/components/SearchHistory.vue'
import ResultsView from '@/components/ResultsView.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useTraceQuota } from '@/composables/useTraceQuota'
import type { SearchUpload } from '@/types/common'

const searchStore = useSearchStore()
const resultStore = useResultStore()
const { run } = useSearch()
const { refresh: refreshQuota } = useTraceQuota()

const helpVisible = ref(false)

/** 未接入的引擎在这里如实标注状态，避免用户以为功能缺失 */
const plannedEngines = [
  { label: 'ASCII2D', status: 0 },
  { label: 'SAUCENAO', status: 0 },
  { label: 'EHENTAI', status: -1 },
]

const loading = computed(() => resultStore.loading[searchStore.engineId])
const error = computed(() => resultStore.errors[searchStore.engineId])
const searched = computed(() => searchStore.searched[searchStore.engineId])
const canSearch = computed(() => Boolean(searchStore.upload) && !loading.value)

const onUpload = (upload: SearchUpload) => searchStore.setUpload(upload)
const onClear = () => searchStore.clearUpload()

const onSearch = async () => {
  await run()
  if (searchStore.engineId === 'tracemoe') refreshQuota()
}
</script>

<template>
  <div class="luoma-shell">
    <header class="luoma-header">
      <div class="luoma-container luoma-header__inner">
        <div class="luoma-header__logo">
          <span class="logo-mark">LuoMa</span>
          <span class="logo-text">
            <b>骡马搜图</b>
            <small>LuoMa Image Search</small>
          </span>
        </div>
        <div class="luoma-header__spacer" />
        <div class="luoma-header__actions">
          <el-popover v-model:visible="helpVisible" placement="bottom-end" :width="330" trigger="click">
            <template #reference>
              <el-button link>
                <el-icon><QuestionFilled /></el-icon>
                使用说明
              </el-button>
            </template>
            <div class="help">
              <p class="help__title">怎么用</p>
              <ol class="help__list">
                <li>上传、拖入或直接粘贴（Ctrl + V）一张截图</li>
                <li>选择引擎：IQDB 找原始出处，TRACE.MOE 定位番剧集数</li>
                <li>结果按匹配度排序，可点星标把重点候选置顶</li>
              </ol>
              <p class="help__title">引擎状态</p>
              <ul class="help__engines">
                <li v-for="engine in searchStore.engines" :key="engine.id">
                  <span class="dot" :style="{ background: engine.accent }" />
                  <b>{{ engine.label }}</b>
                  <span class="luoma-muted">{{ engine.subtitle }}</span>
                  <el-tag size="small" type="success" round>已部署</el-tag>
                </li>
                <li v-for="item in plannedEngines" :key="item.label">
                  <span class="dot" style="background: var(--luoma-text-3)" />
                  <b>{{ item.label }}</b>
                  <el-tag size="small" :type="item.status < 0 ? 'danger' : 'info'" round>
                    {{ item.status < 0 ? '已禁用' : '开发中' }}
                  </el-tag>
                </li>
              </ul>
              <p class="luoma-muted help__foot">
                IQDB 与 TRACE.MOE 由服务端代理转发，无需自行处理跨域。
              </p>
            </div>
          </el-popover>
          <el-link
            href="https://github.com/AchooLuv/LuoMaSouTu"
            target="_blank"
            rel="noopener noreferrer"
            underline="never"
          >
            <el-icon><Link /></el-icon>
            GitHub
          </el-link>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="luoma-main">
      <div class="luoma-container layout">
        <aside class="panel luoma-card">
          <UploadPanel :upload="searchStore.upload" :loading="loading" @change="onUpload" @clear="onClear" />

          <el-divider class="panel__divider" />

          <EngineSelector />

          <EngineOptions />

          <el-button
            class="panel__search"
            type="primary"
            size="large"
            :loading="loading"
            :disabled="!canSearch"
            @click="onSearch"
          >
            <el-icon v-if="!loading"><Promotion /></el-icon>
            {{ loading ? '正在搜索…' : searchStore.upload ? '开始搜索' : '请先添加图片' }}
          </el-button>

          <TraceQuota v-if="searchStore.engineId === 'tracemoe'" class="panel__quota" />

          <SearchHistory v-if="searchStore.history.length" class="panel__history" />
        </aside>

        <ResultsView
          class="layout__results"
          :engine-id="searchStore.engineId"
          :loading="loading"
          :error="error"
          :searched="searched"
          @retry="onSearch"
        />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 品牌缩写是 5 个字符（LuoMa），比原来的 AKO 宽，方块相应加宽 */
  width: 58px;
  height: 36px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.2px;
  color: var(--luoma-on-brand);
  background: linear-gradient(135deg, var(--luoma-brand), var(--luoma-brand-2));
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;

  b {
    font-size: 15px;
  }

  small {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.6px;
    color: var(--luoma-text-3);
  }
}

.layout {
  display: grid;
  grid-template-columns: 330px 1fr;
  gap: 20px;
  align-items: start;
}

.panel {
  position: sticky;
  top: 78px;
  display: flex;
  flex-direction: column;
  padding: 16px;

  &__divider {
    margin: 14px 0;
  }

  &__search {
    margin-top: 14px;
    width: 100%;
    font-weight: 600;
    letter-spacing: 1px;
  }

  &__quota {
    margin-top: 12px;
  }

  &__history {
    margin-top: 16px;
  }
}

.layout__results {
  min-width: 0;
}

.help {
  &__title {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--luoma-text-2);

    &:not(:first-child) {
      margin-top: 12px;
    }
  }

  &__list {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    line-height: 1.7;
    color: var(--luoma-text-2);
  }

  &__engines {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;

    li {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex: 0 0 auto;
    }

    .el-tag {
      margin-left: auto;
    }
  }

  &__foot {
    margin: 12px 0 0;
    line-height: 1.6;
  }
}

@media (max-width: 1023px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .panel {
    position: static;
  }
}
</style>
