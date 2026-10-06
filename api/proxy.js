import { createProxyMiddleware } from 'http-proxy-middleware'

/**
 * Vercel Serverless 代理：/iqdb/* → iqdb.org，/trace/* → api.trace.moe
 *
 * 与原实现相比只有一处必要的改动：从 CommonJS（require / module.exports）
 * 改为 ESM（import / export default）。原因是根 package.json 声明了 "type": "module"，
 * 同目录的 .js 会被 Node 当 ES 模块，require 会直接抛
 * "require is not defined in ES module scope"，函数一加载就崩（所有接口 500）。
 *
 * 另外两点注意：
 * 1. 上游必须用 https —— iqdb.org 在明文 HTTP 上会 301 跳转。
 * 2. 经 vercel.json rewrite 之后 req.url 可能已被改写成 /api/proxy，
 *    所以这里同时从 x-forwarded-uri / x-now-route-matches 兜底取原始路径。
 */
const TARGETS = {
  iqdb: 'https://iqdb.org',
  trace: 'https://api.trace.moe',
}

const resolveTarget = (req) => {
  const candidates = [
    req.url,
    req.headers['x-forwarded-uri'],
    req.headers['x-now-route-matches'],
    req.headers['x-original-uri'],
  ]

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const match = candidate.match(/(?:^|[/=&?])(iqdb|trace)(?=[/?]|$)/)
    if (match) return { key: match[1], target: TARGETS[match[1]] }
  }
  return null
}

export default function handler(req, res) {
  const resolved = resolveTarget(req)

  if (!resolved) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Unsupported proxy target', url: req.url }))
    return
  }

  createProxyMiddleware({
    target: resolved.target,
    changeOrigin: true,
    pathRewrite: {
      '^/iqdb': '',
      '^/trace': '',
    },
    onError: (_err, _req, response) => {
      if (response.headersSent) return
      response.statusCode = 502
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ error: 'Upstream request failed' }))
    },
  })(req, res)
}
