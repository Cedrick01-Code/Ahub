import { useState, useCallback } from "react"
import {
  MapPin,
  Sprout,
  Droplets,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  Send,
  Save,
  AlertCircle,
  Building2,
  Wheat,
  PawPrint,
  Target,
  Shield,
  Trash2,
  Edit,
  Eye,
  Map,
  Database,
  Link2,
  Plus,
  Sparkles,
  BookOpen,
  type LucideIcon,
} from "lucide-react"

const COLORS = {
  accent: "#10B981",
  accentHover: "#059669",
  accentGlow: "rgba(16, 185, 129, 0.4)",
  bgMain: "#F8FAF8",
  bgCard: "#FFFFFF",
  bgInput: "#F0FDF4",
  borderSubtle: "#BBF7D0",
  borderMain: "#86EFAC",
  textPrimary: "#14532D",
  textSecondary: "#166534",
  textMuted: "#6B9B7B",
  textPlaceholder: "#86BFA7",
  error: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  info: "#3B82F6",
  badgeActive: "#DCFCE7",
  badgeActiveText: "#166534",
  badgeFallow: "#FEF3C7",
  badgeFallowText: "#92400E",
  badgeHarvesting: "#FCE7F3",
  badgeHarvestingText: "#9D174D",
  badgePlanning: "#E0E7FF",
  badgePlanningText: "#3730A3",
}

const STEPS = [
  { key: "details", label: "Plot Details", icon: Building2, description: "Basic information and identification" },
  { key: "location", label: "Location & Soil", icon: MapPin, description: "GPS coordinates and soil characteristics" },
  { key: "setup", label: "Crop/Livestock Setup", icon: Sprout, description: "Planting, irrigation, and harvest planning" },
]

const OWNERSHIP_OPTIONS = [
  { value: "owned", label: "Owned" },
  { value: "leased", label: "Leased" },
  { value: "communal", label: "Communal" },
]

const SOIL_TYPE_OPTIONS = [
  { value: "clay", label: "Clay" },
  { value: "sandy", label: "Sandy" },
  { value: "loamy", label: "Loamy" },
  { value: "silty", label: "Silty" },
  { value: "peaty", label: "Peaty" },
  { value: "chalky", label: "Chalky" },
  { value: "other", label: "Other" },
]

const IRRIGATION_OPTIONS = [
  { value: "rainfed", label: "Rainfed" },
  { value: "drip", label: "Drip Irrigation" },
  { value: "sprinkler", label: "Sprinkler" },
  { value: "manual", label: "Manual" },
  { value: "flood", label: "Flood" },
  { value: "other", label: "Other" },
]

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning", color: COLORS.badgePlanning, textColor: COLORS.badgePlanningText },
  { value: "active", label: "Active", color: COLORS.badgeActive, textColor: COLORS.badgeActiveText },
  { value: "fallow", label: "Fallow", color: COLORS.badgeFallow, textColor: COLORS.badgeFallowText },
  { value: "harvesting", label: "Harvesting", color: COLORS.badgeHarvesting, textColor: COLORS.badgeHarvestingText },
]

const CATEGORY_OPTIONS = [
  { value: "plants", label: "Crops", icon: Wheat, color: "#22C55E" },
  { value: "animals", label: "Livestock", icon: PawPrint, color: "#F59E0B" },
]

const UNIT_OPTIONS = ["ha", "acres", "sqm", "m²"]

interface PlotData {
  plotId: string
  name: string
  category: "plants" | "animals"
  ownership: string
  area: string
  unit: string
  gpsLatitude: string
  gpsLongitude: string
  soilType: string
  irrigation: string
  plantingDate: string
  expectedHarvest: string
  cropName: string
  cropVariety: string
  expectedYield: string
  yieldUnit: string
  status: string
  description: string
  animalType: string
  breed: string
  population: string
}

interface PlotRegistrationWizardProps {
  onSubmit: (plot: PlotData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<PlotData>
  isEditing?: boolean
}

export function PlotRegistrationWizard({ onSubmit, onCancel, initialData, isEditing = false }: PlotRegistrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [draftSaved, setDraftSaved] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapCoords, setMapCoords] = useState({ lat: "", lng: "" })

  const generatePlotId = useCallback(() => {
    const prefix = "PLT"
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }, [])

  const [formData, setFormData] = useState<PlotData>({
    plotId: generatePlotId(),
    name: "",
    category: "plants",
    ownership: "owned",
    area: "",
    unit: "ha",
    gpsLatitude: "",
    gpsLongitude: "",
    soilType: "loamy",
    irrigation: "rainfed",
    plantingDate: "",
    expectedHarvest: "",
    cropName: "",
    cropVariety: "",
    expectedYield: "",
    yieldUnit: "kg",
    status: "planning",
    description: "",
    animalType: "cattle",
    breed: "",
    population: "",
    ...initialData,
  })

  if (initialData?.plotId) {
    setFormData(prev => ({ ...prev, plotId: initialData.plotId! }))
  }

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {}

    if (step === 0) {
      if (!formData.name.trim()) newErrors.name = "Plot name is required"
      if (!formData.category) newErrors.category = "Category is required"
      if (!formData.ownership) newErrors.ownership = "Ownership is required"
      if (!formData.area) newErrors.area = "Area is required"
      if (!formData.unit) newErrors.unit = "Unit is required"
    } else if (step === 1) {
      if (!formData.soilType) newErrors.soilType = "Soil type is required"
      if (!formData.irrigation) newErrors.irrigation = "Irrigation method is required"
    } else if (step === 2) {
      if (formData.category === "plants") {
        if (!formData.cropName.trim()) newErrors.cropName = "Crop name is required"
        if (!formData.plantingDate) newErrors.plantingDate = "Planting date is required"
        if (!formData.expectedHarvest) newErrors.expectedHarvest = "Expected harvest date is required"
      } else {
        if (!formData.animalType) newErrors.animalType = "Animal type is required"
        if (!formData.population) newErrors.population = "Population is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (isDraft = false) => {
    setIsSubmitting(true)
    setErrors({})

    if (!validateStep(currentStep)) {
      setIsSubmitting(false)
      return
    }

    try {
      const payload = {
        ...formData,
        isDraft,
        area: parseFloat(formData.area) || 0,
        population: parseInt(formData.population) || 0,
        expectedYield: parseFloat(formData.expectedYield) || 0,
      }

      await onSubmit(payload)

      if (!isDraft) {
        if (onCancel) onCancel()
      } else {
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 3000)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed"
      setErrors({ form: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGpsPin = () => {
    setMapCoords({ lat: formData.gpsLatitude, lng: formData.gpsLongitude })
    setShowMapModal(true)
  }

  const handleMapSelect = (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, gpsLatitude: lat.toFixed(6), gpsLongitude: lng.toFixed(6) }))
    setShowMapModal(false)
  }

  const updateField = (field: keyof PlotData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepPlotDetails formData={formData} updateField={updateField} errors={errors} />
      case 1:
        return <StepLocationSoil formData={formData} updateField={updateField} errors={errors} onGpsPin={handleGpsPin} />
      case 2:
        return <StepCropLivestock formData={formData} updateField={updateField} errors={errors} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#14532D]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div
                  className="relative flex items-center justify-center w-12 h-12 rounded-full mb-2 transition-all"
                  style={{
                    backgroundColor:
                      index < currentStep
                        ? COLORS.accent
                        : index === currentStep
                        ? COLORS.accent
                        : COLORS.bgInput,
                    border:
                      index === currentStep
                        ? `2px solid ${COLORS.accent}`
                        : "none",
                  }}
                >
                  {index < currentStep ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <span className="text-white font-bold">{index + 1}</span>
                  )}
                </div>
                <span
                  className="text-xs font-medium text-center"
                  style={{
                    color:
                      index <= currentStep
                        ? COLORS.textPrimary
                        : COLORS.textMuted,
                  }}
                >
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className="absolute top-6 left-[50%] w-full h-0.5 z-0"
                    style={{
                      backgroundColor:
                        index < currentStep
                          ? COLORS.accent
                          : COLORS.borderSubtle,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl border p-6 md:p-8 shadow-sm" style={{ borderColor: COLORS.borderSubtle }}>
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            onClick={onCancel}
            className="px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
            style={{
              backgroundColor: COLORS.bgCard,
              color: COLORS.textSecondary,
              border: `1px solid ${COLORS.borderSubtle}`,
            }}
          >
            <ChevronLeft className="w-5 h-5" /> {onCancel ? "Cancel" : "Back"}
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-medium transition-colors border flex items-center gap-2"
              style={{
                backgroundColor: COLORS.bgCard,
                color: COLORS.textSecondary,
                borderColor: COLORS.borderSubtle,
              }}
            >
              <Save className="w-5 h-5" /> Save Draft
            </button>

            {currentStep === STEPS.length - 1 ? (
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: COLORS.accent,
                  color: "#FFFFFF",
                  boxShadow: `0 0 12px ${COLORS.accentGlow}`,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {isEditing ? "Update Plot" : "Register Plot"}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: COLORS.accent,
                  color: "#FFFFFF",
                  boxShadow: `0 0 12px ${COLORS.accentGlow}`,
                }}
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {draftSaved && (
          <div className="fixed bottom-4 right-4 bg-green-900/90 border border-green-700 text-green-100 px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-up z-50">
            <Check className="w-5 h-5" />
            <span>Draft saved successfully</span>
          </div>
        )}

        {/* Map Modal */}
        {showMapModal && (
          <MapModal
            initialLat={parseFloat(mapCoords.lat) || -1.9441}
            initialLng={parseFloat(mapCoords.lng) || 30.0619}
            onSelect={handleMapSelect}
            onClose={() => setShowMapModal(false)}
          />
        )}
      </div>
    </div>
  )
}

function StepPlotDetails({ formData, updateField, errors }: { formData: PlotData; updateField: (field: keyof PlotData, value: string) => void; errors: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: COLORS.accent }}>
        <Building2 className="w-5 h-5" /> Plot Details
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField
          name="name"
          label="Plot Name *"
          value={formData.name}
          onChange={updateField}
          placeholder="e.g., North Field, Greenhouse 1"
          error={errors.name}
        />

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: COLORS.textSecondary }}>
            Plot ID
          </label>
          <input
            value={formData.plotId}
            readOnly
            className="w-full px-4 py-3 rounded-xl bg-[#F0FDF4] border text-[#14532D] cursor-not-allowed"
            style={{ borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgInput }}
          />
          <p className="mt-1 text-xs" style={{ color: COLORS.textMuted }}>Auto-generated unique identifier</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: COLORS.textSecondary }}>
          Category *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField("category", opt.value)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
              style={{
                backgroundColor:
                  formData.category === opt.value
                    ? `${opt.color}20`
                    : COLORS.bgInput,
                borderColor:
                  formData.category === opt.value
                    ? opt.color
                    : COLORS.borderSubtle,
                color:
                  formData.category === opt.value
                    ? opt.color
                    : COLORS.textPrimary,
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor:
                    formData.category === opt.value
                      ? opt.color
                      : COLORS.bgCard,
                }}
              >
                <opt.icon className="w-5 h-5" style={{ color: formData.category === opt.value ? "#FFFFFF" : opt.color }} />
              </div>
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SelectField
          name="ownership"
          label="Ownership *"
          value={formData.ownership}
          onChange={updateField}
          options={OWNERSHIP_OPTIONS}
          error={errors.ownership}
        />
        <InputField
          name="area"
          label="Area *"
          value={formData.area}
          onChange={updateField}
          placeholder="e.g., 2.5"
          type="number"
          step="0.01"
          error={errors.area}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SelectField
          name="unit"
          label="Unit *"
          value={formData.unit}
          onChange={updateField}
          options={UNIT_OPTIONS.map(u => ({ value: u, label: u }))}
          error={errors.unit}
        />
        <SelectField
          name="status"
          label="Status"
          value={formData.status}
          onChange={updateField}
          options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: COLORS.textSecondary }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          rows={3}
          placeholder="Describe your plot..."
          className="w-full px-4 py-3 rounded-xl bg-[#F0FDF4] border text-[#14532D] placeholder-[#86BFA7] focus:outline-none focus:ring-2 resize-none transition-colors"
          style={{ borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgInput }}
        />
      </div>
    </div>
  )
}

function StepLocationSoil({ formData, updateField, errors, onGpsPin }: { formData: PlotData; updateField: (field: keyof PlotData, value: string) => void; errors: Record<string, string>; onGpsPin: () => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: COLORS.accent }}>
        <MapPin className="w-5 h-5" /> Location & Soil
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2" style={{ color: COLORS.textSecondary }}>
            GPS Location
          </label>
          <button
            type="button"
            onClick={onGpsPin}
            className="w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-colors"
            style={{
              borderColor: COLORS.borderSubtle,
              backgroundColor: COLORS.bgInput,
              color: COLORS.textPrimary,
            }}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" style={{ color: COLORS.accent }} />
              <span>Pin Location on Map</span>
            </div>
            <Target className="w-5 h-5" style={{ color: COLORS.accent }} />
          </button>
          <p className="mt-1 text-xs" style={{ color: COLORS.textMuted }}>
            {formData.gpsLatitude && formData.gpsLongitude
              ? `Coordinates: ${formData.gpsLatitude}, ${formData.gpsLongitude}`
              : "Click to open map and select your plot location"}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <InputField
          name="gpsLatitude"
          label="Latitude"
          value={formData.gpsLatitude}
          onChange={updateField}
          placeholder="-1.9441"
          type="number"
          step="any"
        />
        <InputField
          name="gpsLongitude"
          label="Longitude"
          value={formData.gpsLongitude}
          onChange={updateField}
          placeholder="30.0619"
          type="number"
          step="any"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <SelectField
          name="soilType"
          label="Soil Type *"
          value={formData.soilType}
          onChange={updateField}
          options={SOIL_TYPE_OPTIONS}
          error={errors.soilType}
        />
        <SelectField
          name="irrigation"
          label="Irrigation *"
          value={formData.irrigation}
          onChange={updateField}
          options={IRRIGATION_OPTIONS}
          error={errors.irrigation}
        />
      </div>
    </div>
  )
}

function StepCropLivestock({ formData, updateField, errors }: { formData: PlotData; updateField: (field: keyof PlotData, value: string) => void; errors: Record<string, string> }) {
  if (formData.category === "plants") {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: COLORS.accent }}>
          <Sprout className="w-5 h-5" /> Crop Setup
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            name="cropName"
            label="Crop Name *"
            value={formData.cropName}
            onChange={updateField}
            placeholder="e.g., Tomatoes, Maize, Beans"
            error={errors.cropName}
          />
          <InputField
            name="cropVariety"
            label="Crop Variety"
            value={formData.cropVariety}
            onChange={updateField}
            placeholder="e.g., Roma VF, SC 403"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            name="plantingDate"
            label="Planting Date *"
            value={formData.plantingDate}
            onChange={updateField}
            type="date"
            error={errors.plantingDate}
          />
          <InputField
            name="expectedHarvest"
            label="Expected Harvest *"
            value={formData.expectedHarvest}
            onChange={updateField}
            type="date"
            error={errors.expectedHarvest}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            name="expectedYield"
            label="Expected Yield"
            value={formData.expectedYield}
            onChange={updateField}
            placeholder="e.g., 5000"
            type="number"
            step="0.1"
          />
          <SelectField
            name="yieldUnit"
            label="Yield Unit"
            value={formData.yieldUnit}
            onChange={updateField}
            options={["kg", "tonnes", "bags", "crates", "pieces"].map(u => ({ value: u, label: u }))}
          />
        </div>
      </div>
    )
  } else {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: COLORS.accent }}>
          <PawPrint className="w-5 h-5" /> Livestock Setup
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
          <SelectField
            name="animalType"
            label="Animal Type *"
            value={formData.animalType}
            onChange={updateField}
            options={[
              "cattle", "goats", "sheep", "pigs", "poultry", "rabbits", "fish", "other"
            ].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))}
            error={errors.animalType}
          />
          <InputField
            name="breed"
            label="Breed"
            value={formData.breed}
            onChange={updateField}
            placeholder="e.g., Holstein, Kuroiler"
          />
          <InputField
            name="population"
            label="Population *"
            value={formData.population}
            onChange={updateField}
            placeholder="e.g., 50"
            type="number"
            error={errors.population}
          />
        </div>
      </div>
    )
  }
}

function MapModal({ initialLat, initialLng, onSelect, onClose }: { initialLat: number; initialLng: number; onSelect: (lat: number, lng: number) => void; onClose: () => void }) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const [marker, setMarker] = useState<L.Marker | null>(null)
  const mapRef = useState<HTMLDivElement | null>(null)
  const [selectedLat, setSelectedLat] = useState(initialLat)
  const [selectedLng, setSelectedLng] = useState(initialLng)

  const mapContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (el && !mapInstance) {
      const map = L.map(el, {
        center: [initialLat, initialLng],
        zoom: 13,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color:#10b981;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      const m = L.marker([initialLat, initialLng], { icon: customIcon, draggable: true }).addTo(map)

      m.on('dragend', (e) => {
        const pos = e.target.getLatLng()
        setSelectedLat(pos.lat)
        setSelectedLng(pos.lng)
      })

      map.on('click', (e) => {
        m.setLatLng(e.latlng)
        setSelectedLat(e.latlng.lat)
        setSelectedLng(e.latlng.lng)
      })

      setMapInstance(map)
      setMarker(m)

      setTimeout(() => map.invalidateSize(), 100)

      return () => {
        map.remove()
      }
    }
  }, [mapInstance, initialLat, initialLng])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ borderColor: COLORS.borderSubtle }}>
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10" style={{ borderColor: COLORS.borderSubtle }}>
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: COLORS.textPrimary }}>
            <Map className="w-5 h-5" /> Pin Plot Location
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F0FDF4] transition-colors" style={{ color: COLORS.textMuted }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div ref={mapContainerRef} style={{ width: '100%', height: '400px', borderRadius: '12px' }} />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs" style={{ color: COLORS.textMuted }}>Latitude</p>
              <p className="font-mono font-medium">{selectedLat.toFixed(6)}</p>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs" style={{ color: COLORS.textMuted }}>Longitude</p>
              <p className="font-mono font-medium">{selectedLng.toFixed(6)}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl font-medium border transition-colors" style={{ borderColor: COLORS.borderSubtle, color: COLORS.textSecondary }}>
              Cancel
            </button>
            <button onClick={() => { onSelect(selectedLat, selectedLng); onClose(); }} className="px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2" style={{ backgroundColor: COLORS.accent, color: "#FFFFFF" }}>
              <Check className="w-4 h-4" /> Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reusable Field Components
function InputField({ name, label, value, onChange, placeholder, type = "text", error, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: COLORS.textSecondary }}>
        {label}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-[#F0FDF4] border text-[#14532D] placeholder-[#86BFA7] focus:outline-none focus:ring-2 transition-colors"
        style={{
          borderColor: error ? COLORS.error : COLORS.borderSubtle,
          backgroundColor: COLORS.bgInput,
        }}
        onFocus={(e) => (e.target.style.borderColor = COLORS.accent)}
        onBlur={(e) => (e.target.style.borderColor = error ? COLORS.error : COLORS.borderSubtle)}
        {...props}
      />
      {error && <p className="mt-1 text-sm" style={{ color: COLORS.error }}>{error}</p>}
    </div>
  )
}

function SelectField({ name, label, value, onChange, options, placeholder, disabled, error }: any) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: COLORS.textSecondary }}>
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl bg-[#F0FDF4] border text-[#14532D] focus:outline-none focus:ring-2 transition-colors"
        style={{
          borderColor: error ? COLORS.error : COLORS.borderSubtle,
          backgroundColor: disabled ? COLORS.bgInput : COLORS.bgInput,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onFocus={(e) => !disabled && (e.target.style.borderColor = COLORS.accent)}
        onBlur={(e) => !disabled && (e.target.style.borderColor = error ? COLORS.error : COLORS.borderSubtle)}
      >
        <option value="" disabled>{placeholder || "Select..."}</option>
        {Array.isArray(options) &&
          options.map((opt) =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace("_", " ")}</option>
            ) : (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ),
          )}
      </select>
      {error && <p className="mt-1 text-sm" style={{ color: COLORS.error }}>{error}</p>}
    </div>
  )
}

// Plot Card Component for List View
interface PlotCardProps {
  plot: PlotData
  onEdit: (plot: PlotData) => void
  onView: (plot: PlotData) => void
  onDelete: (plotId: string) => void
}

export function PlotCard({ plot, onEdit, onView, onDelete }: PlotCardProps) {
  const categoryConfig = CATEGORY_OPTIONS.find(c => c.value === plot.category) || CATEGORY_OPTIONS[0]
  const statusConfig = STATUS_OPTIONS.find(s => s.value === plot.status) || STATUS_OPTIONS[0]
  const CategoryIcon = categoryConfig.icon

  return (
    <div className="group bg-white rounded-2xl p-5 border transition-all hover:shadow-xl cursor-pointer" style={{ borderColor: COLORS.borderSubtle }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${categoryConfig.color}20` }}>
            <CategoryIcon className="w-5 h-5" style={{ color: categoryConfig.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-lg" style={{ color: COLORS.textPrimary }}>
              {plot.name}
            </h3>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>
              {categoryConfig.label} • {plot.area} {plot.unit} • {plot.ownership}
            </p>
            <p className="text-xs font-mono" style={{ color: COLORS.textMuted }}>
              ID: {plot.plotId}
            </p>
          </div>
        </div>
        <span
          className="px-2 py-1 rounded-full text-xs font-medium shrink-0"
          style={{
            backgroundColor: statusConfig.color,
            color: statusConfig.textColor,
          }}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {plot.category === "plants" ? (
          <>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Crop</p>
              <p className="font-medium" style={{ color: COLORS.textPrimary }}>{plot.cropName || "N/A"}</p>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Variety</p>
              <p className="font-medium" style={{ color: COLORS.textPrimary }}>{plot.cropVariety || "N/A"}</p>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Soil</p>
              <p className="font-medium capitalize" style={{ color: COLORS.textPrimary }}>{plot.soilType}</p>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Irrigation</p>
              <p className="font-medium capitalize" style={{ color: COLORS.textPrimary }}>{plot.irrigation.replace("_", " ")}</p>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Planting</p>
              <p className="font-medium" style={{ color: COLORS.textPrimary }}>{plot.plantingDate ? new Date(plot.plantingDate).toLocaleDateString() : "N/A"}</p>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Harvest</p>
              <p className="font-medium" style={{ color: COLORS.textPrimary }}>{plot.expectedHarvest ? new Date(plot.expectedHarvest).toLocaleDateString() : "N/A"}</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Species</p>
              <p className="font-medium capitalize" style={{ color: COLORS.textPrimary }}>{plot.animalType}</p>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Breed</p>
              <p className="font-medium" style={{ color: COLORS.textPrimary }}>{plot.breed || "N/A"}</p>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl p-3" style={{ borderColor: COLORS.borderSubtle }}>
              <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Population</p>
              <p className="font-medium" style={{ color: COLORS.textPrimary }}>{plot.population}</p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: COLORS.borderSubtle }}>
        <div className="flex items-center gap-2">
          {plot.gpsLatitude && plot.gpsLongitude ? (
            <span className="flex items-center gap-1 text-xs" style={{ color: COLORS.textMuted }}>
              <MapPin className="w-3 h-3" />
              {parseFloat(plot.gpsLatitude).toFixed(4)}, {parseFloat(plot.gpsLongitude).toFixed(4)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              const guideEl = document.getElementById("guide-me")
              if (guideEl) {
                guideEl.scrollIntoView({ behavior: "smooth" })
              }
            }}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-xs"
            title="Open Gemini AI Field Guide for this Plot"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gemini Guide</span>
          </button>
          <button onClick={() => onView(plot)} className="p-2 rounded-lg hover:bg-[#F0FDF4] transition-colors" style={{ color: COLORS.textMuted }} title="View Details">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(plot)} className="p-2 rounded-lg hover:bg-[#F0FDF4] transition-colors" style={{ color: COLORS.textMuted }} title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(plot.plotId)} className="p-2 rounded-lg hover:bg-[#FEF2F2] transition-colors" style={{ color: COLORS.error }} title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Empty State Component
interface EmptyStateProps {
  onRegister: () => void
}

export function PlotEmptyState({ onRegister }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-6 w-32 h-32 rounded-full flex items-center justify-center" style={{ backgroundColor: `${COLORS.accent}15` }}>
        <Sprout className="w-16 h-16" style={{ color: COLORS.accent }} />
      </div>
      <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.textPrimary }}>
        You haven't registered any plots yet
      </h3>
      <p className="mb-6 max-w-md mx-auto" style={{ color: COLORS.textMuted }}>
        Register your first plot to start tracking yields, costs, and soil health.
      </p>
      <button
        onClick={onRegister}
        className="px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 mx-auto"
        style={{
          backgroundColor: COLORS.accent,
          color: "#FFFFFF",
          boxShadow: `0 0 12px ${COLORS.accentGlow}`,
        }}
      >
        <Plus className="w-5 h-5" />
        Register Plot
      </button>
    </div>
  )
}

// List View Component
interface PlotListViewProps {
  plots: PlotData[]
  onRegister: () => void
  onEdit: (plot: PlotData) => void
  onView: (plot: PlotData) => void
  onDelete: (plotId: string) => void
  loading?: boolean
}

export function PlotListView({ plots, onRegister, onEdit, onView, onDelete, loading }: PlotListViewProps) {
  if (loading) {
    return (
      <div className="py-12 text-center" style={{ color: COLORS.textMuted }}>
        <div className="animate-spin inline-block w-8 h-8 border-2 border-transparent border-t-[#10B981] rounded-full mb-2" />
        <p>Loading plots...</p>
      </div>
    )
  }

  if (plots.length === 0) {
    return <PlotEmptyState onRegister={onRegister} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plots.map((plot) => (
        <PlotCard
          key={plot.plotId}
          plot={plot}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}