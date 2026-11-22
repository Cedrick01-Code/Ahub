import type { PortalType } from "../shared"

export type PortalAuthMode = "login" | "register" | "activate"

interface PortalWelcomeCopy {
  eyebrow: string
  title: string
  message: string
  footer: string
}

const welcomeCopy: Record<PortalType, Record<PortalAuthMode, PortalWelcomeCopy>> =
  {
    farmer: {
      login: {
        eyebrow: "Farmer workspace",
        title: "Welcome back, Farmer.",
        message:
          "Your farm plans, daily work, and market connections are all in one place.",
        footer: "Plan your season · Track your farm · Reach buyers",
      },
      register: {
        eyebrow: "Farmer registration",
        title: "Bring your farm onto AHub.",
        message:
          "Create your profile to organize production, get local support, and connect with buyers.",
        footer:
          "Your farmer account is ready as soon as registration is complete.",
      },
      activate: {
        eyebrow: "Farmer account activation",
        title: "Your farm workspace is nearly ready.",
        message:
          "Confirm your approved request with the one-time code from your sector authority.",
        footer: "After activation, sign in to manage your farm.",
      },
    },
    customer: {
      login: {
        eyebrow: "Customer workspace",
        title: "Welcome back, Buyer.",
        message:
          "Pick up where you left off: explore local products and manage your requests.",
        footer: "Discover products · Contact sellers · Follow orders",
      },
      register: {
        eyebrow: "Customer registration",
        title: "Find your next local supplier.",
        message:
          "Create an account to discover agricultural products and send requests to producers.",
        footer:
          "Customer accounts are ready as soon as registration is complete.",
      },
      activate: {
        eyebrow: "Customer account activation",
        title: "Your buyer account is nearly ready.",
        message:
          "Confirm your approved account details to continue to the AHub marketplace.",
        footer: "After activation, sign in to browse products.",
      },
    },
    rab: {
      login: {
        eyebrow: "National agriculture",
        title: "Welcome back, RAB administrator.",
        message:
          "Continue coordinating national programmes, agricultural information, and regional activity.",
        footer: "National oversight · Programmes · Public information",
      },
      register: {
        eyebrow: "RAB administrator application",
        title: "Coordinate agriculture at national level.",
        message:
          "Submit your administrator application for review by the platform security authority.",
        footer: "Access is granted after approval and account activation.",
      },
      activate: {
        eyebrow: "RAB account activation",
        title: "Your national workspace is nearly ready.",
        message:
          "Use the one-time code provided by the approving authority to activate your account.",
        footer: "Keep your activation code private.",
      },
    },
    province: {
      login: {
        eyebrow: "Province veterinary services",
        title: "Welcome back, Province Veterinary Officer.",
        message:
          "Continue monitoring animal health and coordinating response across your province.",
        footer: "Disease monitoring · District coordination · Campaigns",
      },
      register: {
        eyebrow: "Province officer application",
        title: "Connect veterinary work across your province.",
        message:
          "Submit your officer application to the RAB administrator for review.",
        footer: "Your assigned province determines your service area.",
      },
      activate: {
        eyebrow: "Province account activation",
        title: "Your province workspace is nearly ready.",
        message:
          "Use the one-time code from the approving authority to activate your officer account.",
        footer: "Keep your activation code private.",
      },
    },
    district: {
      login: {
        eyebrow: "District veterinary services",
        title: "Welcome back, District Veterinary Officer.",
        message:
          "Pick up case coordination, sector support, and inspection follow-ups for your district.",
        footer: "Case response · Sector coordination · Follow-ups",
      },
      register: {
        eyebrow: "District officer application",
        title: "Coordinate veterinary services in your district.",
        message:
          "Submit your officer application to the assigned Province Veterinary Officer.",
        footer: "Your assigned district determines your service area.",
      },
      activate: {
        eyebrow: "District account activation",
        title: "Your district workspace is nearly ready.",
        message:
          "Use the one-time code from the approving authority to activate your officer account.",
        footer: "Keep your activation code private.",
      },
    },
    sector: {
      login: {
        eyebrow: "Sector veterinary services",
        title: "Welcome back, Sector Veterinary Officer.",
        message:
          "Continue supporting farmers with local visits, case follow-ups, and practical guidance.",
        footer: "Farmer support · Field visits · Local follow-up",
      },
      register: {
        eyebrow: "Sector officer application",
        title: "Support farmers in your sector.",
        message:
          "Submit your officer application to the assigned District Veterinary Officer.",
        footer: "Your assigned sector determines your service area.",
      },
      activate: {
        eyebrow: "Sector account activation",
        title: "Your sector workspace is nearly ready.",
        message:
          "Use the one-time code from the approving authority to activate your officer account.",
        footer: "Keep your activation code private.",
      },
    },
    nsg: {
      login: {
        eyebrow: "Platform security",
        title: "Welcome back, Security Administrator.",
        message:
          "Review platform access, investigate alerts, and help keep AHub services protected.",
        footer: "Access monitoring · Audit review · Incident response",
      },
      register: {
        eyebrow: "Security administrator application",
        title: "Help protect the AHub platform.",
        message:
          "Submit a security administrator application for review by the existing security authority.",
        footer: "Security access requires approval and account activation.",
      },
      activate: {
        eyebrow: "Security account activation",
        title: "Your security workspace is nearly ready.",
        message:
          "Use the one-time code from the approving authority to activate your account.",
        footer: "Keep your activation code private.",
      },
    },
  }

export const getPortalWelcome = (
  portal: PortalType,
  mode: PortalAuthMode,
): PortalWelcomeCopy => welcomeCopy[portal][mode]
