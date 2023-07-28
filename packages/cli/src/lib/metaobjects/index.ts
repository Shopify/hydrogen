import {readFile, writeFile} from '@shopify/cli-kit/node/fs';
import {
  createMetaobjectDefinition,
  getMetaobjectDefinitions,
  updateMetaobjectDefinition,
} from '../graphql/admin/metaobject-definitions.js';
import {upsertMetaobject} from '../graphql/admin/metaobjects.js';
import {generateQueryFromSectionSchema} from './section-query.js';
import {generateSectionsComponent} from './sections.js';
import type {MetaobjectDefinition, SectionSchema} from './types.js';

const HACK_SESSION = {
  storeFqdn: 'hydrogen-preview.myshopify.com',
  token: process.env.HACK_ACCESS_TOKEN as string,
};

export async function handleSchemaChange(
  file: string,
  metaobjectDefinitions: Record<
    string,
    MetaobjectDefinition | undefined | null
  >,
) {
  console.log('');
  const originalFileContent = await readFile(file);
  const fileContentWithoutImports = originalFileContent
    .replace(/import\s+[^\s]+\s+from\s+['"][^'"]+['"];?/gims, '')
    .replace('defineSection', '')
    .trim();

  // TODO: URI import in Node doesn't seem to support `import` statements
  const mod = await import(
    'data:text/javascript;base64,' + btoa(fileContentWithoutImports)
  );

  const sectionSchema = mod.default as SectionSchema;

  // console.log('new', mod.default);
  // console.log('old', metaobjectDefinitions[mod.default.type]);

  const existingMD = metaobjectDefinitions[sectionSchema.type];

  if (existingMD && hasMDChanged(sectionSchema, existingMD)) {
    if (metaobjectDefinitions[sectionSchema.type]) {
      // Update MD
      metaobjectDefinitions[sectionSchema.type] =
        await updateMetaobjectDefinition(
          HACK_SESSION,
          sectionSchema,
          existingMD,
        )!;
    } else {
      // Create MD
      metaobjectDefinitions[sectionSchema.type] =
        await createMetaobjectDefinition(HACK_SESSION, sectionSchema);
    }

    await upsertMetaobject(HACK_SESSION, sectionSchema);
  } else {
    console.log('NO CHANGE FOR', sectionSchema.type);
  }

  const generatedQuery = generateQueryFromSectionSchema(sectionSchema);
  const queryName =
    sectionSchema.name!.replace(/\s/g, '_').toUpperCase() + '_QUERY';
  const schemaQuery = mod[queryName] as string | undefined;

  if (generatedQuery !== schemaQuery) {
    let content = originalFileContent;
    if (schemaQuery) {
      // drop the old query
      content = (content.split(`export const ${queryName}`)[0] ?? '').trim();
    }

    await writeFile(
      file,
      content + `\nexport const ${queryName} = \`${generatedQuery}\`;\n`,
    );
  }
}

export async function getMDForSections() {
  return (await getMetaobjectDefinitions(HACK_SESSION))
    .filter((metaobject) => metaobject.type.startsWith('section_'))
    .reduce((acc, item) => {
      acc[item.type.replace('section_', '')] = item;
      return acc;
    }, {} as Record<string, MetaobjectDefinition | undefined | null>);
}

function hasMDChanged(newMD: SectionSchema, existingMD?: MetaobjectDefinition) {
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
