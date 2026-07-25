# LAN-Share: Cross-Platform LAN File Sharing & Management System

A lightweight, local network file sharing, transfer, and permission management system with support for **Linux**, **Windows**, and **Docker containerized deployment**.

Any device connected to the same LAN (PCs, smartphones, tablets) can directly access, log in, browse, and download files via browser. Features include multi-user role-based access control, directory tree uploads, real-time download log auditing, and system-wide notification broadcasts.

---

## 🌟 Key Features

### 📱 1. Mobile-Native UI Optimization
- **Mobile Bottom Navigation Bar**: Automatically switches to an iOS/Android style bottom navigation bar for effortless single-handed navigation between Files, Logs, Users, and QR Access.
- **Touch-Friendly File Cards**: Displays large touch cards tailored for mobile screens with file type icons, names, sizes, and modification dates.
- **QR Code Quick Connect**: Built-in LAN IP detection and auto-generated QR code so mobile devices can scan and connect instantly.

### 📁 2. Custom Share Directory & Full Folder Uploads
- **Customizable Root Share Directory**: Change the shared root folder to any absolute path on your host system (e.g., `/home/user/my_shares` or `D:\Shared`) via Web or Desktop GUI.
- **Directory Tree Upload (`webkitdirectory`)**: Select and upload complete folder structures containing multiple nested subdirectories while preserving original directory trees automatically.

### 🖥️ 3. Server Admin Panel Desktop GUI
- **Electron Admin App** designed for host servers (supports Linux & Windows with built-in Wayland/Vulkan compatibility flags):
  - **Visual Controls**: One-click ▶ **Start Server** / ⏹ **Stop Server**, real-time port configuration, and quick-open share folder button.
  - **Real LAN IP Display**: Displays actual primary LAN IP (e.g., `http://192.168.0.2:3000`) instead of generic `0.0.0.0`.
  - **Live Console & Log Copy**: Real-time streaming console output for HTTP requests, logins, file downloads, and client IP records with **one-click log copy to clipboard**.

### 📢 4. System-Wide Notification Broadcasts & User Management
- **Global Alert Broadcasts**: Admins can issue system-wide broadcast alerts from the Desktop GUI or Web interface, showing interactive notification banners to all online users.
- **User Permission Management**: Edit user accounts, reset passwords, configure granular permissions (download, upload, delete, path access), and toggle ban status directly from the Admin Panel.

---

## 🔑 Default Preset Accounts

Upon initialization, the system creates two default test accounts:

| Role | Username | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `admin123` | Full access: file operations, custom share directory, broadcasting alerts, user management, and log auditing |
| **Guest User** | `guest` | `guest123` | Read-only: file browsing and downloading only |

---

## 🐳 Docker Deployment (Recommended)

### Option 1: Docker Compose (Easiest)

Run the following command in the project root directory:

```bash
# Start container in background
docker compose up -d
```

Stop container:
```bash
docker compose down
```

---

### Option 2: Docker CLI

```bash
# 1. Build Docker image
docker build -t lan-share:latest .

# 2. Run container with local volume mounts
docker run -d \
  --name lan-share \
  -p 3000:3000 \
  -v $(pwd)/storage:/app/server/storage \
  -v $(pwd)/data:/app/server/data \
  --restart unless-stopped \
  lan-share:latest
```

> 💡 **Data Persistence**:
> - `./storage`: Maps local shared files directory.
> - `./data`: Maps local database and download logs path.

---

## 🚀 Bare-Metal Local Running Guide

If you prefer to run directly on your host machine:

### 1. Desktop GUI Mode (Recommended for Server PC)
- **Linux Environment** (Includes automatic Wayland/Vulkan compatibility flags):
  ```bash
  chmod +x start-gui.sh
  ./start-gui.sh
  ```
- **Windows Environment**:
  Double-click `start-gui.bat`.

---

### 2. CLI / Headless Server Mode (Web Only)
- **Linux Environment**:
  ```bash
  chmod +x start.sh
  ./start.sh
  ```
- **Windows Environment**:
  Double-click `start.bat`.

---

### 3. 📱 Mobile Phone Server Setup (Android via Termux)
Turn any Android phone or tablet into a portable LAN file sharing server:
```bash
# 1. Open Termux on Android and install Node.js & Git
pkg update && pkg install nodejs-lts git -y

# 2. Clone repository & install dependencies
git clone https://github.com/bin158/ilfurina-lan-file-share.git
cd ilfurina-lan-file-share
npm run install:all

# 3. Start LAN-Share Server
npm start
```
> 💡 **Mobile Server Management**: Once started, open the server URL in your mobile browser and navigate to the **"Server"** tab in the bottom bar to manage root share directories, broadcast notifications, and download logs.

---

## 📡 RESTful API Reference

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | Public | User login & JWT token acquisition |
| `/api/auth/me` | GET | Bearer Token | Get current user info & permissions |
| `/api/files/list` | GET | Bearer Token | List files & directories in specified relative path |
| `/api/files/download` | GET | Bearer Token | Stream file download & record access log with client IP |
| `/api/files/upload` | POST | Bearer Token | Upload single/multiple files or complete folder trees |
| `/api/files/mkdir` | POST | Bearer Token | Create new folder |
| `/api/files` | DELETE | Bearer Token | Delete file or folder |
| `/api/users` | GET / POST | Admin | View and create user accounts |
| `/api/users/:id` | PUT / DELETE| Admin | Modify user permissions/password or delete user |
| `/api/logs` | GET / DELETE| Bearer Token | Paginated query of download logs or clear history |
| `/api/system/lan-info` | GET | Bearer Token | Retrieve primary LAN IP address and QR code |
| `/api/system/alert` | POST / DELETE| Admin | Issue or revoke system-wide notification broadcast |

---

## 🛡 Security & Access Control

1. **Anti Path-Traversal Protection**:
   - All file queries and downloads undergo strict sandbox absolute path verification to prevent unauthorized access outside the shared root directory.
2. **Download Authentication & Audit Traceability**:
   - Downloads require valid JWT authentication, and every download event logs client IP, filename, size, and timestamp.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
