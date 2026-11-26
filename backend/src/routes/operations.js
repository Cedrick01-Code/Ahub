import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { canAccessRegion } from '../utils/regionAccess.js';
import mongoose from 'mongoose';
import multer from 'multer';
import User from '../models/User.js';
import { Announcement, AssistantTurn, Favorite, FieldTask, Notification, Order, Plot, PlotActivity, Problem, Product, Visit } from '../models/Operations.js';
import { Course } from '../models/Learning.js';
import { Exam, ExamAttempt } from '../models/Learning.js';
import { getFourDayForecast, resolveLocation } from '../services/weather.js';
import { ai } from '../lib/gemini.js';

const router = express.Router();
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Multer for product images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
const auth = authenticate;
const roles = (...allowed) => (req, res, next) => allowed.includes(req.user.portal) ? next() : res.status(403).json({ message: 'This portal cannot perform that action.' });
const data = (res, value, status = 200) => res.status(status).json({ data: value });
const hide = res => res.status(404).json({ message: 'Not found.' });
const sector = user => user.sector || user.regionScope;
const earthDistance = (lat1, lon1, lat2, lon2) => { const radians = value => value * Math.PI / 180; const dLat = radians(lat2 - lat1); const dLon = radians(lon2 - lon1); const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); };
const scopedFarmerIds = async user => { const filter = { portal: 'farmer', status: 'active' }; if (user.portal === 'sector') filter.sector = sector(user); if (user.portal === 'district') filter.district = user.district; if (user.portal === 'province') filter.province = user.province; return User.find(filter).distinct('_id'); };
const isStaffPortal = user => ['sector', 'district', 'province', 'rab'].includes(user?.portal);
const canViewAnnouncement = (user, announcement) => {
  if (String(announcement.authorId?._id || announcement.authorId) === String(user._id)) return true;
  if (announcement.status !== 'published') return false;
  if (user.portal === 'nsg') return false;
  if (isStaffPortal(user)) {
    if (announcement.level === 'national') return true;
    return canAccessRegion(user, announcement);
  }
  if (announcement.level === 'national') return true;
  if (announcement.level === 'province') return Boolean(user.province) && user.province === announcement.province;
  if (announcement.level === 'district') return Boolean(user.district) && user.district === announcement.district && (!user.province || user.province === announcement.province);
  if (announcement.level === 'local') return Boolean(user.sector) && user.sector === announcement.sector && (!user.district || user.district === announcement.district) && (!user.province || user.province === announcement.province);
  return false;
};
const canManageAnnouncement = (user, announcement) =>
  String(announcement.authorId) === String(user._id) ||
  (isStaffPortal(user) && (announcement.level === 'national' ? user.portal === 'rab' : canAccessRegion(user, announcement)));

const notify = (userId, title, body, entityType, entityId) => Notification.create({ userId, title, body, entityType, entityId });
const notifySector = async (sectorName, title, body, entityType, entityId) => { const vets = await User.find({ portal: 'sector', status: 'active', $or: [{ sector: sectorName }, { regionScope: sectorName }] }).distinct('_id'); if (vets.length) await Notification.insertMany(vets.map(userId => ({ userId, title, body, entityType, entityId }))); };
const isTimeoutError = error => [408, 504].includes(Number(error?.status)) || error?.name === 'TimeoutError' || error?.name === 'AbortError' || /timed? ?out|timeout|deadline exceeded|operation was aborted/i.test(error?.message || '') || ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'ECONNABORTED'].includes(error?.cause?.code);
const logGeminiError = (model, error) => console.error('Gemini request failed', { model, status: error?.status, message: error?.message, causeCode: error?.cause?.code, causeMessage: error?.cause?.message });

async function generateGuideBook(unitData, user) {
  const category = unitData.category || (unitData.cropName ? 'plants' : 'animals');
  const enterprise = unitData.enterprise || unitData.cropName || unitData.animalType || 'Unknown';
  const unitName = unitData.name || 'Your Farm';
  
  let prompt = '';
  let chapters = [];

  if (category === 'plants') {
    const cropName = unitData.cropName || enterprise;
    const variety = unitData.cropVariety || 'Standard';
    const soilType = unitData.soilType || 'Loamy';
    const irrigation = unitData.irrigation || 'Rainfed';
    const area = unitData.area || 'N/A';
    const unit = unitData.unit || 'ha';
    const plantingDate = unitData.plantingDate ? new Date(unitData.plantingDate).toLocaleDateString() : 'Not set';
    const expectedHarvest = unitData.expectedHarvest ? new Date(unitData.expectedHarvest).toLocaleDateString() : 'Not set';
    const location = [user.sector, user.district, user.province, 'Rwanda'].filter(Boolean).join(', ');

    prompt = `You are an expert agricultural advisor for Rwanda. Create a comprehensive, practical farming guide book for ${cropName} (${variety} variety) tailored for a farmer in ${location}.

Farm Details:
- Plot: ${unitName} (${area} ${unit})
- Crop: ${cropName} (${variety})
- Soil Type: ${soilType}
- Irrigation: ${irrigation}
- Planting Date: ${plantingDate}
- Expected Harvest: ${expectedHarvest}

Generate a complete guide with these chapters (each chapter should be detailed, practical, and specific to Rwanda's conditions):

1. Planning & Site Selection - Choosing the right location, soil testing, land preparation
2. Soil Preparation & Fertility Management - Soil amendments, organic matter, pH adjustment for ${soilType}
3. Seed Selection & Planting - Variety selection for ${variety}, spacing, depth, timing for Rwanda seasons
4. Irrigation & Water Management - ${irrigation} system setup, scheduling, water conservation
5. Nutrient Management & Fertilization - Fertilizer types, application rates, timing, organic options
6. Weed Management - Identification, cultural control, mulching, safe herbicide use
7. Pest Management - Common pests for ${cropName} in Rwanda, IPM strategies, beneficial insects
8. Disease Management - Common diseases, prevention, resistant varieties, organic treatments
9. Growth Monitoring - Growth stages, nutrient deficiency signs, corrective actions
10. Harvesting & Post-Harvest Handling - Timing, techniques, storage, value addition
11. Marketing & Economics - Market channels, pricing, record keeping, profitability

Each chapter should include:
- Clear headings and subheadings
- Step-by-step instructions
- Rwanda-specific advice (climate, seasons, local varieties)
- Practical tips from experienced farmers
- Safety considerations
- Approximate costs where relevant (in RWF)

Write in clear, accessible English suitable for a Rwandan farmer. Use bullet points, numbered steps, and emphasize key takeaways.`;

    chapters = [
      'Planning & Site Selection',
      'Soil Preparation & Fertility Management',
      'Seed Selection & Planting',
      'Irrigation & Water Management',
      'Nutrient Management & Fertilization',
      'Weed Management',
      'Pest Management',
      'Disease Management',
      'Growth Monitoring',
      'Harvesting & Post-Harvest Handling',
      'Marketing & Economics',
    ];
  } else {
    const animalType = unitData.animalType || enterprise;
    const breed = unitData.breed || 'Local';
    const population = unitData.population || 10;
    const housing = unitData.housingType || 'Mixed';
    const feeding = unitData.feedingSystem || 'Mixed';
    const waterSource = unitData.waterSource || 'Borehole';
    const location = [user.sector, user.district, user.province, 'Rwanda'].filter(Boolean).join(', ');

    prompt = `You are an expert livestock advisor for Rwanda. Create a comprehensive, practical livestock management guide book for ${animalType} (${breed} breed) tailored for a farmer in ${location}.

Farm Details:
- Unit: ${unitName}
- Species: ${animalType} (${breed})
- Population: ${population}
- Housing: ${housing}
- Feeding System: ${feeding}
- Water Source: ${waterSource}

Generate a complete guide with these chapters:

1. Planning & Breed Selection - Choosing ${breed} ${animalType}, sourcing quality stock, budgeting
2. Housing & Infrastructure - ${housing} design, ventilation, space requirements, biosecurity
3. Nutrition & Feeding Management - ${feeding} system, feed formulation, supplements, seasonal adjustments
4. Water Management - ${waterSource} system, quality, access, conservation
5. Health Management & Disease Prevention - Vaccination schedule, deworming, biosecurity, quarantine
6. Common Diseases & Treatment - ${animalType}-specific diseases in Rwanda, symptoms, treatments
7. Parasite Control - Internal/external parasites, strategic deworming, pasture management
8. Reproduction & Breeding Management - Breeding season, heat detection, AI/natural service, pregnancy care
9. Young Stock Management - Calving/kidding/farrowing, colostrum, weaning, growth monitoring
10. Production & Record Keeping - Milk/meat/egg production tracking, financial records, performance analysis
11. Marketing & Value Addition - Market channels, pricing, processing, adding value

Each chapter should include:
- Clear headings and subheadings
- Step-by-step instructions
- Rwanda-specific advice (climate, local breeds, veterinary services)
- Practical tips from experienced farmers
- Safety and welfare considerations
- Approximate costs where relevant (in RWF)

Write in clear, accessible English suitable for a Rwandan farmer. Use bullet points, numbered steps, and emphasize key takeaways.`;

    chapters = [
      'Planning & Breed Selection',
      'Housing & Infrastructure',
      'Nutrition & Feeding Management',
      'Water Management',
      'Health Management & Disease Prevention',
      'Common Diseases & Treatment',
      'Parasite Control',
      'Reproduction & Breeding Management',
      'Young Stock Management',
      'Production & Record Keeping',
      'Marketing & Value Addition',
    ];
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.5,
      maxOutputTokens: 8000,
    },
  });

  const content = String(response.text || '').trim();
  
  // Parse chapters from the response
  const chapterContents = [];
  const chapterRegex = new RegExp(`(${chapters.map(c => c.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = content.split(chapterRegex);
  
  let currentChapter = '';
  let currentContent = '';
  
  for (const part of parts) {
    if (chapters.some(c => c.toLowerCase() === part.trim().toLowerCase())) {
      if (currentChapter && currentContent) {
        chapterContents.push({ title: currentChapter, content: currentContent.trim() });
      }
      currentChapter = part.trim();
      currentContent = '';
    } else {
      currentContent += part;
    }
  }
  if (currentChapter && currentContent) {
    chapterContents.push({ title: currentChapter, content: currentContent.trim() });
  }

  // If parsing failed, create chapters from the list
  const finalChapters = chapterContents.length === chapters.length 
    ? chapterContents 
    : chapters.map((title, i) => ({ title, content: content }));

  return {
    title: `Complete ${category === 'plants' ? 'Crop' : 'Livestock'} Guide: ${enterprise}`,
    subtitle: `${unitName} • ${area ? `${area} ${unit}` : ''} • ${location}`,
    category,
    enterprise,
    coverImagePrompt: `Professional agricultural book cover for ${enterprise} farming guide, featuring healthy ${category === 'plants' ? cropName : animalType} in Rwanda landscape, modern design, green and earth tones`,
    chapters: finalChapters,
    generatedAt: new Date().toISOString(),
    unitName,
  };
}

router.get('/plots', auth, roles('farmer'), asyncRoute(async (req, res) => data(res, await Plot.find({ farmerId: req.user._id }).sort({ createdAt: -1 }))));
router.post('/plots', auth, roles('farmer'), asyncRoute(async (req, res) => { const { name, enterprise, category, ownership, area, unit, gpsLatitude, gpsLongitude, soilType, irrigation, cropName, cropVariety, expectedYield, yieldUnit, animalType, breed, population, plantedAt, expectedHarvest, status, description } = req.body; if (!name?.trim() || !enterprise?.trim()) return res.status(400).json({ message: 'Plot name and crop or livestock type are required.' }); const plot = await Plot.create({ farmerId: req.user._id, name: name.trim(), enterprise: enterprise.trim(), category: category || 'plants', ownership: ownership || 'owned', area: Number(area) || undefined, unit, gpsLatitude: gpsLatitude ? Number(gpsLatitude) : undefined, gpsLongitude: gpsLongitude ? Number(gpsLongitude) : undefined, soilType: soilType || 'loamy', irrigation: irrigation || 'rainfed', cropName: cropName?.trim(), cropVariety: cropVariety?.trim(), expectedYield: expectedYield ? Number(expectedYield) : undefined, yieldUnit, animalType: animalType?.trim(), breed: breed?.trim(), population: population ? Number(population) : undefined, plantedAt, expectedHarvest, stage: status || (plantedAt ? 'growing' : 'planning'), nextAction: 'Record your first farm activity', regionPath: [req.user.province, req.user.district, req.user.sector].filter(Boolean), description: description?.trim() }); const guides = await Course.find({ status: 'published', $or: [{ scopeLevel: 'national' }, { ownerSectorId: req.user.sector }], enterpriseIds: { $in: [enterprise.trim()] } }).select('title code description enterpriseIds lessons').lean(); data(res, { plot, guides }, 201); }));
router.get('/plots/:id/activities', auth, roles('farmer'), asyncRoute(async (req, res) => { const plot = await Plot.exists({ _id: req.params.id, farmerId: req.user._id }); if (!plot) return hide(res); data(res, await PlotActivity.find({ plotId: req.params.id, farmerId: req.user._id }).sort({ occurredAt: -1 }).limit(50)); }));
router.post('/plots/:id/activities', auth, roles('farmer'), asyncRoute(async (req, res) => { const plot = await Plot.findOne({ _id: req.params.id, farmerId: req.user._id }); if (!plot) return hide(res); if (!req.body.note?.trim()) return res.status(400).json({ message: 'Describe the farm activity.' }); const activity = await PlotActivity.create({ plotId: plot._id, farmerId: req.user._id, kind: req.body.kind || 'other', note: req.body.note.trim(), occurredAt: req.body.occurredAt || new Date() }); plot.lastActivityAt = activity.occurredAt; if (req.body.stage) plot.stage = req.body.stage; if (req.body.nextAction) plot.nextAction = req.body.nextAction; await plot.save(); data(res, activity, 201); }));
router.patch('/plots/:id', auth, roles('farmer'), asyncRoute(async (req, res) => { const plot = await Plot.findOne({ _id: req.params.id, farmerId: req.user._id }); if (!plot) return hide(res); for (const field of ['stage', 'nextAction', 'plantedAt']) if (req.body[field] !== undefined) plot[field] = req.body[field]; await plot.save(); data(res, plot); }));
router.get('/products', auth, roles('farmer', 'customer'), asyncRoute(async (req, res) => { const filter = { status: 'available', deletedAt: { $exists: false } }; if (req.user.portal === 'farmer') filter.farmerId = req.user._id; else { if (req.query.sector) filter['regionPath.2'] = String(req.query.sector); if (req.query.district) filter['regionPath.1'] = String(req.query.district); if (req.query.enterprise) filter.enterprise = String(req.query.enterprise); if (req.query.q) filter.title = { $regex: String(req.query.q).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }; } let products = await Product.find(filter).populate('farmerId', 'fullName sector district province').sort({ availableAt: 1, createdAt: -1 }).lean(); let origin = null; if (req.user.portal === 'customer' && (req.query.near || req.user.sector || req.user.district)) { try { origin = await resolveLocation([req.query.near, req.user.sector, req.user.district, req.user.province, 'Rwanda']); } catch {} } if (origin) { products = products.map(product => ({ ...product, distanceKm: product.latitude && product.longitude ? Math.round(earthDistance(origin.latitude, origin.longitude, product.latitude, product.longitude) * 10) / 10 : null })).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)); const maxDistance = Number(req.query.maxDistanceKm); if (maxDistance > 0) products = products.filter(product => product.distanceKm == null || product.distanceKm <= maxDistance); } const saved = req.user.portal === 'customer' ? new Set((await Favorite.find({ customerId: req.user._id }).distinct('productId')).map(String)) : new Set(); data(res, products.map(product => ({ ...product, isFavorite: saved.has(String(product._id)) }))); }));

router.post('/products', auth, roles('farmer'), upload.single('image'), handleMulterError, asyncRoute(async (req, res) => { const { title, enterprise, quantity, unit, availableAt } = req.body; if (!title?.trim() || !(Number(quantity) > 0)) return res.status(400).json({ message: 'Product name and positive quantity are required.' }); let coordinates = {}; try { const location = await resolveLocation([req.user.sector, req.user.district, req.user.province, 'Rwanda']); coordinates = { latitude: location.latitude, longitude: location.longitude }; } catch {} let imageUrl = req.body.imageUrl; let imagePublicId = req.body.imagePublicId; if (req.file) { imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`; imagePublicId = `local-${Date.now()}`; } data(res, await Product.create({ farmerId: req.user._id, title: title.trim(), enterprise, quantity: Number(quantity), unit, availableAt, ...coordinates, regionPath: [req.user.province, req.user.district, req.user.sector].filter(Boolean), imageUrl, imagePublicId }), 201); }));

router.patch('/products/:id', auth, roles('farmer'), upload.single('image'), handleMulterError, asyncRoute(async (req, res) => { const product = await Product.findOne({ _id: req.params.id, farmerId: req.user._id }); if (!product) return hide(res); const allowedFields = ['title', 'enterprise', 'quantity', 'unit', 'availableAt', 'status', 'imageUrl', 'imagePublicId']; for (const field of allowedFields) if (req.body[field] !== undefined) product[field] = req.body[field]; if (req.file) { product.imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`; product.imagePublicId = `local-${Date.now()}`; } if (req.body.quantity !== undefined && Number(req.body.quantity) <= 0) product.status = 'soldout'; if (product.status === 'soldout' && !product.soldoutAt) product.soldoutAt = new Date(); await product.save(); data(res, product); }));

router.patch('/products/:id/soldout', auth, roles('farmer'), asyncRoute(async (req, res) => { const product = await Product.findOne({ _id: req.params.id, farmerId: req.user._id }); if (!product) return hide(res); product.status = 'soldout'; product.soldoutAt = new Date(); await product.save(); data(res, product); }));

router.delete('/products/:id', auth, roles('farmer'), asyncRoute(async (req, res) => { const product = await Product.findOne({ _id: req.params.id, farmerId: req.user._id }); if (!product) return hide(res); product.deletedAt = new Date(); await product.save(); data(res, { deleted: true }); }));

router.get('/favorites', auth, roles('customer'), asyncRoute(async (req, res) => data(res, await Favorite.find({ customerId: req.user._id }).populate({ path: 'productId', populate: { path: 'farmerId', select: 'fullName sector district' } }).sort({ createdAt: -1 }))));
router.put('/favorites/:productId', auth, roles('customer'), asyncRoute(async (req, res) => { const product = await Product.exists({ _id: req.params.productId, status: 'available' }); if (!product) return hide(res); await Favorite.updateOne({ customerId: req.user._id, productId: req.params.productId }, { $setOnInsert: { customerId: req.user._id, productId: req.params.productId } }, { upsert: true }); data(res, { productId: req.params.productId, saved: true }, 201); }));
router.delete('/favorites/:productId', auth, roles('customer'), asyncRoute(async (req, res) => { await Favorite.deleteOne({ customerId: req.user._id, productId: req.params.productId }); data(res, { productId: req.params.productId, saved: false }); }));
router.post('/orders', auth, roles('customer'), asyncRoute(async (req, res) => { if (!mongoose.isValidObjectId(req.body.productId) || !(Number(req.body.quantity) > 0)) return res.status(400).json({ message: 'A valid product and positive quantity are required.' }); const product = await Product.findOne({ _id: req.body.productId, status: 'available' }); if (!product) return hide(res); if (Number(req.body.quantity) > product.quantity) return res.status(409).json({ message: `Only ${product.quantity} ${product.unit || 'units'} are currently listed.` }); const order = await Order.create({ customerId: req.user._id, farmerId: product.farmerId, productId: product._id, quantity: Number(req.body.quantity), events: [{ status: 'requested', note: 'Request sent to farmer', actorId: req.user._id }] }); await notify(product.farmerId, 'New product request', `${req.user.fullName} requested ${order.quantity} ${product.unit || ''} of ${product.title}.`, 'order', order._id); data(res, order, 201); }));
router.get('/orders', auth, roles('farmer', 'customer'), asyncRoute(async (req, res) => data(res, await Order.find(req.user.portal === 'farmer' ? { farmerId: req.user._id } : { customerId: req.user._id }).populate('productId').populate('farmerId', 'fullName').populate('customerId', 'fullName').sort({ createdAt: -1 }))));
router.patch('/orders/:id', auth, roles('farmer'), asyncRoute(async (req, res) => { const decision = req.body.decision; if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Decision must be approved or rejected.' }); if (decision === 'rejected' && !req.body.reason?.trim()) return res.status(400).json({ message: 'A rejection reason is required.' }); const order = await Order.findOne({ _id: req.params.id, farmerId: req.user._id, status: 'requested' }); if (!order) return hide(res); if (decision === 'approved') { const product = await Product.findOneAndUpdate({ _id: order.productId, status: 'available', quantity: { $gte: order.quantity } }, { $inc: { quantity: -order.quantity } }, { new: true }); if (!product) return res.status(409).json({ message: 'There is not enough available stock to approve this request.' }); if (product.quantity <= 0) { product.status = 'soldout'; product.soldoutAt = new Date(); await product.save(); } } order.status = decision; order.rejectionReason = decision === 'rejected' ? req.body.reason.trim() : ''; order.events.push({ status: decision, note: decision === 'approved' ? 'Farmer approved the request' : order.rejectionReason, actorId: req.user._id }); await order.save(); await notify(order.customerId, decision === 'approved' ? 'Product request approved' : 'Product request declined', decision === 'approved' ? 'The farmer approved your request. Open messages to agree on payment and collection.' : req.body.reason.trim(), 'order', order._id); data(res, order); }));
router.patch('/orders/:id/arrangement', auth, roles('farmer', 'customer'), asyncRoute(async (req, res) => { const filter = req.user.portal === 'farmer' ? { _id: req.params.id, farmerId: req.user._id } : { _id: req.params.id, customerId: req.user._id }; const order = await Order.findOne(filter); if (!order || order.status !== 'approved') return hide(res); const collectionAt = req.body.collectionAt ? new Date(req.body.collectionAt) : null; if (collectionAt && Number.isNaN(collectionAt.getTime())) return res.status(400).json({ message: 'Provide a valid collection date and time.' }); if (req.body.status === 'completed') order.status = 'completed'; if (collectionAt) order.collectionAt = collectionAt; order.events.push({ status: order.status, note: collectionAt ? `Collection proposed for ${collectionAt.toISOString()}` : 'Order marked complete', actorId: req.user._id }); await order.save(); const recipient = req.user.portal === 'farmer' ? order.customerId : order.farmerId; await notify(recipient, 'Order arrangement updated', collectionAt ? `Collection proposed for ${collectionAt.toLocaleString()}.` : 'The order was marked complete.', 'order', order._id); data(res, order); }));
router.post('/orders/:id/messages', auth, roles('farmer', 'customer'), asyncRoute(async (req, res) => { if (!req.body.text?.trim()) return res.status(400).json({ message: 'Message text is required.' }); const filter = req.user.portal === 'farmer' ? { _id: req.params.id, farmerId: req.user._id } : { _id: req.params.id, customerId: req.user._id }; const order = await Order.findOne(filter); if (!order) return hide(res); order.messages.push({ senderId: req.user._id, text: req.body.text.trim() }); await order.save(); await notify(req.user.portal === 'farmer' ? order.customerId : order.farmerId, 'New order message', req.body.text.trim(), 'order', order._id); data(res, order.messages.at(-1), 201); }));
router.post('/problems', auth, roles('farmer'), asyncRoute(async (req, res) => { if (!req.body.title?.trim() || !req.body.description?.trim()) return res.status(400).json({ message: 'Problem title and description are required.' }); const problem = await Problem.create({ farmerId: req.user._id, sectorId: sector(req.user), title: req.body.title.trim(), description: req.body.description.trim(), enterprise: req.body.enterprise }); await notifySector(sector(req.user), 'New farm problem reported', `${req.user.fullName}: ${problem.title}`, 'problem', problem._id); data(res, problem, 201); }));
router.get('/problems', auth, roles('farmer', 'sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => { const filter = req.user.portal === 'farmer' ? { farmerId: req.user._id } : req.user.portal === 'sector' ? { sectorId: sector(req.user) } : {}; if (['district', 'province'].includes(req.user.portal)) { const ids = await scopedFarmerIds(req.user); filter.farmerId = { $in: ids }; } data(res, await Problem.find(filter).populate('farmerId', 'fullName sector district province').sort({ createdAt: -1 })); }));
router.patch('/problems/:id', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => { if (!['pending', 'in_progress', 'solved'].includes(req.body.status)) return res.status(400).json({ message: 'Choose pending, in progress, or solved.' }); if (req.body.status === 'solved' && !req.body.resolution?.trim()) return res.status(400).json({ message: 'Add the resolution before closing this problem.' }); const allowed = await scopedFarmerIds(req.user); const filter = { _id: req.params.id, farmerId: { $in: allowed } }; if (req.user.portal === 'sector') filter.sectorId = sector(req.user); const problem = await Problem.findOne(filter); if (!problem) return hide(res); problem.status = req.body.status; problem.resolution = req.body.resolution || ''; problem.resolvedBy = req.user._id; problem.resolvedAt = problem.status === 'solved' ? new Date() : undefined; if (problem.status !== 'solved' && req.user.portal !== 'sector') problem.escalatedAt = new Date(); await problem.save(); await notify(problem.farmerId, 'Farm problem updated', problem.resolution || `Status: ${problem.status}`, 'problem', problem._id); data(res, problem); }));
router.post('/visits', auth, roles('farmer'), asyncRoute(async (req, res) => { if (!req.body.concern?.trim()) return res.status(400).json({ message: 'Describe the animal or plant health concern.' }); const visit = await Visit.create({ farmerId: req.user._id, sectorId: sector(req.user), enterprise: req.body.enterprise, concern: req.body.concern.trim(), preferredAt: req.body.preferredAt }); await notifySector(sector(req.user), 'New veterinary visit request', `${req.user.fullName} requested help with ${visit.enterprise || 'a farm health issue'}.`, 'visit', visit._id); data(res, visit, 201); }));
router.get('/visits', auth, roles('farmer', 'sector', 'district', 'province'), asyncRoute(async (req, res) => { const filter = req.user.portal === 'farmer' ? { farmerId: req.user._id } : req.user.portal === 'sector' ? { sectorId: sector(req.user) } : { farmerId: { $in: await scopedFarmerIds(req.user) } }; data(res, await Visit.find(filter).populate('farmerId', 'fullName sector').sort({ createdAt: -1 })); }));
router.patch('/visits/:id', auth, roles('sector'), asyncRoute(async (req, res) => { const { decision, reason } = req.body; if (!['approved', 'rejected', 'rescheduled'].includes(decision) || (['rejected', 'rescheduled'].includes(decision) && !reason?.trim()) || (decision === 'rescheduled' && !req.body.scheduledAt)) return res.status(400).json({ message: 'Choose approve, reject, or reschedule. Rejection and rescheduling need a reason; rescheduling also needs a date.' }); const visit = await Visit.findOne({ _id: req.params.id, sectorId: sector(req.user), status: 'pending' }); if (!visit) return hide(res); visit.status = decision; visit.decisionReason = reason || ''; visit.reviewedBy = req.user._id; if (decision === 'rescheduled') visit.scheduledAt = new Date(req.body.scheduledAt); await visit.save(); await notify(visit.farmerId, `Vet visit ${visit.status}`, visit.decisionReason || 'Your sector vet approved the visit request.', 'visit', visit._id); data(res, visit); }));
router.get('/tasks', auth, roles('farmer', 'sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => { const filter = req.user.portal === 'farmer' ? { farmerId: req.user._id } : req.user.portal === 'sector' ? { sectorId: sector(req.user) } : { farmerId: { $in: await scopedFarmerIds(req.user) } }; data(res, await FieldTask.find(filter).populate('farmerId', 'fullName sector').sort({ dueAt: 1 })); }));
router.post('/tasks', auth, roles('sector'), asyncRoute(async (req, res) => { const farmer = await User.findOne({ _id: req.body.farmerId, portal: 'farmer', status: 'active', sector: sector(req.user) }); if (!farmer || !req.body.title?.trim()) return res.status(400).json({ message: 'Select a farmer in your sector and provide a task title.' }); const task = await FieldTask.create({ sectorId: sector(req.user), farmerId: farmer._id, title: req.body.title.trim(), instructions: req.body.instructions, enterprise: req.body.enterprise, dueAt: req.body.dueAt }); await notify(farmer._id, 'New daily farm task', task.title, 'task', task._id); data(res, task, 201); }));
router.patch('/tasks/:id/complete', auth, roles('farmer'), asyncRoute(async (req, res) => { const task = await FieldTask.findOneAndUpdate({ _id: req.params.id, farmerId: req.user._id, status: 'assigned' }, { $set: { status: 'submitted', completionNote: req.body.note || '', completedAt: new Date() } }, { new: true }); if (!task) return hide(res); await notifySector(task.sectorId, 'Task submitted for review', `${req.user.fullName} submitted: ${task.title}`, 'task', task._id); data(res, task); }));
router.patch('/tasks/:id/snooze', auth, roles('farmer'), asyncRoute(async (req, res) => { const until = new Date(req.body.until); if (Number.isNaN(until.getTime()) || until <= new Date()) return res.status(400).json({ message: 'Choose a future reminder time.' }); const task = await FieldTask.findOneAndUpdate({ _id: req.params.id, farmerId: req.user._id, status: 'assigned' }, { $set: { snoozedUntil: until } }, { new: true }); if (!task) return hide(res); data(res, task); }));
router.patch('/tasks/:id/review', auth, roles('sector'), asyncRoute(async (req, res) => { if (!['approved', 'returned'].includes(req.body.decision)) return res.status(400).json({ message: 'Decision must be approved or returned.' }); if (req.body.decision === 'returned' && !req.body.note?.trim()) return res.status(400).json({ message: 'Add feedback before returning this task.' }); const task = await FieldTask.findOneAndUpdate({ _id: req.params.id, sectorId: sector(req.user), status: 'submitted' }, { $set: { status: req.body.decision, reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: req.body.note || '' } }, { new: true }); if (!task) return hide(res); await notify(task.farmerId, 'Daily task reviewed', `${task.title}: ${task.status}. ${task.reviewNote}`, 'task', task._id); data(res, task); }));
router.get('/announcements', auth, asyncRoute(async (req, res) => {
  const u = req.user;
  const { status, level, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  const clauses = [];

  if (u.portal === 'nsg') {
    filter.authorId = u._id;
  } else if (isStaffPortal(u)) {
    clauses.push({ level: 'national' });
    if (u.portal === 'province' && u.province) clauses.push({ province: u.province, level: { $in: ['province', 'district', 'local'] } });
    if (u.portal === 'district' && u.district) clauses.push({ district: u.district, level: { $in: ['district', 'local'] } });
    if (u.portal === 'sector' && u.sector) clauses.push({ sector: u.sector, level: 'local' });
    clauses.push({ authorId: u._id });
    filter.$or = clauses;
  } else {
    clauses.push({ level: 'national', status: 'published' });
    if (u.province) clauses.push({ level: 'province', province: u.province, status: 'published' });
    if (u.district) clauses.push({ level: 'district', district: u.district, status: 'published', ...(u.province ? { province: u.province } : {}) });
    if (u.sector) clauses.push({ level: 'local', sector: u.sector, status: 'published', ...(u.district ? { district: u.district } : {}), ...(u.province ? { province: u.province } : {}) });
    filter.$or = clauses;
  }

  if (status && isStaffPortal(u)) filter.status = status;
  if (level) filter.level = level;
  if (search) filter.$text = { $search: String(search) };

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const [items, total] = await Promise.all([
    Announcement.find(filter).populate('authorId', 'fullName portal').sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Announcement.countDocuments(filter),
  ]);
  data(res, { items, total, page: safePage, pages: Math.ceil(total / safeLimit) });
}));

router.post('/announcements', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const levelByRole = { sector: 'local', district: 'district', province: 'province', rab: 'national' };
  const level = levelByRole[req.user.portal];
  const { title, body, priority = 'normal', status = 'draft' } = req.body;
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: 'Announcement title and content are required.' });
  if (!['draft', 'published'].includes(status)) return res.status(400).json({ message: 'Invalid initial announcement status.' });
  if (!['normal', 'high', 'urgent'].includes(priority)) return res.status(400).json({ message: 'Invalid announcement priority.' });
  
  const announcementData = {
    authorId: req.user._id,
    title: title.trim(),
    body: body.trim(),
    level,
    province: req.user.province,
    district: req.user.district,
    sector: req.user.sector || req.user.regionScope,
    priority,
    status
  };
  
  if (status === 'published') {
    announcementData.publishedAt = new Date();
  }
  
  data(res, await Announcement.create(announcementData), 201);
}));

router.get('/announcements/:id', auth, asyncRoute(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id).populate('authorId', 'fullName portal').lean();
  if (!announcement || !canViewAnnouncement(req.user, announcement)) return hide(res);
  data(res, announcement);
}));

router.patch('/announcements/:id', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return hide(res);
  
  // Only author or higher authority can edit
  if (!canManageAnnouncement(req.user, announcement)) {
    return res.status(403).json({ message: 'You can only manage announcements authored by you or within your assigned region.' });
  }
  
  const { title, body, priority, status } = req.body;
  const updates = {};
  
  if (title?.trim()) updates.title = title.trim();
  if (body?.trim()) updates.body = body.trim();
  if (priority) updates.priority = priority;
  // Level is auto-derived from user's portal role and cannot be changed
  
  // Handle status changes
  if (status && !['draft', 'published', 'archived'].includes(status)) {
    return res.status(400).json({ message: 'Invalid announcement status.' });
  }
  if (priority && !['normal', 'high', 'urgent'].includes(priority)) {
    return res.status(400).json({ message: 'Invalid announcement priority.' });
  }
  if (status && status !== announcement.status) {
    updates.status = status;
    if (status === 'published' && !announcement.publishedAt) {
      updates.publishedAt = new Date();
    }
    if (status === 'archived') {
      updates.archivedAt = new Date();
    }
  }
  
  const updated = await Announcement.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('authorId', 'fullName portal');
  data(res, updated);
}));

router.delete('/announcements/:id', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return hide(res);
  
  if (!canManageAnnouncement(req.user, announcement)) {
    return res.status(403).json({ message: 'You can only manage announcements authored by you or within your assigned region.' });
  }
  
  await Announcement.findByIdAndDelete(req.params.id);
  data(res, { deleted: true });
}));

router.post('/announcements/:id/publish', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return hide(res);
  
  if (!canManageAnnouncement(req.user, announcement)) {
    return res.status(403).json({ message: 'You can only manage announcements authored by you or within your assigned region.' });
  }
  
  announcement.status = 'published';
  announcement.publishedAt = new Date();
  await announcement.save();
  
  // Create notifications for recipients
  // (This would ideally be a background job)
  data(res, await announcement.populate('authorId', 'fullName portal'));
}));

router.post('/announcements/:id/archive', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return hide(res);
  
  if (!canManageAnnouncement(req.user, announcement)) {
    return res.status(403).json({ message: 'You can only manage announcements authored by you or within your assigned region.' });
  }
  
  announcement.status = 'archived';
  announcement.archivedAt = new Date();
  await announcement.save();
  
  data(res, await announcement.populate('authorId', 'fullName portal'));
}));
router.get('/notifications', auth, asyncRoute(async (req, res) => data(res, await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100))));
router.patch('/notifications/:id/read', auth, asyncRoute(async (req, res) => { const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: { readAt: new Date() } }, { new: true }); if (!item) return hide(res); data(res, item); }));
router.patch('/notifications/:id/unread', auth, asyncRoute(async (req, res) => { const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $unset: { readAt: 1 } }, { new: true }); if (!item) return hide(res); data(res, item); }));
router.delete('/notifications/:id', auth, asyncRoute(async (req, res) => { const item = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); if (!item) return hide(res); data(res, { deleted: true }); }));
router.post('/assistant', auth, roles('farmer', 'customer'), asyncRoute(async (req, res) => {
  const question = String(req.body.question || '').trim();
  if (!question || question.length > 4000) return res.status(400).json({ message: 'Enter a question of 1 to 4,000 characters.' });
  const priorTurns = await AssistantTurn.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(8).lean();
  const history = priorTurns.reverse().flatMap(turn => [
    { role: 'user', parts: [{ text: turn.question }] },
    { role: 'model', parts: [{ text: turn.answer }] },
  ]);
  const location = [req.user.sector, req.user.district, req.user.province, 'Rwanda'].filter(Boolean).join(', ');
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
  const request = model => ai.models.generateContent({
    model,
    contents: [...history, { role: 'user', parts: [{ text: question }] }],
    config: {
      systemInstruction: `You are AHub, a patient agriculture and farming educator for farmers and agricultural customers. Answer questions about crop production, soil, irrigation, pests and disease, livestock, poultry, post-harvest handling, markets, farm planning, and agricultural loans. Give clear, practical, step-by-step guidance suited to Rwanda when relevant. Match the user's language (English, Kinyarwanda, or French). Use the farmer's region when relevant: ${location || 'Rwanda'}. Use the user's saved crops and livestock as context: ${(req.user.enterpriseIds || []).join(', ') || 'not specified'}. Keep the conversation as a continuing learning session and refer to prior turns when useful. Be honest when details are uncertain; never invent government loan terms, prices, or programs. For pesticide, veterinary medicine, or vaccination dosing, do not guess a dose: advise checking the product label and consulting a qualified sector veterinary or agriculture officer. Structure useful answers with short headings or steps.`,
      thinkingConfig: { thinkingLevel: 'LOW' },
      temperature: 0.45,
      maxOutputTokens: 1200,
    },
  });
  let model = primaryModel;
  let response;
  try {
    response = await request(primaryModel);
  } catch (error) {
    logGeminiError(primaryModel, error);
    if (!isTimeoutError(error)) return res.status(error.status || 502).json({ message: 'AHub is not available right now. Please try again later.' });
    model = fallbackModel;
    try {
      response = await request(fallbackModel);
    } catch (fallbackError) {
      logGeminiError(fallbackModel, fallbackError);
      return res.status(fallbackError.status || 502).json({ message: 'AHub is not available right now. Please try again later.' });
    }
  }
  const answer = String(response.text || '').trim();
  if (!answer) return res.status(502).json({ message: 'AHub is not available right now. Please try again later.' });
  console.info('Gemini response generated', { model });
  const turn = await AssistantTurn.create({ userId: req.user._id, question, answer, topic: /loan|credit|finance/i.test(question) ? 'loan' : 'agriculture' });
  data(res, turn, 201);
}));
router.get('/assistant/history', auth, roles('farmer', 'customer'), asyncRoute(async (req, res) => data(res, await AssistantTurn.find({ userId: req.user._id }).sort({ createdAt: 1 }))));
router.delete('/assistant/history', auth, roles('farmer', 'customer'), asyncRoute(async (req, res) => {
  await AssistantTurn.deleteMany({ userId: req.user._id });
  data(res, { message: 'Chat history cleared' });
}));
router.get('/weather', auth, roles('farmer', 'sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const requested = String(req.query.sector || '').trim();
  const user = req.user;
  if (user.portal === 'farmer' && requested && requested.toLowerCase() !== sector(user).toLowerCase()) return res.status(403).json({ message: 'Farmers can only view their assigned sector forecast.' });
  let locationParts;
  if (user.portal === 'farmer' || user.portal === 'sector') locationParts = [sector(user), user.district, user.province, 'Rwanda'];
  else if (user.portal === 'district') {
    if (requested) {
      const inScope = await User.exists({ portal: 'farmer', district: user.district, sector: requested });
      if (!inScope) return res.status(403).json({ message: 'That sector is outside your assigned district.' });
      locationParts = [requested, user.district, user.province, 'Rwanda'];
    } else locationParts = [user.district, user.province, 'Rwanda'];
  } else if (user.portal === 'province') {
    if (requested) {
      const inScope = await User.exists({ portal: 'farmer', province: user.province, sector: requested });
      if (!inScope) return res.status(403).json({ message: 'That sector is outside your assigned province.' });
      const farmer = await User.findOne({ portal: 'farmer', province: user.province, sector: requested }).select('district').lean();
      locationParts = [requested, farmer?.district, user.province, 'Rwanda'];
    } else locationParts = [user.province, 'Rwanda'];
  } else locationParts = requested ? [requested, 'Rwanda'] : ['Rwanda'];
  try {
    const forecast = await getFourDayForecast(locationParts);
    data(res, forecast);
  } catch (error) {
    console.error('Open-Meteo request failed', { message: error.message, causeCode: error.cause?.code, causeMessage: error.cause?.message });
    res.status(error.status || 503).json({ message: error.status === 404 ? error.message : 'Weather provider is temporarily unavailable. Please retry shortly.' });
  }
}));
router.get('/dashboard', auth, roles('sector', 'district', 'province', 'rab'), asyncRoute(async (req, res) => {
  const farmerFilter = { portal: 'farmer', status: 'active' };
  if (req.user.portal === 'sector') farmerFilter.sector = sector(req.user);
  if (req.user.portal === 'district') farmerFilter.district = req.user.district;
  if (req.user.portal === 'province') farmerFilter.province = req.user.province;
  if (req.query.sector && ['district', 'province', 'rab'].includes(req.user.portal)) farmerFilter.sector = String(req.query.sector);
  if (req.query.district && ['province', 'rab'].includes(req.user.portal)) farmerFilter.district = String(req.query.district);
  if (req.query.province && req.user.portal === 'rab') farmerFilter.province = String(req.query.province);
  const farmers = await User.find(farmerFilter).select('fullName province district sector enterpriseIds').lean();
  const ids = farmers.map(f => f._id);
  const taskFilter = { farmerId: { $in: ids } };
  if (req.user.portal === 'sector') taskFilter.sectorId = sector(req.user);
  if (req.query.status && ['assigned', 'submitted', 'approved', 'returned'].includes(String(req.query.status))) taskFilter.status = String(req.query.status);
  if (req.query.enterprise) taskFilter.enterprise = { $regex: String(req.query.enterprise).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (req.query.from || req.query.to) taskFilter.createdAt = { ...(req.query.from ? { $gte: new Date(req.query.from) } : {}), ...(req.query.to ? { $lte: new Date(req.query.to) } : {}) };
  const [tasks, problems, visits, plots, attempts] = await Promise.all([
    FieldTask.find(taskFilter).populate('farmerId', 'fullName sector district province').sort({ dueAt: 1 }).lean(),
    Problem.find({ farmerId: { $in: ids } }).populate('farmerId', 'fullName sector district province').lean(),
    Visit.find({ farmerId: { $in: ids } }).populate('farmerId', 'fullName sector district province').lean(),
    Plot.aggregate([{ $match: { farmerId: { $in: ids } } }, { $group: { _id: '$enterprise', count: { $sum: 1 } } }]),
    ExamAttempt.find({ farmerId: { $in: ids }, status: { $in: ['submitted', 'graded'] } }).lean(),
  ]);
  const examIds = [...new Set(attempts.map(a => String(a.examId)))];
  const exams = await Exam.find({ _id: { $in: examIds } }).select('title resultsReleased resultRelease closeAt').lean();
  const examById = new Map(exams.map(e => [String(e._id), e]));
  const examResults = attempts.filter(a => { const e = examById.get(String(a.examId)); return e && (e.resultsReleased || e.resultRelease === 'immediate' || (e.resultRelease === 'after_close_date' && e.closeAt && Date.now() >= new Date(e.closeAt).getTime()) || (e.resultRelease === 'after_marking' && a.status === 'graded')); }).map(a => ({ examTitle: examById.get(String(a.examId))?.title, farmerName: farmers.find(f => String(f._id) === String(a.farmerId))?.fullName, score: a.percentage, status: a.status, sector: a.sectorId }));
  const grouped = new Map();
  for (const farmer of farmers) {
    const key = req.user.portal === 'sector' ? String(farmer._id) : req.user.portal === 'district' ? farmer.sector : farmer.district;
    if (!key) continue;
    const label = req.user.portal === 'sector' ? farmer.fullName : key;
    if (!grouped.has(key)) grouped.set(key, { name: label, region: key, score: 0, taskCount: 0, problemsSolved: 0 });
    const row = grouped.get(key);
    row.score += tasks.filter(t => String(t.farmerId?._id || t.farmerId) === String(farmer._id) && t.status === 'approved').length;
    row.taskCount += tasks.filter(t => String(t.farmerId?._id || t.farmerId) === String(farmer._id)).length;
    row.problemsSolved += problems.filter(p => String(p.farmerId?._id || p.farmerId) === String(farmer._id) && p.status === 'solved').length;
  }
  const ranking = [...grouped.values()].map(row => ({ ...row, completionRate: row.taskCount ? Math.round(row.score / row.taskCount * 100) : 0 })).sort((a, b) => b.score - a.score || b.completionRate - a.completionRate).slice(0, 20);
  const metrics = { farmers: farmers.length, tasksCompleted: tasks.filter(t => t.status === 'approved').length, problemsSolved: problems.filter(p => p.status === 'solved').length, problemsPending: problems.filter(p => p.status !== 'solved').length, visitsPending: visits.filter(v => v.status === 'pending').length };
  data(res, { farmers, tasks, problems, visits, enterprises: plots, examResults, ranking, metrics });
}));

router.post('/guides/generate', auth, roles('farmer'), asyncRoute(async (req, res) => {
  const { unitId, unitData } = req.body;
  if (!unitId || !unitData) {
    return res.status(400).json({ message: 'Unit ID and unit data are required.' });
  }

  const plot = await Plot.findOne({ _id: unitId, farmerId: req.user._id });
  if (!plot) {
    return res.status(404).json({ message: 'Plot not found.' });
  }

  try {
    const guide = await generateGuideBook(unitData, req.user);
    data(res, { guide }, 201);
  } catch (error) {
    console.error('Guide generation failed:', error);
    res.status(500).json({ message: 'Failed to generate guide. Please try again.' });
  }
}));

// Auto-delete soldout products after 5 days
async function cleanupSoldoutProducts() {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const result = await Product.deleteMany({
      status: 'soldout',
      soldoutAt: { $lt: fiveDaysAgo },
    });
    if (result.deletedCount > 0) {
      console.log(`Auto-deleted ${result.deletedCount} soldout products older than 5 days`);
    }
  } catch (error) {
    console.error('Cleanup soldout products failed:', error);
  }
}

// Run cleanup every day at midnight
setInterval(cleanupSoldoutProducts, 24 * 60 * 60 * 1000);

export default router;
