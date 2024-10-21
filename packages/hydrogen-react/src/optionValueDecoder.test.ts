import {describe, expect, it} from 'vitest';
import {
  decodeEncodedVariant,
  isOptionValueCombinationInEncodedVariant,
} from './optionValueDecoder.js';

describe('isOptionValueCombinationInEncodedVariant', () => {
  it('returns true when target option values are present in encoded option values', () => {
    const MOCK_ENCODED_OPTION_VALUES = 'v1_0:0:0,,1:1:1,,2:2:2,,';

    expect(
      isOptionValueCombinationInEncodedVariant(
        [0, 0, 0],
        MOCK_ENCODED_OPTION_VALUES,
      ),
    ).toBe(true);
  });

  it('returns true when a partial target option value is present in encoded option values', () => {
    const MOCK_ENCODED_OPTION_VALUES = 'v1_0:0:0,,1:1:1,,2:2:2,,';

    expect(
      isOptionValueCombinationInEncodedVariant([0], MOCK_ENCODED_OPTION_VALUES),
    ).toBe(true);

    expect(
      isOptionValueCombinationInEncodedVariant(
        [2, 2],
        MOCK_ENCODED_OPTION_VALUES,
      ),
    ).toBe(true);
  });

  it('returns false when target option values are not present in encoded option values', () => {
    const MOCK_ENCODED_OPTION_VALUES = 'v1_0:0:0,,1:1:1,,2:2:2,,';

    expect(
      isOptionValueCombinationInEncodedVariant(
        [0, 0, 1],
        MOCK_ENCODED_OPTION_VALUES,
      ),
    ).toBe(false);
  });

  it('returns false if no target option values are passed', () => {
    const MOCK_ENCODED_OPTION_VALUES = 'v1_0:0:0,,1:1:1,,2:2:2,,';

    expect(
      isOptionValueCombinationInEncodedVariant([], MOCK_ENCODED_OPTION_VALUES),
    ).toBe(false);
  });
});

describe('decodeEncodedVariant', () => {
  describe('v1', () => {
    const VERSION_PREFIX = 'v1_';

    it('it correctly decodes a set of 1-dimensional arrays with no gaps in the number sequence', () => {
      expect(decodeEncodedVariant(`${VERSION_PREFIX}0-9`)).toStrictEqual([
        [0],
        [1],
        [2],
        [3],
        [4],
        [5],
        [6],
        [7],
        [8],
        [9],
      ]);
    });

    it('it correctly decodes a set of 1-dimensional arrays with gaps in the number sequence', () => {
      expect(
        decodeEncodedVariant(`${VERSION_PREFIX}0-2 4-6 8-9`),
      ).toStrictEqual([[0], [1], [2], [4], [5], [6], [8], [9]]);
    });

    it('it correctly decodes a set of 2-dimensional arrays with no gaps in the number sequence', () => {
      expect(
        decodeEncodedVariant(`${VERSION_PREFIX}0:0-2,1:0-2,2:0-2,`),
      ).toStrictEqual([
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
      ]);
    });

    it('it correctly decodes a set of 2-dimensional arrays with gaps in the number sequence', () => {
      expect(
        decodeEncodedVariant(`${VERSION_PREFIX}0:0-1,1:0 2,2:1-2,`),
      ).toStrictEqual([
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 2],
        [2, 1],
        [2, 2],
      ]);
    });

    it('it correctly decodes a set of 3-dimensional arrays with no gaps in the number sequence', () => {
      const output = generateCombinations(3, 3);
      expect(
        decodeEncodedVariant(
          `${VERSION_PREFIX}0:0:0-2,1:0-2,2:0-2,,1:0:0-2,1:0-2,2:0-2,,2:0:0-2,1:0-2,2:0-2,,`,
        ),
      ).toStrictEqual(output);
    });

    it('it correctly decodes a set of 3-dimensional arrays with gaps in the number sequence', () => {
      const output = generateCombinations(3, 3, [
        [1, 0, 1],
        [2, 2, 2],
        [0, 2, 2],
      ]);
      expect(
        decodeEncodedVariant(
          `${VERSION_PREFIX}0:0:0-2,1:0-2,2:0-1,,1:0:0 2,1:0-2,2:0-2,,2:0:0-2,1:0-2,2:0-1,`,
        ),
      ).toStrictEqual(output);
    });

    it('it correctly decodes a set of 4-dimensional arrays with no gaps in the number sequence', () => {
      const output = generateCombinations(4, 3);
      expect(
        decodeEncodedVariant(
          `${VERSION_PREFIX}"0:0:0:0-2,1:0-2,2:0-2,,1:0:0-2,1:0-2,2:0-2,,2:0:0-2,1:0-2,2:0-2,,,1:0:0:0-2,1:0-2,2:0-2,,1:0:0-2,1:0-2,2:0-2,,2:0:0-2,1:0-2,2:0-2,,,2:0:0:0-2,1:0-2,2:0-2,,1:0:0-2,1:0-2,2:0-2,,2:0:0-2,1:0-2,2:0-2,,,"`,
        ),
      ).toStrictEqual(output);
    });

    it('it correctly decodes a set of 4-dimensional arrays with gaps in the number sequence', () => {
      const output = generateCombinations(4, 3, [
        [1, 0, 1, 0],
        [2, 2, 2, 0],
        [0, 2, 2, 1],
      ]);
      expect(
        decodeEncodedVariant(
          `${VERSION_PREFIX}0:0:0:0-2,1:0-2,2:0-2,,1:0:0-2,1:0-2,2:0-2,,2:0:0-2,1:0-2,2:0 2,,,1:0:0:0-2,1:1-2,2:0-2,,1:0:0-2,1:0-2,2:0-2,,2:0:0-2,1:0-2,2:0-2,,,2:0:0:0-2,1:0-2,2:0-2,,1:0:0-2,1:0-2,2:0-2,,2:0:0-2,1:0-2,2:1-2,,,`,
        ),
      ).toStrictEqual(output);
    });
  });
});

// generate all possible option value combos of a given depth and width
function generateCombinations(
  depth: number,
  width: number,
  exclusions: number[][] = [],
): number[][] {
  const input: number[][] = [];

  function isInExclusions(array: number[]): boolean {
    return exclusions.some(
      (exclusion) =>
        exclusion.length === array.length &&
        exclusion.every((value, index) => value === array[index]),
    );
  }

  function generate(currentArray: number[]): void {
    if (currentArray.length === depth) {
      if (!isInExclusions(currentArray)) {
        input.push([...currentArray]);
      }
      return;
    }

    for (let i = 0; i < width; i++) {
      currentArray.push(i);
      generate(currentArray);
      currentArray.pop();
    }
  }

  generate([]);
  return input;
}
