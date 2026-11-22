export const PortalType = {
  FARMER: "farmer",
  CUSTOMER: "customer",
  PROVINCE: "province",
  DISTRICT: "district",
  SECTOR: "sector",
  NSG: "nsg",
  RAB: "rab",
} as const

export type PortalType = typeof PortalType[keyof typeof PortalType]

export interface PortalConfig {
  id: PortalType
  loginPath: string
  registerPath: string
  activatePath?: string
  appPath: string
  badgeKey: string
  titleKey: string
  descriptionKey: string
  parentApprovalRequired?: boolean
  authMethod?: ("password" | "otp" | "mfa")[]
}

export const PORTAL_CONFIGS: Record<PortalType, PortalConfig> = {
  farmer: {
    id: "farmer",
    loginPath: "/get-started",
    registerPath: "/register/farmer",
    appPath: "/farmer",
    badgeKey: "farmerBadge",
    titleKey: "farmerTitle",
    descriptionKey: "farmerDescription",
    parentApprovalRequired: false,
    authMethod: ["password"],
  },
  customer: {
    id: "customer",
    loginPath: "/get-started",
    registerPath: "/register/customer",
    appPath: "/customer",
    badgeKey: "customerBadge",
    titleKey: "customerTitle",
    descriptionKey: "customerDescription",
    parentApprovalRequired: false,
    authMethod: ["password"],
  },
  province: {
    id: "province",
    loginPath: "/province-vet",
    registerPath: "/register/province-vet",
    activatePath: "/activate/province-vet",
    appPath: "/province-vet/workspace",
    badgeKey: "provinceBadge",
    titleKey: "provinceTitle",
    descriptionKey: "provinceDescription",
    parentApprovalRequired: true,
    authMethod: ["password"],
  },
  district: {
    id: "district",
    loginPath: "/district-vet",
    registerPath: "/register/district-vet",
    activatePath: "/activate/district-vet",
    appPath: "/district-vet/workspace",
    badgeKey: "districtBadge",
    titleKey: "districtTitle",
    descriptionKey: "districtDescription",
    parentApprovalRequired: true,
    authMethod: ["password"],
  },
  sector: {
    id: "sector",
    loginPath: "/sector-vet",
    registerPath: "/register/sector-vet",
    activatePath: "/activate/sector-vet",
    appPath: "/sector-vet/workspace",
    badgeKey: "sectorBadge",
    titleKey: "sectorTitle",
    descriptionKey: "sectorDescription",
    parentApprovalRequired: true,
    authMethod: ["password"],
  },
  nsg: {
    id: "nsg",
    loginPath: "/NSGtopsec",
    registerPath: "/register/NSGtopsec",
    activatePath: "/activate/NSGtopsec",
    appPath: "/NSGtopsec/workspace",
    badgeKey: "nsgBadge",
    titleKey: "nsgTitle",
    descriptionKey: "nsgDescription",
    parentApprovalRequired: true,
    authMethod: ["password"],
  },
  rab: {
    id: "rab",
    loginPath: "/login/RAB@aDmin",
    registerPath: "/register/RAB@aDmin",
    activatePath: "/activate/RAB@aDmin",
    appPath: "/rab/workspace",
    badgeKey: "rabBadge",
    titleKey: "rabTitle",
    descriptionKey: "rabDescription",
    parentApprovalRequired: true,
    authMethod: ["password"],
  },
}
