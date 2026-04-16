/**
 * Inlined type definitions from `@shopify/graphql-codegen` and `graphql`.
 *
 * tsup's DTS bundler treats devDependencies as external, leaving bare
 * `import ... from '@shopify/hydrogen-codegen'` in the emitted `.d.ts`.
 * Consumers who don't install that devDep get broken types.
 *
 * These types are stable GraphQL-codegen primitives that change very
 * rarely. Inlining them here removes the external type surface entirely.
 */

// ---------------------------------------------------------------------------
// From `graphql` — FormattedExecutionResult
// Ref: graphql-js/src/execution/execute.ts
// ---------------------------------------------------------------------------

interface GraphQLFormattedError {
  readonly message: string;
  readonly locations?: ReadonlyArray<{line: number; column: number}>;
  readonly path?: ReadonlyArray<string | number>;
  readonly extensions?: Record<string, unknown>;
}

export interface FormattedExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  data?: TData | null;
  extensions?: TExtensions;
}

// ---------------------------------------------------------------------------
// From `@shopify/graphql-codegen` — GenericVariables
// Original: `ExecutionArgs['variableValues']` from graphql-js
// ---------------------------------------------------------------------------

export type GenericVariables =
  | {readonly [variable: string]: unknown}
  | null
  | undefined;

// ---------------------------------------------------------------------------
// Minimal type-fest utilities (inlined to avoid the dependency)
// ---------------------------------------------------------------------------

type IsNever<T> = [T] extends [never] ? true : false;

type SetOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ---------------------------------------------------------------------------
// From `@shopify/graphql-codegen` — codegen client utilities
// ---------------------------------------------------------------------------

type EmptyVariables = {[key: string]: never};

interface CodegenOperations {
  [key: string]: any;
}

type IsOptionalVariables<
  VariablesParam,
  OptionalVariableNames extends string = never,
  VariablesWithoutOptionals = Omit<VariablesParam, OptionalVariableNames>,
> = VariablesWithoutOptionals extends EmptyVariables
  ? true
  : GenericVariables extends VariablesParam
    ? true
    : Partial<VariablesWithoutOptionals> extends VariablesWithoutOptionals
      ? true
      : false;

type ClientVariables<
  GeneratedOperations extends CodegenOperations,
  RawGqlString extends string,
  OptionalVariableNames extends string = never,
  VariablesKey extends string = 'variables',
  GeneratedVariables = RawGqlString extends keyof GeneratedOperations
    ? SetOptional<
        GeneratedOperations[RawGqlString]['variables'],
        Extract<
          keyof GeneratedOperations[RawGqlString]['variables'],
          OptionalVariableNames
        >
      >
    : GenericVariables,
  VariablesWrapper = Record<VariablesKey, GeneratedVariables>,
> =
  IsOptionalVariables<GeneratedVariables, OptionalVariableNames> extends true
    ? Partial<VariablesWrapper>
    : VariablesWrapper;

/**
 * Return type for GraphQL clients. Picks the return type from generated
 * operation types, or falls back to `any` for untyped queries.
 */
export type ClientReturn<
  GeneratedOperations extends CodegenOperations,
  RawGqlString extends string,
  OverrideReturnType extends any = never,
> =
  IsNever<OverrideReturnType> extends true
    ? RawGqlString extends keyof GeneratedOperations
      ? GeneratedOperations[RawGqlString]['return']
      : any
    : OverrideReturnType;

/**
 * Makes the variables wrapper a rest parameter that is optional when all
 * variables are optional (or when using an untyped query string).
 */
export type ClientVariablesInRestParams<
  GeneratedOperations extends CodegenOperations,
  RawGqlString extends string,
  OtherParams extends Record<string, any> = {},
  OptionalVariableNames extends string = never,
  ProcessedVariables = OtherParams &
    ClientVariables<GeneratedOperations, RawGqlString, OptionalVariableNames>,
> =
  Partial<OtherParams> extends OtherParams
    ? IsOptionalVariables<
        GeneratedOperations[RawGqlString]['variables'],
        OptionalVariableNames
      > extends true
      ? [ProcessedVariables?]
      : [ProcessedVariables]
    : [ProcessedVariables];
