import {readFile, writeFile} from '@shopify/cli-kit/node/fs';
import {formatCode} from '../format-code.js';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {
  createMetaobjectDefinition,
  getMetaobjectDefinitions,
  updateMetaobjectDefinition,
} from '../graphql/admin/metaobject-definitions.js';
import {upsertMetaobject} from '../graphql/admin/metaobjects.js';
import {transpileFile} from '../transpile-ts.js';
import {generateQueryFromSectionSchema} from './section-query.js';
import {generateSectionsComponent} from './sections.js';
import type {MetaobjectDefinition, SectionSchema} from './types.js';

const HACK_SESSION = {
  storeFqdn: 'hydrogen-preview.myshopify.com',
  token: process.env.HACK_ACCESS_TOKEN as string,
};

const recentlyUpdatedSchemas = new Set<string>();

export async function handleSchemaChange(
  schemaPath: string,
  metaobjectDefinitions: Record<
    string,
    MetaobjectDefinition | undefined | null
  >,
  appDirectory: string,
) {
  // DEBOUNCE
  if (recentlyUpdatedSchemas.has(schemaPath)) return;
  recentlyUpdatedSchemas.add(schemaPath);
  setTimeout(() => recentlyUpdatedSchemas.delete(schemaPath), 1000);

  const originalFileContent = await readFile(schemaPath);
  const fileContentWithoutImports = transpileFile(
    originalFileContent
      .replace(/import\s+[^\s]+\s+from\s+['"][^'"]+['"];?/gims, '')
      .replace('defineSchema', '')
      .trim(),
  );

  // TODO: URI import in Node doesn't seem to support `import` statements
  const mod = await import(
    'data:text/javascript;base64,' + btoa(fileContentWithoutImports)
  );

  const sectionSchema = mod.default as SectionSchema;
  const remoteDefinition = metaobjectDefinitions?.[sectionSchema.type];

  // Create, update or skip metaobject definition
  if (!remoteDefinition) {
    const newDefinition = await createMetaobjectDefinition(
      HACK_SESSION,
      sectionSchema,
    );
    metaobjectDefinitions[sectionSchema.type] = newDefinition;
    renderSuccess({
      headline: `Created section definition ${sectionSchema.type}`,
    });
  } else {
    const schemaHasChanged = hasDefinitionChanged(
      sectionSchema,
      remoteDefinition,
    );
    if (schemaHasChanged) {
      const updatedDefinition = await updateMetaobjectDefinition(
        HACK_SESSION,
        sectionSchema,
        remoteDefinition,
      )!;
      metaobjectDefinitions[sectionSchema.type] = updatedDefinition;
      renderSuccess({
        headline: `Updated section definition ${sectionSchema.type}`,
      });
    }
  }

  await upsertMetaobject(HACK_SESSION, sectionSchema);
  await generateSectionsComponent(metaobjectDefinitions, appDirectory);
  await generateSchemaQueryAndFragments({
    schemaPath,
    originalFileContent,
    sectionSchema,
    mod,
  });
}

async function generateSchemaQueryAndFragments({
  schemaPath,
  originalFileContent,
  sectionSchema,
  mod,
}: {
  schemaPath: string;
  originalFileContent: string;
  sectionSchema: SectionSchema;
  mod: Record<string, unknown>;
}) {
  const generated = generateQueryFromSectionSchema(sectionSchema);
  const queryPrefix = sectionSchema.name!.replace(/\s/g, '_').toUpperCase();
  const queryName = queryPrefix + '_QUERY';
  const fragmentName = queryPrefix + '_FRAGMENT';
  const schemaQuery = mod[queryName] as string | undefined;
  const schemaFragments = mod[fragmentName] as string | undefined;

  if (
    generated.query !== schemaQuery ||
    generated.fragments !== schemaFragments
  ) {
    let content = originalFileContent;
    if (schemaQuery) {
      // drop the old query
      content = (content.split(`export const ${queryName}`)[0] ?? '').trim();
    }
    if (schemaFragments) {
      // drop the old query
      content = (content.split(`export const ${fragmentName}`)[0] ?? '').trim();
    }

    content +=
      `\n\nexport const ${fragmentName} = \`${generated.fragments}\` as const;\n` +
      `\nexport const ${queryName} = \`${generated.query}\${${fragmentName}}\n\` as const;\n`;

    const formatted = formatCode(content, undefined, schemaPath);
    await writeFile(schemaPath, formatted);
  }
}

export async function getDefinitionsForSections() {
  return (await getMetaobjectDefinitions(HACK_SESSION))
    .filter((metaobject) => metaobject.type.startsWith('section_'))
    .reduce((acc, item) => {
      acc[item.type.replace('section_', '')] = item;
      return acc;
    }, {} as Record<string, MetaobjectDefinition | undefined | null>);
}

function hasDefinitionChanged(
  newMD: SectionSchema,
  existingMD?: MetaobjectDefinition,
) {
  if (!newMD || !existingMD) return true;

  if (
    (['name', 'displayNameKey', 'description'] as const).some(
      (key) =>
        (newMD[key] || '') !==
        (existingMD[key] || '').replace('Section | ', ''),
    ) ||
    newMD.fields.length !== existingMD.fieldDefinitions.length
  ) {
    return true;
  }

  for (const existingField of existingMD.fieldDefinitions) {
    const newField = newMD.fields.find(
      (newField) => newField.key === existingField.key,
    );

    if (
      !newField ||
      !!newField.required !== !!existingField.required ||
      (['name', 'description'] as const).some(
        (key) => (newField[key] ?? '') !== (existingField[key] ?? ''),
      )
    ) {
      return true;
    }
  }

  return false;
}
