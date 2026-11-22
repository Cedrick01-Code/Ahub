import React, { useState } from "react"
import { PORTAL_CONFIGS, PortalType } from "../shared"
import { t } from "../lib/i18n.js"
import { authApi, type AuthResult } from "../lib/authApi"
import { PortalRegister } from "./PortalRegister"
import { PublicRegister } from "./PublicRegister"
import { PortalActivate } from "./PortalActivate"
import { getPortalWelcome } from "./portalWelcome"

export interface PortalLoginProps {
  portal: PortalType
  onSuccess: (portal: string) => void
  onNavigate: (path: string) => void
}

export const PortalLogin: React.FC<PortalLoginProps> = ({
  portal,
  onSuccess,
  onNavigate,
}) => {
  const config = PORTAL_CONFIGS[portal]
  const story = getPortalWelcome(portal, "login")
  const [contact, setContact] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"login" | "register" | "activate">(
    "login",
  )

  const isSecurityAdmin = portal === PortalType.NSG
  const canCreateAccount = true

  const navigateFromAuth = (path: string) => {
    if (path === config.loginPath) {
      setActiveTab("login")
      return
    }
    onNavigate(path)
  }

  const tabs = [
    { key: "login", label: "Sign in" },
    { key: "register", label: "Apply for account" },
    ...(config.parentApprovalRequired
      ? [{ key: "activate", label: "Activate code" }]
      : []),
  ]

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await authApi<AuthResult>("/login", {
        role: portal,
        email: contact.includes("@") ? contact : undefined,
        phone: contact.includes("@") ? undefined : contact,
        password,
      })

      if (result.token && result.user) {
        localStorage.setItem("ahub_token", result.token)
        localStorage.setItem("ahub_user", JSON.stringify(result.user))
        onSuccess(portal)
      } else {
        throw new Error(
          "Unable to complete sign-in. Please check your credentials.",
        )
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign in. Please verify your credentials.",
      )
    } finally {
      setLoading(false)
    }
  }

  if (activeTab === "register" && canCreateAccount) {
    if (portal === PortalType.FARMER || portal === PortalType.CUSTOMER) {
      return <PublicRegister onNavigate={navigateFromAuth} />
    }
    return <PortalRegister portal={portal} onNavigate={navigateFromAuth} />
  }

  if (activeTab === "activate" && canCreateAccount) {
    return (
      <PortalActivate
        portal={portal}
        onNavigate={navigateFromAuth}
        onActivated={(nextPortal: string) => {
          const nextConfig = PORTAL_CONFIGS[(nextPortal as PortalType)]
          onNavigate(nextConfig ? nextConfig.loginPath : "/get-started")
        }}
      />
    )
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <button className="brand auth-brand" onClick={() => onNavigate("/")}>
          <span className="brand-mark">🌱</span>
          <span>AHub</span>
        </button>
        <div>
          <span className="kicker light">{story.eyebrow}</span>
          <h1>{story.title}</h1>
          <p>{story.message}</p>
        </div>
        <small>{story.footer}</small>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form">
          <button
            className="back-link"
            onClick={() => onNavigate("/get-started")}
          >
            ← Back to Choose Role
          </button>

          <div className="portal-badge-chip">
            <span className="dot" />
            <strong>{t(config.titleKey)}</strong>
          </div>

          <div className="flex gap-2 rounded-full bg-slate-100 p-1 text-sm font-medium">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveTab(tab.key as "login" | "register" | "activate")
                }
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  activeTab === tab.key
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <h2 className="mt-6">Sign In to {t(config.titleKey)}</h2>
          <p className="auth-subtitle">
            Enter your email or phone number and password to access your
            workspace.
          </p>

          {error && (
            <div className="auth-error-banner" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <label>
              <span>Email or Phone Number</span>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="name@example.com or +250..."
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button
              className="primary-button dark"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Authenticating..."
                : isSecurityAdmin
                  ? "Open Security Workspace"
                  : "Sign In"}{" "}
              →
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
