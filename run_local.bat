@echo off
echo Starting AI Library Management System...
echo.
C:\Users\arunp\AppData\Local\Programs\Python\Python312\python.exe -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
echo.
echo Server stopped. Press any key to close...
pause
