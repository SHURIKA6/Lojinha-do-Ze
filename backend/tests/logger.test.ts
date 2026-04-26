/* eslint-disable no-console */
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { logger, sanitizeObject } from '../src/core/utils/logger';

describe('Logger', () => {
  let consoleOutput: any[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  beforeEach(() => {
    consoleOutput = [];
    console.log = (...args: any[]) => consoleOutput.push({ type: 'log', args });
    console.warn = (...args: any[]) => consoleOutput.push({ type: 'warn', args });
    console.error = (...args: any[]) => consoleOutput.push({ type: 'error', args });
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  describe('sanitizeObject', () => {
    it('should mask sensitive fields', () => {
      const input = {
        password: 'secret123',
        email: 'user@example.com',
        name: 'John',
      };

      const result = sanitizeObject(input) as any;

      expect(result.password).toBe('se****23');
      expect(result.email).toBe('us****om');
      expect(result.name).toBe('John');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          password: 'secret',
          name: 'John',
        },
      };

      const result = sanitizeObject(input) as any;

      expect(result.user.password).toBe('se****et');
      expect(result.user.name).toBe('John');
    });

    it('should handle arrays', () => {
      const input = [{ password: 'secret' }, { name: 'John' }];

      const result = sanitizeObject(input) as any;

      expect(result[0].password).toBe('se****et');
      expect(result[1].name).toBe('John');
    });

    it('should return non-objects as-is', () => {
      expect(sanitizeObject(null)).toBeNull();
      expect(sanitizeObject(undefined)).toBeUndefined();
      expect(sanitizeObject('string')).toBe('string');
      expect(sanitizeObject(123)).toBe(123);
    });

    it('should mask short values completely', () => {
      const input = { code: 'ab' };
      const result = sanitizeObject(input) as any;
      expect(result.code).toBe('****');
    });
  });

  describe('Log Output Format', () => {
    it('should output JSON with timestamp for info', () => {
      logger.info('Test message', { key: 'value' });

      expect(consoleOutput.length).toBe(1);
      const parsed = JSON.parse(consoleOutput[0].args[0]);

      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.context).toEqual({ key: 'value' });
    });

    it('should output JSON with timestamp for warn', () => {
      logger.warn('Warning message');

      expect(consoleOutput.length).toBe(1);
      const parsed = JSON.parse(consoleOutput[0].args[0]);

      expect(parsed.level).toBe('warn');
      expect(parsed.message).toBe('Warning message');
    });

    it('should output JSON with error details', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { context: 'test' });

      expect(consoleOutput.length).toBe(1);
      const parsed = JSON.parse(consoleOutput[0].args[0]);

      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('Error occurred');
      expect(parsed.context.error.message).toBe('Test error');
      expect(parsed.context.error.stack).toBeDefined();
      expect(parsed.context.context).toBe('test');
    });

    it('should work without context', () => {
      logger.info('Simple message');

      const parsed = JSON.parse(consoleOutput[0].args[0]);
      expect(parsed.message).toBe('Simple message');
      expect(parsed.context).toBeUndefined();
    });
  });
});
