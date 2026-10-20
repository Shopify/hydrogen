---
name: hydrogen-branches
description: >
  Branch map for the Shopify/hydrogen repo: where the new version of Hydrogen (informally
  "Hydrogen 3") vs classic Hydrogen (informally "Hydrogen 2") live, the June–October 2026
  divergence between them, and which branch to target or rebase onto. Use when picking a base
  branch, rebasing or retargeting a PR, porting changes between new vs classic Hydrogen, or deciding
  what happened to the preview branch.
---

# Hydrogen Branch Map

`main` is the new version of Hydrogen. Classic Hydrogen lives on the `2026-04` back-fix branch.
Both were developed in parallel from June to October 2026, so new vs classic Hydrogen diverged —
details below.

Naming: never write "Hydrogen 3" or "Hydrogen 2" in public artifacts (docs, changelogs, PR
descriptions, support replies). Externally they are "the new version of Hydrogen" and "classic
Hydrogen" (also "legacy Hydrogen"). The README phrases them by version: "Hydrogen 2026-10 or
later" and "Hydrogen 2026-04 and earlier"; public changelogs use neither phrase.

## Where everything lives

| Branch | Contents | Use it for |
| --- | --- | --- |
| `main` | The new version of Hydrogen (2026.10.x as of Oct 2026), framework-agnostic | All new development; PRs formerly targeting `preview` |
| `2026-04` | Classic Hydrogen (2026.4.x), React Router 7 only | Classic back-fixes and back-fix releases |
| `do-not-delete-h2-backup-use-2026-04-branch` | Frozen snapshot of pre-takeover `main` (classic Hydrogen) | Nothing — backup only, never target or delete it |
| `preview` | Dead pre-release branch for the new version | Nothing — its final tree became `main` via #4162, which merged a rebuilt copy of preview's history (new SHAs), not preview itself |
| `dist` | Compiled templates for the new version | Nothing — generated; force-pushed by `main`'s Release workflow, downloaded by `hydrogen setup` |
| `dist-preview` | Compiled templates read by `hydrogen setup` up to 2026.10.1 | Nothing — no longer updated; keep it so those versions can still scaffold |

`2026-04` and the backup branch are protected: deletions and force-pushes are blocked, and merges
require an approving review. `.github/workflows/release.yml` on each branch is the source of truth
for what gets released where.

## The new version vs classic Hydrogen

- **Classic Hydrogen** (`2026.4.x`): built specifically for React Router 7. Last major is `2026.4`
  — the `2026.7` major was skipped entirely (no 2026.7.x was ever published).
- **The new version** (`2026.10.0`, first released 2026-10-09): a significant rewrite.
  Framework-agnostic (React Router, Next.js, Astro, Nuxt, SolidStart, SvelteKit) with a different
  code layout.

Hydrogen uses CalVer `YYYY.MAJOR.MINOR`, where `MAJOR` is the quarterly Storefront API release
month (`1`, `4`, `7`, `10`).

To tell which line a change belongs to: `cli`, `create-hydrogen`, `hydrogen-codegen`,
`hydrogen-react`, `remix-oxygen`, and `templates/skeleton` exist only on `2026-04` (classic) —
a complete list, since the classic line gets no new packages. `main` (the new version) has
`hydrogen` and `mini-oxygen`, among others. A diff touching classic-only paths is classic work.

One exception: shared packages like `mini-oxygen` exist in both lines' trees but are changed and
released from `main` only — never merge changes or cut releases for them from `2026-04`.

## Timeline

1. **2026-06-11**: `preview` forked from `main` (at `e73813faa`) to develop the new version.
2. **2026-06-16**: `preview`'s history was rewritten with new SHAs. From this point the two lines
   share no recent history — their merge-base is a 2022 commit.
3. **June – October 2026**: parallel development. The new version on `preview`, classic Hydrogen
   on `main`.
4. **2026-10-09**, in order:
   - `main` (classic Hydrogen) was copied to `2026-04`, and a second snapshot
     (`do-not-delete-h2-backup-use-2026-04-branch`) was kept as backup. #4157 then pointed release
     automation at `2026-04`.
   - `main` was overwritten with `preview`'s exact content (takeover, #4162).
   - The new version was released as `2026.10.0` from `main` (#4163).

## The divergence gotcha

The new version's tree descends from **June's** `main`, not October's. Some classic-Hydrogen fixes
that landed on `main` between June and October never reached the new version (others, like the
MiniOxygen fixes, were ported). To audit exactly what landed on the classic line after the fork,
use the frozen backup branch:

```bash
git log --first-parent --oneline e73813faa..origin/do-not-delete-h2-backup-use-2026-04-branch
```

**Git history misleads after the takeover — in both directions.** The takeover was a real merge
that kept classic Hydrogen's history reachable (old `main` as first parent) while taking the tree
wholesale from the rebuilt preview copy — so ancestry no longer implies content. June–Oct
classic-Hydrogen commits show up in `git log main` and pass `git merge-base --is-ancestor` even
though their changes are absent from `main`'s tree. The reverse also holds: commits merged into
`preview` were rebuilt with new SHAs, so a preview SHA (including a PR's GitHub merge commit) is
never an ancestor of `main` even when its change is there — search by PR number instead:
`git log origin/main --grep='(#4022)'`. In both cases, verify against file content, not history.

These gotchas are simply the cost of the approach that best preserved history: the takeover merged
with old `main` as first parent, keeping every commit on both lines reachable. The alternatives
were worse — force-pushing `preview` over `main` would have orphaned the classic line's history
entirely, and content-merging dozens of divergent fixes into a foreign code layout meant
hand-porting every one of them, each port a chance to get it wrong.

The rewritten history also breaks retargeted PRs: most preview-based PRs now target `main` but
were never rebased — they show thousands of commits and a 2022 merge base. Don't plain-rebase
one; that replays ~2,800 old commits. Move only the PR's own commits instead (this works
whichever `preview` commit the branch started from — only branches cut before the 2026-06-16
rewrite are different). If the PR still targets `preview`, retarget it to `main` first:

```bash
git rebase --onto origin/main 011651af6   # 011651af6 = preview's final tip
```
