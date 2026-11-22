import React, { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Navbar } from "../components/Navbar"
import { ChatbotWidget } from "../components/ChatbotWidget"
import { authApi } from "../lib/authApi"
import {
  getDistrictsWithProvince,
  getProvinceForDistrict,
  getSectorsForDistrict,
} from "../data/rwandaAdmin"

type PublicRole = "" | "farmer" | "customer"

interface PublicRegisterProps {
  onNavigate: (path: string) => void
}

export const PublicRegister: React.FC<PublicRegisterProps> = ({
  onNavigate,
}) => {
  const [role, setRole] = useState<PublicRole>(() => {
    const path = window.location.pathname.toLowerCase()
    if (path.endsWith("/farmer")) return "farmer"
    if (path.endsWith("/customer")) return "customer"
    return ""
  })
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [district, setDistrict] = useState("")
  const [sector, setSector] = useState("")
  const [customerType, setCustomerType] = useState("household")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!role) {
      setError("Select Farmer or Customer to continue.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setError("")
    setLoading(true)
    try {
      await authApi("/register", {
        role,
        fullName,
        email,
        phone,
        password,
        province: role === "farmer" ? getProvinceForDistrict(district) : "",
        district: role === "farmer" ? district : "",
        sector: role === "farmer" ? sector : "",
        regionScope: role === "farmer" ? sector : "",
        parentRegionScope: role === "farmer" ? district : "",
        customerType: role === "customer" ? customerType : undefined,
      })
      setSubmitted(true)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create your account. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="public-register-page min-h-screen text-slate-800">
      <Navbar onNavigate={onNavigate} />
      <div className="public-register-shell">
        <section className="public-register-intro">
          <span className="public-register-watermark" aria-hidden="true">
            AHub
          </span>
          <p className="public-register-eyebrow">
            <span /> AHub · Rwanda agriculture
          </p>
          <h1>
            Your next season starts <em>here.</em>
          </h1>
          <p className="public-register-lede">
            Create one account to bring your farm online or connect with local
            producers. Choose your role and we’ll guide you through the right
            details.
          </p>
          <div className="public-register-points" aria-label="Account benefits">
            <span>
              <b>01</b> Set up your profile
            </span>
            <span>
              <b>02</b> Access your workspace
            </span>
            <span>
              <b>03</b> Start connecting
            </span>
          </div>
          <p className="public-register-caption">
            A shared space for the people who grow, trade, and nourish Rwanda.
          </p>
        </section>

        <section
          className="public-register-content"
          aria-labelledby="register-heading"
        >
          <p className="public-register-form-kicker">Let’s get started</p>
          <h2 id="register-heading">Create your account</h2>
          <p className="public-register-form-copy">
            Select a role to see the matching signup details.
          </p>

          {submitted ? (
            <section className="public-register-success" role="status">
              <span className="public-register-success-mark" aria-hidden="true">
                ✓
              </span>
              <h3>Your account is ready.</h3>
              <p>
                Sign in with your email or phone number and password to continue
                to your {role} workspace.
              </p>
              <button
                className="primary-button dark mt-5"
                type="button"
                onClick={() => onNavigate("/sign-in")}
              >
                Continue to sign in <ArrowRight size={18} />
              </button>
            </section>
          ) : (
            <div className="auth-form public-register-fields-form">
              <form onSubmit={handleSubmit} className="public-register-form">
                {error && (
                  <div className="auth-error-banner" role="alert">
                    {error}
                  </div>
                )}
                <label>
                  <span>Select role</span>
                  <select
                    required
                    value={role}
                    onChange={(event) => {
                      setRole(event.target.value as PublicRole)
                      setError("")
                    }}
                  >
                    <option value="" disabled>
                      Choose Farmer or Customer
                    </option>
                    <option value="farmer">Farmer</option>
                    <option value="customer">Customer</option>
                  </select>
                </label>

                {role && (
                  <div
                    key={role}
                    className="public-register-fields"
                    aria-live="polite"
                  >
                    <label>
                      <span>Full name</span>
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Phone number</span>
                      <input
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="+250 788 000 000"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </label>

                    {role === "farmer" ? (
                      <>
                        <label>
                          <span>District</span>
                          <select
                            required
                            value={district}
                            onChange={(event) => {
                              setDistrict(event.target.value)
                              setSector("")
                            }}
                          >
                            <option value="">Select your district</option>
                            {getDistrictsWithProvince().map(
                              ({ province, district: districtName }) => (
                                <option
                                  key={`${province}-${districtName}`}
                                  value={districtName}
                                >
                                  {districtName} — {province}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <label>
                          <span>Sector</span>
                          <select
                            required
                            value={sector}
                            disabled={!district}
                            onChange={(event) => setSector(event.target.value)}
                          >
                            <option value="">
                              {district
                                ? "Select your sector"
                                : "Select a district first"}
                            </option>
                            {getSectorsForDistrict(district).map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : (
                      <label>
                        <span>Customer type</span>
                        <select
                          value={customerType}
                          onChange={(event) =>
                            setCustomerType(event.target.value)
                          }
                        >
                          <option value="household">Household</option>
                          <option value="retailer">
                            Retailer or market vendor
                          </option>
                          <option value="restaurant_hotel">
                            Restaurant or hotel
                          </option>
                          <option value="processor">Food processor</option>
                          <option value="exporter">
                            Agricultural exporter
                          </option>
                        </select>
                      </label>
                    )}

                    <label>
                      <span>Password</span>
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Confirm password</span>
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                      />
                    </label>
                    <button
                      className="primary-button dark mt-2"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "Creating account…" : "Create account"}{" "}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {!submitted && (
            <p className="public-register-signin">
              Already have an account?{" "}
              <button type="button" onClick={() => onNavigate("/sign-in")}>
                Sign in
              </button>
            </p>
          )}
        </section>
        <ChatbotWidget position="bottom-right" title="AHub Assistant" subtitle="Ask me about registration or AHub" />
      </div>
    </main>
  )
}
