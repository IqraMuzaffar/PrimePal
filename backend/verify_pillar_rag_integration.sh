#!/bin/bash
#
# Verification script for Pillar Mission RAG Integration
# Checks that all components are properly integrated
#

echo "============================================================"
echo "Pillar Mission RAG Integration Verification"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Check function
check() {
    local description=$1
    local command=$2

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description"
        ((FAILED++))
    fi
}

echo "1. Code Syntax Checks"
echo "------------------------------------------------------------"
check "missions.py compiles without errors" \
    "python -m py_compile app/api/v1/endpoints/missions.py"

check "mission_generator.py compiles without errors" \
    "python -m py_compile app/agents/tutor_agent/mission_generator.py"
echo ""

echo "2. Function Signature Verification"
echo "------------------------------------------------------------"
check "generate_pillar_missions has context_chunks parameter" \
    "grep -q 'context_chunks: list\[dict\] | None = None' app/agents/tutor_agent/mission_generator.py"

check "generate_daily_missions has context_chunks parameter" \
    "grep -q 'context_chunks: list\[str\]' app/agents/tutor_agent/mission_generator.py"
echo ""

echo "3. RAG Retrieval Integration"
echo "------------------------------------------------------------"
check "Pillar missions endpoint calls retrieve_grade_filtered_chunks" \
    "grep -q 'context_chunks = await retrieve_grade_filtered_chunks' app/api/v1/endpoints/missions.py"

check "Background task calls retrieve_grade_filtered_chunks" \
    "grep -A 20 'async def _generate_personalized_missions' app/api/v1/endpoints/missions.py | grep -q 'retrieve_grade_filtered_chunks'"

check "Pillar missions pass context_chunks to generator" \
    "grep -A 10 'generate_pillar_missions' app/api/v1/endpoints/missions.py | grep -q 'context_chunks=context_chunks'"
echo ""

echo "4. Prompt Integration"
echo "------------------------------------------------------------"
check "Curriculum context is built from chunks" \
    "grep -q 'curriculum_context = \"\"' app/agents/tutor_agent/mission_generator.py"

check "Curriculum context added to system prompt" \
    "grep -q '{curriculum_context}\"\"\"' app/agents/tutor_agent/mission_generator.py"

check "SNC CURRICULUM CONTEXT header present" \
    "grep -q 'SNC CURRICULUM CONTEXT' app/agents/tutor_agent/mission_generator.py"
echo ""

echo "5. Error Handling"
echo "------------------------------------------------------------"
check "RAG failure is caught and logged" \
    "grep -q 'RAG retrieval failed for pillar missions' app/api/v1/endpoints/missions.py"

check "Empty context_chunks list used as fallback" \
    "grep -q 'context_chunks = \[\]' app/api/v1/endpoints/missions.py"
echo ""

echo "6. Logging"
echo "------------------------------------------------------------"
check "RAG retrieval success is logged for pillar missions" \
    "grep -q 'RAG retrieval for pillar missions' app/api/v1/endpoints/missions.py"

check "Background task RAG retrieval is logged" \
    "grep -q 'Background task RAG retrieval' app/api/v1/endpoints/missions.py"
echo ""

echo "7. Import Verification"
echo "------------------------------------------------------------"
check "retrieve_grade_filtered_chunks is imported" \
    "grep -q 'from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks' app/api/v1/endpoints/missions.py"

check "generate_pillar_missions is imported" \
    "grep -q 'generate_pillar_missions' app/api/v1/endpoints/missions.py"
echo ""

echo "8. Test Files"
echo "------------------------------------------------------------"
check "Test script exists" \
    "test -f test_pillar_rag.py"

check "Implementation doc exists" \
    "test -f PILLAR_RAG_IMPLEMENTATION.md"

check "Comparison doc exists" \
    "test -f RAG_COMPARISON.md"
echo ""

# Summary
echo "============================================================"
echo "Verification Summary"
echo "============================================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! RAG integration is complete.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: python test_pillar_rag.py"
    echo "  2. Start the backend and test /api/v1/missions/pillar endpoint"
    echo "  3. Check logs for 'RAG retrieval for pillar missions' entries"
    echo "  4. Verify questions align with SNC curriculum"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the implementation.${NC}"
    exit 1
fi
