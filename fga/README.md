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
git apply ../fga/fga-engine-korean-cta.patch

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

| stage | routes |
|---|---|
| Entry | `/`, `/open` |
| Browse Garments | `/products` |
| Design | `/editor` |
| Review Design | `/preview` |
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

## The engine patch

`fga-engine-korean-cta.patch` adds this product's CTAs to the crawler's
progression lexicon. The engine knows `계속|다음|시작하기|선택|둘러보기|요금제`;
ours are `지금 만들어보기`, `사진 올리기`, `주문하기`, so it found zero controls
to click. Navigation verbs only — the commit-form guard, not the word list, is
what keeps a payment button unclicked.

Worth sending upstream: any Korean storefront whose buttons do not happen to say
`시작하기` gets a silently empty graph.

## What the first audit found

`BLOCK 0` on every screen. Of the REVIEW findings, these are the ones worth acting on:

- **`hierarchy`** — home's body/lead text measures 30px against a 20px page
  title. `heroTitle` really is `fontSize: 30`, and because it carries no heading
  role the classifier reads it as body.
- **`page-title-role`** — no heading semantics on the editor title. `ui.tsx` sets
  `accessibilityRole="header"` in three places, but `editor`, `index` and `order`
  each build their own header and none of them got it.
- **`missing-lead-copy`**, **`why-next-action`** — no copy saying why the step
  exists, what happens next, or what it costs.

One fix — heading roles on the three custom headers — plausibly clears
`page-title-role`, `hierarchy`, and the `graph-*` findings that depend on type
hierarchy to build an attention order.

### Do not act on these

`primary-action-missing` and `action-clarity` fire on every screen and are wrong.
react-native-web puts the button on an ancestor and the label in a `div` with no
role, so the DOM pass sees no action. Two things in the engine's own output
contradict it:

- `visionAnalysis.primaryCta` — `present: true`, `"사진 올리기"`, 25px, 5.44
  contrast.
- the crawler **navigated by clicking that button**:
  `home::default → /editor via "지금 만들어보기"`, `evidence: OBSERVED_INTERACTION`.

A report that clicks a button and then says the screen has no detectable action
is describing its own DOM reader, not the product.

## Not evaluated yet

- `action-outcome-consistency` — the crawler observed where each button went, but
  the pack declares no expected outcome to check it against. Declaring those
  (sequence contracts) is the next layer.
- `required-stage` — inherited from the generic pack's audit logic, which lists
  required stages for a payment-review flow. This pack has not declared its own.
- Coverage is `partial`: 2 of 2 discovered screens. Checkout and everything
  behind the Toss login were never reached.
