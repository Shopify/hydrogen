# 🧑‍🍳 Hydrogen Cookbook

- [🧑‍🍳 Hydrogen Cookbook](#-hydrogen-cookbook)
  - [Recipes](#recipes)
  - [LLM prompts](#llm-prompts)
  - [Usage](#usage)
    - [Apply](#apply)
      - [Syntax](#syntax)
      - [Example](#example)
    - [Generate](#generate)
      - [Syntax](#syntax-1)
      - [Example](#example-1)
      - [Single-file flag (`filePath`)](#single-file-flag-filepath)
    - [Validate](#validate)
      - [Syntax](#syntax-2)
      - [Example](#example-2)
    - [Render](#render)
      - [Syntax](#syntax-3)
      - [Example](#example-3)
    - [Regenerate](#regenerate)
      - [Syntax](#syntax-4)
      - [Example](#example-4)
    - [Update](#update)
      - [Syntax](#syntax-5)
      - [Example](#example-5)
    - [Schema](#schema)
      - [Syntax](#syntax-6)
      - [Example](#example-6)
    - [Skeleton Files](#skeleton-files)
      - [Syntax](#syntax-7)
      - [Example](#example-7)
    - [Affected Recipes](#affected-recipes)
      - [Syntax](#syntax-8)
      - [Example](#example-8)

This is the Hydrogen Cookbook, a collection of example _recipes_ to showcase specific scenarios and usecases for Hydrogen projects.

## Recipes

A _recipe_ is a reproducible sequence of steps meant to be applied to the [skeleton template](/templates/skeleton/).

Each recipe is located in the [cookbook's recipes folder](/cookbook/recipes/) and is structured with a specific set of conventions. This is how a recipe folder is organized:

- `recipe.yaml`: the JSON file containig the whole recipe definition, in a machine-readable format.
- `ingredients/`: a folder containing _new_ files that the recipe introduces. They will be copied as-is to the skeleton template.
- `patches/`: a folder containing patches to be applied to existing files in the skeleton template. The file ↔ patch mappings are defined in the `recipe.yaml` file under the `ingredients` key.
- `README.md`: the human-readable Markdown render of the recipe, based off of the `recipe.yaml` file.

## LLM prompts

Recipes come paired with LLM prompts that can be included in a Hydrogen project to improve the AI-assisted coding experience. The prompts are available in [the llms folder](/cookbook/llms).

## Usage

The cookbook comes with a set of commands for creating and managing recipes. All commands are managed by the main `cookbook.ts` script, which can be invoked from this folder with `npm run cookbook`.

```plain
cookbook.ts <command>

Commands:
  cookbook.ts generate         Generate a recipe from the skeleton's changes
  cookbook.ts render           Render a recipe to a given format
  cookbook.ts apply            Apply a recipe to the current project
  cookbook.ts validate         Validate a recipe
  cookbook.ts regenerate       Regenerate a recipe
  cookbook.ts update           Update a recipe
  cookbook.ts skeleton-files   List all skeleton files referenced by recipes
  cookbook.ts affected-recipes List recipes affected by changes to skeleton files

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

### Apply

`apply` takes a given recipe and applies its steps against the skeleton template.

#### Syntax

```plain
cookbook.ts apply

Apply a recipe to the current project

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
  --recipe   The name of the recipe to apply                 [string] [required]
```

#### Example

```sh
npm run cookbook -- apply --recipe my-recipe
```

### Generate

`generate` will build a recipe folder based on the current changes made to the skeleton template, effectively snapshotting its state into a reproducible recipe.

Additionally, it will also generate the LLM prompt (and related LLM-friendly files) for the recipe.

The workflow for creating a new recipe is as follows:

1. Make the desired changes to the skeleton template
2. (Optional) Mark relevant portions of the code with `@description` comments describing what the changes are doing
3. Run the `generate` command with the recipe name
4. (Optional) Adjust the `recipe.yaml` output as desired, filling in potential missing information (e.g. the recipe title and description)

#### Syntax

```plain
cookbook.ts generate

Generate a recipe from the skeleton's changes

Options:
  --version               Show version number                          [boolean]
  --help                  Show help                                    [boolean]
  --recipe                The name of the recipe to generate [string] [required]
  --onlyFiles             Only generate the files for the recipe, not the
                          recipe.yaml file.                            [boolean]
  --referenceBranch       The reference branch to use for the recipe
                                               [string] [default: "origin/main"]
  --recipeManifestFormat  The format of the recipe manifest file
                                                      [string] [default: "yaml"]
  --filePath              If specified, only generate the diffs for this file
                          (and update any references in the recipe.     [string]
```

#### Example

```sh
npm run cookbook -- generate --recipe my-recipe
```


#### Single-file flag (`filePath`)

If `filePath` is provided, and it points to a file in the skeleton template folder, the command will generate the diff patch **only** for that file, without updating the manifest.

The recipe must exist, as well as a step for that file.

### Validate

`validate` makes sure that a given recipe is valid.

When running it, validate will:

1. Make sure the recipe's JSON file is well-formed
2. Make sure the ingredients are consistent
3. Apply the recipe
4. Install the recipe dependencies
5. Typecheck the template
6. Build the template

If any of these steps fails, the command will terminate with a non-zero exit status.

If no recipe name is provided, all recipes will be validated.

#### Syntax

```plain
cookbook.ts validate

Validate a recipe

Options:
  --version                  Show version number                       [boolean]
  --help                     Show help                                 [boolean]
  --recipe                   The name of the recipe to validate. If not
                             provided, all recipes will be validated.   [string]
  --hydrogenPackagesVersion  The version of Hydrogen to use for the recipe. If
                             not provided, the latest version will be used.
                                                                        [string]
```

#### Example

```sh
npm run cookbook -- validate --recipe my-recipe
```

### Render

`render` takes a recipe and produces a Markdown-based readable version from it, with variants based on the chosen format: `github`, for GH-flavored syntax, and `shopify.dev` for the [shopify.dev](https://shopify.dev) variant.

#### Syntax

```plain
cookbook.ts render

Render a recipe to a given format

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
  --recipe   The name of the recipe to render                [string] [required]
  --format   The format to render the recipe in
                        [string] [required] [choices: "github", "shopify.dev"]
```

#### Example

```sh
npm run cookbook -- render --recipe my-recipe --format github
```

### Regenerate

`regenerate` will apply in sequence: `apply`, `generate`, and `render`.

If no recipe name is provided, all recipes will be regenerated.

This command provides a convenient shorthand to refresh all recipes, particularly useful when cookbook scripts have been modified or enhanced in how they represent output files.

By applying changes across all existing recipes at once, it ensures that every recipe follows the latest implementation of the recipe format.

#### Syntax

```plain
cookbook.ts regenerate

Regenerate a recipe

Options:
  --version          Show version number                               [boolean]
  --help             Show help                                         [boolean]
  --recipe           The name of the recipe to regenerate. If not provided, all
                     recipes will be regenerated.                       [string]
  --onlyFiles        Only generate the files for the recipe, not the recipe.yaml
                     file.                                             [boolean]
  --format           The format to render the recipe in
                          [string] [required] [choices: "github", "shopify.dev"]
  --referenceBranch  The reference branch to use for the recipe
                                               [string] [default: "origin/main"]
```

#### Example

```sh
npm run cookbook -- regenerate --recipe my-recipe --format github
```

### Update

`update` will try to update the given recipe to match the HEAD of the `main` branch and remain applicable.

In case of conflicting changes, `update` will prompt the user to resolve them, reconciling the recipe and saving the changes.

#### Syntax

```plain
cookbook.ts update

Update a recipe

Options:
  --version          Show version number                               [boolean]
  --help             Show help                                         [boolean]
  --recipe           The name of the recipe to update        [string] [required]
  --referenceBranch  The branch to update the recipe from
                                               [string] [default: "origin/main"]
```

#### Example

```sh
npm run cookbook -- update --recipe my-recipe
```

### Schema

`schema` will regenerate the JSON schema for the recipe manifest file off of the Zod schema definition.

#### Syntax

```plain
cookbook.ts schema

Render the recipe JSON schema out of the Recipe type.

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

#### Example

```sh
npm run cookbook -- schema
```

### Skeleton Files

`skeleton-files` lists all skeleton template files that are referenced by recipes (via diffs or ingredients). It maps each file to the recipes that touch it.

Note: `deletedFiles` entries in a recipe are intentionally excluded — files that are unconditionally deleted by a recipe cannot become stale and do not need to be tracked.

#### Syntax

```plain
cookbook.ts skeleton-files

List all skeleton files referenced by recipes (or a specific recipe)

Options:
  --version       Show version number                                  [boolean]
  --help          Show help                                            [boolean]
  --recipe        Recipe name(s) to query (default: all recipes)        [array]
  --json          Output as JSON object instead of formatted text
                                                      [boolean] [default: false]
  --existing-only  Only show files that currently exist in the skeleton
                                                      [boolean] [default: false]
```

#### Example

```sh
# List all skeleton files referenced by any recipe
npm run cookbook -- skeleton-files

# List files for a specific recipe
npm run cookbook -- skeleton-files --recipe my-recipe

# List files for multiple recipes, as JSON
npm run cookbook -- skeleton-files --recipe recipe-a --recipe recipe-b --json

# Only show files that currently exist on disk
npm run cookbook -- skeleton-files --existing-only
```

Default (text) output format:

```
templates/skeleton/app/root.tsx -> [recipe-a, recipe-b]
templates/skeleton/app/server.ts -> [recipe-a]
```

JSON output format (`--json`):

```json
{
  "templates/skeleton/app/root.tsx": ["recipe-a", "recipe-b"],
  "templates/skeleton/app/server.ts": ["recipe-a"]
}
```

### Affected Recipes

`affected-recipes` takes a list of changed skeleton file paths and returns the names of all recipes that reference any of those files. It is called by the pre-commit hook to warn developers when skeleton changes may require recipe updates.

Note: `deletedFiles` entries in a recipe are intentionally excluded — changes to files that a recipe unconditionally deletes cannot make the recipe stale.

#### Syntax

```plain
cookbook.ts affected-recipes [files..]

List recipes affected by changes to the given skeleton files

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
  --files    Repo-relative paths to changed skeleton files
                                                       [array] [default: []]
  --json     Output as JSON array instead of newline-separated names
                                                      [boolean] [default: false]
```

#### Example

```sh
# Check which recipes are affected by a changed file
npm run cookbook -- affected-recipes templates/skeleton/app/root.tsx

# Pass multiple files
npm run cookbook -- affected-recipes \
  templates/skeleton/app/root.tsx \
  templates/skeleton/app/server.ts

# Output as a JSON array (useful for scripting / CI matrix jobs)
npm run cookbook -- affected-recipes --json templates/skeleton/app/root.tsx
```

Default (text) output — one recipe name per line:

```
recipe-a
recipe-b
```

JSON output (`--json`):

```json
["recipe-a", "recipe-b"]
```
