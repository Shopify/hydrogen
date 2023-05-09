This can be used to test mini-oxygen.

You can run `yarn` from this directory to install the local package.

If you run into an error like `An unexpected error occurred: "unsure how to copy this: ...Shopify/mini-oxygen/.git/fsmonitor--daemon.ipc"`, then run `git fsmonitor--daemon stop` and then re-run `yarn`.

Then you can run `yarn oxygen-preview` to start up mini-oxygen.
