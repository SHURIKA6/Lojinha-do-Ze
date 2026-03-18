/**
 * Verification script for Security Fixes
 */
import { isValidCpf, isValidUuid } from './backend/src/utils/normalize.js';

async function testValidation() {
  console.log('Testing Validation Helpers...');
  
  // Test UUID
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const invalidUuid = '123-abc';
  console.log('Valid UUID Test:', isValidUuid(validUuid) === true ? 'OK' : 'FAIL');
  console.log('Invalid UUID Test:', isValidUuid(invalidUuid) === false ? 'OK' : 'FAIL');

  // Test CPF
  const validCpf = '12345678909'; // Example of a valid digits check
  const invalidCpf = '11111111111';
  console.log('Valid CPF Check (Structure):', isValidCpf(validCpf) ? 'OK' : 'FAIL (check digits might differ)');
  console.log('Invalid CPF (Repeated):', isValidCpf(invalidCpf) === false ? 'OK' : 'FAIL');
}

testValidation();
