import React, { useState, useEffect } from "react"
import { PortalWorkspace } from "./PortalWorkspace"
import { PORTAL_CONFIGS, PortalType } from "./shared"
import { PortalLogin } from "./auth/PortalLogin"
import { PortalRegister } from "./auth/PortalRegister"
import { PortalActivate } from "./auth/PortalActivate"
import { PublicRegister } from "./auth/PublicRegister"
import { PortalQuickSignIn } from "./auth/PortalQuickSignIn"
import { Navbar } from "./components/Navbar"
import { BackgroundSlideshow } from "./components/BackgroundSlideshow"
import { ChatbotWidget } from "./components/ChatbotWidget"
import { FarmerProductionDashboard } from "./portals/FarmerProductionDashboard"
import { SectorVeterinaryDashboard } from "./portals/SectorVeterinaryDashboard"
import { GuideMe } from "./portals/GuideMe"
import {
  ArrowRight,
  ShieldCheck,
  Sprout,
  Users,
  MapPin,
  Building2,
} from "lucide-react"

const normalizeRoute = (path: string): string => {
  return path.trim().replace(/\s+/g, "-").replace(/\/+/g, "/").toLowerCase()
}

// Aliases mapping for user redesign routes
const portalAliasMap: Record<string, PortalType> = {
  "/login/rab@admin": PortalType.RAB,
  "/login/rab@aadmin": PortalType.RAB,
  "/register/rab@admin": PortalType.RAB,
  "/activate/rab@admin": PortalType.RAB,
  "/login/rab": PortalType.RAB,
  "/rab": PortalType.RAB,
  "/province-vet": PortalType.PROVINCE,
  "/province-veterinary": PortalType.PROVINCE,
  "/login/province-vet": PortalType.PROVINCE,
  "/district-vet": PortalType.DISTRICT,
  "/district-veterinary": PortalType.DISTRICT,
  "/login/district-vet": PortalType.DISTRICT,
  "/sector-vet": PortalType.SECTOR,
  "/sector-veterinary": PortalType.SECTOR,
  "/login/sector-vet": PortalType.SECTOR,
  "/sector": PortalType.SECTOR,
  "/nsgtopsec": PortalType.NSG,
  "/login/nsgtopsec": PortalType.NSG,
  "/login/nsg": PortalType.NSG,
  "/nsg": PortalType.NSG,
}

const registerAliasMap: Record<string, PortalType> = {
  "/register/rab@admin": PortalType.RAB,
  "/register/rab": PortalType.RAB,
  "/register/province-vet": PortalType.PROVINCE,
  "/register/district-vet": PortalType.DISTRICT,
  "/register/sector-vet": PortalType.SECTOR,
  "/register/nsgtopsec": PortalType.NSG,
}

const activateAliasMap: Record<string, PortalType> = {
  "/activate/rab@admin": PortalType.RAB,
  "/activate/rab": PortalType.RAB,
  "/activate/province-vet": PortalType.PROVINCE,
  "/activate/district-vet": PortalType.DISTRICT,
  "/activate/sector-vet": PortalType.SECTOR,
  "/activate/nsgtopsec": PortalType.NSG,
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [, setActivePortal] = useState("")

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const navigate = (path: string) => {
    if (path.startsWith("/#")) {
      const elementId = path.substring(2)
      const elem = document.getElementById(elementId)
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth" })
        return
      }
      window.history.pushState({}, "", path)
      setCurrentPath("")
      window.setTimeout(
        () =>
          document
            .getElementById(elementId)
            ?.scrollIntoView({ behavior: "smooth" }),
        0,
      )
      return
    }

    const nextPath = path || "/"
    window.history.pushState({}, "", nextPath)
    setCurrentPath(nextPath)
    window.scrollTo(0, 0)
  }

  const handleLoginSuccess = (portal: string) => {
    setActivePortal(portal)
    const config = PORTAL_CONFIGS[(portal as PortalType)]
    navigate(config ? config.appPath : "/get-started")
  }

  const resolvedPath = normalizeRoute(currentPath)

  // Farmer & Customer onboarding
  if (
    resolvedPath === "/register" ||
    resolvedPath === "/register/farmer" ||
    resolvedPath === "/register/customer" ||
    resolvedPath === "/get-started"
  ) {
    return <PublicRegister onNavigate={navigate} />
  }

  if (resolvedPath === "/sign-in") {
    return (
      <PortalQuickSignIn onSuccess={handleLoginSuccess} onNavigate={navigate} />
    )
  }

  // Official portal login routes
  const loginPortalMatch =
    Object.values(PORTAL_CONFIGS).find(
      (portal) => normalizeRoute(portal.loginPath) === resolvedPath,
    ) ??
    (portalAliasMap[resolvedPath]
      ? PORTAL_CONFIGS[portalAliasMap[resolvedPath]]
      : undefined)

  if (loginPortalMatch) {
    return (
      <PortalLogin
        portal={loginPortalMatch.id as PortalType}
        onSuccess={handleLoginSuccess}
        onNavigate={navigate}
      />
    )
  }

  // Official portal registration routes
  const registerPortalMatch =
    Object.values(PORTAL_CONFIGS).find(
      (portal) => normalizeRoute(portal.registerPath) === resolvedPath,
    ) ??
    (registerAliasMap[resolvedPath]
      ? PORTAL_CONFIGS[registerAliasMap[resolvedPath]]
      : undefined)

  if (registerPortalMatch) {
    return (
      <PortalRegister
        portal={registerPortalMatch.id as PortalType}
        onNavigate={navigate}
      />
    )
  }

  // Official portal activation routes
  const activatePortalMatch =
    Object.values(PORTAL_CONFIGS).find(
      (portal) => normalizeRoute(portal.activatePath ?? "") === resolvedPath,
    ) ??
    (activateAliasMap[resolvedPath]
      ? PORTAL_CONFIGS[activateAliasMap[resolvedPath]]
      : undefined)

  if (activatePortalMatch) {
    return (
      <PortalActivate
        portal={activatePortalMatch.id as PortalType}
        onNavigate={navigate}
        onActivated={(portal: string) => {
          setActivePortal(portal)
          const config = PORTAL_CONFIGS[(portal as PortalType)]
          navigate(config ? config.appPath : "/get-started")
        }}
      />
    )
  }

  // App workspace routes
  const appPortalMatch = Object.values(PORTAL_CONFIGS).find(
    (portal) =>
      normalizeRoute(portal.appPath) === resolvedPath ||
      normalizeRoute(`${portal.loginPath}/workspace`) === resolvedPath,
  )
  if (appPortalMatch) {
    return (
      <div>
        <PortalWorkspace
          portal={appPortalMatch.id}
          onExit={() => navigate("/get-started")}
        />
      </div>
    )
  }

  if (resolvedPath === "/assistant" || resolvedPath === "/ai-chat") {
    return (
      <div className="h-screen w-screen bg-[#0A1A12] p-2 md:p-4 overflow-hidden">
        <AIChat />
      </div>
    )
  }

  if (
    resolvedPath === "/farmer/production-units" ||
    resolvedPath === "/farmer/production-units/register"
  ) {
    return <FarmerProductionDashboard />
  }

  if (resolvedPath === "/sector/production-units") {
    return <SectorVeterinaryDashboard />
  }

  if (resolvedPath === "/guide-me") {
    return <GuideMe onBack={() => navigate("/farmer/production-units")} />
  }

  // About Page with 2-minute background slideshow
  if (resolvedPath === "/about") {
    return (
      <main className="info-page min-h-screen bg-slate-50 text-slate-900">
        <Navbar onNavigate={navigate} />

        <BackgroundSlideshow
          className="min-h-[60vh] flex items-center"
          overlayOpacity="bg-emerald-950/75"
        >
          <div className="mx-auto max-w-5xl px-6 py-20 text-white text-center sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-lime-300 backdrop-blur-sm border border-white/20">
              🌱 About Agriculture Hub
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl max-w-3xl leading-tight">
              Connecting Rwanda's farms, authorities, and markets.
            </h1>
            <p className="mt-6 text-lg text-slate-200 max-w-2xl leading-relaxed">
              AHub bridges the gap between local farmers, customers, veterinary
              authorities, and agricultural leaders. Our unified platform
              enables transparent account approvals, real-time field task
              tracking, and direct marketplace access.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center sm:justify-start">
              <button
                className="primary-button"
                onClick={() => navigate("/get-started")}
              >
                Get Started <ArrowRight size={18} />
              </button>
              <button
                className="secondary-button"
                onClick={() => navigate("/")}
              >
                Back to Home
              </button>
            </div>
          </div>
        </BackgroundSlideshow>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Hierarchical Ecosystem
            </span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              End-to-End Agricultural Governance
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              From security authorization down to sector-level veterinary care,
              AHub ensures every participant works within a trusted,
              region-verified network.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-800 text-2xl mb-4">
                🛡️
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Security Admin (NSG)
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                National security administrator responsible for approving RAB
                Admin accounts and maintaining system integrity.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-800 text-2xl mb-4">
                🏛️
              </div>
              <h3 className="text-lg font-bold text-slate-900">RAB Admin</h3>
              <p className="mt-2 text-sm text-slate-600">
                Rwanda Agriculture Board overseeing national policy, learning
                resources, and approving Province Veterinary Officers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-800 text-2xl mb-4">
                🏢
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Province & District Vets
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Regional veterinary leadership approving local authorities
                exclusively within their designated geographic bounds.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-800 text-2xl mb-4">
                🌾
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Farmers & Buyers
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Local producers logging farm work and buyers connecting directly
                with fresh Rwandan agricultural produce.
              </p>
            </div>
          </div>
        </section>
        <ChatbotWidget position="bottom-right" title="AHub Assistant" subtitle="Ask me anything about AHub" />
      </main>
    )
  }

  // Landing Page with 2-minute background slideshow & clean layout
  return (
    <main className="landing-layout min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      <Navbar onNavigate={navigate} variant="overlay" />

      <BackgroundSlideshow
        className="flex-1 min-h-[calc(100vh-76px)] flex items-center justify-center"
        overlayOpacity="bg-slate-950/65"
      >
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-lime-300 backdrop-blur-md border border-white/20">
            <span className="size-2 rounded-full bg-lime-400 animate-pulse" />
            Rwanda's Agriculture, Connected
          </span>

          <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-7xl leading-tight">
            Good things grow{" "}
            <em className="not-italic text-lime-300">together.</em>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed">
            AHub connects Rwanda's farmers, buyers, and public agricultural
            authorities through secure region-matched accounts, transparent
            approvals, and fast field coordination.
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <button
              className="primary-button"
              onClick={() => navigate("/get-started")}
            >
              Get started <ArrowRight size={18} />
            </button>
            <button
              className="secondary-button"
              onClick={() => navigate("/about")}
            >
              About
            </button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={18} className="text-lime-300" /> NSG & RAB
              Hierarchical Approvals
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin size={18} className="text-lime-300" /> District & Sector
              Veterinary Scope
            </span>
            <span className="inline-flex items-center gap-2">
              <Sprout size={18} className="text-lime-300" /> Direct
              Farmer-Customer Marketplace
            </span>
          </div>
        </div>
      </BackgroundSlideshow>

      <ChatbotWidget position="bottom-right" title="AHub Assistant" subtitle="Ask me anything about AHub" />
    </main>
  )
}
