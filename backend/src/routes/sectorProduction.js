import express from 'express';
import mongoose from 'mongoose';
import {
  ProductionUnit,
  ProductionActivity,
  CropMonitoringRecord,
  LivestockHealthRecord,
  LivestockPopulationRecord,
  HarvestRecord,
  AnimalProductionRecord,
  VeterinaryInspection,
  ProductionAlert,
  ProductionExpense,
} from '../models/ProductionUnit.js';
import User from '../models/User.js';

const router = express.Router();

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const auth = asyncRoute(async (req, res, next) => {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'A valid active session is required.' });
  try {
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active' || Number(user.tokenVersion || 0) !== Number(payload.tokenVersion || 0)) {
      return res.status(401).json({ message: 'A valid active session is required.' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'A valid active session is required.' });
  }
});

const roles = (...allowed) => (req, res, next) => allowed.includes(req.user.portal) ? next() : res.status(403).json({ message: 'This portal cannot perform that action.' });

const data = (res, value, status = 200) => res.status(status).json({ data: value });
const hide = res => res.status(404).json({ message: 'Not found.' });

// Check if user can access sector data
const canAccessSector = (user, sector, district, province) => {
  if (user.portal === 'rab') return true;
  if (user.portal === 'province') return user.province === province;
  if (user.portal === 'district') return user.district === district;
  if (user.portal === 'sector') return user.sector === sector;
  return false;
};

// Build sector filter based on user role
const buildSectorFilter = (user) => {
  if (user.portal === 'sector') {
    return { sector: user.sector, district: user.district, province: user.province };
  }
  if (user.portal === 'district') {
    return { district: user.district, province: user.province };
  }
  if (user.portal === 'province') {
    return { province: user.province };
  }
  if (user.portal === 'rab') {
    return {};
  }
  return { sector: user.sector, district: user.district, province: user.province };
};

// ============================================
// SECTOR VETERINARY OFFICER DASHBOARD ROUTES
// ============================================

// Get sector overview statistics
router.get('/overview', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const filter = buildSectorFilter(req.user);
  
  // Find farmers in sector
  const farmerFilter = { portal: 'farmer', status: 'active', ...filter };
  const farmers = await User.find(farmerFilter).select('_id').lean();
  const farmerIds = farmers.map(f => f._id);

  if (farmerIds.length === 0) {
    return data(res, {
      totalFarmers: 0,
      totalCropPlots: 0,
      totalLivestockUnits: 0,
      totalCultivatedLand: 0,
      totalLivestockPopulation: 0,
      activeProductionUnits: 0,
      unitsRequiringAttention: 0,
      animalHealthProblems: 0,
      cropPestDiseaseProblems: 0,
      recentRegistrations: 0,
    });
  }

  const unitFilter = { farmerId: { $in: farmerIds } };

  const [
    totalCropPlots,
    totalLivestockUnits,
    activeUnits,
    cropPlots,
    livestockUnits,
  ] = await Promise.all([
    ProductionUnit.countDocuments({ ...unitFilter, category: 'plants' }),
    ProductionUnit.countDocuments({ ...unitFilter, category: 'animals' }),
    ProductionUnit.countDocuments({ ...unitFilter, status: 'active' }),
    ProductionUnit.find({ ...unitFilter, category: 'plants' }).select('plantData.landSize plantData.pestObservations plantData.diseaseObservations').lean(),
    ProductionUnit.find({ ...unitFilter, category: 'animals' }).select('livestockData.population livestockData.health').lean(),
  ]);

  const totalCultivatedLand = cropPlots.reduce((sum, p) => sum + (p.plantData?.landSize || 0), 0);
  const totalLivestockPopulation = livestockUnits.reduce((sum, u) => sum + (u.livestockData?.population?.total || 0), 0);

  // Count units with pest/disease observations
  const cropPestDiseaseProblems = cropPlots.filter(p => p.plantData?.pestObservations || p.plantData?.diseaseObservations).length;
  const animalHealthProblems = livestockUnits.filter(u => u.livestockData?.health?.generalStatus && u.livestockData.health.generalStatus !== 'healthy').length;
  const unitsRequiringAttention = cropPestDiseaseProblems + animalHealthProblems;

  // Recent registrations (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentRegistrations = await ProductionUnit.countDocuments({
    ...unitFilter,
    createdAt: { $gte: sevenDaysAgo },
  });

  data(res, {
    totalFarmers: farmers.length,
    totalCropPlots,
    totalLivestockUnits,
    totalCultivatedLand,
    totalLivestockPopulation,
    activeProductionUnits: activeUnits,
    unitsRequiringAttention,
    animalHealthProblems,
    cropPestDiseaseProblems,
    recentRegistrations,
  });
}));

// Get farmer directory in sector
router.get('/farmers', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const { page = 1, limit = 20, search, village } = req.query;
  const filter = buildSectorFilter(req.user);
  filter.portal = 'farmer';
  filter.status = 'active';
  if (village) filter['village'] = village;
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [farmers, total] = await Promise.all([
    User.find(filter).select('fullName email phone village sector district enterpriseIds createdAt').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(filter),
  ]);

  // Get production unit counts for each farmer
  const farmerIds = farmers.map(f => f._id);
  const unitCounts = await ProductionUnit.aggregate([
    { $match: { farmerId: { $in: farmerIds } } },
    { $group: { _id: '$farmerId', cropPlots: { $sum: { $cond: [{ $eq: ['$category', 'plants'] }, 1, 0] } }, livestockUnits: { $sum: { $cond: [{ $eq: ['$category', 'animals'] }, 1, 0] } }, activeUnits: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
  ]);

  const unitCountMap = new Map(unitCounts.map(u => [String(u._id), u]));
  const farmersWithCounts = farmers.map(f => {
    const counts = unitCountMap.get(String(f._id)) || { cropPlots: 0, livestockUnits: 0, activeUnits: 0 };
    return { ...f, ...counts };
  });

  data(res, { farmers: farmersWithCounts, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Get production units for a specific farmer (officer view)
router.get('/farmers/:farmerId/production-units', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const farmer = await User.findById(req.params.farmerId);
  if (!farmer || farmer.portal !== 'farmer') return hide(res);

  // Check sector access
  if (!canAccessSector(req.user, farmer.sector, farmer.district, farmer.province)) {
    return res.status(403).json({ message: 'Access denied. Farmer is not in your assigned sector.' });
  }

  const units = await ProductionUnit.find({ farmerId: req.params.farmerId }).sort({ createdAt: -1 }).lean();
  data(res, { farmer: { _id: farmer._id, fullName: farmer.fullName, village: farmer.village, sector: farmer.sector }, units });
}));

// ============================================
// CROP PLOT MONITORING (OFFICER VIEW)
 // ============================================

// Get all crop plots in sector
router.get('/crop-plots', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const { page = 1, limit = 20, search, village, cropName, status } = req.query;
  const filter = buildSectorFilter(req.user);
  
  const farmerFilter = { portal: 'farmer', status: 'active', ...filter };
  const farmers = await User.find(farmerFilter).select('_id').lean();
  const farmerIds = farmers.map(f => f._id);

  const unitFilter = { farmerId: { $in: farmerIds }, category: 'plants' };
  if (status) unitFilter.status = status;
  if (cropName) unitFilter['plantData.cropName'] = { $regex: cropName, $options: 'i' };
  if (village) unitFilter['location.village'] = village;
  if (search) {
    unitFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'plantData.cropName': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [plots, total] = await Promise.all([
    ProductionUnit.find(unitFilter).populate('farmerId', 'fullName village sector district phone').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    ProductionUnit.countDocuments(unitFilter),
  ]);

  data(res, { plots, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Get crop plot details with monitoring
router.get('/crop-plots/:unitId', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findById(req.params.unitId).populate('farmerId', 'fullName village sector district phone').lean();
  if (!unit || unit.category !== 'plants') return hide(res);

  // Check sector access
  const farmer = await User.findById(unit.farmerId._id);
  if (!canAccessSector(req.user, farmer.sector, farmer.district, farmer.province)) {
    return res.status(403).json({ message: 'Access denied. Production unit is not in your assigned sector.' });
  }

  // Get monitoring records
  const monitoring = await CropMonitoringRecord.find({ productionUnitId: req.params.unitId }).sort({ recordedAt: -1 }).limit(20).lean();
  const harvests = await HarvestRecord.find({ productionUnitId: req.params.unitId }).sort({ harvestDate: -1 }).limit(10).lean();
  const activities = await ProductionActivity.find({ productionUnitId: req.params.unitId }).sort({ occurredAt: -1 }).limit(20).lean();
  const inspections = await VeterinaryInspection.find({ productionUnitId: req.params.unitId }).sort({ inspectionDate: -1 }).limit(10).lean();

  data(res, { unit, monitoring, harvests, activities, inspections });
}));

// ============================================
// LIVESTOCK MONITORING (OFFICER VIEW)
// ============================================

// Get all livestock units in sector
router.get('/livestock-units', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const { page = 1, limit = 20, search, village, animalType, status } = req.query;
  const filter = buildSectorFilter(req.user);
  
  const farmerFilter = { portal: 'farmer', status: 'active', ...filter };
  const farmers = await User.find(farmerFilter).select('_id').lean();
  const farmerIds = farmers.map(f => f._id);

  const unitFilter = { farmerId: { $in: farmerIds }, category: 'animals' };
  if (status) unitFilter.status = status;
  if (animalType) unitFilter['livestockData.animalType'] = animalType;
  if (village) unitFilter['location.village'] = village;
  if (search) {
    unitFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'livestockData.animalType': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [units, total] = await Promise.all([
    ProductionUnit.find(unitFilter).populate('farmerId', 'fullName village sector district phone').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    ProductionUnit.countDocuments(unitFilter),
  ]);

  data(res, { units, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Get livestock unit details with health records
router.get('/livestock-units/:unitId', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findById(req.params.unitId).populate('farmerId', 'fullName village sector district phone').lean();
  if (!unit || unit.category !== 'animals') return hide(res);

  // Check sector access
  const farmer = await User.findById(unit.farmerId._id);
  if (!canAccessSector(req.user, farmer.sector, farmer.district, farmer.province)) {
    return res.status(403).json({ message: 'Access denied. Production unit is not in your assigned sector.' });
  }

  const healthRecords = await LivestockHealthRecord.find({ productionUnitId: req.params.unitId }).sort({ recordedAt: -1 }).limit(20).lean();
  const populationRecords = await LivestockPopulationRecord.find({ productionUnitId: req.params.unitId }).sort({ recordedAt: -1 }).limit(10).lean();
  const productionRecords = await AnimalProductionRecord.find({ productionUnitId: req.params.unitId }).sort({ productionDate: -1 }).limit(10).lean();
  const activities = await ProductionActivity.find({ productionUnitId: req.params.unitId }).sort({ occurredAt: -1 }).limit(20).lean();
  const inspections = await VeterinaryInspection.find({ productionUnitId: req.params.unitId }).sort({ inspectionDate: -1 }).limit(10).lean();

  data(res, { unit, healthRecords, populationRecords, productionRecords, activities, inspections });
}));

// ============================================
// VETERINARY INSPECTIONS
// ============================================

// Get all inspections in sector
router.get('/inspections', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const { page = 1, limit = 20, status, startDate, endDate } = req.query;
  const filter = buildSectorFilter(req.user);
  
  const farmerFilter = { portal: 'farmer', status: 'active', ...filter };
  const farmers = await User.find(farmerFilter).select('_id').lean();
  const farmerIds = farmers.map(f => f._id);

  const unitFilter = { farmerId: { $in: farmerIds } };
  const unitIds = (await ProductionUnit.find(unitFilter).select('_id').lean()).map(u => u._id);

  const inspectionFilter = { productionUnitId: { $in: unitIds } };
  if (status) inspectionFilter.status = status;
  if (startDate || endDate) {
    inspectionFilter.inspectionDate = {};
    if (startDate) inspectionFilter.inspectionDate.$gte = new Date(startDate);
    if (endDate) inspectionFilter.inspectionDate.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [inspections, total] = await Promise.all([
    VeterinaryInspection.find(inspectionFilter)
      .populate('farmerId', 'fullName village sector district')
      .populate('productionUnitId', 'name category')
      .populate('officerId', 'fullName')
      .sort({ inspectionDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    VeterinaryInspection.countDocuments(inspectionFilter),
  ]);

  data(res, { inspections, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Create veterinary inspection
router.post('/inspections', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const { productionUnitId, farmerId, ...inspectionData } = req.body;

  // Verify production unit exists and is in officer's sector
  const unit = await ProductionUnit.findById(productionUnitId).populate('farmerId').lean();
  if (!unit) return hide(res);

  const farmer = await User.findById(unit.farmerId._id);
  if (!canAccessSector(req.user, farmer.sector, farmer.district, farmer.province)) {
    return res.status(403).json({ message: 'Access denied. Production unit is not in your assigned sector.' });
  }

  // Ensure the farmerId matches
  if (String(farmerId) !== String(unit.farmerId._id)) {
    return res.status(400).json({ message: 'Farmer ID does not match production unit owner.' });
  }

  const inspection = await VeterinaryInspection.create({
    ...inspectionData,
    productionUnitId,
    farmerId: unit.farmerId._id,
    officerId: req.user._id,
  });

  // Notify farmer
  await ProductionAlert.create({
    userId: unit.farmerId._id,
    productionUnitId,
    type: 'inspection_completed',
    title: 'Veterinary Inspection Completed',
    message: `A veterinary inspection was completed on your ${unit.category === 'plants' ? 'crop plot' : 'livestock unit'} "${unit.name}".`,
    severity: 'info',
    metadata: { inspectionId: inspection._id },
  });

  // If follow-up required, create alert
  if (inspection.followUpRequired && inspection.followUpDate) {
    await ProductionAlert.create({
      userId: unit.farmerId._id,
      productionUnitId,
      type: 'follow_up_required',
      title: 'Follow-up Required',
      message: `A follow-up visit is scheduled for ${new Date(inspection.followUpDate).toLocaleDateString()}.`,
      severity: 'warning',
      metadata: { inspectionId: inspection._id, followUpDate: inspection.followUpDate },
    });
  }

  // If referred, notify appropriate specialist
  if (inspection.status === 'referred' && inspection.referralTo) {
    // This would need a referral system - for now just log
    console.log(`Inspection ${inspection._id} referred to ${inspection.referralTo}: ${inspection.referralReason}`);
  }

  data(res, inspection, 201);
}));

// Update veterinary inspection
router.patch('/inspections/:id', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const inspection = await VeterinaryInspection.findById(req.params.id);
  if (!inspection) return hide(res);

  // Verify officer can access this inspection
  const unit = await ProductionUnit.findById(inspection.productionUnitId).populate('farmerId').lean();
  if (!unit) return hide(res);

  const farmer = await User.findById(unit.farmerId._id);
  if (!canAccessSector(req.user, farmer.sector, farmer.district, farmer.province)) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  Object.assign(inspection, req.body);
  inspection.updatedAt = new Date();
  await inspection.save();

  data(res, inspection);
}));

// Get inspection by ID
router.get('/inspections/:id', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const inspection = await VeterinaryInspection.findById(req.params.id)
    .populate('farmerId', 'fullName village sector district phone')
    .populate('productionUnitId', 'name category plantData livestockData')
    .populate('officerId', 'fullName')
    .lean();
  if (!inspection) return hide(res);

  // Verify sector access
  const farmer = await User.findById(inspection.farmerId._id);
  if (!canAccessSector(req.user, farmer.sector, farmer.district, farmer.province)) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  data(res, inspection);
}));

// ============================================
// FARMER INSPECTION HISTORY
// ============================================

// Get farmer's inspection history
router.get('/production-units/:unitId/inspections', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);

  const inspections = await VeterinaryInspection.find({ productionUnitId: req.params.unitId })
    .populate('officerId', 'fullName portal')
    .sort({ inspectionDate: -1 })
    .lean();

  data(res, inspections);
}));

// ============================================
// REPORTS
// ============================================

// Sector crop report
router.get('/reports/crops', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const filter = buildSectorFilter(req.user);
  const farmerFilter = { portal: 'farmer', status: 'active', ...filter };
  const farmers = await User.find(farmerFilter).select('_id').lean();
  const farmerIds = farmers.map(f => f._id);

  const cropPlots = await ProductionUnit.find({ farmerId: { $in: farmerIds }, category: 'plants' })
    .populate('farmerId', 'fullName village sector')
    .lean();

  // Group by crop type
  const cropDistribution = {};
  cropPlots.forEach(p => {
    const crop = p.plantData?.cropName || 'Unknown';
    if (!cropDistribution[crop]) {
      cropDistribution[crop] = { count: 0, totalLand: 0, plots: [] };
    }
    cropDistribution[crop].count++;
    cropDistribution[crop].totalLand += p.plantData?.landSize || 0;
    cropDistribution[crop].plots.push({
      name: p.name,
      farmer: p.farmerId?.fullName,
      village: p.farmerId?.village,
      landSize: p.plantData?.landSize,
      variety: p.plantData?.cropVariety,
      growthStage: p.plantData?.currentGrowthStage,
    });
  });

  // Group by growth stage
  const stageDistribution = {};
  cropPlots.forEach(p => {
    const stage = p.plantData?.currentGrowthStage || 'unknown';
    stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
  });

  data(res, {
    totalPlots: cropPlots.length,
    totalFarmers: farmers.length,
    cropDistribution,
    stageDistribution,
  });
}));

// Sector livestock report
router.get('/reports/livestock', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const filter = buildSectorFilter(req.user);
  const farmerFilter = { portal: 'farmer', status: 'active', ...filter };
  const farmers = await User.find(farmerFilter).select('_id').lean();
  const farmerIds = farmers.map(f => f._id);

  const livestockUnits = await ProductionUnit.find({ farmerId: { $in: farmerIds }, category: 'animals' })
    .populate('farmerId', 'fullName village sector')
    .lean();

  // Group by animal type
  const animalDistribution = {};
  livestockUnits.forEach(u => {
    const animal = u.livestockData?.animalType || 'Unknown';
    if (!animalDistribution[animal]) {
      animalDistribution[animal] = { count: 0, totalPopulation: 0, units: [] };
    }
    animalDistribution[animal].count++;
    animalDistribution[animal].totalPopulation += u.livestockData?.population?.total || 0;
    animalDistribution[animal].units.push({
      name: u.name,
      farmer: u.farmerId?.fullName,
      village: u.farmerId?.village,
      breed: u.livestockData?.breed,
      population: u.livestockData?.population,
      healthStatus: u.livestockData?.health?.generalStatus,
    });
  });

  // Health status summary
  const healthSummary = { healthy: 0, mild_issues: 0, serious_issues: 0, critical: 0, unknown: 0 };
  livestockUnits.forEach(u => {
    const status = u.livestockData?.health?.generalStatus || 'unknown';
    healthSummary[status] = (healthSummary[status] || 0) + 1;
  });

  // Vaccination coverage
  let vaccinated = 0, total = 0;
  livestockUnits.forEach(u => {
    if (u.livestockData?.health?.vaccinationStatus) {
      total++;
      if (u.livestockData.health.vaccinationStatus === 'up_to_date' || u.livestockData.health.vaccinationStatus === 'partial') {
        vaccinated++;
      }
    }
  });

  data(res, {
    totalUnits: livestockUnits.length,
    totalFarmers: farmers.length,
    totalPopulation: livestockUnits.reduce((sum, u) => sum + (u.livestockData?.population?.total || 0), 0),
    animalDistribution,
    healthSummary,
    vaccinationCoverage: total > 0 ? Math.round((vaccinated / total) * 100) : 0,
  });
}));

// Sector inspection report
router.get('/reports/inspections', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = buildSectorFilter(req.user);
  const farmerFilter = { portal: 'farmer', status: 'active', ...filter };
  const farmers = await User.find(farmerFilter).select('_id').lean();
  const farmerIds = farmers.map(f => f._id);

  const unitIds = (await ProductionUnit.find({ farmerId: { $in: farmerIds } }).select('_id').lean()).map(u => u._id);

  const inspectionFilter = { productionUnitId: { $in: unitIds } };
  if (startDate || endDate) {
    inspectionFilter.inspectionDate = {};
    if (startDate) inspectionFilter.inspectionDate.$gte = new Date(startDate);
    if (endDate) inspectionFilter.inspectionDate.$lte = new Date(endDate);
  }

  const inspections = await VeterinaryInspection.find(inspectionFilter)
    .populate('farmerId', 'fullName village sector')
    .populate('productionUnitId', 'name category')
    .populate('officerId', 'fullName')
    .sort({ inspectionDate: -1 })
    .lean();

  // Group by inspection type
  const typeDistribution = {};
  inspections.forEach(i => {
    typeDistribution[i.inspectionType] = (typeDistribution[i.inspectionType] || 0) + 1;
  });

  // Group by status
  const statusDistribution = {};
  inspections.forEach(i => {
    statusDistribution[i.status] = (statusDistribution[i.status] || 0) + 1;
  });

  // Follow-ups required
  const followUps = inspections.filter(i => i.followUpRequired).length;

  // Referrals
  const referrals = inspections.filter(i => i.status === 'referred').length;

  data(res, {
    totalInspections: inspections.length,
    inspections,
    typeDistribution,
    statusDistribution,
    followUpsRequired: followUps,
    referrals,
  });
}));

export default router;