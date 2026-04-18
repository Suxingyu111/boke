@echo off
setlocal

set ROOT_DIR=%~dp0..
set SERVER_DIR=%ROOT_DIR%\server
set CLIENT_DIR=%ROOT_DIR%\client
set FRONTEND_PORT=
set FRONTEND_URL=

call "%ROOT_DIR%\scripts\start-local-dev.bat"
if errorlevel 1 (
    echo [ERROR] Failed to start local development stack.
    exit /b 1
)

call :wait_http "Elasticsearch" "http://127.0.0.1:9200/" 90
if errorlevel 1 exit /b 1

call :wait_http "Backend" "http://127.0.0.1:3000/api/health" 90
if errorlevel 1 exit /b 1

call :resolve_frontend_url
if errorlevel 1 exit /b 1

call :wait_http "Frontend" "%FRONTEND_URL%" 90
if errorlevel 1 exit /b 1

echo [STEP] Refreshing content and rebuilding search index...
pushd "%SERVER_DIR%"
call npm run search:refresh-local
if errorlevel 1 (
    popd
    echo [ERROR] Search refresh failed.
    exit /b 1
)
popd

echo [STEP] Running directed search page E2E on Chromium...
pushd "%CLIENT_DIR%"
set PLAYWRIGHT_BASE_URL=%FRONTEND_URL%
call npm run e2e -- --project=chromium-desktop tests/e2e/public-site.spec.ts --grep "@search-smoke"
set E2E_EXIT=%ERRORLEVEL%
popd

if not "%E2E_EXIT%"=="0" (
    echo [ERROR] Directed E2E failed with exit code %E2E_EXIT%.
    exit /b %E2E_EXIT%
)

echo [DONE] Search smoke flow finished successfully.
echo [DONE] Frontend base URL: %FRONTEND_URL%
exit /b 0

:resolve_frontend_url
call :is_port_listening 5173
if not errorlevel 1 (
    set FRONTEND_PORT=5173
    set FRONTEND_URL=http://127.0.0.1:5173
    exit /b 0
)

call :is_port_listening 5174
if not errorlevel 1 (
    set FRONTEND_PORT=5174
    set FRONTEND_URL=http://127.0.0.1:5174
    exit /b 0
)

echo [ERROR] Frontend dev server is not listening on 5173 or 5174.
exit /b 1

:wait_http
set TARGET_NAME=%~1
set TARGET_URL=%~2
set MAX_RETRIES=%~3

for /L %%I in (1,1,%MAX_RETRIES%) do (
    powershell.exe -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing '%TARGET_URL%' -TimeoutSec 3; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        echo [READY] %TARGET_NAME% responded: %TARGET_URL%
        exit /b 0
    )
)

echo [ERROR] %TARGET_NAME% did not become ready in time: %TARGET_URL%
exit /b 1

:is_port_listening
netstat -ano | findstr /C:":%~1" | findstr /C:"LISTENING" >nul
if errorlevel 1 (
    exit /b 1
)
exit /b 0