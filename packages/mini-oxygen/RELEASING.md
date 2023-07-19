## How to release a new version of the package to npm

- Open a pull request with your changes.
- If your changes should trigger a version update, create a changeset by running `yarn changeset` and following the prompts. If your changes should not trigger a version update (for example, changes to tests or documentation), you can create an empty changeset with `yarn changeset --empty`.
- The Changesets GitHub Action will automatically create a "Release PR" when the pull request is merged.
- Review the "Release PR". It will contain the version updates and changelog entries. If everything looks correct, merge the "Release PR".
- The Changesets GitHub Action will automatically publish the new version to npm when the "Release PR" is merged.
