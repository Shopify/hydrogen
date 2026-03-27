import {describe, expect, it} from 'vitest';
import {
  isCombinedListing,
  combinedListingsSettings,
  maybeFilterOutCombinedListingsQuery,
} from '../ingredients/templates/skeleton/app/lib/combined-listings';

describe('combined-listings recipe', () => {
  describe('combinedListingsSettings', () => {
    it('has expected default configuration', () => {
      expect(combinedListingsSettings).toEqual({
        redirectToFirstVariant: false,
        combinedListingTag: 'combined',
        hideCombinedListingsFromProductList: true,
      });
    });
  });

  describe('maybeFilterOutCombinedListingsQuery', () => {
    it('produces a filter query that excludes the combined tag', () => {
      expect(maybeFilterOutCombinedListingsQuery).toContain('NOT tag:');
      expect(maybeFilterOutCombinedListingsQuery).toContain(
        combinedListingsSettings.combinedListingTag,
      );
    });
  });

  describe('isCombinedListing', () => {
    it('returns true for a product with the combined tag', () => {
      const product = {tags: ['sale', 'combined', 'featured']};
      expect(isCombinedListing(product)).toBe(true);
    });

    it('returns false for a product without the combined tag', () => {
      const product = {tags: ['sale', 'featured']};
      expect(isCombinedListing(product)).toBe(false);
    });

    it('returns false for a product with an empty tags array', () => {
      const product = {tags: []};
      expect(isCombinedListing(product)).toBe(false);
    });

    it('returns false for null input', () => {
      expect(isCombinedListing(null)).toBe(false);
    });

    it('returns false for undefined input', () => {
      expect(isCombinedListing(undefined)).toBe(false);
    });

    it('returns false for an object without tags', () => {
      expect(isCombinedListing({title: 'Widget'})).toBe(false);
    });

    it('returns false for non-object input', () => {
      expect(isCombinedListing('combined')).toBe(false);
    });
  });
});
