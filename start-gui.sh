#!/bin/bash
echo "=================================================="
echo "🖥️ 启动 LAN-Share 服务端桌面管理面板 GUI (Linux)"
echo "=================================================="

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js (v18+)"
    exit 1
fi

# Check electron installed in server
if [ ! -d "server/node_modules/electron" ]; then
    echo "📦 正在安装 Desktop GUI 依赖..."
    npm install --prefix server
fi

# Build client if dist folder does not exist
if [ ! -d "client/dist" ]; then
    echo "🔨 正在构建 Web 前端..."
    npm run build --prefix client
fi

echo "🚀 启动桌面 Admin GUI 窗口..."
npx electron server/gui/main.js --disable-vulkan --ozone-platform=x11 --no-sandbox
