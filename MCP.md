---
scope: repo
applies_to:
  - /Users/daeyounglee/Projects/tossminiapp_tshirtsmaker
inherits_from: /Users/daeyounglee/Projects/MCP.md
owner: unassigned
status: active
last_reviewed: 2026-03-13
---

# tossminiapp_tshirtsmaker MCP

## Local MCP Inventory

| Server | Purpose | Actual config location | Required or optional | Approval | Status |
| --- | --- | --- | --- | --- | --- |
| portfolio baseline | filesystem, issue coordination, browser/debug helpers | portfolio registry plus client configs | required for governance work; optional for browser checks | portfolio default | configured |
| repo-local server definitions | none verified in repo tree | none | n/a | n/a | candidate |

## Known Limits

- The repo has local skills and runbooks, but no verified file-backed repo-local MCP configuration.
- Apps-in-Toss and iOS validation depend on local simulator/device state, not a repo-local MCP server.

## Failure Handling

- If a future repo-local server is introduced, document the actual config path and auth reference before classifying it as required.
