@echo off
rem Neon Torino: double-click to play the latest version (Windows, Unreal Engine 5.8 installed).
rem 1. downloads the latest changes from GitHub, 2. builds the C++ if it changed, 3. starts the game (no editor).
rem Not tried on Windows from the cloud session that wrote it: if a step fails, the window stays open with the error.
setlocal
cd /d "%~dp0"
set "PROJECT=%~dp0unreal\NeonTorino\NeonTorino.uproject"
set "UE=%ProgramFiles%\Epic Games\UE_5.8"
if not exist "%UE%\Engine\Binaries\Win64\UnrealEditor.exe" (
  echo Unreal Engine 5.8 not found in "%UE%".
  echo Install it from the Epic Games Launcher, or change the UE line in play.bat.
  pause
  exit /b 1
)

echo [1/3] Downloading the latest version...
where git >nul 2>nul
if errorlevel 1 (
  echo Git not found: skipping the download. Use GitHub Desktop: Fetch origin, then Pull origin.
) else (
  git pull --ff-only || echo Could not update ^(local changes or another branch^): playing the current version.
  git lfs pull
)

echo [2/3] Building the game code ^(a few minutes the first time, seconds afterwards^)...
call "%UE%\Engine\Build\BatchFiles\Build.bat" NeonTorinoEditor Win64 Development -Project="%PROJECT%" -WaitMutex
if errorlevel 1 (
  echo Build failed: see the messages above. Visual Studio 2022 with "Game development with C++" is needed.
  pause
  exit /b 1
)

echo [3/3] Starting Neon Torino...
start "" "%UE%\Engine\Binaries\Win64\UnrealEditor.exe" "%PROJECT%" -game -windowed -ResX=1600 -ResY=900
endlocal
