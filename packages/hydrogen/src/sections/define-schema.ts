import type {SectionSchema} from './types.js';

/**
 * Validates a section schema and provides type safety for fields definitions
 */
export function defineSchema(schema: SectionSchema): void {
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
