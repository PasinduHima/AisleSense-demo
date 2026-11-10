@echo off
title AisleSense - Working System
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo The local environment is missing. Please see README.md.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" "launch.py" --system
if errorlevel 1 pause
