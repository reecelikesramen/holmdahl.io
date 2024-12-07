import httpProxy from "http-proxy"
import http from "http"

const proxy = httpProxy.createProxyServer({})

// Add headers to all responses
proxy.on("proxyRes", (proxyRes, req, res) => {
  proxyRes.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
  proxyRes.headers["Cross-Origin-Opener-Policy"] = "same-origin"
  proxyRes.headers["Cross-Origin-Resource-Policy"] = "cross-origin"

  // Only modify HTML responses from Hugo
  if (req.url?.startsWith("/assets/js") || req.url?.startsWith("/node_modules")) {
    return
  }

  const _write = res.write
  const _end = res.end
  const chunks = []

  // Collect chunks of data
  res.write = function (chunk) {
    chunks.push(chunk)
    return true
  }

  // When the response ends, combine chunks and replace URLs
  res.end = function (chunk) {
    if (chunk) {
      chunks.push(chunk)
    }

    // Only try to modify text/html responses
    if (proxyRes.headers["content-type"]?.includes("text/html")) {
      const body = Buffer.concat(chunks).toString("utf8")
      const modified = body.replace(/http:\/\/localhost:1313/g, "http://localhost:3000")
      _write.call(res, modified)
    } else {
      // For non-HTML responses, just pass through the original chunks
      chunks.forEach((chunk) => _write.call(res, chunk))
    }

    _end.call(res)
  }
})

const server = http.createServer((req, res) => {
  // Proxy to Vite for anything in /assets
  if (req.url?.startsWith("/assets/js") || req.url?.startsWith("/node_modules")) {
    proxy.web(req, res, { target: "http://localhost:5173" })
  }
  // Proxy to Hugo for everything else
  else {
    proxy.web(req, res, { target: "http://localhost:1313" })
  }
})

console.log("Development proxy server running on :3000")
server.listen(3000)
