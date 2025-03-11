# 🧑‍🍳 Hydrogen Cookbook

- [🧑‍🍳 Hydrogen Cookbook](#-hydrogen-cookbook)
  - [Recipes](#recipes)
  - [Usage](#usage)
    - [Apply](#apply)
      - [Syntax](#syntax)
      - [Example](#example)
    - [Generate](#generate)
      - [Syntax](#syntax-1)
      - [Example](#example-1)
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


This is the Hydrogen Cookbook, a collection of example _recipes_ to showcase specific scenarios and usecases for Hydrogen projects.

## Recipes

A _recipe_ is a reproducible sequence of steps meant to be applied to the [skeleton template](/templates/skeleton/).

Each recipe is located in the [cookbook's recipes folder](/cookbook/recipes/) and is structured with a specific set of conventions. This is how a recipe folder is organized:

- `recipe.json`: the JSON file containig the whole recipe definition, in a machine-readable format.
- `ingredients/`: a folder containing _new_ files that the recipe introduces. They will be copied as-is to the skeleton template.
- `patches/`: a folder containing patches to be applied to existing files in the skeleton template. The file ↔ patch mappings are defined in the `recipe.json` file under the `ingredients` key.
- `README.md`: the human-readable Markdown render of the recipe, based off of the `recipe.json` file.

## Usage

The cookbook comes with a set of commands for creating and managing recipes. All commands are managed by the main `cookbook.ts` script, which can be invoked from this folder with `npm run cookbook`.

```plain
cookbook.ts <command>

Commands:
  cookbook.ts generate    Generate a recipe from the skeleton's changes
  cookbook.ts render      Render a recipe to a given format
  cookbook.ts apply       Apply a recipe to the current project
  cookbook.ts validate    Validate a recipe
  cookbook.ts regenerate  Regenerate a recipe
  cookbook.ts update      Update a recipe

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

The workflow for creating a new recipe is as follows:

1. Make the desired changes to the skeleton template
2. (Optional) Mark relevant portions of the code with `@description` comments describing what the changes are doing
3. Run the `generate` command with the recipe name
4. (Optional) Adjust the `recipe.json` output as desired, filling in potential missing information (e.g. the recipe title and description)

#### Syntax

```plain
cookbook.ts generate

Generate a recipe from the skeleton's changes

Options:
  --version          Show version number                   [boolean]
  --help             Show help                             [boolean]
  --recipe           The name of the recipe to generate
                                                 [string] [required]
  --onlyFiles        Only generate the files for the recipe, not the
                     recipe.json file.                     [boolean]
  --referenceBranch  The reference branch to use for the recipe
                                   [string] [default: "origin/main"]
```

#### Example

```sh
npm run cookbook -- generate --recipe my-recipe
```

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
  --version  Show version number                           [boolean]
  --help     Show help                                     [boolean]
  --recipe   The name of the recipe to validate. If not provided,
             all recipes will be validated.                 [string]
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

This command is intended to be a shorthand

#### Syntax

```plain
cookbook.ts regenerate

Regenerate a recipe

Options:
  --version          Show version number                               [boolean]
  --help             Show help                                         [boolean]
  --recipe           The name of the recipe to regenerate. If not provided, all
                     recipes will be regenerated.                       [string]
  --onlyFiles        Only generate the files for the recipe, not the recipe.json
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
