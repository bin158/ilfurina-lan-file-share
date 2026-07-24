#!/bin/bash
echo "=================================================="
echo "🖥️ 启动 LAN-Share 服务端桌面管理面板 GUI (Linux)"
echo "=================================================="

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js (v18+)"
    exit 1
fi

# Install dependencies if missing
if [ ! -d "server/node_modules/electron" ]; then
    echo "📦 正在安装 Desktop GUI 依赖..."
    npm install --prefix server
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 正在安装前端依赖..."
    npm install --prefix client
fi

# Always build client to ensure Web UI served to mobile/web clients is updated
echo "🔨 正在同步构建最新 Web 界面..."
npm run build --prefix client

# Check if X server / DISPLAY is available
if [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
    echo "⚠️ 警告: 未检测到图形桌面环境 (\$DISPLAY 为空)。"
    echo "🌐 自动切换为无界面 Web 服务器模式启动..."
    node server/index.js
else
    echo "🚀 启动桌面 Admin GUI 窗口..."
    npx electron server/gui/main.js --disable-vulkan --ozone-platform=x11 --no-sandbox
fi
