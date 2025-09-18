# Deploy Examples Workflow

## Overview
The `deploy-examples.yml` workflow automatically deploys example Hydrogen applications to Shopify's Oxygen hosting platform. This ensures that example apps are always up-to-date and accessible for developers to reference.

## Trigger Conditions
- **Event**: All pushes to any branch
- **Automatic**: Deploys on every commit

## Oxygen Configuration
- **Storefront ID**: 1000014888 (defined in workflow header)
- **Platform**: Shopify Oxygen

## Permissions
- `contents: read` - Read repository content
- `deployments: write` - Create deployment records

## Job Details

### Job: deploy
- **Purpose**: Build and deploy example applications
- **Runs on**: `ubuntu-latest`
- **Timeout**: 30 minutes
- **Strategy**: Matrix build for multiple examples

#### Matrix Configuration
The workflow deploys three example applications in parallel:

1. **metaobjects**
   - Token ID: 1000014928
   - Example showcasing Shopify metaobjects usage

2. **third-party-queries-caching**
   - Token ID: 1000014929
   - Example demonstrating caching strategies for third-party queries

3. **custom-cart-method**
   - Token ID: 1000014930
   - Example showing custom cart implementation

#### Steps

1. **Checkout Code**
   - Uses: `actions/checkout@v4.2.2`

2. **Setup Node.js**
   - Version from `.nvmrc`
   - Caches npm dependencies

3. **Cache Node Modules**
   - Additional caching layer for `~/.npm`
   - Key pattern: `OS-build-cache-node-modules-[lockfile-hash]`
   - Improves build performance

4. **Install Dependencies**
   - Command: `npm ci`
   - Installs all monorepo dependencies

5. **Build Packages**
   - Command: `CI=true npm run build:pkg`
   - Builds all packages needed by examples

6. **Deploy to Oxygen**
   - Working directory: `examples/${{ matrix.examples.name }}`
   - Command: `npx shopify hydrogen deploy`
   - Flags:
     - `--no-lockfile-check`: Skips lockfile validation
     - `--diff`: Shows deployment differences
     - `--token`: Uses example-specific deployment token

## Environment Variables

### Deployment Metadata
- `SHOPIFY_HYDROGEN_FLAG_METADATA_DESCRIPTION`: Set to commit message

### Deployment Tokens
Each example has its own deployment token:
- `OXYGEN_DEPLOYMENT_TOKEN_1000014888`: Main storefront
- `OXYGEN_DEPLOYMENT_TOKEN_1000022490`: Additional storefront
- `OXYGEN_DEPLOYMENT_TOKEN_1000014892`: Additional storefront
- `OXYGEN_DEPLOYMENT_TOKEN_1000014928`: metaobjects example
- `OXYGEN_DEPLOYMENT_TOKEN_1000014929`: third-party-queries-caching example
- `OXYGEN_DEPLOYMENT_TOKEN_1000014930`: custom-cart-method example

## Deployment Process

1. **Continuous Deployment**: Every push triggers deployment
2. **Parallel Execution**: All examples deploy simultaneously
3. **Diff Generation**: Shows what changed in each deployment
4. **Metadata Tracking**: Commit messages are attached to deployments

## Benefits

1. **Always Current**: Examples reflect latest code changes
2. **Live Demos**: Developers can interact with running examples
3. **Automated Testing**: Deployments validate that examples work
4. **Change Tracking**: Deployment diffs show what updated

## Adding New Examples

To add a new example to the deployment:

1. Add entry to the matrix:
   ```yaml
   {name: 'example-name', token: 'token-id'}
   ```

2. Add the deployment token to the env block:
   ```yaml
   OXYGEN_DEPLOYMENT_TOKEN_[token-id]: ${{ secrets.OXYGEN_DEPLOYMENT_TOKEN_[token-id] }}
   ```

3. Ensure the example exists in `examples/[example-name]`

## Troubleshooting

Common issues:
- **Token errors**: Verify deployment tokens are set in repository secrets
- **Build failures**: Ensure packages build before deployment
- **Timeout**: 30-minute limit for complex deployments
- **Lockfile issues**: The `--no-lockfile-check` flag bypasses lockfile validation

## Security
- Deployment tokens are stored as repository secrets
- Each example has its own token for isolation
- Tokens are never exposed in logs