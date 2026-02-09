# Cookbook recipe: validate, apply, fix rejections, and summarize

Use this prompt when you need to **apply a Hydrogen Cookbook recipe** to the skeleton template, **resolve any patch failures** (.orig / .rej), and **produce a short summary** of what was done.

---

## Your goal

1. **Validate** the recipe (optional but recommended).
2. **Apply** the recipe to the skeleton.
3. **If apply leaves .orig or .rej files:** fix the affected files so the recipe’s intended changes are present and artifacts are removed.
4. **Summarize** what failed (if anything), what you changed, and the final state.

---

## Step 1: Validate the recipe

From the **repository root** (where `package.json` and `cookbook/` live):

```bash
npm run cookbook -- validate --recipe <RECIPE_NAME>
```

Example: `npm run cookbook -- validate --recipe multipass`

- If validation fails, fix the reported issues (e.g. schema, missing files) before applying.
- You can skip this step if the user only wants apply + fix.

---

## Step 2: Apply the recipe

From the **repository root**:

```bash
npm run cookbook -- apply --recipe <RECIPE_NAME>
```

Example: `npm run cookbook -- apply --recipe metaobjects`

- The command copies **ingredients** (new files) and applies **patches** (edits to existing files) to `templates/skeleton/`.
- If the skeleton has drifted from the commit the patches were generated from, some patches may **fail** or apply with **fuzz**, leaving:
  - **`.orig`** – backup of the file before the patch (created when patch runs or applies with offset).
  - **`.rej`** – **rejected hunks** (parts of the patch that could not be applied).

---

## Step 3: Find and fix .orig / .rej artifacts

After apply, search the repo for leftovers:

- **`.orig`** – e.g. under `templates/skeleton/` (path will be next to the patched file).
- **`.rej`** – same base path as the patched file.

For **each** affected file (each file that has a `.orig` or `.rej`):

### 3a. Identify the intended change

- Open the **patch file** in `cookbook/recipes/<RECIPE_NAME>/patches/` that corresponds to this target file (e.g. `fragments.ts.026109.patch` for `app/lib/fragments.ts`).
- The patch is a **unified diff**: lines starting with `-` are removed, lines with `+` are added. The rest is context.
- Infer the **intent**: e.g. “add RECOMMENDED_PRODUCT_FRAGMENT at end of file”, “add crypto-js to dependencies”, “add session and customerAccessToken in cart action”.

### 3b. Compare current file vs .orig vs .rej

- **Current file** (e.g. `templates/skeleton/app/lib/fragments.ts`) – what’s in the tree now.
- **`.orig`** – snapshot of the file **before** the patch ran (may match “pre-recipe” state).
- **`.rej`** (if present) – the **rejected hunks** in patch format; these are the edits that did **not** apply.

Determine:

- Whether the **intended change is already present** in the current file (e.g. the same block was added by another recipe or a prior run). If yes, no code edit is needed; only remove artifacts.
- If the intended change is **not** present: apply it manually (see below), then remove artifacts.

### 3c. Apply missing changes manually (when needed)

- For **code/TS/TSX files:**  
  Re-apply the logical edit from the patch (or from the .rej content): add the same imports, the same block of code, or the same structural change. Match the recipe’s intent; adapt to current formatting/indentation if the skeleton has changed.

- For **package.json:**  
  Patches often fail due to version or formatting changes. Apply the **semantic** change only, e.g.:
  - Add a dependency: ensure the key exists in `dependencies` or `devDependencies` with the version from the patch (or a compatible one).
  - Do not rely on exact line numbers or surrounding context; just add/update the entry in the right section.

- For **other config/docs:**  
  Same idea: apply the intended addition/change from the patch or .rej; preserve existing content and style of the current skeleton.

### 3d. Remove artifacts

- Delete the **`.orig`** file for that target (e.g. `templates/skeleton/app/lib/fragments.ts.orig`).
- Delete the **`.rej`** file for that target (e.g. `templates/skeleton/app/lib/fragments.ts.rej`).

Repeat 3a–3d for every file that has a .orig or .rej.

---

## Step 4: Summarize

Produce a short **summary** for the user. Include:

1. **Recipe name** and that apply was run.
2. **What failed (if anything):**  
   - Which files had a `.orig` and/or `.rej` (e.g. `app/lib/fragments.ts`, `package.json`).
   - **Why** (one line each): e.g. “package.json patch expected `@shopify/hydrogen: 2025.7.2`, skeleton has `2025.10.0`”; “fragments.ts context mismatch / fuzz apply left .orig”.
3. **What you did to resolve:**  
   - For each such file: “Added RECOMMENDED_PRODUCT_FRAGMENT to fragments.ts”; “Added crypto-js to dependencies in package.json”; “Removed fragments.ts.orig and package.json.rej.”
4. **Final state:**  
   - “All recipe changes are applied; no .orig or .rej files remain. Run `npm install` in templates/skeleton if dependencies were added.”

Use a short table if helpful, e.g.:

| File / artifact      | Reason (if failed)        | Action taken                    |
|----------------------|---------------------------|---------------------------------|
| fragments.ts / .orig | Fuzz or context mismatch  | Confirmed fragment present; deleted .orig |
| package.json / .rej  | Version/format mismatch   | Added crypto-js; deleted .rej   |

---

## Quick reference: patch and artifact locations

- **Recipe definition:** `cookbook/recipes/<RECIPE_NAME>/recipe.yaml`  
  Lists steps and which patch file applies to which target file (path relative to `templates/skeleton/`).
- **Patches:** `cookbook/recipes/<RECIPE_NAME>/patches/*.patch`  
  One patch file per modified file; filename often looks like `path.to.file.ts.abc123.patch`.
- **Artifacts:** next to the **target** file under `templates/skeleton/`, e.g.:  
  `templates/skeleton/app/lib/fragments.ts.orig`  
  `templates/skeleton/package.json.rej`

---

## Example flow (metaobjects, one failure)

1. `npm run cookbook -- validate --recipe metaobjects` → passes.
2. `npm run cookbook -- apply --recipe metaobjects` → finishes but reports backup/rejections.
3. Find: `templates/skeleton/app/lib/fragments.ts.orig` (no .rej).
4. Read `cookbook/recipes/metaobjects/patches/fragments.ts.026109.patch`: adds `RECOMMENDED_PRODUCT_FRAGMENT` at end of `fragments.ts`.
5. Compare: current `fragments.ts` already contains that fragment → no code change; delete `fragments.ts.orig`.
6. Summary: “Metaobjects apply left one artifact: fragments.ts.orig. Current fragments.ts already had RECOMMENDED_PRODUCT_FRAGMENT. Deleted fragments.ts.orig. No .rej. Recipe apply is complete.”

Use this prompt so an LLM can reliably validate, apply, fix, and summarize Cookbook recipe runs against the latest skeleton.
