@echo off
cd /d "%~dp0"
echo Starting game server...
echo.
echo Open this URL in your browser:
echo http://127.0.0.1:8000/
echo.

set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 (
  set "NODE_EXE=C:\Users\kouki\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

"%NODE_EXE%" server.mjs
pause
