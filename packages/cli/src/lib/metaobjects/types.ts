import type {
  MetaobjectDefinitionCreateInput,
  MetaobjectFieldDefinitionCreateInput,
} from './types-admin-api.js';

export {
  MetaobjectStatus,
  MetaobjectAdminAccess,
  MetaobjectStorefrontAccess,
} from './types-admin-api.js';

export type {
  MetaobjectUpsertInput,
  MetaobjectUpsertPayload,
  MetaobjectDefinitionCreateInput,
  MetaobjectFieldDefinitionCreateInput,
  MetaobjectDefinitionUpdateInput,
  MetaobjectFieldDefinitionOperationInput,
  MetaobjectDefinition,
  MetaobjectDefinitionCreatePayload,
  MetaobjectDefinitionUpdatePayload,
} from './types-admin-api.js';

/* A dynamically generated storefront query to fetch a section metaobject entry via `metaobjectByHandle` */
export type SectionQuery = `#graphql ${string}`;

/* A section schema that includes all the required fields to create a metaobject definition */
export type ValidSectionSchema = {
  name: string;
  type: string;
  fields: SectionSchema['fields'];
  blocks: SectionSchema['blocks'];
};

type BaseField = MetaobjectFieldDefinitionCreateInput & {
  default?: any;
};

type FieldDate = BaseField & {
  type: 'date';
};

type FieldDateList = BaseField & {
  type: 'list.date';
};

type FieldDateTime = BaseField & {
  type: 'date_time';
};

type FieldDateTimeList = BaseField & {
  type: 'list.date_time';
};

type FieldDimension = BaseField & {
  type: 'dimension';
};

type FieldDimensionList = BaseField & {
  type: 'list.dimension';
};

type FieldVolume = BaseField & {
  type: 'volume';
};

type FieldVolumeList = BaseField & {
  type: 'list.volume';
};

type FieldWeight = BaseField & {
  type: 'weight';
};

type FieldWeightList = BaseField & {
  type: 'list.weight';
};

type FieldNumberInteger = BaseField & {
  type: 'number_integer';
};

type FieldNumberIntegerList = BaseField & {
  type: 'list.number_integer';
};

type FieldNumberDecimal = BaseField & {
  type: 'number_decimal';
};

type FieldNumberDecimalList = BaseField & {
  type: 'list.number_decimal';
};

type FieldSingleLineTextField = BaseField & {
  type: 'single_line_text_field';
};

type FieldMultiLineTextField = BaseField & {
  type: 'multi_line_text_field';
};

type FieldSingleLineTextFieldList = BaseField & {
  type: 'list.single_line_text_field';
};

type FieldMultiLineTextFieldList = BaseField & {
  type: 'list.multi_line_text_field';
};

type FieldRichTextField = BaseField & {
  type: 'rich_text_field';
};

type FieldCollectionReference = BaseField & {
  type: 'collection_reference';
};

type FieldFileReference = BaseField & {
  type: 'file_reference';
};

type FieldCollectionReferenceList = BaseField & {
  type: 'list.collection_reference';
};

type FieldFileReferenceList = BaseField & {
  type: 'list.file_reference';
};

type FieldMetaobjectReferenceList = BaseField & {
  type: 'list.metaobject_reference';
};

type FieldMixedReferenceList = BaseField & {
  type: 'list.mixed_reference';
};

type FieldPageReferenceList = BaseField & {
  type: 'list.page_reference';
};

type FieldProductReferenceList = BaseField & {
  type: 'list.product_reference';
};

type FieldVariantReferenceList = BaseField & {
  type: 'list.variant_reference';
};

type FieldMetaobjectReference = BaseField & {
  type: 'metaobject_reference';
};

type FieldMixedReference = BaseField & {
  type: 'mixed_reference';
};

type FieldPageReference = BaseField & {
  type: 'page_reference';
};

type FieldProductReference = BaseField & {
  type: 'product_reference';
};

type FieldVariantReference = BaseField & {
  type: 'variant_reference';
};

type FieldBoolean = BaseField & {
  type: 'boolean';
};

type FieldColor = BaseField & {
  type: 'color';
};

type FieldColorList = BaseField & {
  type: 'list.color';
};

type FieldRating = BaseField & {
  type: 'rating';
};

type FieldRatingList = BaseField & {
  type: 'list.rating';
};

type FieldUrl = BaseField & {
  type: 'url';
};

type FieldUrlList = BaseField & {
  type: 'list.url';
};

type FieldMoney = BaseField & {
  type: 'money';
};

type FieldJson = BaseField & {
  type: 'json';
};

export type SectionField =
  // DATE
  | FieldDate
  | FieldDateList
  // DATE_TIME
  | FieldDateTime
  | FieldDateTimeList
  // DIMENSION
  | FieldDimension
  | FieldDimensionList
  | FieldVolume
  | FieldVolumeList
  | FieldWeight
  | FieldWeightList
  // NUMBER
  | FieldNumberInteger
  | FieldNumberIntegerList
  | FieldNumberDecimal
  | FieldNumberDecimalList
  // TEXT
  | FieldSingleLineTextField
  | FieldSingleLineTextFieldList
  | FieldMultiLineTextField
  | FieldMultiLineTextFieldList
  | FieldRichTextField
  // REFERENCE
  | FieldCollectionReference
  | FieldCollectionReferenceList
  | FieldFileReference
  | FieldFileReferenceList
  | FieldMetaobjectReference
  | FieldMetaobjectReferenceList
  | FieldMixedReference
  | FieldMixedReferenceList
  | FieldPageReference
  | FieldPageReferenceList
  | FieldProductReference
  | FieldProductReferenceList
  | FieldVariantReference
  | FieldVariantReferenceList
  // BOOLEAN
  | FieldBoolean
  // COLOR
  | FieldColor
  | FieldColorList
  // RATING
  | FieldRating
  | FieldRatingList
  // URL
  | FieldUrl
  | FieldUrlList
  // MONEY
  | FieldMoney
  // JSON
  | FieldJson;

export type FieldTypes = SectionField['type'];

/*
 * A type that defines a section MetaobjectDefinitionCreateInput omiting
 * fields we will hardcode and not allow to be changed by the user
 **/
type SectionMetaobjectDefinitionCreate = Omit<
  MetaobjectDefinitionCreateInput,
  'fieldDefinitions' | 'capabilities' | 'access'
>;

type SectionBlock = SectionMetaobjectDefinitionCreate & {
  fields: Array<SectionField>;
};

/* A type that defines a liquid-like section schema */
export type SectionSchema = SectionMetaobjectDefinitionCreate & {
  fields: Array<SectionField>;
  blocks?: Array<SectionBlock>;
};
