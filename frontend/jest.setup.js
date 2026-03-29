import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';

if (!global.crypto?.randomUUID) {
  global.crypto = webcrypto;
}
