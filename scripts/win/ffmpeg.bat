@echo off
setlocal EnableDelayedExpansion

where ffmpeg >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  ffmpeg -version | findstr "version"
  pause
  exit /b
)

net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Error: Run as Administrator.
  pause
  exit /b
)

set "FFMPEG_URL=https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
set "DEST_DIR=C:\ffmpeg"
set "TEMP_ZIP=%TEMP%\ffmpeg.zip"

powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%FFMPEG_URL%' -OutFile '%TEMP_ZIP%'"

if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%DEST_DIR%' -Force"

for /d %%i in ("%DEST_DIR%\ffmpeg-*") do (
  xcopy "%%i\*" "%DEST_DIR%\" /E /H /Y >nul
  rd /s /q "%%i"
)

setx /M PATH "%DEST_DIR%\bin;%PATH%"

if exist "%TEMP_ZIP%" del "%TEMP_ZIP%"

pause
