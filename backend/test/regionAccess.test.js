import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessRegion, buildRegionFilter } from '../src/utils/regionAccess.js';

const farmer = { province: 'Southern', district: 'Huye', sector: 'Ngoma' };

test('RAB has national geographic visibility', () => {
  assert.equal(canAccessRegion({ portal: 'rab' }, farmer), true);
});

test('province access compares province, not sector', () => {
  assert.equal(canAccessRegion({ portal: 'province', province: 'Southern' }, farmer), true);
  assert.equal(canAccessRegion({ portal: 'province', province: 'Eastern' }, farmer), false);
});

test('district access validates district and parent province', () => {
  assert.equal(canAccessRegion({ portal: 'district', province: 'Southern', district: 'Huye' }, farmer), true);
  assert.equal(canAccessRegion({ portal: 'district', province: 'Eastern', district: 'Huye' }, farmer), false);
  assert.equal(canAccessRegion({ portal: 'district', province: 'Southern', district: 'Gisagara' }, farmer), false);
});

test('sector access validates sector and its parent geography', () => {
  assert.equal(canAccessRegion({ portal: 'sector', province: 'Southern', district: 'Huye', sector: 'Ngoma' }, farmer), true);
  assert.equal(canAccessRegion({ portal: 'sector', province: 'Southern', district: 'Huye', sector: 'Tumba' }, farmer), false);
  assert.equal(canAccessRegion({ portal: 'sector', province: 'Eastern', district: 'Huye', sector: 'Ngoma' }, farmer), false);
});

test('unassigned and non-government portals have no officer geographic access', () => {
  assert.equal(canAccessRegion({ portal: 'sector', sector: '' }, farmer), false);
  assert.equal(canAccessRegion({ portal: 'farmer' }, farmer), false);
});

test('region filters include parent geography to avoid same-name cross-region leakage', () => {
  assert.deepEqual(buildRegionFilter({ portal: 'sector', province: 'Southern', district: 'Huye', sector: 'Ngoma' }), {
    sector: 'Ngoma', district: 'Huye', province: 'Southern',
  });
});
