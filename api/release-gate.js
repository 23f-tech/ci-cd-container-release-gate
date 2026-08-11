import { evaluateReleaseGate } from "../src/policy.js";

export default function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return response.status(404).json({ error: "not found" });

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    return response.status(200).json(evaluateReleaseGate(body));
  } catch {
    return response.status(400).json({ error: "invalid JSON" });
  }
}
