<script setup lang="ts">
const imgSrc = new URL('@/assets/images/404.png', import.meta.url).href
</script>

<template>
  <div class="notfound">
    <div class="notfound__art">
      <el-image class="notfound__image" :src="imgSrc" alt="404" />
    </div>
    <p class="notfound__title">这个页面不存在</p>
    <p class="ako-muted">可能是链接拼错了，也可能它已经下线了。</p>
    <router-link to="/">
      <el-button type="primary" size="small" round>返回首页</el-button>
    </router-link>
  </div>
</template>

<style scoped lang="scss">
.notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-width: 320px;
  margin: 12vh auto 0;
  text-align: center;

  &__art {
    width: 100%;
    padding-bottom: 22px;
  }

  &__image {
    width: 190px;
    max-width: 100%;
  }

  &__title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--ako-text);
  }

  .el-button {
    margin-top: 14px;
  }
}
</style>
