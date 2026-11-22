const API_BASE = "/api/production-units"

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("ahub_token")
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "Request failed")
  }

  return data.data
}

export const productionApi = {
  // Production Units
  getUnits: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(query ? `?${query}` : "")
  },

  getUnit: (id) => request(`/${id}`),

  createUnit: (data) =>
    request("", { method: "POST", body: JSON.stringify(data) }),

  updateUnit: (id, data) =>
    request(`/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteUnit: (id) => request(`/${id}`, { method: "DELETE" }),

  // Activities
  getActivities: (unitId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/${unitId}/activities${query ? `?${query}` : ""}`)
  },

  createActivity: (unitId, data) =>
    request(`/${unitId}/activities`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Crop Monitoring
  getCropMonitoring: (unitId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/${unitId}/crop-monitoring${query ? `?${query}` : ""}`)
  },

  createCropMonitoring: (unitId, data) =>
    request(`/${unitId}/crop-monitoring`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Livestock Health
  getLivestockHealth: (unitId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/${unitId}/livestock-health${query ? `?${query}` : ""}`)
  },

  createLivestockHealth: (unitId, data) =>
    request(`/${unitId}/livestock-health`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Livestock Population
  getLivestockPopulation: (unitId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/${unitId}/livestock-population${query ? `?${query}` : ""}`)
  },

  createLivestockPopulation: (unitId, data) =>
    request(`/${unitId}/livestock-population`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Harvest
  getHarvest: (unitId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/${unitId}/harvest${query ? `?${query}` : ""}`)
  },

  createHarvest: (unitId, data) =>
    request(`/${unitId}/harvest`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Animal Production
  getAnimalProduction: (unitId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/${unitId}/animal-production${query ? `?${query}` : ""}`)
  },

  createAnimalProduction: (unitId, data) =>
    request(`/${unitId}/animal-production`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Expenses
  getExpenses: (unitId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/${unitId}/expenses${query ? `?${query}` : ""}`)
  },

  createExpense: (unitId, data) =>
    request(`/${unitId}/expenses`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// Sector API
const SECTOR_API_BASE = "/api/sector"

async function sectorRequest(endpoint, options = {}) {
  const token = localStorage.getItem("ahub_token")
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${SECTOR_API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "Request failed")
  }

  return data.data
}

export const sectorApi = {
  getOverview: () => sectorRequest("/overview"),
  getFarmers: (params = {}) =>
    sectorRequest(`farmers?${new URLSearchParams(params).toString()}`),
  getFarmerUnits: (farmerId) =>
    sectorRequest(`farmers/${farmerId}/production-units`),

  // Crop plots
  getCropPlots: (params = {}) =>
    sectorRequest(`crop-plots?${new URLSearchParams(params).toString()}`),
  getCropPlotDetails: (unitId) => sectorRequest(`crop-plots/${unitId}`),

  // Livestock units
  getLivestockUnits: (params = {}) =>
    sectorRequest(`livestock-units?${new URLSearchParams(params).toString()}`),
  getLivestockUnitDetails: (unitId) =>
    sectorRequest(`livestock-units/${unitId}`),

  // Inspections
  getInspections: (params = {}) =>
    sectorRequest(`inspections?${new URLSearchParams(params).toString()}`),
  createInspection: (data) =>
    sectorRequest("inspections", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateInspection: (id, data) =>
    sectorRequest(`inspections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getInspection: (id) => sectorRequest(`inspections/${id}`),

  // Reports
  getCropReport: () => sectorRequest("reports/crops"),
  getLivestockReport: () => sectorRequest("reports/livestock"),
  getInspectionReport: (params = {}) =>
    sectorRequest(
      `reports/inspections?${new URLSearchParams(params).toString()}`,
    ),
}
