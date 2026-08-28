@echo off
echo Starting AI Library Management System...
echo.

echo Building latest UI updates...
cd frontend
call npm run build
cd ..

:: Automatically open the web browser after 3 seconds to let the server start
start cmd /c "timeout /t 3 >nul && start http://localhost:8000"

echo Starting Backend Server...
C:\Users\arunp\AppData\Local\Programs\Python\Python312\python.exe -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
echo.
echo Server stopped. Press any key to close...
pause
