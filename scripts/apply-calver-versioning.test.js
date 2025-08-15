#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  parseVersion,
  formatVersion,
  getNextQuarter,
  calculateMajorVersion,
  calculateMinorVersion,
  calculatePatchVersion,
  getNextQuarterlyVersion,
  determineBumpType,
  extractRangeOperator,
  buildVersionRange,
  isValidCalverFormat,
  compareVersions,
  hasVersionRegression,
  isValidQuarter,
  hasQuarterMismatch,
} = require('./apply-calver-versioning');

describe('CalVer Version Tests', () => {
  describe('parseVersion', () => {
    test('parses standard CalVer version', () => {
      const result = parseVersion('2025.7.0');
      expect(result).toEqual({year: 2025, major: 7, minor: 0, patch: undefined});
    });

    test('parses CalVer with patch', () => {
      const result = parseVersion('2025.7.1.2');
      expect(result).toEqual({year: 2025, major: 7, minor: 1, patch: 2});
    });

    test('throws on invalid version', () => {
      expect(() => parseVersion('invalid')).toThrow('Invalid version format');
    });
  });

  describe('formatVersion', () => {
    test('formats without patch', () => {
      expect(formatVersion(2025, 7, 0)).toBe('2025.7.0');
    });

    test('formats with patch', () => {
      expect(formatVersion(2025, 7, 1, 2)).toBe('2025.7.1.2');
    });
  });

  describe('getNextQuarter', () => {
    test('progresses through quarters', () => {
      expect(getNextQuarter(0, 2025)).toEqual({quarter: 1, year: 2025});
      expect(getNextQuarter(1, 2025)).toEqual({quarter: 4, year: 2025});
      expect(getNextQuarter(4, 2025)).toEqual({quarter: 7, year: 2025});
      expect(getNextQuarter(7, 2025)).toEqual({quarter: 10, year: 2025});
      expect(getNextQuarter(10, 2025)).toEqual({quarter: 1, year: 2026});
    });

    test('handles non-quarter months', () => {
      expect(getNextQuarter(2, 2025)).toEqual({quarter: 4, year: 2025});
      expect(getNextQuarter(5, 2025)).toEqual({quarter: 7, year: 2025});
      expect(getNextQuarter(8, 2025)).toEqual({quarter: 10, year: 2025});
      expect(getNextQuarter(11, 2025)).toEqual({quarter: 1, year: 2026});
    });
  });

  describe('getNextQuarterlyVersion', () => {
    test('major bump progresses to next quarter', () => {
      expect(getNextQuarterlyVersion('2025.1.0', 'major')).toBe('2025.4.0');
      expect(getNextQuarterlyVersion('2025.4.0', 'major')).toBe('2025.7.0');
      expect(getNextQuarterlyVersion('2025.7.0', 'major')).toBe('2025.10.0');
      expect(getNextQuarterlyVersion('2025.10.0', 'major')).toBe('2026.1.0');
    });

    test('minor bump increments minor', () => {
      expect(getNextQuarterlyVersion('2025.7.0', 'minor')).toBe('2025.7.1');
      expect(getNextQuarterlyVersion('2025.7.5', 'minor')).toBe('2025.7.6');
    });

    test('patch bump adds patch segment', () => {
      expect(getNextQuarterlyVersion('2025.7.0', 'patch')).toBe('2025.7.0.1');
      expect(getNextQuarterlyVersion('2025.7.1', 'patch')).toBe('2025.7.1.1');
      expect(getNextQuarterlyVersion('2025.7.0.1', 'patch')).toBe('2025.7.0.2');
    });

    test('handles non-quarter starting points', () => {
      expect(getNextQuarterlyVersion('2025.2.0', 'major')).toBe('2025.4.0');
      expect(getNextQuarterlyVersion('2025.5.0', 'major')).toBe('2025.7.0');
      expect(getNextQuarterlyVersion('2025.8.0', 'major')).toBe('2025.10.0');
    });
  });

  describe('determineBumpType', () => {
    test('detects major bump', () => {
      expect(determineBumpType('2025.4.0', '2025.5.0')).toBe('major');
      expect(determineBumpType('2025.7.0', '2025.8.0')).toBe('major');
      expect(determineBumpType('2025.10.0', '2026.1.0')).toBe('major');
    });

    test('detects minor bump', () => {
      expect(determineBumpType('2025.7.0', '2025.7.1')).toBe('minor');
      expect(determineBumpType('2025.7.3', '2025.7.4')).toBe('minor');
    });

    test('detects patch bump for unchanged versions', () => {
      expect(determineBumpType('2025.7.0', '2025.7.0')).toBe('patch');
    });
  });

  describe('extractRangeOperator', () => {
    test('extracts common operators', () => {
      expect(extractRangeOperator('^1.2.3')).toBe('^');
      expect(extractRangeOperator('~1.2.3')).toBe('~');
      expect(extractRangeOperator('>=1.2.3')).toBe('>=');
      expect(extractRangeOperator('1.2.3')).toBe('');
    });
  });

  describe('buildVersionRange', () => {
    test('builds ranges with operators', () => {
      expect(buildVersionRange('^', '2025.7.0')).toBe('^2025.7.0');
      expect(buildVersionRange('~', '2025.7.0')).toBe('~2025.7.0');
      expect(buildVersionRange('', '2025.7.0')).toBe('2025.7.0');
    });
  });

  describe('Safeguard Functions', () => {
    describe('isValidCalverFormat', () => {
      test('validates correct formats', () => {
        expect(isValidCalverFormat('2025.7.0')).toBe(true);
        expect(isValidCalverFormat('2025.10.5')).toBe(true);
        expect(isValidCalverFormat('2025.7.0.1')).toBe(true);
      });

      test('rejects invalid formats', () => {
        expect(isValidCalverFormat('2025.13.0')).toBe(false);
        expect(isValidCalverFormat('invalid')).toBe(false);
        expect(isValidCalverFormat('1.2.3')).toBe(false);
      });
    });

    describe('compareVersions', () => {
      test('compares versions correctly', () => {
        expect(compareVersions('2025.7.0', '2025.4.0')).toBeGreaterThan(0);
        expect(compareVersions('2025.4.0', '2025.7.0')).toBeLessThan(0);
        expect(compareVersions('2025.7.0', '2025.7.0')).toBe(0);
        expect(compareVersions('2025.7.1', '2025.7.0')).toBeGreaterThan(0);
        expect(compareVersions('2026.1.0', '2025.10.0')).toBeGreaterThan(0);
      });
    });

    describe('hasVersionRegression', () => {
      test('detects regression', () => {
        expect(hasVersionRegression('2025.7.0', '2025.4.0')).toBe(true);
        expect(hasVersionRegression('2025.4.0', '2025.7.0')).toBe(false);
        expect(hasVersionRegression('2025.7.0', '2025.7.0')).toBe(false);
      });
    });

    describe('isValidQuarter', () => {
      test('validates quarters', () => {
        expect(isValidQuarter(1)).toBe(true);
        expect(isValidQuarter(4)).toBe(true);
        expect(isValidQuarter(7)).toBe(true);
        expect(isValidQuarter(10)).toBe(true);
        expect(isValidQuarter(2)).toBe(false);
        expect(isValidQuarter(5)).toBe(false);
      });
    });

    describe('hasQuarterMismatch', () => {
      test('detects quarter mismatches for major bumps', () => {
        expect(hasQuarterMismatch('2025.5.0', 'major')).toBe(true);
        expect(hasQuarterMismatch('2025.4.0', 'major')).toBe(false);
        expect(hasQuarterMismatch('2025.7.0', 'major')).toBe(false);
      });

      test('allows any version for minor/patch', () => {
        expect(hasQuarterMismatch('2025.5.1', 'minor')).toBe(false);
        expect(hasQuarterMismatch('2025.8.0', 'patch')).toBe(false);
      });
    });
  });
});