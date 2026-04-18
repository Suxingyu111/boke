@echo off
setlocal

set ROOT_DIR=%~dp0..
set SERVER_DIR=%ROOT_DIR%\server
set CLIENT_DIR=%ROOT_DIR%\client
set ES_SCRIPT=%SERVER_DIR%\scripts\start-elasticsearch.bat

if not exist "%ES_SCRIPT%" (
    echo [ERROR] Elasticsearch launcher not found: %ES_SCRIPT%
    exit /b 1
)

call :is_port_listening 9200
if errorlevel 1 (
    echo [1/3] Starting Elasticsearch...
    start "boke-elasticsearch" cmd /k "cd /d %SERVER_DIR% && call scripts\start-elasticsearch.bat"
) else (
    echo [1/3] Elasticsearch already listening on 9200. Skip.
)

call :is_port_listening 3000
if errorlevel 1 (
    echo [2/3] Starting backend watch server...
    start "boke-backend" cmd /k "cd /d %SERVER_DIR% && npm run start:dev"
) else (
    echo [2/3] Backend already listening on 3000. Skip.
)

call :is_port_listening 5173
if errorlevel 1 (
    call :is_port_listening 5174
    if errorlevel 1 (
        echo [3/3] Starting frontend dev server...
        start "boke-frontend" cmd /k "cd /d %CLIENT_DIR% && npm run dev -- --host 127.0.0.1 --port 5173"
    ) else (
        echo [3/3] Frontend already listening on 5174. Skip.
    )
) else (
    echo [3/3] Frontend already listening on 5173. Skip.
)

echo.
echo Local development environment check finished.
echo Backend health: http://127.0.0.1:3000/api/health
echo Frontend default: http://127.0.0.1:5173/
echo Frontend fallback: http://127.0.0.1:5174/
echo Elasticsearch: http://127.0.0.1:9200/
exit /b 0

:is_port_listening
netstat -ano | findstr /C:":%~1" | findstr /C:"LISTENING" >nul
if errorlevel 1 (
    exit /b 1
)
exit /b 0