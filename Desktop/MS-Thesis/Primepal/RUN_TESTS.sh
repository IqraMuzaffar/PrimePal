#!/bin/bash

# PrimePal Test Runner Script
# Run comprehensive tests across backend and frontend
# Usage: ./RUN_TESTS.sh [test_type]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ────────────────────────────────────────────────────────────────────────────

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# ────────────────────────────────────────────────────────────────────────────
# CHECK DEPENDENCIES
# ────────────────────────────────────────────────────────────────────────────

check_dependencies() {
    print_header "Checking Dependencies"

    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 not found. Please install Python 3.12+"
        exit 1
    fi
    print_success "Python 3 found: $(python3 --version)"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker"
        exit 1
    fi
    print_success "Docker found: $(docker --version)"

    # Check pytest
    if ! python3 -m pip list | grep -q pytest; then
        print_error "pytest not installed. Running: pip install pytest pytest-asyncio httpx"
        python3 -m pip install pytest pytest-asyncio httpx
    fi
    print_success "pytest found"
}

# ────────────────────────────────────────────────────────────────────────────
# BACKEND TESTS
# ────────────────────────────────────────────────────────────────────────────

run_backend_all() {
    print_header "Running All Backend Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest -v --tb=short
}

run_backend_auth() {
    print_header "Running Authentication Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest tests/test_auth.py -v --tb=short
}

run_backend_classrooms() {
    print_header "Running Classroom Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest tests/test_classroom.py -v --tb=short
}

run_backend_missions() {
    print_header "Running Mission Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest tests/test_missions.py tests/test_pillar_missions.py -v --tb=short
}

run_backend_topics() {
    print_header "Running Topics Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest tests/test_topics.py -v --tb=short
}

run_backend_chat() {
    print_header "Running Chat Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest tests/test_chat.py -v --tb=short
}

run_backend_interactions() {
    print_header "Running Interaction Logging Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest tests/test_interactions.py -v --tb=short
}

run_backend_evaluator() {
    print_header "Running Evaluator/Analytics Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest tests/test_evaluator.py tests/test_teacher_analytics.py -v --tb=short
}

run_backend_ingestion() {
    print_header "Running Curriculum Ingestion Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest tests/test_ingestion.py tests/test_knowledge_base.py -v --tb=short
}

run_backend_journeys() {
    print_header "Running Full Journey Tests"
    cd "$BACKEND_DIR"
    python3 -m pytest tests/test_full_journey.py -v --tb=short
}

run_backend_coverage() {
    print_header "Running Tests with Coverage"
    cd "$BACKEND_DIR"
    python3 -m pytest --cov=app --cov-report=html --cov-report=term-missing
    echo -e "\n${GREEN}Coverage report generated: $BACKEND_DIR/htmlcov/index.html${NC}"
}

run_backend_fast() {
    print_header "Running Fast Backend Tests (no mocking)"
    cd "$BACKEND_DIR"
    python3 -m pytest -m "not slow" -v
}

# ────────────────────────────────────────────────────────────────────────────
# FRONTEND TESTS
# ────────────────────────────────────────────────────────────────────────────

run_frontend_all() {
    print_header "Running All Frontend Tests"
    cd "$FRONTEND_DIR"
    npm test
}

run_frontend_missions() {
    print_header "Running Frontend Mission Tests"
    cd "$FRONTEND_DIR"
    npm test -- missions
}

run_frontend_lint() {
    print_header "Linting Frontend Code"
    cd "$FRONTEND_DIR"
    npm run lint
}

run_frontend_build() {
    print_header "Building Frontend"
    cd "$FRONTEND_DIR"
    npm run build
}

# ────────────────────────────────────────────────────────────────────────────
# API ENDPOINT TESTS (Postman / Manual)
# ────────────────────────────────────────────────────────────────────────────

run_api_smoke_tests() {
    print_header "Running API Smoke Tests"

    BACKEND_URL="http://localhost:8000/api/v1"

    # Check backend is running
    if ! curl -s "$BACKEND_URL/topics" > /dev/null 2>&1; then
        print_error "Backend not running at $BACKEND_URL"
        echo "Start backend with: cd backend && uvicorn app.main:app --reload"
        exit 1
    fi
    print_success "Backend is running"

    # Test 1: Get topics
    echo ""
    echo "Testing GET /topics (grade 3)..."
    RESPONSE=$(curl -s "$BACKEND_URL/topics?grade_level=3")
    if [[ $RESPONSE == *"id"* ]]; then
        print_success "GET /topics works"
    else
        print_error "GET /topics failed"
    fi

    # Test 2: Get health
    echo ""
    echo "Testing GET /health (if available)..."
    RESPONSE=$(curl -s "$BACKEND_URL/health" 2>/dev/null || echo "not found")
    if [[ $RESPONSE != "not found" ]]; then
        print_success "GET /health works"
    else
        print_error "GET /health not available (expected for some setups)"
    fi

    print_success "API smoke tests completed"
}

# ────────────────────────────────────────────────────────────────────────────
# DATABASE TESTS
# ────────────────────────────────────────────────────────────────────────────

run_database_tests() {
    print_header "Running Database Integrity Tests"

    # This assumes Supabase CLI is installed
    # supabase db pull
    # supabase db lint

    print_success "Database tests would verify:"
    echo "  - Foreign key constraints"
    echo "  - Referential integrity"
    echo "  - RLS policies"
    echo "  - Migration idempotence"
}

# ────────────────────────────────────────────────────────────────────────────
# PERFORMANCE TESTS
# ────────────────────────────────────────────────────────────────────────────

run_performance_tests() {
    print_header "Running Performance Tests"

    if ! command -v ab &> /dev/null; then
        print_error "Apache Bench (ab) not found. Skipping performance tests."
        echo "Install with: apt-get install apache2-utils"
        return
    fi

    BACKEND_URL="http://localhost:8000/api/v1"

    echo ""
    echo "Load testing GET /topics (10 concurrent requests)..."
    ab -n 10 -c 10 "$BACKEND_URL/topics?grade_level=3" > /tmp/perf_test.txt

    echo ""
    cat /tmp/perf_test.txt | grep -E "Requests/sec|Time per request"
    print_success "Performance tests completed"
}

# ────────────────────────────────────────────────────────────────────────────
# DOCKER TESTS
# ────────────────────────────────────────────────────────────────────────────

run_docker_tests() {
    print_header "Running Docker Container Tests"

    # Build and run backend container
    echo "Building backend Docker image..."
    docker build -t primepal-backend "$BACKEND_DIR"
    print_success "Backend image built"

    # Run tests in container
    echo ""
    echo "Running tests in container..."
    docker run --rm \
        -e SUPABASE_URL="https://test.supabase.co" \
        -e SUPABASE_ANON_KEY="test-key" \
        -e STUDENT_JWT_SECRET="test-secret" \
        primepal-backend \
        pytest -v

    print_success "Docker tests completed"
}

# ────────────────────────────────────────────────────────────────────────────
# FULL TEST SUITE
# ────────────────────────────────────────────────────────────────────────────

run_full_test_suite() {
    print_header "Running Full Test Suite"

    check_dependencies

    echo ""
    run_backend_all

    echo ""
    run_frontend_lint

    echo ""
    run_api_smoke_tests

    echo ""
    print_success "Full test suite completed!"
}

# ────────────────────────────────────────────────────────────────────────────
# HELP
# ────────────────────────────────────────────────────────────────────────────

show_help() {
    cat << 'EOF'
PrimePal Test Runner

USAGE:
    ./RUN_TESTS.sh [command]

BACKEND TESTS:
    all             - Run all backend tests
    auth            - Run authentication tests
    classrooms      - Run classroom management tests
    missions        - Run mission generation/submission tests
    topics          - Run curriculum topics tests
    chat            - Run chat/chatbot tests
    interactions    - Run interaction logging tests
    evaluator       - Run analytics/reporting tests
    ingestion       - Run curriculum ingestion tests
    journeys        - Run full user journey tests
    coverage        - Run tests with coverage report
    fast            - Run fast tests only

FRONTEND TESTS:
    frontend-all    - Run all frontend tests
    frontend-lint   - Lint frontend code
    frontend-build  - Build frontend

INTEGRATION TESTS:
    api-smoke       - Quick API endpoint smoke tests
    performance     - Load testing (requires Apache Bench)
    database        - Database integrity checks
    docker          - Run tests in Docker container
    full            - Run complete test suite

EXAMPLES:
    ./RUN_TESTS.sh auth              # Test authentication
    ./RUN_TESTS.sh missions           # Test missions
    ./RUN_TESTS.sh coverage           # Get coverage report
    ./RUN_TESTS.sh full              # Run everything
    ./RUN_TESTS.sh api-smoke         # Quick smoke test

EOF
}

# ────────────────────────────────────────────────────────────────────────────
# MAIN
# ────────────────────────────────────────────────────────────────────────────

main() {
    TEST_TYPE="${1:-full}"

    case "$TEST_TYPE" in
        # Backend
        all)                run_backend_all ;;
        auth)               run_backend_auth ;;
        classrooms)         run_backend_classrooms ;;
        missions)           run_backend_missions ;;
        topics)             run_backend_topics ;;
        chat)               run_backend_chat ;;
        interactions)       run_backend_interactions ;;
        evaluator)          run_backend_evaluator ;;
        ingestion)          run_backend_ingestion ;;
        journeys)           run_backend_journeys ;;
        coverage)           run_backend_coverage ;;
        fast)               run_backend_fast ;;

        # Frontend
        frontend-all)       run_frontend_all ;;
        frontend-lint)      run_frontend_lint ;;
        frontend-build)     run_frontend_build ;;

        # Integration
        api-smoke)          run_api_smoke_tests ;;
        performance)        run_performance_tests ;;
        database)           run_database_tests ;;
        docker)             run_docker_tests ;;
        full)               run_full_test_suite ;;

        # Help
        -h|--help|help)     show_help ;;
        *)
            echo "Unknown command: $TEST_TYPE"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
