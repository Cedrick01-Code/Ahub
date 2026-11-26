const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"

export type ApiEnvelope<T> = { data: T; message?: string }
export type PageResult<T> = { data: T[]; total?: number; page?: number; limit?: number; totalPages?: number }

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = localStorage.getItem("ahub_token")
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || "Request could not be completed.")
  return result as T
}

export const commerceApi = {
  prices: (filters: { commodity?: string; province?: string; district?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][])
    return request<PageResult<OfficialPrice>>(`/prices${query.size ? `?${query}` : ""}`)
  },
  publishPrice: (input: OfficialPriceInput) => request<ApiEnvelope<OfficialPrice>>("/prices", "POST", input),
  updatePrice: (id: string, input: Partial<OfficialPriceInput>) => request<ApiEnvelope<OfficialPrice>>(`/prices/${id}`, "PATCH", input),
  demandRequests: (status?: string) => request<PageResult<DemandRequest>>(`/market/demand-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createDemandRequest: (input: DemandRequestInput) => request<ApiEnvelope<DemandRequest>>("/market/demand-requests", "POST", input),
  respondToDemand: (id: string, input: DemandResponseInput) => request<ApiEnvelope<DemandRequest>>(`/market/demand-requests/${id}/respond`, "POST", input),
  updateDemandStatus: (id: string, status: "matched" | "fulfilled" | "cancelled") => request<ApiEnvelope<DemandRequest>>(`/market/demand-requests/${id}/status`, "PATCH", { status }),
  conversations: () => request<PageResult<Conversation>>("/conversations"),
  openConversation: (participantId: string, contextType: Conversation["contextType"] = "general", contextId?: string) => request<ApiEnvelope<Conversation>>("/conversations", "POST", { participantId, contextType, contextId }),
  messages: (conversationId: string) => request<PageResult<Message>>(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, body: string) => request<ApiEnvelope<Message>>(`/conversations/${conversationId}/messages`, "POST", { body }),
  deliveries: () => request<PageResult<Delivery>>("/deliveries"),
  createDelivery: (input: DeliveryInput) => request<ApiEnvelope<Delivery>>("/deliveries", "POST", input),
  updateDeliveryStatus: (id: string, status: Delivery["status"], note = "") => request<ApiEnvelope<Delivery>>(`/deliveries/${id}/status`, "PATCH", { status, note }),
}

export type OfficialPrice = {
  _id: string; commodity: string; category: string; unit: string; priceRwf: number
  province: string; district: string; effectiveFrom: string; effectiveTo?: string | null
  status: "draft" | "published" | "expired"; notes?: string
}
export type OfficialPriceInput = Omit<OfficialPrice, "_id" | "status"> & { status?: "draft" | "published" }
export type DemandRequest = {
  _id: string; customerId: string | { _id: string; fullName: string }; commodity: string
  quantity: number; unit: string; targetPriceRwf?: number; requiredBy?: string
  province: string; district: string; sector?: string; notes?: string
  status: "open" | "matched" | "fulfilled" | "cancelled" | "expired"
  responses: Array<{ farmerId: string; message: string; offeredQuantity?: number; offeredPriceRwf?: number; productId?: string; createdAt: string }>
}
export type DemandRequestInput = Pick<DemandRequest, "commodity" | "quantity" | "unit"> & Partial<Pick<DemandRequest, "targetPriceRwf" | "requiredBy" | "province" | "district" | "sector" | "notes">>
export type DemandResponseInput = { message?: string; offeredQuantity?: number; offeredPriceRwf?: number; productId?: string }
export type Conversation = {
  _id: string; participantIds: Array<string | { _id: string; fullName: string; portal: string }>
  contextType: "general" | "product" | "order" | "demand" | "veterinary"; contextId?: string
  lastMessageAt: string; lastMessagePreview: string
}
export type Message = { _id: string; conversationId: string; senderId: string; body: string; createdAt: string; readBy: string[] }
export type Delivery = {
  _id: string; orderId: string; customerId: string; farmerId: string
  method: "pickup" | "farmer_delivery" | "third_party"
  status: "pending" | "preparing" | "ready" | "dispatched" | "in_transit" | "delivered" | "failed" | "cancelled"
  deliveryAddress: string; trackingReference: string; estimatedAt?: string; deliveredAt?: string
  events: Array<{ status: string; note?: string; actorId: string; createdAt: string }>
}
export type DeliveryInput = { orderId: string; method?: Delivery["method"]; deliveryAddress?: string; estimatedAt?: string; notes?: string }

export type Contact = { _id: string; fullName: string; portal: string; sector?: string; district?: string; province?: string }
