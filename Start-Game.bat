@echo off
cd /d "%~dp0"
echo ========================================
echo   Starting TNT Trivia Scoreboard...
echo   The browser will open shortly.
echo   Keep this window open while playing!
echo ========================================
echo.
npm run dev -- --open
pause
