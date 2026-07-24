@echo off
chcp 65001 >nul
echo ==================================================
echo 🚀 启动 LAN-Share 局域网文件共享系统 (Windows)
echo ==================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js，请先安装 Node.js (v18+)
    pause
    exit /b 1
)

if not exist "server\node_modules" (
    echo 📦 正在安装后端依赖...
    npm install --prefix server
)

if not exist "client\node_modules" (
    echo 📦 正在安装前端依赖...
    npm install --prefix client
)

if not exist "client\dist" (
    echo 🔨 正在构建前端页面...
    npm run build --prefix client
)

echo 🌐 启动服务器中...
node server\index.js
pause
