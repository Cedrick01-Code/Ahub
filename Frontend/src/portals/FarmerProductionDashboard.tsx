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
} from "lucide-react"
import { productionApi, sectorApi } from "../lib/productionApi"
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

const CATEGORY_CONFIG = {
  plants: { icon: Wheat, label: "Crop Plots", color: "#22C55E" },
  animals: { icon: PawPrint, label: "Livestock Units", color: "#F59E0B" },
}

const STATUS_CONFIG = {
  active: { label: "Active", color: "#10B981" },
  draft: { label: "Draft", color: "#6B9B7B" },
  paused: { label: "Paused", color: "#F59E0B" },
  completed: { label: "Completed", color: "#3B82F6" },
  archived: { label: "Archived", color: "#6B9B7B" },
}

const GROWTH_STAGES = [
  "prepared",
  "planted",
  "germination",
  "vegetative",
  "flowering",
  "fruiting",
  "harvesting",
  "completed",
]

export function FarmerProductionDashboard() {
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUnits: 0,
    totalPlots: 0,
    totalLivestock: 0,
    totalLand: 0,
    totalPopulation: 0,
    activeUnits: 0,
  })
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState("grid")
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailTab, setDetailTab] = useState("overview")

  const fetchData = async () => {
    try {
      setLoading(true)
      const [unitsRes, statsRes] = await Promise.all([
        productionApi.getUnits(),
        // We'll compute stats from units
      ])
      setUnits(unitsRes.units || [])
      computeStats(unitsRes.units || [])
    } catch (error) {
      announce("Failed to load production units", "error")
    } finally {
      setLoading(false)
    }
  }

  const computeStats = (unitList) => {
    const totalUnits = unitList.length
    const plantUnits = unitList.filter((u) => u.category === "plants")
    const animalUnits = unitList.filter((u) => u.category === "animals")
    const activeUnits = unitList.filter((u) => u.status === "active").length
    const totalLand = plantUnits.reduce(
      (sum, u) => sum + (u.plantData?.landSize || 0),
      0,
    )
    const totalPopulation = animalUnits.reduce(
      (sum, u) => sum + (u.livestockData?.population?.total || 0),
      0,
    )

    setStats({
      totalUnits,
      totalPlots: plantUnits.length,
      totalLivestock: animalUnits.length,
      totalLand,
      totalPopulation,
      activeUnits,
    })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const matchesSearch =
        !search ||
        unit.name.toLowerCase().includes(search.toLowerCase()) ||
        unit.plantData?.cropName
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        unit.livestockData?.animalType
          ?.toLowerCase()
          .includes(search.toLowerCase())

      const matchesCategory =
        categoryFilter === "all" || unit.category === categoryFilter
      const matchesStatus =
        statusFilter === "all" || unit.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [units, search, categoryFilter, statusFilter])

  const handleViewUnit = (unit) => {
    setSelectedUnit(unit)
    setShowDetail(true)
    setDetailTab("overview")
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to archive this production unit?"))
      return
    try {
      await productionApi.deleteUnit(id)
      announce("Production unit archived")
      fetchData()
    } catch (error) {
      announce("Failed to archive unit", "error")
    }
  }

  const StatCard = ({ label, value, icon: Icon, color, trend }) => (
    <div
      className="bg-[#1A4D35] rounded-2xl p-6 border flex items-center gap-4 transition-all hover:shadow-lg"
      style={{
        borderColor: COLORS.borderSubtle,
        boxShadow: `0 0 0 1px ${COLORS.borderSubtle}`,
      }}
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

  const UnitCard = ({ unit }) => {
    const config = CATEGORY_CONFIG[unit.category]
    const statusConfig = STATUS_CONFIG[unit.status] || {
      label: unit.status,
      color: COLORS.textMuted,
    }
    const Icon = config.icon

    return (
      <div
        className="group bg-[#1A4D35] rounded-2xl p-5 border transition-all hover:shadow-xl cursor-pointer"
        style={{ borderColor: COLORS.borderSubtle }}
        onClick={() => handleViewUnit(unit)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: config.color }} />
            </div>
            <div>
              <h3
                className="font-semibold text-lg"
                style={{ color: COLORS.textPrimary }}
              >
                {unit.name}
              </h3>
              <p className="text-xs" style={{ color: COLORS.textMuted }}>
                {config.label} • {unit.location?.district},{" "}
                {unit.location?.sector}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${statusConfig.color}20`,
                color: statusConfig.color,
              }}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {unit.category === "plants" ? (
            <>
              <div className="bg-[#0A1A12] rounded-xl p-3">
                <p
                  className="text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  Crop
                </p>
                <p
                  className="font-medium"
                  style={{ color: COLORS.textPrimary }}
                >
                  {unit.plantData?.cropName || "N/A"}
                </p>
              </div>
              <div className="bg-[#0A1A12] rounded-xl p-3">
                <p
                  className="text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  Variety
                </p>
                <p
                  className="font-medium"
                  style={{ color: COLORS.textPrimary }}
                >
                  {unit.plantData?.cropVariety || "N/A"}
                </p>
              </div>
              <div className="bg-[#0A1A12] rounded-xl p-3">
                <p
                  className="text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  Land Size
                </p>
                <p
                  className="font-medium"
                  style={{ color: COLORS.textPrimary }}
                >
                  {unit.plantData?.landSize} {unit.plantData?.landUnit || "ha"}
                </p>
              </div>
              <div className="bg-[#0A1A12] rounded-xl p-3">
                <p
                  className="text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  Stage
                </p>
                <p
                  className="font-medium capitalize"
                  style={{ color: COLORS.textPrimary }}
                >
                  {unit.plantData?.currentGrowthStage || "N/A"}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#0A1A12] rounded-xl p-3">
                <p
                  className="text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  Species
                </p>
                <p
                  className="font-medium capitalize"
                  style={{ color: COLORS.textPrimary }}
                >
                  {unit.livestockData?.animalType || "N/A"}
                </p>
              </div>
              <div className="bg-[#0A1A12] rounded-xl p-3">
                <p
                  className="text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  Breed
                </p>
                <p
                  className="font-medium"
                  style={{ color: COLORS.textPrimary }}
                >
                  {unit.livestockData?.breed || "N/A"}
                </p>
              </div>
              <div className="bg-[#0A1A12] rounded-xl p-3">
                <p
                  className="text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  Population
                </p>
                <p
                  className="font-medium"
                  style={{ color: COLORS.textPrimary }}
                >
                  {unit.livestockData?.population?.total || 0}
                </p>
              </div>
              <div className="bg-[#0A1A12] rounded-xl p-3">
                <p
                  className="text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  Health
                </p>
                <p
                  className="font-medium capitalize"
                  style={{ color: COLORS.textPrimary }}
                >
                  {unit.livestockData?.health?.generalStatus || "N/A"}
                </p>
              </div>
            </>
          )}
        </div>

        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <span className="text-xs" style={{ color: COLORS.textMuted }}>
            Registered {new Date(unit.createdAt).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg hover:bg-[#1E5D3D] transition-colors"
              style={{ color: COLORS.textMuted }}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-[#1E5D3D] transition-colors"
              style={{ color: COLORS.textMuted }}
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
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
            <h1 className="text-3xl font-bold">Production Units</h1>
            <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
              Manage your crop plots and livestock units
            </p>
          </div>
          <button
            onClick={() => navigate("/farmer/production-units/register")}
            className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: COLORS.accent,
              color: "#0A1A12",
              boxShadow: `0 0 12px ${COLORS.accentGlow}`,
            }}
          >
            <Plus className="w-5 h-5" />
            Register New Unit
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Total Units"
            value={stats.totalUnits}
            icon={Building2}
            color={COLORS.accent}
          />
          <StatCard
            label="Crop Plots"
            value={stats.totalPlots}
            icon={Wheat}
            color="#22C55E"
          />
          <StatCard
            label="Livestock Units"
            value={stats.totalLivestock}
            icon={PawPrint}
            color="#F59E0B"
          />
          <StatCard
            label="Total Land"
            value={`${stats.totalLand} ha`}
            icon={MapPin}
            color={COLORS.info}
          />
          <StatCard
            label="Livestock Pop."
            value={stats.totalPopulation}
            icon={Users}
            color="#8B5CF6"
          />
          <StatCard
            label="Active"
            value={stats.activeUnits}
            icon={TrendingUp}
            color={COLORS.success}
          />
        </div>

        {/* Filters */}
        <div
          className="bg-[#123D30] rounded-2xl p-4 border mb-6 flex flex-col md:flex-row gap-4"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: COLORS.textMuted, width: 18, height: 18 }}
            />
            <input
              type="text"
              placeholder="Search by name, crop, animal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0A1A12] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors"
              style={{
                borderColor: COLORS.borderSubtle,
                backgroundColor: COLORS.bgInput,
              }}
            />
          </div>
          <div className="flex gap-3">
            <SelectFilter
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: "all", label: "All Categories" },
                { value: "plants", label: "Crop Plots" },
                { value: "animals", label: "Livestock Units" },
              ]}
              placeholder="Category"
            />
            <SelectFilter
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "draft", label: "Draft" },
                { value: "paused", label: "Paused" },
                { value: "completed", label: "Completed" },
              ]}
              placeholder="Status"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor:
                    viewMode === "grid" ? COLORS.accent : COLORS.bgInput,
                  color: viewMode === "grid" ? "#0A1A12" : COLORS.textSecondary,
                }}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor:
                    viewMode === "list" ? COLORS.accent : COLORS.bgInput,
                  color: viewMode === "list" ? "#0A1A12" : COLORS.textSecondary,
                }}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Units Grid/List */}
        <div
          className="bg-[#123D30] rounded-2xl border"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          {loading ? (
            <div
              className="py-12 text-center"
              style={{ color: COLORS.textMuted }}
            >
              <div className="animate-spin inline-block w-8 h-8 border-2 border-transparent border-t-[#10B981] rounded-full mb-2" />
              <p>Loading production units...</p>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div
              className="py-16 text-center"
              style={{ color: COLORS.textMuted }}
            >
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">
                No production units found
              </h3>
              <p className="mb-4">
                Get started by registering your first crop plot or livestock
                unit.
              </p>
              <button
                onClick={() => navigate("/farmer/production-units/register")}
                className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto transition-colors"
                style={{
                  backgroundColor: COLORS.accent,
                  color: "#0A1A12",
                }}
              >
                <Plus className="w-5 h-5" />
                Register New Unit
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6"
                  : "divide-y p-0"
              }
            >
              {viewMode === "grid" ? (
                filteredUnits.map((unit) => (
                  <UnitCard key={unit._id} unit={unit} />
                ))
              ) : (
                <div>
                  {filteredUnits.map((unit) => {
                    const CategoryIcon = CATEGORY_CONFIG[unit.category].icon
                    return (
                      <div
                        key={unit._id}
                        className="p-4 hover:bg-[#1A4D35] transition-colors cursor-pointer flex items-center justify-between"
                        onClick={() => handleViewUnit(unit)}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: `${CATEGORY_CONFIG[unit.category].color}20`,
                            }}
                          >
                            <CategoryIcon
                              className="w-5 h-5"
                              style={{
                                color: CATEGORY_CONFIG[unit.category].color,
                              }}
                            />
                          </div>
                          <div>
                            <h4 className="font-medium">{unit.name}</h4>
                            <p
                              className="text-xs"
                              style={{ color: COLORS.textMuted }}
                            >
                              {CATEGORY_CONFIG[unit.category].label} •{" "}
                              {unit.location?.district}, {unit.location?.sector}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${STATUS_CONFIG[unit.status]?.color || COLORS.textMuted}20`,
                              color:
                                STATUS_CONFIG[unit.status]?.color ||
                                COLORS.textMuted,
                            }}
                          >
                            {STATUS_CONFIG[unit.status]?.label || unit.status}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: COLORS.textMuted }}
                          >
                            {new Date(unit.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && selectedUnit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-[#123D30] rounded-2xl border max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ borderColor: COLORS.borderSubtle }}
          >
            <div
              className="sticky top-0 bg-[#123D30] border-b p-4 flex items-center justify-between z-10"
              style={{ borderColor: COLORS.borderSubtle }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${CATEGORY_CONFIG[selectedUnit.category].color}20`,
                  }}
                >
                  {(() => {
                    const CategoryIcon =
                      CATEGORY_CONFIG[selectedUnit.category].icon
                    return (
                      <CategoryIcon
                        className="w-6 h-6"
                        style={{
                          color: CATEGORY_CONFIG[selectedUnit.category].color,
                        }}
                      />
                    )
                  })()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedUnit.name}</h2>
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    {CATEGORY_CONFIG[selectedUnit.category].label} •{" "}
                    {selectedUnit.location?.district},{" "}
                    {selectedUnit.location?.sector}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 rounded-lg hover:bg-[#1E5D3D] transition-colors"
                style={{ color: COLORS.textMuted }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* Tabs */}
              <div
                className="flex gap-1 mb-6 border-b"
                style={{ borderColor: COLORS.borderSubtle }}
              >
                {[
                  { key: "overview", label: "Overview", icon: Eye },
                  { key: "activities", label: "Activities", icon: FileText },
                  { key: "monitoring", label: "Monitoring", icon: BarChart2 },
                  { key: "inventory", label: "Inventory", icon: Package },
                  { key: "production", label: "Production", icon: TrendingUp },
                  { key: "expenses", label: "Expenses", icon: DollarSign },
                  { key: "reports", label: "Reports", icon: FileText },
                  { key: "documents", label: "Documents", icon: FileText },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 transition-colors -mb-px ${
                      detailTab === tab.key ? "text-white" : ""
                    }`}
                    style={{
                      color:
                        detailTab === tab.key
                          ? COLORS.accent
                          : COLORS.textMuted,
                      borderBottomColor:
                        detailTab === tab.key ? COLORS.accent : "transparent",
                    }}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {detailTab === "overview" && (
                  <OverviewTab unit={selectedUnit} />
                )}
                {detailTab === "activities" && (
                  <ActivitiesTab unitId={selectedUnit._id} />
                )}
                {detailTab === "monitoring" && (
                  <MonitoringTab unit={selectedUnit} />
                )}
                {detailTab === "production" && (
                  <ProductionTab unit={selectedUnit} />
                )}
                {detailTab === "expenses" && (
                  <ExpensesTab unitId={selectedUnit._id} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-components for detail tabs
function OverviewTab({ unit }) {
  const config = CATEGORY_CONFIG[unit.category]
  const statusConfig = STATUS_CONFIG[unit.status] || {
    label: unit.status,
    color: COLORS.textMuted,
  }
  const Icon = config.icon

  if (unit.category === "plants") {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <div
          className="bg-[#1A4D35] rounded-2xl p-6 border"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Wheat className="w-5 h-5" style={{ color: config.color }} />
            Crop Information
          </h3>
          <div className="space-y-3">
            {[
              { label: "Crop", value: unit.plantData?.cropName },
              { label: "Variety", value: unit.plantData?.cropVariety },
              { label: "Purpose", value: unit.plantData?.productionPurpose },
              {
                label: "Land Size",
                value: `${unit.plantData?.landSize} ${unit.plantData?.landUnit || "ha"}`,
              },
              { label: "Soil Type", value: unit.plantData?.soilType },
              { label: "Soil Fertility", value: unit.plantData?.soilFertility },
              { label: "Ownership", value: unit.plantData?.landOwnership },
              {
                label: "Planting Date",
                value: unit.plantData?.plantingDate
                  ? new Date(unit.plantData.plantingDate).toLocaleDateString()
                  : "N/A",
              },
              {
                label: "Expected Harvest",
                value: unit.plantData?.expectedHarvestDate
                  ? new Date(
                      unit.plantData.expectedHarvestDate,
                    ).toLocaleDateString()
                  : "N/A",
              },
              {
                label: "Current Stage",
                value: unit.plantData?.currentGrowthStage,
              },
              { label: "Irrigation", value: unit.plantData?.irrigationMethod },
              { label: "Water Source", value: unit.plantData?.waterSource },
              { label: "Fertilizer", value: unit.plantData?.fertilizerType },
              { label: "Previous Crop", value: unit.plantData?.previousCrop },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between py-2 border-b"
                style={{ borderColor: COLORS.borderSubtle }}
              >
                <span style={{ color: COLORS.textMuted }}>{item.label}</span>
                <span className="font-medium">{item.value || "N/A"}</span>
              </div>
            ))}
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
            Observations
          </h3>
          <div className="space-y-4">
            <div>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: COLORS.textMuted }}
              >
                Pest Observations
              </p>
              <p
                className="text-sm"
                style={{
                  color: unit.plantData?.pestObservations
                    ? COLORS.warning
                    : COLORS.textMuted,
                }}
              >
                {unit.plantData?.pestObservations ||
                  "No pest observations recorded"}
              </p>
            </div>
            <div>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: COLORS.textMuted }}
              >
                Disease Observations
              </p>
              <p
                className="text-sm"
                style={{
                  color: unit.plantData?.diseaseObservations
                    ? COLORS.error
                    : COLORS.textMuted,
                }}
              >
                {unit.plantData?.diseaseObservations ||
                  "No disease observations recorded"}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  } else {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <div
          className="bg-[#1A4D35] rounded-2xl p-6 border"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PawPrint className="w-5 h-5" style={{ color: config.color }} />
            Livestock Information
          </h3>
          <div className="space-y-3">
            {[
              { label: "Species", value: unit.livestockData?.animalType },
              { label: "Breed", value: unit.livestockData?.breed },
              {
                label: "Purpose",
                value: unit.livestockData?.productionPurpose,
              },
              {
                label: "Total Population",
                value: unit.livestockData?.population?.total,
              },
              { label: "Males", value: unit.livestockData?.population?.males },
              {
                label: "Females",
                value: unit.livestockData?.population?.females,
              },
              { label: "Young", value: unit.livestockData?.population?.young },
              {
                label: "Adults",
                value: unit.livestockData?.population?.adults,
              },
              {
                label: "Housing Type",
                value: unit.livestockData?.housing?.housingType,
              },
              {
                label: "Facility Capacity",
                value: unit.livestockData?.housing?.facilityCapacity,
              },
              {
                label: "Feeding System",
                value: unit.livestockData?.housing?.feedingSystem,
              },
              {
                label: "Feed Type",
                value: unit.livestockData?.housing?.feedType,
              },
              {
                label: "Water Source",
                value: unit.livestockData?.housing?.waterSource,
              },
              {
                label: "Health Status",
                value: unit.livestockData?.health?.generalStatus,
              },
              {
                label: "Vaccination",
                value: unit.livestockData?.health?.vaccinationStatus,
              },
              {
                label: "Last Vet Visit",
                value: unit.livestockData?.health?.lastVetVisit
                  ? new Date(
                      unit.livestockData.health.lastVetVisit,
                    ).toLocaleDateString()
                  : "N/A",
              },
              {
                label: "Expected Production",
                value: `${unit.livestockData?.production?.expectedProduction} ${unit.livestockData?.production?.productionUnit}`,
              },
              {
                label: "Acquisition Date",
                value: unit.livestockData?.production?.acquisitionDate
                  ? new Date(
                      unit.livestockData.production.acquisitionDate,
                    ).toLocaleDateString()
                  : "N/A",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between py-2 border-b"
                style={{ borderColor: COLORS.borderSubtle }}
              >
                <span style={{ color: COLORS.textMuted }}>{item.label}</span>
                <span className="font-medium">{item.value || "N/A"}</span>
              </div>
            ))}
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
            Health Notes
          </h3>
          <div className="space-y-4">
            <div>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: COLORS.textMuted }}
              >
                Previous Diseases
              </p>
              <p
                className="text-sm"
                style={{
                  color: unit.livestockData?.health?.previousDiseases
                    ? COLORS.warning
                    : COLORS.textMuted,
                }}
              >
                {unit.livestockData?.health?.previousDiseases ||
                  "No previous diseases recorded"}
              </p>
            </div>
            <div>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: COLORS.textMuted }}
              >
                Vet Contact
              </p>
              <p className="text-sm" style={{ color: COLORS.textPrimary }}>
                {unit.livestockData?.health?.vetContact || "Not provided"}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

function ActivitiesTab({ unitId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await productionApi.getActivities(unitId)
        setActivities(res.activities || [])
      } catch (error) {
        console.error("Failed to load activities:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [unitId])

  if (loading)
    return (
      <div className="text-center py-8" style={{ color: COLORS.textMuted }}>
        Loading activities...
      </div>
    )
  if (activities.length === 0)
    return (
      <div className="text-center py-8" style={{ color: COLORS.textMuted }}>
        No activities recorded yet
      </div>
    )

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity._id}
          className="bg-[#1A4D35] rounded-xl p-4 border"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${COLORS.accent}20` }}
              >
                <FileText
                  className="w-5 h-5"
                  style={{ color: COLORS.accent }}
                />
              </div>
              <div>
                <h4 className="font-medium">
                  {activity.activityType.replace("_", " ")}
                </h4>
                <p className="text-sm" style={{ color: COLORS.textMuted }}>
                  {activity.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: COLORS.textMuted }}>
                {new Date(activity.occurredAt).toLocaleDateString()}
              </p>
              {activity.cost && (
                <p
                  className="text-sm font-medium"
                  style={{ color: COLORS.accent }}
                >
                  {activity.cost} {activity.currency || "RWF"}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MonitoringTab({ unit }) {
  return (
    <div className="text-center py-8" style={{ color: COLORS.textMuted }}>
      <BarChart2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
      <h3 className="text-lg font-medium mb-2">Monitoring Records</h3>
      <p>
        Monitoring data will appear here as you add crop monitoring or livestock
        health records.
      </p>
      <button
        className="mt-4 px-4 py-2 rounded-xl border transition-colors"
        style={{
          borderColor: COLORS.borderSubtle,
          color: COLORS.textSecondary,
        }}
      >
        Add Monitoring Record
      </button>
    </div>
  )
}

function ProductionTab({ unit }) {
  return (
    <div className="text-center py-8" style={{ color: COLORS.textMuted }}>
      <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" />
      <h3 className="text-lg font-medium mb-2">Production Records</h3>
      <p>Harvest and animal production records will appear here.</p>
      <button
        className="mt-4 px-4 py-2 rounded-xl border transition-colors"
        style={{
          borderColor: COLORS.borderSubtle,
          color: COLORS.textSecondary,
        }}
      >
        Add Production Record
      </button>
    </div>
  )
}

function ExpensesTab({ unitId }) {
  return (
    <div className="text-center py-8" style={{ color: COLORS.textMuted }}>
      <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-30" />
      <h3 className="text-lg font-medium mb-2">Expenses</h3>
      <p>Expense tracking for this production unit.</p>
      <button
        className="mt-4 px-4 py-2 rounded-xl border transition-colors"
        style={{
          borderColor: COLORS.borderSubtle,
          color: COLORS.textSecondary,
        }}
      >
        Add Expense
      </button>
    </div>
  )
}

// Reusable components
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
