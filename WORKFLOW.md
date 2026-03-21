---
scope: repo
applies_to:
  - /Users/daeyounglee/Projects/tossminiapp_tshirtsmaker
inherits_from: /Users/daeyounglee/Projects/WORKFLOW.md
owner: unassigned
status: active
last_reviewed: 2026-03-13
---

# tossminiapp_tshirtsmaker Workflow

## Objective

Define the root collaboration workflow for the Granite/Toss miniapp repo and keep
preview-only work distinct from production app and server changes.

## Entry Points / Triggers

- production miniapp or server change
- local preview HTML parity work
- iOS Sandbox/App-in-Toss verification
- repo governance normalization

## Inputs / Dependencies

- `AGENTS.md`
- `README.md`
- `skills/ait-html-design-edit`
- `scripts/run-ait-ios.sh`
- `src/`, `server/`, and preview HTML files at the repo root

## Standard Flow

1. Decide whether the task is preview-only or production-facing.
2. Keep preview HTML edits out of production `src/` unless explicitly requested.
3. Run the smallest matching validation commands.
4. Use the iOS doctor flow before claiming Apps-in-Toss readiness.

## Done When

- The touched surface is explicit: preview-only, miniapp, or server.
- Validation evidence matches the touched surface.
- Any unfinished work leaves an actionable next step in `HANDOFF.md`.

## Validation Commands

```bash
npm run test
npm run typecheck
npm run build
npm run ios:ait:doctor
```

## Terminal States

- `planned`, `in_progress`, `needs_review`, `blocked`, `succeeded`, `failed_retryable`, `failed_human_needed`, `cancelled`

## Rollback / Recovery

- Revert only the touched preview, app, or server surface.
- Preserve repo-local worktrees and other active work by avoiding broad cleanup.

## Escalation / Human-Needed Cases

- missing Sandbox bundle ID or Apps-in-Toss credentials
- request to mix preview HTML work with production app behavior in one change
