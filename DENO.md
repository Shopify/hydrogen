# Hackdays 34 Update: Exploring Deno - July 28, 2023, 10:38 AM

Project Link: [Hackdays Shopify Project #16535](https://hackdays.shopify.io/projects/16535)

## About using Fresh / Deno stack purely

It was a though, but due to the initial friction of just generating a template and the actual size of the project, I decided to go with a more realistic approach of using Deno as a replacement for nodejs in the current stack rather than rewritting the implementation of hydrogen and hook it up on fresh. It's an other direction that I could consider if Deno was more mature and adopted for large-scaled production apps.

## Create a new hydrogen storefront with Deno

Due to some nodejs dependencies we have, the current canary Deno cannot run the cli right away because of a dependency of implementing `os.userInfo()` which we use to retreive which shell the current user is on.

As of today, v1.35.3 of Deno still doesn't have it implemented, but
the fix will be available in the next Deno release, currently targeting v1.36.0.

But installing locally my patched version of deno. I'm able to run the cli and create a new project.

the command used was `deno run npm:@shopify/create-hydrogen` and it worked as expected meaning it was requesting confirmation for access to the file system, env and network. This was anoying but running with the `--allow-all` or `-A` gets rid of that since.

I also tried the approch of using a `mod.ts` file that does that in case we want to expose our package to the Deno registry. If we do, we could simply run `deno run -A -r https://deno.land/x/create_hydrogen/mod.ts`

The content of the `mod.ts` file is simply for now:

```ts
import {runInit} from 'npm:@shopify/cli-hydrogen/commands/hydrogen/init';

await runInit();
```

Note that I don't like to rewrite things just for the sake of rewritting things but it would be possible to have the whole cli written in Deno, and use `deno package` to create a compatible npm package that exports esm and commonjs modules. This would be something to consider for new project that can grow so largly that running tests or simply the typescript server struggle. Here is a reading that summarize the idea: https://frontside.com/blog/2023-04-27-deno-is-the-easiest-way-to-author-npm-packages/

## Proposed skeleton

Changing the template to propose a Deno skeleton was quite easy, just adding the option under `Deno (esm)`. The only difference is that we don't need to install any dependencies, we can just run the server with Deno.

## Generated skeleton

We don't want to maintain two different base skeletons, so the same we do for the vanilla-js version, we can generate the Deno version from the node-ts version. It's also an option to generate the js and ts versions from the Deno version but I think it's better to keep the original version being the node one since most developpers internally are already used to nodejs.

So, following a blog from EdgeDb about converting their nodejs libraries to Deno, I was able to create my own generator. it's not completed but it basically consist of

1. adding a `.ts` extension to all import definitions
2. prepend all `node_modules` imports with `npm:` to let deno use it's compatibility layer
3. add a file router that replace files with extension `.deno.ts` to `.ts` so we can import them without the `.deno` extension and this would be used as dropin replacement to the `.ts` files that are not compatible with Deno (for example, crypto) which would be replaced with the `.deno.ts` version.

## Following Deno's best practices

Even though this step is not required and everything would work with `npm:` prefix in imports. Some packages are already available in Deno's registry and it's better to use them instead of the compatibility layer. For example, `node:crypto` can be replaced with `https://deno.land/std/node/crypto.ts` and `node:os` with `https://deno.land/std/node/os.ts`. This is not required but it's better to use the Deno's registry when possible for granular control over the versions and the name could be aliased in an importmap instead of writting the full address everytime (same as when writting client-side modules importmaps).

Also would like to rename the entry point of the app for main.ts instead of index.ts, this is not required but it's a convention in Deno and Deno developpers are used to `mod.ts` for libs and `main.ts` for apps.

## Running the project

This has yet to come.

I skipped this part by lack of time but I can still run yarn on the generated project and run normally my store so I can test deployment.

## Deployment

see `Shopify/oxygen-workers`, there's a deno deploy worker
