## Working on Hydrogen-UI

There are two ways you can develop Hydrogen-UI components:

- Develop components in isolation (faster & easier):
  1. Run `yarn dev:story` in the hydrogen-ui directory to spin up an instance of [Ladle](https://ladle.dev/)
  2. Edit the component or the component's story `[ComponentName].stories.tsx`
- Develop components in a demo app (good for testing out the ecosystem support)
  1. Run `yarn dev`

## Authoring Components

- Exports should all be named; avoid using default exports
- The main exported component's name should match the name of the file
- Use the global variable `__HYDROGEN_DEV__` to `throw` errors in dev mode, and `console.error` in production mode
  - If using `__HYDROGEN_DEV__` in a compound `if()` statement, it must be the first check. Otherwise the `if()` statement will not be fully removed in the production bundle.
- Prefer a flat file structure over folders
- Colocate similar things into a single file: for example, a Context Provider and a hook that uses that context should be together.

## Writing Tests

- Tests should live next to the component
- Tests should end with `*.test.ts(x)` (NOT `.spec.ts(x)`)
- Tests should be wrapped with an outer describe('<ComponentName />')
- Use react-testing-library to test React components
- Use factories (faker) instead of hardcoded fixtures
- Tests should use `it` for the test block, and the text should read like a sentence

## Writing Stories

- Stories must end with `*.stories.tsx`
- If a component's props are not complex, then you can provide controls and only have one story
- If the props are vastly different (for example, Metafield), then create a story for each type of prop

## Test and Story Helpers

If you need a helper function that is shared between the tests and stories files, then you can create a file caled `{name}.test.helpers.ts(x)`.

- The function can't go into the test file, because when the story file imports it, it will also import Vitest and cause things to break
- The function can't go into the story file, because when you export it, it shows up as a story in the storybook/ladle navigation

## Package Exports Notes:

- Until ESLint can resolve package.exports, we added hydrogen-ui to `.eslintrc.js`->`node/no-missing-import.allowModules`

## Updating the Storefront API version

Processes that need to happen:

- Create a new branch for the version, e.g. `2022-10`.
- Do a find & replace in the code to replace nearly all instances of the old version with the new version.
  - However, don't replace documentation unless it makes sense.
  - Also be careful that some versions of the Storefront API don't exactly match code here: for example, SFAPI `2022-07` could be both `2022-07` and `2022-7` in this codebase.
- Run the `graphql-types` NPM script to generate the new types.
  - If there are new scalars, or scalars are removed, update the `codegen.yml` file's custom scalar settings and run the command again.
- Search for all instances of `@deprecated` and see if it is time to make that breaking change
- Run the `ci:checks` NPM script and fix any issues that may come up.
- Manually update the `package.json` `version` to the latest. Note that you can't have a leading `0` in the version number, so for example Storefront API `2022-07` would have to be `2022.7.0`
- Once you feel that everything is ready:
  - Do one last `ci:checks`
  - Push the branch up to Github. Do _not_ make a Pull Request - we want the older Storefront API branch to stay as a snapshot of the code that was there at that release.
- Change the default branch in Github to the newly-created branch.
- Create a new changelog and PR to officially publish the new version
