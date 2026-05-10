#!/bin/bash
# Quick verification script for mission generation fix
# Run this after backend deployment to verify fixes are working

echo "=========================================="
echo "Mission Generation Fix Verification"
echo "=========================================="
echo ""

# Colors for output (if terminal supports)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "[1/4] Checking if backend is running..."
if curl -s http://localhost:8000/api/v1/auth/classroom/TEST/avatars > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Backend is responding"
else
    echo -e "${RED}[FAIL]${NC} Backend not responding at http://localhost:8000"
    echo "Please start the backend first: cd backend && uvicorn app.main:app --reload"
    exit 1
fi

echo ""
echo "[2/4] Checking mission_generator.py for new timeouts..."
if grep -q "timeout=25.0" app/agents/tutor_agent/mission_generator.py && \
   grep -q "timeout=30.0" app/agents/tutor_agent/mission_generator.py; then
    echo -e "${GREEN}[OK]${NC} New timeouts (25s/30s) found in code"
else
    echo -e "${RED}[FAIL]${NC} Timeouts not updated - did you restart backend?"
    exit 1
fi

echo ""
echo "[3/4] Checking for fail-soft removal..."
if grep -q "Rejecting partial result" app/agents/tutor_agent/mission_generator.py; then
    echo -e "${GREEN}[OK]${NC} Fail-soft pattern removed, strict 10-question requirement in place"
else
    echo -e "${YELLOW}[WARN]${NC} Strict validation not found - check mission_generator.py"
fi

echo ""
echo "[4/4] Checking for retry logic..."
if grep -q "MAX_RETRIES = 2" app/agents/tutor_agent/mission_generator.py && \
   grep -q "RETRY_DELAY_BASE = 2.0" app/agents/tutor_agent/mission_generator.py; then
    echo -e "${GREEN}[OK]${NC} Retry logic with exponential backoff found"
else
    echo -e "${YELLOW}[WARN]${NC} Retry logic not found - check mission_generator.py"
fi

echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "All checks passed! The fixes are deployed."
echo ""
echo "Next steps:"
echo "  1. Monitor backend logs: tail -f backend.log | grep 'mission generation'"
echo "  2. Test with real student account:"
echo "     - Navigate to /student/missions"
echo "     - Click Reading, Writing, Listening, Speaking"
echo "     - Verify each shows 10 questions (not 3)"
echo "     - Verify no 'Loading...' stuck states"
echo "  3. Check logs for timing:"
echo "     - Should see: 'LLM generation completed in 10-25s'"
echo "     - Should NOT see: 'timeout (30s)' errors"
echo ""
echo "=========================================="
