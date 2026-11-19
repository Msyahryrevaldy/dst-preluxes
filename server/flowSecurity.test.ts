import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidFlowProjectId,
  SlidingWindowRateLimiter,
  verifyBearerTokenConstantTime,
} from './flowSecurity.ts';

test('verifyBearerTokenConstantTime accepts exact matching Bearer secret and rejects mismatches/unset secret', () => {
  assert.equal(verifyBearerTokenConstantTime('Bearer top-secret-123', 'top-secret-123'), true);
  assert.equal(verifyBearerTokenConstantTime('Bearer wrong-secret-1', 'top-secret-123'), false);
  assert.equal(verifyBearerTokenConstantTime('Bearer short', 'top-secret-123'), false);
  assert.equal(verifyBearerTokenConstantTime('Basic top-secret-123', 'top-secret-123'), false);
  assert.equal(verifyBearerTokenConstantTime(undefined, 'top-secret-123'), false);
  assert.equal(verifyBearerTokenConstantTime('Bearer anything', undefined), false);
  assert.equal(verifyBearerTokenConstantTime('Bearer anything', '   '), false);
});

test('isValidFlowProjectId strictly matches expected Flow project ID', () => {
  const expected = '0803359d-dab1-41ef-b3bf-398167349e36';
  assert.equal(isValidFlowProjectId(expected, expected), true);
  assert.equal(isValidFlowProjectId('wrong-project-id', expected), false);
  assert.equal(isValidFlowProjectId(null, expected), false);
});

test('SlidingWindowRateLimiter enforces request limit within time window and resets after expiry', () => {
  const limiter = new SlidingWindowRateLimiter(3, 1000);
  assert.equal(limiter.check('1.2.3.4', 100).allowed, true);
  assert.equal(limiter.check('1.2.3.4', 200).allowed, true);
  assert.equal(limiter.check('1.2.3.4', 300).allowed, true);
  const blocked = limiter.check('1.2.3.4', 400);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  // After window expires
  assert.equal(limiter.check('1.2.3.4', 1200).allowed, true);
});
