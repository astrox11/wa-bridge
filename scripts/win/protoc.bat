@echo off
setlocal EnableDelayedExpansion

where protoc >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  protoc --version
  pause
  exit /b
)

net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Error: Run as Administrator.
  pause
  exit /b
)

set "PROTOC_URL=https://github.com/protocolbuffers/protobuf/releases/download/v29.1/protoc-29.1-win64.zip"
set "DEST_DIR=C:\protoc"
set "TEMP_ZIP=%TEMP%\protoc.zip"

powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PROTOC_URL%' -OutFile '%TEMP_ZIP%'"

if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%DEST_DIR%' -Force"

setx /M PATH "%DEST_DIR%\bin;%PATH%"

if exist "%TEMP_ZIP%" del "%TEMP_ZIP%"

echo Installation complete. Restart your terminal.
pause
