/**
 * Type-level GraphQL result and variables resolver.
 *
 * Uses gql.tada's exported `parseDocument<T>` to parse a GraphQL query string
 * into an AST, then walks the AST against a generated introspection
 * schema to compute Result and Variables types — without depending on any
 * gql.tada internal types.
 */
import type { parseDocument } from "gql.tada";

import type { introspection } from "./generated/graphql-env";
import type { StorefrontScalars } from "./scalars";

// ---------------------------------------------------------------------------
// Schema preparation
// ---------------------------------------------------------------------------

type DefaultScalars = {
  readonly ID: string;
  readonly Boolean: boolean;
  readonly String: string;
  readonly Float: number;
  readonly Int: number;
};

type ScalarMap<CustomScalars extends Record<string, unknown>> = {
  [P in keyof CustomScalars | keyof DefaultScalars]: {
    name: P;
    type: P extends keyof CustomScalars
      ? CustomScalars[P]
      : P extends keyof DefaultScalars
        ? DefaultScalars[P]
        : never;
  };
};

export type GraphQLSchemaFor<
  SchemaIntrospection extends {
    name: any;
    query: string;
    mutation?: any;
    subscription?: any;
    types: { [name: string]: any };
  },
  CustomScalars extends Record<string, unknown>,
> = {
  name: SchemaIntrospection["name"];
  query: SchemaIntrospection["query"];
  mutation: SchemaIntrospection["mutation"];
  subscription: SchemaIntrospection["subscription"];
  types: ScalarMap<CustomScalars> & SchemaIntrospection["types"];
};

type StorefrontSchema = GraphQLSchemaFor<introspection, StorefrontScalars>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Obj<T> = T extends { [key: string | number]: any } ? { [K in keyof T]: T[K] } : never;

type ObjectLikeType = {
  kind: "OBJECT" | "INTERFACE" | "UNION";
  name: string;
  fields: { [key: string]: any };
};

export type SchemaLike = {
  name?: any;
  query: string;
  mutation?: any;
  subscription?: any;
  types: { [name: string]: any };
};

// ---------------------------------------------------------------------------
// Output type resolution (selection → result shape)
// ---------------------------------------------------------------------------

type FieldAlias<Node> = Node extends { alias: undefined; name: any }
  ? Node["name"]["value"]
  : Node extends { alias: any }
    ? Node["alias"]["value"]
    : never;

type IsConditional<Node> = Node extends { directives: any[] }
  ? Node["directives"][number]["name"]["value"] & ("include" | "skip" | "defer") extends never
    ? false
    : true
  : false;

type TypeDirective<Node> = Node extends { directives: any[] }
  ? Node["directives"][number]["name"]["value"] & ("required" | "_required") extends never
    ? Node["directives"][number]["name"]["value"] & ("optional" | "_optional") extends never
      ? void
      : true
    : false
  : void;

type UnwrapOutputType<
  Type,
  SelectionSet,
  Schema extends SchemaLike,
  Fragments extends { [name: string]: any },
  IsOptional,
> = Type extends { readonly kind: "NON_NULL"; readonly ofType: any }
  ? UnwrapOutputType<
      Type["ofType"],
      SelectionSet,
      Schema,
      Fragments,
      IsOptional extends void ? false : IsOptional
    >
  : Type extends { readonly kind: "LIST"; readonly ofType: any }
    ? IsOptional extends false
      ? Array<UnwrapOutputType<Type["ofType"], SelectionSet, Schema, Fragments, void>>
      : null | Array<UnwrapOutputType<Type["ofType"], SelectionSet, Schema, Fragments, void>>
    : Type extends { readonly name: string }
      ? Schema["types"][Type["name"]] extends ObjectLikeType
        ? SelectionSet extends { kind: "SelectionSet"; selections: any }
          ? IsOptional extends false
            ? ResolveSelection<
                SelectionSet["selections"],
                Schema["types"][Type["name"]],
                Schema,
                Fragments
              >
            : null | ResolveSelection<
                SelectionSet["selections"],
                Schema["types"][Type["name"]],
                Schema,
                Fragments
              >
          : unknown
        : Schema["types"][Type["name"]] extends { type: any }
          ? IsOptional extends false
            ? Schema["types"][Type["name"]]["type"]
            : Schema["types"][Type["name"]]["type"] | null
          : IsOptional extends false
            ? Schema["types"][Type["name"]]["enumValues"]
            : Schema["types"][Type["name"]]["enumValues"] | null
      : unknown;

type TypenameOf<Type> =
  | (Type extends { name: any } ? Type["name"] : never)
  | (Type extends { possibleTypes: any } ? Type["possibleTypes"] : never);

type SpreadSubtype<
  Node,
  BaseType extends ObjectLikeType,
  Schema extends SchemaLike,
  Fragments extends { [name: string]: any },
> = Node extends { kind: "InlineFragment"; typeCondition?: any }
  ? Node["typeCondition"] extends { kind: "NamedType"; name: any }
    ? Schema["types"][Node["typeCondition"]["name"]["value"]]
    : BaseType
  : Node extends { kind: "FragmentSpread"; name: any }
    ? Node["name"]["value"] extends keyof Fragments
      ? Schema["types"][Fragments[Node["name"]["value"]]["typeCondition"]["name"]["value"]]
      : void
    : void;

type FragmentSelection<
  Node,
  PossibleType extends string,
  Type extends ObjectLikeType,
  Schema extends SchemaLike,
  Fragments extends { [name: string]: any },
> = Node extends { kind: "InlineFragment"; selectionSet: any }
  ? SelectionWalker<Node["selectionSet"]["selections"], PossibleType, Type, Schema, Fragments>
  : Node extends { kind: "FragmentSpread"; name: any }
    ? Node["name"]["value"] extends keyof Fragments
      ? SelectionWalker<
          Fragments[Node["name"]["value"]]["selectionSet"]["selections"],
          PossibleType,
          Type,
          Schema,
          Fragments
        >
      : never
    : never;

interface SelectionAcc<Fields extends {} = {}, Rest = unknown> {
  fields: Fields;
  rest: Rest;
}

type SelectionWalker<
  Selections,
  PossibleType extends string,
  Type extends ObjectLikeType,
  Schema extends SchemaLike,
  Fragments extends { [name: string]: any },
  Acc extends SelectionAcc = SelectionAcc,
> = Selections extends [infer Node, ...infer Rest]
  ? SelectionWalker<
      Rest,
      PossibleType,
      Type,
      Schema,
      Fragments,
      Node extends { kind: "FragmentSpread" | "InlineFragment" }
        ? SpreadSubtype<Node, Type, Schema, Fragments> extends infer Sub extends ObjectLikeType
          ? PossibleType extends TypenameOf<Sub>
            ? IsConditional<Node> extends true
              ? SelectionAcc<
                  Acc["fields"],
                  Acc["rest"] & ({} | FragmentSelection<Node, PossibleType, Sub, Schema, Fragments>)
                >
              : SelectionAcc<
                  Acc["fields"] & FragmentSelection<Node, PossibleType, Sub, Schema, Fragments>,
                  Acc["rest"]
                >
            : Acc
          : Acc
        : Node extends { kind: "Field"; name: any; selectionSet: any }
          ? IsConditional<Node> extends true
            ? SelectionAcc<
                Acc["fields"] & {
                  [P in FieldAlias<Node>]?: Node["name"]["value"] extends "__typename"
                    ? PossibleType
                    : UnwrapOutputType<
                        Type["fields"][Node["name"]["value"]]["type"],
                        Node["selectionSet"],
                        Schema,
                        Fragments,
                        TypeDirective<Node>
                      >;
                },
                Acc["rest"]
              >
            : SelectionAcc<
                Acc["fields"] & {
                  [P in FieldAlias<Node>]: Node["name"]["value"] extends "__typename"
                    ? PossibleType
                    : UnwrapOutputType<
                        Type["fields"][Node["name"]["value"]]["type"],
                        Node["selectionSet"],
                        Schema,
                        Fragments,
                        TypeDirective<Node>
                      >;
                },
                Acc["rest"]
              >
          : Acc
    >
  : Acc["rest"] extends infer T
    ? Obj<Acc["fields"] & T>
    : never;

type ResolveSelection<
  Selections,
  Type extends ObjectLikeType,
  Schema extends SchemaLike,
  Fragments extends { [name: string]: any },
> = Type extends { kind: "UNION" | "INTERFACE"; possibleTypes: any }
  ? {
      [PT in Type["possibleTypes"]]: SelectionWalker<
        Selections,
        PT,
        Type,
        Schema,
        Fragments,
        SelectionAcc<{ __typename?: PT }>
      >;
    }[Type["possibleTypes"]]
  : Type extends { kind: "OBJECT"; name: any }
    ? SelectionWalker<Selections, Type["name"], Type, Schema, Fragments>
    : {};

// ---------------------------------------------------------------------------
// Fragment map builder
// ---------------------------------------------------------------------------

type FragmentMap<Defs, Map = {}> = Defs extends readonly [infer Def, ...infer Rest]
  ? FragmentMap<
      Rest,
      Def extends { kind: "FragmentDefinition"; name: any }
        ? { [N in Def["name"]["value"]]: Def } & Map
        : Map
    >
  : Map;

type FirstOperation<Defs> = Defs extends readonly [infer Def, ...infer Rest]
  ? Def extends { kind: "OperationDefinition" }
    ? Def
    : FirstOperation<Rest>
  : never;

type SingleOperation<Defs, Operation = never> = Defs extends readonly [infer Def, ...infer Rest]
  ? Def extends { kind: "OperationDefinition" }
    ? [Operation] extends [never]
      ? SingleOperation<Rest, Def>
      : never
    : SingleOperation<Rest, Operation>
  : Operation;

type FirstFragment<Defs> = Defs extends readonly [infer Def, ...infer Rest]
  ? Def extends { kind: "FragmentDefinition" }
    ? Def
    : FirstFragment<Rest>
  : never;

// ---------------------------------------------------------------------------
// Operation/document type resolution
// ---------------------------------------------------------------------------

type OperationType<
  Def,
  Schema extends SchemaLike,
  Fragments extends { [name: string]: any },
> = Def extends { kind: "OperationDefinition"; selectionSet: any; operation: any }
  ? Schema["types"][Schema[Def["operation"]]] extends infer T extends ObjectLikeType
    ? ResolveSelection<Def["selectionSet"]["selections"], T, Schema, Fragments>
    : {}
  : never;

type FragmentType<
  Def,
  Schema extends SchemaLike,
  Fragments extends { [name: string]: any },
> = Def extends { kind: "FragmentDefinition"; selectionSet: any; typeCondition: any }
  ? Schema["types"][Def["typeCondition"]["name"]["value"]] extends infer T extends ObjectLikeType
    ? ResolveSelection<Def["selectionSet"]["selections"], T, Schema, Fragments>
    : never
  : never;

type DocumentType<Doc, Schema extends SchemaLike> = Doc extends {
  kind: "Document";
  definitions: infer Defs extends readonly unknown[];
}
  ? FirstOperation<Defs> extends infer Operation
    ? [Operation] extends [never]
      ? FragmentType<FirstFragment<Defs>, Schema, FragmentMap<Defs>>
      : OperationType<Operation, Schema, FragmentMap<Defs>>
    : never
  : never;

// ---------------------------------------------------------------------------
// Variables resolution
// ---------------------------------------------------------------------------

type ResolveInputScalar<
  TypeName,
  Schema extends SchemaLike,
> = TypeName extends keyof Schema["types"]
  ? Schema["types"][TypeName] extends { kind: "INPUT_OBJECT"; inputFields: any; isOneOf?: any }
    ? Schema["types"][TypeName]["isOneOf"] extends true
      ? InputObjectOneOf<Schema["types"][TypeName]["inputFields"], Schema>
      : InputObject<Schema["types"][TypeName]["inputFields"], Schema>
    : Schema["types"][TypeName] extends { type: any }
      ? Schema["types"][TypeName]["type"]
      : Schema["types"][TypeName]["enumValues"]
  : never;

type InputObject<Fields, Schema extends SchemaLike, Acc = {}> = Fields extends [
  infer F,
  ...infer Rest,
]
  ? InputObject<
      Rest,
      Schema,
      (F extends { name: any; type: any }
        ? F extends { defaultValue?: undefined | null; type: { kind: "NON_NULL" } }
          ? { [N in F["name"]]: UnwrapInputRef<F["type"], Schema, true> }
          : { [N in F["name"]]?: UnwrapInputRef<F["type"], Schema, true> | null }
        : {}) &
        Acc
    >
  : Obj<Acc>;

type InputObjectOneOf<Fields, Schema extends SchemaLike, Acc = never> = Fields extends [
  infer F,
  ...infer Rest,
]
  ? InputObjectOneOf<
      Rest,
      Schema,
      | (F extends { name: any; type: any }
          ? { [N in F["name"]]: UnwrapInputRef<F["type"], Schema, false> }
          : never)
      | Acc
    >
  : Acc;

type UnwrapInputRef<Type, Schema extends SchemaLike, IsOptional> = Type extends {
  kind: "NON_NULL";
  ofType: any;
}
  ? UnwrapInputRef<Type["ofType"], Schema, false>
  : Type extends { kind: "LIST"; ofType: any }
    ? IsOptional extends false
      ? Array<UnwrapInputRef<Type["ofType"], Schema, true>>
      : null | Array<UnwrapInputRef<Type["ofType"], Schema, true>>
    : Type extends { name: any }
      ? IsOptional extends false
        ? ResolveInputScalar<Type["name"], Schema>
        : null | ResolveInputScalar<Type["name"], Schema>
      : unknown;

type UnwrapVarTypeRef<Type, Schema extends SchemaLike, IsOptional> = Type extends {
  kind: "NonNullType";
  type: any;
}
  ? UnwrapVarTypeRef<Type["type"], Schema, false>
  : Type extends { kind: "ListType"; type: any }
    ? IsOptional extends false
      ? Array<UnwrapVarTypeRef<Type["type"], Schema, true>>
      : null | Array<UnwrapVarTypeRef<Type["type"], Schema, true>>
    : Type extends { kind: "NamedType"; name: any }
      ? IsOptional extends false
        ? ResolveInputScalar<Type["name"]["value"], Schema>
        : null | ResolveInputScalar<Type["name"]["value"], Schema>
      : unknown;

type VariablesWalker<Vars, Schema extends SchemaLike, Acc = {}> = Vars extends [
  infer V,
  ...infer Rest,
]
  ? VariablesWalker<
      Rest,
      Schema,
      (V extends { kind: "VariableDefinition"; variable: any; type: any }
        ? V extends { defaultValue: undefined; type: { kind: "NonNullType" } }
          ? { [N in V["variable"]["name"]["value"]]: UnwrapVarTypeRef<V["type"], Schema, true> }
          : { [N in V["variable"]["name"]["value"]]?: UnwrapVarTypeRef<V["type"], Schema, true> }
        : {}) &
        Acc
    >
  : Obj<Acc>;

type VariablesType<Doc, Schema extends SchemaLike> = Doc extends {
  kind: "Document";
  definitions: infer Defs extends readonly unknown[];
}
  ? FirstOperation<Defs> extends { variableDefinitions: any }
    ? VariablesWalker<FirstOperation<Defs>["variableDefinitions"], Schema>
    : {}
  : {};

type OperationKindType<Doc> = Doc extends {
  kind: "Document";
  definitions: infer Defs extends readonly unknown[];
}
  ? [SingleOperation<Defs>] extends [never]
    ? "unknown"
    : SingleOperation<Defs> extends { operation: infer Operation extends string }
      ? Operation
      : "unknown"
  : "unknown";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type InferResultForSchema<T extends string, Schema extends SchemaLike> =
  parseDocument<T> extends infer Doc
    ? Doc extends never
      ? never
      : DocumentType<Doc, Schema>
    : never;

export type InferVariablesForSchema<T extends string, Schema extends SchemaLike> =
  parseDocument<T> extends infer Doc
    ? Doc extends never
      ? never
      : VariablesType<Doc, Schema>
    : never;

export type InferResult<T extends string> = InferResultForSchema<T, StorefrontSchema>;

export type InferVariables<T extends string> = InferVariablesForSchema<T, StorefrontSchema>;

export type InferOperationKind<T extends string> =
  parseDocument<T> extends infer Doc
    ? [Doc] extends [never]
      ? "unknown"
      : OperationKindType<Doc>
    : "unknown";
