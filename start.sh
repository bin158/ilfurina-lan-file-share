#!/bin/bash
echo "=================================================="
echo "🚀 启动 LAN-Share 局域网文件共享系统 (Linux)"
echo "=================================================="

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js (v18+)"
    exit 1
fi

# Install dependencies if missing
if [ ! -d "server/node_modules" ]; then
    echo "📦 正在安装后端依赖..."
    npm install --prefix server
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 正在安装前端依赖..."
    npm install --prefix client
fi

# Always build client to ensure Web UI is identical to Docker build
echo "🔨 正在同步构建最新前端 Web 界面..."
npm run build --prefix client

echo "🌐 启动服务器中..."
node server/index.js
