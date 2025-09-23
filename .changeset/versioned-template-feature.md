---
"@shopify/cli-hydrogen": minor
"@shopify/create-hydrogen": minor
---

Add support for scaffolding Hydrogen projects from specific versions

Developers can now create Hydrogen projects from any previously released version, ensuring compatibility with existing storefronts and maintaining version consistency across projects.

### Usage

```bash
# Using npm create
npm create @shopify/hydrogen@latest -- --version 2025.4.0

# Using npx with the CLI directly  
npx @shopify/cli-hydrogen init --version 2025.4.0

# With quickstart options
npm create @shopify/hydrogen@latest -- --version 2025.1.0 --quickstart
```

### Features

- **Exact version scaffolding**: Fetches the exact skeleton template from the specified Hydrogen release
- **Dependency pinning**: All dependencies are pinned to the exact versions from that release
- **Full CLI support**: Works with all existing init options (language, styling, i18n, routes, etc.)
- **GitHub API integration**: Automatically resolves version tags to the correct commit
- **Rate limit handling**: Supports `GITHUB_TOKEN` environment variable to bypass GitHub API rate limits

### Version Format

Versions must follow the Hydrogen release format: `YYYY.MM.P` where:
- `YYYY` is the year
- `MM` is the quarter month (1, 4, 7, or 10)
- `P` is the patch number

Example: `2025.4.0`, `2025.1.3`, `2024.10.2`