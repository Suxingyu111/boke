@echo off
REM ========================================
REM  博客系统 - Elasticsearch 初始配置
REM  首次解压后运行一次即可
REM ========================================

set ES_HOME=%~dp0..\elasticsearch-8.13.4
set ES_CONFIG=%ES_HOME%\config\elasticsearch.yml

if not exist "%ES_CONFIG%" (
    echo [错误] 未找到 ES 配置文件: %ES_CONFIG%
    echo 请先解压 ES 到 server 同级目录
    pause
    exit /b 1
)

echo 正在写入开发模式配置...

(
echo # 博客系统开发配置 - 自动生成
echo cluster.name: blog-dev
echo node.name: blog-node-1
echo network.host: 127.0.0.1
echo http.port: 9200
echo discovery.type: single-node
echo # 关闭安全认证（仅限本地开发）
echo xpack.security.enabled: false
echo xpack.security.enrollment.enabled: false
echo xpack.security.http.ssl.enabled: false
echo xpack.security.transport.ssl.enabled: false
) > "%ES_CONFIG%"

echo [完成] ES 配置已写入: %ES_CONFIG%
echo 现在可以运行 start-elasticsearch.bat 启动 ES
pause
