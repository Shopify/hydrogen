#!/usr/bin/env node

// Keep this wrapper checked in: pnpm links the `hydrogen` command before `dist`
// exists in a clean workspace. `.mjs` keeps its ESM format independent of package settings.
import { runCli } from "../dist/cli/index.mjs";

runCli();
