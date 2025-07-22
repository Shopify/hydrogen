# Deploy (Skeleton) Workflow

## Overview
The `deploy.yml` workflow automatically deploys the Hydrogen skeleton template to Oxygen. The skeleton template serves as the base starter template for new Hydrogen projects, making it critical that it's always deployed and functional.

## Trigger Conditions
- **Event**: All pushes to any branch
- **Automatic**: Deploys on every commit

## Oxygen Configuration
- **Storefront ID**: 1000014875
- **Template**: Skeleton (base Hydrogen template)

## Permissions
- `contents: read` - Read repository content
- `deployments: write` - Create deployment records

## Job Details

### Job: deploy
- **Name**: Deploy to Oxygen
- **Runs on**: `ubuntu-latest`
- **Timeout**: 30 minutes
- **Purpose**: Deploy the skeleton template to validate it works on Oxygen

#### Steps

1. **Checkout Code**
   - Uses: `actions/checkout@v4.2.2`
   - Fetches the repository code

2. **Setup Node.js**
   - Uses: `actions/setup-node@v4.4.0`
   - Node version from `.nvmrc`
   - Caches npm dependencies

3. **Cache Node Modules**
   - Uses: `actions/cache@v4.2.3`
   - Caches `~/.npm` directory
   - Cache key: `OS-build-cache-node-modules-[lockfile-hash]`
   - Fallback keys for partial matches

4. **Install Dependencies**
   - Command: `npm ci`
   - Installs all monorepo dependencies

5. **Build Packages**
   - Command: `CI=true npm run build:pkg`
   - Environment: `CI=true` for optimized builds
   - Builds all packages required by the skeleton

6. **Deploy to Oxygen**
   - Working directory: `templates/skeleton`
   - Command: `npx shopify hydrogen deploy --no-lockfile-check`
   - Uses deployment token from secrets

## Environment Variables
- `SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN`: Maps to secret `OXYGEN_DEPLOYMENT_TOKEN_1000014875`

## Purpose and Benefits

### Why Deploy the Skeleton?
1. **Template Validation**: Ensures the starter template always works
2. **Continuous Testing**: Every change is tested in production environment
3. **Developer Confidence**: Developers know the template they're using is functional
4. **Quick Feedback**: Issues with the template are caught immediately

### What is the Skeleton Template?
- Base template for `npm create @shopify/hydrogen`
- Contains minimal Hydrogen setup
- Includes essential configurations
- Starting point for all new Hydrogen projects

## Deployment Process
1. Every push triggers a deployment
2. Packages are built fresh for each deployment
3. The skeleton is deployed with latest package versions
4. Deployment happens regardless of branch

## Comparison with Examples Deployment
Unlike the examples workflow which deploys multiple apps:
- This deploys only the skeleton template
- Simpler configuration (no matrix)
- Critical for new project creation
- Uses a single deployment token

## Troubleshooting

### Common Issues
1. **Build Failures**: 
   - Check that all packages build successfully
   - Verify no TypeScript errors

2. **Deployment Token**: 
   - Ensure `OXYGEN_DEPLOYMENT_TOKEN_1000014875` is set
   - Token must have deployment permissions

3. **Lockfile Issues**: 
   - The `--no-lockfile-check` flag bypasses validation
   - Useful for monorepo deployments

## Security Considerations
- Deployment token stored as repository secret
- Token is never exposed in logs
- Only has permissions for skeleton storefront

## Impact
This workflow ensures that:
- New developers can always create working projects
- The getting-started experience is smooth
- Template issues are caught before affecting users
- The skeleton reflects latest Hydrogen capabilities