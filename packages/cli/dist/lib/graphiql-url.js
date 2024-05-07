function getGraphiQLUrl({
  host = "",
  graphql
}) {
  let url = `${host.endsWith("/") ? host.slice(0, -1) : host}/graphiql`;
  if (graphql) {
    let { query, variables } = graphql;
    if (typeof variables !== "string")
      variables = JSON.stringify(variables);
    url += `?query=${encodeURIComponent(query)}${variables ? `&variables=${encodeURIComponent(variables)}` : ""}`;
    if (graphql.schema) {
      url += `&schema=${graphql.schema}`;
    }
  }
  return url;
}

export { getGraphiQLUrl };
