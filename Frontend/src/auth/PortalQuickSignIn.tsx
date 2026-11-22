import React, { useState } from "react"
import { ArrowRight, ShieldCheck, Building2, MapPin } from "lucide-react"
import { Navbar } from "../components/Navbar"
import { ChatbotWidget } from "../components/ChatbotWidget"
import { authApi, type AuthResult } from "../lib/authApi"

type RoleOption = "" | "farmer" | "customer" | "sector" | "district" | "province" | "rab" | "nsg"

interface PortalQuickSignInProps {
  onSuccess: (portal: string) => void
  onNavigate: (path: string) => void
}

export const PortalQuickSignIn: React.FC<PortalQuickSignInProps> = ({
  onSuccess,
  onNavigate,
}) => {
  const [portal, setPortal] = useState<RoleOption>("")
  const [contact, setContact] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!portal) {
      setError("Please select your portal role to continue.")
      return
    }

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
        throw new Error("Sign in failed. Please check your credentials.")
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

  return (
    <main className="public-register-page public-sign-in-page min-h-screen text-slate-800">
      <Navbar onNavigate={onNavigate} />
      <div className="public-register-shell">
        <section className="public-register-intro">
          <span className="public-register-watermark" aria-hidden="true">
            AHub
          </span>
          <p className="public-register-eyebrow">
            <span /> AHub · Welcome back
          </p>
          <h1>
            Your workspace is <em>waiting.</em>
          </h1>
          <p className="public-register-lede">
            Sign in to access your customized portal—whether you are managing
            farm work, operating in local markets, or coordinating regional
            agricultural services.
          </p>
          <div
            className="public-register-points"
            aria-label="Portal highlights"
          >
            <span>
              <b>01</b> Farmer & Marketplace
            </span>
            <span>
              <b>02</b> Veterinary Authorities
            </span>
            <span>
              <b>03</b> National Security & RAB
            </span>
          </div>
          <p className="public-register-caption">
            One unified platform for Rwanda's agricultural ecosystem.
          </p>
        </section>

        <section
          className="public-register-content"
          aria-labelledby="sign-in-heading"
        >
          <p className="public-register-form-kicker">Secure sign-in</p>
          <h2 id="sign-in-heading">Sign in to AHub</h2>
          <p className="public-register-form-copy">
            Select your account role and enter your registered credentials.
          </p>

          <div className="auth-form public-register-fields-form">
            <form onSubmit={handleSubmit} className="public-register-form">
              {error && (
                <div className="auth-error-banner" role="alert">
                  {error}
                </div>
              )}

              <label>
                <span>Select your portal role</span>
                <select
                  required
                  value={portal}
                  onChange={(event) =>
                    setPortal(event.target.value as RoleOption)
                  }
                >
                  <option value="" disabled>
                    Choose your role...
                  </option>
                  <option value="farmer">Farmer Workspace</option>
                  <option value="customer">Customer Marketplace</option>
                  <option value="sector">
                    Sector Veterinary Officer (/sector-vet)
                  </option>
                  <option value="district">
                    District Veterinary Officer (/district-vet)
                  </option>
                  <option value="province">
                    Province Veterinary Officer (/province-vet)
                  </option>
                  <option value="rab">
                    RAB Administrator (/login/RAB@aDmin)
                  </option>
                  <option value="nsg">Security Admin (/NSGtopsec)</option>
                </select>
              </label>

              <label>
                <span>Email or Phone Number</span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="name@example.com or +250…"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
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
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <button
                className="primary-button dark mt-2"
                type="submit"
                disabled={loading}
              >
                {loading ? "Authenticating…" : "Sign In"}{" "}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">
              Direct Authority Portal Links:
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={() => onNavigate("/login/RAB@aDmin")}
                className="text-emerald-700 hover:underline"
              >
                RAB Admin
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => onNavigate("/province-vet")}
                className="text-emerald-700 hover:underline"
              >
                Province Vet
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => onNavigate("/district-vet")}
                className="text-emerald-700 hover:underline"
              >
                District Vet
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => onNavigate("/sector-vet")}
                className="text-emerald-700 hover:underline"
              >
                Sector Vet
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => onNavigate("/NSGtopsec")}
                className="text-emerald-700 hover:underline"
              >
                NSG Security
              </button>
            </div>
          </div>

          <p className="public-register-signin mt-4">
            Need a new account?{" "}
            <button type="button" onClick={() => onNavigate("/get-started")}>
              Get Started
            </button>
          </p>
        </section>
        <ChatbotWidget position="bottom-right" title="AHub Assistant" subtitle="Ask me about signing in or AHub" />
      </div>
    </main>
  )
}
