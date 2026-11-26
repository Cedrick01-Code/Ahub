import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

import User from '../models/User.js';
import AccountRequest from '../models/AccountRequest.js';
import { PORTAL_RULES } from '../utils/portalRules.js';
import MfaChallenge from '../models/MfaChallenge.js';
import { sendWhatsAppOtp, whatsappStatus } from '../services/whatsapp.js';

const router = express.Router();

const tokenSecret = process.env.JWT_SECRET;
if (!tokenSecret || tokenSecret.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters before the auth routes are loaded.');
}
const tokenExpiry = process.env.JWT_EXPIRES_IN || '7d';

const isOfficialRole = (portal) => !!PORTAL_RULES[portal] && PORTAL_RULES[portal].isOfficial;

const makeAccessCode = () => `AHUB-${randomBytes(4).toString('hex').toUpperCase()}`;

const getAuthenticatedUser = async (req) => {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  try {
    const payload = jwt.verify(token, tokenSecret);
    const tokenVersion = Number.isInteger(payload.tokenVersion) ? payload.tokenVersion : 0;
    const user = await User.findById(payload.sub);

    if (!user || user.status !== 'active') return null;
    if (Number(user.tokenVersion || 0) !== tokenVersion) return null;

    return user;
  } catch {
    return null;
  }
};

const requireAuth = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ message: 'A valid active session is required.' });
    req.authUser = user;
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Unable to verify the current session.' });
  }
};

const generateToken = (user) =>
  jwt.sign(
    {
      sub: user._id,
      portal: user.portal,
      role: user.role,
      fullName: user.fullName,
      tokenVersion: Number(user.tokenVersion || 0),
    },
    tokenSecret,
    { expiresIn: tokenExpiry }
  );

const respondWithGenericAuthError = (res) =>
  res.status(401).json({ message: 'Invalid credentials or your account is not active.' });

const cleanText = (value) => typeof value === 'string' ? value.trim() : '';

router.get('/roles', (_req, res) => {
  res.json({
    portals: Object.entries(PORTAL_RULES).map(([key, value]) => ({
      key,
      label: value.label,
      requiresApproval: value.requiresApproval,
      requiresMfa: value.requiresMfa,
      isOfficial: value.isOfficial,
    })),
  });
});

router.post('/register', async (req, res) => {
  try {
    const {
      role,
      fullName,
      email,
      phone,
      password,
      regionScope,
      organization,
      position,
      province,
      district,
      sector,
    } = req.body;

    const portal = cleanText(role).toLowerCase();
    const normalizedEmail = cleanText(email).toLowerCase();
    const normalizedPhone = cleanText(phone);
    const normalizedName = cleanText(fullName);
    const normalizedPassword = typeof password === 'string' ? password : '';

    if (!PORTAL_RULES[portal]) {
      return res.status(400).json({ message: 'Unsupported portal role.' });
    }

    if (portal === 'nsg') {
      const actor = await getAuthenticatedUser(req);
      if (actor?.portal !== 'nsg') {
        return res.status(403).json({ message: 'Only an active NSG administrator can request another NSG account.' });
      }
    }

    if (!normalizedName || !normalizedEmail || !normalizedPhone) {
      return res.status(400).json({ message: 'Full name, email and phone are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    if (normalizedPhone.length < 7 || normalizedPhone.length > 24) {
      return res.status(400).json({ message: 'Enter a valid phone number.' });
    }

    if (normalizedPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const selectedProvince = cleanText(province);
    const selectedDistrict = cleanText(district);
    const selectedSector = cleanText(sector);
    const selectedRegionScope = cleanText(regionScope);
    const selectedParentRegionScope = cleanText(req.body.parentRegionScope);
    const selectedPosition = cleanText(position);

    if (['rab', 'province', 'district', 'sector', 'nsg'].includes(portal) && !selectedPosition) {
      return res.status(400).json({ message: 'Position / Role Title is required for official accounts.' });
    }
    if (portal === 'province' && (!selectedProvince || selectedRegionScope !== selectedProvince)) {
      return res.status(400).json({ message: 'Select a province and submit it as the account region.' });
    }
    if (portal === 'district' && (!selectedProvince || !selectedDistrict || selectedRegionScope !== selectedDistrict || selectedParentRegionScope !== selectedProvince)) {
      return res.status(400).json({ message: 'Select a province and district, and ensure the district belongs to that province.' });
    }
    if (portal === 'sector' && (!selectedProvince || !selectedDistrict || !selectedSector || selectedRegionScope !== selectedSector || selectedParentRegionScope !== selectedDistrict)) {
      return res.status(400).json({ message: 'Select a province, district, and sector, and ensure the sector belongs to that district.' });
    }
    if (portal === 'rab' && selectedRegionScope !== 'national') {
      return res.status(400).json({ message: 'RAB accounts must use the national region scope.' });
    }
    if (portal === 'farmer' && (!selectedDistrict || !selectedSector || selectedRegionScope !== selectedSector || selectedParentRegionScope !== selectedDistrict)) {
      return res.status(400).json({ message: 'Select a district and sector, and ensure the sector belongs to that district.' });
    }

    const userExists = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] });
    if (userExists) {
      return res.status(409).json({ message: 'A user with this email or phone already exists.' });
    }

    const requestExists = await AccountRequest.findOne({ email: normalizedEmail, portal });
    if (requestExists && requestExists.status === 'pending_approval') {
      return res.status(409).json({ message: 'A pending account request already exists for this user.' });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);

    const accountRequest = portal === 'farmer' ? null : await AccountRequest.create({
      fullName: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      organization: cleanText(organization),
      position: selectedPosition,
      province: selectedProvince,
      district: selectedDistrict,
      sector: selectedSector,
      portal,
      role: portal,
      regionScope: selectedRegionScope,
      parentPortal: PORTAL_RULES[portal]?.parentPortal || null,
      status: 'pending_approval',
      accessCodeHash: '',
      parentRegionScope: selectedParentRegionScope,
    });

    if (portal === 'customer') {
      const user = await User.create({
        fullName: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        portal,
        role: portal,
        status: 'active',
        regionScope: selectedRegionScope,
        organization: cleanText(organization),
        position: selectedPosition,
        province: selectedProvince,
        district: selectedDistrict,
        sector: selectedSector,
        customerType: req.body.customerType || '',
        parentApprovalRequired: false,
        tokenVersion: 0,
      });

      accountRequest.status = 'activated';
      await accountRequest.save();

      return res.status(201).json({
        message: 'Customer account created successfully.',
        userId: user._id,
        status: 'active',
      });
    }

    if (portal === 'farmer') {
      const user = await User.create({
        fullName: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        portal,
        role: portal,
        status: 'active',
        regionScope: selectedRegionScope,
        organization: cleanText(organization),
        position: selectedPosition,
        province: selectedProvince,
        district: selectedDistrict,
        sector: selectedSector,
        parentApprovalRequired: false,
        tokenVersion: 0,
      });

      return res.status(201).json({
        message: 'Farmer account created successfully.',
        userId: user._id,
        status: 'active',
      });
    }

    return res.status(201).json({
      message: 'Account request submitted to the parent authority for approval.',
      requestId: accountRequest._id,
      parentPortal: PORTAL_RULES[portal]?.parentPortal || null,
      status: 'pending_approval',
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Unable to create the account request.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.authUser;
    return res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        portal: user.portal,
        role: user.role,
        status: user.status,
        regionScope: user.regionScope,
      },
    });
  } catch (error) {
    console.error('Current user lookup error:', error);
    return res.status(500).json({ message: 'Unable to load the current user.' });
  }
});

router.post('/users/:userId/suspend', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const actor = req.authUser;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isSelfSuspend = String(actor._id) === String(targetUser._id);
    const isNsgOperator = actor.portal === 'nsg';

    if (!isSelfSuspend && !isNsgOperator) {
      return res.status(403).json({ message: 'Only NSG or the user can suspend this account.' });
    }

    targetUser.status = 'suspended';
    targetUser.tokenVersion = (Number(targetUser.tokenVersion || 0) + 1);
    await targetUser.save();

    return res.json({
      message: 'User account suspended and all active sessions were invalidated.',
      userId: targetUser._id,
      status: targetUser.status,
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    return res.status(500).json({ message: 'Unable to suspend the user account.' });
  }
});

router.get('/requests', requireAuth, async (req, res) => {
  try {
    const actor = req.authUser;
    const filter = actor.portal === 'nsg'
      ? {}
      : { parentPortal: actor.portal, status: 'pending_approval' };

    if (actor.portal !== 'nsg' && actor.regionScope) {
      filter.parentRegionScope = actor.regionScope;
    }

    const records = await AccountRequest.find(filter)
      .select('-accessCodeHash')
      .sort({ createdAt: 1 })
      .lean();

    const requests = records.map((request) => ({
      ...request,
      canApprove: request.parentPortal === actor.portal
        && request.status === 'pending_approval'
        && (!request.parentRegionScope || request.parentRegionScope === actor.regionScope),
      canIssueCode: request.parentPortal === actor.portal
        && request.status === 'approved'
        && (!request.parentRegionScope || request.parentRegionScope === actor.regionScope),
    }));

    return res.json({ requests });
  } catch (error) {
    console.error('List requests error:', error);
    return res.status(500).json({ message: 'Unable to load account requests.' });
  }
});

router.post('/approve-request', requireAuth, async (req, res) => {
  try {
    const { requestId, approved, reason } = req.body;
    const actor = req.authUser;

    const request = await AccountRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Account request not found.' });
    }

    const expectedParent = PORTAL_RULES[request.portal]?.parentPortal;
    if (actor.portal !== expectedParent) {
      return res.status(403).json({
        message: `Only the ${expectedParent} parent can approve this request.`,
      });
    }

    if (request.parentRegionScope && actor.regionScope !== request.parentRegionScope) {
      return res.status(403).json({ message: 'This request is outside your assigned region.' });
    }

    if (request.status !== 'pending_approval') {
      return res.status(409).json({ message: 'This account request has already been processed.' });
    }

    if (!approved) {
      request.status = 'rejected';
      request.rejectionReason = reason || 'Rejected by parent authority.';
      request.approverName = actor.fullName;
      request.approverUserId = actor._id;
      await request.save();
      return res.json({ message: 'Account request rejected.', status: 'rejected' });
    }

    const newAccessCode = makeAccessCode();
    request.status = 'approved';
    request.accessCodeHash = await bcrypt.hash(newAccessCode, 10);
    request.accessCodeExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    request.approverName = actor.fullName;
    request.approverUserId = actor._id;
    await request.save();

    return res.json({
      message: 'Request approved. Share the access code securely with the user.',
      status: 'approved',
      accessCode: newAccessCode,
      expiresAt: request.accessCodeExpiresAt,
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Unable to approve the account request.' });
  }
});

router.post('/requests/:requestId/access-code', requireAuth, async (req, res) => {
  try {
    const request = await AccountRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Account request not found.' });

    const actor = req.authUser;
    if (request.parentPortal !== actor.portal) {
      return res.status(403).json({ message: 'Only the assigned parent authority can issue this code.' });
    }
    if (request.parentRegionScope && request.parentRegionScope !== actor.regionScope) {
      return res.status(403).json({ message: 'This request is outside your assigned region.' });
    }
    if (request.status !== 'approved') {
      return res.status(409).json({ message: 'Only approved requests can receive an activation code.' });
    }

    const accessCode = makeAccessCode();
    request.accessCodeHash = await bcrypt.hash(accessCode, 10);
    request.accessCodeExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    request.approverName = actor.fullName;
    request.approverUserId = actor._id;
    await request.save();

    return res.json({
      message: 'New activation code issued. The previous code is invalid.',
      accessCode,
      expiresAt: request.accessCodeExpiresAt,
    });
  } catch (error) {
    console.error('Issue access code error:', error);
    return res.status(500).json({ message: 'Unable to issue an activation code.' });
  }
});

router.post('/activate', async (req, res) => {
  try {
    const { role, email, phone, accessCode, password } = req.body;
    const portal = String(role || '').toLowerCase();

    if (!portal || !PORTAL_RULES[portal]) {
      return res.status(400).json({ message: 'Portal role is required.' });
    }

    if (!password || !accessCode) {
      return res.status(400).json({ message: 'Password and access code are required.' });
    }

    const request = await AccountRequest.findOne({
      portal,
      status: 'approved',
      $or: [{ email: email || '' }, { phone: phone || '' }],
    }).sort({ createdAt: -1 });

    if (!request) {
      return res.status(404).json({ message: 'No approved request was found for this user.' });
    }

    if (!request.accessCodeExpiresAt || request.accessCodeExpiresAt <= new Date()) {
      return res.status(401).json({ message: 'The access code has expired. Ask the parent authority for a new code.' });
    }

    const accessCodeValid = await bcrypt.compare(accessCode, request.accessCodeHash);
    if (!accessCodeValid) {
      return res.status(401).json({ message: 'Invalid or expired access code.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const updatedUser = await User.findOneAndUpdate(
      { portal, $or: [{ email: request.email }, { phone: request.phone }] },
      {
        fullName: request.fullName,
        email: request.email,
        phone: request.phone,
        role: portal,
        portal,
        passwordHash,
        status: 'active',
        mfaEnabled: isOfficialRole(portal),
        regionScope: request.regionScope || '',
        organization: request.organization || '',
        position: request.position || '',
        province: request.province || '',
        district: request.district || '',
        sector: request.sector || '',
        parentApprovalRequired: PORTAL_RULES[portal]?.requiresApproval || false,
        tokenVersion: 0,
      },
      { upsert: true, new: true }
    );

    request.status = 'activated';
    await request.save();

    return res.json({
      message: 'Account activated. Sign in with your password and set up your authenticator app to continue.',
      portal,
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        portal: updatedUser.portal,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    console.error('Activate error:', error);
    res.status(500).json({ message: 'Account activation failed.' });
  }
});

const createMfaChallenge = async (user) => {
  const jti = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const otpHash = createHmac('sha256', tokenSecret).update(`${jti}:${code}`).digest('hex');
  await MfaChallenge.create({ jti, userId: user._id, expiresAt, otpHash });
  try {
    await sendWhatsAppOtp(user.phone, code, 5);
  } catch (error) {
    await MfaChallenge.deleteOne({ jti });
    throw error;
  }
  const challengeToken = jwt.sign({ sub: user._id, purpose: 'mfa_login', jti }, tokenSecret, { expiresIn: '5m' });
  return { mfaRequired: true, delivery: 'whatsapp', maskedPhone: `${user.phone.slice(0, 3)}••••${user.phone.slice(-3)}`, challengeToken, expiresInSeconds: 300 };
};

router.get('/whatsapp/status', (_req, res) => res.json(whatsappStatus()));

const completeLogin = async (user, res) => {
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  user.lastLoginAt = new Date();
  await user.save();
  const token = generateToken(user);
  return res.json({ message: 'Login successful.', token, user: { id: user._id, fullName: user.fullName, portal: user.portal, role: user.role } });
};

router.post('/login', async (req, res) => {
  try {
    const { role, email, phone, password } = req.body;
    const portal = String(role || '').toLowerCase();
    const contact = email || phone;

    if (!portal || !PORTAL_RULES[portal]) {
      return res.status(400).json({ message: 'Portal role is required.' });
    }

    if (!contact || !password) {
      return res.status(400).json({ message: 'Email/phone and password are required.' });
    }

    const user = await User.findOne({ portal, $or: [{ email: contact }, { phone: contact }] });
    if (!user) {
      return respondWithGenericAuthError(res);
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'This account is not active yet. Please activate it first.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return respondWithGenericAuthError(res);
    }

    if (process.env.WHATSAPP_ENABLED !== 'true') {
      return completeLogin(user, res);
    }

    return res.json(await createMfaChallenge(user));
  } catch (error) {
    console.error('Login error:', error);
    res.status(503).json({ message: error.message || 'Unable to process the login request.' });
  }
});

router.post('/login/verify-mfa', async (req, res) => {
  try {
    const payload = jwt.verify(String(req.body.challengeToken || ''), tokenSecret);
    if (payload.purpose !== 'mfa_login' || !payload.jti) return respondWithGenericAuthError(res);
    const challenge = await MfaChallenge.findOne({ jti: payload.jti, userId: payload.sub, consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } });
    const user = challenge && await User.findById(payload.sub);
    if (!challenge || !user || user.status !== 'active') return res.status(401).json({ message: 'The sign-in challenge expired. Enter your password again.' });
    const submittedHash = createHmac('sha256', tokenSecret).update(`${payload.jti}:${String(req.body.code || '')}`).digest();
    const expectedHash = Buffer.from(challenge.otpHash || '', 'hex');
    if (expectedHash.length !== submittedHash.length || !timingSafeEqual(expectedHash, submittedHash)) {
      await MfaChallenge.updateOne({ _id: challenge._id, consumedAt: null }, { $inc: { attempts: 1 } });
      return res.status(401).json({ message: 'Invalid or expired WhatsApp code.' });
    }
    const consumed = await MfaChallenge.findOneAndUpdate({ _id: challenge._id, consumedAt: null, expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } }, { new: true });
    if (!consumed) return res.status(401).json({ message: 'The sign-in challenge has already been used or expired.' });
    return completeLogin(user, res);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.status(401).json({ message: 'The sign-in challenge expired. Enter your password again.' });
    console.error('WhatsApp OTP verification error:', error);
    return res.status(500).json({ message: 'Unable to verify the WhatsApp code.' });
  }
});

export default router;
