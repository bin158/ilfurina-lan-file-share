@echo off
chcp 65001 >nul
echo ==================================================
echo 🖥️ 启动 LAN-Share 服务端桌面管理面板 GUI (Windows)
echo ==================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js，请先安装 Node.js (v18+)
    pause
    exit /b 1
)

if not exist "server\node_modules\electron" (
    echo 📦 正在安装 Desktop GUI 依赖...
    npm install --prefix server
)

if not exist "client\dist" (
    echo 🔨 正在构建 Web 前端...
    npm run build --prefix client
)

echo 🚀 启动桌面 Admin GUI 窗口...
npx electron server\gui\main.js
pause
