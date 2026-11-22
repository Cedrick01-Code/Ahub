import 'dotenv/config';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { ExamAttempt } from '../src/models/Learning.js';
import { encryptTotpSecret } from '../src/utils/totp.js';
import { getLastTestOtp } from '../src/services/whatsapp.js';

process.env.NODE_ENV = 'test';
process.env.WHATSAPP_ENABLED = 'true';

const secret = process.env.JWT_SECRET || 'ahub-dev-secret';
let server, baseUrl, sector, rab, farmer, teammate, otherFarmer, sectorToken, rabToken, farmerToken, teammateToken, otherFarmerToken;
const tokenFor = user => jwt.sign({ sub: String(user._id), portal: user.portal, role: user.role, tokenVersion: 0 }, secret, { expiresIn: '1h' });
const api = async (path, { token, method = 'GET', body, key } = {}) => {
  const response = await fetch(`${baseUrl}/api/learning${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
};
const authApi = async (path, body) => { const response = await fetch(`${baseUrl}/api/auth${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() }; };

before(async () => {
  const uri = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ahub'); uri.pathname = '/ahub_learning_test';
  await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 8000 });
  await mongoose.connection.dropDatabase();
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); baseUrl = `http://127.0.0.1:${server.address().port}`;
  sector = await User.create({ fullName: 'Sector Officer', email: 'sector@test.invalid', phone: '+250700000001', passwordHash: 'test', portal: 'sector', role: 'sector', status: 'active', province: 'North', district: 'Test', sector: 'Sector A', regionScope: 'Sector A', tokenVersion: 0 });
  rab = await User.create({ fullName: 'RAB Reviewer', email: 'rab@test.invalid', phone: '+250700000002', passwordHash: 'test', portal: 'rab', role: 'rab', status: 'active', regionScope: 'national', tokenVersion: 0 });
  farmer = await User.create({ fullName: 'Farmer A', email: 'farmer@test.invalid', phone: '+250700000003', passwordHash: 'test', portal: 'farmer', role: 'farmer', status: 'active', sector: 'Sector A', regionScope: 'Sector A', enterpriseIds: ['Maize'], tokenVersion: 0 });
  teammate = await User.create({ fullName: 'Farmer A2', email: 'farmer3@test.invalid', phone: '+250700000005', passwordHash: 'test', portal: 'farmer', role: 'farmer', status: 'active', sector: 'Sector A', regionScope: 'Sector A', enterpriseIds: ['Maize'], tokenVersion: 0 });
  otherFarmer = await User.create({ fullName: 'Farmer B', email: 'farmer2@test.invalid', phone: '+250700000004', passwordHash: 'test', portal: 'farmer', role: 'farmer', status: 'active', sector: 'Sector B', regionScope: 'Sector B', enterpriseIds: ['Maize'], tokenVersion: 0 });
  sectorToken = tokenFor(sector); rabToken = tokenFor(rab); farmerToken = tokenFor(farmer); teammateToken = tokenFor(teammate); otherFarmerToken = tokenFor(otherFarmer);
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

test('course drafts require RAB review and are sector scoped', async () => {
  const created = await api('/courses', { token: sectorToken, method: 'POST', body: { title: 'Maize pesticide safety', code: 'TEST-MAIZE', enterpriseIds: ['Maize'], lessons: [{ title: 'Safe handling', content: 'Follow approved pesticide labels.' }] } });
  assert.equal(created.status, 201); assert.equal(created.body.data.status, 'draft'); assert.equal(created.body.data.requiresExpertReview, true);
  const id = created.body.data._id; assert.equal((await api(`/courses/${id}`, { token: farmerToken })).status, 404);
  await api(`/courses/${id}/submit-review`, { token: sectorToken, method: 'POST', body: {} });
  assert.equal((await api(`/courses/${id}/review`, { token: rabToken, method: 'POST', body: { decision: 'approve' } })).status, 400);
  assert.equal((await api(`/courses/${id}/review`, { token: rabToken, method: 'POST', body: { decision: 'approve', expertApproval: true } })).status, 200);
  assert.equal((await api(`/courses/${id}`, { token: otherFarmerToken })).status, 404); assert.equal((await api(`/courses/${id}`, { token: farmerToken })).status, 200);
});

test('assignment delivery, receipt, submission, tracker, and grading work', async () => {
  const created = await api('/assignments', { token: sectorToken, method: 'POST', body: { title: 'Inspect maize', instructions: 'Describe leaves', enterpriseIds: ['Maize'], status: 'published', dueAt: new Date(Date.now() + 86400000).toISOString(), allowedTypes: ['text'], maxScore: 10 } });
  assert.equal(created.status, 201); const id = created.body.data._id;
  assert.equal((await api('/assignments', { token: farmerToken })).body.data.length, 1); assert.equal((await api('/assignments', { token: otherFarmerToken })).body.data.length, 0);
  assert.equal((await api(`/assignments/${id}/open`, { token: farmerToken, method: 'POST', body: {} })).status, 200);
  const submission = await api(`/assignments/${id}/submissions`, { token: farmerToken, method: 'POST', body: { text: 'No damage.' }, key: 'sub-once' });
  assert.equal(submission.status, 201); assert.equal((await api(`/assignments/${id}/submissions`, { token: farmerToken, method: 'POST', body: { text: 'Duplicate' }, key: 'sub-two' })).status, 409);
  const tracker = await api(`/assignments/${id}/tracker`, { token: sectorToken }); assert.equal(tracker.body.data.counts.opened, 1); assert.equal(tracker.body.data.counts.submitted, 1);
  assert.equal((await api(`/submissions/${submission.body.data._id}/grade`, { token: sectorToken, method: 'PATCH', body: { score: 11, maxScore: 10 } })).status, 400);
  assert.equal((await api(`/submissions/${submission.body.data._id}/grade`, { token: sectorToken, method: 'PATCH', body: { score: 8, maxScore: 10 } })).status, 200);
});

test('group submissions create linked member records and group grading updates both', async () => {
  const assignment = await api('/assignments', { token: sectorToken, method: 'POST', body: { title: 'Group plot check', enterpriseIds: ['Maize'], status: 'published', allowGroup: true, allowedTypes: ['text'] } });
  const result = await api(`/assignments/${assignment.body.data._id}/submissions`, { token: farmerToken, method: 'POST', body: { text: 'Shared field observation', memberIds: [String(teammate._id)] }, key: 'group-submit' });
  assert.equal(result.status, 201);
  const saved = await api('/submissions', { token: teammateToken }); assert.equal(saved.body.data.length, 1);
  assert.equal((await api(`/submissions/${result.body.data._id}/grade`, { token: sectorToken, method: 'PATCH', body: { score: 7, maxScore: 10, feedback: 'Reviewed as a group.' } })).status, 200);
  const after = await api('/submissions', { token: teammateToken }); assert.equal(after.body.data[0].score, 7); assert.equal(after.body.data[0].status, 'graded');
});

test('late policy and one returned resubmission are enforced', async () => {
  const rejected = await api('/assignments', { token: sectorToken, method: 'POST', body: { title: 'Closed late work', enterpriseIds: ['Maize'], status: 'published', dueAt: new Date(Date.now() - 86400000).toISOString(), closeAt: new Date(Date.now() + 86400000).toISOString(), latePolicy: 'reject' } });
  assert.equal((await api(`/assignments/${rejected.body.data._id}/submissions`, { token: farmerToken, method: 'POST', body: { text: 'Too late' }, key: 'late-no' })).status, 409);
  const assignment = await api('/assignments', { token: sectorToken, method: 'POST', body: { title: 'Revise field report', enterpriseIds: ['Maize'], status: 'published', dueAt: new Date(Date.now() - 86400000).toISOString(), closeAt: new Date(Date.now() + 86400000).toISOString(), latePolicy: 'accept', allowResubmission: true } });
  const first = await api(`/assignments/${assignment.body.data._id}/submissions`, { token: farmerToken, method: 'POST', body: { text: 'First version' }, key: 'rev-1' }); assert.equal(first.status, 201); assert.equal(first.body.data.late, true);
  assert.equal((await api(`/submissions/${first.body.data._id}/return`, { token: sectorToken, method: 'POST', body: { feedback: 'Add more details.' } })).status, 200);
  const second = await api(`/assignments/${assignment.body.data._id}/submissions`, { token: farmerToken, method: 'POST', body: { text: 'Revised version' }, key: 'rev-2' }); assert.equal(second.status, 200); assert.equal(second.body.data.version, 2);
  assert.equal((await api(`/submissions/${first.body.data._id}/return`, { token: sectorToken, method: 'POST', body: {} })).status, 404);
});

test('exam attempts hide keys, enforce attempts, and release results by policy', async () => {
  const exam = await api('/exams', { token: sectorToken, method: 'POST', body: { title: 'Practice quiz', status: 'draft', type: 'quiz', maxAttempts: 1, timeLimitMinutes: 10, resultRelease: 'manual_release', questions: [{ prompt: 'Best action?', type: 'single_choice', options: ['Follow label', 'Use extra'], answerKey: 'Follow label', marks: 2 }] } });
  assert.equal(exam.status, 201); assert.equal(JSON.stringify(exam.body).includes('answerKey'), false);
  const id = exam.body.data._id; assert.equal((await api(`/exams/${id}/submit-review`, { token: sectorToken, method: 'POST', body: {} })).status, 200); assert.equal((await api(`/exams/${id}/review`, { token: rabToken, method: 'POST', body: { decision: 'approve' } })).status, 200);
  const started = await api(`/exams/${id}/start`, { token: farmerToken, method: 'POST', body: {}, key: 'start-one' });
  assert.equal(started.status, 201); assert.equal(JSON.stringify(started.body).includes('answerKey'), false);
  const questionId = started.body.data.questions[0]._id;
  assert.equal((await api(`/attempts/${started.body.data.id}/answers`, { token: farmerToken, method: 'PUT', body: { answers: { [questionId]: 'Follow label' } } })).status, 200);
  const resumed = await api(`/exams/${id}/start`, { token: farmerToken, method: 'POST', body: {}, key: 'resume-attempt' }); assert.equal(resumed.body.resumed, true); assert.equal(resumed.body.data.answers[questionId], 'Follow label');
  const submitted = await api(`/attempts/${started.body.data.id}/submit`, { token: farmerToken, method: 'POST', body: {} }); assert.equal(submitted.status, 200); assert.equal(Object.hasOwn(submitted.body.data, 'score'), false);
  assert.equal((await api(`/exams/${id}/start`, { token: farmerToken, method: 'POST', body: {}, key: 'start-two' })).status, 409);
  assert.equal((await api(`/exams/${id}/release-results`, { token: sectorToken, method: 'POST', body: {} })).status, 200);
  assert.equal((await api('/attempts', { token: farmerToken })).body.data[0].score, 2);
});

test('expired exam attempts auto-submit the last saved answers on the next server request', async () => {
  const exam = await api('/exams', { token: sectorToken, method: 'POST', body: { title: 'Deadline test', status: 'draft', type: 'quiz', maxAttempts: 1, timeLimitMinutes: 5, resultRelease: 'immediate', questions: [{ prompt: 'Choose', type: 'single_choice', options: ['A', 'B'], answerKey: 'A', marks: 1 }] } });
  const examId = exam.body.data._id; await api(`/exams/${examId}/submit-review`, { token: sectorToken, method: 'POST', body: {} }); await api(`/exams/${examId}/review`, { token: rabToken, method: 'POST', body: { decision: 'approve' } });
  const started = await api(`/exams/${examId}/start`, { token: farmerToken, method: 'POST', body: {}, key: 'deadline-start' });
  const qid = started.body.data.questions[0]._id; await api(`/attempts/${started.body.data.id}/answers`, { token: farmerToken, method: 'PUT', body: { answers: { [qid]: 'A' } } });
  await ExamAttempt.updateOne({ _id: started.body.data.id }, { $set: { deadlineAt: new Date(Date.now() - 1000) } });
  const attempts = await api('/attempts', { token: farmerToken }); const expired = attempts.body.data.find(row => row.examId === examId);
  assert.equal(expired.status, 'graded'); assert.equal(expired.score, 1);
});

test('learning endpoints require active authentication', async () => { assert.equal((await api('/courses')).status, 401); });

test('enabled WhatsApp MFA sends a code and enforces a five-minute sign-in challenge', async () => {
  const user = await User.create({ fullName: 'MFA Farmer', email: 'mfa@test.invalid', phone: '+250700000006', passwordHash: await bcrypt.hash('GoodPass!2026', 4), portal: 'farmer', role: 'farmer', status: 'active', sector: 'Sector A', regionScope: 'Sector A', tokenVersion: 0 });
  const credentials = { role: 'farmer', email: user.email, password: 'GoodPass!2026' };
  const challenge = await authApi('/login', credentials); assert.equal(challenge.status, 200); assert.equal(challenge.body.mfaRequired, true); assert.equal(challenge.body.delivery, 'whatsapp'); assert.equal(challenge.body.expiresInSeconds, 300);
  const decoded = jwt.decode(challenge.body.challengeToken); assert.equal(decoded.exp - decoded.iat, 300);
  const code = getLastTestOtp(); assert.match(code, /^\d{6}$/);
  const verified = await authApi('/login/verify-mfa', { challengeToken: challenge.body.challengeToken, code }); assert.equal(verified.status, 200); assert.ok(verified.body.token);
  assert.equal((await authApi('/login/verify-mfa', { challengeToken: challenge.body.challengeToken, code })).status, 401);
});

test('WhatsApp MFA can be paused while the provider is being configured', async () => {
  const user = await User.create({ fullName: 'Paused MFA Farmer', email: 'paused-mfa@test.invalid', phone: '+250700000007', passwordHash: await bcrypt.hash('GoodPass!2026', 4), portal: 'farmer', role: 'farmer', status: 'active', sector: 'Sector A', regionScope: 'Sector A', tokenVersion: 0 });
  process.env.WHATSAPP_ENABLED = 'false';
  const login = await authApi('/login', { role: 'farmer', email: user.email, password: 'GoodPass!2026' });
  process.env.WHATSAPP_ENABLED = 'true';
  assert.equal(login.status, 200); assert.ok(login.body.token); assert.equal(login.body.mfaRequired, undefined);
});
