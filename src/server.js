import http from "node:http";
import { evaluateReleaseGate } from "./policy.js";

const port = Number(process.env.PORT ?? 3000);
const MAX_BODY_BYTES = 1_000_000;

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(body);
}

export const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;

  if (request.method === "OPTIONS" && pathname === "/release-gate") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    return response.end();
  }

  if (request.method !== "POST" || pathname !== "/release-gate") {
    return sendJson(response, 404, { error: "not found" });
  }

  let raw = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) request.destroy();
  });
  request.on("end", () => {
    try {
      sendJson(response, 200, evaluateReleaseGate(JSON.parse(raw)));
    } catch {
      sendJson(response, 400, { error: "invalid JSON" });
    }
  });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(port, "0.0.0.0", () => console.log(`Release gate listening on ${port}`));
}
