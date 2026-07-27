@echo off
echo Installing requirements...
py -m pip install -r backend\requirements.txt

echo.
echo Setting Gemini API Key...
set GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

echo.
echo Starting the RAG Backend Server...
py backend\main.py
pause
