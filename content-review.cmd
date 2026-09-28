@echo off
setlocal enabledelayedexpansion
title BrainCipher Content Review Workbench
cd /d "%~dp0"

echo ==============================================================
echo  Launching BrainCipher Content Review Workbench...
echo ==============================================================

where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python scripts\content\review_server.py %*
    goto :eof
)

where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    py -3 scripts\content\review_server.py %*
    goto :eof
)

echo [ERROR] Python was not found on your PATH.
echo Please ensure Python 3.10+ is installed and available in PATH.
pause
