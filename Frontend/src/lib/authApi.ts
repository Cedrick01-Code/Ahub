const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"

export const authApi = async <T,>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result.message || "The request could not be completed.")
  }

  return result as T
}

export const authenticatedAuthApi = async <T,>(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<T> => {
  const token = localStorage.getItem("ahub_token")
  const response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result.message || "The request could not be completed.")
  }

  return result as T
}

export interface AuthResult {
  token?: string
  mfaRequired?: boolean
  mfaSetupRequired?: boolean
  challengeToken?: string
  setupToken?: string
  secret?: string
  otpauthUrl?: string
  expiresInSeconds?: number
  totpPeriodSeconds?: number
  user?: {
    id: string
    fullName: string
    email?: string
    portal: string
    role?: string
    status?: string
  }
}
