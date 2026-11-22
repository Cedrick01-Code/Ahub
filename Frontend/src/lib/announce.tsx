import React, { createContext, useContext, useState, useCallback } from "react"

interface ToastContextType {
  announce: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{
    id: number
    message: string
    type: string
  }>>([])

  const announce = useCallback(
    (
      message: string,
      type: "info" | "success" | "warning" | "error" = "info",
    ) => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ announce }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-lg text-white animate-slide-in max-w-sm ${
              toast.type === "success"
                ? "bg-green-600"
                : toast.type === "warning"
                  ? "bg-yellow-600"
                  : toast.type === "error"
                    ? "bg-red-600"
                    : "bg-blue-600"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useAnnounce() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useAnnounce must be used within a ToastProvider")
  }
  return context.announce
}
