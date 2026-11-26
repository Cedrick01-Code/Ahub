const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function workflowsApi<T>(path: string, method = "GET", body?: Record<string, unknown>): Promise<T> {
  const token = localStorage.getItem("ahub_token");
  const response = await fetch(`${API_BASE_URL}/api/workflows${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "The workflow request could not be completed.");
  return result as T;
}
