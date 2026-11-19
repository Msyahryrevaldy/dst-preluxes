import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');

test('firestore.rules enforces global deny safety net and rules_version 2', () => {
  assert.match(rules, /rules_version = '2';/);
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
});

test('firestore.rules prevents self-assigned admin role escalation and enforces verified email', () => {
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /incoming\(\)\.role == 'customer'/);
  assert.match(rules, /incoming\(\)\.role == existing\(\)\.role/);
});

test('firestore.rules isolates PII and enforces owner queries on orders and payments', () => {
  assert.match(rules, /match \/orders\/\{orderId\}[\s\S]*resource\.data\.userId == request\.auth\.uid/);
  assert.match(rules, /match \/payments\/\{paymentId\}[\s\S]*resource\.data\.userId == request\.auth\.uid/);
  assert.match(rules, /incoming\(\)\.grandTotal == \(incoming\(\)\.subtotal - incoming\(\)\.discountAmount \+ incoming\(\)\.shippingAmount\)|data\.grandTotal == \(data\.subtotal - data\.discountAmount \+ data\.shippingAmount\)/);
  assert.match(rules, /match \/orders\/\{orderId\}[\s\S]*incoming\(\)\.paymentStatus in \['pending', 'failed', 'expired'\]/);
});

test('firestore.rules restricts product updates to admin or atomic unit reservation', () => {
  assert.match(rules, /incoming\(\)\.reservedQuantity == existing\(\)\.reservedQuantity \+ 1/);
  assert.match(rules, /incoming\(\)\.reservedQuantity <= existing\(\)\.quantity/);
});
