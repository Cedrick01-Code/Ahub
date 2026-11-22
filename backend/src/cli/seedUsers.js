import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const seedUsers = [
  {
    fullName: 'RAB Administrator',
    email: 'rab.admin@ahub.test',
    phone: '+250788000001',
    password: 'RabAdmin@2026',
    portal: 'rab',
    role: 'rab',
    status: 'active',
    regionScope: 'national',
    organization: 'RAB',
    position: 'National Administrator',
    parentApprovalRequired: true,
    mfaEnabled: true,
  },
  {
    fullName: 'NSG Security Officer',
    email: 'nsg.admin@ahub.test',
    phone: '+250788000002',
    password: 'NsgAdmin@2026',
    portal: 'nsg',
    role: 'nsg',
    status: 'active',
    regionScope: 'national',
    organization: 'NSG',
    position: 'Security Operations Lead',
    parentApprovalRequired: true,
    mfaEnabled: true,
  },
  {
    fullName: 'Province Veterinary Officer',
    email: 'province.vet@ahub.test',
    phone: '+250788000003',
    password: 'ProvinceVet@2026',
    portal: 'province',
    role: 'province',
    status: 'active',
    regionScope: 'Kigali',
    organization: 'Province Vet Office',
    position: 'Provincial Veterinary Officer',
    parentApprovalRequired: true,
    mfaEnabled: true,
  },
  {
    fullName: 'District Veterinary Officer',
    email: 'district.vet@ahub.test',
    phone: '+250788000004',
    password: 'DistrictVet@2026',
    portal: 'district',
    role: 'district',
    status: 'active',
    regionScope: 'Kigali City',
    organization: 'District Vet Office',
    position: 'District Veterinary Officer',
    parentApprovalRequired: true,
    mfaEnabled: true,
  },
  {
    fullName: 'Sector Veterinary Officer',
    email: 'sector.vet@ahub.test',
    phone: '+250788000005',
    password: 'SectorVet@2026',
    portal: 'sector',
    role: 'sector',
    status: 'active',
    regionScope: 'Kigali City',
    organization: 'Sector Vet Office',
    position: 'Sector Veterinary Officer',
    parentApprovalRequired: true,
    mfaEnabled: true,
  },
  {
    fullName: 'Farmer Demo User',
    email: 'farmer.ahub@ahub.test',
    phone: '+250788000006',
    password: 'Farmer@2026',
    portal: 'farmer',
    role: 'farmer',
    status: 'active',
    regionScope: 'Kigali City',
    organization: 'Farm Co-op',
    position: 'Farmer',
    parentApprovalRequired: true,
    mfaEnabled: false,
  },
  {
    fullName: 'Customer Demo User',
    email: 'customer.ahub@ahub.test',
    phone: '+250788000007',
    password: 'Customer@2026',
    portal: 'customer',
    role: 'customer',
    status: 'active',
    regionScope: 'Kigali City',
    organization: 'Retail Buyer',
    position: 'Customer',
    parentApprovalRequired: false,
    mfaEnabled: false,
  },
];

try {
  await connectDB();

  for (const userData of seedUsers) {
    const passwordHash = await bcrypt.hash(userData.password, 12);

    await User.findOneAndUpdate(
      { email: userData.email },
      {
        ...userData,
        passwordHash,
        tokenVersion: 0,
        lastLoginAt: null,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log('Seeded AHub test users successfully.');
  for (const user of seedUsers) {
    console.log(`${user.portal}: ${user.email} / ${user.password}`);
  }
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
