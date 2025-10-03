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

  it('should maintain insertion order for steps with same step number', () => {
    const steps: Step[] = [
      {type: 'PATCH', step: '1', name: 'File C', diffs: []},
      {type: 'PATCH', step: '1', name: 'File A', diffs: []},
      {type: 'PATCH', step: '1', name: 'File B', diffs: []},
      {type: 'PATCH', step: '2', name: 'File D', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(4);
    expect(sorted[0].name).toBe('File C');
    expect(sorted[1].name).toBe('File A');
    expect(sorted[2].name).toBe('File B');
    expect(sorted[3].name).toBe('File D');
  });

  it('should handle steps with leading zeros as numerically equivalent', () => {
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

  it('should handle mixed step types with same step number', () => {
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

  it('should handle multi-digit substep numbers', () => {
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

describe('Advanced grouping and edge cases', () => {
  it('should handle multiple separate groups with stable sort', () => {
    const steps: Step[] = [
      {step: '2', name: 'File2A', type: 'PATCH', diffs: []},
      {step: '1', name: 'File1B', type: 'PATCH', diffs: []},
      {step: '1', name: 'File1A', type: 'PATCH', diffs: []},
      {step: '2', name: 'File2B', type: 'PATCH', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(4);
    expect(sorted[0]).toMatchObject({step: '1', name: 'File1B'});
    expect(sorted[1]).toMatchObject({step: '1', name: 'File1A'});
    expect(sorted[2]).toMatchObject({step: '2', name: 'File2A'});
    expect(sorted[3]).toMatchObject({step: '2', name: 'File2B'});
  });

  it('should handle interleaved groups maintaining insertion order within groups', () => {
    const steps: Step[] = [
      {step: '1', name: 'File1A', type: 'PATCH', diffs: []},
      {step: '2', name: 'File2A', type: 'PATCH', diffs: []},
      {step: '1', name: 'File1B', type: 'PATCH', diffs: []},
      {step: '3', name: 'File3A', type: 'PATCH', diffs: []},
      {step: '2', name: 'File2B', type: 'PATCH', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(5);
    expect(sorted[0]).toMatchObject({step: '1', name: 'File1A'});
    expect(sorted[1]).toMatchObject({step: '1', name: 'File1B'});
    expect(sorted[2]).toMatchObject({step: '2', name: 'File2A'});
    expect(sorted[3]).toMatchObject({step: '2', name: 'File2B'});
    expect(sorted[4]).toMatchObject({step: '3', name: 'File3A'});
  });

  it('should sort interleaved main steps and substeps by numeric value', () => {
    const steps: Step[] = [
      {step: '1', name: 'MainA', type: 'PATCH', diffs: []},
      {step: '1.1', name: 'Sub1', type: 'PATCH', diffs: []},
      {step: '1', name: 'MainB', type: 'PATCH', diffs: []},
      {step: '1.2', name: 'Sub2', type: 'PATCH', diffs: []},
      {step: '1', name: 'MainC', type: 'PATCH', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(5);
    expect(sorted[0]).toMatchObject({step: '1', name: 'MainA'});
    expect(sorted[1]).toMatchObject({step: '1', name: 'MainB'});
    expect(sorted[2]).toMatchObject({step: '1', name: 'MainC'});
    expect(sorted[3]).toMatchObject({step: '1.1', name: 'Sub1'});
    expect(sorted[4]).toMatchObject({step: '1.2', name: 'Sub2'});
  });

  it('should handle multiple substeps with same step number', () => {
    const steps: Step[] = [
      {step: '1.1', name: 'SubA', type: 'PATCH', diffs: []},
      {step: '1.1', name: 'SubB', type: 'PATCH', diffs: []},
      {step: '1.2', name: 'SubC', type: 'PATCH', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(3);
    expect(sorted[0]).toMatchObject({step: '1.1', name: 'SubA'});
    expect(sorted[1]).toMatchObject({step: '1.1', name: 'SubB'});
    expect(sorted[2]).toMatchObject({step: '1.2', name: 'SubC'});
  });

  it('should treat explicit "1.0" as equivalent to "1"', () => {
    const steps: Step[] = [
      {step: '1.0', name: 'Explicit', type: 'PATCH', diffs: []},
      {step: '1', name: 'Implicit', type: 'PATCH', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(2);
    expect(sorted[0]).toMatchObject({step: '1.0', name: 'Explicit'});
    expect(sorted[1]).toMatchObject({step: '1', name: 'Implicit'});
  });

  it('should handle zero step numbers', () => {
    const steps: Step[] = [
      {step: '0', name: 'Zero', type: 'PATCH', diffs: []},
      {step: '1', name: 'One', type: 'PATCH', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(2);
    expect(sorted[0]).toMatchObject({step: '0', name: 'Zero'});
    expect(sorted[1]).toMatchObject({step: '1', name: 'One'});
  });

  it('should handle zero with substeps', () => {
    const steps: Step[] = [
      {step: '0.1', name: 'ZeroSub', type: 'PATCH', diffs: []},
      {step: '0', name: 'Zero', type: 'PATCH', diffs: []},
      {step: '1', name: 'One', type: 'PATCH', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(3);
    expect(sorted[0]).toMatchObject({step: '0', name: 'Zero'});
    expect(sorted[1]).toMatchObject({step: '0.1', name: 'ZeroSub'});
    expect(sorted[2]).toMatchObject({step: '1', name: 'One'});
  });

  it('should handle very large step numbers', () => {
    const steps: Step[] = [
      {step: '9999', name: 'VeryLarge', type: 'PATCH', diffs: []},
      {step: '1000', name: 'Large', type: 'PATCH', diffs: []},
      {step: '1', name: 'Small', type: 'PATCH', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(3);
    expect(sorted[0]).toMatchObject({step: '1', name: 'Small'});
    expect(sorted[1]).toMatchObject({step: '1000', name: 'Large'});
    expect(sorted[2]).toMatchObject({step: '9999', name: 'VeryLarge'});
  });

  it('should handle multiple files in same step number', () => {
    const steps: Step[] = [
      {step: '1', name: 'README.md', type: 'PATCH', diffs: []},
      {step: '1', name: 'app/root.tsx', type: 'PATCH', diffs: []},
      {step: '1', name: 'app/components/Header.tsx', type: 'PATCH', diffs: []},
      {step: '2', name: 'package.json', type: 'PATCH', diffs: []},
    ];

    const sorted = steps.sort(compareSteps);

    expect(sorted).toHaveLength(4);
    expect(sorted.map(s => s.name)).toEqual([
      'README.md',
      'app/root.tsx',
      'app/components/Header.tsx',
      'package.json'
    ]);
  });
});
