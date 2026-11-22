import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const options = { timestamps: true };

const locationSchema = new Schema({
  village: { type: String, required: true, trim: true },
  cell: { type: String, required: true, trim: true },
  sector: { type: String, required: true, trim: true, index: true },
  district: { type: String, required: true, trim: true, index: true },
  province: { type: String, required: true, trim: true, index: true },
  gpsCoordinates: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
  },
}, { _id: false });

const plantCropSchema = new Schema({
  cropName: { type: String, required: true, trim: true },
  cropVariety: { type: String, trim: true },
  productionPurpose: {
    type: String,
    enum: ['food', 'cash_crop', 'export', 'seed', 'fodder', 'other'],
    default: 'food',
  },
  landSize: { type: Number, required: true },
  landUnit: {
    type: String,
    enum: ['hectares', 'acres', 'sqm', 'other'],
    default: 'hectares',
  },
  soilType: {
    type: String,
    enum: ['clay', 'sandy', 'loamy', 'silty', 'peaty', 'chalky', 'other'],
    default: 'loamy',
  },
  soilFertility: {
    type: String,
    enum: ['poor', 'fair', 'good', 'excellent'],
    default: 'good',
  },
  landOwnership: {
    type: String,
    enum: ['owned', 'rented', 'leased', 'communal', 'other'],
    default: 'owned',
  },
  plantingDate: Date,
  expectedHarvestDate: Date,
  seedQuantity: Number,
  seedUnit: String,
  irrigationMethod: {
    type: String,
    enum: ['rainfed', 'drip', 'sprinkler', 'manual', 'flood', 'other'],
    default: 'rainfed',
  },
  waterSource: String,
  fertilizerType: String,
  previousCrop: String,
  currentGrowthStage: {
    type: String,
    enum: ['prepared', 'planted', 'germination', 'vegetative', 'flowering', 'fruiting', 'harvesting', 'completed'],
    default: 'prepared',
  },
  pestObservations: String,
  diseaseObservations: String,
  expectedHarvestQuantity: Number,
  expectedYieldUnit: String,
}, { _id: false });

const livestockPopulationSchema = new Schema({
  total: { type: Number, required: true, min: 0 },
  males: { type: Number, default: 0, min: 0 },
  females: { type: Number, default: 0, min: 0 },
  young: { type: Number, default: 0, min: 0 },
  adults: { type: Number, default: 0, min: 0 },
}, { _id: false });

const livestockHousingSchema = new Schema({
  housingType: {
    type: String,
    enum: ['free_range', 'barn', 'poultry_house', 'shed', 'grazing', 'mixed', 'other'],
    default: 'mixed',
  },
  facilityCapacity: Number,
  housingCondition: {
    type: String,
    enum: ['poor', 'fair', 'good', 'excellent'],
    default: 'good',
  },
  feedingSystem: {
    type: String,
    enum: ['grazing', 'stall_fed', 'mixed', 'zero_grazing'],
    default: 'mixed',
  },
  feedType: String,
  waterSource: String,
}, { _id: false });

const livestockHealthSchema = new Schema({
  generalStatus: {
    type: String,
    enum: ['healthy', 'mild_issues', 'serious_issues', 'critical'],
    default: 'healthy',
  },
  vaccinationStatus: {
    type: String,
    enum: ['up_to_date', 'partial', 'not_vaccinated', 'unknown'],
    default: 'unknown',
  },
  previousDiseases: String,
  lastVetVisit: Date,
  vetContact: String,
}, { _id: false });

const livestockProductionSchema = new Schema({
  expectedProduction: Number,
  productionUnit: String,
  acquisitionDate: Date,
}, { _id: false });

const livestockSchema = new Schema({
  animalType: {
    type: String,
    required: true,
    enum: ['cattle', 'goats', 'sheep', 'pigs', 'poultry', 'rabbits', 'fish', 'other'],
  },
  breed: String,
  productionPurpose: {
    type: String,
    enum: ['meat', 'milk', 'eggs', 'breeding', 'wool', 'manure', 'draught', 'other'],
    default: 'meat',
  },
  population: livestockPopulationSchema,
  housing: livestockHousingSchema,
  health: livestockHealthSchema,
  production: livestockProductionSchema,
}, { _id: false });

const productionUnitSchema = new Schema({
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, enum: ['plants', 'animals'], index: true },
  purpose: {
    type: String,
    enum: ['subsistence', 'commercial', 'mixed', 'research', 'training'],
    default: 'mixed',
  },
  location: { type: locationSchema, required: true },
  plantData: plantCropSchema,
  livestockData: livestockSchema,
  description: String,
  coverPhoto: String,
  photos: [String],
  documents: [String],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'active',
    index: true,
  },
  isDraft: { type: Boolean, default: false },
  createdBy: { type: Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Types.ObjectId, ref: 'User' },
  deletedAt: Date,
}, options);

productionUnitSchema.index({ farmerId: 1, status: 1 });
productionUnitSchema.index({ 'location.sector': 1, 'location.district': 1, 'location.province': 1 });
productionUnitSchema.index({ category: 1, status: 1 });

export const ProductionUnit = mongoose.models.ProductionUnit || mongoose.model('ProductionUnit', productionUnitSchema);

const productionActivitySchema = new Schema({
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  activityType: {
    type: String,
    required: true,
    enum: [
      'planting', 'watering', 'fertilizing', 'weeding', 'pest_control', 'harvesting',
      'feeding', 'vaccination', 'treatment', 'inspection', 'birth', 'death', 'sale', 'purchase',
      'maintenance', 'other'
    ],
  },
  description: { type: String, required: true },
  quantity: Number,
  unit: String,
  cost: Number,
  currency: { type: String, default: 'RWF' },
  occurredAt: { type: Date, default: Date.now, index: true },
  notes: String,
  photos: [String],
}, options);

productionActivitySchema.index({ productionUnitId: 1, occurredAt: -1 });
productionActivitySchema.index({ farmerId: 1, occurredAt: -1 });

export const ProductionActivity = mongoose.models.ProductionActivity || mongoose.model('ProductionActivity', productionActivitySchema);

const cropMonitoringSchema = new Schema({
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  recordedBy: { type: Types.ObjectId, ref: 'User', required: true },
  growthStage: {
    type: String,
    enum: ['prepared', 'planted', 'germination', 'vegetative', 'flowering', 'fruiting', 'harvesting', 'completed'],
  },
  height: Number,
  heightUnit: { type: String, default: 'cm' },
  pestSeverity: {
    type: String,
    enum: ['none', 'low', 'moderate', 'high', 'severe'],
    default: 'none',
  },
  diseaseSeverity: {
    type: String,
    enum: ['none', 'low', 'moderate', 'high', 'severe'],
    default: 'none',
  },
  pestDetails: String,
  diseaseDetails: String,
  weatherCondition: String,
  soilMoisture: {
    type: String,
    enum: ['dry', 'optimal', 'wet', 'waterlogged'],
  },
  recommendations: String,
  recordedAt: { type: Date, default: Date.now, index: true },
  photos: [String],
}, options);

cropMonitoringSchema.index({ productionUnitId: 1, recordedAt: -1 });

export const CropMonitoringRecord = mongoose.models.CropMonitoringRecord || mongoose.model('CropMonitoringRecord', cropMonitoringSchema);

const livestockHealthRecordSchema = new Schema({
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  recordedBy: { type: Types.ObjectId, ref: 'User', required: true },
  healthStatus: {
    type: String,
    enum: ['healthy', 'mild_issues', 'serious_issues', 'critical'],
    default: 'healthy',
  },
  symptoms: String,
  diagnosis: String,
  treatment: String,
  medications: String,
  mortalityCount: { type: Number, default: 0 },
  birthCount: { type: Number, default: 0 },
  recordedAt: { type: Date, default: Date.now, index: true },
  photos: [String],
}, options);

livestockHealthRecordSchema.index({ productionUnitId: 1, recordedAt: -1 });

export const LivestockHealthRecord = mongoose.models.LivestockHealthRecord || mongoose.model('LivestockHealthRecord', livestockHealthRecordSchema);

const livestockPopulationRecordSchema = new Schema({
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  recordedBy: { type: Types.ObjectId, ref: 'User', required: true },
  total: Number,
  males: Number,
  females: Number,
  young: Number,
  adults: Number,
  changes: {
    births: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    transfersIn: { type: Number, default: 0 },
    transfersOut: { type: Number, default: 0 },
  },
  recordedAt: { type: Date, default: Date.now, index: true },
  notes: String,
}, options);

livestockPopulationRecordSchema.index({ productionUnitId: 1, recordedAt: -1 });

export const LivestockPopulationRecord = mongoose.models.LivestockPopulationRecord || mongoose.model('LivestockPopulationRecord', livestockPopulationRecordSchema);

const harvestRecordSchema = new Schema({
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  recordedBy: { type: Types.ObjectId, ref: 'User', required: true },
  harvestDate: { type: Date, required: true, index: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  quality: {
    type: String,
    enum: ['grade_a', 'grade_b', 'grade_c', 'mixed'],
    default: 'mixed',
  },
  estimatedValue: Number,
  currency: { type: String, default: 'RWF' },
  destination: {
    type: String,
    enum: ['home_consumption', 'local_market', 'cooperative', 'processor', 'export', 'seed', 'other'],
  },
  notes: String,
  photos: [String],
}, options);

harvestRecordSchema.index({ productionUnitId: 1, harvestDate: -1 });
harvestRecordSchema.index({ farmerId: 1, harvestDate: -1 });

export const HarvestRecord = mongoose.models.HarvestRecord || mongoose.model('HarvestRecord', harvestRecordSchema);

const animalProductionRecordSchema = new Schema({
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  recordedBy: { type: Types.ObjectId, ref: 'User', required: true },
  productionDate: { type: Date, required: true, index: true },
  productionType: {
    type: String,
    enum: ['milk', 'eggs', 'meat', 'wool', 'manure', 'offspring', 'other'],
    required: true,
  },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  quality: String,
  estimatedValue: Number,
  currency: { type: String, default: 'RWF' },
  destination: String,
  notes: String,
  photos: [String],
}, options);

animalProductionRecordSchema.index({ productionUnitId: 1, productionDate: -1 });
animalProductionRecordSchema.index({ farmerId: 1, productionDate: -1 });

export const AnimalProductionRecord = mongoose.models.AnimalProductionRecord || mongoose.model('AnimalProductionRecord', animalProductionRecordSchema);

const veterinaryInspectionSchema = new Schema({
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  officerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  inspectionDate: { type: Date, required: true, default: Date.now, index: true },
  inspectionType: {
    type: String,
    enum: ['routine', 'disease_investigation', 'vaccination', 'follow_up', 'emergency', 'certification'],
    default: 'routine',
  },
  findings: { type: String, required: true },
  recommendations: String,
  actionsTaken: String,
  medicationsAdministered: String,
  followUpRequired: { type: Boolean, default: false },
  followUpDate: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'referred'],
    default: 'completed',
    index: true,
  },
  referralTo: {
    type: String,
    enum: ['crop_specialist', 'district_vet', 'province_vet', 'rab', 'lab', 'other'],
  },
  referralReason: String,
  photos: [String],
  documents: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, options);

veterinaryInspectionSchema.index({ farmerId: 1, inspectionDate: -1 });
veterinaryInspectionSchema.index({ officerId: 1, inspectionDate: -1 });
veterinaryInspectionSchema.index({ 'productionUnitId': 1, inspectionDate: -1 });

export const VeterinaryInspection = mongoose.models.VeterinaryInspection || mongoose.model('VeterinaryInspection', veterinaryInspectionSchema);

const productionAlertSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', index: true },
  type: {
    type: String,
    enum: [
      'registration_complete', 'inspection_scheduled', 'inspection_completed',
      'follow_up_required', 'new_recommendation', 'disease_alert',
      'pest_alert', 'vaccination_due', 'harvest_due', 'officer_visit'
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  severity: {
    type: String,
    enum: ['info', 'warning', 'urgent', 'critical'],
    default: 'info',
  },
  readAt: Date,
  metadata: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, index: true },
}, options);

productionAlertSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const ProductionAlert = mongoose.models.ProductionAlert || mongoose.model('ProductionAlert', productionAlertSchema);

const productionExpenseSchema = new Schema({
  productionUnitId: { type: Types.ObjectId, ref: 'ProductionUnit', required: true, index: true },
  farmerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  category: {
    type: String,
    enum: ['seeds', 'fertilizer', 'pesticides', 'feed', 'medicine', 'equipment', 'labor', 'veterinary', 'transport', 'other'],
    required: true,
  },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'RWF' },
  quantity: Number,
  unit: String,
  expenseDate: { type: Date, required: true, default: Date.now, index: true },
  supplier: String,
  receipt: String,
  notes: String,
}, options);

productionExpenseSchema.index({ productionUnitId: 1, expenseDate: -1 });
productionExpenseSchema.index({ farmerId: 1, expenseDate: -1 });

export const ProductionExpense = mongoose.models.ProductionExpense || mongoose.model('ProductionExpense', productionExpenseSchema);