import {describe, it, expect} from 'vitest';
import {getCompatDate} from './compat-date';

describe('Compatibility dates', () => {
  it('gets the date from the lib version', () => {
    expect(getCompatDate()).toMatch(/^\d{4}-\d{2}-01$/);
  });
});
