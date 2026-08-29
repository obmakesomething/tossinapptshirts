# FGA audit setup

What it takes to get a real audit of this app out of
[fga-engine](https://github.com/obmakesomething/fga-engine), and what the first
one measured.

## Run it

```bash
# 1. the harness serves the screens without a Toss login
npx vite --config harness/vite.config.mts

# 2. the engine, with this product's pack
git clone https://github.com/obmakesomething/fga-engine
cd fga-engine && npm install && npx playwright install chromium
cp -r ../fga/packs/goodsgpt packs/
git apply ../fga/fga-engine.patch

npm run audit:url -- \
  --url "http://localhost:5188/?bare=1" \
  --pack packs/goodsgpt \
  --interactive on \
  --max-pages 8 \
  --viewport mobile-390x844
```

`--interactive on` is not optional here. This is a react-native-web SPA: it has
no `<a href>` anywhere, so link-following discovers nothing and every graph rule
runs on a one-node graph with no edges. The first run without it reported
`interactionsExecuted: 0` and twelve graph findings that meant nothing.

## The pack

`packs/goodsgpt` declares which service stage each route belongs to. Without it
the engine loads `generic@0.0.1 (status: stub)` and every screen reports
`location` and `stage-mapping` — it cannot say where a screen sits in a journey
nobody described to it.

The route list is app truth, read off `src/router.gen.ts`. **Which stage each
route belongs to is authored judgement and has not been confirmed by the product
owner** — `status: extracted`, `requiresHumanConfirm: true`.

The journey lost a stage. `/preview` was a screen whose job was to show the
design bigger and judge the photo's resolution; the editor's canvas is already
the design at the size being judged, so the screen was deleted and Review
Design went with it. Reviewing now happens inside Design, which is what was
actually true even before the screen was removed.

| stage | routes |
|---|---|
| Entry | `/`, `/open` |
| Browse Garments | `/products` |
| Design | `/editor` |
| Checkout / Payment | `/order` |
| Confirmation | `/order-complete` |
| Post-purchase | `/orders`, `/order-detail` |
| Saved Designs | `/designs` |
| Account | `/my` |
| Support / Contact | `/faq`, `/inquiry` |
| Legal | `/terms`, `/privacy` |

One gotcha worth writing down: the matcher substring-tests
`route + " " + routeKey`, so an `exact: ["/"]` rule never fires — home matches on
its route key. And `/order` swallows `/order-complete`, `/order-detail` and
`/orders` unless those are declared first. Rules are order-sensitive.

## The engine patches

`fga-engine.patch` carries two changes, both worth sending upstream.

**The progression lexicon knows no Korean commerce verbs.** The crawler matches
`계속|다음|시작하기|선택|둘러보기|요금제`; this app's buttons say
`사진 올리고 시작하기`, `사진 올리기`, `주문하기`. It found zero controls to
click, so the crawl never left the first screen. The patch adds navigation verbs
only — the commit-form guard, not the word list, is what keeps a payment button
unclicked. Any Korean storefront whose buttons do not happen to say `시작하기`
gets a silently empty graph.

**The URL capture dropped the engine's own explicit role channel.**
`inferTextRole` reads `data-fga-role` at confidence 1.0 — it is the declared way
for an app to name a text role — but `audit-url` collected only
`aria-label, role, type, placeholder, alt, href`, so the attribute never reached
the rule and every text fell back to the heuristic. That matters most for React
Native Web, where there is no `<h1>` and no `<p>`: every `Text` is a `div` with
generated class names, so a declaration is the *only* way to say "this is lead
copy". Adding it cleared `missing-lead-copy` on both screens and
`why-next-action` on home.

## What the pack declares

`stage-rules.json` maps route to journey stage (table above).
`audit-logic.config.json` lists those stages as required — the generic pack
ships that list empty, which is why every screen came back "mapped stage is not
in the required stage list".
`action-contracts.json` says what each control on the design-to-order path is
supposed to do. The engine watches what a click actually did; without a
declaration it has an observation and nothing to check it against.

Contracts are declared for controls the crawl cannot currently reach, on
purpose. The engine then reports them as NOT EVALUATED with a reason, which is
the point: an unchecked checkout should be a stated gap rather than a silence.

## Where the audit stands

Run against `/` with the pack, both patches and `--interactive on`:

| | first run | now |
|---|---|---|
| BLOCK | 0 | 0 |
| REVIEW | 27 | 9 |

What is left:

- **3 are the react-native-web false positive** — `primary-action-missing` ×2
  and `action-clarity` (see below).
- **3 are home's critical-question findings** — `graph-critical-answer-type-priority`,
  `graph-weak-critical-answer`, `graph-unresolved-user-question`. Home now states
  price and lead time before the CTA, which cleared `why-next-action`, but the
  graph still reads the question as weakly attended. Needs judgement, not another
  patch.
- **1 `spacing-matrix` on the editor** — measured against the option row, which
  no longer exists: 변경 and its summary were replaced by garment chips and
  colour swatches in place. Needs a re-run to say whether it survived.
- **1 `why-next-action` on the editor.**
- **1 `action-outcome-consistency`** — an artifact of the crawl clicking controls
  in sequence without closing what the previous click opened, so the second click
  lands on an overlay.

### Cleared, and what did it

| change | cleared |
|---|---|
| `accessibilityRole="header"` on eight custom titles | `page-title-role`, `hierarchy`, 7 × `graph-*` |
| completing the pack (required stages + action contracts) | `required-stage` ×2, `action-outcome-consistency` ×2 |
| `data-fga-role` on lead copy + the capture patch | `missing-lead-copy` ×2, `why-next-action` on home |
| title→lead gap raised past 16px | `spacing-matrix` ×2 |
| making only 변경 a button, not the whole row | `cta-height`, `cta-placement`, `viewport-role-band` |

### Do not act on these

`primary-action-missing` and `action-clarity` are wrong. react-native-web puts
the button on an ancestor and the label in a `div` with no role, so the DOM pass
sees no action. Two things in the engine's own output contradict it:

- `visionAnalysis.primaryCta` — `present: true`, `"사진 올리기"`, 25px, 5.44
  contrast.
- the crawler **navigated by clicking that button**:
  `home::default → /editor via "지금 만들어보기"`, `evidence: OBSERVED_INTERACTION`.

A report that clicks a button and then says the screen has no detectable action
is describing its own DOM reader, not the product.

## Not evaluated

- One declared contract the crawl never reaches — `주문하기`. Declared on
  purpose so the gap is stated rather than silent.
- `완성 보기` and `상품 변경` were deleted along with the preview screen and the
  garment picker that moved inline. A contract for a control that no longer
  exists is not a stated gap, it is a false one.
- Coverage is `partial`: 2 of 2 discovered screens. Checkout and everything
  behind the Toss login are still unobserved.

## What the one-screen change did to this

The audit numbers above were measured against a four-screen flow: home picked a
category, the editor placed the photo, a sheet over the design picked colour and
size, and 완성 보기 opened a fourth screen. That is now one screen, so the
findings above are stale in a specific way — they describe screens and controls
that are gone.

What changed that this pack cares about:

- `/preview` is deleted, and with it the Review Design stage.
- `OptionSheet` is deleted. Garment and colour are chips and swatches on the
  editor itself, so `상품 변경` and the 변경 entry point no longer exist.
- Size and quantity are on the editor beside the price, not behind a sheet.
- The order screen asks Toss for the delivery details rather than showing nine
  input fields, so its DOM is a summary and two inputs where it used to be a
  form. `토스에서 배송지 가져오기` only appears after a refusal.

The crawl also could not previously reach anything behind the Toss login —
`appLogin` is mocked in the harness but the code it returns is exchanged against
the production API, which localhost cannot call. `?session=1` seeds a stub
envelope and `?consent=decline|old|unconfigured` picks a fallback path, so
checkout is now reachable for the first time. The coverage line in the last run
said `partial: 2 of 2 discovered screens`; a re-run should discover more.

**These findings have not been re-measured against the new flow.** The pack is
updated; the report is not.
