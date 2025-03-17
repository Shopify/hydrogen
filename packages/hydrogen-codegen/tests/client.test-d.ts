import {describe, it, expectTypeOf} from 'vitest';
import type {
  ClientReturn,
  ClientVariablesInRestParams,
  GenericVariables,
} from '../src/index.js';

enum Queries {
  Unknown = '#graphql\n query UnknownQuery { test }',
  Simple = '#graphql\n query Test1Query { test }',
  WithRequiredVars = '#graphql\n query Test2Query($id: ID!) { test }',
  WithOptionalVars = '#graphql\n query Test2Query($id: ID) { test }',
  WithAutoAddedVars = '#graphql\n query Test2Query($country: CountryCode!, $language: LanguageCode) { test }',
}

interface GeneratedQueryTypes {
  [Queries.Simple]: {
    return: {test: number};
    variables: {};
  };
  [Queries.WithRequiredVars]: {
    return: {test: number};
    variables: {id: string};
  };
  [Queries.WithOptionalVars]: {
    return: {test: number};
    variables: {id?: string};
  };
  [Queries.WithAutoAddedVars]: {
    return: {test: number};
    // One is required, one is optional.
    // However, since these are auto added,
    // both should become optional at the end.
    variables: {country: string; language?: string};
  };
}

describe('Client types', async () => {
  describe('ClientReturn', () => {
    const clientQuery = <
      OverrideReturnType extends any = never,
      RawGqlString extends string = string,
    >(
      query: RawGqlString,
    ) =>
      Promise.resolve() as Promise<
        ClientReturn<GeneratedQueryTypes, RawGqlString, OverrideReturnType>
      >;

    it('finds the return type from query', async () => {
      expectTypeOf(clientQuery(Queries.Simple)).resolves.toEqualTypeOf<{
        test: number;
      }>();
      expectTypeOf(clientQuery(Queries.Simple)).resolves.not.toEqualTypeOf<{
        test: string;
      }>();
    });

    it('fallsback to any for unknown queries', () => {
      expectTypeOf(clientQuery(Queries.Unknown)).resolves.not.toEqualTypeOf<{
        test: number;
      }>();
      expectTypeOf(clientQuery(Queries.Unknown)).resolves.toEqualTypeOf<any>();
    });

    it('can be overriden', async () => {
      // Non-recognized query, override return type
      expectTypeOf(
        clientQuery<{test: string}>(Queries.Unknown),
      ).resolves.toEqualTypeOf<{test: string}>();

      // Recognized query, override return type
      expectTypeOf(
        clientQuery<{test: string}>(Queries.Simple),
      ).resolves.toEqualTypeOf<{
        test: string;
      }>();
      expectTypeOf(
        clientQuery<{test: string}>(Queries.Simple),
      ).resolves.not.toEqualTypeOf<{test: number}>();
    });
  });

  describe('ClientVariablesInRestParams', () => {
    describe('when there are not extra params', () => {
      const clientQuery = <
        OverrideReturnType extends any = never,
        RawGqlString extends string = string,
      >(
        query: RawGqlString,
        ...options: ClientVariablesInRestParams<
          GeneratedQueryTypes,
          RawGqlString,
          {}, // No extra params, only 'variables'
          'country' | 'language'
        >
      ) => Promise.resolve();

      it('finds GenericVariables for unknown queries', async () => {
        expectTypeOf(clientQuery<any>)
          .parameter(0)
          .toEqualTypeOf<string>();

        expectTypeOf(clientQuery<any>)
          .parameter(1)
          .toEqualTypeOf<{variables?: GenericVariables} | undefined>();

        expectTypeOf(clientQuery<any>)
          .parameter(2)
          .toEqualTypeOf<undefined>();
      });

      it('finds empty variables for known queries without variables', async () => {
        expectTypeOf(clientQuery<any, Queries.Simple>)
          .parameter(0)
          .toEqualTypeOf<Queries.Simple>();

        expectTypeOf(clientQuery<any, Queries.Simple>)
          .parameter(1)
          .toEqualTypeOf<{variables?: {}} | undefined>();
      });

      it('finds the variables type from known queries with required variables', async () => {
        expectTypeOf(clientQuery<any, Queries.WithRequiredVars>)
          .parameter(0)
          .toEqualTypeOf<Queries.WithRequiredVars>();

        expectTypeOf(clientQuery<any, Queries.WithRequiredVars>)
          .parameter(1)
          .toEqualTypeOf<{variables: {id: string}}>();
      });

      it('finds the partial variables type from known queries with optional variables', async () => {
        expectTypeOf(clientQuery<any, Queries.WithOptionalVars>)
          .parameter(0)
          .toEqualTypeOf<Queries.WithOptionalVars>();
        expectTypeOf(clientQuery<any, Queries.WithOptionalVars>)
          .parameter(1)
          .toEqualTypeOf<{variables?: {id?: string}} | undefined>();
      });

      it('finds the partial variables type from known queries with required auto-added variables', async () => {
        expectTypeOf(clientQuery<any, Queries.WithAutoAddedVars>)
          .parameter(0)
          .toEqualTypeOf<Queries.WithAutoAddedVars>();

        expectTypeOf(clientQuery<any, Queries.WithAutoAddedVars>)
          .parameter(1)
          .toEqualTypeOf<
            // Auto-added, therefore all optional:
            {variables?: {country?: string; language?: string}} | undefined
          >();
      });
    });

    describe('when there are optional extra params', () => {
      type WithExtraParam = {extraParam?: number};

      const clientQuery = <
        OverrideReturnType extends any = never,
        RawGqlString extends string = string,
      >(
        query: RawGqlString,
        ...options: ClientVariablesInRestParams<
          GeneratedQueryTypes,
          RawGqlString,
          WithExtraParam,
          'country' | 'language'
        >
      ) => Promise.resolve();

      it('finds GenericVariables for unknown queries', async () => {
        expectTypeOf(clientQuery<any>)
          .parameter(0)
          .toEqualTypeOf<string>();

        expectTypeOf(clientQuery<any>)
          .parameter(1)
          .toEqualTypeOf<
            | (WithExtraParam & {
                variables?: GenericVariables;
              })
            | undefined
          >();

        expectTypeOf(clientQuery<any>)
          .parameter(2)
          .toEqualTypeOf<undefined>();
      });

      it('finds empty variables for known queries without variables', async () => {
        expectTypeOf(clientQuery<any, Queries.Simple>)
          .parameter(0)
          .toEqualTypeOf<Queries.Simple>();

        expectTypeOf(clientQuery<any, Queries.Simple>)
          .parameter(1)
          .toEqualTypeOf<(WithExtraParam & {variables?: {}}) | undefined>();
      });

      it('finds the variables type from known queries with required variables', async () => {
        expectTypeOf(clientQuery<any, Queries.WithRequiredVars>)
          .parameter(0)
          .toEqualTypeOf<Queries.WithRequiredVars>();

        expectTypeOf(clientQuery<any, Queries.WithRequiredVars>)
          .parameter(1)
          .toEqualTypeOf<WithExtraParam & {variables: {id: string}}>();
      });

      it('finds the partial variables type from known queries with optional variables', async () => {
        expectTypeOf(clientQuery<any, Queries.WithOptionalVars>)
          .parameter(0)
          .toEqualTypeOf<Queries.WithOptionalVars>();
        expectTypeOf(clientQuery<any, Queries.WithOptionalVars>)
          .parameter(1)
          .toEqualTypeOf<
            (WithExtraParam & {variables?: {id?: string}}) | undefined
          >();
      });

      it('finds the partial variables type from known queries with required auto-added variables', async () => {
        expectTypeOf(clientQuery<any, Queries.WithAutoAddedVars>)
          .parameter(0)
          .toEqualTypeOf<Queries.WithAutoAddedVars>();

        expectTypeOf(clientQuery<any, Queries.WithAutoAddedVars>)
          .parameter(1)
          .toEqualTypeOf<
            // Auto-added variables and an optional extra param, therefore all optional:
            | (WithExtraParam & {
                variables?: {country?: string; language?: string};
              })
            | undefined
          >();
      });
    });

    describe('when there are required extra params', () => {
      type WithExtraParam = {extraParam: number};

      const clientQuery = <
        OverrideReturnType extends any = never,
        RawGqlString extends string = string,
      >(
        query: RawGqlString,
        ...options: ClientVariablesInRestParams<
          GeneratedQueryTypes,
          RawGqlString,
          WithExtraParam,
          'country' | 'language'
        >
      ) => Promise.resolve();

      it('finds GenericVariables for unknown queries', async () => {
        expectTypeOf(clientQuery<any>)
          .parameter(0)
          .toEqualTypeOf<string>();

        expectTypeOf(clientQuery<any>)
          .parameter(1)
          .toEqualTypeOf<
            WithExtraParam & {
              variables?: GenericVariables;
            }
          >();

        expectTypeOf(clientQuery<any>)
          .parameter(2)
          .toEqualTypeOf<undefined>();
      });

      it('finds empty variables for known queries without variables', async () => {
        expectTypeOf(clientQuery<any, Queries.Simple>)
          .parameter(0)
          .toEqualTypeOf<Queries.Simple>();

        expectTypeOf(clientQuery<any, Queries.Simple>)
          .parameter(1)
          .toEqualTypeOf<WithExtraParam & {variables?: {}}>();
      });

      it('finds the variables type from known queries with required variables', async () => {
        expectTypeOf(clientQuery<any, Queries.WithRequiredVars>)
          .parameter(0)
          .toEqualTypeOf<Queries.WithRequiredVars>();

        expectTypeOf(clientQuery<any, Queries.WithRequiredVars>)
          .parameter(1)
          .toEqualTypeOf<WithExtraParam & {variables: {id: string}}>();
      });

      it('finds the partial variables type from known queries with optional variables', async () => {
        expectTypeOf(clientQuery<any, Queries.WithOptionalVars>)
          .parameter(0)
          .toEqualTypeOf<Queries.WithOptionalVars>();
        expectTypeOf(clientQuery<any, Queries.WithOptionalVars>)
          .parameter(1)
          .toEqualTypeOf<WithExtraParam & {variables?: {id?: string}}>();
      });

      it('finds the partial variables type from known queries with required auto-added variables', async () => {
        expectTypeOf(clientQuery<any, Queries.WithAutoAddedVars>)
          .parameter(0)
          .toEqualTypeOf<Queries.WithAutoAddedVars>();

        expectTypeOf(clientQuery<any, Queries.WithAutoAddedVars>)
          .parameter(1)
          .toEqualTypeOf<
            // Auto-added variables and a required extra param,
            // therefore variables are optional but wrapper is required:
            WithExtraParam & {
              variables?: {country?: string; language?: string};
            }
          >();
      });
    });
  });
});
