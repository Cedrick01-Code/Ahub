import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Wheat,
  PawPrint,
  MapPin,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Download,
  Eye,
  Edit,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  FileText,
  BarChart2,
  RefreshCw,
  Building2,
  Users,
  Package,
  DollarSign,
  X,
  Stethoscope,
  MoreHorizontal,
  Zap,
} from "lucide-react"
import { sectorApi } from "../lib/productionApi"
import { useAnnounce } from "../lib/announce"

const COLORS = {
  bgMain: "#0A1A12",
  bgSidebar: "#123D30",
  bgCard: "#1A4D35",
  bgInput: "#176443",
  bgHover: "#1E5D3D",
  accent: "#10B981",
  accentHover: "#059669",
  accentGlow: "rgba(16, 185, 129, 0.4)",
  borderSubtle: "#1E5D3D",
  borderMain: "#27875B",
  textPrimary: "#FFFFFF",
  textSecondary: "#A8D5BA",
  textMuted: "#6B9B7B",
  textPlaceholder: "#5A8A6A",
  error: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  info: "#3B82F6",
}

const STATUS_CONFIG = {
  active: { label: "Active", color: "#10B981" },
  draft: { label: "Draft", color: "#6B9B7B" },
  paused: { label: "Paused", color: "#F59E0B" },
  completed: { label: "Completed", color: "#3B82F6" },
  archived: { label: "Archived", color: "#6B9B7B" },
}

const HEALTH_STATUS = {
  healthy: { label: "Healthy", color: "#10B981" },
  mild_issues: { label: "Mild Issues", color: "#F59E0B" },
  serious_issues: { label: "Serious Issues", color: "#EF4444" },
  critical: { label: "Critical", color: "#DC2626" },
  unknown: { label: "Unknown", color: "#6B9B7B" },
}

const VACCINATION_STATUS = {
  up_to_date: { label: "Up to Date", color: "#10B981" },
  partial: { label: "Partial", color: "#F59E0B" },
  not_vaccinated: { label: "Not Vaccinated", color: "#EF4444" },
  unknown: { label: "Unknown", color: "#6B9B7B" },
}

export function SectorVeterinaryDashboard() {
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [farmers, setFarmers] = useState([])
  const [cropPlots, setCropPlots] = useState([])
  const [livestockUnits, setLivestockUnits] = useState([])
  const [inspections, setInspections] = useState([])
  const [cropReport, setCropReport] = useState(null)
  const [livestockReport, setLivestockReport] = useState(null)
  const [inspectionReport, setInspectionReport] = useState(null)

  // Filters
  const [search, setSearch] = useState("")
  const [cropSearch, setCropSearch] = useState("")
  const [livestockSearch, setLivestockSearch] = useState("")
  const [farmerSearch, setFarmerSearch] = useState("")
  const [animalTypeFilter, setAnimalTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [cropStatusFilter, setCropStatusFilter] = useState("all")

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [statsRes, farmersRes, cropsRes, livestockRes, inspectionsRes] =
        await Promise.all([
          sectorApi.getOverview(),
          sectorApi.getFarmers({ limit: 50 }),
          sectorApi.getCropPlots({ limit: 100 }),
          sectorApi.getLivestockUnits({ limit: 100 }),
          sectorApi.getInspections({ limit: 50 }),
        ])

      setStats(statsRes)
      setFarmers(farmersRes.farmers || [])
      setCropPlots(cropsRes.plots || [])
      setLivestockUnits(livestockRes.units || [])
      setInspections(inspectionsRes.inspections || [])
    } catch (error) {
      announce("Failed to load dashboard data", "error")
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    try {
      const [cropRes, livestockRes, inspectionRes] = await Promise.all([
        sectorApi.getCropReport(),
        sectorApi.getLivestockReport(),
        sectorApi.getInspectionReport(),
      ])
      setCropReport(cropRes)
      setLivestockReport(livestockRes)
      setInspectionReport(inspectionRes)
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    }
  }

  useEffect(() => {
    fetchAllData()
    fetchReports()
  }, [])

  const filteredFarmers = useMemo(() => {
    return farmers.filter(
      (farmer) =>
        !farmerSearch ||
        farmer.fullName.toLowerCase().includes(farmerSearch.toLowerCase()) ||
        farmer.village.toLowerCase().includes(farmerSearch.toLowerCase()),
    )
  }, [farmers, farmerSearch])

  const filteredCropPlots = useMemo(() => {
    return cropPlots.filter((plot) => {
      const matchesSearch =
        !cropSearch ||
        plot.name.toLowerCase().includes(cropSearch.toLowerCase()) ||
        plot.plantData?.cropName
          ?.toLowerCase()
          .includes(cropSearch.toLowerCase()) ||
        plot.farmerId?.fullName
          ?.toLowerCase()
          .includes(cropSearch.toLowerCase())

      const matchesStatus =
        cropStatusFilter === "all" || plot.status === cropStatusFilter

      return matchesSearch && matchesStatus
    })
  }, [cropPlots, cropSearch, cropStatusFilter])

  const filteredLivestockUnits = useMemo(() => {
    return livestockUnits.filter((unit) => {
      const matchesSearch =
        !livestockSearch ||
        unit.name.toLowerCase().includes(livestockSearch.toLowerCase()) ||
        unit.livestockData?.animalType
          ?.toLowerCase()
          .includes(livestockSearch.toLowerCase()) ||
        unit.farmerId?.fullName
          ?.toLowerCase()
          .includes(livestockSearch.toLowerCase())

      const matchesType =
        animalTypeFilter === "all" ||
        unit.livestockData?.animalType === animalTypeFilter
      const matchesStatus =
        statusFilter === "all" || unit.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    })
  }, [livestockUnits, livestockSearch, animalTypeFilter, statusFilter])

  const animalTypes = useMemo(() => {
    const types = new Set(
      livestockUnits.map((u) => u.livestockData?.animalType).filter(Boolean),
    )
    return Array.from(types)
  }, [livestockUnits])

  const StatCard = ({ label, value, icon: Icon, color, trend }) => (
    <div
      className="bg-[#1A4D35] rounded-2xl p-6 border flex items-center gap-4 transition-all hover:shadow-lg"
      style={{ borderColor: COLORS.borderSubtle }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: COLORS.textMuted }}>
          {label}
        </p>
        <p className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
          {value}
        </p>
        {trend && (
          <p className="text-xs mt-1" style={{ color: COLORS.success }}>
            {trend}
          </p>
        )}
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab stats={stats} />
      case "farmers":
        return (
          <FarmersTab
            farmers={filteredFarmers}
            search={farmerSearch}
            setSearch={setFarmerSearch}
          />
        )
      case "crops":
        return (
          <CropsTab
            plots={filteredCropPlots}
            search={cropSearch}
            setSearch={setCropSearch}
            statusFilter={cropStatusFilter}
            setStatusFilter={setCropStatusFilter}
          />
        )
      case "livestock":
        return (
          <LivestockTab
            units={filteredLivestockUnits}
            search={livestockSearch}
            setSearch={setLivestockSearch}
            animalTypes={animalTypes}
            animalTypeFilter={animalTypeFilter}
            setAnimalTypeFilter={setAnimalTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )
      case "inspections":
        return <InspectionsTab inspections={inspections} />
      case "reports":
        return (
          <ReportsTab
            cropReport={cropReport}
            livestockReport={livestockReport}
            inspectionReport={inspectionReport}
          />
        )
      default:
        return <OverviewTab stats={stats} />
    }
  }

  return (
    <div
      className="min-h-screen bg-[#0A1A12] text-white"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Sector Veterinary Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
              Monitoring agricultural production and livestock health in your
              sector
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors border"
              style={{
                backgroundColor: COLORS.bgCard,
                color: COLORS.textSecondary,
                borderColor: COLORS.borderSubtle,
              }}
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={fetchReports}
              className="px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: COLORS.accent,
                color: "#0A1A12",
                boxShadow: `0 0 12px ${COLORS.accentGlow}`,
              }}
            >
              <BarChart2 className="w-5 h-5" />
              Generate Reports
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <StatCard
              label="Total Farmers"
              value={stats.totalFarmers}
              icon={Users}
              color={COLORS.accent}
            />
            <StatCard
              label="Crop Plots"
              value={stats.totalCropPlots}
              icon={Wheat}
              color="#22C55E"
            />
            <StatCard
              label="Livestock Units"
              value={stats.totalLivestockUnits}
              icon={PawPrint}
              color="#F59E0B"
            />
            <StatCard
              label="Cultivated Land"
              value={`${stats.totalCultivatedLand} ha`}
              icon={MapPin}
              color={COLORS.info}
            />
            <StatCard
              label="Total Livestock"
              value={stats.totalLivestockPopulation}
              icon={Building2}
              color="#8B5CF6"
            />
          </div>
        )}

        {/* Alert Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Active Units"
              value={stats.activeProductionUnits}
              icon={TrendingUp}
              color={COLORS.success}
            />
            <StatCard
              label="Attention Needed"
              value={stats.unitsRequiringAttention}
              icon={AlertTriangle}
              color={COLORS.warning}
            />
            <StatCard
              label="Animal Health"
              value={stats.animalHealthProblems}
              icon={Stethoscope}
              color={COLORS.error}
            />
            <StatCard
              label="Crop Issues"
              value={stats.cropPestDiseaseProblems}
              icon={Wheat}
              color={COLORS.warning}
            />
          </div>
        )}

        {/* Tabs */}
        <div
          className="flex flex-wrap gap-1 mb-6 border-b"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          {[
            { key: "overview", label: "Overview", icon: Building2 },
            { key: "farmers", label: "Farmers", icon: Users },
            { key: "crops", label: "Crop Plots", icon: Wheat },
            { key: "livestock", label: "Livestock", icon: Cow },
            { key: "inspections", label: "Inspections", icon: Stethoscope },
            { key: "reports", label: "Reports", icon: BarChart2 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 transition-colors -mb-px ${
                activeTab === tab.key ? "text-white" : ""
              }`}
              style={{
                color: activeTab === tab.key ? COLORS.accent : COLORS.textMuted,
                borderBottomColor:
                  activeTab === tab.key ? COLORS.accent : "transparent",
              }}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div
            className="py-12 text-center"
            style={{ color: COLORS.textMuted }}
          >
            <div className="animate-spin inline-block w-8 h-8 border-2 border-transparent border-t-[#10B981] rounded-full mb-2" />
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  )
}

// ============================================
// TAB COMPONENTS
// ============================================

function OverviewTab({ stats }) {
  if (!stats)
    return (
      <div className="py-8 text-center" style={{ color: COLORS.textMuted }}>
        Loading...
      </div>
    )

  return (
    <div className="space-y-6">
      <div
        className="bg-[#1A4D35] rounded-2xl p-6 border"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <h3 className="text-lg font-semibold mb-4">Sector Summary</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoItem label="Registered Farmers" value={stats.totalFarmers} />
          <InfoItem
            label="Active Production Units"
            value={stats.activeProductionUnits}
          />
          <InfoItem
            label="Recent Registrations (7 days)"
            value={stats.recentRegistrations}
          />
          <InfoItem
            label="Units Requiring Attention"
            value={stats.unitsRequiringAttention}
            color={COLORS.warning}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div
          className="bg-[#1A4D35] rounded-2xl p-6 border"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Wheat className="w-5 h-5" style={{ color: "#22C55E" }} />
            Crop Production Overview
          </h3>
          <div className="space-y-3">
            <InfoRow label="Total Crop Plots" value={stats.totalCropPlots} />
            <InfoRow
              label="Total Cultivated Land"
              value={`${stats.totalCultivatedLand} ha`}
            />
            <InfoRow
              label="Crop Pest/Disease Issues"
              value={stats.cropPestDiseaseProblems}
              color={COLORS.warning}
            />
          </div>
        </div>

        <div
          className="bg-[#1A4D35] rounded-2xl p-6 border"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PawPrint className="w-5 h-5" style={{ color: "#F59E0B" }} />
            Livestock Overview
          </h3>
          <div className="space-y-3">
            <InfoRow
              label="Total Livestock Units"
              value={stats.totalLivestockUnits}
            />
            <InfoRow
              label="Total Livestock Population"
              value={stats.totalLivestockPopulation}
            />
            <InfoRow
              label="Animal Health Issues"
              value={stats.animalHealthProblems}
              color={COLORS.error}
            />
          </div>
        </div>
      </div>

      <div
        className="bg-[#1A4D35] rounded-2xl p-6 border"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle
            className="w-5 h-5"
            style={{ color: COLORS.warning }}
          />
          Units Requiring Attention
        </h3>
        <p className="text-sm" style={{ color: COLORS.textMuted }}>
          {stats.unitsRequiringAttention} production units have reported issues
          that may require your attention.
          {stats.animalHealthProblems > 0 && (
            <span className="ml-2">
              {" "}
              Including {stats.animalHealthProblems} livestock units with health
              concerns.
            </span>
          )}
          {stats.cropPestDiseaseProblems > 0 && (
            <span className="ml-2">
              {" "}
              Including {stats.cropPestDiseaseProblems} crop plots with
              pest/disease observations.
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function FarmersTab({ farmers, search, setSearch }) {
  return (
    <div
      className="bg-[#1A4D35] rounded-2xl border"
      style={{ borderColor: COLORS.borderSubtle }}
    >
      <div
        className="p-4 border-b flex gap-4"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: COLORS.textMuted, width: 18, height: 18 }}
          />
          <input
            type="text"
            placeholder="Search farmers by name, village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0A1A12] border text-white placeholder-gray-500 focus:outline-none focus:ring-2"
            style={{
              borderColor: COLORS.borderSubtle,
              backgroundColor: COLORS.bgInput,
            }}
          />
        </div>
      </div>
      <div className="divide-y" style={{ borderColor: COLORS.borderSubtle }}>
        {farmers.length === 0 ? (
          <div
            className="py-12 text-center"
            style={{ color: COLORS.textMuted }}
          >
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No farmers found in your sector</p>
          </div>
        ) : (
          farmers.map((farmer) => (
            <div
              key={farmer._id}
              className="p-4 hover:bg-[#1E5D3D] transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentHover} 100%)`,
                  }}
                >
                  <span className="text-white font-medium text-sm">
                    {farmer.fullName?.charAt(0) || "F"}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium">{farmer.fullName}</h4>
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    {farmer.village}, {farmer.sector} • {farmer.cropPlots || 0}{" "}
                    plots, {farmer.livestockUnits || 0} livestock
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `#22C55E20`, color: `#22C55E` }}
                >
                  {farmer.cropPlots || 0} Crops
                </span>
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `#F59E0B20`, color: `#F59E0B` }}
                >
                  {farmer.livestockUnits || 0} Livestock
                </span>
                <button
                  className="p-2 rounded-lg hover:bg-[#1E5D3D] transition-colors"
                  style={{ color: COLORS.textMuted }}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CropsTab({ plots, search, setSearch, statusFilter, setStatusFilter }) {
  return (
    <div
      className="bg-[#1A4D35] rounded-2xl border"
      style={{ borderColor: COLORS.borderSubtle }}
    >
      <div
        className="p-4 border-b flex flex-wrap gap-4"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <div className="flex-1 relative min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: COLORS.textMuted, width: 18, height: 18 }}
          />
          <input
            type="text"
            placeholder="Search crop plots..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0A1A12] border text-white placeholder-gray-500 focus:outline-none focus:ring-2"
            style={{
              borderColor: COLORS.borderSubtle,
              backgroundColor: COLORS.bgInput,
            }}
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
            { value: "completed", label: "Completed" },
          ]}
          placeholder="Status"
        />
      </div>
      <div className="divide-y" style={{ borderColor: COLORS.borderSubtle }}>
        {plots.length === 0 ? (
          <div
            className="py-12 text-center"
            style={{ color: COLORS.textMuted }}
          >
            <Wheat className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No crop plots found</p>
          </div>
        ) : (
          plots.map((plot) => (
            <div
              key={plot._id}
              className="p-4 hover:bg-[#1E5D3D] transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `#22C55E20` }}
                >
                  <Wheat className="w-5 h-5" style={{ color: "#22C55E" }} />
                </div>
                <div>
                  <h4 className="font-medium">{plot.name}</h4>
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    {plot.plantData?.cropName} ({plot.plantData?.cropVariety}) •{" "}
                    {plot.farmerId?.fullName}
                  </p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>
                    {plot.location?.village}, {plot.location?.sector} •{" "}
                    {plot.plantData?.landSize} {plot.plantData?.landUnit}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium capitalize"
                  style={{
                    backgroundColor: `${STATUS_CONFIG[plot.status]?.color || COLORS.textMuted}20`,
                    color:
                      STATUS_CONFIG[plot.status]?.color || COLORS.textMuted,
                  }}
                >
                  {STATUS_CONFIG[plot.status]?.label || plot.status}
                </span>
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${GROWTH_STAGE_COLORS[plot.plantData?.currentGrowthStage]?.color || COLORS.textMuted}20`,
                    color:
                      GROWTH_STAGE_COLORS[plot.plantData?.currentGrowthStage]
                        ?.color || COLORS.textMuted,
                  }}
                >
                  {plot.plantData?.currentGrowthStage}
                </span>
                <button
                  className="p-2 rounded-lg hover:bg-[#1E5D3D] transition-colors"
                  style={{ color: COLORS.textMuted }}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function LivestockTab({
  units,
  search,
  setSearch,
  animalTypes,
  animalTypeFilter,
  setAnimalTypeFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <div
      className="bg-[#1A4D35] rounded-2xl border"
      style={{ borderColor: COLORS.borderSubtle }}
    >
      <div
        className="p-4 border-b flex flex-wrap gap-4"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <div className="flex-1 relative min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: COLORS.textMuted, width: 18, height: 18 }}
          />
          <input
            type="text"
            placeholder="Search livestock units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0A1A12] border text-white placeholder-gray-500 focus:outline-none focus:ring-2"
            style={{
              borderColor: COLORS.borderSubtle,
              backgroundColor: COLORS.bgInput,
            }}
          />
        </div>
        <SelectFilter
          value={animalTypeFilter}
          onChange={setAnimalTypeFilter}
          options={[
            { value: "all", label: "All Species" },
            ...animalTypes.map((t) => ({
              value: t,
              label: t.charAt(0).toUpperCase() + t.slice(1),
            })),
          ]}
          placeholder="Species"
        />
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
            { value: "completed", label: "Completed" },
          ]}
          placeholder="Status"
        />
      </div>
      <div className="divide-y" style={{ borderColor: COLORS.borderSubtle }}>
        {units.length === 0 ? (
          <div
            className="py-12 text-center"
            style={{ color: COLORS.textMuted }}
          >
            <PawPrint className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No livestock units found</p>
          </div>
        ) : (
          units.map((unit) => {
            const healthConfig = HEALTH_STATUS[
              unit.livestockData?.health?.generalStatus
            ] || { label: "Unknown", color: COLORS.textMuted }
            const vaccConfig = VACCINATION_STATUS[
              unit.livestockData?.health?.vaccinationStatus
            ] || { label: "Unknown", color: COLORS.textMuted }

            return (
              <div
                key={unit._id}
                className="p-4 hover:bg-[#1E5D3D] transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `#F59E0B20` }}
                  >
                    <PawPrint
                      className="w-5 h-5"
                      style={{ color: "#F59E0B" }}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">{unit.name}</h4>
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>
                      {unit.livestockData?.animalType} (
                      {unit.livestockData?.breed}) • {unit.farmerId?.fullName}
                    </p>
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>
                      {unit.location?.village}, {unit.location?.sector} • Pop:{" "}
                      {unit.livestockData?.population?.total}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium capitalize"
                    style={{
                      backgroundColor: `${healthConfig.color}20`,
                      color: healthConfig.color,
                    }}
                  >
                    {healthConfig.label}
                  </span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${vaccConfig.color}20`,
                      color: vaccConfig.color,
                    }}
                  >
                    {vaccConfig.label}
                  </span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium capitalize"
                    style={{
                      backgroundColor: `${STATUS_CONFIG[unit.status]?.color || COLORS.textMuted}20`,
                      color:
                        STATUS_CONFIG[unit.status]?.color || COLORS.textMuted,
                    }}
                  >
                    {STATUS_CONFIG[unit.status]?.label || unit.status}
                  </span>
                  <button
                    className="p-2 rounded-lg hover:bg-[#1E5D3D] transition-colors"
                    style={{ color: COLORS.textMuted }}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function InspectionsTab({ inspections }) {
  return (
    <div
      className="bg-[#1A4D35] rounded-2xl border"
      style={{ borderColor: COLORS.borderSubtle }}
    >
      <div
        className="p-4 border-b"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <h3 className="text-lg font-semibold">Veterinary Inspections</h3>
      </div>
      <div className="divide-y" style={{ borderColor: COLORS.borderSubtle }}>
        {inspections.length === 0 ? (
          <div
            className="py-12 text-center"
            style={{ color: COLORS.textMuted }}
          >
            <Stethoscope className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No inspections recorded yet</p>
            <button
              className="mt-4 px-4 py-2 rounded-xl border transition-colors"
              style={{
                borderColor: COLORS.borderSubtle,
                color: COLORS.textSecondary,
              }}
            >
              Create Inspection
            </button>
          </div>
        ) : (
          inspections.map((inspection) => (
            <div
              key={inspection._id}
              className="p-4 hover:bg-[#1E5D3D] transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${COLORS.accent}20` }}
                >
                  <Stethoscope
                    className="w-5 h-5"
                    style={{ color: COLORS.accent }}
                  />
                </div>
                <div>
                  <h4 className="font-medium">
                    {inspection.inspectionType} Inspection
                  </h4>
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    {inspection.productionUnitId?.name} •{" "}
                    {inspection.farmerId?.fullName} •{" "}
                    {inspection.officerId?.fullName}
                  </p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>
                    {new Date(inspection.inspectionDate).toLocaleDateString()} •{" "}
                    {inspection.findings?.substring(0, 100)}...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium capitalize"
                  style={{
                    backgroundColor: `${INSPECTION_STATUS_COLORS[inspection.status]?.color || COLORS.textMuted}20`,
                    color:
                      INSPECTION_STATUS_COLORS[inspection.status]?.color ||
                      COLORS.textMuted,
                  }}
                >
                  {inspection.status}
                </span>
                {inspection.followUpRequired && (
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${COLORS.warning}20`,
                      color: COLORS.warning,
                    }}
                  >
                    Follow-up:{" "}
                    {new Date(inspection.followUpDate).toLocaleDateString()}
                  </span>
                )}
                <button
                  className="p-2 rounded-lg hover:bg-[#1E5D3D] transition-colors"
                  style={{ color: COLORS.textMuted }}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ReportsTab({ cropReport, livestockReport, inspectionReport }) {
  return (
    <div className="space-y-6">
      <div
        className="bg-[#1A4D35] rounded-2xl border"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <div
          className="p-4 border-b"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wheat className="w-5 h-5" style={{ color: "#22C55E" }} />
            Crop Production Report
          </h3>
        </div>
        <div className="p-4">
          {cropReport ? (
            <div className="space-y-4">
              <InfoRow label="Total Plots" value={cropReport.totalPlots} />
              <InfoRow label="Total Farmers" value={cropReport.totalFarmers} />
              <div className="bg-[#0A1A12] rounded-xl p-4">
                <h4
                  className="font-medium mb-2"
                  style={{ color: COLORS.textSecondary }}
                >
                  Crop Distribution
                </h4>
                <div className="space-y-2">
                  {Object.entries(cropReport.cropDistribution || {}).map(
                    ([crop, data]) => (
                      <div
                        key={crop}
                        className="flex justify-between py-1 border-b"
                        style={{ borderColor: COLORS.borderSubtle }}
                      >
                        <span className="font-medium">{crop}</span>
                        <span style={{ color: COLORS.textMuted }}>
                          {data.count} plots, {data.totalLand} ha
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="bg-[#0A1A12] rounded-xl p-4">
                <h4
                  className="font-medium mb-2"
                  style={{ color: COLORS.textSecondary }}
                >
                  Growth Stages
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cropReport.stageDistribution || {}).map(
                    ([stage, count]) => (
                      <span
                        key={stage}
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${GROWTH_STAGE_COLORS[stage]?.color || COLORS.accent}20`,
                          color:
                            GROWTH_STAGE_COLORS[stage]?.color || COLORS.accent,
                        }}
                      >
                        {stage}: {count}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="text-center py-8"
              style={{ color: COLORS.textMuted }}
            >
              <Wheat className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No crop report data available</p>
            </div>
          )}
        </div>
      </div>

      <div
        className="bg-[#1A4D35] rounded-2xl border"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <div
          className="p-4 border-b"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PawPrint className="w-5 h-5" style={{ color: "#F59E0B" }} />
            Livestock Report
          </h3>
        </div>
        <div className="p-4">
          {livestockReport ? (
            <div className="space-y-4">
              <InfoRow label="Total Units" value={livestockReport.totalUnits} />
              <InfoRow
                label="Total Farmers"
                value={livestockReport.totalFarmers}
              />
              <InfoRow
                label="Total Population"
                value={livestockReport.totalPopulation}
              />
              <InfoRow
                label="Vaccination Coverage"
                value={`${livestockReport.vaccinationCoverage}%`}
                color={
                  livestockReport.vaccinationCoverage > 80
                    ? COLORS.success
                    : COLORS.warning
                }
              />
              <div className="bg-[#0A1A12] rounded-xl p-4">
                <h4
                  className="font-medium mb-2"
                  style={{ color: COLORS.textSecondary }}
                >
                  Animal Distribution
                </h4>
                <div className="space-y-2">
                  {Object.entries(livestockReport.animalDistribution || {}).map(
                    ([animal, data]) => (
                      <div
                        key={animal}
                        className="flex justify-between py-1 border-b"
                        style={{ borderColor: COLORS.borderSubtle }}
                      >
                        <span className="font-medium capitalize">{animal}</span>
                        <span style={{ color: COLORS.textMuted }}>
                          {data.count} units, {data.totalPopulation} animals
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="bg-[#0A1A12] rounded-xl p-4">
                <h4
                  className="font-medium mb-2"
                  style={{ color: COLORS.textSecondary }}
                >
                  Health Status Summary
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(livestockReport.healthSummary || {}).map(
                    ([status, count]) => (
                      <span
                        key={status}
                        className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                        style={{
                          backgroundColor: `${HEALTH_STATUS[status]?.color || COLORS.textMuted}20`,
                          color:
                            HEALTH_STATUS[status]?.color || COLORS.textMuted,
                        }}
                      >
                        {status.replace("_", " ")}: {count}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="text-center py-8"
              style={{ color: COLORS.textMuted }}
            >
              <PawPrint className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No livestock report data available</p>
            </div>
          )}
        </div>
      </div>

      <div
        className="bg-[#1A4D35] rounded-2xl border"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <div
          className="p-4 border-b"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Stethoscope className="w-5 h-5" style={{ color: COLORS.accent }} />
            Inspection Report
          </h3>
        </div>
        <div className="p-4">
          {inspectionReport ? (
            <div className="space-y-4">
              <InfoRow
                label="Total Inspections"
                value={inspectionReport.totalInspections}
              />
              <InfoRow
                label="Follow-ups Required"
                value={inspectionReport.followUpsRequired}
                color={COLORS.warning}
              />
              <InfoRow
                label="Referrals"
                value={inspectionReport.referrals}
                color={COLORS.info}
              />
              <div className="bg-[#0A1A12] rounded-xl p-4">
                <h4
                  className="font-medium mb-2"
                  style={{ color: COLORS.textSecondary }}
                >
                  Inspection Types
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(inspectionReport.typeDistribution || {}).map(
                    ([type, count]) => (
                      <span
                        key={type}
                        className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                        style={{
                          backgroundColor: `${COLORS.accent}20`,
                          color: COLORS.accent,
                        }}
                      >
                        {type}: {count}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <div className="bg-[#0A1A12] rounded-xl p-4">
                <h4
                  className="font-medium mb-2"
                  style={{ color: COLORS.textSecondary }}
                >
                  Status Distribution
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    inspectionReport.statusDistribution || {},
                  ).map(([status, count]) => (
                    <span
                      key={status}
                      className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                      style={{
                        backgroundColor: `${INSPECTION_STATUS_COLORS[status]?.color || COLORS.textMuted}20`,
                        color:
                          INSPECTION_STATUS_COLORS[status]?.color ||
                          COLORS.textMuted,
                      }}
                    >
                      {status}: {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="text-center py-8"
              style={{ color: COLORS.textMuted }}
            >
              <Stethoscope className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No inspection report data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// HELPER COMPONENTS
// ============================================

function InfoItem({ label, value, color }) {
  return (
    <div className="bg-[#0A1A12] rounded-xl p-4">
      <p className="text-sm font-medium" style={{ color: COLORS.textMuted }}>
        {label}
      </p>
      <p
        className="text-2xl font-bold mt-1"
        style={{ color: color || COLORS.textPrimary }}
      >
        {value}
      </p>
    </div>
  )
}

function InfoRow({ label, value, color }) {
  return (
    <div
      className="flex justify-between py-2 border-b"
      style={{ borderColor: COLORS.borderSubtle }}
    >
      <span style={{ color: COLORS.textMuted }}>{label}</span>
      <span
        className="font-medium"
        style={{ color: color || COLORS.textPrimary }}
      >
        {value}
      </span>
    </div>
  )
}

function SelectFilter({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-3 rounded-xl bg-[#0A1A12] border text-white focus:outline-none focus:ring-2 transition-colors min-w-[180px]"
      style={{
        borderColor: COLORS.borderSubtle,
        backgroundColor: COLORS.bgInput,
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// Color constants
const GROWTH_STAGE_COLORS = {
  prepared: { color: "#6B9B7B" },
  planted: { color: "#3B82F6" },
  germination: { color: "#8B5CF6" },
  vegetative: { color: "#22C55E" },
  flowering: { color: "#F59E0B" },
  fruiting: { color: "#10B981" },
  harvesting: { color: "#EF4444" },
  completed: { color: "#10B981" },
}

const INSPECTION_STATUS_COLORS = {
  pending: { color: "#F59E0B" },
  in_progress: { color: "#3B82F6" },
  completed: { color: "#10B981" },
  referred: { color: "#8B5CF6" },
}
