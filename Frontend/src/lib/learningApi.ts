import { queueLearningRequest } from "./learningOutbox"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"

export const learningApi = async <T,>(
  path: string,
  method = "GET",
  body?: Record<string, unknown>,
) => {
  const token = localStorage.getItem("ahub_token")
  const key = method !== "GET" ? crypto.randomUUID() : undefined
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/learning${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    const canQueue =
      key &&
      body &&
      ((method === "POST" && /\/submissions|\/practice-reports/.test(path)) ||
        (method === "PUT" && /\/answers/.test(path)) ||
        (method === "POST" && /\/submit$/.test(path)))
    if (canQueue) {
      await queueLearningRequest({
        key,
        path,
        method,
        body,
        capturedAt: new Date().toISOString(),
      })
      return { queued: true, capturedAt: new Date().toISOString() } as T
    }
    throw error
  }
  const result = await response.json().catch(() => ({}))
  if (!response.ok)
    throw new Error(
      result.message || "Learning request could not be completed.",
    )
  return result as T
}
