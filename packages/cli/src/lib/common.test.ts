import {describe, it, expect} from 'vitest';
import colors from '@shopify/cli-kit/node/colors';
import {
  createEnvironmentCliChoiceLabel,
  orderEnvironmentsBySafety,
} from './common.js';

describe('createEnvironmentCliChoiceLabel', () => {
  it('should return the name with the handle and branch in dim', () => {
    const results = createEnvironmentCliChoiceLabel(
      'fake env name',
      'fake-env-name',
      'fake-branch',
    );

    expect(results).toBe(
      `fake env name ${colors.dim(
        '(handle: fake-env-name, branch: fake-branch)',
      )}`,
    );
  });

  it('should return the name with the handle in dim', () => {
    const results = createEnvironmentCliChoiceLabel(
      'fake env name',
      'fake-env-name',
      null,
    );

    expect(results).toBe(
      `fake env name ${colors.dim('(handle: fake-env-name)')}`,
    );
  });
});

describe('orderEnvironmentsBySafety', () => {
  it('orders environments by safety', () => {
    const environments: Array<{type: 'PREVIEW' | 'PRODUCTION' | 'CUSTOM'}> = [
      {type: 'PRODUCTION'},
      {type: 'CUSTOM'},
      {type: 'CUSTOM'},
      {type: 'PREVIEW'},
      {type: 'CUSTOM'},
    ];

    const results = orderEnvironmentsBySafety(environments);

    expect(results).toEqual([
      {type: 'PREVIEW'},
      {type: 'CUSTOM'},
      {type: 'CUSTOM'},
      {type: 'CUSTOM'},
      {type: 'PRODUCTION'},
    ]);
  });
});
