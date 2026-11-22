import React, { useState } from "react"
import { PORTAL_CONFIGS, PortalType } from "../shared"
import { t } from "../lib/i18n.js"
import { authApi } from "../lib/authApi"
import { getPortalWelcome } from "./portalWelcome"
import { getDistricts, getSectors, PROVINCES } from "../data/rwandaAdmin"

interface PortalRegisterProps {
  portal: PortalType
  onNavigate: (path: string) => void
}

export const PortalRegister: React.FC<PortalRegisterProps> = ({
  portal,
  onNavigate,
}) => {
  const config = PORTAL_CONFIGS[portal]
  const story = getPortalWelcome(portal, "register")
  const [fullName, setFullName] = useState("")
  const [contact, setContact] = useState("")
  const [email, setEmail] = useState("")
  const [position, setPosition] = useState("")
  const [province, setProvince] = useState("")
  const [district, setDistrict] = useState("")
  const [sector, setSector] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [customerType, setCustomerType] = useState("household")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isOfficial = ([
    PortalType.RAB,
    PortalType.PROVINCE,
    PortalType.DISTRICT,
    PortalType.SECTOR,
    PortalType.NSG,
  ] as PortalType[]).includes(portal)
  const hasProvinceField = ([
    PortalType.PROVINCE,
    PortalType.DISTRICT,
    PortalType.SECTOR,
  ] as PortalType[]).includes(portal)
  const hasDistrictField = ([
    PortalType.DISTRICT,
    PortalType.SECTOR,
  ] as PortalType[]).includes(portal)
  const hasSectorField = portal === PortalType.SECTOR

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setError("")
    setLoading(true)
    try {
      await authApi("/register", {
        role: portal,
        fullName,
        email,
        phone: contact,
        password,
        province,
        district,
        sector,
        regionScope:
          portal === PortalType.RAB || portal === PortalType.NSG
            ? "national"
            : sector || district || province,
        parentRegionScope: hasSectorField
          ? district
          : hasDistrictField
            ? province
            : "national",
        position,
      })
      setLoading(false)
      setSubmitted(true)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to submit your account request.",
      )
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

          <h2>
            {portal === PortalType.CUSTOMER
              ? "Customer Self-Registration"
              : portal === PortalType.FARMER
                ? "Farmer Registration"
                : `Apply for ${t(config.titleKey)} Account`}
          </h2>

          {config.parentApprovalRequired && (
            <div className="approval-notice-box" role="status">
              <span className="icon">🛡️</span>
              <div>
                <strong>Hierarchical Approval Required</strong>
                <p>
                  {portal === PortalType.RAB
                    ? "RAB requires NSG approval and a secure national admin handoff."
                    : portal === PortalType.PROVINCE
                      ? "Province accounts are approved by RAB Admin."
                      : portal === PortalType.DISTRICT
                        ? "District accounts are approved by the assigned Province Veterinary Officer."
                        : portal === PortalType.SECTOR
                          ? "Sector accounts are approved by the assigned District Veterinary Officer."
                          : "Farmer accounts are approved by the assigned Sector Veterinary Officer."}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="auth-error-banner" role="alert">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <strong>
                {portal === PortalType.CUSTOMER
                  ? "Account created."
                  : portal === PortalType.FARMER
                    ? "Account created."
                    : "Account request submitted."}
              </strong>
              <p className="mt-2">
                {portal === PortalType.CUSTOMER
                  ? "Your account is ready. Sign in with the email or phone number and password you just registered."
                  : portal === PortalType.FARMER
                    ? "Your farmer account is ready. Sign in with the email or phone number and password you just registered."
                    : "Your request has been sent to the relevant parent authority for approval. After approval, use the access code to activate your account."}
              </p>
              <button
                className="primary-button dark mt-4"
                type="button"
                onClick={() => onNavigate(config.loginPath)}
              >
                Continue to sign in →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label>
                <span>Full Name</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <label>
                <span>Phone Number</span>
                <input
                  type="tel"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+250 788 000 000"
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              {isOfficial && (
                <>
                  <label>
                    <span>Position / Role Title</span>
                    <input
                      type="text"
                      required
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </label>
                </>
              )}

              {hasProvinceField && (
                <label>
                  <span>Province</span>
                  <select
                    required
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value)
                      setDistrict("")
                      setSector("")
                    }}
                  >
                    <option value="">Select province...</option>
                    {PROVINCES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {hasDistrictField && (
                <label>
                  <span>District</span>
                  <select
                    required
                    value={district}
                    disabled={!province}
                    onChange={(e) => {
                      setDistrict(e.target.value)
                      setSector("")
                    }}
                  >
                    <option value="">
                      {province
                        ? "Select district..."
                        : "Select a province first"}
                    </option>
                    {getDistricts(province).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {hasSectorField && (
                <label>
                  <span>Sector</span>
                  <select
                    required
                    value={sector}
                    disabled={!district}
                    onChange={(e) => setSector(e.target.value)}
                  >
                    <option value="">
                      {district
                        ? "Select sector..."
                        : "Select a district first"}
                    </option>
                    {getSectors(province, district).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {portal === PortalType.CUSTOMER && (
                <label>
                  <span>Customer / Buyer Type</span>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                  >
                    <option value="household">Household Consumer</option>
                    <option value="retailer">Retailer / Market Vendor</option>
                    <option value="restaurant_hotel">
                      Restaurant / Hotel / Hospitality
                    </option>
                    <option value="processor">Food Processor / Factory</option>
                    <option value="exporter">Agricultural Exporter</option>
                  </select>
                </label>
              )}

              {(portal === PortalType.CUSTOMER ||
                portal === PortalType.FARMER) && (
                <>
                  <label>
                    <span>Password</span>
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
                      minLength={8}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </label>
                </>
              )}

              {isOfficial && (
                <>
                  <label>
                    <span>Create Password</span>
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
                      minLength={8}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </label>
                </>
              )}

              <button
                className="primary-button dark mt-2"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Submitting..."
                  : config.parentApprovalRequired
                    ? "Submit Account Request"
                    : "Complete Registration"}{" "}
                →
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
