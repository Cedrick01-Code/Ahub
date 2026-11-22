import React, { useState } from "react"
import { getLanguage, setLanguage, SupportedLanguage } from "../lib/i18n.js"
import { NotificationBell } from "./NotificationBell"

interface NavbarProps {
  onNavigate: (path: string) => void
  variant?: "default" | "overlay"
  showNotifications?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  variant = "default",
  showNotifications = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [lang, setLang] = useState<SupportedLanguage>(getLanguage())

  const handleLangChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang)
    setLang(newLang)
  }

  return (
    <header
      className={`site-header${
        variant === "overlay" ? " site-header-overlay" : ""
      }`}
    >
      <button
        className="brand"
        onClick={() => onNavigate("/")}
        aria-label="AHub home"
      >
        <span className="brand-mark">🌱</span>
        <span>AHub</span>
      </button>

      <nav
        className={menuOpen ? "nav open" : "nav"}
        aria-label="Primary navigation"
      >
        <button
          onClick={() => {
            onNavigate("/about")
            setMenuOpen(false)
          }}
        >
          About
        </button>
        <button
          onClick={() => {
            onNavigate("/sign-in")
            setMenuOpen(false)
          }}
        >
          Sign in
        </button>
      </nav>

      <div className="header-actions">
        {showNotifications && <NotificationBell />}
        <div className="lang-switcher">
          <button
            className={lang === "rw" ? "active" : ""}
            onClick={() => handleLangChange("rw")}
          >
            RW
          </button>
          <span>|</span>
          <button
            className={lang === "en" ? "active" : ""}
            onClick={() => handleLangChange("en")}
          >
            EN
          </button>
          <span>|</span>
          <button
            className={lang === "fr" ? "active" : ""}
            onClick={() => handleLangChange("fr")}
          >
            FR
          </button>
        </div>

        <button
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>
    </header>
  )
}
