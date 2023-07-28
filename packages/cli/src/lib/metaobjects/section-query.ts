import type {
  SectionField,
  SectionSchema,
  SectionQuery,
  ValidSectionSchema,
} from './types.js';
import {
  COLLECTION_FRAGMENT,
  MEDIA_IMAGE_FRAGMENT,
  METAOBJECT_FRAGMENT,
  PAGE_FRAGMENT,
  GENERIC_FILE_FRAGMENT,
  PRODUCT_FRAGMENT,
  REFERENCE_FRAGMENT,
  VARIANT_FRAGMENT,
} from '../graphql/storefront/metaobjects-fragments.js';

/**
 * Validates a section schema and generates a storefront `query` able
 * to fetch a metaobject entry for the given section schema via `metaobjectByHandle`
 */
export function generateQueryFromSectionSchema(schema: SectionSchema) {
  const validSchema = validateSectionSchema(schema);
  if (validSchema instanceof Error) {
    throw validSchema;
  }

  return createSectionQuery(validSchema);
}

/**
 * Runtime validation that a section schema has all the required fields
 * to create a metaobject definition
 */
function validateSectionSchema(
  schema: SectionSchema,
): Error | ValidSectionSchema {
  if (!schema) {
    return new Error('No section schema provided');
  }
  if (!schema.name || typeof schema.name !== 'string') {
    return new Error('Section schema must have a name');
  }

  if (!schema.type || typeof schema.type !== 'string') {
    return new Error('Section schema must have a type');
  }

  if (!schema.fields || !schema.fields.length) {
    return new Error('Section schema must have fields');
  }

  return schema as ValidSectionSchema;
}

/**
 * Generates a storefront `query` able to fetch a metaobject entry for the given section schema via `metaobject`
 * @param name - The name of the section
 * @param type - The type of the section
 * @param fields - The fields of the section
 * @param blocks - The blocks of the section
 * @returns `#graphql` query
 */
function createSectionQuery({
  name: _name,
  type: _type,
  fields: _fields,
  blocks: _blocks,
}: ValidSectionSchema) {
  // remove space characters from schema name
  const name = _name.replace(/\s/g, '');

  // TODO: query blocks
  const ___blocks = `
    field(key: "blocks") {
      ...BlocksReferencesFragment
    }
  `;

  // TODO: blocks
  // get the fields and fragments query parts for the schema and blocks
  const {fields, fragments, blocks} = getQueryElements({
    fields: _fields,
    blocks: _blocks,
  });

  const fragmentsArray = Array.from(fragments.values());
  const fragmentsString = fragmentsArray.join('\n');

  const queryResult = `#graphql
  query Section${name}($handle: String!) {
    section: metaobject(handle: { handle: $handle, type: "section_${_type}" }) {
      ...${name}
    }
  }
  ` as SectionQuery;

  const fragmentsResult = `#graphql
  fragment ${name} on Metaobject {
    id
    handle
    type
    ${fields.join('\n')}
    ${blocks}
  }
  ${fragmentsString}
` as SectionQuery;

  return {query: queryResult, fragments: fragmentsResult};
}

type QueryElements = {
  fragments: Map<string, string>;
  fields: Array<string>;
  blocks: string;
};

function getQueryElements({
  fields,
  blocks,
}: Pick<ValidSectionSchema, 'fields' | 'blocks'>): QueryElements {
  const elements = {
    fragments: new Map<string, string>(),
    fields: [],
    blocks: '',
  } as QueryElements;

  // map schema fields to metaobject fields
  return fields.reduce(toQueryElements, elements);
}

function toQueryElements(acc: QueryElements, field: SectionField) {
  if (!field) return acc;

  function fieldFragment(fragment: string) {
    if (!fragment) return '';
    return `${field.key}: field(key: "${field.key}") { ${fragment} }`;
  }

  const maxReferences = 8;

  switch (field.type) {
    case 'date':
    case 'list.date':
    case 'date_time':
    case 'list.date_time':
    case 'dimension':
    case 'list.dimension':
    case 'volume':
    case 'list.volume':
    case 'weight':
    case 'list.weight':
    case 'number_integer':
    case 'list.number_integer':
    case 'number_decimal':
    case 'list.number_decimal':
    case 'single_line_text_field':
    case 'list.single_line_text_field':
    case 'multi_line_text_field':
    case 'rich_text_field':
    case 'boolean':
    case 'color':
    case 'list.color':
    case 'rating':
    case 'list.rating':
    case 'url':
    case 'list.url':
    case 'money':
    case 'json':
      acc.fields.push(fieldFragment('value type'));
      return acc;

    // reference and list.reference fields
    case 'collection_reference':
      acc.fragments.set('COLLECTION_FRAGMENT', COLLECTION_FRAGMENT);
      acc.fields.push(
        fieldFragment('type reference { ...CollectionFragment }'),
      );
      return acc;
    case 'list.collection_reference':
      acc.fragments.set('COLLECTION_FRAGMENT', COLLECTION_FRAGMENT);
      acc.fields.push(
        fieldFragment(
          `type references(first: ${maxReferences}) { nodes { ...CollectionFragment } }`,
        ),
      );
      return acc;

    case 'file_reference':
      acc.fragments.set('MEDIA_IMAGE_FRAGMENT', MEDIA_IMAGE_FRAGMENT);
      acc.fields.push(
        fieldFragment('type reference { ...MediaImageFragment }'),
      );
      return acc;
    case 'list.file_reference':
      acc.fragments.set('MEDIA_IMAGE_FRAGMENT', MEDIA_IMAGE_FRAGMENT);
      acc.fields.push(
        fieldFragment(
          `type references(first: ${maxReferences}) { nodes { ...MediaImageFragment } }`,
        ),
      );
      return acc;

    case 'list.metaobject_reference':
      acc.fragments.set('METAOBJECT_FRAGMENT', METAOBJECT_FRAGMENT);
      acc.fields.push(
        fieldFragment(
          `type references(first: ${maxReferences}) { nodes { ...MetaobjectFragment } }`,
        ),
      );
      return acc;
    case 'metaobject_reference':
      acc.fragments.set('METAOBJECT_FRAGMENT', METAOBJECT_FRAGMENT);
      acc.fields.push(
        fieldFragment('type reference { ...MetaobjectFragment }'),
      );
      return acc;

    case 'page_reference':
      acc.fragments.set('PAGE_FRAGMENT', PAGE_FRAGMENT);
      acc.fields.push(fieldFragment('type reference { ...PageFragment }'));
      return acc;
    case 'list.page_reference':
      acc.fragments.set('PAGE_FRAGMENT', PAGE_FRAGMENT);
      acc.fields.push(
        fieldFragment(
          `type references(first: ${maxReferences}) { nodes { ...PageFragment } }`,
        ),
      );
      return acc;

    case 'variant_reference':
      acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
      acc.fields.push(fieldFragment('type reference { ...VariantFragment }'));
      return acc;
    case 'list.variant_reference':
      acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
      acc.fields.push(
        fieldFragment(
          `type references(first: ${maxReferences}) { nodes { ...VariantFragment } }`,
        ),
      );
      return acc;

    case 'product_reference':
      acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
      acc.fields.push(fieldFragment('type reference { ...ProductFragment }'));
      return acc;
    case 'list.product_reference':
      acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
      acc.fields.push(
        fieldFragment(
          `type references(first: ${maxReferences}) { nodes { ...ProductFragment } }`,
        ),
      );
      return acc;

    case 'mixed_reference':
      acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
      acc.fragments.set('COLLECTION_FRAGMENT', COLLECTION_FRAGMENT);
      acc.fragments.set('PAGE_FRAGMENT', PAGE_FRAGMENT);
      acc.fragments.set('GENERIC_FILE_FRAGMENT', GENERIC_FILE_FRAGMENT);
      acc.fragments.set('METAOBJECT_FRAGMENT', METAOBJECT_FRAGMENT);
      acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
      acc.fragments.set('REFERENCE_FRAGMENT', REFERENCE_FRAGMENT);
      acc.fields.push(fieldFragment('type reference { ...ReferenceFragment }'));
    case 'list.mixed_reference':
      acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
      acc.fragments.set('COLLECTION_FRAGMENT', COLLECTION_FRAGMENT);
      acc.fragments.set('PAGE_FRAGMENT', PAGE_FRAGMENT);
      acc.fragments.set('METAOBJECT_FRAGMENT', METAOBJECT_FRAGMENT);
      acc.fragments.set('GENERIC_FILE_FRAGMENT', GENERIC_FILE_FRAGMENT);
      acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
      acc.fragments.set('REFERENCE_FRAGMENT', REFERENCE_FRAGMENT);
      acc.fields.push(
        fieldFragment(
          `type references(first: ${maxReferences}) { nodes { ...ReferenceFragment } }`,
        ),
      );
      return acc;

    default:
      acc.fields.push(fieldFragment('type value'));
      return acc;
  }
}
