@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   Starting AI Library Voice Agent (Development)
echo ========================================================
echo.

:: 1. Check Python executable
where py >nul 2>nul
if %errorlevel%==0 (
    set PY_CMD=py
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        set PY_CMD=python
    ) else (
        echo [ERROR] Python not found in PATH. Please install Python 3.10+ and add to PATH.
        pause
        exit /b 1
    )
)

:: 2. Automatically open web browser after 3 seconds
start "" cmd /c "timeout /t 3 >nul && start http://localhost:8000"

:: 3. Start Backend Server (Serves API + Built React Frontend)
echo Starting Backend & Frontend Server on http://localhost:8000 ...
%PY_CMD% -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo Server stopped. Press any key to close...
pause
