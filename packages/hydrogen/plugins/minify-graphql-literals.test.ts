import { parse } from "graphql";
import { describe, expect, it } from "vitest";

import { minifyGraphQLLiterals } from "./minify-graphql-literals.ts";

function transform(code: string) {
  const result = minifyGraphQLLiterals().transform(code, "/fixture.ts");

  expect(result).not.toBeNull();

  return result?.code ?? "";
}

describe("minifyGraphQLLiterals", () => {
  it("minifies interpolated template literals without passing JS interpolation syntax to GraphQL", () => {
    const output = transform(`
const FRAGMENT = \`...CartFragment\`;
const query = /* GraphQL */ \`
  query Cart($id: ID!, $country: CountryCode) {
    cart(id: $id) {
      \${FRAGMENT}
      lines(first: 10) {
        nodes {
          id
        }
      }
    }
  }
\`;
`);

    expect(output).toContain(
      "const query = /* GraphQL */ `query Cart($id:ID!$country:CountryCode){cart(id:$id){${FRAGMENT} lines(first:10){nodes{id}}}}`;",
    );

    parse(
      "fragment CartFragment on Cart{id} query Cart($id:ID!$country:CountryCode){cart(id:$id){...CartFragment lines(first:10){nodes{id}}}}",
    );
  });

  it("minifies tagged GraphQL template literals", () => {
    expect(
      transform(`
const query = graphql\`
  query Products {
    products(first: 2) {
      nodes {
        id
      }
    }
  }
\`;
`),
    ).toContain("const query = graphql`query Products{products(first:2){nodes{id}}}`;");
  });

  it("minifies GraphQL member calls and tags by final property name", () => {
    const output = transform(`
const fromCAAPI = CAAPI.client.gql(\`
  query Product {
    product(handle: "snowboard") {
      id
    }
  }
\`);

const fromStorefront = storefront.graphql(\`
  query Shop {
    shop {
      name
    }
  }
\`);

const fromTag = CAAPI.graphql\`
  query Collections {
    collections(first: 1) {
      nodes {
        id
      }
    }
  }
\`;
`);

    expect(output).toContain(
      'const fromCAAPI = CAAPI.client.gql(`query Product{product(handle:"snowboard"){id}}`);',
    );
    expect(output).toContain(
      "const fromStorefront = storefront.graphql(`query Shop{shop{name}}`);",
    );
    expect(output).toContain(
      "const fromTag = CAAPI.graphql`query Collections{collections(first:1){nodes{id}}}`;",
    );
  });

  it("removes #graphql markers from untagged template literals", () => {
    expect(
      transform(`
const query = \`
  #graphql
  query Shop {
    shop {
      name
    }
  }
\`;
`),
    ).toContain("const query = `query Shop{shop{name}}`;");
  });
});
