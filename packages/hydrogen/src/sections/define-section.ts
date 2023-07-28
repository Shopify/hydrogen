import type {SectionSchema} from './types.js';

/**
 * Validates a section schema and generates a storefront `query` able
 * to fetch a metaobject entry for the given section schema via `metaobjectByHandle`
 */
export function defineSection(schema: SectionSchema): void {
  if (!schema) {
    throw new Error('No section schema provided');
  }
  if (!schema.name || typeof schema.name !== 'string') {
    throw new Error('Section schema must have a name');
  }

  if (!schema.type || typeof schema.type !== 'string') {
    throw new Error('Section schema must have a type');
  }

  if (!schema.fields || !schema.fields.length) {
    throw new Error('Section schema must have fields');
  }
}
