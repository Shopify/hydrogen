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

describe('Edge cases', () => {
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
});
