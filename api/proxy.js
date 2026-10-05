const { createProxyMiddleware } = require('http-proxy-middleware')

/**
 * Vercel Serverless 代理：把 /iqdb/* 与 /trace/* 转发到对应图源。
 *
 * 两个易踩的点：
 * 1. iqdb.org 在明文 HTTP 上会 301 跳到 HTTPS，target 必须用 https。
 * 2. 经 vercel.json rewrite 之后 req.url 可能已被改写成 /api/proxy，
 *    所以这里同时从 x-forwarded-uri / x-now-route-matches 里兜底取原始路径，
 *    否则 target 会落空、代理静默失败。
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
    const match = candidate.match(/(?:^|[/=&])(iqdb|trace)(?=[/?]|$)/)
    if (match) return { key: match[1], target: TARGETS[match[1]] }
  }
  return null
}

module.exports = (req, res) => {
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
    secure: true,
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
