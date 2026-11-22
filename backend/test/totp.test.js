import test from 'node:test';
import assert from 'node:assert/strict';
import { createTotpCode, verifyTotpCode, createTotpSecret, encryptTotpSecret, decryptTotpSecret } from '../src/utils/totp.js';

test('TOTP matches RFC 6238 SHA1 example and verifies a short time window', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(createTotpCode(secret, 1), '287082');
  assert.equal(verifyTotpCode(secret, '287082', 59000), 1);
  assert.equal(verifyTotpCode(secret, '000000', 59000), null);
});

test('TOTP secrets are random and encrypted at rest', () => {
  const first = createTotpSecret(); const second = createTotpSecret();
  assert.notEqual(first, second);
  const encrypted = encryptTotpSecret(first);
  assert.notEqual(encrypted, first);
  assert.equal(decryptTotpSecret(encrypted), first);
});
