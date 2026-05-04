@echo off
REM PrimePal Frontend Startup Script
REM This script starts the Next.js development server

title PrimePal Frontend - Next.js Dev Server
color 0A

echo.
echo ============================================================
echo   PRIMEPAL FRONTEND - NEXT.JS DEVELOPMENT SERVER
echo ============================================================
echo.
echo Frontend will run at: http://localhost:3000
echo.

REM Navigate to frontend directory
cd /d "%~dp0frontend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo ERROR: node_modules not found
    echo Please run: npm install
    echo.
    pause
    exit /b 1
)

REM Start frontend server
echo Starting Next.js development server...
echo.
call npm run dev

REM If we reach here, the server was stopped
echo.
echo Frontend server stopped.
pause
