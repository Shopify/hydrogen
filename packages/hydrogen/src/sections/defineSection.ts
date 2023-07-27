import type {
  SectionField,
  SectionSchema,
  SectionMeta,
  ValidSectionSchema,
} from './types.js';
import {
  PRODUCT_FRAGMENT,
  VARIANT_FRAGMENT,
  COLLECTION_FRAGMENT,
  MEDIA_IMAGE_FRAGMENT,
  GENERIC_FILE_FRAGMENT,
  REFERENCE_FRAGMENT,
  PAGE_FRAGMENT,
  METAOBJECT_FRAGMENT,
} from './graphql/fragments.js';

/**
 * Validates a section schema and generates a storefront `query` able
 * to fetch a metaobject entry for the given section schema via `metaobjectByHandle`
 */
export function defineSection(schema: SectionSchema): SectionMeta {
  const validSchema = validateSectionSchema(schema);
  if (validSchema instanceof Error) {
    throw validSchema;
  }
  const query = createSectionQuery(validSchema);
  return {query};
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
}: ValidSectionSchema): SectionMeta['query'] {
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

  const query = `#graphql
  query Section${name}($handle: String!) {
    section: metaobject(handle: { handle: $handle, type: "section_${_type}" }) {
      ...${name}
    }
  }
  fragment ${name} on Metaobject {
    id
    handle
    type
    ${fields.join('\n')}
    ${blocks}
  }
  ${fragmentsString}
` as SectionMeta['query'];
  return query;
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

  switch (field.type) {
    case 'date':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.date':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'date_time':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.date_time':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'dimension':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.dimension':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'volume':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.volume':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'weight':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.weight':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'number_integer':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.number_integer':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'number_decimal':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.number_decimal':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'single_line_text_field':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.single_line_text_field':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'multi_line_text_field':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.multi_line_text_field':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'rich_text_field':
      acc.fields.push(fieldFragment('value'));
      return acc;

    // reference and list.reference fields
    case 'collection_reference':
      acc.fragments.set('COLLECTION_FRAGMENT', COLLECTION_FRAGMENT);
      acc.fields.push(fieldFragment('reference { ...CollectionFragment }'));
      return acc;
    case 'list.collection_reference':
      acc.fragments.set('COLLECTION_FRAGMENT', COLLECTION_FRAGMENT);
      acc.fields.push(fieldFragment('references { ...CollectionFragment }'));
      return acc;
    case 'file_reference':
      acc.fragments.set('MEDIA_IMAGE_FRAGMENT', MEDIA_IMAGE_FRAGMENT);
      acc.fields.push(fieldFragment('reference { ...MediaImageFragment }'));
      return acc;
    case 'list.file_reference':
      acc.fragments.set('GENERIC_FILE_FRAGMENT', GENERIC_FILE_FRAGMENT);
      acc.fields.push(fieldFragment('references { ...MediaImageFragment }'));
      return acc;
    case 'product_reference':
      acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
      acc.fields.push(fieldFragment('reference { ...ProductFragment }'));
      return acc;
    case 'list.product_reference':
      acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
      acc.fields.push(fieldFragment('references { ...ProductFragment }'));
      return acc;
    case 'list.metaobject_reference':
      acc.fragments.set('METAOBJECT_FRAGMENT', METAOBJECT_FRAGMENT);
      acc.fields.push(fieldFragment('references { ...MetaobjectFragment }'));
      return acc;
    case 'metaobject_reference':
      acc.fragments.set('METAOBJECT_FRAGMENT', METAOBJECT_FRAGMENT);
      acc.fields.push(fieldFragment('reference { ...MetaobjectFragment }'));
      return acc;
    case 'page_reference':
      acc.fragments.set('PAGE_FRAGMENT', PAGE_FRAGMENT);
      acc.fields.push(fieldFragment('reference { ...PageFragment }'));
      return acc;
    case 'list.page_reference':
      acc.fragments.set('PAGE_FRAGMENT', PAGE_FRAGMENT);
      acc.fields.push(fieldFragment('references { ...PageFragment }'));
      return acc;
    // TODO: REPEATED
    // case 'product_reference':
    //   acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
    //   acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
    //   acc.fields.push(fieldFragment('reference { ...ProductFragment }'));
    //   return acc;
    // TODO: REPEATED
    // case 'list.product_reference':
    //   acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
    //   acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
    //   acc.fields.push(fieldFragment('references { ...ProductFragment }'));
    //   return acc;
    case 'mixed_reference':
      acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
      acc.fragments.set('COLLECTION_FRAGMENT', COLLECTION_FRAGMENT);
      acc.fragments.set('PAGE_FRAGMENT', PAGE_FRAGMENT);
      acc.fragments.set('GENERIC_FILE_FRAGMENT', GENERIC_FILE_FRAGMENT);
      acc.fragments.set('METAOBJECT_FRAGMENT', METAOBJECT_FRAGMENT);
      acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
      acc.fragments.set('REFERENCE_FRAGMENT', REFERENCE_FRAGMENT);
      acc.fields.push(fieldFragment('reference { ...ReferenceFragment }'));
    case 'list.mixed_reference':
      acc.fragments.set('PRODUCT_FRAGMENT', PRODUCT_FRAGMENT);
      acc.fragments.set('COLLECTION_FRAGMENT', COLLECTION_FRAGMENT);
      acc.fragments.set('PAGE_FRAGMENT', PAGE_FRAGMENT);
      acc.fragments.set('GENERIC_FILE_FRAGMENT', GENERIC_FILE_FRAGMENT);
      acc.fragments.set('METAOBJECT_FRAGMENT', METAOBJECT_FRAGMENT);
      acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
      acc.fragments.set('REFERENCE_FRAGMENT', REFERENCE_FRAGMENT);
      acc.fields.push(fieldFragment('references { ...ReferenceFragment }'));
      return acc;
    case 'variant_reference':
      acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
      acc.fields.push(fieldFragment('reference { ...VariantFragment }'));
      return acc;
    case 'list.variant_reference':
      acc.fragments.set('VARIANT_FRAGMENT', VARIANT_FRAGMENT);
      acc.fields.push(fieldFragment('references { ...VariantFragment }'));
      return acc;
    case 'boolean':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'color':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.color':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'rating':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.rating':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'url':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'list.url':
      acc.fields.push(fieldFragment('values'));
      return acc;
    case 'money':
      acc.fields.push(fieldFragment('value'));
      return acc;
    case 'json':
      acc.fields.push(fieldFragment('value'));
      return acc;

    default:
      acc.fields.push(fieldFragment('value'));
      return acc;
  }
}
