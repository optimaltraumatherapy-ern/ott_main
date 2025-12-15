import http from "node:http";

const PORT = Number(process.env.BACKEND_PORT ?? 8080);
const HOST = "0.0.0.0";

const server = http.createServer((req, res) => {
  // Simple health endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, HOST, () => {
  console.log(`✅ Backend running at http://${HOST}:${PORT}`);
  console.log(`   Health check: http://${HOST}:${PORT}/health`);
});
