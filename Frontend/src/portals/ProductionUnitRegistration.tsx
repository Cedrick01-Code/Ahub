import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  MapPin,
  Camera,
  FileText,
  Save,
  Send,
  AlertCircle,
  Loader2,
  Wheat,
  PawPrint,
  Building2,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  Eye,
  Edit,
} from "lucide-react"
import { productionApi } from "../lib/productionApi"
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
}

const STEPS = [
  { key: "basic", label: "Basic Info", icon: "Building2" },
  { key: "details", label: "Production Details", icon: "Wheat" },
  { key: "media", label: "Media & Submit", icon: "Camera" },
]

const PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
]

const DISTRICTS_BY_PROVINCE = {
  "Kigali City": ["Gasabo", "Kicukiro", "Nyarugenge"],
  "Northern Province": ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
  "Southern Province": [
    "Gisagara",
    "Huye",
    "Kamonyi",
    "Muhanga",
    "Nyamagabe",
    "Nyanza",
    "Nyaruguru",
    "Ruhango",
  ],
  "Eastern Province": [
    "Bugesera",
    "Gatsibo",
    "Kayonza",
    "Kirehe",
    "Ngoma",
    "Nyagatare",
    "Rwamagana",
  ],
  "Western Province": [
    "Karongi",
    "Ngororero",
    "Nyabihu",
    "Nyamasheke",
    "Rubavu",
    "Rusizi",
    "Rutsiro",
  ],
}

const CELLS_BY_SECTOR = {
  Kacyiru: ["Kacyiru", "Kibaza", "Kamatamu"],
  Kimironko: ["Kimironko", "Bibare", "Kibagabaga"],
  Remera: ["Remera", "Kigina", "Nyakabanda"],
  Nyarugenge: ["Nyarugenge", "Gitega", "Kanyinya"],
  Muhima: ["Muhima", "Rwezamenyo", "Nyabugogo"],
  Kimisagara: ["Kimisagara", "Mageragere", "Nyakabanda"],
}

export function ProductionUnitRegistration() {
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [draftSaved, setDraftSaved] = useState(false)

  // Basic Info
  const [formData, setFormData] = useState({
    name: "",
    category: "plants",
    purpose: "mixed",
    province: "",
    district: "",
    sector: "",
    cell: "",
    village: "",
    gpsLatitude: "",
    gpsLongitude: "",
    description: "",
  })

  // Plant Details
  const [plantData, setPlantData] = useState({
    cropName: "",
    cropVariety: "",
    productionPurpose: "food",
    landSize: "",
    landUnit: "hectares",
    soilType: "loamy",
    soilFertility: "good",
    landOwnership: "owned",
    plantingDate: "",
    expectedHarvestDate: "",
    seedQuantity: "",
    seedUnit: "",
    irrigationMethod: "rainfed",
    waterSource: "",
    fertilizerType: "",
    previousCrop: "",
    currentGrowthStage: "prepared",
    pestObservations: "",
    diseaseObservations: "",
    expectedHarvestQuantity: "",
    expectedYieldUnit: "",
  })

  // Livestock Details
  const [livestockData, setLivestockData] = useState({
    animalType: "cattle",
    breed: "",
    productionPurpose: "meat",
    population: { total: "", males: "", females: "", young: "", adults: "" },
    housing: {
      housingType: "mixed",
      facilityCapacity: "",
      housingCondition: "good",
      feedingSystem: "mixed",
      feedType: "",
      waterSource: "",
    },
    health: {
      generalStatus: "healthy",
      vaccinationStatus: "unknown",
      previousDiseases: "",
      lastVetVisit: "",
      vetContact: "",
    },
    production: {
      expectedProduction: "",
      productionUnit: "",
      acquisitionDate: "",
    },
  })

  // Media
  const [coverPhoto, setCoverPhoto] = useState(null)
  const [photos, setPhotos] = useState([])
  const [documents, setDocuments] = useState([])

  // Derived
  const districts = DISTRICTS_BY_PROVINCE[formData.province] || []
  const sectors = [] // Would be populated from API
  const cells = CELLS_BY_SECTOR[formData.sector] || []

  const validateStep = () => {
    const newErrors = {}
    if (currentStep === 0) {
      if (!formData.name.trim())
        newErrors.name = "Production unit name is required"
      if (!formData.category) newErrors.category = "Category is required"
      if (!formData.province) newErrors.province = "Province is required"
      if (!formData.district) newErrors.district = "District is required"
      if (!formData.sector) newErrors.sector = "Sector is required"
      if (!formData.cell) newErrors.cell = "Cell is required"
      if (!formData.village) newErrors.village = "Village is required"
    } else if (currentStep === 1) {
      if (formData.category === "plants") {
        if (!plantData.cropName.trim())
          newErrors.cropName = "Crop name is required"
        if (!plantData.landSize) newErrors.landSize = "Land size is required"
        if (!plantData.plantingDate)
          newErrors.plantingDate = "Planting date is required"
      } else {
        if (!livestockData.animalType)
          newErrors.animalType = "Animal type is required"
        if (!livestockData.population.total)
          newErrors.population = "Total population is required"
        const total = Number(livestockData.population.total)
        const sum =
          Number(livestockData.population.males) +
          Number(livestockData.population.females) +
          Number(livestockData.population.young) +
          Number(livestockData.population.adults)
        if (sum > 0 && sum !== total)
          newErrors.population = "Population breakdown must equal total"
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (isDraft = false) => {
    setIsSubmitting(true)
    setErrors({})

    try {
      const payload = {
        ...formData,
        isDraft,
        plantData: formData.category === "plants" ? plantData : undefined,
        livestockData:
          formData.category === "animals" ? livestockData : undefined,
        coverPhoto,
        photos,
        documents,
      }

      const result = await productionApi.post("/production-units", payload)
      announce(
        isDraft
          ? "Draft saved successfully"
          : "Production unit registered successfully",
      )

      if (!isDraft) {
        navigate("/farmer/production-units")
      } else {
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 3000)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed"
      if (message.includes("validation")) {
        // Parse validation errors
        setErrors({ form: message })
      } else {
        announce(message, "error")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            districts={districts}
            sectors={sectors}
            cells={cells}
          />
        )
      case 1:
        return formData.category === "plants" ? (
          <PlantDetailsStep
            plantData={plantData}
            setPlantData={setPlantData}
            errors={errors}
          />
        ) : (
          <LivestockDetailsStep
            livestockData={livestockData}
            setLivestockData={setLivestockData}
            errors={errors}
          />
        )
      case 2:
        return (
          <MediaStep
            coverPhoto={coverPhoto}
            setCoverPhoto={setCoverPhoto}
            photos={photos}
            setPhotos={setPhotos}
            documents={documents}
            setDocuments={setDocuments}
          />
        )
      default:
        return null
    }
  }

  return (
    <div
      className="min-h-screen bg-[#0A1A12] text-white"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
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
                    <Check className="w-6 h-6 text-black" />
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
        <div
          className="bg-[#123D30] rounded-2xl border p-6 md:p-8"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-6 py-3 rounded-xl font-medium transition-colors"
            style={{
              backgroundColor:
                currentStep === 0 ? COLORS.bgInput : COLORS.bgCard,
              color: currentStep === 0 ? COLORS.textMuted : COLORS.textPrimary,
              border: `1px solid ${COLORS.borderSubtle}`,
            }}
          >
            <ChevronLeft className="w-5 h-5 inline mr-2" /> Back
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-medium transition-colors border"
              style={{
                backgroundColor: COLORS.bgCard,
                color: COLORS.textSecondary,
                borderColor: COLORS.borderSubtle,
              }}
            >
              <Save className="w-5 h-5 inline mr-2" /> Save Draft
            </button>

            {currentStep === STEPS.length - 1 ? (
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: COLORS.accent,
                  color: "#0A1A12",
                  boxShadow: `0 0 12px ${COLORS.accentGlow}`,
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSubmitting ? "Submitting..." : "Register Production Unit"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: COLORS.accent,
                  color: "#0A1A12",
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
      </div>
    </div>
  )
}

// ============================================
// STEP COMPONENTS
// ============================================

function BasicInfoStep({
  formData,
  setFormData,
  errors,
  districts,
  sectors,
  cells,
}) {
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === "province") {
      setFormData((prev) => ({
        ...prev,
        district: "",
        sector: "",
        cell: "",
        village: "",
      }))
    } else if (name === "district") {
      setFormData((prev) => ({ ...prev, sector: "", cell: "", village: "" }))
    } else if (name === "sector") {
      setFormData((prev) => ({ ...prev, cell: "", village: "" }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: COLORS.textSecondary }}
          >
            Production Unit Name *
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Maize Plot A, Poultry House 1"
            className="w-full px-4 py-3 rounded-xl bg-[#0A1A12] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors"
            style={{
              borderColor: errors.name ? COLORS.error : COLORS.borderSubtle,
              backgroundColor: COLORS.bgInput,
            }}
            onFocus={(e) => (e.target.style.borderColor = COLORS.accent)}
            onBlur={(e) =>
              (e.target.style.borderColor = errors.name
                ? COLORS.error
                : COLORS.borderSubtle)
            }
          />
          {errors.name && (
            <p className="mt-1 text-sm" style={{ color: COLORS.error }}>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: COLORS.textSecondary }}
          >
            Category *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "plants",
                label: "Plants (Crops)",
                icon: <Wheat className="w-5 h-5" />,
              },
              {
                value: "animals",
                label: "Animals (Livestock)",
                icon: <PawPrint className="w-5 h-5" />,
              },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, category: opt.value }))
                }
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
                style={{
                  backgroundColor:
                    formData.category === opt.value
                      ? "rgba(16, 185, 129, 0.2)"
                      : COLORS.bgInput,
                  borderColor:
                    formData.category === opt.value
                      ? COLORS.accent
                      : COLORS.borderSubtle,
                  color:
                    formData.category === opt.value
                      ? COLORS.accent
                      : COLORS.textPrimary,
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor:
                      formData.category === opt.value
                        ? COLORS.accent
                        : COLORS.bgCard,
                  }}
                >
                  {opt.icon}
                </div>
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: COLORS.textSecondary }}
        >
          Production Purpose
        </label>
        <select
          name="purpose"
          value={formData.purpose}
          onChange={handleChange}
          className="w-full md:w-1/3 px-4 py-3 rounded-xl bg-[#0A1A12] border text-white focus:outline-none focus:ring-2 transition-colors"
          style={{
            borderColor: COLORS.borderSubtle,
            backgroundColor: COLORS.bgInput,
          }}
        >
          <option value="subsistence">Subsistence</option>
          <option value="commercial">Commercial</option>
          <option value="mixed">Mixed</option>
          <option value="research">Research</option>
          <option value="training">Training</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SelectField
          name="province"
          label="Province *"
          value={formData.province}
          onChange={handleChange}
          options={PROVINCES}
          placeholder="Select province"
          error={errors.province}
        />
        <SelectField
          name="district"
          label="District *"
          value={formData.district}
          onChange={handleChange}
          options={districts}
          placeholder="Select district"
          disabled={!formData.province}
          error={errors.district}
        />
        <SelectField
          name="sector"
          label="Sector *"
          value={formData.sector}
          onChange={handleChange}
          options={sectors}
          placeholder="Select sector"
          disabled={!formData.district}
          error={errors.sector}
        />
        <SelectField
          name="cell"
          label="Cell *"
          value={formData.cell}
          onChange={handleChange}
          options={cells}
          placeholder="Select cell"
          disabled={!formData.sector}
          error={errors.cell}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField
          name="village"
          label="Village *"
          value={formData.village}
          onChange={handleChange}
          placeholder="Enter village name"
          error={errors.village}
        />
        <InputField
          name="gpsLatitude"
          label="GPS Latitude (optional)"
          value={formData.gpsLatitude}
          onChange={handleChange}
          placeholder="-1.9441"
          type="number"
          step="any"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField
          name="gpsLongitude"
          label="GPS Longitude (optional)"
          value={formData.gpsLongitude}
          onChange={handleChange}
          placeholder="30.0619"
          type="number"
          step="any"
        />
      </div>

      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: COLORS.textSecondary }}
        >
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="Describe your production unit..."
          className="w-full px-4 py-3 rounded-xl bg-[#0A1A12] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 resize-none transition-colors"
          style={{
            borderColor: COLORS.borderSubtle,
            backgroundColor: COLORS.bgInput,
          }}
        />
      </div>
    </div>
  )
}

function PlantDetailsStep({ plantData, setPlantData, errors }) {
  const handleChange = (e) => {
    const { name, value } = e.target
    setPlantData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-6">
      <h3
        className="text-lg font-semibold flex items-center gap-2"
        style={{ color: COLORS.accent }}
      >
        <Wheat className="w-5 h-5" /> Crop Production Details
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField
          name="cropName"
          label="Crop Name/Type *"
          value={plantData.cropName}
          onChange={handleChange}
          placeholder="e.g., Maize, Beans, Potatoes"
          error={errors.cropName}
        />
        <InputField
          name="cropVariety"
          label="Crop Variety"
          value={plantData.cropVariety}
          onChange={handleChange}
          placeholder="e.g., SC 403, Rwandex"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <SelectField
          name="productionPurpose"
          label="Production Purpose"
          value={plantData.productionPurpose}
          onChange={handleChange}
          options={[
            "food",
            "cash_crop",
            "export",
            "seed",
            "fodder",
            "other",
          ].map((v) => ({ value: v, label: v.replace("_", " ") }))}
        />
        <InputField
          name="landSize"
          label="Land Size *"
          value={plantData.landSize}
          onChange={handleChange}
          placeholder="e.g., 2.5"
          type="number"
          step="0.01"
          error={errors.landSize}
        />
        <SelectField
          name="landUnit"
          label="Measurement Unit"
          value={plantData.landUnit}
          onChange={handleChange}
          options={["hectares", "acres", "sqm", "other"]}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <SelectField
          name="soilType"
          label="Soil Type"
          value={plantData.soilType}
          onChange={handleChange}
          options={[
            "clay",
            "sandy",
            "loamy",
            "silty",
            "peaty",
            "chalky",
            "other",
          ]}
        />
        <SelectField
          name="soilFertility"
          label="Soil Fertility"
          value={plantData.soilFertility}
          onChange={handleChange}
          options={["poor", "fair", "good", "excellent"]}
        />
        <SelectField
          name="landOwnership"
          label="Land Ownership"
          value={plantData.landOwnership}
          onChange={handleChange}
          options={["owned", "rented", "leased", "communal", "other"]}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <InputField
          name="plantingDate"
          label="Planting Date *"
          value={plantData.plantingDate}
          onChange={handleChange}
          type="date"
          error={errors.plantingDate}
        />
        <InputField
          name="expectedHarvestDate"
          label="Expected Harvest Date"
          value={plantData.expectedHarvestDate}
          onChange={handleChange}
          type="date"
        />
        <SelectField
          name="currentGrowthStage"
          label="Current Growth Stage"
          value={plantData.currentGrowthStage}
          onChange={handleChange}
          options={[
            "prepared",
            "planted",
            "germination",
            "vegetative",
            "flowering",
            "fruiting",
            "harvesting",
            "completed",
          ]}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <InputField
          name="seedQuantity"
          label="Seed Quantity"
          value={plantData.seedQuantity}
          onChange={handleChange}
          placeholder="e.g., 25"
          type="number"
          step="0.1"
        />
        <InputField
          name="seedUnit"
          label="Seed Unit"
          value={plantData.seedUnit}
          onChange={handleChange}
          placeholder="kg"
        />
        <SelectField
          name="irrigationMethod"
          label="Irrigation Method"
          value={plantData.irrigationMethod}
          onChange={handleChange}
          options={["rainfed", "drip", "sprinkler", "manual", "flood", "other"]}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField
          name="waterSource"
          label="Water Source"
          value={plantData.waterSource}
          onChange={handleChange}
          placeholder="e.g., River, Borehole, Rain"
        />
        <InputField
          name="fertilizerType"
          label="Fertilizer Type"
          value={plantData.fertilizerType}
          onChange={handleChange}
          placeholder="e.g., NPK 17-17-17, Compost"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField
          name="previousCrop"
          label="Previous Crop"
          value={plantData.previousCrop}
          onChange={handleChange}
          placeholder="e.g., Beans"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <TextareaField
          name="pestObservations"
          label="Pest Observations"
          value={plantData.pestObservations}
          onChange={handleChange}
          placeholder="Any pest issues observed..."
        />
        <TextareaField
          name="diseaseObservations"
          label="Disease Observations"
          value={plantData.diseaseObservations}
          onChange={handleChange}
          placeholder="Any disease symptoms..."
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField
          name="expectedHarvestQuantity"
          label="Expected Harvest Quantity"
          value={plantData.expectedHarvestQuantity}
          onChange={handleChange}
          placeholder="e.g., 5000"
          type="number"
          step="0.1"
        />
        <InputField
          name="expectedYieldUnit"
          label="Yield Unit"
          value={plantData.expectedYieldUnit}
          onChange={handleChange}
          placeholder="kg"
        />
      </div>
    </div>
  )
}

function LivestockDetailsStep({ livestockData, setLivestockData, errors }) {
  const handleChange = (e) => {
    const { name, value } = e.target
    const keys = name.split(".")
    if (keys.length === 2) {
      setLivestockData((prev) => ({
        ...prev,
        [keys[0]]: { ...prev[keys[0]], [keys[1]]: value },
      }))
    } else {
      setLivestockData((prev) => ({ ...prev, [name]: value }))
    }
  }

  return (
    <div className="space-y-6">
      <h3
        className="text-lg font-semibold flex items-center gap-2"
        style={{ color: COLORS.accent }}
      >
        <PawPrint className="w-5 h-5" /> Livestock Production Details
      </h3>

      <div className="grid md:grid-cols-3 gap-4">
        <SelectField
          name="animalType"
          label="Animal Type/Species *"
          value={livestockData.animalType}
          onChange={handleChange}
          options={[
            "cattle",
            "goats",
            "sheep",
            "pigs",
            "poultry",
            "rabbits",
            "fish",
            "other",
          ]}
          error={errors.animalType}
        />
        <InputField
          name="breed"
          label="Breed"
          value={livestockData.breed}
          onChange={handleChange}
          placeholder="e.g., Holstein, Kuroiler"
        />
        <SelectField
          name="productionPurpose"
          label="Production Purpose"
          value={livestockData.productionPurpose}
          onChange={handleChange}
          options={[
            "meat",
            "milk",
            "eggs",
            "breeding",
            "wool",
            "manure",
            "draught",
            "other",
          ]}
        />
      </div>

      <div
        className="bg-[#0A1A12] rounded-xl p-4 border"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <h4
          className="font-medium mb-4 flex items-center gap-2"
          style={{ color: COLORS.textSecondary }}
        >
          <Building2 className="w-5 h-5" /> Population Breakdown
        </h4>
        <div className="grid md:grid-cols-5 gap-4">
          <NumberField
            name="population.total"
            label="Total *"
            value={livestockData.population.total}
            onChange={handleChange}
            error={errors.population}
          />
          <NumberField
            name="population.males"
            label="Males"
            value={livestockData.population.males}
            onChange={handleChange}
          />
          <NumberField
            name="population.females"
            label="Females"
            value={livestockData.population.females}
            onChange={handleChange}
          />
          <NumberField
            name="population.young"
            label="Young"
            value={livestockData.population.young}
            onChange={handleChange}
          />
          <NumberField
            name="population.adults"
            label="Adults"
            value={livestockData.population.adults}
            onChange={handleChange}
          />
        </div>
        {errors.population && (
          <p className="mt-2 text-sm" style={{ color: COLORS.error }}>
            {errors.population}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <SelectField
          name="housing.housingType"
          label="Housing Type"
          value={livestockData.housing.housingType}
          onChange={handleChange}
          options={[
            "free_range",
            "barn",
            "poultry_house",
            "shed",
            "grazing",
            "mixed",
            "other",
          ]}
        />
        <NumberField
          name="housing.facilityCapacity"
          label="Facility Capacity"
          value={livestockData.housing.facilityCapacity}
          onChange={handleChange}
        />
        <SelectField
          name="housing.housingCondition"
          label="Housing Condition"
          value={livestockData.housing.housingCondition}
          onChange={handleChange}
          options={["poor", "fair", "good", "excellent"]}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <SelectField
          name="housing.feedingSystem"
          label="Feeding System"
          value={livestockData.housing.feedingSystem}
          onChange={handleChange}
          options={["grazing", "stall_fed", "mixed", "zero_grazing"]}
        />
        <InputField
          name="housing.feedType"
          label="Feed Type"
          value={livestockData.housing.feedType}
          onChange={handleChange}
          placeholder="e.g., Napier grass, Commercial feed"
        />
        <InputField
          name="housing.waterSource"
          label="Water Source"
          value={livestockData.housing.waterSource}
          onChange={handleChange}
          placeholder="e.g., Borehole, River"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <SelectField
          name="health.generalStatus"
          label="General Health Status"
          value={livestockData.health.generalStatus}
          onChange={handleChange}
          options={["healthy", "mild_issues", "serious_issues", "critical"]}
        />
        <SelectField
          name="health.vaccinationStatus"
          label="Vaccination Status"
          value={livestockData.health.vaccinationStatus}
          onChange={handleChange}
          options={["up_to_date", "partial", "not_vaccinated", "unknown"]}
        />
        <InputField
          name="health.lastVetVisit"
          label="Last Vet Visit"
          value={livestockData.health.lastVetVisit}
          onChange={handleChange}
          type="date"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <TextareaField
          name="health.previousDiseases"
          label="Previous Disease History"
          value={livestockData.health.previousDiseases}
          onChange={handleChange}
          placeholder="Any previous diseases..."
        />
        <InputField
          name="health.vetContact"
          label="Veterinary Contact"
          value={livestockData.health.vetContact}
          onChange={handleChange}
          placeholder="Phone/Email of vet"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <InputField
          name="production.expectedProduction"
          label="Expected Production"
          value={livestockData.production.expectedProduction}
          onChange={handleChange}
          placeholder="e.g., 500"
          type="number"
          step="0.1"
        />
        <InputField
          name="production.productionUnit"
          label="Production Unit"
          value={livestockData.production.productionUnit}
          onChange={handleChange}
          placeholder="litres, eggs, kg"
        />
        <InputField
          name="production.acquisitionDate"
          label="Acquisition Date"
          value={livestockData.production.acquisitionDate}
          onChange={handleChange}
          type="date"
        />
      </div>
    </div>
  )
}

function MediaStep({
  coverPhoto,
  setCoverPhoto,
  photos,
  setPhotos,
  documents,
  setDocuments,
}) {
  const handleFileUpload = (e, setter, maxFiles = 10, accept = "image/*") => {
    const files = Array.from(e.target.files)
    const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024)
    if (validFiles.length !== files.length) {
      announce("Some files exceed 10MB limit", "warning")
    }
    setter((prev) => [...(prev || []), ...validFiles].slice(0, maxFiles))
  }

  const removeFile = (arr, setter, index) => {
    setter((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div>
        <label
          className="block text-sm font-medium mb-3"
          style={{ color: COLORS.textSecondary }}
        >
          Cover Photo
        </label>
        <div className="relative">
          {coverPhoto ? (
            <div
              className="relative w-64 h-48 rounded-xl overflow-hidden border-2"
              style={{
                borderColor: COLORS.accent,
                backgroundColor: COLORS.bgInput,
              }}
            >
              <img
                src={URL.createObjectURL(coverPhoto)}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setCoverPhoto(null)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: COLORS.error }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="w-64 h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors"
              style={{
                borderColor: COLORS.borderSubtle,
                backgroundColor: COLORS.bgInput,
                color: COLORS.textMuted,
              }}
              onClick={() => document.getElementById("cover-photo")?.click()}
            >
              <Camera className="w-10 h-10 mb-2" />
              <span>Click to upload cover photo</span>
              <input
                id="cover-photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handleFileUpload(e, (f) => setCoverPhoto(f[0]), 1)
                }
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-medium mb-3"
          style={{ color: COLORS.textSecondary }}
        >
          Additional Photos
        </label>
        <div className="flex flex-wrap gap-3 mb-3">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative w-24 h-24 rounded-lg overflow-hidden border"
              style={{ borderColor: COLORS.borderSubtle }}
            >
              <img
                src={URL.createObjectURL(photo)}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(photos, setPhotos, index)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: COLORS.error }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <label
            className="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors"
            style={{
              borderColor: COLORS.borderSubtle,
              backgroundColor: COLORS.bgInput,
              color: COLORS.textMuted,
            }}
            onClick={() =>
              document.getElementById("additional-photos")?.click()
            }
          >
            <Plus className="w-8 h-8 mb-1" />
            <span className="text-xs">Add</span>
            <input
              id="additional-photos"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e, setPhotos, 10)}
            />
          </label>
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-medium mb-3"
          style={{ color: COLORS.textSecondary }}
        >
          Supporting Documents
        </label>
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{
                backgroundColor: COLORS.bgInput,
                borderColor: COLORS.borderSubtle,
              }}
            >
              <div className="flex items-center gap-3">
                <FileText
                  className="w-5 h-5"
                  style={{ color: COLORS.accent }}
                />
                <span className="text-sm truncate max-w-md">{doc.name}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(documents, setDocuments, index)}
                className="p-1.5 rounded text-gray-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <label
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors"
            style={{
              borderColor: COLORS.borderSubtle,
              backgroundColor: COLORS.bgInput,
              color: COLORS.textMuted,
            }}
            onClick={() => document.getElementById("documents")?.click()}
          >
            <FileText className="w-5 h-5" />
            <span>Add documents (PDF, DOC, up to 10MB)</span>
            <input
              id="documents"
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              className="hidden"
              onChange={(e) =>
                handleFileUpload(e, setDocuments, 5, ".pdf,.doc,.docx")
              }
            />
          </label>
        </div>
      </div>

      <div
        className="p-4 rounded-xl border flex items-start gap-3"
        style={{
          backgroundColor: COLORS.bgCard,
          borderColor: COLORS.borderSubtle,
        }}
      >
        <AlertCircle
          className="w-5 h-5 mt-0.5 flex-shrink-0"
          style={{ color: COLORS.warning }}
        />
        <div className="text-sm" style={{ color: COLORS.textSecondary }}>
          <p className="font-medium mb-1">Before submitting:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Review all information for accuracy</li>
            <li>Ensure GPS coordinates are correct if provided</li>
            <li>Photos should be clear and relevant</li>
            <li>
              This will create a production unit linked to your farmer account
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ============================================
// REUSABLE FIELD COMPONENTS
// ============================================

function InputField({
  name,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  ...props
}) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: COLORS.textSecondary }}
      >
        {label}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-[#0A1A12] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors"
        style={{
          borderColor: error ? COLORS.error : COLORS.borderSubtle,
          backgroundColor: COLORS.bgInput,
        }}
        onFocus={(e) => (e.target.style.borderColor = COLORS.accent)}
        onBlur={(e) =>
          (e.target.style.borderColor = error
            ? COLORS.error
            : COLORS.borderSubtle)
        }
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm" style={{ color: COLORS.error }}>
          {error}
        </p>
      )}
    </div>
  )
}

function NumberField({
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  ...props
}) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: COLORS.textSecondary }}
      >
        {label}
      </label>
      <input
        name={name}
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step="0.1"
        min="0"
        className="w-full px-4 py-3 rounded-xl bg-[#0A1A12] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors"
        style={{
          borderColor: error ? COLORS.error : COLORS.borderSubtle,
          backgroundColor: COLORS.bgInput,
        }}
        onFocus={(e) => (e.target.style.borderColor = COLORS.accent)}
        onBlur={(e) =>
          (e.target.style.borderColor = error
            ? COLORS.error
            : COLORS.borderSubtle)
        }
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm" style={{ color: COLORS.error }}>
          {error}
        </p>
      )}
    </div>
  )
}

function TextareaField({
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  ...props
}) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: COLORS.textSecondary }}
      >
        {label}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 rounded-xl bg-[#0A1A12] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 resize-none transition-colors"
        style={{
          borderColor: error ? COLORS.error : COLORS.borderSubtle,
          backgroundColor: COLORS.bgInput,
        }}
        onFocus={(e) => (e.target.style.borderColor = COLORS.accent)}
        onBlur={(e) =>
          (e.target.style.borderColor = error
            ? COLORS.error
            : COLORS.borderSubtle)
        }
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm" style={{ color: COLORS.error }}>
          {error}
        </p>
      )}
    </div>
  )
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
  ...props
}) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: COLORS.textSecondary }}
      >
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl bg-[#0A1A12] border text-white focus:outline-none focus:ring-2 transition-colors"
        style={{
          borderColor: error ? COLORS.error : COLORS.borderSubtle,
          backgroundColor: disabled ? COLORS.bgInput : COLORS.bgInput,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onFocus={(e) =>
          !disabled && (e.target.style.borderColor = COLORS.accent)
        }
        onBlur={(e) =>
          !disabled &&
          (e.target.style.borderColor = error
            ? COLORS.error
            : COLORS.borderSubtle)
        }
        {...props}
      >
        <option value="" disabled>
          {placeholder || "Select..."}
        </option>
        {Array.isArray(options) &&
          options.map((opt) =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1).replace("_", " ")}
              </option>
            ) : (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ),
          )}
      </select>
      {error && (
        <p className="mt-1 text-sm" style={{ color: COLORS.error }}>
          {error}
        </p>
      )}
    </div>
  )
}
