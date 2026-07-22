import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneNumber, generateCustomerCode, getPhoneValidationError, normalizeUniqueValue } from './customers.utils.js';

test('normalizes phone and email values for duplicate checks', () => {
  assert.equal(normalizeUniqueValue(' +965 5123 4567 ', 'phone'), '+965 5123 4567');
  assert.equal(normalizeUniqueValue(' User@Example.com ', 'email'), 'user@example.com');
  assert.equal(normalizeUniqueValue('', 'phone'), null);
});

test('formats phone numbers in Kuwait style', () => {
  assert.equal(formatPhoneNumber('+965 5123 4567'), '+965 5123 4567');
  assert.equal(formatPhoneNumber('51234567'), '+965 5123 4567');
});

test('validates Kuwait mobile numbers', () => {
  assert.equal(getPhoneValidationError('+965 5123 4567'), null);
  assert.equal(getPhoneValidationError('+965 6123 4567'), null);
  assert.equal(getPhoneValidationError('+965 9123 4567'), null);
  assert.equal(getPhoneValidationError('+965 4123 4567'), 'Enter a valid Kuwait mobile number starting with 5, 6, or 9');
  assert.equal(getPhoneValidationError('+965 5123 456'), 'Enter a valid Kuwait mobile number starting with 5, 6, or 9');
});

test('generates sequential customer codes', () => {
  assert.equal(generateCustomerCode(0), 'CUST-001');
  assert.equal(generateCustomerCode(5), 'CUST-006');
});
