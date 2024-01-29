export function getGraphiQLUrl({
  host = '',
  graphql,
}: {
  host?: string;
  graphql?: {
    query: string;
    variables: string | Record<string, any>;
    schema?: string;
  };
}) {
  let url = `${host.endsWith('/') ? host.slice(0, -1) : host}/graphiql`;

  if (graphql) {
    let {query, variables} = graphql;
    if (typeof variables !== 'string') variables = JSON.stringify(variables);

    url += `?query=${encodeURIComponent(query)}${
      variables ? `&variables=${encodeURIComponent(variables)}` : ''
    }`;

    if (graphql.schema) {
      url += `&schema=${graphql.schema}`;
    }
  }

  return url;
}
