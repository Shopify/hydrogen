/**
 * This file has utilities to create GraphQL clients
 * that consume the types generated by the Hydrogen preset.
 */

import type {ExecutionArgs} from 'graphql';
import type {SetOptional, HasRequiredKeys, IsAny} from 'type-fest';

/**
 * A generic type for `variables` in GraphQL clients
 */
export type GenericVariables = ExecutionArgs['variableValues'];

/**
 * Use this type to make parameters optional in GraphQL clients
 * when no variables need to be passed.
 */
export type EmptyVariables = {[key: string]: never};

/**
 * This interface must be extended by the
 * GraphQL client's generic operation interfaces.
 */
export interface CodegenOperations {
  [key: string]: {return: any; variables: GenericVariables};
}

/**
 * Used as the return type for GraphQL clients. It picks
 * the return type from the generated operation types.
 * @example
 * graphqlQuery: (...) => Promise<ClientReturn<...>>
 * graphqlQuery: (...) => Promise<{data: ClientReturn<...>}>
 */
export type ClientReturn<
  GeneratedOperations extends CodegenOperations,
  RawGqlString extends string,
  OverrideReturnType extends any,
> = IsAny<GeneratedOperations[RawGqlString]['return']> extends true
  ? OverrideReturnType
  : GeneratedOperations[RawGqlString]['return'];

/**
 * Checks if the generated variables for an operation
 * are optional or required.
 */
export type IsOptionalVariables<
  VariablesParam,
  OptionalVariableNames extends string = never,
> = Omit<VariablesParam, OptionalVariableNames> extends EmptyVariables
  ? true // No need to pass variables
  : GenericVariables extends VariablesParam
  ? true // We don't know what variables are needed
  : HasRequiredKeys<Omit<VariablesParam, OptionalVariableNames>> extends true
  ? false
  : true;

/**
 * Used as the type for the GraphQL client's variables. It checks
 * the generated operation types to see if variables are optional.
 * @example
 * graphqlQuery: (query: string, param: ClientVariables<...>) => Promise<...>
 * Where `param` is required.
 */
export type ClientVariables<
  GeneratedOperations extends CodegenOperations,
  RawGqlString extends string,
  OptionalVariableNames extends string = never,
  VariablesKey extends string = 'variables',
  // The following are just extracted repeated types, not parameters:
  GeneratedVariables = GeneratedOperations[RawGqlString]['variables'],
  ActualVariables = SetOptional<
    GeneratedVariables,
    Extract<keyof GeneratedVariables, OptionalVariableNames>
  >,
  VariablesWrapper = Record<VariablesKey, ActualVariables>,
> = IsOptionalVariables<ActualVariables, OptionalVariableNames> extends true
  ? Partial<VariablesWrapper>
  : VariablesWrapper;

/**
 * Similar to ClientVariables, but makes the whole wrapper optional:
 * @example
 * graphqlQuery: (query: string, ...params: ClientVariablesInRestParams<...>) => Promise<...>
 * Where the first item in `params` might be optional depending on the query.
 */
export type ClientVariablesInRestParams<
  GeneratedOperations extends CodegenOperations,
  RawGqlString extends string,
  OtherParams extends Record<string, any> = {},
  OptionalVariableNames extends string = never,
  // The following are just extracted repeated types, not parameters:
  ProcessedVariables = OtherParams &
    ClientVariables<GeneratedOperations, RawGqlString, OptionalVariableNames>,
> = HasRequiredKeys<OtherParams> extends true
  ? [ProcessedVariables]
  : IsOptionalVariables<
      GeneratedOperations[RawGqlString]['variables'],
      OptionalVariableNames
    > extends true
  ? [ProcessedVariables?] // Using codegen, query has no variables
  : [ProcessedVariables]; // Using codegen, query needs variables
