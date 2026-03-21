---
scope: repo
applies_to:
  - /Users/daeyounglee/Projects/tossminiapp_tshirtsmaker
inherits_from: /Users/daeyounglee/Projects/SKILLS.md
owner: unassigned
status: active
last_reviewed: 2026-03-13
---

# tossminiapp_tshirtsmaker Skills

| Skill name | Intent | Scope | Inputs | Outputs | Triggers | Owner role | Required tools/MCP | Native definition path | Limitations / failure modes | Example use | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ait-html-design-edit` | edit local AIT preview HTML without touching production app code | preview HTML files only | preview HTML, parity target, device layout requirements | updated preview HTML | user asks for visual parity or preview cleanup | worker | filesystem | `/Users/daeyounglee/Projects/tossminiapp_tshirtsmaker/skills/ait-html-design-edit/SKILL.md` | preview-only; does not authorize production code edits | adjust `current-ait-preview.html` for parity | verified |
| portfolio coordination skills | use shared planning and verification skills for repo governance | repo-wide | approved plan, touched surface | normalized docs or validated changes | governance or mixed-surface coordination | coordinator | filesystem, optional Linear | `/Users/daeyounglee/.codex/superpowers/skills`, `/Users/daeyounglee/.codex/skills` | local skill coverage is narrow | normalize repo contracts without touching feature logic | verified via global path |
