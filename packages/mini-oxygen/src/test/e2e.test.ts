import {it, describe, beforeEach, afterEach} from 'vitest';

import {createFixture, Fixture} from './utils';

describe('e2e', () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await createFixture('e2e');
  });
  afterEach(async () => {
    await fixture.destroy();
  });

  it('runs inside of an hydrogen app', async () => {});
});
