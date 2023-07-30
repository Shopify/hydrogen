import {AbortError} from '@shopify/cli-kit/node/error';
import {adminRequest, type AdminSession} from './client.js';
import {
  SectionSchema,
  MetaobjectDefinitionCreateInput,
  MetaobjectDefinitionUpdateInput,
  MetaobjectAdminAccess,
  MetaobjectStorefrontAccess,
  MetaobjectFieldDefinitionOperationInput,
  MetaobjectDefinition,
  MetaobjectDefinitionCreatePayload,
  MetaobjectDefinitionUpdatePayload,
} from '../../metaobjects/types.js';

const MetaobjectDefinitionFragment = `#graphql
  fragment MetaobjectDefinitionFragment on MetaobjectDefinition {
    id
    displayNameKey
    name
    description
    type
    visibleToStorefrontApi
    fieldDefinitions {
      name
      description
      key
      required
      type {
        category
        name
      }
    }
  }
`;

const GetMetaobjectDeinifitionsQuery = `#graphql
  query MetaObjectDefinitions {
    metaobjectDefinitions(first: 100) {
      # MetaobjectDefinitionConnection fields
      nodes {
        ...MetaobjectDefinitionFragment
      }
    }
  }
  ${MetaobjectDefinitionFragment}
`;

const CreateMetaobjectDefinitionMutation = `#graphql
  mutation metaobjectDefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        ...MetaobjectDefinitionFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${MetaobjectDefinitionFragment}
`;

const UpdateMetaobjectDefinitionMutation = `#graphql
  mutation metaobjectDefinitionUpdate($definition: MetaobjectDefinitionUpdateInput!, $id: ID!) {
    metaobjectDefinitionUpdate(definition: $definition, id: $id) {
      metaobjectDefinition {
        ...MetaobjectDefinitionFragment
      }
      userErrors {
        field
        message
      }
    }
  }

  ${MetaobjectDefinitionFragment}
`;

export async function getMetaobjectDefinitions(adminSession: AdminSession) {
  const {metaobjectDefinitions} = await adminRequest<{
    metaobjectDefinitions: {nodes: Array<MetaobjectDefinition>};
  }>(GetMetaobjectDeinifitionsQuery, adminSession);

  return metaobjectDefinitions.nodes;
}

export async function createMetaobjectDefinition(
  adminSession: AdminSession,
  newSection: SectionSchema,
) {
  const definition = sectionToMetaobject(newSection);

  const {
    metaobjectDefinitionCreate: {metaobjectDefinition, userErrors},
  } = await adminRequest<{
    metaobjectDefinitionCreate: MetaobjectDefinitionCreatePayload;
  }>(CreateMetaobjectDefinitionMutation, adminSession, {
    definition: {
      ...definition,
      fieldDefinitions: newSection.fields.map(sectionFieldToDefinition),
    } satisfies MetaobjectDefinitionCreateInput,
  });

  if (userErrors.length) {
    const errorMessages = userErrors.map(({message}) => message).join(', ');
    console.log(userErrors);
    throw new AbortError(
      'Could not create metaobject definition. ' + errorMessages,
    );
  }

  return metaobjectDefinition;
}

export async function updateMetaobjectDefinition(
  adminSession: AdminSession,
  newSection: SectionSchema,
  existingSection: MetaobjectDefinition,
) {
  const {
    metaobjectDefinitionUpdate: {metaobjectDefinition, userErrors},
  } = await adminRequest<{
    metaobjectDefinitionUpdate: MetaobjectDefinitionUpdatePayload;
  }>(UpdateMetaobjectDefinitionMutation, adminSession, {
    id: existingSection.id,
    definition: {
      resetFieldOrder: true,
      fieldDefinitions: diffFieldDefinitions(
        newSection.fields,
        existingSection.fieldDefinitions,
      ),
    } satisfies MetaobjectDefinitionUpdateInput,
  });

  if (userErrors.length) {
    const errorMessages = userErrors.map(({message}) => message).join(', ');
    throw new AbortError(
      'Could not update metaobject definition. ' + errorMessages,
    );
  }

  return metaobjectDefinition;
}

function sectionToMetaobject(
  section: SectionSchema,
): Omit<MetaobjectDefinitionCreateInput, 'fieldDefinitions'> {
  return {
    access: {
      admin: MetaobjectAdminAccess.PublicReadWrite,
      // admin: 'MERCHANT_READ',
      storefront: MetaobjectStorefrontAccess.PublicRead,
    },
    capabilities: {
      publishable: {
        enabled: true,
      },
      // @ts-ignore
      translatable: {
        enabled: true,
      },
    },
    visibleToStorefrontApi: true,
    description: section.description,
    displayNameKey: section.displayNameKey,
    name: 'Section | ' + section.name,
    type: 'section_' + section.type,
  };
}

function sectionFieldToDefinition(field: SectionSchema['fields'][number]) {
  return {
    description: field.description,
    key: field.key,
    name: field.name,
    required: field.required,
    type: field.type,
    validations: field.validations,
    visibleToStorefrontApi: true,
  };
}

function diffFieldDefinitions(
  newSectionFields: SectionSchema['fields'],
  existingSectionFields: MetaobjectDefinition['fieldDefinitions'],
) {
  const fieldDefinitionDiff: MetaobjectFieldDefinitionOperationInput[] = [];

  for (const newField of newSectionFields) {
    const existingField = existingSectionFields.find(
      (existingField) => existingField.key === newField.key,
    );

    if (existingField) {
      const {type, ...update} = sectionFieldToDefinition(newField);

      if (type !== existingField.type.name) {
        throw new Error(
          `Error when updating a field type from "${existingField.type.name}" to "${type}".` +
            `Changing types is not supported. Please remove the field and create a new one.`,
        );
      }

      fieldDefinitionDiff.push({update});
    } else {
      fieldDefinitionDiff.push({
        create: sectionFieldToDefinition(newField),
      });
    }
  }

  for (const existingField of existingSectionFields) {
    const isFieldRemoved =
      newSectionFields.findIndex(
        (newField) => newField.key === existingField.key,
      ) === -1;

    if (isFieldRemoved)
      fieldDefinitionDiff.push({delete: {key: existingField.key}});
  }

  return fieldDefinitionDiff;
}
