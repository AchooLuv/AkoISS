/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  overrides: [
    {
      // Vercel Serverless 函数运行在 CommonJS 的 Node 环境
      files: ['api/**/*.js'],
      env: { node: true }
    },
    {
      // 路由级视图沿用目录名做组件名，无需强制多词
      files: ['src/views/**/*.vue', 'src/Home.vue'],
      rules: {
        'vue/multi-word-component-names': 'off'
      }
    }
  ]
}
