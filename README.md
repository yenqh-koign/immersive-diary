# Immersive Diary

一个本地优先的日记应用，支持桌面端和 Android 端使用。应用提供日历写作、富文本编辑、搜索、导入导出、回收站和 WebDAV 备份能力，适合把个人日记保存在本地并按需同步到自己的云存储。

## 功能特性

- 日历视图写作和编辑
- 富文本编辑器
- 全局搜索，支持关键词、日期区间和重要标记
- 那年今日
- 回收站
- ZIP / TXT 导入导出
- WebDAV 备份与恢复
- 桌面端本地运行
- Android 端构建支持

## 技术栈

- Electron
- Capacitor
- JavaScript
- Quill
- JSZip
- WebDAV

## 目录结构

```text
Immersive Diary/
├── src/                  # 应用主源码
├── android/              # Capacitor Android 工程
├── assets/               # 图标、预览图和纹理资源
├── scripts/              # 构建辅助脚本
├── main.js               # Electron 主进程
├── preload.js            # Electron 预加载脚本
├── index.html            # 应用入口页面
├── manifest.webmanifest  # PWA 清单
├── service-worker.js     # 离线缓存逻辑
└── package.json          # npm 脚本和依赖配置
```

## 本地运行

安装依赖：

```powershell
npm install
```

启动桌面端：

```powershell
npm start
```

## 桌面端打包

```powershell
npm run pack
```

构建产物会生成在 `dist/` 中。

## Android 构建

准备并同步移动端资源：

```powershell
npm run mobile:sync
```

构建调试 APK：

```powershell
npm run mobile:apk
```

APK 输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 开发约定

- 日常改动优先修改 `src/`。
- `mobile-web/` 是构建脚本生成的目录，不要手动维护。
- 构建产物、依赖目录和移动端同步目录可按需重新生成。
- WebDAV 凭据保存在用户本机数据目录中，不应写入源码。

## 常用命令

```powershell
npm install
npm start
npm run pack
npm run mobile:sync
npm run mobile:apk
```
