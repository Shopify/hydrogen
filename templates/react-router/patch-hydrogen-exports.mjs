// TEMPORARY workaround — remove once @shopify/hydrogen exposes "./package.json"
// in its "exports" map (every other Shopify/RR package already does).
//
// The preview build of @shopify/hydrogen omits the "./package.json" export, so
// Node refuses to resolve `@shopify/hydrogen/package.json`. `shopify hydrogen
// deploy` resolves it for Hydrogen version detection during its build, so the
// Oxygen deploy fails under npm with ERR_PACKAGE_PATH_NOT_EXPORTED. (Plain
// `shopify hydrogen build` is unaffected, and pnpm workspace symlinks mask it —
// which is why this skips symlinked installs and never touches the monorepo.)
import { existsSync, lstatSync, readFileSync, writeFileSync } from "node:fs";

const dir = "node_modules/@shopify/hydrogen";
const pkgPath = `${dir}/package.json`;

try {
  if (!existsSync(pkgPath)) process.exit(0);
  // Workspace symlink (pnpm monorepo): never mutate the library source.
  if (lstatSync(dir).isSymbolicLink()) process.exit(0);

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.exports && !pkg.exports["./package.json"]) {
    pkg.exports["./package.json"] = "./package.json";
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log('[patch-hydrogen-exports] added "./package.json" to @shopify/hydrogen exports');
  }
} catch (err) {
  console.warn("[patch-hydrogen-exports] skipped:", err.message);
}
