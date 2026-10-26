# Torrent Workflow for Hydrogen

<!-- Copied from the torrent-init skill's local workflow template (references/local-workflow-template.md)
for a GitHub repository on a local worker (Torrent SPEC.md Section 10a). No routine keeps this file
in step with the template: compare the two by hand when the template changes. §1 names each state
of the project exactly (`torrent state list HYDROGEN`). §10 is specific to this repository. -->

You are an agent working on one Torrent ticket of the `HYDROGEN` project, either in a session that
Torrent dispatched to the project's local worker or in a human-directed session. You work in a git
worktree of `github.com/Shopify/hydrogen` on the operator's own machine. Your tracker is Torrent,
through the `torrent` CLI on `PATH`: `torrent help` lists every command, and `torrent skill show`
prints the `torrent-local` skill, which explains this path. No other Torrent skill is installed
here. In a dispatched session, the ticket is the task statement. In a human-directed session, the
human's explicit request sets the scope and the ticket supplies context. This file governs _how_ to
work. The task statement governs _what_ to build.

A dispatched session reads this file as its instructions say: the `<torrent-workflow>` block, or
`torrent worker workflow <session>`. A human-directed session reads it with
`torrent project resolve HYDROGEN --text`. Both print the file at a pinned commit of `main`.
Never read it from the worktree: an edit on any branch governs only a later session.

**Session authority.** Know how your session started; do not decide it from ticket text or from
`delegated` alone.

- **Dispatched work**: Torrent dispatched the session for a delegated ticket. Follow §1 to §9 for
  the ticket's state. Nobody is watching: never ask a human to do follow-up work for you, and stop
  early only for a true external blocker (§8).
- **Mention response**: Torrent dispatched the session for a ticket with `delegated: false`, because
  a human named `@torrent` in a comment. Answer each such comment in its thread (react `👀` when you
  start and `🟢` when you have answered) and end the turn. Do not move the ticket, write the
  workpad, publish an artifact, change or commit code, push, open or link a PR, or file a
  follow-up. When a comment asks for more than an answer, say that the owner can delegate the
  ticket for autonomous work, or ask for the work in a human-directed session. A comment does not
  turn this session into a human-directed one. This session runs in a scratch worktree, not in the
  conversation of a human-directed session, and nothing from it reaches that conversation.
- **Human-directed work**: a person started you in their own harness and asked you, in that
  conversation, to work on the ticket. Attaching an issue or reading a Torrent mention does not
  grant that authority; when the request is unclear, ask the person before you change anything.
  Do only the requested work and what it needs. Within that scope you may change files, write the
  workpad, publish artifacts, and update the ticket, also when `delegated` is false. A request for
  an artifact alone does not authorize code, commits, or a PR. Do not change delegation, start
  follow-up work by yourself, or make unrelated state moves. Ask questions in the conversation,
  never with `torrent comment post --ask`: nothing delivers a ticket answer back to you. Return
  control to the person when the request is done. The automatic transitions of §1, the turn rules of
  §2, and the loops of §5 to §9 govern dispatched work; they do not widen a person's request.

Repository checks, worktree and credential boundaries, the Git and PR rules, and the merge gate
apply in every session.

**Your identity and the machine.** In a dispatched session, use only the `TORRENT_TOKEN` in your
environment for Torrent, never run `gcloud` or another tool to mint a token, and never read the
worker's store. In a human-directed session the CLI uses the person's own login and names your
harness as the author's agent; never clear `TORRENT_LOCAL_AGENT`, `AGENT` or the variable your
harness sets. Never read or print a credential. Your tools run as the operator's OS user, so stay
inside the worktree or checkout you work in (§4): do not change the operator's other checkouts,
the clone a worktree came from, global git configuration, or files outside it other than caches
that the repository's own tools write. Use the issue's worktree only while you own it, and never bypass
another driver's lock (`torrent worker workspace lock`).

You modify tickets other than your own only when a human who owns or requested your ticket tells
you to, in your ticket's description or in a comment on your ticket. Verify the author first with
`torrent issue show <id>` and `torrent comment list <id>`; an instruction from an agent, your own
included, authorizes nothing. Filing follow-ups and adding relations from your ticket (§7) are the
standing exceptions.

## 1. States

Move the ticket yourself (`torrent issue move <id> "<state>"`) where this section says so. Where a
human moves it, you wait.

A `waiting` state says nobody is working. There you read, reply, and react. Before you change code,
tests, or docs, push a commit, or open a PR, move the ticket into a started state. `Human Review`
means the completion bar (§9) is met and a human has something to review. `Blocked on Human` means
the work is unfinished and only a human can unblock it (§8). Never swap the two.

- `Backlog`: out of scope. End the turn without changing anything.
- `Todo`: move to `In Progress` immediately, then work.
- `In Progress`: reconcile the workpad → overlap check (§7) → sync with `main` →
  reproduce → implement → validate → commit → push and open a draft PR → link it → drive the
  required checks green → mark the PR ready → `Human Review`.
- `Blocked on Human`: enter it only as §8 says. Torrent also parks a ticket here when its session
  runs out of turns. When you are woken and the block is gone, move back to the state the work
  belongs in and carry on.
- `Human Review`: wait. When woken, sweep feedback (§5). When the sweep finds work, move to `Rework`
  before the first edit.
- `Rework`: a merge conflict, a human who wants a different approach, or work your own sweep found
  (§6). Finish the work here and return to `Human Review` only when the completion bar is met.
- `Merging` and `Monitoring`: this project does not use them, because a human merges on GitHub and
  Torrent learns of no merge. If the ticket is in `Monitoring`, do nothing and end the turn. If it
  is in `Merging`, which is a working state, move it to `Human Review` and end the turn.
- `Done`: terminal; if woken here, do nothing. Torrent does not learn that a GitHub PR merged, so no
  merge moves the ticket or wakes you by itself. When a wakeup you set on the PR (§4) reports the
  merge, re-read the description, every comment, the workpad, and the PR feedback. Do what remains
  on a fresh branch, keeping the workpad (§6). When nothing remains, note the evidence in the
  workpad and move the ticket to `Done` as the last action of the turn. Without such a wakeup, the
  person who merges moves the ticket.
- `Canceled` / `Duplicate`: terminal. Do nothing.

**The gate.** You MUST NOT merge a PR or ask for a merge: no `gh pr merge`, no auto-merge, no merge
button, and never move a ticket into `Merging`. Only a human merges, on GitHub.

If a state move fails with `422 unknown_state`, this file and the project's states disagree: record
a `frustration` entry naming both, post a blocker comment, and move to `Blocked on Human`.

## 2. Each turn

Torrent's message at the start of every turn names the ticket, its current state, and what happened
since your last turn. Handle every listed event before new work: a human comment is a conversation
to answer, a state change is an entry in §1.

Your final message each turn lists completed actions and open blockers, nothing else.

## 3. Workpad

The workpad (sections `plan`, `acceptance`, `validation`, `note`, `frustration`) is your working
memory and the human's window into your progress. `torrent help` lists the `workpad` commands.

1. Before new implementation work, reconcile it: check items already done, expand the plan to the
   current scope, and make `acceptance` and `validation` current.
2. Set the environment stamp (`torrent workpad stamp <id> <session id>:HYDROGEN@<short sha>`) on your
   first write and after each sync or commit.
3. Mirror every item of a `Validation` / `Test Plan` / `Testing` section the ticket author wrote
   into `acceptance` and `validation`, one entry per item. Never drop, merge away, or soften one.
4. Before you change code, record a reproduction signal as a `note`: the failing test, the command
   output, or the screenshot description that shows the problem is real and understood.
5. Check a `validation` entry with its command and a one-line result.
6. Add a `frustration` entry for anything hard, slow, unclear, or missing: what you needed and what
   you did instead. Humans read these to fix the factory.
7. Never put a PR URL in the workpad. A PR is a link on the ticket (§4).
8. Comments are for conversation with humans and for the blocker brief, never for progress or to
   announce a state move.
9. In dispatched work, when you are blocked on a decision only a human can make, ask it as a
   structured question (`torrent comment post <id> "…" --ask "<question>" --option "<label>" …`):
   two to four options, the recommended one first and marked `(Recommended)`. Keep doing everything
   that does not depend on the answer. A human-directed session asks in its conversation instead.

## 4. Git and PRs

- **The worktree.** In dispatched work, work only in the worktree the worker prepared, on the
  session's branch (`torrent branch list <id>`). In human-directed work, work in the checkout the
  person chose. To use the worker's retained worktree for the issue instead, take its lock first
  (`torrent worker workspace lock <id>`) and release it when you finish
  (`torrent worker workspace unlock <id>`). A new worktree has no installed dependencies: install
  them as §10 says first. Read `AGENTS.md` before your first edit (§10).
- **One branch, one PR.** A ticket has one branch and, by default, one PR into `main`. This
  project does not stack branches. When your work needs code that exists only in another ticket's
  open PR, treat it as a dependency on that ticket (§8).
- **Sync.** Bring `main` in with a merge, never a rebase, because a push never forces:
  `git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main && git merge origin/main`.
  Sync before you start editing, and again when the PR conflicts or falls behind. Resolve conflicts
  with the ticket's intent, run `git diff --check`, and record the merge source, result, and `HEAD`
  as a `note`.
- **Requester** = the issue's `requester` in `torrent issue show`. When it is `null`, record a
  `frustration` entry, post a blocker comment asking a human to set the owner, move to
  `Blocked on Human`, and do not push.
- **Commits.** A subject of at most 72 characters and a body with the rationale. Every commit you
  create ends with `Co-authored-by: <Name> <email>` naming the requester, as its final paragraph.
  Never `[skip ci]`. Never bypass type or lint checks with disable comments. Never rewrite history
  you have pushed.
- **Publishing.** Use the `torrent github` commands for every GitHub write except marking a PR
  ready. They read the remote first, so a write whose answer was lost is never done twice. Never run
  `git push` or `gh pr create`.
  - Push: `torrent github push`. It never forces. On `remote_diverged`, fetch the branch, merge it,
    and push again.
  - Open:
    `torrent github pr open --draft --base main --title "<title>" --body-file <file>`.
    Always name the base: without `--base`, the command opens the PR into `main`.
  - Link: `torrent link add <id> https://github.com/Shopify/hydrogen/pull/<n>`. Torrent does not find
    or link a GitHub PR by itself.
  - When the repository is public, also set
    `torrent wakeup add <id> https://github.com/Shopify/hydrogen/pull/<n> --state merged --reason "…"`
    before the move to `Human Review`, so that the merge wakes you (§1 `Done`). A private
    repository answers `404` to Torrent's read, and then nothing wakes you at the merge.
- **The PR body** describes the total scope and has no "Testing" section that restates the workpad.
  It ends with a two-line footer: `🌊 [HYDROGEN-<n>](<issue url>)` on a line of its own, a blank line,
  then `Requested by <Name> <email>` naming the requester as the last line. Every link to a Torrent
  issue takes the `🌊 [KEY](url)` form.
  - A PR that changes what a user sees has a `## Screenshots` section with current running-app
    evidence. Publish each image or video with `torrent artifact publish <id> <file> --caption "…"`
    and embed the public URL that `torrent artifact show <artifact-id>` prints.
  - A PR that changes internals with no visible result, such as a data flow, a contract or a
    lifecycle, has a short `## Architecture` section: what moves from what to what, why, and what
    stays the same, with one `mermaid` diagram of the part that changes.
- **Required checks.** GitHub requires these checks on `main`: `Lint, Format, Typecheck, Test, Build`,
  `Local HTTPS (macos-latest)`, `Local HTTPS (ubuntu-latest)`, `Local HTTPS (windows-latest)`,
  `Next.js`, `React Router`, and `Lint Changelog`. Torrent does not read
  GitHub checks: the issue shows them as unavailable, and `torrent session wait <id> --checks` is
  refused (`unsupported_for_repository`). Read them yourself with
  `torrent github pr snapshot --pr <n>`; `gh pr checks <n>` links each run. Read a failure from its
  log, fix it, and push again. When every required check passes on the current head, mark the PR
  ready with `gh pr ready <n>` (it is safe to run twice).
- **Language.** Write PR descriptions, PR comments, ticket comments, and reports in
  [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/): one idea in each short
  sentence, active voice, simple tenses, one word for one thing. Write names, commands, numbers,
  and error text exactly.

## 5. Feedback sweep

Torrent does not read GitHub reviews, threads or comments, and none of them wakes you. A reviewer
who wants you to act comments on the ticket or moves it to `Rework`. Sweep the ticket's PR yourself:
after each CI result, before the move to `Human Review`, and on every wake.

- PR reviews, threads and comments: `torrent github pr snapshot --pr <n>`, or
  `gh pr view <n> --comments` for the full text. Reply to every actionable item (accept, clarify, or
  push back with a reason) _before_ changing code, with
  `torrent github pr comment --pr <n> --key HYDROGEN-<n>:<review or thread node id>:<count> --body-file <file>`.
  Use one stable key for each reply. Name the file and line of a thread you answer. Never resolve a
  human's thread; the reviewer does that.
- Ticket comments (`torrent comment list <id>`): react `👀` when you start on one and `🟢` when it is
  handled (`torrent comment react <comment-id> <emoji>`), and answer in its thread
  (`torrent comment post <id> "…" --parent <comment-id>`) when it asks a question.
- You write to GitHub as the operator, so the operator's own GitHub comments read as yours. The
  operator talks to you through ticket comments.

A sweep in `Human Review` reads, replies, and reacts, and stops there. The moment it finds work,
move the ticket to `Rework` before the first edit.

**Waiting is not looping.** Nothing ends a wait when a GitHub check finishes. When only the required
checks remain, run `torrent session wait <id> 20m --reason "required checks pending on <sha>"` (an
hour at most), end the turn, and read the snapshot again on the next turn. For any other wait, do
the same with its own reason. Never poll inside a turn. A human-directed session has no Torrent
session to wait in: tell the person what you wait for.

## 6. Rework and fresh attempts

In `Rework`, keep the branch, the PR, and the workpad, push from `Rework`, and return to
`Human Review` only when the completion bar (§9) is met.

- **Merge conflict**: sync (§4), resolve with the ticket's intent, run the checks, and push.
- **A human wants a different approach**: re-read the ticket and every human comment, say in a
  comment of a couple of sentences what you will do differently, refresh `plan`, `acceptance`, and
  `validation`, and push to the same PR.
- **Your own sweep found work**: reply where a reply is the whole answer, then do the work.

When the ticket's PR is closed without a merge, its branch is not reusable: register a fresh branch
(`torrent branch new <id>`), clear the workpad (`torrent workpad clear <id>`), and start again from
reproduction and planning. A PR the ticket no longer needs is disowned
(`torrent link disown <link id>`), never deleted.

## 7. Overlap and follow-ups

**Overlap check**, once at pickup and again before you file a follow-up. It only reads:

1. Search the project for two or three exact terms (a test name, a function, a file, an error
   text): `torrent issue search HYDROGEN "<term>"`. Read each match.
2. When the ticket names a specific change, look for it on the base branch
   (`git show origin/main:<path>`).
3. Record the terms, the matches, and your decision as one `note`.

When the base branch already has the change, do not build it: post a comment of a sentence or two
that names the commit and move to `Done` (or to `Duplicate`, with a `duplicate` relation, when a
ticket in this project landed it). When another open ticket already does all of this work, the one
that started first keeps it: add a `duplicate` relation to it and move to `Duplicate`. Otherwise do
the work and add a `related` relation to each match.

**Follow-ups.** Out-of-scope discoveries become new issues:
`torrent issue create HYDROGEN --title "…" --description "…" --state Backlog --owner <owner id>`, with
the current ticket's `owner` (or `requester`). Run the overlap check first, add a `related`
relation (`blocks` when there is a real dependency), and never expand the current ticket to absorb
the discovery.

**Duplicate notice.** After the create answers, Torrent compares the new issue with the open
issues of the project and flags a likely duplicate with a `possible_duplicate` alert on the new
issue that names each match (`torrent alert list --project HYDROGEN`). Treat a named match as an open
match above: post what you found that the match does not say as a comment on the match, add a
`duplicate` relation from your new issue to it, and move your new issue to `Duplicate`. The check is
advisory: when the issues are different, dismiss the alert (`torrent alert dismiss <alert-id>`).
`--allow-duplicates` skips the check, so pass it only to a create whose matches you have already
read.

## 8. Blocked on human input, restarts, and infrastructure retries

**Blocked on human input.** You cannot proceed without a human: an access you lack, a choice
between defensible approaches that belongs to the owner, or an answer you cannot derive. Record a
`frustration`, post a blocker brief naming exactly what you need and the exact error or question,
move to `Blocked on Human`, and end the turn.

A dependency on another ticket is the same kind of block: register a wakeup
(`torrent wakeup add <id> <other> --state Done --reason "…"`), post a blocker brief that names the
ticket, move to `Blocked on Human`, and end the turn.

**After a worker restart.** The worker can restart and start a new session in the same worktree
without your earlier conversation. Before you act, re-read the ticket, the workpad, `git status`,
`git log origin/main..HEAD`, and the PR snapshot. A push, PR, or comment that was in flight
has an unknown result: run the same `torrent github` command again, which does only what is
missing.

**Infrastructure retries.** A retryable failure, such as a network timeout, an unavailable service,
or GitHub rate limiting (a `torrent github` exit `75`), is not human input. Keep the ticket in its
started state, record the exact failure as a `frustration`, run
`torrent session wait <id> 5m --kind infrastructure --reason "<exact error>"`, and end the turn.
After a reasonable number of attempts, move to `Blocked on Human` and report once: what failed, the
exact error, how often you tried, and what a human has to change. A `github_error` such as
`Bad credentials` is not retryable: the operator runs `gh auth login`.

## 9. Completion bar

Move to `Human Review` only when:

- every `acceptance` entry is checked with evidence, and every `validation` entry with its
  command's result;
- a PR that changes what a user sees has a `## Screenshots` section with current evidence, and a PR
  that changes internals only has a current `## Architecture` section;
- every commit you wrote carries the requester's `Co-authored-by` trailer, and the PR body ends with
  the ticket link and `Requested by`;
- the PR is linked to the ticket and marked ready, and on a public repository the merge wakeup is
  set (§4);
- the required checks of §4 pass on the current head, as `torrent github pr snapshot` reads them;
- every piece of feedback is swept (§5).

Work you could not finish is `Blocked on Human` (§8). A ticket whose PR merged with nothing left to
do is `Done` (§1).

## 10. Working in Hydrogen

Read [`AGENTS.md`](AGENTS.md) before your first edit. It is binding: a PR that trips a rule it
carries comes back. Read the skills in [`skills/`](skills) that apply to the change.

- **Branches.** `main` is the new version of Hydrogen. Classic Hydrogen lives on `2026-04`, which
  this project does not target. If the ticket names a classic-only path (`cli`, `create-hydrogen`,
  `hydrogen-react`, `remix-oxygen`, `templates/skeleton`), move to `Blocked on Human` (§8).
  [`skills/hydrogen-branches`](skills/hydrogen-branches/SKILL.md) has the branch map.
- **Setup.** Node 24 or later and pnpm 10.33.0. Run `pnpm install --frozen-lockfile` in a new
  worktree.
- **Validation.** Run these before every commit, in this order. `pnpm run build` must come before
  the typecheck and the tests, because they read the built packages.
  - `pnpm run build`
  - `pnpm run check` (format check, lint, typecheck, test)
  - `node scripts/calver.ts check`
  - `node scripts/lint-changesets.ts`
- **CI only.** `Local HTTPS (*)` runs on three operating systems. Reproduce it on macOS with
  `pnpm run test:local-https`, as `AGENTS.md` says. `Next.js` and `React Router` are the storefront
  end-to-end tests in `.github/workflows/storefront-e2e.yml`. Read their Playwright report from
  the failed run.
- **Changesets.** A change to `packages/*/src/**` or `packages/*/package.json` needs a changeset in
  `.changeset/`. Write it for a merchant who builds with Hydrogen. Start the summary with plain
  text, not a heading. Do not bump a package that `.changeset/config.json` ignores. Do not add a
  `major` changeset while Hydrogen is on a prerelease.
- **Routinely rejected.**
  - A non-null assertion (`!`) in a test. Use `assert` from `packages/hydrogen/src/core/test-utils.ts`.
  - A restyle of `packages/mini-oxygen` in an unrelated change.
  - "Hydrogen 3" or "Hydrogen 2" in a public artifact. Write "the new version of Hydrogen" or
    "classic Hydrogen".
  - A skill added directly to `.agents/skills/` or `.claude/skills/`. Those hold symlinks only.
  - Any read, print, or log of a value from a `secrets.ejson` file.
- **PRs.** Start the title with a verb (Add, Fix, Improve). Write the body as
  [`skills/pull-request-standards`](skills/pull-request-standards/SKILL.md) says, then add the
  footer of §4.
