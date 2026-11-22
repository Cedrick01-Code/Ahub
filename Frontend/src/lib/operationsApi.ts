const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"

export async function operationsApi<T>(
  path: string,
  method = "GET",
  body?: Record<string, unknown> | FormData,
): Promise<T> {
  const token = localStorage.getItem("ahub_token")
  const isFormData = body instanceof FormData
  const response = await fetch(`${API_BASE_URL}/api/operations${path}`, {
    method,
    headers: {
      ...(!isFormData && body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok)
    throw new Error(result.message || "Request could not be completed.")
  return result as T
}
