import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TransformationError,
  ValidationError,
  safeTransform,
  handleTransformError,
  validateTransformResult,
  createErrorReport
} from './error-handler';

describe('Error Handler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TransformationError', () => {
    test('creates error with correct properties', () => {
      const originalError = new Error('Original error');
      const error = new TransformationError(
        'Transform failed',
        'test.ts',
        'transform',
        originalError
      );

      expect(error.message).toBe('Transform failed');
      expect(error.file).toBe('test.ts');
      expect(error.phase).toBe('transform');
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('TransformationError');
    });
  });

  describe('ValidationError', () => {
    test('creates error with details', () => {
      const error = new ValidationError(
        'Validation failed',
        'test.ts',
        { reason: 'Invalid syntax' }
      );

      expect(error.message).toBe('Validation failed');
      expect(error.file).toBe('test.ts');
      expect(error.details).toEqual({ reason: 'Invalid syntax' });
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('safeTransform', () => {
    test('returns result on success', () => {
      const fn = () => 'success';
      const result = safeTransform(fn, { path: 'test.ts', source: '' }, 'transform');
      
      expect(result).toBe('success');
    });

    test('returns null on recoverable error and logs', () => {
      const fn = () => { throw new Error('Cannot read prop of undefined'); };
      const result = safeTransform(fn, { path: 'test.ts', source: '' }, 'transform');
      
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Skipping transformation')
      );
    });

    test('throws on non-recoverable parse error', () => {
      const fn = () => { throw new Error('Parse error'); };
      
      expect(() => 
        safeTransform(fn, { path: 'test.ts', source: '' }, 'parse')
      ).toThrow(TransformationError);
    });
  });

  describe('validateTransformResult', () => {
    test('accepts undefined transformation', () => {
      expect(() => 
        validateTransformResult('original', undefined, 'test.ts')
      ).not.toThrow();
    });

    test('throws on empty result', () => {
      expect(() => 
        validateTransformResult('original', '  ', 'test.ts')
      ).toThrow(ValidationError);
    });

    test('warns on significant size reduction', () => {
      const original = 'x'.repeat(1000);
      const transformed = 'x'.repeat(400);
      
      validateTransformResult(original, transformed, 'test.ts');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('reduced by 60.0%')
      );
    });

    test('warns when exports are removed', () => {
      const original = 'export default function() {}\nexport { test }';
      const transformed = 'function test() {}';
      
      validateTransformResult(original, transformed, 'test.ts');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('All default exports removed')
      );
    });
  });

  describe('createErrorReport', () => {
    test('reports no errors', () => {
      const report = createErrorReport([]);
      expect(report).toContain('No errors encountered');
    });

    test('groups errors by phase', () => {
      const errors = [
        {
          file: 'a.ts',
          error: new Error('Parse error'),
          phase: 'parse' as const,
          recoverable: false
        },
        {
          file: 'b.ts',
          error: new Error('Transform error'),
          phase: 'transform' as const,
          recoverable: true
        },
        {
          file: 'c.ts',
          error: new Error('Another parse error'),
          phase: 'parse' as const,
          recoverable: false
        }
      ];

      const report = createErrorReport(errors);
      
      expect(report).toContain('Parse Phase Errors:');
      expect(report).toContain('Transform Phase Errors:');
      expect(report).toContain('Total errors: 3');
      expect(report).toContain('Fatal errors: 2');
      expect(report).toContain('Recoverable errors: 1');
    });
  });
});