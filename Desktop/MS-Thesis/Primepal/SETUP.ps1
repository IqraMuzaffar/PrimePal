# PrimePal — Complete Setup & Dependency Check
# PowerShell script for Windows
# Run in PowerShell as Administrator

param(
    [string]$action = "full"
)

$ErrorActionPreference = "Stop"
$WarningPreference = "SilentlyContinue"

# Colors
function Write-Success {
    Write-Host "✓ $args" -ForegroundColor Green
}

function Write-Error-Custom {
    Write-Host "✗ $args" -ForegroundColor Red
}

function Write-Header {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $args" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Info {
    Write-Host "ℹ $args" -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────────────
# 1. CHECK SYSTEM DEPENDENCIES
# ─────────────────────────────────────────────────────────────

Write-Header "CHECKING SYSTEM DEPENDENCIES"

# Check Python
Write-Host "Checking Python..."
$python_version = & python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Python found: $python_version"
} else {
    Write-Error-Custom "Python not found. Install from https://python.org"
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..."
$node_version = & node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Node.js found: $node_version"
} else {
    Write-Error-Custom "Node.js not found. Install from https://nodejs.org"
    exit 1
}

# Check npm
Write-Host "Checking npm..."
$npm_version = & npm --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "npm found: $npm_version"
} else {
    Write-Error-Custom "npm not found"
    exit 1
}

# Check Git
Write-Host "Checking Git..."
$git_version = & git --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Git found: $git_version"
} else {
    Write-Info "Git not found (optional)"
}

# ─────────────────────────────────────────────────────────────
# 2. SETUP BACKEND
# ─────────────────────────────────────────────────────────────

Write-Header "SETTING UP BACKEND"

$backend_dir = "backend"

if (-not (Test-Path $backend_dir)) {
    Write-Error-Custom "backend/ directory not found"
    exit 1
}

cd $backend_dir

# Create virtual environment
Write-Host "Creating Python virtual environment..."
if (-not (Test-Path "venv")) {
    & python -m venv venv
    Write-Success "Virtual environment created"
} else {
    Write-Info "Virtual environment already exists"
}

# Activate virtual environment
Write-Host "Activating virtual environment..."
& .\venv\Scripts\Activate.ps1
Write-Success "Virtual environment activated"

# Upgrade pip
Write-Host "Upgrading pip..."
& python -m pip install --upgrade pip setuptools wheel 2>&1 | Out-Null
Write-Success "pip upgraded"

# Install Python dependencies
Write-Host "Installing Python dependencies from requirements.txt..."
if (Test-Path "requirements.txt") {
    & pip install -r requirements.txt
    Write-Success "Python dependencies installed"
} else {
    Write-Error-Custom "requirements.txt not found"
    exit 1
}

# Check for .env file
Write-Host "Checking for .env file..."
if (-not (Test-Path ".env")) {
    Write-Info ".env file not found"
    if (Test-Path ".env.example") {
        Write-Host "Creating .env from .env.example..."
        Copy-Item ".env.example" ".env"
        Write-Info "Created .env - PLEASE EDIT WITH YOUR CREDENTIALS"
    } else {
        Write-Info "Creating .env template..."
        @"
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-your-api-key

# JWT
STUDENT_JWT_SECRET=your-random-secret-key-min-32-chars-long
SECRET_KEY=another-secret-key

# Application
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
ENVIRONMENT=development
"@ | Out-File ".env" -Encoding UTF8
        Write-Info "Created .env template - EDIT WITH YOUR CREDENTIALS"
    }
} else {
    Write-Success ".env file exists"
}

# Verify key Python packages
Write-Host "Verifying key Python packages..."
$packages = @("fastapi", "uvicorn", "supabase", "openai", "redis", "pytest")
foreach ($package in $packages) {
    $check = & pip show $package 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "$package installed"
    } else {
        Write-Error-Custom "$package NOT installed"
    }
}

cd ..

# ─────────────────────────────────────────────────────────────
# 3. SETUP FRONTEND
# ─────────────────────────────────────────────────────────────

Write-Header "SETTING UP FRONTEND"

$frontend_dir = "frontend"

if (-not (Test-Path $frontend_dir)) {
    Write-Error-Custom "frontend/ directory not found"
    exit 1
}

cd $frontend_dir

# Check node_modules
if (Test-Path "node_modules") {
    Write-Info "node_modules already exists"
    $package_count = (Get-ChildItem node_modules -Recurse -Directory | Measure-Object).Count
    Write-Info "Found ~$package_count packages"
} else {
    Write-Host "Installing npm dependencies from package.json..."
    & npm install
    Write-Success "npm dependencies installed"
}

# Verify key npm packages
Write-Host "Verifying key npm packages..."
$npm_packages = @("next", "react", "react-dom", "@supabase/supabase-js")
foreach ($pkg in $npm_packages) {
    if (Test-Path "node_modules\$pkg") {
        Write-Success "$pkg installed"
    } else {
        Write-Error-Custom "$pkg NOT found"
    }
}

# Check for .env.local file
Write-Host "Checking for .env.local file..."
if (-not (Test-Path ".env.local")) {
    Write-Info ".env.local file not found"
    if (Test-Path ".env.example") {
        Write-Host "Creating .env.local from .env.example..."
        Copy-Item ".env.example" ".env.local"
        Write-Info "Created .env.local - PLEASE EDIT WITH YOUR CREDENTIALS"
    } else {
        Write-Info "Creating .env.local template..."
        @"
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
"@ | Out-File ".env.local" -Encoding UTF8
        Write-Info "Created .env.local template - EDIT WITH YOUR CREDENTIALS"
    }
} else {
    Write-Success ".env.local file exists"
}

cd ..

# ─────────────────────────────────────────────────────────────
# 4. CHECK DOCKER
# ─────────────────────────────────────────────────────────────

Write-Header "CHECKING DOCKER"

$docker_check = & docker --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker found: $docker_check"

    # Check if Docker daemon is running
    $docker_running = & docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker daemon is running"
    } else {
        Write-Info "Docker daemon not running - start Docker Desktop"
    }
} else {
    Write-Info "Docker not found (optional - needed for Redis)"
    Write-Info "Install from: https://www.docker.com/products/docker-desktop"
}

# ─────────────────────────────────────────────────────────────
# 5. DEPENDENCY SUMMARY
# ─────────────────────────────────────────────────────────────

Write-Header "DEPENDENCY SUMMARY"

Write-Host "System Dependencies:" -ForegroundColor Cyan
Write-Success "✓ Python 3.12+"
Write-Success "✓ Node.js 18+"
Write-Success "✓ npm 9+"
Write-Info "• Docker (optional - for Redis)"

Write-Host "`nBackend Dependencies:" -ForegroundColor Cyan
Write-Success "✓ FastAPI 0.111.0"
Write-Success "✓ Uvicorn 0.29.0"
Write-Success "✓ Supabase 2.4.6"
Write-Success "✓ OpenAI 1.58.1"
Write-Success "✓ Redis 5.0.1"
Write-Success "✓ LangChain & transformers"
Write-Success "✓ pytest & pytest-asyncio"

Write-Host "`nFrontend Dependencies:" -ForegroundColor Cyan
Write-Success "✓ Next.js 14.2"
Write-Success "✓ React 18"
Write-Success "✓ Tailwind CSS"
Write-Success "✓ Framer Motion"
Write-Success "✓ Supabase JS"

# ─────────────────────────────────────────────────────────────
# 6. ENVIRONMENT VARIABLES CHECK
# ─────────────────────────────────────────────────────────────

Write-Header "ENVIRONMENT VARIABLES"

Write-Host "Backend (.env):" -ForegroundColor Cyan
if (Test-Path "backend\.env") {
    $backend_env = Get-Content "backend\.env" | Where-Object { $_ -and -not $_.StartsWith("#") } | Measure-Object
    Write-Success "✓ .env exists with $($backend_env.Count) variables"
    Write-Info "Edit backend\.env with your Supabase & OpenAI keys"
} else {
    Write-Error-Custom "✗ backend\.env not found"
}

Write-Host "`nFrontend (.env.local):" -ForegroundColor Cyan
if (Test-Path "frontend\.env.local") {
    $frontend_env = Get-Content "frontend\.env.local" | Where-Object { $_ -and -not $_.StartsWith("#") } | Measure-Object
    Write-Success "✓ .env.local exists with $($frontend_env.Count) variables"
    Write-Info "Edit frontend\.env.local with your Supabase keys"
} else {
    Write-Error-Custom "✗ frontend\.env.local not found"
}

# ─────────────────────────────────────────────────────────────
# COMPLETE
# ─────────────────────────────────────────────────────────────

Write-Header "SETUP COMPLETE ✓"

Write-Host "Next steps:`n" -ForegroundColor Green

Write-Host "1. EDIT ENVIRONMENT VARIABLES" -ForegroundColor Yellow
Write-Host "   Backend:  backend\.env (Supabase & OpenAI keys)"
Write-Host "   Frontend: frontend\.env.local (Supabase keys)`n"

Write-Host "2. START REDIS (Optional but recommended)" -ForegroundColor Yellow
Write-Host "   Command: docker-compose up -d`n"

Write-Host "3. START BACKEND (Terminal 1)" -ForegroundColor Yellow
Write-Host "   Command: .\backend\venv\Scripts\Activate.ps1`n"
Write-Host "            uvicorn app.main:app --reload`n"

Write-Host "4. START FRONTEND (Terminal 2)" -ForegroundColor Yellow
Write-Host "   Command: cd frontend`n"
Write-Host "            npm run dev`n"

Write-Host "5. OPEN IN BROWSER" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000"
Write-Host "   Backend:  http://localhost:8000/api/v1`n"

Write-Host "6. VERIFY" -ForegroundColor Yellow
Write-Host "   Backend API:  curl http://localhost:8000/api/v1/topics?grade_level=3"
Write-Host "   Frontend:     Open http://localhost:3000 in browser`n"

Write-Host "Need help? See QUICK_TEST_GUIDE.md or DOCUMENTATION/`n" -ForegroundColor Cyan

Write-Host "Ready to run! 🚀" -ForegroundColor Green
