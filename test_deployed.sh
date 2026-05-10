#!/bin/bash
# =============================================================================
# PrimePal Deployed Instance Smoke Test
# Usage: bash test_deployed.sh https://your-backend-url.com
# =============================================================================

set -euo pipefail

# --- Configuration ---
BASE_URL="${1:-http://localhost:8000}"
API="${BASE_URL}/api/v1"
PASS=0
FAIL=0
WARN=0
RESULTS=()

# --- Colors ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Helpers ---
pass() { ((PASS++)); RESULTS+=("PASS|$1"); echo -e "  ${GREEN}PASS${NC} $1"; }
fail() { ((FAIL++)); RESULTS+=("FAIL|$1|$2"); echo -e "  ${RED}FAIL${NC} $1 — $2"; }
warn() { ((WARN++)); RESULTS+=("WARN|$1|$2"); echo -e "  ${YELLOW}WARN${NC} $1 — $2"; }

check_status() {
  local desc="$1" url="$2" expected="${3:-200}" method="${4:-GET}" body="${5:-}" headers="${6:-}"
  local cmd="curl -s -o /tmp/pp_resp.json -w '%{http_code}' -X $method"

  if [ -n "$headers" ]; then
    cmd="$cmd -H '$headers'"
  fi
  cmd="$cmd -H 'Content-Type: application/json'"

  if [ -n "$body" ]; then
    cmd="$cmd -d '$body'"
  fi
  cmd="$cmd '$url'"

  local status
  status=$(eval $cmd 2>/dev/null) || status="000"

  if [ "$status" = "$expected" ]; then
    pass "$desc (HTTP $status)"
  else
    local resp
    resp=$(cat /tmp/pp_resp.json 2>/dev/null | head -c 200)
    fail "$desc" "Expected $expected, got $status — $resp"
  fi
  echo "$status"
}

# =============================================================================
echo -e "\n${CYAN}=========================================${NC}"
echo -e "${CYAN}  PrimePal Deployment Smoke Test${NC}"
echo -e "${CYAN}  Target: ${BASE_URL}${NC}"
echo -e "${CYAN}  Date:   $(date)${NC}"
echo -e "${CYAN}=========================================${NC}"

# =============================================================================
echo -e "\n${CYAN}[1/7] HEALTH & CONNECTIVITY${NC}"
# =============================================================================

# Basic health
STATUS=$(check_status "Basic health check" "$BASE_URL/health")
if [ "$STATUS" = "200" ]; then
  HEALTH=$(cat /tmp/pp_resp.json 2>/dev/null)
  echo -e "        Response: $HEALTH"
fi

# Detailed health (checks DB, Redis, OpenAI)
STATUS=$(check_status "Detailed health check" "$BASE_URL/health/detailed")
if [ "$STATUS" = "200" ]; then
  echo -e "        Checking subsystems..."
  DB_OK=$(cat /tmp/pp_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('database',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")
  REDIS_OK=$(cat /tmp/pp_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('redis',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")
  OPENAI_OK=$(cat /tmp/pp_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('openai',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")

  [ "$DB_OK" = "ok" ] || [ "$DB_OK" = "connected" ] && pass "Database connected" || fail "Database" "$DB_OK"
  [ "$REDIS_OK" = "ok" ] || [ "$REDIS_OK" = "connected" ] && pass "Redis connected" || warn "Redis" "$REDIS_OK (missions will be slow without cache)"
  [ "$OPENAI_OK" = "ok" ] || [ "$OPENAI_OK" = "connected" ] && pass "OpenAI reachable" || warn "OpenAI" "$OPENAI_OK"
fi

# FastAPI docs
check_status "API docs accessible" "$BASE_URL/docs" > /dev/null

# =============================================================================
echo -e "\n${CYAN}[2/7] CORS & HEADERS${NC}"
# =============================================================================

# Preflight check
CORS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -X OPTIONS \
  -H "Origin: https://prime-pal-alpha.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  "$BASE_URL/health" 2>/dev/null) || CORS_STATUS="000"

if [ "$CORS_STATUS" = "200" ] || [ "$CORS_STATUS" = "204" ]; then
  pass "CORS preflight (HTTP $CORS_STATUS)"
else
  fail "CORS preflight" "Got $CORS_STATUS — frontend may be blocked"
fi

# Check CORS headers
CORS_HEADERS=$(curl -s -D - -o /dev/null \
  -H "Origin: https://prime-pal-alpha.vercel.app" \
  "$BASE_URL/health" 2>/dev/null)

if echo "$CORS_HEADERS" | grep -qi "access-control-allow-origin"; then
  pass "CORS Allow-Origin header present"
else
  warn "CORS Allow-Origin" "Header missing — check ALLOWED_ORIGINS env var"
fi

# =============================================================================
echo -e "\n${CYAN}[3/7] PUBLIC ENDPOINTS (No Auth)${NC}"
# =============================================================================

# Topics (public)
check_status "GET topics (grade 1)" "$API/topics?grade_level=1" > /dev/null
check_status "GET topics (grade 4)" "$API/topics?grade_level=4" > /dev/null

# =============================================================================
echo -e "\n${CYAN}[4/7] AUTH — STUDENT LOGIN${NC}"
# =============================================================================

# Try fetching avatars for a classroom (need a valid class code)
echo -e "  ${YELLOW}NOTE${NC}: Student login requires real class_code + student_id + PIN"
echo -e "  ${YELLOW}NOTE${NC}: Testing auth rejection for invalid credentials..."

# Test that invalid login is properly rejected (not 500)
STATUS=$(check_status "Invalid student login → 401/404 (not 500)" \
  "$API/auth/student/login" "401" "POST" \
  '{"student_id":"00000000-0000-0000-0000-000000000000","class_code":"FAKE","secret_pin":"0000"}')

# If we got 500, that's a server error (bad)
if [ "$STATUS" = "500" ]; then
  fail "Student login error handling" "Got 500 instead of 401/404 — check server logs"
fi

# =============================================================================
echo -e "\n${CYAN}[5/7] AUTH — PROTECTED ENDPOINTS REJECT UNAUTHED REQUESTS${NC}"
# =============================================================================

PROTECTED_ENDPOINTS=(
  "GET|$API/missions/daily|Missions daily"
  "GET|$API/missions/me|Student profile"
  "GET|$API/classroom/|Classroom list"
  "GET|$API/teacher/analytics|Teacher analytics"
  "GET|$API/curriculum/uploads|Curriculum uploads"
  "GET|$API/auth/me|Auth me"
  "GET|$API/achievements/me|Achievements"
)

for entry in "${PROTECTED_ENDPOINTS[@]}"; do
  IFS='|' read -r method url desc <<< "$entry"
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$url" 2>/dev/null) || STATUS="000"
  if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
    pass "$desc rejects unauthenticated (HTTP $STATUS)"
  elif [ "$STATUS" = "500" ]; then
    fail "$desc" "Returns 500 without auth (should be 401/403)"
  else
    warn "$desc" "Got $STATUS without auth (expected 401/403)"
  fi
done

# =============================================================================
echo -e "\n${CYAN}[6/7] FRONTEND CONNECTIVITY${NC}"
# =============================================================================

FRONTEND_URL="${2:-}"
if [ -n "$FRONTEND_URL" ]; then
  # Landing page
  FE_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND_URL" 2>/dev/null) || FE_STATUS="000"
  if [ "$FE_STATUS" = "200" ]; then
    pass "Frontend landing page loads"
  else
    fail "Frontend landing page" "HTTP $FE_STATUS"
  fi

  # Student route
  FE_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND_URL/student/home" 2>/dev/null) || FE_STATUS="000"
  if [ "$FE_STATUS" = "200" ] || [ "$FE_STATUS" = "307" ] || [ "$FE_STATUS" = "302" ]; then
    pass "Student route accessible (HTTP $FE_STATUS)"
  else
    fail "Student route" "HTTP $FE_STATUS"
  fi

  # Teacher route
  FE_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND_URL/teacher/login" 2>/dev/null) || FE_STATUS="000"
  if [ "$FE_STATUS" = "200" ]; then
    pass "Teacher login page loads"
  else
    fail "Teacher login page" "HTTP $FE_STATUS"
  fi

  # Check that frontend points to correct API
  FE_BODY=$(curl -s "$FRONTEND_URL" 2>/dev/null | head -c 5000)
  if echo "$FE_BODY" | grep -q "$BASE_URL"; then
    pass "Frontend references correct API URL"
  else
    warn "Frontend API URL" "Could not verify NEXT_PUBLIC_API_URL in page source"
  fi
else
  echo -e "  ${YELLOW}SKIP${NC} No frontend URL provided (pass as 2nd argument)"
  echo -e "  ${YELLOW}     ${NC} Usage: bash test_deployed.sh <backend-url> <frontend-url>"
fi

# =============================================================================
echo -e "\n${CYAN}[7/7] RESPONSE TIME${NC}"
# =============================================================================

ENDPOINTS_TO_TIME=(
  "$BASE_URL/health|Health"
  "$API/topics?grade_level=1|Topics"
)

for entry in "${ENDPOINTS_TO_TIME[@]}"; do
  IFS='|' read -r url desc <<< "$entry"
  TIME=$(curl -s -o /dev/null -w '%{time_total}' "$url" 2>/dev/null) || TIME="0"
  TIME_MS=$(echo "$TIME * 1000" | bc 2>/dev/null || echo "?")
  if (( $(echo "$TIME < 2.0" | bc -l 2>/dev/null || echo 0) )); then
    pass "$desc response time: ${TIME_MS}ms"
  elif (( $(echo "$TIME < 5.0" | bc -l 2>/dev/null || echo 0) )); then
    warn "$desc response time" "${TIME_MS}ms (slow but OK)"
  else
    fail "$desc response time" "${TIME_MS}ms (>5s — check cold start or connectivity)"
  fi
done

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "\n${CYAN}=========================================${NC}"
echo -e "${CYAN}  RESULTS SUMMARY${NC}"
echo -e "${CYAN}=========================================${NC}"
echo -e "  ${GREEN}PASSED:  $PASS${NC}"
echo -e "  ${RED}FAILED:  $FAIL${NC}"
echo -e "  ${YELLOW}WARNINGS: $WARN${NC}"
echo -e ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}  FAILURES:${NC}"
  for r in "${RESULTS[@]}"; do
    if [[ "$r" == FAIL* ]]; then
      IFS='|' read -r _ desc detail <<< "$r"
      echo -e "  ${RED}✗${NC} $desc — $detail"
    fi
  done
fi

if [ "$WARN" -gt 0 ]; then
  echo -e "\n${YELLOW}  WARNINGS:${NC}"
  for r in "${RESULTS[@]}"; do
    if [[ "$r" == WARN* ]]; then
      IFS='|' read -r _ desc detail <<< "$r"
      echo -e "  ${YELLOW}!${NC} $desc — $detail"
    fi
  done
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}All critical checks passed!${NC}"
  exit 0
else
  echo -e "  ${RED}$FAIL critical check(s) failed — review above${NC}"
  exit 1
fi
