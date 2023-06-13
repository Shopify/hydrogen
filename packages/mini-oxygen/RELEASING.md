## How to release a new version of the package to npm

- Checkout the `main` branch
- Make sure that there are changesets for the changes made since the last version.
- If there are some missing, create them with `npx changeset`.
- Now run `npx changeset version`.
- Commit the changes with the version `git commit -m "vX.X.X"`.
- Tag the commit with the new version `git tag vX.X.X`.
- Push the changes `git push --follow-tags` or you can push the tag separately `git push && git push origin vX.X.X`.
- Go to [shipit](https://shipit.shopify.io/shopify/mini-oxygen/production) and click on `Deploy` for the latest commit.
