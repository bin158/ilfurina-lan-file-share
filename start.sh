#!/bin/bash
echo "=================================================="
echo "🚀 启动 LAN-Share 局域网文件共享系统 (Linux)"
echo "=================================================="

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js (v18+)"
    exit 1
fi

# Check node_modules in server
if [ ! -d "server/node_modules" ]; then
    echo "📦 正在安装后端依赖..."
    npm install --prefix server
fi

# Check node_modules in client
if [ ! -d "client/node_modules" ]; then
    echo "📦 正在安装前端依赖..."
    npm install --prefix client
fi

# Build client if dist folder does not exist
if [ ! -d "client/dist" ]; then
    echo "🔨 正在构建前端页面..."
    npm run build --prefix client
fi

echo "🌐 启动服务器中..."
node server/index.js
