---
name: ait-html-design-edit
description: Use when editing the AIT design-preview HTML (`current-ait-preview.html`) for visual parity work (layout, spacing, colors, fixed action area, mobile viewport clipping, and device toggle), without changing production AIT app code.
---

# AIT HTML Design Edit Skill

## Goal
Edit `/Users/daeyounglee/tossminiapp_tshirtsmaker/current-ait-preview.html` quickly and safely for design review.

## Scope
- Design parity only.
- No production AIT integration.
- No auth/payment/runtime wiring.

## Device baseline
- iPhone preset:
`393x852`, safe area `top 47`, `bottom 34`.
- Galaxy preset:
`360x800`, safe area `top 36`, `bottom 20`.
- Keep device toggle enabled so both can be compared in one file.

## Edit workflow
1. Update tokens first in `:root` and `.app` custom properties.
2. Keep each `.screen` inside the phone frame with internal vertical scroll:
`overflow-y: auto`, `overflow-x: hidden`.
3. Keep fixed action bar pinned to bottom using `.fixed-actions`.
4. For screens with fixed bottom CTA, keep `.screen.with-fixed` extra bottom padding.
5. Keep route/state names stable:
`home`, `editor`, `generate`, `preview`, `order`.
6. If changing order UI, preserve these interactions:
`수정/완료`, `색상 스와치`, `사이즈 라인 추가`, `수량 +/-`.

## Safe edit zones
- Structure and style:
`<style>` block (`.app`, `.screen`, `.fixed-actions`, device classes).
- Rendering:
`render*` functions in `<script>`.
- Interaction:
event listeners near bottom of `<script>`.

## Guardrails
- Do not move this work into `/src` unless explicitly requested.
- Do not remove device query sync (`?device=iphone|galaxy`).
- Do not switch to responsive full-page web layout; keep phone-frame simulation.

## Local preview commands
```bash
cd /Users/daeyounglee/tossminiapp_tshirtsmaker
python3 -m http.server 4173 --bind 127.0.0.1
```

Open:
`http://127.0.0.1:4173/current-ait-preview.html?device=iphone`

## Done checklist
- Home screen layout matches target hierarchy and spacing.
- All screens clip to device frame and scroll internally.
- Bottom area is hidden until scroll on short devices.
- Device toggle switches dimensions and safe-area correctly.
- Order edit UI states are visually distinguishable in both `수정` and `완료`.
