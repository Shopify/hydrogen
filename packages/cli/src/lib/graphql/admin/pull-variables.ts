export const PullVariablesQuery = `#graphql
  query ListStorefronts($id: ID!) {
    hydrogenStorefront(id: $id) {
      id
      environmentVariables {
        id
        isSecret
        key
        value
      }
    }
  }
`;

export interface EnvironmentVariable {
  id: string;
  isSecret: boolean;
  key: string;
  value: string;
}

interface HydrogenStorefront {
  id: string;
  environmentVariables: EnvironmentVariable[];
}

export interface PullVariablesSchema {
  hydrogenStorefront: HydrogenStorefront | null;
}
