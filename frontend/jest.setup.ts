import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';

// @ts-ignore
if (!global.crypto?.randomUUID) {
  // @ts-ignore
  global.crypto = webcrypto;
}
