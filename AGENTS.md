<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Startup Traffic Light — Agent Working Rules

These rules apply to every coding task in this repository. Follow the user's latest explicit instruction when it is more restrictive than this file.

## 1. Core Operating Principles

### Think before coding
- Prefer read-only inspection before any edit.
- Do not silently assume unclear requirements.
- For non-trivial work, first state the intended approach, assumptions, expected affected files, and verification method.
- If the requested outcome conflicts with existing code, repository rules, or user instructions, stop and report the conflict instead of guessing.
- Do not begin implementation unless the user clearly authorizes implementation.

### Simplicity first
- Prefer the smallest correct change that satisfies the stated acceptance criteria.
- Do not add abstraction, architecture, dependencies, configuration, or fallback behavior unless the task requires it.
- Do not optimize for speculative future requirements.
- Stop when the agreed task is complete.

### Surgical changes
- Modify only files explicitly approved by the user or strictly necessary for the agreed task.
- Preserve behavior outside the requested scope.
- Do not refactor, rename, reorganize, reformat, modernize, or clean up unrelated code.
- Do not add pages, features, UI, copy, environment variables, database changes, or tests unless explicitly requested.
- If another file is needed, stop and explain why before modifying it.

### Goal-driven execution
- Optimize for the user's stated acceptance criteria, not for apparent completeness.
- Do not continue into adjacent improvements, follow-up tasks, or “while we are here” changes unless explicitly requested.
- Treat user manual verification as a separate stage from code-level verification.

## 2. Required Workflow

### Before editing
1. Inspect the relevant code and current Git state read-only.
2. Confirm the task scope and list the intended files to change.
3. State the smallest verification method that fits the task.
4. For high-risk surfaces, report the exact affected path and behavior before proposing edits.

### During editing
- Keep the patch minimal and local.
- Do not make unrelated formatting changes.
- Do not edit generated files unless explicitly requested.
- Do not create duplicate files, backup copies, or temporary files inside the repository unless explicitly requested.
- If the patch behaves unexpectedly, stop and report the actual state instead of attempting broad recovery actions.

### After editing
Always report:
1. Actual modified files.
2. `git diff --stat`.
3. `git diff --check`.
4. The exact verification command(s) run and their result.
5. Any limitation, failure, or pre-existing issue that affects confidence.
6. What still requires user manual verification.

Never claim that manual testing, production verification, payment verification, deployment verification, or browser validation is complete unless the user explicitly provides that result.

## 3. Git and File Safety

Without explicit user instruction, never run:
- `git pull`
- `git push`
- `git commit`
- `git rebase`
- `git reset`
- `git checkout`
- `git restore`
- `git stash`
- `git clean`
- file deletion, move, or overwrite operations
- automatic conflict resolution

Also:
- Never overwrite user changes.
- Never discard uncommitted work.
- Never change branches.
- Never modify lockfiles, package manifests, build configuration, deployment configuration, or environment files unless they are explicitly within scope.
- Do not create commits merely because a task is complete.

## 4. High-Risk Areas

The following require explicit user authorization before any modification:
- Payment flow, ECPay provider logic, payment result handling, callbacks, webhooks, signatures, or order state transitions.
- Production environment variables, secrets, payment credentials, database schema/data, storage, or migration scripts.
- Vercel project settings, deployment configuration, domains, DNS, redirects, or hosting behavior.
- Authentication, authorization, rate limits, abuse prevention, internal request secrets, or security checks.
- `robots.txt`, sitemap generation, canonical URLs, structured data, metadata, or SEO routing.
- Public-facing pricing, refund terms, legal pages, or payment-related copy.

For these areas:
- Inspect read-only first.
- State the exact behavior and files affected.
- Do not modify anything until explicit authorization is received.

## 5. Verification Rules

- Use the smallest relevant validation first.
- Distinguish clearly between:
  - code-level inspection,
  - type-check/build/lint results,
  - environment or network failures,
  - pre-existing failures,
  - user manual verification.
- Do not label a build failure as caused by the current patch without evidence.
- Do not label a deployment as production-ready based only on local code or a Git push.
- Do not fabricate test evidence, browser observations, payment outcomes, or third-party service responses.

## 6. Communication Style

- Be precise and factual.
- Report what was actually observed or changed; do not describe intended work as completed work.
- When blocked, state the blocker, what was inspected, and the smallest safe next action.
- Avoid unnecessary explanations, broad plans, or speculative recommendations.
- Use Chinese for user-facing status reports unless the user requests another language.

## 7. Repository-Specific Priority

For this repository, user acceptance and manual verification take priority over generic best practices, agent defaults, and speculative improvements.

When in doubt:
1. Do less, not more.
2. Preserve existing behavior.
3. Ask for explicit scope expansion before touching additional files.
4. Report the real state honestly.
