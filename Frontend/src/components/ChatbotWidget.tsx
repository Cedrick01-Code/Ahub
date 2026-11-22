import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Send,
  X,
  Loader2,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  MapPin,
  Sprout,
  Truck,
  type LucideIcon,
} from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

interface QuickAction {
  label: string
  prompt: string
  icon: LucideIcon
}

const COLORS = {
  accent: "#10B981",
  accentHover: "#059669",
  accentGlow: "rgba(16, 185, 129, 0.4)",
  bgMain: "#FFFFFF",
  bgCard: "#F8FAF8",
  bgInput: "#F0FDF4",
  borderSubtle: "#BBF7D0",
  borderMain: "#86EFAC",
  textPrimary: "#14532D",
  textSecondary: "#166534",
  textMuted: "#6B9B7B",
  textPlaceholder: "#86BFA7",
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "How AHub works", prompt: "Explain how AHub works and what it does", icon: Sparkles },
  { label: "For Farmers", prompt: "What can farmers do on AHub?", icon: Sprout },
  { label: "For Buyers", prompt: "How can buyers find and purchase products?", icon: Truck },
  { label: "Registration Help", prompt: "How do I register as a farmer?", icon: BookOpen },
  { label: "Marketplace", prompt: "How does the marketplace work?", icon: Users },
]

export function ChatbotWidget({ 
  position = "bottom-right",
  title = "AHub Assistant",
  subtitle = "Ask me anything about AHub",
  initialOpen = false,
}: { 
  position?: "bottom-right" | "bottom-left"
  title?: string
  subtitle?: string
  initialOpen?: boolean
} = {}) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  const getToken = useCallback(() => localStorage.getItem("ahub_token"), [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-focus textarea when widget opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  const addMessage = (role: "user" | "assistant", content: string) => {
    const newMessage: ChatMessage = {
      id: `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMessage])
    setShowQuickActions(false)
  }

  const sendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim()
    if (!messageText || isLoading) return

    addMessage("user", messageText)
    setInputValue("")
    setIsLoading(true)

    try {
      const token = getToken()
      if (!token) {
        // For public pages, we can still provide helpful responses without backend
        const publicResponse = getPublicResponse(messageText)
        setTimeout(() => {
          addMessage("assistant", publicResponse)
          setIsLoading(false)
        }, 500)
        return
      }

      const response = await fetch("/api/operations/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: messageText }),
      })

      const data = await response.json()
      const answerContent =
        data.data?.answer ||
        data.message ||
        "Sorry, I could not generate a response. Please try again."

      addMessage("assistant", answerContent)
    } catch {
      const errorMsg = "Connection error. Please check your network and try again."
      addMessage("assistant", errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getPublicResponse = (question: string): string => {
    const q = question.toLowerCase()
    
    // Security: Refuse to answer questions about authority portals
    const authorityKeywords = [
      "veterinary", "vet officer", "vet visit", "vet request",
      "sector vet", "district vet", "province vet", "rab admin", "rab officer",
      "nsg", "security admin", "national security",
      "authority portal", "authority dashboard", "authority access",
      "approve farmer", "approve account", "approval dashboard",
      "task assignment", "assign task", "field task",
      "problem resolution", "resolve problem", "field issue",
      "announcement", "broadcast", "official announcement",
      "hierarchical approval", "approval hierarchy",
      "rab ", "province ", "district ", "sector ",
      "vet dashboard", "vet workspace", "vet tools"
    ]
    
    const isAuthorityQuestion = authorityKeywords.some(keyword => q.includes(keyword))
    
    if (isAuthorityQuestion) {
      return `I'm unable to provide information about authority portals (veterinary officers, RAB, NSG, district/province/sector vet dashboards, approval systems, task assignments, or field operations) for security reasons.

I can help you with:
- **Farmer & Buyer features** - registration, marketplace, AI farming guides
- **General platform info** - how AHub connects farmers and buyers
- **Account setup** - creating farmer or customer accounts

Please ask about farmer/buyer features instead!`
    }
    
    if (q.includes("what") && (q.includes("ahub") || q.includes("hub"))) {
      return `**AHub (Agriculture Hub)** is Rwanda's integrated digital platform connecting farmers, buyers, and agricultural authorities.

**Core Purpose:** Bridge the gap between local producers, consumers, and public agricultural services through a unified, region-matched platform.

**Key Features:**
- **For Farmers:** Register plots/livestock, get AI-generated farming guides, list products for sale, request vet visits, receive tasks from sector officers
- **For Buyers:** Browse local produce, filter by location/crop, save favorites, message farmers directly
- **For Authorities (Sector/District/Province/RAB/NSG):** Hierarchical approval system, field task assignment, problem tracking, vet visit management, announcements

**Technology:** React + Node.js + MongoDB + Gemini AI for farming guides`
    }
    
    if (q.includes("farm") && (q.includes("register") || q.includes("join") || q.includes("sign up"))) {
      return `**To register as a farmer on AHub:**

1. Go to **/get-started** or click "Get Started" on the landing page
2. Choose **"Register as Farmer"**
3. Fill in your details:
   - Full name
   - Phone number
   - Password
   - **Location**: Province → District → Sector (this determines your region-matched services)
4. Submit for approval

**After registration:** Your account goes to your **Sector Veterinary Officer** for approval. Once approved, you'll get full access to:
- Plot & livestock registration
- AI farming guides (Guide Me)
- Product marketplace
- Vet visit requests
- Daily tasks from your sector officer`
    }

    if (q.includes("buyer") || q.includes("customer") || q.includes("buy")) {
      return `**For Buyers/Customers:**

1. Register at **/get-started** → "Register as Buyer"
2. No approval needed - instant access!
3. Features available:
   - **Browse marketplace** with location-based filtering
   - **Save favorites** (heart icon)
   - **Request products** - specify quantity, farmer reviews and approves
   - **Chat with farmers** via order messaging
   - **View on map** - see product locations by sector/district

**Tip:** Use the "All Products" tab to browse everything without searching, or use filters for specific crops/locations.`
    }

    if (q.includes("guide") || q.includes("ai") || q.includes("farming") || q.includes("crop") || q.includes("livestock")) {
      return `**Guide Me - AI Farming Guides:**

Once you have registered plots or livestock units:
1. Go to **Guide Me** (in Farmer Portal)
2. Click **"Generate Guide"** on any production unit
3. AHub uses **Gemini AI** to create a comprehensive **11-chapter book** tailored to your:
   - Specific crop variety or livestock breed
   - Soil type, irrigation method
   - Location (Rwanda-specific advice)
   - Planting/harvest dates

**Crop guides include:** Planning, Soil prep, Planting, Irrigation, Fertilization, Weeds, Pests, Diseases, Growth monitoring, Harvest, Marketing
**Livestock guides include:** Breed selection, Housing, Nutrition, Water, Health, Diseases, Parasites, Breeding, Young stock, Production, Marketing`
    }

    if (q.includes("market") || q.includes("sell") || q.includes("product")) {
      return `**Marketplace - Selling Products:**

**For Farmers:**
1. In Farmer Portal → "Upload Products"
2. Add: Title, Crop type, Quantity, Unit (kg, crates, bags), Available date, **Image** (optional)
3. Products appear to buyers in your region

**Order Flow:**
1. Buyer requests quantity → 2. You approve/reject → 3. Quantity auto-deducted → 4. If 0, marked "Sold Out" → 5. Auto-deleted after 5 days

**For Buyers:** Browse, filter by location/crop, request quantity, chat with farmer.`
    }

    if (q.includes("authority") || q.includes("vet") || q.includes("officer") || q.includes("rab") || q.includes("nsg") || q.includes("approve")) {
      return `**Authority Hierarchy & Approvals:**

**NSG (National Security) →** Approves RAB Admin accounts
**RAB Admin →** Approves Province Veterinary Officers
**Province Vet →** Approves District Veterinary Officers
**District Vet →** Approves Sector Veterinary Officers
**Sector Vet →** Approves **Farmer** accounts

**Each level only manages within their geographic bounds:**
- Sector Vet: Only farmers in their sector
- District Vet: All sectors in their district
- Province Vet: All districts in their province
- RAB: National oversight

**Tools per level:** Dashboard stats, farmer management, task assignment, problem resolution, vet visits, announcements.`
    }

    if (q.includes("help") || q.includes("what can you do") || q.includes("how") || q.includes("features")) {
      return `I can help you with:

**🌱 Platform Overview** - What AHub does and who it's for
**👨‍🌾 Farmer Registration** - Step-by-step signup process
**🛒 Buyer/Customer Guide** - How to browse and purchase
**📖 AI Farming Guides** - How "Guide Me" works
**🏪 Marketplace** - Selling and buying products

**Quick questions you can ask:**
- "How do I register as a farmer?"
- "What can buyers do on AHub?"
- "Tell me about AI farming guides"
- "How do I list products for sale?"

Just click a quick action below or type your question!`
    }

    return `I'm here to help you understand AHub! You can ask me about:

- **Getting started** as a farmer or buyer
- **AI farming guides** (Guide Me feature)
- **Marketplace** for buying/selling produce
- **Features** for farmers and buyers

Try clicking one of the quick action buttons below, or type your question!`
  }

  // Position styles
  const positionStyles = {
    "bottom-right": { bottom: "24px", right: "24px" },
    "bottom-left": { bottom: "24px", left: "24px" },
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-white font-medium shadow-xl hover:bg-emerald-700 transition-all duration-300 hover:shadow-2xl"
          style={positionStyles[position]}
          aria-label="Open AHub Assistant"
        >
          <Sparkles className="w-5 h-5" />
          <span className="hidden sm:inline">Assistant</span>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div
          ref={widgetRef}
          className="fixed z-50 flex flex-col w-[380px] max-w-[calc(100vw-48px)] rounded-2xl shadow-2xl overflow-hidden"
          style={{
            ...positionStyles[position],
            top: "auto",
            maxHeight: "calc(100vh - 48px)",
            backgroundColor: COLORS.bgMain,
            border: `1px solid ${COLORS.borderSubtle}`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: `${COLORS.accent}20` }}>
                <Sparkles className="w-5 h-5" style={{ color: COLORS.accent }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: COLORS.textPrimary }}>{title}</h3>
                <p className="text-xs" style={{ color: COLORS.textMuted }}>{subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-emerald-50 transition-colors"
              style={{ color: COLORS.textMuted }}
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: "400px", backgroundColor: COLORS.bgCard }}>
            {messages.length === 0 && showQuickActions && (
              <div className="space-y-3">
                <p className="text-sm font-medium" style={{ color: COLORS.textSecondary }}>How can I help you?</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="p-3 rounded-xl text-left text-xs border transition-all hover:shadow-md"
                      style={{
                        borderColor: COLORS.borderSubtle,
                        backgroundColor: COLORS.bgInput,
                        color: COLORS.textPrimary,
                      }}
                    >
                      <action.icon className="w-4 h-4 mb-1" style={{ color: COLORS.accent }} />
                      <span className="font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${COLORS.accent}20` }}>
                    <Sparkles className="w-4 h-4" style={{ color: COLORS.accent }} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "rounded-br-md"
                      : "rounded-bl-md"
                  }`}
                  style={{
                    backgroundColor: msg.role === "user" ? COLORS.accent : COLORS.bgInput,
                    color: msg.role === "user" ? "#FFFFFF" : COLORS.textPrimary,
                    border: `1px solid ${msg.role === "user" ? COLORS.accent : COLORS.borderSubtle}`,
                  }}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: COLORS.accent }}>
                    U
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: `${COLORS.accent}20` }}>
                  <Sparkles className="w-4 h-4" style={{ color: COLORS.accent }} />
                </div>
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md text-sm" style={{ backgroundColor: COLORS.bgInput, color: COLORS.textMuted }}>
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-transparent border-t-emerald-500 rounded-full animate-spin" />
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t" style={{ borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard }}>
            <div className="flex items-center gap-2">
              <input
                ref={textareaRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about AHub..."
                className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none transition-colors"
                style={{
                  backgroundColor: COLORS.bgInput,
                  border: `1px solid ${COLORS.borderSubtle}`,
                  color: COLORS.textPrimary,
                }}
                disabled={isLoading}
                aria-label="Type your question"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: inputValue.trim() ? COLORS.accent : COLORS.borderSubtle,
                  color: inputValue.trim() ? "#FFFFFF" : COLORS.textMuted,
                }}
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px]" style={{ color: COLORS.textMuted }}>
              AI responses may contain errors. Verify important info.
            </p>
          </form>
        </div>
      )}
    </>
  )
}