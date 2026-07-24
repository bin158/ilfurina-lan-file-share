# LAN-Share 局域网跨平台文件共享与管理系统

一个类似 Samba 的局域网轻量级文件共享、传输与权限控制系统，支持 **Linux** 和 **Windows** 双平台以及 **Docker 容器化部署**。

任何连接同局域网的设备 (电脑、手机、平板) 均可通过浏览器直接访问、登录、浏览、下载文件，支持多用户权限管理、文件夹目录树上传、实时下载日志审计及全网 Notification 广播。

---

## 🌟 核心特性概览

### 📱 1. 移动端 100% 原生体验优化 (Client Mobile UI)
- **移动端底部导航栏 (Bottom Navigation Bar)**：自动切为 iOS/Android 风格的底部导航，方便单手操控切换“文件”、“日志”、“用户”及“扫码接入”。
- **触控优化文件卡片 (Mobile File Cards)**：手机端采用专门的大触控卡片展示文件类型图标、名称、大小与修改日期。
- **手机扫码直连**：内置 LAN IP 检测与自动 QR Code 生成，手机扫码即可直接开启传输。

### 📁 2. 自定义共享文件夹 & 完整文件夹上传
- **自定义共享根目录**：可在 Web 端或桌面 GUI 端将共享根目录切换为系统中的任意绝对路径（如 `/home/user/my_shares` 或 `D:\Shared`）。
- **文件夹目录树上传 (`webkitdirectory`)**：支持一次性选择包含多层子目录的完整文件夹上传，自动保留完整的层级目录结构。

### 🖥️ 3. 服务端桌面 Admin Panel GUI
- 专为服务端主机打造的 **Electron 桌面管理软件**（支持 Linux 与 Windows，且完美解决 Wayland/Vulkan 兼容问题）：
  - **可视化控制**：一键 ▶ **启动服务器** / ⏹ **停止服务器**、端口实时配置、一键打开共享文件夹。
  - **真实接入 IP 展示**：自动显示局域网真实 Primary LAN IP (如 `http://192.168.0.2:3000`) 替代 `0.0.0.0`。
  - **实时控制台与一键复制**：流式输出 HTTP 请求、用户登录、文件下载及 IP 记录，支持 **一键复制日志** 到剪贴板。

### 📢 4. 全网 Notification 广播与用户编辑
- **发送全局 Alert 广播**：管理员可在桌面 GUI 或 Web 端发布全网 Notification 广播通知，在线 Web 用户界面顶部实时弹出高亮通知横幅。
- **服务端修改用户信息**：可在桌面 GUI 或 Web 界面直接编辑用户账号、重置密码、修改细粒度权限（下载/上传/删除/允许路径）及封禁状态。

---

## 🔑 默认预设账号

系统初始化时会自动创建以下两个测试账号：

| 角色 | 用户名 | 默认密码 | 权限说明 |
| :--- | :--- | :--- | :--- |
| **系统管理员** | `admin` | `admin123` | 拥有全部权限：文件操作、自定义共享目录、发送广播、多用户管理与日志清空 |
| **访客用户** | `guest` | `guest123` | 仅支持浏览与下载文件 |

---

## 🐳 Docker 容器化部署 (推荐)

### 方法 1: 使用 Docker Compose (最简单)

在项目根目录下直接运行：

```bash
# 启动容器 (后台运行)
docker compose up -d
```

停止容器：
```bash
docker compose down
```

---

### 方法 2: 使用 Docker CLI 命令构建与运行

```bash
# 1. 构建 Docker 镜像
docker build -t lan-share:latest .

# 2. 运行 Docker 容器并挂载本地卷
docker run -d \
  --name lan-share \
  -p 3000:3000 \
  -v $(pwd)/storage:/app/server/storage \
  -v $(pwd)/data:/app/server/data \
  --restart unless-stopped \
  lan-share:latest
```

> 💡 **数据持久化说明**：
> - `./storage`：映射本地共享文件目录。
> - `./data`：映射本地数据库与日志存储路径。

---

## 🚀 原生裸机启动指南

如果你希望直接在宿主机系统上运行：

### 1. 桌面 GUI 模式 (推荐服务端 PC 使用)
- **Linux 环境** (自动处理 Wayland/Vulkan 兼容标志):
  ```bash
  chmod +x start-gui.sh
  ./start-gui.sh
  ```
- **Windows 环境**:
  双击运行 `start-gui.bat` 脚本。

---

### 2. 命令行/无头服务器模式 (Web 模式)
- **Linux 环境**:
  ```bash
  chmod +x start.sh
  ./start.sh
  ```
- **Windows 环境**:
  双击运行 `start.bat`。

---

## 📡 RESTful API 接口汇总

| 接口 Endpoint | 请求方式 | 鉴权需求 | 说明 |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | 公开 | 用户登录，获取 JWT Token |
| `/api/auth/me` | GET | Bearer Token | 获取当前登录用户信息与权限 |
| `/api/files/list` | GET | Bearer Token | 获得当前相对目录的文件与文件夹列表 |
| `/api/files/download` | GET | Bearer Token | 流式下载文件，并自动记录下载日志与 IP |
| `/api/files/upload` | POST | Bearer Token | 上传单/多个文件或整个层级文件夹 |
| `/api/files/mkdir` | POST | Bearer Token | 新建文件夹 |
| `/api/files` | DELETE | Bearer Token | 删除文件或文件夹 |
| `/api/users` | GET / POST | Admin | 查看与添加用户列表 |
| `/api/users/:id` | PUT / DELETE| Admin | 修改指定用户权限/密码或删除用户 |
| `/api/logs` | GET / DELETE| Bearer Token | 分页查询下载日志与清空历史日志 |
| `/api/system/lan-info` | GET | Bearer Token | 获取局域网 Primary IP 地址与二维码 |
| `/api/system/alert` | POST / DELETE| Admin | 发布或撤销全网 Notification 广播 |

---

## 🛡 安全与权限防护机制

1. **绝对路径安全防护 (Anti Path-Traversal)**：
   - 所有的文件检索与下载路径均经过严格的沙箱绝对路径校验，严禁访问共享根目录外的任何敏感系统文件。
2. **下载鉴权与审计追溯**：
   - 必须携带有效的 JWT 凭证方可触发下载，且每次下载均会精准记录客户端 IP 地址、文件名、大小及时间戳。

---

## 📄 开源许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

