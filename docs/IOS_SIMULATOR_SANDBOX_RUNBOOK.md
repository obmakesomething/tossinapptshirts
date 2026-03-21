# Apps-in-Toss iOS Simulator Runbook

Scope: fix and prevent `-10814` / `There is no registered handler for URL scheme intoss` while running MiniApp `merchandisegpt`.

## Root Cause (Most Common)
- `intoss://...` is sent to iOS LaunchServices from outside Sandbox (`simctl openurl`), but no OS-level handler is available.
- Wrong Sandbox build/bundle is installed (for example stale ent/test build).
- Sandbox internal prerequisites are skipped (login/workspace/app selection/approval).

## Team Rules (Do Not Break)
- Do not launch MiniApp by `xcrun simctl openurl ... intoss://...`.
- Keep one official Sandbox build only on simulator.
- Always run doctor checks before touching app code.
- Keep `granite.config.ts` `appName` equal to Apps-in-Toss console app ID exactly.

## Fast Start (Recommended)
1. Set official Sandbox bundle id once:
```bash
export SANDBOX_BUNDLE_ID="<official_apps_in_toss_sandbox_bundle_id>"
```
2. Run full routine:
```bash
npm run ios:ait:run
```
3. In Sandbox app, execute in-app flow only:
   - login
   - workspace selection
   - app selection (`merchandisegpt`)
   - permission/auth approval
   - run `intoss://merchandisegpt` from Sandbox internal scheme UI

## Doctor Only
```bash
SANDBOX_BUNDLE_ID="<official_apps_in_toss_sandbox_bundle_id>" npm run ios:ait:doctor
```

Doctor includes:
- dev server probe (`http://127.0.0.1:8081/`)
- Sandbox Info.plist verification (`CFBundleIdentifier`, version, URL types)
- `appName` consistency check (`APP_NAME` vs `granite.config.ts`)

Optional Safari probe (only when needed):
```bash
SANDBOX_BUNDLE_ID="<official_apps_in_toss_sandbox_bundle_id>" bash scripts/run-ait-ios.sh --doctor-only --safari-probe
```

## Optional Variables
- `SANDBOX_APP_PATH=/path/to/Sandbox.app` or `.ipa` (install before checks)
- `SIM_UDID=<booted_simulator_udid>`
- `DEV_PORT=8081`
- `APP_NAME=merchandisegpt` (must match `granite.config.ts`)

## Logs for Evidence
```bash
xcrun simctl spawn "$SIM_UDID" log stream --style compact \
  --predicate 'eventMessage CONTAINS "scheme" OR eventMessage CONTAINS "AppsInToss" OR eventMessage CONTAINS "intoss" OR eventMessage CONTAINS "WebView" OR eventMessage CONTAINS "Running" OR eventMessage CONTAINS "Error"'
```

```bash
xcrun simctl spawn "$SIM_UDID" log show --style compact --last 1m \
  --predicate 'eventMessage CONTAINS "scheme" OR eventMessage CONTAINS "AppsInToss" OR eventMessage CONTAINS "intoss" OR eventMessage CONTAINS "WebView" OR eventMessage CONTAINS "Running" OR eventMessage CONTAINS "Error"'
```

## Known Failure Branches
- `There is no registered handler for URL scheme intoss`
  - Treat as runtime/sandbox routing issue, not RN rendering issue.
  - Re-run in-app Sandbox flow and verify official bundle/version.
- Sandbox opens but MiniApp runtime logs never appear
  - Re-check login/app selection/auth completion and exact `appName`.
- MiniApp opens but white screen
  - Validate simulator can open `http://127.0.0.1:8081/` in Safari.
  - Then inspect bundle request logs from `npm run dev`.
