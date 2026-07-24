import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import db, { initDb, getSharedStoragePath } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import fileRoutes from './routes/files.js';
import logRoutes from './routes/logs.js';
import systemRoutes from './routes/system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// Initialize SQLite database
initDb();

// Seed initial sample files in storage if empty
const storageDir = getSharedStoragePath();
if (fs.existsSync(storageDir) && fs.readdirSync(storageDir).length === 0) {
  fs.writeFileSync(
    path.join(storageDir, 'Welcome_to_LAN_Share.txt'),
    `==============================================
 Welcome to LAN-Share 局域网文件共享系统
==============================================

This is your local network file sharing server.
支持 Linux 与 Windows 跨平台文件传输、多用户权限分配与下载日志记录。

Key Features / 主要功能:
1. 局域网内任意设备通过浏览器访问 (支持电脑、手机、平板)
2. 多用户权限管理: 管理员可添加用户，设置下载/上传/删除权限
3. 详细下载日志: 记录下载者、文件名称、文件大小、下载时间及 IP
4. 文件在线预览: 图片、音频、视频 (支持 Seek)、文本在线预览

Default Admin Account:
  Username: admin
  Password: admin123

Default Guest Account:
  Username: guest
  Password: guest123
`,
    'utf8'
  );

  const docsFolder = path.join(storageDir, 'Documents');
  fs.mkdirSync(docsFolder, { recursive: true });
  fs.writeFileSync(path.join(docsFolder, 'LAN_Share_Guide.md'), '# LAN Share Usage Guide\n\n- Access via browser\n- Manage users in Admin Panel\n- Track downloads in Download Logs', 'utf8');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/system', systemRoutes);

// Serve Client Static Build if present
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>LAN Share API Server</title></head>
        <body style="font-family: system-ui; padding: 2rem; background: #0f172a; color: #f8fafc;">
          <h2>🚀 LAN-Share Backend is Running</h2>
          <p>Client build not found. If in development, start Vite client dev server or run <code>npm run build:client</code>.</p>
        </body>
      </html>
    `);
  });
}

// Start Server listening on 0.0.0.0 (all interfaces)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🌐 LAN-Share Server listening on http://0.0.0.0:${PORT}`);
  console.log(`📁 Shared Storage Root: ${storageDir}`);
  console.log(`==================================================\n`);
});

// Friendly handling for EADDRINUSE port conflicts
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ 端口 ${PORT} 已被占用！`);
    console.error(`可能原因:`);
    console.error(`1. Docker 容器正以端口 ${PORT} 后台运行中 (可以运行 docker compose down 停止)`);
    console.error(`2. 已有另一个 node 进程或服务占用了端口 ${PORT}`);
    console.error(`\n解决办法:`);
    console.error(`- 停止占用端口的进程/Docker 容器`);
    console.error(`- 或换用其他端口启动: PORT=3001 npm start\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
