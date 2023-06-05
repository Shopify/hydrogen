// This plugin is based on `gql-tag-operations-preset`
// https://www.npmjs.com/package/@graphql-codegen/gql-tag-operations-preset

import type {PluginFunction} from '@graphql-codegen/plugin-helpers';
import type {Source} from '@graphql-tools/utils';
import type {FragmentDefinitionNode, OperationDefinitionNode} from 'graphql';

export type OperationOrFragment = {
  initialName: string;
  definition: OperationDefinitionNode | FragmentDefinitionNode;
};

export type SourceWithOperations = {
  source: Source;
  operations: Array<OperationOrFragment>;
};

export const plugin: PluginFunction<{
  sourcesWithOperations: Array<SourceWithOperations>;
  interfaceExtensionCode: string;
}> = (_, __, {sourcesWithOperations, interfaceExtensionCode}, _info) => {
  const code = getDocumentRegistryChunk(sourcesWithOperations);

  code.push(interfaceExtensionCode);

  return code.join('') + '\n';
};

export const GENERATED_QUERY_INTERFACE_NAME = 'GeneratedQueryTypes';
export const GENERATED_MUTATION_INTERFACE_NAME = 'GeneratedMutationTypes';

const isMutationRE = /(^|}\s|\n\s*)mutation[\s({]/im;

// Iteratively replace fragment annotations with the actual fragment content
// until there are no more annotations in the operation.
const normalizeOperation = (
  rawSDL: string,
  variablesMap: Map<string, string>,
) => {
  let variableNotFound = false;

  while (/#REQUIRED_VAR=/.test(rawSDL) && !variableNotFound) {
    let requiredVariables = rawSDL.matchAll(/#REQUIRED_VAR=(\w+)/g);
    for (const [match, variableName] of requiredVariables) {
      if (variablesMap.has(variableName)) {
        rawSDL = rawSDL.replace(match, variablesMap.get(variableName)!);
      } else {
        // An annotation cannot be replaced, so the operation is invalid.
        // This should not happen, but we'll handle it just in case
        // to prevent infinite loops. This should be logged as an error and fixed.
        variableNotFound = true; // break;
        console.error(
          new Error(
            `Variable "${variableName}" not found. This might be a bug in hydrogen-codegen, please report it.`,
          ),
        );
      }
    }
  }

  return rawSDL;
};

const buildTypeLines = (name: string, operations: Map<string, string[]>) => {
  const lines = [`interface ${name} {\n`];

  for (const [originalString, typeNames] of operations) {
    lines.push(
      `  ${JSON.stringify(originalString)}: {return: ${
        // SFAPI does not support multiple operations in a single document.
        // Use 'never' here if that's the case so that the user gets a type error.
        // e.g. `'query q1 {...} query q2 {...}'` is invalid.
        typeNames.length === 1 ? typeNames[0] : 'never'
      }, variables: ${typeNames.map((n) => n + 'Variables').join(' & ')}},\n`,
    );
  }

  lines.push(`}\n`);

  return lines;
};

function getDocumentRegistryChunk(
  sourcesWithOperations: Array<SourceWithOperations> = [],
) {
  const queries = new Map<string, string[]>();
  const mutations = new Map<string, string[]>();

  const variablesMap = new Map<string, string>();
  for (const {source} of sourcesWithOperations) {
    const variableName = source.rawSDL?.match(/#VAR_NAME=(\w+)/)?.[1];
    if (variableName) {
      source.rawSDL = source.rawSDL!.replace(/#VAR_NAME=\w+$/, '');
      variablesMap.set(variableName, source.rawSDL!);
    }
  }

  for (const {operations, source} of sourcesWithOperations) {
    const actualOperations = operations.filter(
      (op) => op.definition.kind === 'OperationDefinition',
    );

    if (actualOperations.length === 0) continue;

    const sdlString = source.rawSDL!;
    const target = isMutationRE.test(sdlString) ? mutations : queries;
    target.set(
      normalizeOperation(sdlString, variablesMap),
      actualOperations.map((o) => o.initialName),
    );
  }

  return [
    ...buildTypeLines(GENERATED_QUERY_INTERFACE_NAME, queries),
    '\n',
    ...buildTypeLines(GENERATED_MUTATION_INTERFACE_NAME, mutations),
  ];
}
