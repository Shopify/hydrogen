---
'@shopify/cli-hydrogen': minor
---
Adds new command line flag options for the `deploy` command:

- `custom-build`: Allows users to specify that the build command in the package.json should be used to build the project, instead of the default build function. This provides more flexibility for projects that have custom build processes.
- `no-lockfile-check`: Allows users to skip the lockfile check during the build process. This can be useful in scenarios where you want to bypass the lockfile check for certain reasons, such as in monorepos, where the lockfile resides in the root folder.

