#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  SANDBOX_BUNDLE_ID=<official_sandbox_bundle_id> ./scripts/run-ait-ios.sh [options]

Options:
  --doctor-only   Run checks only. Do not launch Sandbox app.
  --no-dev-start  Do not auto-start `npm run dev` when dev server is down.
  --safari-probe  Legacy alias. Same as `--mode safari-probe --probe-url <DEV_URL>`.
  --mode          Execution mode: internal|safari-probe (default: internal)
  --probe-url     URL to open via simctl openurl (required in safari-probe mode)
  --allow-local   Allow LOCAL/ent-test build (disabled by default)
  --bundle-id     Alias for SANDBOX_BUNDLE_ID
  --help          Show help.

Env vars:
  PROJECT_DIR         Target project path (default: current directory)
  APP_NAME            Must match granite.config.ts appName exactly
  DEV_PORT            Dev server port (default: granite.config.ts web.port)
  SANDBOX_BUNDLE_ID   Required. Official Apps-in-Toss Sandbox bundle id
  BUNDLE_ID           Alias for SANDBOX_BUNDLE_ID
  SANDBOX_APP_PATH    Optional .app/.ipa path to install before checks
  SIM_UDID            Optional simulator UDID (default: current booted device)
  LOG_FILE            Dev log path when script starts dev server
  AIT_MODE            Alias for --mode
  PROBE_URL           Alias for --probe-url
  ALLOW_LOCAL         Alias for --allow-local (1 to bypass)

Important:
  This script intentionally does NOT call `simctl openurl ... intoss://...`.
  Launch MiniApp only from inside the Sandbox app flow:
  로그인 -> 워크스페이스 -> 앱 선택 -> 인증 -> 앱 내부 스킴 실행 UI.
EOF
}

# === Guard module: mode/channel/scheme/render ===

log()  { echo "[AIT] $*"; }
warn() { echo "[AIT][WARN] $*" >&2; }
die()  { echo "[AIT][ERROR] $*" >&2; exit 1; }

AIT_MODE="${AIT_MODE:-internal}"          # internal | safari-probe
PROBE_URL="${PROBE_URL:-}"                # required for safari-probe
ALLOW_LOCAL="${ALLOW_LOCAL:-0}"           # 1 to bypass channel guard
BUNDLE_ID="${BUNDLE_ID:-}"                # may be mapped to SANDBOX_BUNDLE_ID
GUARD_REST_ARGS=()                        # populated by parse_guard_args

# Parse only new flags; leave the rest to existing logic
parse_guard_args() {
  local rest=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --mode)
        [[ $# -ge 2 ]] || die "[GUARD][MODE] --mode 값이 필요합니다."
        AIT_MODE="${2:-}"
        shift 2
        ;;
      --probe-url)
        [[ $# -ge 2 ]] || die "[GUARD][MODE] --probe-url 값이 필요합니다."
        PROBE_URL="${2:-}"
        shift 2
        ;;
      --allow-local)
        ALLOW_LOCAL="1"
        shift 1
        ;;
      --bundle-id)
        [[ $# -ge 2 ]] || die "[GUARD][CONFIG] --bundle-id 값이 필요합니다."
        BUNDLE_ID="${2:-}"
        shift 2
        ;;
      *)
        rest+=("$1")
        shift 1
        ;;
    esac
  done
  GUARD_REST_ARGS=("${rest[@]+"${rest[@]}"}")
}

get_booted_udid() {
  xcrun simctl list devices booted -j | python3 -c '
import json, sys
j = json.load(sys.stdin)
for _, devices in j.get("devices", {}).items():
    for d in devices:
        if d.get("state") == "Booted":
            print(d.get("udid"))
            raise SystemExit(0)
raise SystemExit(1)
'
}

get_app_path() {
  local udid="$1"
  local bundle_id="$2"
  xcrun simctl get_app_container "$udid" "$bundle_id" app 2>/dev/null
}

plist_read_kv() {
  # usage: plist_read_kv <info_plist> <key>
  local plist="$1"
  local key="$2"
  python3 - <<'PY' "$plist" "$key"
import json
import plistlib
import sys

p = plistlib.load(open(sys.argv[1], 'rb'))
k = sys.argv[2]
v = p.get(k, "")
if isinstance(v, (dict, list)):
    print(json.dumps(v, ensure_ascii=False))
else:
    print(v)
PY
}

plist_read_url_schemes() {
  # prints one scheme per line
  local plist="$1"
  python3 - <<'PY' "$plist"
import plistlib
import sys

p = plistlib.load(open(sys.argv[1], "rb"))
schemes = set()
for t in p.get("CFBundleURLTypes", []) or []:
    for s in t.get("CFBundleURLSchemes", []) or []:
        if s:
            schemes.add(str(s))
for s in sorted(schemes):
    print(s)
PY
}

url_scheme() {
  # naive parse: "scheme://..."
  local url="$1"
  echo "$url" | sed -E 's/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/.*$/\1/' | sed -E 's/:$//'
}

guard_mode() {
  case "$AIT_MODE" in
    internal|safari-probe) ;;
    *)
      die "[GUARD][MODE] --mode는 internal 또는 safari-probe만 허용합니다. 현재: '$AIT_MODE'"
      ;;
  esac

  if [[ "$AIT_MODE" == "safari-probe" ]]; then
    echo "⚠️ [SAFARI_PROBE] 이 모드는 simctl openurl을 실행합니다. Safari/앱 전환 루프를 유발할 수 있습니다. 디버깅에만 사용하세요."
    [[ -n "$PROBE_URL" ]] || die "[GUARD][MODE] safari-probe 모드에서는 --probe-url이 필수입니다."
  fi
}

guard_no_openurl_in_internal() {
  if [[ "$AIT_MODE" == "internal" && -n "${PROBE_URL:-}" ]]; then
    echo "[GUARD][MODE] internal 모드에서는 simctl openurl을 금지합니다. safari-probe 모드로 실행하세요."
    exit 1
  fi
}

guard_channel() {
  # usage: guard_channel <info_plist>
  local plist="$1"
  local bundle_id bundle_ver
  bundle_id="$(plist_read_kv "$plist" "CFBundleIdentifier" | tr -d '\r')"
  bundle_ver="$(plist_read_kv "$plist" "CFBundleVersion" | tr -d '\r')"

  # 기본 차단 규칙: LOCAL 또는 명시 차단 번들
  local blocked=0
  [[ "$bundle_ver" == "LOCAL" ]] && blocked=1
  [[ "$bundle_id" == "com.vivarepublica.ent.cash.test" ]] && blocked=1

  if [[ "$blocked" == "1" && "$ALLOW_LOCAL" != "1" ]]; then
    echo "[GUARD][CHANNEL] LOCAL/ent-test 빌드를 감지했습니다: ${bundle_id} (${bundle_ver}). 기본 실행을 중단합니다."
    echo "해결: 공식 Sandbox IPA/APP로 고정하거나, 정말 필요하면 --allow-local로 재실행하세요."
    exit 1
  fi
}

guard_scheme_before_openurl() {
  # usage: guard_scheme_before_openurl <info_plist> <url>
  local plist="$1"
  local url="$2"
  local scheme
  scheme="$(url_scheme "$url")"

  # http/https는 Safari로 가는 정상 동작이므로 스킴 검증 스킵
  if [[ "$scheme" == "http" || "$scheme" == "https" ]]; then
    return 0
  fi

  local joined
  local ok=0
  local schemes=()
  local s
  while IFS= read -r s; do
    [[ -n "$s" ]] && schemes+=("$s")
  done < <(plist_read_url_schemes "$plist" || true)
  if [[ "${#schemes[@]}" -eq 0 ]]; then
    joined="(none)"
  else
    joined="$(IFS=,; echo "${schemes[*]}")"
  fi

  for s in "${schemes[@]}"; do
    [[ "$s" == "$scheme" ]] && ok=1
  done

  if [[ "$ok" != "1" ]]; then
    echo "[GUARD][SCHEME] 요청 URL 스킴 '${scheme}'은(는) 설치 앱에 등록돼 있지 않습니다."
    echo "[GUARD][SCHEME] 설치 앱 URL 스킴: ${joined}"
    echo "이 상태는 OSStatus -10814를 구조적으로 재현합니다. openurl 실행을 중단합니다."
    echo "해결: 올바른 스킴(예: intoss-sandbox://...)을 사용하거나, 해당 스킴을 등록한 공식 Sandbox 빌드를 설치하세요."
    exit 1
  fi
}

screenshot_avg_brightness() {
  # usage: screenshot_avg_brightness <udid>
  local udid="$1"
  local tmp_dir tmp_png tmp_small tmp_ppm
  tmp_dir="$(mktemp -d)"
  tmp_png="${tmp_dir}/screen.png"
  tmp_small="${tmp_dir}/screen_1x1.png"
  tmp_ppm="${tmp_dir}/screen_1x1.ppm"

  xcrun simctl io "$udid" screenshot "$tmp_png" >/dev/null 2>&1 || { rm -rf "$tmp_dir"; echo "999"; return 0; }
  sips -z 1 1 "$tmp_png" --out "$tmp_small" >/dev/null 2>&1 || { rm -rf "$tmp_dir"; echo "999"; return 0; }
  sips -s format ppm "$tmp_small" --out "$tmp_ppm" >/dev/null 2>&1 || { rm -rf "$tmp_dir"; echo "999"; return 0; }

  python3 - <<'PY' "$tmp_ppm"
import re
import sys

path = sys.argv[1]
data = open(path, "rb").read()
m = re.match(br"P6\s+(?:#.*\s+)*(\d+)\s+(\d+)\s+(\d+)\s", data)
if not m:
    print("999")
    raise SystemExit(0)
hdr_end = m.end()
pix = data[hdr_end:hdr_end + 3]
if len(pix) < 3:
    print("999")
    raise SystemExit(0)
r, g, b = pix[0], pix[1], pix[2]
avg = (r + g + b) / 3.0
print(f"{avg:.2f}")
PY

  rm -rf "$tmp_dir"
}

reboot_simulator() {
  local udid="$1"
  if ! xcrun simctl reboot "$udid" >/dev/null 2>&1; then
    xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true
    xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  fi
  xcrun simctl bootstatus "$udid" -b >/dev/null 2>&1 || true
}

ensure_simulator_rendering_ok() {
  # usage: ensure_simulator_rendering_ok <udid>
  local udid="$1"
  local avg is_black
  avg="$(screenshot_avg_brightness "$udid")"

  # avg=999는 판정 실패(도구 실패), 강제 복구는 하지 않음.
  if [[ "$avg" != "999" ]]; then
    is_black="$(python3 - <<PY
avg=float("$avg")
print(1 if avg < 5.0 else 0)
PY
)"
    if [[ "$is_black" == "1" ]]; then
      echo "[GUARD][RENDER] 스크린샷이 거의 검정입니다. 시뮬레이터 reboot로 복구를 시도합니다."
      reboot_simulator "$udid"
      echo "[GUARD][RENDER] reboot 완료. 실행을 재개합니다."
    fi
  fi
}

terminate_app() {
  local udid="$1"
  local bundle_id="$2"
  xcrun simctl terminate "$udid" "$bundle_id" >/dev/null 2>&1 || true
}

launch_app() {
  local udid="$1"
  local bundle_id="$2"
  xcrun simctl launch "$udid" "$bundle_id" >/dev/null
}

openurl_probe() {
  local udid="$1"
  local url="$2"
  xcrun simctl openurl "$udid" "$url"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ required command not found: $cmd"
    exit 1
  fi
}

http_status() {
  local url="$1"
  curl -sS -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000"
}

wait_for_http_ok() {
  local url="$1"
  local timeout="${2:-60}"
  local elapsed=0
  local status="000"
  while ((elapsed < timeout)); do
    status="$(http_status "$url")"
    if [[ "$status" =~ ^[23][0-9][0-9]$ ]]; then
      return 0
    fi
    sleep 1
    ((elapsed += 1))
  done
  return 1
}

detect_sim_udid() {
  local current_booted
  local candidate
  current_booted="$(get_booted_udid 2>/dev/null || true)"
  if [[ -n "$current_booted" ]]; then
    echo "$current_booted"
    return 0
  fi

  candidate="$(xcrun simctl list devices available -j | python3 -c '
import json, sys
j=json.load(sys.stdin)
for _, devices in j.get("devices", {}).items():
    for d in devices:
        if d.get("isAvailable") and "iPhone" in d.get("name",""):
            print(d.get("udid"))
            raise SystemExit(0)
raise SystemExit(1)
' 2>/dev/null || true)"
  if [[ -z "$candidate" ]]; then
    return 1
  fi

  open -a Simulator >/dev/null 2>&1 || true
  xcrun simctl boot "$candidate" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$candidate" -b >/dev/null 2>&1 || true
  echo "$candidate"
  return 0
}

list_bundle_candidates() {
  local sim_udid="$1"
  xcrun simctl listapps "$sim_udid" \
    | rg -o '"com\.[^"]+"' \
    | tr -d '"' \
    | rg -i 'sandbox|toss|vivarepublica' \
    | sort -u \
    || true
}

DOCTOR_ONLY=0
AUTO_START_DEV=1
LEGACY_SAFARI_PROBE=0

parse_guard_args "$@"
set -- ${GUARD_REST_ARGS[@]+"${GUARD_REST_ARGS[@]}"}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --doctor-only)
      DOCTOR_ONLY=1
      ;;
    --no-dev-start)
      AUTO_START_DEV=0
      ;;
    --safari-probe)
      AIT_MODE="safari-probe"
      LEGACY_SAFARI_PROBE=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "❌ unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "❌ project directory not found: $PROJECT_DIR"
  exit 1
fi
cd "$PROJECT_DIR"

require_cmd npm
require_cmd xcrun
require_cmd curl
require_cmd rg
require_cmd python3
require_cmd plutil
require_cmd sips

if [[ ! -f "granite.config.ts" ]]; then
  echo "❌ granite.config.ts not found in $PROJECT_DIR"
  exit 1
fi

IFS=$'\t' read -r CONFIG_APP_NAME CONFIG_WEB_HOST CONFIG_WEB_PORT <<<"$(
  python3 - <<'PY'
from pathlib import Path
import re

txt = Path("granite.config.ts").read_text(encoding="utf-8")
app = re.search(r"\bappName\s*:\s*['\"]([^'\"]+)['\"]", txt)
host = re.search(r"\bhost\s*:\s*['\"]([^'\"]+)['\"]", txt)
port = re.search(r"\bport\s*:\s*(\d+)", txt)
print(
    "\t".join(
        [
            app.group(1) if app else "",
            host.group(1) if host else "localhost",
            port.group(1) if port else "8081",
        ]
    )
)
PY
)"
CONFIG_APP_NAME="${CONFIG_APP_NAME:-}"
CONFIG_WEB_HOST="${CONFIG_WEB_HOST:-localhost}"
CONFIG_WEB_PORT="${CONFIG_WEB_PORT:-8081}"

if [[ -z "$CONFIG_APP_NAME" ]]; then
  echo "❌ failed to parse appName from granite.config.ts"
  exit 1
fi

APP_NAME="${APP_NAME:-$CONFIG_APP_NAME}"
DEV_PORT="${DEV_PORT:-$CONFIG_WEB_PORT}"
SANDBOX_BUNDLE_ID="${SANDBOX_BUNDLE_ID:-${BUNDLE_ID:-}}"
BUNDLE_ID="${SANDBOX_BUNDLE_ID:-$BUNDLE_ID}"
SIM_UDID="${SIM_UDID:-}"
SANDBOX_APP_PATH="${SANDBOX_APP_PATH:-}"
LOG_FILE="${LOG_FILE:-/tmp/granite-dev-${APP_NAME}.log}"
DEV_URL="http://127.0.0.1:${DEV_PORT}/"

if [[ "$LEGACY_SAFARI_PROBE" -eq 1 && -z "${PROBE_URL:-}" ]]; then
  PROBE_URL="$DEV_URL"
fi

guard_mode
guard_no_openurl_in_internal

if [[ "$APP_NAME" != "$CONFIG_APP_NAME" ]]; then
  echo "❌ APP_NAME mismatch."
  echo "   APP_NAME=$APP_NAME"
  echo "   granite.config.ts appName=$CONFIG_APP_NAME"
  echo "   Resolve this before running Sandbox flow."
  exit 1
fi

if [[ -z "$SIM_UDID" ]]; then
  if ! SIM_UDID="$(get_booted_udid 2>/dev/null || true)"; then
    SIM_UDID=""
  fi
  if [[ -z "$SIM_UDID" ]] && ! SIM_UDID="$(detect_sim_udid)"; then
    echo "❌ no booted/available iPhone simulator found."
    exit 1
  fi
fi
xcrun simctl bootstatus "$SIM_UDID" -b >/dev/null 2>&1 || true

if [[ -z "$SANDBOX_BUNDLE_ID" ]]; then
  echo "❌ SANDBOX_BUNDLE_ID is required."
  echo "   Example:"
  echo "   SANDBOX_BUNDLE_ID=com.your.official.sandbox ./scripts/run-ait-ios.sh"
  echo
  echo "   Candidates on simulator $SIM_UDID:"
  list_bundle_candidates "$SIM_UDID" | sed 's/^/   - /'
  exit 1
fi

if [[ -n "$SANDBOX_APP_PATH" ]]; then
  if [[ ! -e "$SANDBOX_APP_PATH" ]]; then
    echo "❌ SANDBOX_APP_PATH not found: $SANDBOX_APP_PATH"
    exit 1
  fi
  echo "== Installing Sandbox build =="
  xcrun simctl install "$SIM_UDID" "$SANDBOX_APP_PATH"
fi

if ! APP_PATH="$(xcrun simctl get_app_container "$SIM_UDID" "$SANDBOX_BUNDLE_ID" app 2>/dev/null)"; then
  echo "❌ Sandbox app is not installed: $SANDBOX_BUNDLE_ID"
  echo "   Install it first, then retry."
  exit 1
fi
INFO_PLIST="$APP_PATH/Info.plist"
if [[ ! -f "$INFO_PLIST" ]]; then
  die "[GUARD][APP] Info.plist를 찾지 못했습니다: $INFO_PLIST"
fi

DEV_PID=""
DEV_STARTED_BY_SCRIPT=0

cleanup() {
  if [[ "$DOCTOR_ONLY" -eq 1 && "$DEV_STARTED_BY_SCRIPT" -eq 1 && -n "$DEV_PID" ]]; then
    kill "$DEV_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

guard_channel "$INFO_PLIST"
ensure_simulator_rendering_ok "$SIM_UDID"

if ! wait_for_http_ok "$DEV_URL" 3; then
  if [[ "$AUTO_START_DEV" -eq 0 ]]; then
    echo "❌ dev server is down and --no-dev-start was used."
    echo "   Run: npm run dev"
    exit 1
  fi
  echo "== Starting dev server =="
  rm -f "$LOG_FILE"
  ( npm run dev >"$LOG_FILE" 2>&1 ) &
  DEV_PID=$!
  DEV_STARTED_BY_SCRIPT=1
  if ! wait_for_http_ok "$DEV_URL" 60; then
    echo "❌ dev server did not become ready at $DEV_URL"
    echo "== Last 120 lines from $LOG_FILE =="
    tail -n 120 "$LOG_FILE" || true
    exit 1
  fi
fi

echo "== Doctor checks =="
echo "1) Dev server probe"
curl -sSI "$DEV_URL" | head -n 1

if [[ "$AIT_MODE" == "safari-probe" ]]; then
  echo "2) Simulator Safari probe (enabled)"
  guard_scheme_before_openurl "$INFO_PLIST" "$PROBE_URL"
  openurl_probe "$SIM_UDID" "$PROBE_URL"
else
  echo "2) Simulator Safari probe (skipped by default to avoid app-switch popup loop)"
fi

echo "3) Sandbox Info.plist key fields"
/usr/bin/plutil -p "$INFO_PLIST" | egrep "CFBundleIdentifier|CFBundleShortVersionString|CFBundleVersion|CFBundleURLTypes" -n

if ! /usr/bin/plutil -p "$INFO_PLIST" | rg -q "intoss-sandbox"; then
  echo "⚠️ intoss-sandbox URL type not found in Sandbox Info.plist."
fi

LOG_PREDICATE='eventMessage CONTAINS "scheme" OR eventMessage CONTAINS "AppsInToss" OR eventMessage CONTAINS "intoss" OR eventMessage CONTAINS "WebView" OR eventMessage CONTAINS "Running" OR eventMessage CONTAINS "Error"'

if [[ "$DOCTOR_ONLY" -eq 0 ]]; then
  echo "== Launch Sandbox =="
  terminate_app "$SIM_UDID" "$SANDBOX_BUNDLE_ID"
  ensure_simulator_rendering_ok "$SIM_UDID"
  launch_app "$SIM_UDID" "$SANDBOX_BUNDLE_ID"
fi

echo
echo "== Summary =="
echo "PROJECT_DIR=$PROJECT_DIR"
echo "SIM_UDID=$SIM_UDID"
echo "SANDBOX_BUNDLE_ID=$SANDBOX_BUNDLE_ID"
echo "APP_NAME=$APP_NAME"
echo "DEV_URL=$DEV_URL"
echo "AIT_MODE=$AIT_MODE"
if [[ "$AIT_MODE" == "safari-probe" ]]; then
  echo "PROBE_URL=$PROBE_URL"
fi
if [[ "$DEV_STARTED_BY_SCRIPT" -eq 1 ]]; then
  echo "DEV_PID=$DEV_PID"
  echo "LOG_FILE=$LOG_FILE"
  if [[ "$DOCTOR_ONLY" -eq 1 ]]; then
    echo "DEV server started by script and will be stopped on exit."
  fi
fi

echo
echo "Sandbox 내부 실행 순서(외부 intoss:// openurl 금지):"
echo "1) 로그인"
echo "2) 워크스페이스 선택"
echo "3) 앱 선택: $APP_NAME"
echo "4) 인증/권한 동의"
echo "5) 앱 내부 스킴 입력/실행 UI에서 intoss://$APP_NAME 실행"
echo
echo "실시간 로그:"
echo "xcrun simctl spawn \"$SIM_UDID\" log stream --style compact --predicate '$LOG_PREDICATE'"
echo
echo "직전 1분 로그:"
echo "xcrun simctl spawn \"$SIM_UDID\" log show --style compact --last 1m --predicate '$LOG_PREDICATE'"
