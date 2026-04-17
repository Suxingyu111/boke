@echo off
REM ========================================
REM  博客系统 - Elasticsearch 启动脚本
REM  使用方式: 双击运行或在 cmd 中执行
REM ========================================

set ES_HOME=%~dp0elasticsearch-8.13.4

if not exist "%ES_HOME%" (
    echo [错误] 未找到 Elasticsearch 目录: %ES_HOME%
    echo 请先解压 elasticsearch-8.13.4-windows-x86_64.zip 到当前目录
    pause
    exit /b 1
)

REM 配置为开发单节点模式，关闭安全认证（本地开发用）
set ES_JAVA_OPTS=-Xms256m -Xmx512m

echo ========================================
echo  正在启动 Elasticsearch 8.13.4
echo  地址: http://localhost:9200
echo  内存: 256MB - 512MB
echo  按 Ctrl+C 停止
echo ========================================

"%ES_HOME%\bin\elasticsearch.bat"
