#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-${1:-/Users/daeyounglee/tossminiapp_tshirtsmaker}}"

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "❌ 프로젝트 폴더 없음: $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

command -v npm >/dev/null || { echo "❌ npm 없음"; exit 1; }
command -v xcrun >/dev/null || { echo "❌ xcrun 없음 (Xcode CLI Tools)"; exit 1; }
command -v curl >/dev/null || { echo "❌ curl 없음"; exit 1; }

echo "== npm install =="
npm install

echo "== dependency hardening =="
npm install @apps-in-toss/web-framework@^1.12.0 \
  @emotion/react@11.11.1 react-dom@18.2.0 \
  @toss/tds-mobile@2.2.1 @toss/tds-mobile-ait@2.2.1 \
  || {
    echo "⚠️ 일부 패키지 설치 실패(이미 반영된 상태일 수 있음). 로그:"
    true
  }

if [[ ! -f "granite.config.ts" ]]; then
  echo "❌ granite.config.ts 없음"
  exit 1
fi

echo "== config normalize =="
python3 - <<'PY'
from pathlib import Path
import re

p = Path("granite.config.ts")
txt = p.read_text(encoding="utf-8")
next_txt = txt

# webViewProps 빈 객체/부재 보정
next_txt = re.sub(
    r"webViewProps\\s*:\\s*\\{\\s*\\}",
    "webViewProps: { type: 'partner' }",
    next_txt,
)
if "webViewProps" not in next_txt:
    next_txt = next_txt.replace(
        "permissions: [",
        "webViewProps: { type: 'partner' },\n  permissions: [",
    )

if "outdir" not in next_txt:
    next_txt = next_txt.replace(
        "permissions: [",
        "outdir: 'dist',\n  permissions: [",
    )

if next_txt != txt:
    p.write_text(next_txt, encoding="utf-8")
    print("normalized")
else:
    print("already normal")
PY

read -r APP_NAME WEB_HOST WEB_PORT < <(
  python3 - <<'PY'
from pathlib import Path
import re

txt = Path("granite.config.ts").read_text(encoding="utf-8")
app = re.search(r"\bappName\s*:\s*['\"]([^'\"]+)['\"]", txt)
host = re.search(r"\bhost\s*:\s*['\"]([^'\"]+)['\"]", txt)
port = re.search(r"\bport\s*:\s*(\d+)", txt)
print(app.group(1) if app else "merchandisegpt")
print(host.group(1) if host else "127.0.0.1")
print(port.group(1) if port else "5173")
PY
)

test_url() {
  local url="$1"
  local secs="${2:-45}"
  local i=1
  while ((i <= secs)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    ((i += 1))
  done
  return 1
}

BOOTED_UDID="$(xcrun simctl list devices booted | awk -F '[()]' '/Booted/{print $2; exit}')"
if [[ -z "$BOOTED_UDID" ]]; then
  CAND_UDID="$(xcrun simctl list devices available | awk -F '[()]' '/iPhone/{print $2; exit}')"
  if [[ -z "$CAND_UDID" ]]; then
    echo "❌ 사용 가능한 iPhone 시뮬레이터가 없습니다."
    exit 1
  fi
  open -a Simulator >/dev/null 2>&1 || true
  xcrun simctl boot "$CAND_UDID" || true
  BOOTED_UDID="$CAND_UDID"
fi
xcrun simctl bootstatus "$BOOTED_UDID" -b >/dev/null 2>&1 || true

SANDBOX_APP_ID="com.vivarepublica.ent.cash.test"
SANDBOX_ZIP="$(ls -t "$HOME"/Downloads/Apps-In-Toss-Sandbox-*.zip 2>/dev/null | head -n 1 || true)"
if [[ -n "$SANDBOX_ZIP" ]]; then
  TMP_DIR="/tmp/appsintoss-sandbox"
  rm -rf "$TMP_DIR"
  mkdir -p "$TMP_DIR"
  unzip -q -o "$SANDBOX_ZIP" -d "$TMP_DIR"
  SANDBOX_APP_PATH="$(find "$TMP_DIR" -maxdepth 4 -name '*.app' | head -n 1 || true)"
  if [[ -n "$SANDBOX_APP_PATH" ]]; then
    xcrun simctl install "$BOOTED_UDID" "$SANDBOX_APP_PATH" || true
  fi
else
  echo "⚠️ sandbox zip 없음: 이미 설치된 앱만 사용"
fi

pkill -f "granite dev" || true
pkill -f "@granite-js/react-native/bin/cli.js dev" || true
pkill -f "vite .*--port ${WEB_PORT}" || true
rm -rf node_modules/.vite || true

LOG_FILE="/tmp/granite-dev.log"
rm -f "$LOG_FILE"
( npm run dev 2>&1 | tee "$LOG_FILE" ) &
DEV_PID=$!
echo "DEV_PID=$DEV_PID"

HOST_FOR_HTTP="127.0.0.1"
if [[ "$WEB_HOST" == "0.0.0.0" ]]; then
  HOST_FOR_HTTP="127.0.0.1"
elif [[ -n "$WEB_HOST" ]]; then
  HOST_FOR_HTTP="$WEB_HOST"
fi

if ! test_url "http://${HOST_FOR_HTTP}:${WEB_PORT}/" 45 && ! test_url "http://localhost:${WEB_PORT}/" 20; then
  echo "❌ dev 서버 응답 없음"
  tail -n 120 "$LOG_FILE" || true
  exit 1
fi

if ! test_url "http://localhost:8081/status" 20; then
  echo "⚠️ 8081 status 비노출(일부 환경은 기본 미표시)"
fi

xcrun simctl launch "$BOOTED_UDID" "$SANDBOX_APP_ID" || true
sleep 1
if ! xcrun simctl openurl "$BOOTED_UDID" "intoss-sandbox://open?url=intoss://$APP_NAME"; then
  xcrun simctl openurl "$BOOTED_UDID" "intoss-sandbox://$APP_NAME" || true
fi

echo "== run status =="
echo "PROJECT_DIR=$PROJECT_DIR"
echo "BOOTED_UDID=$BOOTED_UDID"
echo "APP_NAME=$APP_NAME"
echo "DEV_PID=$DEV_PID"
echo "LOG_FILE=$LOG_FILE"
echo "브라우저 연결: Safari > Develop > Simulator > AppsInTossSandbox > WebView"
echo
echo "최근 30초 에러 필터:"
xcrun simctl spawn "$BOOTED_UDID" log show --style compact --last 30s \
  --predicate '(process == "AppsInTossSandbox") AND (eventMessage CONTAINS "error" OR eventMessage CONTAINS "Exception" OR eventMessage CONTAINS "Fatal" OR eventMessage CONTAINS "Unhandled" OR eventMessage CONTAINS "schemeUri" OR eventMessage CONTAINS "Running \"shared\"")' || true
echo
echo "실행 유지 중: tail -n 200 -f $LOG_FILE"
echo "중지: kill $DEV_PID"
