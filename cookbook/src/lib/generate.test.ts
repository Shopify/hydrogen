import {describe, expect, it} from 'vitest';
import {Step, isSubstep} from './recipe';
import {compareSteps} from './generate';

describe('compareSteps with string step values', () => {
  it('should sort steps in numeric order, not lexicographic', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '10', name: 'Step 10', diffs: []},
      {type: 'PATCH', step: '2', name: 'Step 2', diffs: []},
      {type: 'PATCH', step: '1', name: 'Step 1', diffs: []},
      {type: 'PATCH', step: '20', name: 'Step 20', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted.map((s) => s.step)).toEqual(['1', '2', '10', '20']);
  });

  it('should sort substeps correctly within same main step', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '1.10', name: 'Step 1.10', diffs: []},
      {type: 'PATCH', step: '1.2', name: 'Step 1.2', diffs: []},
      {type: 'PATCH', step: '1.1', name: 'Step 1.1', diffs: []},
      {type: 'PATCH', step: '1.20', name: 'Step 1.20', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted.map((s) => s.step)).toEqual(['1.1', '1.2', '1.10', '1.20']);
  });

  it('should sort main steps before substeps of different main step', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '2', name: 'Step 2', diffs: []},
      {type: 'PATCH', step: '1.1', name: 'Step 1.1', diffs: []},
      {type: 'PATCH', step: '1', name: 'Step 1', diffs: []},
      {type: 'PATCH', step: '1.2', name: 'Step 1.2', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted.map((s) => s.step)).toEqual(['1', '1.1', '1.2', '2']);
  });

  it('should handle mixed single and double-digit steps', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '100', name: 'Step 100', diffs: []},
      {type: 'PATCH', step: '20', name: 'Step 20', diffs: []},
      {type: 'PATCH', step: '3', name: 'Step 3', diffs: []},
      {type: 'PATCH', step: '1', name: 'Step 1', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted.map((s) => s.step)).toEqual(['1', '3', '20', '100']);
  });

  it('should handle complex substep numbers', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '1.15', name: 'Step 1.15', diffs: []},
      {type: 'PATCH', step: '1.9', name: 'Step 1.9', diffs: []},
      {type: 'PATCH', step: '1.100', name: 'Step 1.100', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted.map((s) => s.step)).toEqual(['1.9', '1.15', '1.100']);
  });

  // Grouping feature: Multiple steps can share the same step number to organize
  // related changes together (e.g., modifying several files as part of "Step 1").
  // This test ensures sort maintains relative order for grouped steps.
  it('should maintain relative order of steps with same step number (grouping)', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '1', name: 'File C', diffs: []},
      {type: 'PATCH', step: '1', name: 'File A', diffs: []},
      {type: 'PATCH', step: '1', name: 'File B', diffs: []},
      {type: 'PATCH', step: '2', name: 'File D', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    const step1Items = sorted.filter((s) => s.step === '1');
    const step2Items = sorted.filter((s) => s.step === '2');

    expect(step1Items).toHaveLength(3);
    expect(step2Items).toHaveLength(1);

    expect(step1Items[0].name).toBe('File C');
    expect(step1Items[1].name).toBe('File A');
    expect(step1Items[2].name).toBe('File B');

    expect(sorted.indexOf(step2Items[0])).toBeGreaterThan(
      sorted.indexOf(step1Items[2]),
    );
  });

  it('should handle steps with leading zeros correctly (treat "01" as "1")', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '02', name: 'Step 02', diffs: []},
      {type: 'PATCH', step: '2', name: 'Step 2', diffs: []},
      {type: 'PATCH', step: '1', name: 'Step 1', diffs: []},
      {type: 'PATCH', step: '01', name: 'Step 01', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted[0].step).toBe('1');
    expect(sorted[1].step).toBe('01');
    expect(sorted[2].step).toBe('02');
    expect(sorted[3].step).toBe('2');
  });

  it('should maintain relative order for grouped steps with different types', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '1', name: 'Patch C', diffs: []},
      {type: 'NEW_FILE', step: '1', name: 'New File A', ingredients: []},
      {type: 'INFO', step: '1', name: 'Info B'},
      {type: 'PATCH', step: '2', name: 'Patch D', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted[0].name).toBe('Patch C');
    expect(sorted[1].name).toBe('New File A');
    expect(sorted[2].name).toBe('Info B');
    expect(sorted[3].name).toBe('Patch D');
  });

  it('should sort substeps with decimal precision correctly', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '1.10', name: 'Step 1.10', diffs: []},
      {type: 'PATCH', step: '1.2', name: 'Step 1.2', diffs: []},
      {type: 'PATCH', step: '1.1', name: 'Step 1.1', diffs: []},
      {type: 'PATCH', step: '1.20', name: 'Step 1.20', diffs: []},
      {type: 'PATCH', step: '1.3', name: 'Step 1.3', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted.map((s) => s.step)).toEqual(['1.1', '1.2', '1.3', '1.10', '1.20']);
  });
});

describe('isSubstep with string step values', () => {
  it('should return true for substeps', () => {
    const step: Step = {type: 'PATCH', step: '1.1', name: 'Substep', diffs: []};

    expect(isSubstep(step)).toBe(true);
  });

  it('should return false for main steps', () => {
    const step: Step = {type: 'PATCH', step: '1', name: 'Main step', diffs: []};

    expect(isSubstep(step)).toBe(false);
  });

  it('should handle multi-digit step numbers', () => {
    const mainStep: Step = {
      type: 'PATCH',
      step: '100',
      name: 'Step 100',
      diffs: [],
    };
    const subStep: Step = {
      type: 'PATCH',
      step: '100.5',
      name: 'Step 100.5',
      diffs: [],
    };

    expect(isSubstep(mainStep)).toBe(false);
    expect(isSubstep(subStep)).toBe(true);
  });
});
