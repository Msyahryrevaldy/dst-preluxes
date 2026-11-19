import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSiteUrl, rewriteBundledOrigin } from './preluxes.ts';

test('normalizeSiteUrl hanya menerima http(s) dan membuang path', () => {
  assert.equal(normalizeSiteUrl('https://preluxes.example.com/shop?x=1'), 'https://preluxes.example.com');
  assert.equal(normalizeSiteUrl(' http://localhost:3001/ '), 'http://localhost:3001');
  assert.throws(() => normalizeSiteUrl('file:///etc/passwd'));
  assert.throws(() => normalizeSiteUrl('javascript:alert(1)'));
  assert.throws(() => normalizeSiteUrl('bukan url'));
});

test('rewriteBundledOrigin mengganti origin biasa dan yang ter-encode', () => {
  const raw = JSON.stringify({
    a: 'http://localhost:3000/product/x',
    b: `https://wa.me/1?text=${encodeURIComponent('Link: http://localhost:3000/product/x')}`,
  });
  const out = rewriteBundledOrigin(raw, 'https://shop.example.com');
  assert.ok(!out.includes('localhost:3000'));
  assert.ok(!out.includes(encodeURIComponent('http://localhost:3000')));
  assert.ok(out.includes('https://shop.example.com/product/x'));
});
