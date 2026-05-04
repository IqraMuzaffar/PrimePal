@echo off
REM PrimePal Backend Startup Script
REM This script starts the FastAPI backend server

title PrimePal Backend - API Server
color 0A

echo.
echo ============================================================
echo   PRIMEPAL BACKEND API SERVER
echo ============================================================
echo.
echo Backend will run at: http://localhost:8000
echo API Docs will be at: http://localhost:8000/docs
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"

REM Activate virtual environment
echo Activating Python virtual environment...
call venv\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to activate virtual environment
    echo Make sure to run: .\SETUP.ps1
    echo.
    pause
    exit /b 1
)

echo Virtual environment activated
echo.

REM Start backend server
echo Starting Uvicorn server...
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

REM If we reach here, the server was stopped
echo.
echo Backend server stopped.
pause
