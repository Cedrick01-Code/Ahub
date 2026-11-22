import express from 'express';
import jwt from 'jsonwebtoken';
import { randomInt, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { Assignment, AssignmentReceipt, Course, Exam, ExamAttempt, LearningAudit, LearningNotification, Submission, UploadAsset } from '../models/Learning.js';
import { inspectStoredObject, signObjectUrl } from '../services/objectStorage.js';

const router = express.Router();
const tokenSecret = process.env.JWT_SECRET || 'ahub-dev-secret';
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const validId = (id) => mongoose.isValidObjectId(id);
const isWithinSector = (user, sectorId) => Boolean(user.sector && user.sector === sectorId);
const requireAuth = asyncRoute(async (req, res, next) => {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'A valid active session is required.' });
  try {
    const payload = jwt.verify(token, tokenSecret);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active' || Number(user.tokenVersion || 0) !== Number(payload.tokenVersion || 0)) return res.status(401).json({ message: 'A valid active session is required.' });
    req.authUser = user;
    return next();
  } catch { return res.status(401).json({ message: 'A valid active session is required.' }); }
});
const requireRole = (...roles) => (req, res, next) => roles.includes(req.authUser.portal) ? next() : res.status(403).json({ message: 'This role cannot perform that action.' });
const idempotencyKey = (req) => String(req.get('Idempotency-Key') || req.body.idempotencyKey || '').slice(0, 128);
const hidden = (res) => res.status(404).json({ message: 'Not found.' });
const audit = (user, action, entityType, entityId, details = {}) => LearningAudit.create({ actorId: user._id, sectorId: user.sector || user.regionScope, action, entityType, entityId, details });
const shuffled = (items) => { const values = [...items]; for (let i = values.length - 1; i > 0; i -= 1) { const j = randomInt(i + 1); [values[i], values[j]] = [values[j], values[i]]; } return values; };
const publicQuestions = (questions) => questions.map(({ answerKey, tolerance, explanation, ...question }) => question);
export const finalizeAttempt = async (attempt) => {
  let score = 0;
  let hasManual = false;
  const answers = attempt.answers instanceof Map ? attempt.answers : new Map(Object.entries(attempt.answers || {}));
  for (const question of attempt.questionSnapshot) {
    const response = String(answers.get(String(question._id)) || '').trim();
    if (['long_answer', 'voice_answer', 'practical_checklist'].includes(question.type)) hasManual = true;
    else if (response && question.answerKey) {
      let correct = response.toLowerCase() === question.answerKey.trim().toLowerCase();
      if (question.type === 'numeric') { const given = Number(response); const expected = Number(question.answerKey); correct = Number.isFinite(given) && Number.isFinite(expected) && Math.abs(given - expected) <= Number(question.tolerance || 0); }
      if (correct) score += question.marks || 1;
    }
  }
  attempt.score = score;
  attempt.percentage = attempt.maxScore ? Math.round(score / attempt.maxScore * 100) : 0;
  attempt.status = hasManual ? 'submitted' : 'graded';
  attempt.submittedAt = new Date();
  attempt.receiptCode = attempt.receiptCode || randomUUID().slice(0, 8).toUpperCase();
  await attempt.save();
  return attempt;
};

router.get('/courses', requireAuth, requireRole('farmer', 'sector'), asyncRoute(async (req, res) => {
  const user = req.authUser;
  const filter = { status: 'published', $or: [{ scopeLevel: 'national' }, { ownerSectorId: user.sector }] };
  if (user.portal === 'sector') filter.$or = [{ scopeLevel: 'national' }, { ownerSectorId: user.sector || user.regionScope }];
  let courses = await Course.find(filter).sort({ title: 1 }).lean();
  if (user.portal === 'farmer') courses = courses.filter(c => !c.enterpriseIds.length || c.enterpriseIds.some(e => user.enterpriseIds?.includes(e)));
  res.json({ data: courses });
}));

router.get('/courses/:courseId', requireAuth, requireRole('farmer', 'sector'), asyncRoute(async (req, res) => {
  if (!validId(req.params.courseId)) return hidden(res);
  const user = req.authUser;
  const course = await Course.findOne({ _id: req.params.courseId, status: 'published', $or: [{ scopeLevel: 'national' }, { ownerSectorId: user.sector }] }).lean();
  if (!course || (user.portal === 'farmer' && course.enterpriseIds.length && !course.enterpriseIds.some(e => user.enterpriseIds?.includes(e)))) return hidden(res);
  res.json({ data: course });
}));

router.post('/courses', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  const { title, code, description = '', enterpriseIds = [], lessons = [], status = 'draft', requiresExpertReview = false, expertApprovedAt } = req.body;
  if (!title?.trim() || !code?.trim() || !Array.isArray(lessons) || !Array.isArray(enterpriseIds)) return res.status(400).json({ message: 'Title, code, lessons, and enterprise targets are required.' });
  const unsafe = /medicine|vaccin|pesticide|dose/i.test(`${title} ${description} ${lessons.map(l => `${l.title} ${l.content}`).join(' ')}`);
  const expertReview = Boolean(requiresExpertReview || unsafe);
  if (status !== 'draft') return res.status(400).json({ message: 'New courses must be saved as drafts and reviewed before publication.' });
  const course = await Course.create({ title: title.trim(), code: code.trim(), description, enterpriseIds, lessons, status: 'draft', requiresExpertReview: expertReview, ownerSectorId: req.authUser.sector || req.authUser.regionScope, regionPath: [req.authUser.province, req.authUser.district, req.authUser.sector].filter(Boolean), authorId: req.authUser._id });
  await audit(req.authUser, 'course_created', 'course', course._id, { status: course.status });
  res.status(201).json({ data: course });
}));

router.patch('/courses/:id', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const course = await Course.findOne({ _id: req.params.id, ownerSectorId: req.authUser.sector || req.authUser.regionScope, status: { $in: ['draft', 'in_review'] } });
  if (!course) return hidden(res);
  for (const field of ['title', 'description', 'enterpriseIds', 'lessons']) if (req.body[field] !== undefined) course[field] = req.body[field];
  const unsafe = /medicine|vaccin|pesticide|dose/i.test(`${course.title} ${course.description || ''} ${(course.lessons || []).map(l => `${l.title} ${l.content}`).join(' ')}`);
  course.requiresExpertReview = Boolean(course.requiresExpertReview || unsafe);
  await course.save();
  await audit(req.authUser, 'course_updated', 'course', course._id);
  res.json({ data: course });
}));

router.post('/courses/:id/submit-review', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const course = await Course.findOneAndUpdate({ _id: req.params.id, ownerSectorId: req.authUser.sector || req.authUser.regionScope, status: 'draft' }, { $set: { status: 'in_review' } }, { new: true });
  if (!course) return hidden(res);
  await audit(req.authUser, 'course_submitted_for_review', 'course', course._id);
  res.json({ data: course });
}));

router.post('/courses/:id/review', requireAuth, requireRole('rab'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const course = await Course.findOne({ _id: req.params.id, status: 'in_review' });
  if (!course) return hidden(res);
  if (req.body.decision === 'approve') {
    if (course.requiresExpertReview && req.body.expertApproval !== true) return res.status(400).json({ message: 'Expert approval must be recorded for sensitive content.' });
    course.status = 'published';
    course.expertApprovedAt = course.requiresExpertReview ? new Date() : course.expertApprovedAt;
  } else if (req.body.decision === 'return') course.status = 'draft';
  else return res.status(400).json({ message: 'Decision must be approve or return.' });
  await course.save();
  await audit(req.authUser, `course_${req.body.decision}d`, 'course', course._id, { expertApproval: req.body.expertApproval === true });
  res.json({ data: course });
}));

router.get('/review-queue', requireAuth, requireRole('rab'), asyncRoute(async (_req, res) => {
  const [courses, exams] = await Promise.all([
    Course.find({ status: 'in_review' }).select('code title description enterpriseIds requiresExpertReview ownerSectorId createdAt').sort({ createdAt: 1 }).lean(),
    Exam.find({ status: 'in_review' }).select('title type enterpriseIds ownerSectorId questions.prompt questions.type questions.marks createdAt').sort({ createdAt: 1 }).lean(),
  ]);
  res.json({ data: { courses, exams } });
}));

router.post('/assignments', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  const { title, instructions = '', enterpriseIds = [], targetFarmerIds = [], dueAt, closeAt, allowedTypes = ['text'], status = 'draft', forceAssigned = false, allowGroup = false, allowResubmission = false, latePolicy = 'accept', maxScore = 100 } = req.body;
  if (!title?.trim() || !Array.isArray(enterpriseIds) || !Array.isArray(targetFarmerIds) || !Array.isArray(allowedTypes)) return res.status(400).json({ message: 'Valid title and assignment targets are required.' });
  if (forceAssigned && targetFarmerIds.length) {
    const count = await User.countDocuments({ _id: { $in: targetFarmerIds }, portal: 'farmer', status: 'active', sector: req.authUser.sector });
    if (count !== new Set(targetFarmerIds.map(String)).size) return hidden(res);
  }
  const assignment = await Assignment.create({ title: title.trim(), instructions, enterpriseIds, targetFarmerIds, dueAt: dueAt || undefined, closeAt: closeAt || undefined, allowedTypes, status, forceAssigned, allowGroup, allowResubmission, latePolicy, maxScore, ownerSectorId: req.authUser.sector || req.authUser.regionScope, authorId: req.authUser._id });
  await audit(req.authUser, forceAssigned ? 'assignment_force_assigned' : 'assignment_created', 'assignment', assignment._id, { targetCount: targetFarmerIds.length, enterpriseIds });
  if (forceAssigned && targetFarmerIds.length) await LearningNotification.insertMany(targetFarmerIds.map(farmerId => ({ farmerId, sectorId: assignment.ownerSectorId, type: 'assignment_assigned', title: assignment.title, entityId: assignment._id })));
  res.status(201).json({ data: assignment });
}));

router.get('/assignments', requireAuth, requireRole('farmer', 'sector'), asyncRoute(async (req, res) => {
  const user = req.authUser;
  const sectorId = user.sector || user.regionScope;
  const filter = user.portal === 'farmer' ? { ownerSectorId: sectorId, status: 'published', $or: [{ enterpriseIds: { $size: 0 } }, { enterpriseIds: { $in: user.enterpriseIds || [] } }, { targetFarmerIds: user._id }] } : { ownerSectorId: sectorId };
  const assignments = await Assignment.find(filter).sort({ dueAt: 1, createdAt: -1 }).lean();
  if (user.portal === 'farmer') {
    for (const assignment of assignments) await AssignmentReceipt.updateOne({ assignmentId: assignment._id, farmerId: user._id, sectorId }, { $setOnInsert: { receivedAt: new Date() } }, { upsert: true });
    const [receipts, submissions] = await Promise.all([AssignmentReceipt.find({ assignmentId: { $in: assignments.map(a => a._id) }, farmerId: user._id }).lean(), Submission.find({ assignmentId: { $in: assignments.map(a => a._id) }, farmerId: user._id }).select('assignmentId status submittedAt late score feedback').lean()]);
    const receiptMap = new Map(receipts.map(r => [String(r.assignmentId), r]));
    const submissionMap = new Map(submissions.map(s => [String(s.assignmentId), s]));
    return res.json({ data: assignments.map(item => ({ ...item, receipt: receiptMap.get(String(item._id)) || null, mySubmission: submissionMap.get(String(item._id)) || null })) });
  }
  res.json({ data: assignments });
}));

router.get('/notifications', requireAuth, requireRole('farmer'), asyncRoute(async (req, res) => {
  res.json({ data: await LearningNotification.find({ farmerId: req.authUser._id }).sort({ createdAt: -1 }).limit(50).lean() });
}));

router.post('/assignments/:id/open', requireAuth, requireRole('farmer'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const sectorId = req.authUser.sector;
  const assignment = await Assignment.findOne({ _id: req.params.id, ownerSectorId: sectorId, status: 'published', $or: [{ enterpriseIds: { $size: 0 } }, { enterpriseIds: { $in: req.authUser.enterpriseIds || [] } }, { targetFarmerIds: req.authUser._id }] });
  if (!assignment) return hidden(res);
  const receipt = await AssignmentReceipt.findOneAndUpdate({ assignmentId: assignment._id, farmerId: req.authUser._id, sectorId }, { $setOnInsert: { receivedAt: new Date() }, $set: { openedAt: new Date() }, $inc: { openCount: 1 } }, { upsert: true, new: true });
  res.json({ data: receipt });
}));

router.post('/assignments/:id/submissions', requireAuth, requireRole('farmer'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const assignment = await Assignment.findOne({ _id: req.params.id, ownerSectorId: req.authUser.sector, status: 'published', $or: [{ enterpriseIds: { $size: 0 } }, { enterpriseIds: { $in: req.authUser.enterpriseIds || [] } }, { targetFarmerIds: req.authUser._id }] });
  if (!assignment) return hidden(res);
  const key = idempotencyKey(req);
  if (!key) return res.status(400).json({ message: 'Idempotency-Key is required.' });
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  const files = Array.isArray(req.body.files) ? req.body.files : [];
  const validFiles = files.filter(file => file && typeof file.storageKey === 'string' && file.storageKey.length <= 512 && /^(image\/(jpeg|png|webp)|application\/.+|audio\/.+|video\/.+)$/.test(file.mimeType || '') && Number(file.size) > 0 && Number(file.size) <= 25 * 1024 * 1024 && /^[a-f0-9]{64}$/i.test(file.sha256 || ''));
  if ((!text || !assignment.allowedTypes.includes('text')) && (!validFiles.length || !assignment.allowedTypes.some(type => type !== 'text'))) return res.status(400).json({ message: 'A non-empty response using an allowed submission type is required.' });
  if (validFiles.length !== files.length) return res.status(400).json({ message: 'An attachment has invalid type, size, storage reference, or hash.' });
  const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
  if (memberIds.length && !assignment.allowGroup) return res.status(400).json({ message: 'This assignment does not allow group submissions.' });
  const members = [...new Set([String(req.authUser._id), ...memberIds.map(String)])];
  if (members.length > 1) {
    const count = await User.countDocuments({ _id: { $in: members }, portal: 'farmer', status: 'active', sector: req.authUser.sector });
    if (count !== members.length) return hidden(res);
  }
  const now = new Date();
  if (assignment.closeAt && now > assignment.closeAt) return res.status(409).json({ message: 'The assignment submission window is closed.' });
  if (assignment.dueAt && now > assignment.dueAt && assignment.latePolicy === 'reject') return res.status(409).json({ message: 'Late submissions are not accepted for this assignment.' });
  const prior = await Submission.findOne({ assignmentId: assignment._id, farmerId: req.authUser._id });
  if (prior) {
    if (prior.idempotencyKey === key) return res.json({ data: prior, replayed: true });
    if (prior.status !== 'returned' || !assignment.allowResubmission || prior.version >= 2) return res.status(409).json({ message: 'A submission already exists for this assignment.' });
    prior.text = text; prior.files = validFiles; prior.status = 'submitted'; prior.submittedAt = now; prior.late = Boolean(assignment.dueAt && now > assignment.dueAt); prior.version += 1; prior.idempotencyKey = key; await prior.save();
    return res.json({ data: prior, receipt: { id: prior._id, submittedAt: prior.submittedAt } });
  }
  try {
    const groupKey = members.length > 1 ? randomUUID() : undefined;
    const records = await Submission.create(members.map(farmerId => ({ assignmentId: assignment._id, farmerId, sectorId: req.authUser.sector, text, files: validFiles, groupKey, idempotencyKey: key, maxScore: assignment.maxScore, late: Boolean(assignment.dueAt && now > assignment.dueAt) })));
    const submission = records.find(record => String(record.farmerId) === String(req.authUser._id));
    if (groupKey) { const ids = records.map(record => record._id); await Submission.updateMany({ _id: { $in: ids } }, { $set: { linkedSubmissionIds: ids } }); }
    res.status(201).json({ data: submission, receipt: { id: submission._id, submittedAt: submission.submittedAt } });
  } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'A submission already exists for this assignment.' }); throw error; }
}));

router.get('/submissions', requireAuth, requireRole('farmer', 'sector'), asyncRoute(async (req, res) => {
  const filter = req.authUser.portal === 'farmer' ? { farmerId: req.authUser._id } : { sectorId: req.authUser.sector || req.authUser.regionScope };
  res.json({ data: await Submission.find(filter).sort({ submittedAt: -1 }).lean() });
}));

router.get('/assignments/:id/tracker', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const assignment = await Assignment.findOne({ _id: req.params.id, ownerSectorId: req.authUser.sector || req.authUser.regionScope }).lean();
  if (!assignment) return hidden(res);
  const rosterFilter = { portal: 'farmer', status: 'active', sector: assignment.ownerSectorId };
  if (assignment.targetFarmerIds.length) rosterFilter._id = { $in: assignment.targetFarmerIds };
  else if (assignment.enterpriseIds.length) rosterFilter.enterpriseIds = { $in: assignment.enterpriseIds };
  const farmers = await User.find(rosterFilter).select('fullName phone sector').lean();
  const receipts = await AssignmentReceipt.find({ assignmentId: assignment._id }).lean();
  const submissions = await Submission.find({ assignmentId: assignment._id }).select('farmerId submittedAt status late').lean();
  const receiptByFarmer = new Map(receipts.map(r => [String(r.farmerId), r]));
  const submissionByFarmer = new Map(submissions.map(s => [String(s.farmerId), s]));
  const roster = farmers.map(f => ({ farmerId: f._id, farmerName: f.fullName, receivedAt: receiptByFarmer.get(String(f._id))?.receivedAt || null, openedAt: receiptByFarmer.get(String(f._id))?.openedAt || null, openCount: receiptByFarmer.get(String(f._id))?.openCount || 0, submission: submissionByFarmer.get(String(f._id)) || null, overdue: Boolean(assignment.dueAt && new Date() > assignment.dueAt && !submissionByFarmer.has(String(f._id))) }));
  res.json({ data: { roster, counts: { targeted: roster.length, received: roster.filter(r => r.receivedAt).length, opened: roster.filter(r => r.openedAt).length, submitted: roster.filter(r => r.submission).length, overdue: roster.filter(r => r.overdue).length } } });
}));

router.patch('/submissions/:id/grade', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const { score, maxScore, feedback = '' } = req.body;
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) return res.status(400).json({ message: 'Score must be between zero and the maximum score.' });
  const submission = await Submission.findOne({ _id: req.params.id, sectorId: req.authUser.sector || req.authUser.regionScope, status: { $in: ['submitted', 'returned'] } });
  if (!submission) return hidden(res);
  const grade = { score, maxScore, feedback, status: 'graded', graderId: req.authUser._id, gradedAt: new Date() };
  if (submission.groupKey) await Submission.updateMany({ groupKey: submission.groupKey }, { $set: grade });
  else { Object.assign(submission, grade); await submission.save(); }
  await audit(req.authUser, 'submission_graded', 'submission', submission._id, { score, maxScore });
  res.json({ data: submission });
}));

router.post('/submissions/:id/return', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const submission = await Submission.findOne({ _id: req.params.id, sectorId: req.authUser.sector || req.authUser.regionScope, type: 'assignment', status: 'submitted' }).populate('assignmentId');
  if (!submission || !submission.assignmentId?.allowResubmission || submission.version >= 2) return hidden(res);
  submission.status = 'returned'; submission.feedback = String(req.body.feedback || 'Please revise and resubmit.');
  await submission.save();
  await audit(req.authUser, 'submission_returned', 'submission', submission._id);
  res.json({ data: submission });
}));

router.post('/exams', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  const { title, questions = [], status = 'draft', ...rest } = req.body;
  if (!title?.trim() || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ message: 'Exam title and at least one reviewed question are required.' });
  if (rest.type === 'final_exam' && (!Number(rest.maxAttempts) || Number(rest.maxAttempts) < 1)) return res.status(400).json({ message: 'Final exams need a positive attempt limit.' });
  if (Number(rest.maxAttempts) === 0 && (rest.type || 'quiz') !== 'quiz') return res.status(400).json({ message: 'Unlimited attempts are only allowed for quizzes.' });
  if (status !== 'draft') return res.status(400).json({ message: 'New exams must be saved as drafts and reviewed before publication.' });
  const exam = await Exam.create({ ...rest, title: title.trim(), questions, status: 'draft', ownerSectorId: req.authUser.sector || req.authUser.regionScope, authorId: req.authUser._id });
  await audit(req.authUser, 'exam_created', 'exam', exam._id, { status });
  res.status(201).json({ data: { ...exam.toObject(), questions: publicQuestions(questions) } });
}));

router.post('/exams/:id/submit-review', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const exam = await Exam.findOneAndUpdate({ _id: req.params.id, ownerSectorId: req.authUser.sector || req.authUser.regionScope, status: 'draft' }, { $set: { status: 'in_review' } }, { new: true });
  if (!exam) return hidden(res);
  await audit(req.authUser, 'exam_submitted_for_review', 'exam', exam._id);
  res.json({ data: { id: exam._id, status: exam.status } });
}));

router.post('/exams/:id/review', requireAuth, requireRole('rab'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  if (!['approve', 'return'].includes(req.body.decision)) return res.status(400).json({ message: 'Decision must be approve or return.' });
  const exam = await Exam.findOneAndUpdate({ _id: req.params.id, status: 'in_review' }, { $set: { status: req.body.decision === 'approve' ? 'published' : 'draft' } }, { new: true });
  if (!exam) return hidden(res);
  await audit(req.authUser, `exam_${req.body.decision}d`, 'exam', exam._id);
  res.json({ data: { id: exam._id, status: exam.status } });
}));

router.get('/exams', requireAuth, requireRole('farmer', 'sector'), asyncRoute(async (req, res) => {
  const user = req.authUser;
  const now = new Date();
  const filter = user.portal === 'farmer' ? { ownerSectorId: user.sector, status: 'published', $and: [{ $or: [{ openAt: null }, { openAt: { $lte: now } }] }, { $or: [{ closeAt: null }, { closeAt: { $gte: now } }] }] } : { ownerSectorId: user.sector || user.regionScope };
  const exams = await Exam.find(filter).select('-questions.answerKey').lean();
  res.json({ data: exams });
}));

router.post('/exams/:id/start', requireAuth, requireRole('farmer'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const now = new Date();
  const exam = await Exam.findOne({ _id: req.params.id, ownerSectorId: req.authUser.sector, status: 'published', $and: [{ $or: [{ openAt: null }, { openAt: { $lte: now } }] }, { $or: [{ closeAt: null }, { closeAt: { $gte: now } }] }] }).lean();
  if (!exam) return hidden(res);
  const active = await ExamAttempt.findOne({ examId: exam._id, farmerId: req.authUser._id, status: 'in_progress' }).sort({ startedAt: -1 });
  if (active) {
    if (now >= active.deadlineAt) await finalizeAttempt(active);
    if (active.submittedAt) return res.json({ data: { id: active._id, status: active.status, submittedAt: active.submittedAt, receiptCode: active.receiptCode }, autoSubmitted: true });
    return res.json({ data: { id: active._id, deadlineAt: active.deadlineAt, status: active.status, answers: Object.fromEntries(active.answers || []), questions: publicQuestions(active.questionSnapshot) }, resumed: true });
  }
  const key = idempotencyKey(req);
  if (!key) return res.status(400).json({ message: 'Idempotency-Key is required.' });
  const replay = await ExamAttempt.findOne({ examId: exam._id, farmerId: req.authUser._id, idempotencyKey: key, status: 'in_progress' });
  if (replay) return res.json({ data: { id: replay._id, deadlineAt: replay.deadlineAt, status: replay.status, questions: publicQuestions(replay.questionSnapshot) }, replayed: true });
  const attempts = await ExamAttempt.countDocuments({ examId: exam._id, farmerId: req.authUser._id });
  if (exam.maxAttempts > 0 && attempts >= exam.maxAttempts) return res.status(409).json({ message: 'Maximum exam attempts reached.' });
  const deadlineAt = new Date(now.getTime() + exam.timeLimitMinutes * 60000);
  const questionSnapshot = (exam.shuffleQuestions ? shuffled(exam.questions) : exam.questions).map(q => ({ ...q, options: exam.shuffleOptions && q.options ? shuffled(q.options) : q.options }));
  const attempt = await ExamAttempt.create({ examId: exam._id, farmerId: req.authUser._id, sectorId: req.authUser.sector, deadlineAt, questionSnapshot, maxScore: questionSnapshot.reduce((sum, q) => sum + (q.marks || 1), 0), idempotencyKey: key });
  await audit(req.authUser, 'exam_attempt_started', 'exam_attempt', attempt._id, { examId: exam._id });
  res.status(201).json({ data: { id: attempt._id, deadlineAt: attempt.deadlineAt, status: attempt.status, questions: publicQuestions(questionSnapshot) } });
}));

router.put('/attempts/:id/answers', requireAuth, requireRole('farmer'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const attempt = await ExamAttempt.findOne({ _id: req.params.id, farmerId: req.authUser._id, status: 'in_progress' });
  if (!attempt) return hidden(res);
  if (new Date() >= attempt.deadlineAt) { await finalizeAttempt(attempt); return res.status(409).json({ message: 'The server deadline passed and the saved answers were auto-submitted.' }); }
  if (!req.body.answers || typeof req.body.answers !== 'object' || Array.isArray(req.body.answers)) return res.status(400).json({ message: 'Answers must be an object keyed by question ID.' });
  const validQuestionIds = new Set(attempt.questionSnapshot.map(q => String(q._id)));
  if (Object.keys(req.body.answers).some(id => !validQuestionIds.has(id))) return res.status(400).json({ message: 'Answers contain an unknown question.' });
  attempt.answers = new Map(Object.entries(req.body.answers).map(([k, v]) => [k, String(v)]));
  await attempt.save();
  res.json({ data: { id: attempt._id, savedAt: new Date(), deadlineAt: attempt.deadlineAt } });
}));

router.post('/attempts/:id/submit', requireAuth, requireRole('farmer'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const attempt = await ExamAttempt.findOne({ _id: req.params.id, farmerId: req.authUser._id });
  if (!attempt) return hidden(res);
  const exam = await Exam.findOne({ _id: attempt.examId, ownerSectorId: attempt.sectorId }).select('resultRelease resultsReleased closeAt').lean();
  if (!exam) return hidden(res);
  const scoreReleased = exam.resultsReleased || exam.resultRelease === 'immediate' || (exam.resultRelease === 'after_close_date' && exam.closeAt && Date.now() >= new Date(exam.closeAt).getTime());
  if (attempt.submittedAt) return res.json({ data: { id: attempt._id, status: attempt.status, submittedAt: attempt.submittedAt, receiptCode: attempt.receiptCode, ...(scoreReleased ? { score: attempt.score, percentage: attempt.percentage } : {}) }, replayed: true });
  await finalizeAttempt(attempt);
  await audit(req.authUser, 'exam_attempt_submitted', 'exam_attempt', attempt._id);
  res.json({ data: { id: attempt._id, status: attempt.status, submittedAt: attempt.submittedAt, receiptCode: attempt.receiptCode, ...(scoreReleased ? { score: attempt.score, percentage: attempt.percentage } : {}) } });
}));

router.get('/attempts', requireAuth, requireRole('farmer', 'sector'), asyncRoute(async (req, res) => {
  const filter = req.authUser.portal === 'farmer' ? { farmerId: req.authUser._id } : { sectorId: req.authUser.sector || req.authUser.regionScope };
  let attempts = await ExamAttempt.find(filter).sort({ startedAt: -1 });
  if (req.authUser.portal === 'farmer') {
    for (const attempt of attempts) if (attempt.status === 'in_progress' && Date.now() >= attempt.deadlineAt.getTime()) await finalizeAttempt(attempt);
    attempts = await ExamAttempt.find(filter).sort({ startedAt: -1 });
  }
  const released = [];
  for (const item of attempts) {
    const exam = await Exam.findOne({ _id: item.examId, ownerSectorId: item.sectorId }).select('title resultsReleased resultRelease closeAt').lean();
    const canSee = exam && (exam.resultsReleased || exam.resultRelease === 'immediate' || (exam.resultRelease === 'after_marking' && item.status === 'graded') || (exam.resultRelease === 'after_close_date' && exam.closeAt && Date.now() >= new Date(exam.closeAt).getTime()));
    const ownAttempt = req.authUser.portal === 'farmer';
    released.push({ id: item._id, examId: item.examId, examTitle: exam?.title || '', status: item.status, startedAt: item.startedAt, submittedAt: item.submittedAt, ...(ownAttempt && canSee ? { score: item.score, percentage: item.percentage } : {}), ...(req.authUser.portal === 'sector' ? { farmerId: item.farmerId, score: item.score, answers: item.answers } : {}) });
  }
  res.json({ data: released });
}));

router.patch('/attempts/:id/grade', requireAuth, requireRole('sector'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const attempt = await ExamAttempt.findOne({ _id: req.params.id, sectorId: req.authUser.sector || req.authUser.regionScope, status: 'submitted' });
  if (!attempt) return hidden(res);
  const score = Number(req.body.score);
  if (!Number.isFinite(score) || score < 0 || score > attempt.maxScore) return res.status(400).json({ message: 'Score must be within the attempt maximum.' });
  attempt.score = score; attempt.percentage = attempt.maxScore ? Math.round(score / attempt.maxScore * 100) : 0; attempt.status = 'graded'; await attempt.save();
  await audit(req.authUser, 'exam_attempt_graded', 'exam_attempt', attempt._id, { score });
  res.json({ data: attempt });
}));

router.post('/exams/:id/release-results', requireAuth, requireRole('sector', 'rab'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const scope = req.authUser.portal === 'rab' ? {} : { ownerSectorId: req.authUser.sector || req.authUser.regionScope };
  const existingExam = await Exam.findOne({ _id: req.params.id, ...scope });
  if (!existingExam) return hidden(res);
  const pendingManual = await ExamAttempt.exists({ examId: existingExam._id, status: 'submitted' });
  if (pendingManual) return res.status(409).json({ message: 'Mark all written and practical answers before releasing results.' });
  existingExam.resultsReleased = true;
  const exam = await existingExam.save();
  await audit(req.authUser, 'exam_results_released', 'exam', exam._id);
  res.json({ data: { id: exam._id, resultsReleased: exam.resultsReleased } });
}));

router.post('/practice-reports', requireAuth, requireRole('farmer'), asyncRoute(async (req, res) => {
  const { courseId, title, text = '', files = [] } = req.body;
  if (!validId(courseId) || !title?.trim() || (!String(text).trim() && (!Array.isArray(files) || !files.length))) return res.status(400).json({ message: 'Choose a course, add a title, and include text or an attachment.' });
  const course = await Course.findOne({ _id: courseId, status: 'published', $or: [{ scopeLevel: 'national' }, { ownerSectorId: req.authUser.sector }] });
  if (!course) return hidden(res);
  const report = await Submission.create({ type: 'practice_report', courseId, title: title.trim(), farmerId: req.authUser._id, sectorId: req.authUser.sector, text: String(text).trim(), files, maxScore: null, status: 'submitted', idempotencyKey: idempotencyKey(req) || undefined });
  await audit(req.authUser, 'practice_report_created', 'submission', report._id);
  res.status(201).json({ data: report, receipt: { id: report._id, submittedAt: report.submittedAt } });
}));

router.delete('/practice-reports/:id', requireAuth, requireRole('farmer'), asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return hidden(res);
  const report = await Submission.findOne({ _id: req.params.id, farmerId: req.authUser._id, type: 'practice_report' });
  if (!report) return hidden(res);
  if (report.status !== 'submitted') return res.status(409).json({ message: 'A marked practice report is retained for audit and cannot be deleted.' });
  report.status = 'withdrawn'; await report.save();
  await audit(req.authUser, 'practice_report_withdrawn', 'submission', report._id);
  res.json({ data: { id: report._id, status: report.status } });
}));

router.use((error, _req, res, _next) => {
  console.error('Learning API error:', error);
  res.status(500).json({ message: 'Learning request could not be completed.' });
});

export default router;
