export const IMPORT_MAPPINGS = {
  '@shopify/remix-oxygen': '@shopify/hydrogen/oxygen',
  '@remix-run/react': 'react-router',
  '@remix-run/node': 'react-router',
  '@remix-run/cloudflare': 'react-router',
  '@remix-run/server-runtime': 'react-router',
  'react-router-dom': 'react-router'
} as const;

export const COMPONENT_RENAMES = {
  'RemixServer': 'ServerRouter',
  'RemixBrowser': 'HydratedRouter'
} as const;

export const REMIX_PACKAGES = [
  '@remix-run/react',
  '@remix-run/dev',
  '@remix-run/node',
  '@remix-run/cloudflare',
  '@remix-run/server-runtime'
] as const;

export const HYDROGEN_VERSION_RANGE = {
  from: '>=2025.4.0 <2025.7.0',
  to: '2025.7.0'
} as const;

export const REACT_ROUTER_VERSION_RANGE = {
  from: '>=7.6.0 <7.9.0',
  to: '7.9.0'
} as const;