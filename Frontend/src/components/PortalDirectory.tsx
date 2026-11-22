import React from "react"
import { PORTAL_CONFIGS, PortalType } from "../shared"
import { t } from "../lib/i18n.js"

interface PortalDirectoryProps {
  onNavigate: (path: string) => void
}

export const PortalDirectory: React.FC<PortalDirectoryProps> = ({
  onNavigate,
}) => {
  const portalList = Object.values(PORTAL_CONFIGS)

  return (
    <section className="portal-directory-section" id="portals">
      <div className="section-heading">
        <div>
          <span className="kicker">Authorized Workspaces</span>
          <h2>Dedicated Portals for Every Role</h2>
        </div>
        <p>
          Each agricultural role operates in a dedicated portal with
          region-bound authorization and tailored workflows. Select your portal
          to sign in or request access.
        </p>
      </div>

      <div className="portal-directory-grid">
        {portalList.map((config) => {
          const isOfficial =
            config.id !== PortalType.FARMER && config.id !== PortalType.CUSTOMER

          return (
            <article className="portal-card" key={config.id}>
              <div className="portal-card-head">
                <span className="portal-badge">{t(config.badgeKey)}</span>
                <span className="portal-icon">
                  {config.id === PortalType.RAB
                    ? "🏛️"
                    : config.id === PortalType.PROVINCE
                      ? "🏢"
                      : config.id === PortalType.DISTRICT
                        ? "🏬"
                        : config.id === PortalType.SECTOR
                          ? "🌾"
                          : config.id === PortalType.NSG
                            ? "🛡️"
                            : config.id === PortalType.FARMER
                              ? "🧑‍🌾"
                              : "🛒"}
                </span>
              </div>

              <h3>{t(config.titleKey)}</h3>
              <p>{t(config.descriptionKey)}</p>

              {isOfficial && (
                <div className="approval-badge-row">
                  <small>🔐 Parent Approval Required</small>
                </div>
              )}

              <div className="portal-card-actions">
                <button
                  className="primary-button dark w-full"
                  onClick={() => onNavigate(config.loginPath)}
                >
                  Sign In →
                </button>

                <button
                  className="secondary-button w-full"
                  onClick={() => onNavigate(config.registerPath)}
                >
                  Register / Apply
                </button>

                {config.activatePath && (
                  <button
                    className="text-button small text-center w-full text-green-700 font-medium hover:underline"
                    onClick={() => onNavigate(config.activatePath!)}
                  >
                    Activate with Access Code
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
