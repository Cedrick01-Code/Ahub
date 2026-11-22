import React, { useState } from "react"
import { PORTAL_CONFIGS, PortalType } from "../shared"
import { authApi, type AuthResult } from "../lib/authApi"
import { getPortalWelcome } from "./portalWelcome"

export interface PortalActivateProps {
  portal: PortalType
  onNavigate: (path: string) => void
  onActivated: (portal: string) => void
}

export { PORTAL_CONFIGS, PortalType }

export const PortalActivate: React.FC<PortalActivateProps> = ({
  portal,
  onNavigate,
  onActivated,
}) => {
  const config = PORTAL_CONFIGS[portal]
  const story = getPortalWelcome(portal, "activate")
  const [contact, setContact] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setError("")
    setLoading(true)
    try {
      const data = await authApi<AuthResult>("/activate", {
        role: portal,
        email: contact.includes("@") ? contact : undefined,
        phone: contact.includes("@") ? undefined : contact,
        accessCode,
        password,
      })
      onActivated(portal)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to activate this account.",
      )
    } finally {
      setLoading(false)
    }
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
            type="button"
            className="back-link"
            onClick={() => onNavigate(config.loginPath)}
          >
            ← Back Login
          </button>

          <h2>Activate Approved Account</h2>
          <p className="auth-subtitle">
            If your account request was approved by your parent authority, enter
            your access code below.
          </p>

          {error && (
            <div className="auth-error-banner" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyCode}>
            <label>
              <span>Registered Phone Number or Email</span>
              <input
                type="text"
                required
                placeholder="+250 7XX XXX XXX or officer@gov.rw"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </label>

            <label>
              <span>Access Code</span>
              <input
                type="text"
                required
                maxLength={16}
                placeholder="e.g. AHUB-ABC123"
                className="tracking-widest uppercase font-mono"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              />
            </label>

            <label>
              <span>Create New Password</span>
              <input
                type="password"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label>
              <span>Confirm Password</span>
              <input
                type="password"
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            <button
              className="primary-button dark"
              type="submit"
              disabled={loading}
            >
              {loading ? "Activating..." : "Verify Code & Activate Account"} →
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
