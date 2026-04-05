@echo off
echo ==========================================
echo Ominus AI - Build Script
echo ==========================================

REM Check if Rust is installed
cargo --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Rust is not installed!
    echo.
    echo Please install Rust from https://rustup.rs/
    echo Or run: winget install Rustlang.Rustup
    exit /b 1
)

echo [1/3] Checking code...
cargo check
if errorlevel 1 (
    echo [ERROR] Code check failed!
    exit /b 1
)

echo [2/3] Building release binary...
cargo build --release
if errorlevel 1 (
    echo [ERROR] Build failed!
    exit /b 1
)

echo [3/3] Build successful!
echo.
echo ==========================================
echo Setup Instructions:
echo ==========================================
echo.
echo 1. Set your API keys:
echo    set GEMINI_API_KEY=your_key_here
echo    set GROQ_API_KEY=your_key_here
echo.
echo 2. Run the server:
echo    cargo run --release
echo    or
echo    .\target\release\ominus.exe
echo.
echo 3. Open browser to: http://localhost:3000
echo ==========================================
