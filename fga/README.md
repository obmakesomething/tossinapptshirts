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

Run against `/` with the pack and `--interactive on`:

| | count |
|---|---|
| BLOCK | 0 |
| REVIEW | 11 |
| NOT EVALUATED | 4 |

Of the 11 REVIEW findings, four are the react-native-web false positive
(`primary-action-missing`, `action-clarity` — see below) and the remaining seven
are one problem wearing three names: no screen has lead copy saying why the step
exists or what it costs (`missing-lead-copy`, `why-next-action`, and the three
`graph-*` findings on home that depend on a critical question being answered).

The four NOT EVALUATED are coverage, not defects: three declared contracts the
crawl never reached (`주문하기`, `완성 보기`, `상품 변경`) and the partial crawl
itself. Checkout and everything behind the Toss login are still unobserved.

### Fixed since the first run

Adding `accessibilityRole="header"` to the eight custom screen titles took the
audit from FAIL/27 to REVIEW/17. It cleared `page-title-role`, `hierarchy` — home
rendered a 30px `heroTitle` that classified as body text against a 20px title —
and seven `graph-*` findings that cannot build an attention order without a type
hierarchy to read. Completing the pack then closed the remaining four.

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
