@echo off
REM PrimePal Test Runner for Windows
REM Usage: RUN_TESTS.bat [test_type]
REM
REM Examples:
REM   RUN_TESTS.bat auth              # Run auth tests
REM   RUN_TESTS.bat all               # Run all backend tests
REM   RUN_TESTS.bat coverage          # Generate coverage report
REM   RUN_TESTS.bat help              # Show help

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"
set "TEST_TYPE=%1"

if "%TEST_TYPE%"=="" set "TEST_TYPE=full"

REM Colors (using findstr hack for Windows)
REM Can't use ANSI colors easily in batch, so using simple markers

echo.
echo ============================================================
echo PrimePal Test Runner for Windows
echo ============================================================
echo.

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.12+
    exit /b 1
)
echo [OK] Python found:
python --version

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    exit /b 1
)
echo [OK] Node.js found:
node --version

REM Check Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Docker not found (optional)
) else (
    echo [OK] Docker found:
    docker --version
)

echo.

REM Parse command and run appropriate test
if /i "%TEST_TYPE%"=="all" goto backend_all
if /i "%TEST_TYPE%"=="auth" goto backend_auth
if /i "%TEST_TYPE%"=="classrooms" goto backend_classrooms
if /i "%TEST_TYPE%"=="missions" goto backend_missions
if /i "%TEST_TYPE%"=="topics" goto backend_topics
if /i "%TEST_TYPE%"=="chat" goto backend_chat
if /i "%TEST_TYPE%"=="interactions" goto backend_interactions
if /i "%TEST_TYPE%"=="evaluator" goto backend_evaluator
if /i "%TEST_TYPE%"=="ingestion" goto backend_ingestion
if /i "%TEST_TYPE%"=="journeys" goto backend_journeys
if /i "%TEST_TYPE%"=="coverage" goto backend_coverage
if /i "%TEST_TYPE%"=="fast" goto backend_fast
if /i "%TEST_TYPE%"=="frontend-all" goto frontend_all
if /i "%TEST_TYPE%"=="frontend-lint" goto frontend_lint
if /i "%TEST_TYPE%"=="frontend-build" goto frontend_build
if /i "%TEST_TYPE%"=="api-smoke" goto api_smoke
if /i "%TEST_TYPE%"=="performance" goto performance
if /i "%TEST_TYPE%"=="database" goto database
if /i "%TEST_TYPE%"=="docker" goto docker
if /i "%TEST_TYPE%"=="full" goto full_suite
if /i "%TEST_TYPE%"=="help" goto show_help
if /i "%TEST_TYPE%"=="-h" goto show_help
if /i "%TEST_TYPE%"=="--help" goto show_help

echo ERROR: Unknown command: %TEST_TYPE%
echo.
goto show_help

REM ─────────────────────────────────────────────────────────────
REM BACKEND TESTS
REM ─────────────────────────────────────────────────────────────

:backend_all
echo.
echo Running All Backend Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest -v --tb=short
if %errorlevel% neq 0 echo FAILED: Backend tests failed
goto done

:backend_auth
echo.
echo Running Authentication Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest tests/test_auth.py -v --tb=short
if %errorlevel% neq 0 echo FAILED: Auth tests failed
goto done

:backend_classrooms
echo.
echo Running Classroom Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest tests/test_classroom.py -v --tb=short
if %errorlevel% neq 0 echo FAILED: Classroom tests failed
goto done

:backend_missions
echo.
echo Running Mission Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest tests/test_missions.py tests/test_pillar_missions.py -v --tb=short
if %errorlevel% neq 0 echo FAILED: Mission tests failed
goto done

:backend_topics
echo.
echo Running Topics Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest tests/test_topics.py -v --tb=short
if %errorlevel% neq 0 echo FAILED: Topics tests failed
goto done

:backend_chat
echo.
echo Running Chat Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest tests/test_chat.py -v --tb=short
if %errorlevel% neq 0 echo FAILED: Chat tests failed
goto done

:backend_interactions
echo.
echo Running Interaction Logging Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest tests/test_interactions.py -v --tb=short
if %errorlevel% neq 0 echo FAILED: Interaction tests failed
goto done

:backend_evaluator
echo.
echo Running Evaluator/Analytics Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest tests/test_evaluator.py tests/test_teacher_analytics.py -v --tb=short
if %errorlevel% neq 0 echo FAILED: Evaluator tests failed
goto done

:backend_ingestion
echo.
echo Running Curriculum Ingestion Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest tests/test_ingestion.py tests/test_knowledge_base.py -v --tb=short
if %errorlevel% neq 0 echo FAILED: Ingestion tests failed
goto done

:backend_journeys
echo.
echo Running Full Journey Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest tests/test_full_journey.py -v --tb=short
if %errorlevel% neq 0 echo FAILED: Journey tests failed
goto done

:backend_coverage
echo.
echo Running Tests with Coverage Report...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest --cov=app --cov-report=html --cov-report=term-missing
echo.
echo Coverage report generated: %BACKEND_DIR%\htmlcov\index.html
if exist "%BACKEND_DIR%\htmlcov\index.html" (
    echo Opening coverage report...
    start %BACKEND_DIR%\htmlcov\index.html
)
goto done

:backend_fast
echo.
echo Running Fast Backend Tests...
echo ============================================================
cd /d "%BACKEND_DIR%"
python -m pytest -m "not slow" -v
if %errorlevel% neq 0 echo FAILED: Fast tests failed
goto done

REM ─────────────────────────────────────────────────────────────
REM FRONTEND TESTS
REM ─────────────────────────────────────────────────────────────

:frontend_all
echo.
echo Running All Frontend Tests...
echo ============================================================
cd /d "%FRONTEND_DIR%"
call npm test
if %errorlevel% neq 0 echo FAILED: Frontend tests failed
goto done

:frontend_lint
echo.
echo Linting Frontend Code...
echo ============================================================
cd /d "%FRONTEND_DIR%"
call npm run lint
if %errorlevel% neq 0 echo FAILED: Frontend lint failed
goto done

:frontend_build
echo.
echo Building Frontend...
echo ============================================================
cd /d "%FRONTEND_DIR%"
call npm run build
if %errorlevel% neq 0 echo FAILED: Frontend build failed
goto done

REM ─────────────────────────────────────────────────────────────
REM INTEGRATION TESTS
REM ─────────────────────────────────────────────────────────────

:api_smoke
echo.
echo Running API Smoke Tests...
echo ============================================================
echo.
echo Checking if backend is running at http://localhost:8000/api/v1...
curl -s http://localhost:8000/api/v1/topics?grade_level=3 >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Backend not running at http://localhost:8000
    echo Start with: cd backend ^&^& uvicorn app.main:app --reload
    goto done
)
echo [OK] Backend is running
echo.
echo Testing GET /topics (grade 3)...
curl -s http://localhost:8000/api/v1/topics?grade_level=3
echo.
echo [OK] API smoke tests completed
goto done

:performance
echo.
echo Running Performance Tests...
echo ============================================================
echo NOTE: Performance tests require Apache Bench (ab)
echo Install: choco install apache-httpd  or download from https://httpd.apache.org/
echo.
echo Skipping performance tests (optional)
goto done

:database
echo.
echo Running Database Integrity Tests...
echo ============================================================
echo Database tests would verify:
echo   - Foreign key constraints
echo   - Referential integrity
echo   - RLS policies
echo   - Migration idempotence
echo.
echo NOTE: Run these in Supabase SQL editor
goto done

:docker
echo.
echo Running Docker Container Tests...
echo ============================================================
echo Building backend Docker image...
docker build -t primepal-backend "%BACKEND_DIR%"
if %errorlevel% neq 0 (
    echo ERROR: Docker build failed
    goto done
)
echo [OK] Backend image built
echo.
echo Running tests in container...
docker run --rm ^
    -e SUPABASE_URL=https://test.supabase.co ^
    -e SUPABASE_ANON_KEY=test-key ^
    -e STUDENT_JWT_SECRET=test-secret ^
    primepal-backend ^
    pytest -v
goto done

:full_suite
echo.
echo ============================================================
echo Running Full Test Suite
echo ============================================================
echo.
echo [1/5] Backend Tests...
cd /d "%BACKEND_DIR%"
python -m pytest -v --tb=short
if %errorlevel% neq 0 (
    echo FAILED: Backend tests failed
    goto done
)
echo [OK] Backend tests passed
echo.

echo [2/5] Frontend Lint...
cd /d "%FRONTEND_DIR%"
call npm run lint
if %errorlevel% neq 0 (
    echo WARNING: Frontend lint failed (continuing...)
)
echo.

echo [3/5] API Smoke Tests...
curl -s http://localhost:8000/api/v1/topics?grade_level=3 >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Backend is running and responding
) else (
    echo NOTE: Backend not running (start separately with: cd backend ^&^& uvicorn app.main:app --reload)
)
echo.

echo [4/5] Frontend Build...
cd /d "%FRONTEND_DIR%"
call npm run build
if %errorlevel% neq 0 (
    echo WARNING: Frontend build failed
)
echo.

echo [5/5] Test Summary...
echo ============================================================
echo Full test suite completed!
echo.
echo Next steps:
echo   - Check output above for any failures
echo   - Run coverage: RUN_TESTS.bat coverage
echo   - Manual testing: http://localhost:3000
goto done

REM ─────────────────────────────────────────────────────────────
REM HELP
REM ─────────────────────────────────────────────────────────────

:show_help
echo.
echo PrimePal Test Runner for Windows
echo.
echo USAGE:
echo   RUN_TESTS.bat [command]
echo.
echo BACKEND TESTS:
echo   all             - Run all backend tests
echo   auth            - Run authentication tests
echo   classrooms      - Run classroom management tests
echo   missions        - Run mission tests
echo   topics          - Run curriculum topics tests
echo   chat            - Run chat tests
echo   interactions    - Run interaction logging tests
echo   evaluator       - Run analytics tests
echo   ingestion       - Run curriculum ingestion tests
echo   journeys        - Run full user journey tests
echo   coverage        - Run tests with coverage report
echo   fast            - Run fast tests only
echo.
echo FRONTEND TESTS:
echo   frontend-all    - Run all frontend tests
echo   frontend-lint   - Lint frontend code
echo   frontend-build  - Build frontend
echo.
echo INTEGRATION TESTS:
echo   api-smoke       - Quick API endpoint tests
echo   performance     - Load testing (requires Apache Bench)
echo   database        - Database integrity checks
echo   docker          - Run tests in Docker container
echo   full            - Run complete test suite (DEFAULT)
echo.
echo HELP:
echo   help            - Show this message
echo   -h, --help      - Show this message
echo.
echo EXAMPLES:
echo   RUN_TESTS.bat auth              # Test authentication
echo   RUN_TESTS.bat missions          # Test missions
echo   RUN_TESTS.bat coverage          # Get coverage report
echo   RUN_TESTS.bat full              # Run everything
echo.

:done
echo.
pause
endlocal
