import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Send,
  Paperclip,
  Brain,
  Globe,
  ChevronLeft,
  Loader2,
  Clock,
  Menu,
  X,
  Trash2,
  Edit2,
  Check,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Gift,
  PanelLeft,
  Image as ImageIcon,
  BookOpen,
  Puzzle,
  Compass,
  Mic,
  Sparkles,
  ChevronRight,
  FolderGit2,
  Sprout,
} from "lucide-react"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  rating?: "like" | "dislike" | null
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "ahub_chat_sessions_v2"
const LAST_ACTIVITY_KEY = "ahub_chat_last_opened"

const SUGGESTION_PROMPTS = [
  {
    icon: Gift,
    title: "Agricultural Loans",
    prompt: "How can I apply for crop insurance and farming loans in Rwanda?",
  },
  {
    icon: Sprout,
    title: "Crop Disease Advice",
    prompt: "What are common signs and treatments for maize fall armyworm?",
  },
  {
    icon: Globe,
    title: "Market Prices",
    prompt: "What are the latest potato and cassava prices in local Rwandan markets?",
  },
  {
    icon: Compass,
    title: "Planting Season",
    prompt: "Which crops are recommended for Season A planting in Eastern Province?",
  },
]

// Project color palette (Dark Emerald Theme matching AHub)
const COLORS = {
  bgMain: "#0A1A12",
  bgSidebar: "#0D2218",
  bgCard: "#123D30",
  bgInput: "#133A2B",
  bgHover: "#1B4D3A",
  bgActive: "#1E5D3D",
  borderMain: "#27875B",
  borderSubtle: "#184734",
  accent: "#10B981",
  accentGlow: "rgba(16, 185, 129, 0.35)",
  accentHover: "#059669",
  textPrimary: "#FFFFFF",
  textSecondary: "#A8D5BA",
  textMuted: "#6B9B7B",
  textPlaceholder: "#4E7A5E",
  blueButton: "#2563EB",
}

export function AIChat() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showDeepThink, setShowDeepThink] = useState(false)
  const [showSearchMode, setShowSearchMode] = useState(false)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchInput, setShowSearchInput] = useState(false)

  // 24-hour inactivity check state
  const [is24hInactivityWindow, setIs24hInactivityWindow] = useState<boolean>(() => {
    try {
      const lastOpenedStr = localStorage.getItem(LAST_ACTIVITY_KEY)
      if (!lastOpenedStr) return true
      const lastOpened = parseInt(lastOpenedStr, 10)
      const now = Date.now()
      const hoursDiff = (now - lastOpened) / (1000 * 60 * 60)
      return hoursDiff >= 24
    } catch {
      return true
    }
  })
  const [isNewChatClicked, setIsNewChatClicked] = useState<boolean>(false)

  // Update activity timestamp when AI Chat is opened
  useEffect(() => {
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
    } catch {
      // ignore
    }
  }, [])

  // Editing session title state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitleText, setEditingTitleText] = useState("")

  // Editing message state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageText, setEditingMessageText] = useState("")

  // Feedback states
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null,
  )
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(
    null,
  )

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sidebarRef = useRef<HTMLAsideElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const getToken = useCallback(() => localStorage.getItem("ahub_token"), [])

  // Fetch logged in user info
  const getUserName = useCallback(() => {
    try {
      const userStr = localStorage.getItem("ahub_user")
      if (userStr) {
        const user = JSON.parse(userStr)
        return user.fullName || user.name || user.username || "Farmer"
      }
    } catch {
      // ignore
    }
    return "Guest"
  }, [])

  const userName = getUserName()
  const userFirstName = userName.split(" ")[0] || "Farmer"

  const getUserInitials = (name: string) => {
    if (!name || name === "Guest") return "AH"
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const userInitials = getUserInitials(userName)

  // Load sessions from localStorage & sync backend
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved)
        setSessions(parsed)
        if (parsed.length > 0 && !activeSessionId) {
          setActiveSessionId(parsed[0].id)
        }
      }
    } catch (e) {
      console.error("Failed to load local chat sessions:", e)
    }
  }, [])

  // Save sessions to localStorage
  const saveSessions = useCallback((updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions))
    } catch (e) {
      console.error("Failed to save chat sessions:", e)
    }
  }, [])

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [sessions, activeSessionId, isLoading])

  // Focus rename input
  useEffect(() => {
    if (editingSessionId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [editingSessionId])

  // Close mobile sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setMobileSidebarOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [mobileSidebarOpen])

  // Get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null
  const currentMessages = activeSession ? activeSession.messages : []

  // Create New Chat
  const handleNewChat = () => {
    const newSessionId = `chat_${Date.now()}`
    const newSession: ChatSession = {
      id: newSessionId,
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveSessions([newSession, ...sessions])
    setActiveSessionId(newSessionId)
    setInputValue("")
    setIsNewChatClicked(true) // Ensure prompt cards do NOT appear on New Chat
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  // Delete a Chat Session
  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const updated = sessions.filter((s) => s.id !== sessionId)
    saveSessions(updated)
    if (activeSessionId === sessionId) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : null)
    }
    setOpenMenuSessionId(null)
  }

  // Start Renaming Chat Session
  const handleStartRename = (session: ChatSession, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingSessionId(session.id)
    setEditingTitleText(session.title)
    setOpenMenuSessionId(null)
  }

  // Save Renamed Chat Title
  const handleSaveRename = (sessionId: string) => {
    const trimmed = editingTitleText.trim()
    if (trimmed) {
      const updated = sessions.map((s) =>
        s.id === sessionId
          ? { ...s, title: trimmed, updatedAt: new Date().toISOString() }
          : s,
      )
      saveSessions(updated)
    }
    setEditingSessionId(null)
  }

  // Send Message logic
  const sendPromptToBackend = async (
    promptText: string,
    targetSessionId: string,
    isRetry = false,
  ) => {
    const token = getToken()
    if (!token) {
      setShowAuthPrompt(true)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/operations/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: promptText }),
      })

      const data = await response.json()
      const answerContent =
        data.data?.answer ||
        data.message ||
        "Sorry, I could not generate a response. Please try again."

      const assistantMsg: ChatMessage = {
        id: `msg_asst_${Date.now()}`,
        role: "assistant",
        content: answerContent,
        createdAt: new Date().toISOString(),
      }

      setSessions((prevSessions) => {
        const next = prevSessions.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: [...s.messages, assistantMsg],
              updatedAt: new Date().toISOString(),
            }
          }
          return s
        })
        saveSessions(next)
        return next
      })
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: "Connection error. Please check your network and try again.",
        createdAt: new Date().toISOString(),
      }
      setSessions((prevSessions) => {
        const next = prevSessions.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: [...s.messages, errorMsg],
              updatedAt: new Date().toISOString(),
            }
          }
          return s
        })
        saveSessions(next)
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Unified Submit Prompt Handler (For both typing and clicking prompt cards)
  const submitPrompt = async (promptText: string) => {
    const text = promptText.trim()
    if (!text || isLoading) return

    // Update 24h activity timestamp
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
    } catch {
      // ignore
    }

    let targetId = activeSessionId
    let currentSession = sessions.find((s) => s.id === targetId)

    if (!targetId || !currentSession) {
      targetId = `chat_${Date.now()}`
      const titleSnippet =
        text.length > 32 ? text.substring(0, 32) + "..." : text
      currentSession = {
        id: targetId,
        title: titleSnippet,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      saveSessions([currentSession, ...sessions])
      setActiveSessionId(targetId)
    } else if (
      currentSession.messages.length === 0 &&
      currentSession.title === "New Chat"
    ) {
      const titleSnippet =
        text.length > 32 ? text.substring(0, 32) + "..." : text
      currentSession.title = titleSnippet
    }

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    }

    // Append user message immediately
    setSessions((prevSessions) => {
      const next = prevSessions.map((s) => {
        if (s.id === targetId) {
          return {
            ...s,
            title:
              s.messages.length === 0
                ? text.length > 32
                  ? text.substring(0, 32) + "..."
                  : text
                : s.title,
            messages: [...s.messages, userMsg],
            updatedAt: new Date().toISOString(),
          }
        }
        return s
      })
      saveSessions(next)
      return next
    })

    setInputValue("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    await sendPromptToBackend(text, targetId)
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (inputValue.trim()) {
      await submitPrompt(inputValue)
    }
  }

  // Edit User Question
  const handleSaveEditQuestion = async (msgId: string) => {
    const newText = editingMessageText.trim()
    if (!newText || !activeSessionId || isLoading) return

    const currentSess = sessions.find((s) => s.id === activeSessionId)
    if (!currentSess) return

    const msgIndex = currentSess.messages.findIndex((m) => m.id === msgId)
    if (msgIndex === -1) return

    // Truncate messages up to the edited user question
    const updatedMessages = currentSess.messages.slice(0, msgIndex)

    const editedUserMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: newText,
      createdAt: new Date().toISOString(),
    }

    const newMessages = [...updatedMessages, editedUserMsg]

    const nextSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? { ...s, messages: newMessages, updatedAt: new Date().toISOString() }
        : s,
    )

    saveSessions(nextSessions)
    setEditingMessageId(null)
    setEditingMessageText("")

    await sendPromptToBackend(newText, activeSessionId, true)
  }

  // Copy message text
  const handleCopy = (content: string, msgId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(msgId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  // Regenerate Response
  const handleRegenerate = async (asstMsgIndex: number) => {
    if (!activeSessionId || isLoading) return
    const currentSess = sessions.find((s) => s.id === activeSessionId)
    if (!currentSess) return

    // Find previous user message
    let prevUserMsgText = ""
    for (let i = asstMsgIndex - 1; i >= 0; i--) {
      if (currentSess.messages[i].role === "user") {
        prevUserMsgText = currentSess.messages[i].content
        break
      }
    }

    if (!prevUserMsgText) return

    // Remove the old assistant answer
    const newMessages = currentSess.messages.filter(
      (_, idx) => idx !== asstMsgIndex,
    )
    const updatedSessions = sessions.map((s) =>
      s.id === activeSessionId ? { ...s, messages: newMessages } : s,
    )
    saveSessions(updatedSessions)

    await sendPromptToBackend(prevUserMsgText, activeSessionId, true)
  }

  // Toggle rating
  const handleToggleRating = (
    msgId: string,
    ratingType: "like" | "dislike",
  ) => {
    if (!activeSessionId) return
    const updated = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: s.messages.map((m) => {
            if (m.id === msgId) {
              const newRating = m.rating === ratingType ? null : ratingType
              return { ...m, rating: newRating }
            }
            return m
          }),
        }
      }
      return s
    })
    saveSessions(updated)
  }

  // Speech synthesis toggle
  const handleSpeak = (content: string, msgId: string) => {
    if ("speechSynthesis" in window) {
      if (speakingMessageId === msgId) {
        window.speechSynthesis.cancel()
        setSpeakingMessageId(null)
      } else {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(content)
        utterance.onend = () => setSpeakingMessageId(null)
        window.speechSynthesis.speak(utterance)
        setSpeakingMessageId(msgId)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const adjustHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
  }

  // Filter sessions by search query
  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  )

  return (
    <div
      className="flex h-full w-full min-h-[550px] text-white font-sans overflow-hidden relative rounded-2xl"
      style={{ backgroundColor: COLORS.bgMain }}
    >
      {/* Mobile sidebar toggle */}
      <button
        className="absolute top-3 left-3 z-30 lg:hidden p-2 rounded-lg text-white"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        style={{ backgroundColor: COLORS.bgCard }}
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar - ChatGPT Style */}
      <aside
        ref={sidebarRef}
        className={`h-full z-10 flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
          sidebarOpen ? "w-[260px]" : "w-[56px]"
        } ${
          mobileSidebarOpen
            ? "absolute inset-y-0 left-0 z-30 w-[260px]"
            : "hidden sm:flex"
        }`}
        style={{
          backgroundColor: COLORS.bgSidebar,
          borderRight: `1px solid ${COLORS.borderSubtle}`,
        }}
      >
        {/* Mobile close button */}
        <button
          className="lg:hidden absolute top-3 right-3 z-50 p-1.5 rounded-lg text-white"
          onClick={() => setMobileSidebarOpen(false)}
          style={{ backgroundColor: COLORS.bgCard }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Sidebar Header */}
        <div className="flex items-center justify-between h-[56px] px-3 border-b border-[#184734]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentHover} 100%)`,
              }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-base text-white tracking-wide">
                AHub
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="p-1.5 rounded-lg hover:bg-[#1B4D3A] text-[#6B9B7B] hover:text-white transition-colors"
              title="Search chats"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-[#1B4D3A] text-[#6B9B7B] hover:text-white transition-colors"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar input toggle */}
        {sidebarOpen && showSearchInput && (
          <div className="px-3 pt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full bg-[#133A2B] text-white text-xs px-3 py-1.5 rounded-lg outline-none border border-[#27875B] placeholder-[#4E7A5E]"
            />
          </div>
        )}

        {/* New Chat Pill Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-left group border border-transparent hover:border-[#27875B]"
            style={{ backgroundColor: COLORS.bgCard }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = COLORS.bgHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = COLORS.bgCard)
            }
          >
            <Plus className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            {sidebarOpen && (
              <span className="font-medium text-sm text-white">New chat</span>
            )}
          </button>
        </div>

        {/* AHub Standard Navigation Options */}
        {sidebarOpen && (
          <div className="px-3 py-1 space-y-0.5 text-xs text-[#A8D5BA] border-b border-[#184734] pb-2">
            <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#1B4D3A] transition-colors text-left">
              <ImageIcon className="w-4 h-4 text-[#6B9B7B]" />
              <span>Images</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#1B4D3A] transition-colors text-left">
              <Compass className="w-4 h-4 text-[#6B9B7B]" />
              <span>Explore</span>
            </button>
            <div className="pt-1 text-[11px] font-semibold text-[#6B9B7B] uppercase px-3 tracking-wider flex items-center gap-1 cursor-pointer hover:text-white">
              <span>Projects</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        )}

        {/* History / Recents Section */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sidebarOpen && (
            <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6B9B7B]">
              Recents
            </p>
          )}
          <ul className="space-y-0.5">
            {filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId
              const isEditing = editingSessionId === session.id

              return (
                <li key={session.id} className="relative group">
                  {isEditing ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#133A2B] rounded-lg border border-[#27875B]">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={editingTitleText}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(session.id)
                          if (e.key === "Escape") setEditingSessionId(null)
                        }}
                        className="w-full bg-transparent text-xs text-white outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(session.id)}
                        className="p-1 hover:text-emerald-400 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingSessionId(null)}
                        className="p-1 hover:text-red-400 text-gray-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setActiveSessionId(session.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isActive
                          ? "bg-[#1E5D3D] text-white font-medium"
                          : "text-[#A8D5BA] hover:bg-[#1B4D3A] hover:text-white"
                      }`}
                    >
                      <span className="truncate pr-2">{session.title}</span>

                      {/* Action buttons on hover */}
                      {sidebarOpen && (
                        <div
                          className={`flex items-center gap-1 ${
                            isActive
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          } transition-opacity`}
                        >
                          <button
                            onClick={(e) => handleStartRename(session, e)}
                            className="p-1 text-[#6B9B7B] hover:text-white hover:bg-[#123D30] rounded transition-colors"
                            title="Rename chat"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="p-1 text-[#6B9B7B] hover:text-red-400 hover:bg-[#123D30] rounded transition-colors"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}

            {filteredSessions.length === 0 && sidebarOpen && (
              <div className="px-3 py-4 text-center text-xs text-[#6B9B7B]">
                No recents found
              </div>
            )}
          </ul>
        </div>

        {/* Bottom User Profile Section - Matching ChatGPT */}
        <div
          className="p-3 border-t border-[#184734]"
          style={{ backgroundColor: COLORS.bgSidebar }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentHover} 100%)`,
                }}
              >
                {userInitials}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {userName}
                  </p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button className="p-1.5 text-[#6B9B7B] hover:text-white rounded-lg hover:bg-[#1B4D3A] transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="absolute inset-0 z-30 lg:hidden bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-[56px] flex items-center justify-between px-6 border-b border-[#184734] bg-[#0A1A12] z-10 shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-[#1B4D3A] text-[#6B9B7B] hover:text-white transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-white truncate">
              {activeSession ? activeSession.title : "AHub Assistant"}
            </h2>
          </div>
        </header>

        {/* Scrollable Chat Viewport */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-3xl flex flex-col items-center flex-1">
            {/* Empty State / Welcome Screen - Only show suggestion cards on first open within 24h inactivity window */}
            {(!currentMessages || currentMessages.length === 0) &&
              !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-8 px-4 w-full">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-xl shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentHover} 100%)`,
                    }}
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs md:text-sm text-[#A8D5BA] max-w-md mb-8">
                    Ask about Rwandan agriculture, crop disease, livestock care, market prices, or farming loans.
                  </p>

                  {/* Suggestion prompt cards: Only appear on 24h inactivity window and NOT on New Chat */}
                  {is24hInactivityWindow && !isNewChatClicked && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                      {SUGGESTION_PROMPTS.map((item, index) => {
                        const IconComp = item.icon
                        return (
                          <button
                            key={index}
                            onClick={() => submitPrompt(item.prompt)}
                            className="p-3.5 rounded-xl bg-[#133A2B] hover:bg-[#1B4D3A] border border-[#27875B]/50 hover:border-[#27875B] transition-all flex flex-col gap-1.5 group text-left shadow-sm cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <IconComp className="w-4 h-4 text-[#10B981] group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-semibold text-white">
                                {item.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#A8D5BA] leading-snug line-clamp-2">
                              "{item.prompt}"
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

            {/* Conversation Messages */}
            <div className="w-full flex flex-col gap-6 my-4">
              {currentMessages.map((msg, idx) => {
                const isUser = msg.role === "user"
                const isEditingThis = editingMessageId === msg.id

                return (
                  <div
                    key={msg.id || idx}
                    className={`flex gap-4 w-full group ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentHover} 100%)`,
                        }}
                      >
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] flex flex-col gap-2 ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Message Content or Edit Textarea */}
                      {isEditingThis ? (
                        <div className="w-full bg-[#133A2B] p-3 rounded-2xl border border-[#27875B] flex flex-col gap-2">
                          <textarea
                            value={editingMessageText}
                            onChange={(e) =>
                              setEditingMessageText(e.target.value)
                            }
                            className="w-full bg-transparent text-white text-sm outline-none resize-none min-h-[80px]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-3 py-1 text-xs rounded-lg bg-[#123D30] text-[#A8D5BA] hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditQuestion(msg.id)}
                              className="px-3 py-1 text-xs rounded-lg font-medium text-black"
                              style={{ backgroundColor: COLORS.accent }}
                            >
                              Save & Submit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? "bg-[#133A2B] text-white rounded-br-sm border border-[#27875B]"
                              : "bg-transparent text-white border border-[#184734]"
                          }`}
                        >
                          {msg.content}
                        </div>
                      )}

                      {/* Message Toolbar Actions */}
                      {!isEditingThis && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#6B9B7B] px-1">
                          {isUser ? (
                            <button
                              onClick={() => {
                                setEditingMessageId(msg.id)
                                setEditingMessageText(msg.content)
                              }}
                              className="p-1 hover:text-white hover:bg-[#123D30] rounded"
                              title="Edit question"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleCopy(msg.content, msg.id)}
                                className="p-1 hover:text-white hover:bg-[#123D30] rounded transition-colors"
                                title="Copy response"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => handleRegenerate(idx)}
                                className="p-1 hover:text-white hover:bg-[#123D30] rounded transition-colors"
                                title="Regenerate answer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  handleToggleRating(msg.id, "like")
                                }
                                className={`p-1 hover:text-white hover:bg-[#123D30] rounded transition-colors ${
                                  msg.rating === "like"
                                    ? "text-emerald-400"
                                    : ""
                                }`}
                                title="Good response"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  handleToggleRating(msg.id, "dislike")
                                }
                                className={`p-1 hover:text-white hover:bg-[#123D30] rounded transition-colors ${
                                  msg.rating === "dislike" ? "text-red-400" : ""
                                }`}
                                title="Bad response"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleSpeak(msg.content, msg.id)}
                                className={`p-1 hover:text-white hover:bg-[#123D30] rounded transition-colors ${
                                  speakingMessageId === msg.id
                                    ? "text-emerald-400"
                                    : ""
                                }`}
                                title="Read aloud"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-md"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentHover} 100%)`,
                        }}
                      >
                        {userInitials}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex gap-4 w-full">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentHover} 100%)`,
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="bg-[#123D30] px-4 py-3 rounded-2xl border border-[#184734] flex items-center gap-3 text-xs text-[#A8D5BA]">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>AHub Assistant is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Floating Input Box - Matching exact ChatGPT layout from user screenshot */}
        <div className="w-full pb-6 px-4 flex justify-center bg-[#0A1A12]">
          <div className="w-full max-w-3xl flex flex-col gap-2">
            <form onSubmit={handleSend} className="relative w-full">
              <div
                className="relative rounded-2xl border bg-[#133A2B] transition-all flex items-center px-4 py-2 shadow-2xl focus-within:border-[#27875B]"
                style={{ borderColor: COLORS.borderMain }}
              >
                {/* Left Attach Button */}
                <button
                  type="button"
                  className="p-1.5 text-[#6B9B7B] hover:text-white rounded-full hover:bg-[#1B4D3A] transition-colors mr-2 shrink-0 self-center"
                  title="Attach file"
                >
                  <Plus className="w-5 h-5" />
                </button>

                {/* Input Field - Multiline Textarea */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    adjustHeight(e)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask AHub Assistant..."
                  className="w-full bg-transparent border-none outline-none text-white placeholder-[#5A8A6A] text-sm py-1.5 resize-none max-h-[140px] overflow-y-auto leading-relaxed"
                  disabled={isLoading}
                />

                {/* Right controls inside pill input - Matching Image layout */}
                <div className="flex items-center gap-2 ml-2 shrink-0 self-center">
                  {/* DeepThink toggle */}
                  <button
                    type="button"
                    onClick={() => setShowDeepThink(!showDeepThink)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      showDeepThink
                        ? "bg-emerald-400 text-black font-semibold shadow-lg"
                        : "bg-[#123D30] text-white border border-[#184734] hover:bg-[#1B4D3A]"
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Think</span>
                  </button>

                  {/* Mic icon */}
                  <button
                    type="button"
                    onClick={() => setIsVoiceActive(!isVoiceActive)}
                    className={`p-2 rounded-full transition-colors ${
                      isVoiceActive
                        ? "text-emerald-400 bg-[#123D30]"
                        : "text-[#6B9B7B] hover:text-white"
                    }`}
                    title="Voice input"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  {/* Send or Voice Waveform button */}
                  <button
                    type="submit"
                    disabled={!inputValue.trim() && !isLoading}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      inputValue.trim()
                        ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg"
                        : "bg-[#2563EB] text-white hover:bg-blue-600"
                    }`}
                    title={inputValue.trim() ? "Send message" : "Voice mode"}
                  >
                    {inputValue.trim() ? (
                      <Send className="w-4 h-4" />
                    ) : (
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="w-0.5 h-3 bg-white rounded-full animate-bounce" />
                        <span className="w-0.5 h-4 bg-white rounded-full animate-bounce delay-100" />
                        <span className="w-0.5 h-2 bg-white rounded-full animate-bounce delay-200" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowAuthPrompt(false)}
        >
          <div
            className="bg-[#123D30] rounded-2xl p-6 max-w-md w-full mx-4 border border-[#27875B]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl mb-4 mx-auto"
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentHover} 100%)`,
              }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2">
              Sign in required
            </h2>
            <p className="text-center text-sm text-[#A8D5BA] mb-6">
              Please sign in to chat with AHub Assistant. Your conversations will
              be saved to your account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAuthPrompt(false)
                  window.location.href = "/get-started"
                }}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm text-black transition-colors"
                style={{ backgroundColor: COLORS.accent }}
              >
                Sign In
              </button>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm text-[#A8D5BA] transition-colors border border-[#184734]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
