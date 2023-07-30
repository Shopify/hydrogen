import {AbortError} from '@shopify/cli-kit/node/error';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {adminRequest, type AdminSession} from './client.js';
import {
  SectionSchema,
  MetaobjectUpsertInput,
  MetaobjectUpsertPayload,
  MetaobjectStatus,
} from '../../metaobjects/types.js';

const MetaobjectFragment = `#graphql
  fragment MetaobjectFragment on Metaobject {
    id
    type
    fields {
      key
      type
      value
    }
  }
`;

const UpsertMetaobjectMutation = `#graphql
  mutation metaobjectUpsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject {
        ...MetaobjectFragment
      }
      userErrors {
        field
        message
      }
    }
  }


  ${MetaobjectFragment}
`;

export async function upsertMetaobject(
  adminSession: AdminSession,
  section: SectionSchema,
) {
  const fields = [];
  for (const field of section.fields) {
    if (field.default) {
      fields.push({
        key: field.key,
        value:
          typeof field.default === 'string'
            ? field.default
            : JSON.stringify(field.default),
      });
    }
  }

  if (fields.length === 0) return;

  const type = 'section_' + section.type;
  const handle = 'h2_default_' + type;

  const {
    metaobjectUpsert: {metaobject, userErrors},
  } = await adminRequest<{
    metaobjectUpsert: MetaobjectUpsertPayload;
  }>(UpsertMetaobjectMutation, adminSession, {
    handle: {
      handle,
      type,
    },
    metaobject: {
      handle,
      fields,
      capabilities: {
        publishable: {
          status: MetaobjectStatus.Active,
        },
      },
    } satisfies MetaobjectUpsertInput,
  });

  if (userErrors.length) {
    const errorMessages = userErrors.map(({message}) => message).join(', ');
    throw new AbortError('Could not create metaobject entry. ' + errorMessages);
  }

  renderInfo({
    headline: `Upserted ${type} default metaobject entry ${handle}`,
  });

  return metaobject;
}
