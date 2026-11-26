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

const getSectorScope = (user) => {
  if (user.portal === 'sector') return user.sector;
  if (user.portal === 'district') return user.district;
  if (user.portal === 'province') return user.province;
  if (user.portal === 'rab') return null;
  return user.sector;
};

const canAccessSector = (user, sector) => {
  if (user.portal === 'rab') return true;
  if (user.portal === 'province') return user.province === sector;
  if (user.portal === 'district') return user.district === sector;
  if (user.portal === 'sector') return user.sector === sector;
  return false;
};

// ============================================
// FARMER PRODUCTION UNIT ROUTES
// ============================================

// Get all production units for farmer
router.get('/', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const { category, status, page = 1, limit = 20, search } = req.query;
  const filter = { farmerId: req.user._id };
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'plantData.cropName': { $regex: search, $options: 'i' } },
      { 'livestockData.animalType': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [units, total] = await Promise.all([
    ProductionUnit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    ProductionUnit.countDocuments(filter),
  ]);

  data(res, { units, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Get production unit by ID (farmer owns it)
router.get('/:id', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.id, farmerId: req.user._id }).lean();
  if (!unit) return hide(res);
  data(res, unit);
}));

// Create production unit (farmer)
router.post('/', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const { location, ...body } = req.body;
  const unit = await ProductionUnit.create({
    ...body,
    location: {
      ...location,
      sector: req.user.sector,
      district: req.user.district,
      province: req.user.province,
    },
    farmerId: req.user._id,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  // Create notification
  await ProductionAlert.create({
    userId: req.user._id,
    productionUnitId: unit._id,
    type: 'registration_complete',
    title: 'Production Unit Registered',
    message: `Your ${unit.category === 'plants' ? 'crop plot' : 'livestock unit'} "${unit.name}" has been registered successfully.`,
    severity: 'info',
  });

  data(res, unit, 201);
}));

// Update production unit (farmer owns it)
router.patch('/:id', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const allowedFields = ['name', 'purpose', 'plantData', 'livestockData', 'description', 'coverPhoto', 'photos', 'documents'];
  const updates = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) updates[field] = req.body[field];
  }

  // Geographic ownership is immutable: farmers may edit their village/cell and GPS,
  // but cannot move a unit into another sector, district, or province.
  if (req.body?.location && typeof req.body.location === 'object') {
    updates.location = {
      village: req.body.location.village,
      cell: req.body.location.cell,
      gpsCoordinates: req.body.location.gpsCoordinates,
      sector: req.user.sector,
      district: req.user.district,
      province: req.user.province,
    };
    if (updates.location.village === undefined || updates.location.cell === undefined) {
      return res.status(400).json({ message: 'Village and cell are required when updating a production location.' });
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No editable production fields were supplied.' });
  }

  const unit = await ProductionUnit.findOneAndUpdate(
    { _id: req.params.id, farmerId: req.user._id },
    { $set: { ...updates, updatedBy: req.user._id } },
    { new: true, runValidators: true }
  );
  if (!unit) return hide(res);
  data(res, unit);
}));

// Delete production unit (soft delete)
router.delete('/:id', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOneAndUpdate(
    { _id: req.params.id, farmerId: req.user._id },
    { status: 'archived', deletedAt: new Date(), updatedBy: req.user._id },
    { new: true }
  );
  if (!unit) return hide(res);
  data(res, { message: 'Production unit archived successfully' });
}));

// ============================================
// PRODUCTION ACTIVITIES
// ============================================

// Get activities for a production unit
router.get('/:unitId/activities', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [activities, total] = await Promise.all([
    ProductionActivity.find({ productionUnitId: req.params.unitId }).sort({ occurredAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    ProductionActivity.countDocuments({ productionUnitId: req.params.unitId }),
  ]);

  data(res, { activities, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Add activity to production unit
router.post('/:unitId/activities', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);

  const activity = await ProductionActivity.create({
    ...req.body,
    productionUnitId: req.params.unitId,
    farmerId: req.user._id,
  });

  data(res, activity, 201);
}));

// ============================================
// CROP MONITORING
// ============================================

// Get crop monitoring records
router.get('/:unitId/crop-monitoring', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'plants') return res.status(400).json({ message: 'This production unit is not a crop plot.' });

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    CropMonitoringRecord.find({ productionUnitId: req.params.unitId }).sort({ recordedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    CropMonitoringRecord.countDocuments({ productionUnitId: req.params.unitId }),
  ]);

  data(res, { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Add crop monitoring record
router.post('/:unitId/crop-monitoring', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'plants') return res.status(400).json({ message: 'This production unit is not a crop plot.' });

  const record = await CropMonitoringRecord.create({
    ...req.body,
    productionUnitId: req.params.unitId,
    farmerId: req.user._id,
    recordedBy: req.user._id,
  });

  data(res, record, 201);
}));

// ============================================
// LIVESTOCK MONITORING
// ============================================

// Get livestock health records
router.get('/:unitId/livestock-health', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'animals') return res.status(400).json({ message: 'This production unit is not a livestock unit.' });

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    LivestockHealthRecord.find({ productionUnitId: req.params.unitId }).sort({ recordedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    LivestockHealthRecord.countDocuments({ productionUnitId: req.params.unitId }),
  ]);

  data(res, { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Add livestock health record
router.post('/:unitId/livestock-health', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'animals') return res.status(400).json({ message: 'This production unit is not a livestock unit.' });

  const record = await LivestockHealthRecord.create({
    ...req.body,
    productionUnitId: req.params.unitId,
    farmerId: req.user._id,
    recordedBy: req.user._id,
  });

  data(res, record, 201);
}));

// Get livestock population records
router.get('/:unitId/livestock-population', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'animals') return res.status(400).json({ message: 'This production unit is not a livestock unit.' });

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    LivestockPopulationRecord.find({ productionUnitId: req.params.unitId }).sort({ recordedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    LivestockPopulationRecord.countDocuments({ productionUnitId: req.params.unitId }),
  ]);

  data(res, { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Add livestock population record
router.post('/:unitId/livestock-population', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'animals') return res.status(400).json({ message: 'This production unit is not a livestock unit.' });

  const record = await LivestockPopulationRecord.create({
    ...req.body,
    productionUnitId: req.params.unitId,
    farmerId: req.user._id,
    recordedBy: req.user._id,
  });

  data(res, record, 201);
}));

// ============================================
// HARVEST & PRODUCTION RECORDS
// ============================================

// Get harvest records (plants)
router.get('/:unitId/harvest', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'plants') return res.status(400).json({ message: 'This production unit is not a crop plot.' });

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    HarvestRecord.find({ productionUnitId: req.params.unitId }).sort({ harvestDate: -1 }).skip(skip).limit(Number(limit)).lean(),
    HarvestRecord.countDocuments({ productionUnitId: req.params.unitId }),
  ]);

  data(res, { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Add harvest record
router.post('/:unitId/harvest', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'plants') return res.status(400).json({ message: 'This production unit is not a crop plot.' });

  const record = await HarvestRecord.create({
    ...req.body,
    productionUnitId: req.params.unitId,
    farmerId: req.user._id,
    recordedBy: req.user._id,
  });

  data(res, record, 201);
}));

// Get animal production records
router.get('/:unitId/animal-production', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'animals') return res.status(400).json({ message: 'This production unit is not a livestock unit.' });

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    AnimalProductionRecord.find({ productionUnitId: req.params.unitId }).sort({ productionDate: -1 }).skip(skip).limit(Number(limit)).lean(),
    AnimalProductionRecord.countDocuments({ productionUnitId: req.params.unitId }),
  ]);

  data(res, { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Add animal production record
router.post('/:unitId/animal-production', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);
  if (unit.category !== 'animals') return res.status(400).json({ message: 'This production unit is not a livestock unit.' });

  const record = await AnimalProductionRecord.create({
    ...req.body,
    productionUnitId: req.params.unitId,
    farmerId: req.user._id,
    recordedBy: req.user._id,
  });

  data(res, record, 201);
}));

// ============================================
// EXPENSES
// ============================================

// Get expenses
router.get('/:unitId/expenses', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [expenses, total] = await Promise.all([
    ProductionExpense.find({ productionUnitId: req.params.unitId }).sort({ expenseDate: -1 }).skip(skip).limit(Number(limit)).lean(),
    ProductionExpense.countDocuments({ productionUnitId: req.params.unitId }),
  ]);

  data(res, { expenses, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
}));

// Add expense
router.post('/:unitId/expenses', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const unit = await ProductionUnit.findOne({ _id: req.params.unitId, farmerId: req.user._id });
  if (!unit) return hide(res);

  const expense = await ProductionExpense.create({
    ...req.body,
    productionUnitId: req.params.unitId,
    farmerId: req.user._id,
  });

  data(res, expense, 201);
}));

export default router;