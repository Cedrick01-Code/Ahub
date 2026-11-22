import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const required = ['NSG_BOOTSTRAP_NAME', 'NSG_BOOTSTRAP_EMAIL', 'NSG_BOOTSTRAP_PHONE', 'NSG_BOOTSTRAP_PASSWORD'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(`Missing bootstrap environment values: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.NSG_BOOTSTRAP_PASSWORD.length < 12) {
  console.error('NSG_BOOTSTRAP_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

try {
  await connectDB();

  if (await User.exists({ portal: 'nsg' })) {
    throw new Error('An NSG account already exists; bootstrap is only for the first NSG administrator.');
  }

  await User.create({
    fullName: process.env.NSG_BOOTSTRAP_NAME,
    email: process.env.NSG_BOOTSTRAP_EMAIL,
    phone: process.env.NSG_BOOTSTRAP_PHONE,
    passwordHash: await bcrypt.hash(process.env.NSG_BOOTSTRAP_PASSWORD, 12),
    portal: 'nsg',
    role: 'nsg',
    status: 'active',
    mfaEnabled: true,
    regionScope: 'national',
  });

  console.log('Initial NSG administrator created. Remove the bootstrap environment values now.');
} catch (error) {
  console.error(`NSG bootstrap failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
