@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

if exist ".env" (
  for /f "usebackq tokens=* delims=" %%A in (".env") do (
    set "line=%%A"
    if not "!line!"=="" if not "!line:~0,1!"=="#" (
      for /f "tokens=1* delims==" %%K in ("!line!") do (
        set "%%K=%%L"
      )
    )
  )
)

if "%APP_NAME%"=="" set "APP_NAME=freshmart-api"
if "%APP_ENV%"=="" set "APP_ENV=development"
if "%APP_PORT%"=="" set "APP_PORT=8080"
if "%JWT_SECRET%"=="" set "JWT_SECRET=freshmart-dev-secret"
if "%RATE_LIMIT_PER_MINUTE%"=="" set "RATE_LIMIT_PER_MINUTE=120"
if "%UPLOAD_DIR%"=="" set "UPLOAD_DIR=uploads"

echo [freshmart] APP_ENV=%APP_ENV% APP_PORT=%APP_PORT%
echo [freshmart] JWT_SECRET loaded: %JWT_SECRET:~0,6%******

go run .\cmd\server\main.go
set "exit_code=%ERRORLEVEL%"

if not "%exit_code%"=="0" (
  echo [freshmart] server exited with code %exit_code%
)

endlocal & exit /b %exit_code%
