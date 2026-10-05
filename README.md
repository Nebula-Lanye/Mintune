# Mintune 薄荷音乐

Mintune 是一款以本地音乐为核心的移动端音乐播放器，使用 Expo、React Native、TypeScript 和 Expo Router 构建。应用默认不注入演示歌曲，用户可以主动扫描设备中的本地音频，并在本地数据库中保存歌曲元数据、收藏、播放列表和播放关系。

## 主要功能

- 本地优先的音乐库，不要求注册账号即可使用。
- Android / iOS 本地音频媒体库扫描与导入。
- 使用 SQLite 保存歌曲元数据、收藏和自定义歌单。
- 播放、暂停、上一首、下一首和进度拖动；全局只保留一个音频播放器，切歌会先停止上一首，重复点击当前歌曲可暂停或继续。
- 底部迷你播放器胶囊，支持快速暂停和切换歌曲。
- 全屏播放器、歌词页和均衡器页面。
- 深色 Mintune 品牌主题。
- 桌面图标使用纯图形 Logo，启动页和设置页使用完整品牌 Logo。
- Android APK 通过 GitHub Actions 自动构建并上传为 Artifact。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 移动框架 | Expo SDK 54 / React Native 0.81 |
| 开发语言 | TypeScript |
| 路由 | Expo Router 6 |
| UI 样式 | NativeWind 4 + StyleSheet |
| 音频播放 | expo-audio |
| 本地数据库 | expo-sqlite |
| 本地媒体扫描 | expo-media-library |
| 音频标签解析 | expo-music-info-2 + music-metadata（MP3 ID3、FLAC Vorbis、ALAC/M4A MPEG-4 标签与内嵌封面） |
| 状态管理 | React Context + Hooks |
| 测试 | Vitest |
| Android 构建 | EAS Local Build + GitHub Actions |

## 环境要求

- Node.js 22 或更高版本
- pnpm 9.12.0
- Expo CLI
- Android Studio 或 Expo Go（本地开发时可选）
- Git

## 本地开发

```bash
pnpm install
pnpm dev
```

仅启动 Expo Web 预览：

```bash
pnpm dev:metro
```

常用检查命令：

```bash
pnpm check
pnpm test
pnpm lint
```

其中，Web 预览只用于检查界面和交互。真实的本地音频扫描、系统媒体权限和原生播放能力，需要安装 Android APK 或运行原生开发客户端进行验证。

## 本地音乐导入

应用首次安装时不会自动生成歌曲、收藏或默认歌单。进入“音乐库”页面后，点击右上角扫描按钮，应用会请求系统音频访问权限，并将找到的音频文件写入本地 SQLite 数据库。

导入时会优先读取音频文件内嵌的标题、歌手、专辑、类型和封面：MP3 使用 ID3 解析，FLAC 使用 Vorbis 注释与图片块，ALAC/M4A 使用 MPEG-4 元数据。若文件没有可读取的标签，则使用文件名推断歌名和歌手，并显示 Mintune 默认封面。Android 使用设备媒体库中的 URI 播放；应用不会上传音乐文件。

如果系统拒绝了权限，请前往手机的“设置 → 应用 → Mintune → 权限”，重新开启音乐或音频访问权限后再扫描。

## 本地数据库

数据库文件名为 `mintune.db`，核心数据表包括：

- `tracks`：歌曲元数据和本地音频 URI。
- `playlists`：用户创建的歌单。
- `playlist_tracks`：歌单与歌曲的关系。
- `favorites`：收藏歌曲。
- `schema_meta`：数据库结构元数据。

当前数据库版本为 4。旧版本曾经写入演示数据，升级时会清理已知演示歌曲和默认歌单，同时尽量保留用户自己创建的内容。

## Android APK 构建

项目使用 GitHub Actions 工作流 `.github/workflows/android-apk.yml` 构建 Android APK。工作流为手动触发：

1. 打开 GitHub 仓库的 **Actions** 页面。
2. 选择 **Build Android APK**。
3. 点击 **Run workflow**，选择 `main` 分支。
4. 等待 `Local Android APK` 任务完成。
5. 在运行详情页底部下载 `mintune-android-apk` Artifact。
6. 解压后将 `mintune.apk` 传到 Android 手机安装。

Artifact 默认保留 14 天。

### GitHub Actions Secrets

工作流需要以下 Repository secrets：

| Secret | 用途 |
| --- | --- |
| `EXPO_TOKEN` | Expo / EAS 构建授权 |
| `KEYSTORE_BASE64` | Android 签名文件的 Base64 内容 |
| `KEYSTORE_PASSWORD` | Keystore 密码 |
| `KEY_ALIAS` | Android 签名别名 |
| `KEY_PASSWORD` | 签名别名密码 |

签名文件和密码必须妥善保存。发布更新时，不能更换原有签名文件，否则 Android 无法将新 APK 识别为同一个应用的可覆盖更新。

## 版本更新

版本配置位于 `app.config.ts`：

```ts
version: "0.4.505",

android: {
  versionCode: 4505,
}
```

- `version` 是用户看到的版本号，例如 `0.4.505`、`0.5.505` 或 `1.4.205`。
- `android.versionCode` 按完整版本号去掉点号后计算：`0.4.505 → 4505`、`0.5.505 → 5505`、`1.4.205 → 14205`。
- 每次构建发布都必须递增，不能降低或重复使用 `versionCode`。
- 不要修改 Android 签名相关 Secrets。

修改代码和版本号后提交到 `main`，再手动运行 **Build Android APK** 工作流即可。

## 品牌资源

| 用途 | 文件 |
| --- | --- |
| 桌面图标 | `assets/images/icon.png` |
| Android 图形图标 | `assets/images/mintune-icon.png` |
| 启动页方形安全区 Logo | `assets/images/splash-icon.png` |
| 设置页完整 Logo | `assets/images/mintune-logo.png` |
| Logo 生成脚本 | `scripts/prepare-brand-assets.py` |

如果需要重新裁切品牌资源，修改脚本后执行：

```bash
python3 scripts/prepare-brand-assets.py
```

启动图会自动生成在 1024×1024 的方形安全区域中，完整横向 Logo 居中放置，以避免 Android 12 及更高版本的启动屏裁切；设置页使用 `mintune-logo.png` 宽版资源。

## 项目目录

```text
app/                  Expo Router 页面
components/           通用 UI 组件
lib/database.ts       原生 SQLite 仓储
lib/database.web.ts   Web 预览数据库回退
lib/local-media.ts    本地音频扫描适配层
lib/player-context.tsx 全局播放状态
assets/images/        图标、启动图和品牌资源
tests/                Vitest 单元测试
.github/workflows/    GitHub Actions 构建工作流
```

## 隐私说明

Mintune 的歌曲元数据、歌单和收藏默认保存在设备本地。应用不会自动上传本地音乐文件，也不会因为扫描音乐而创建云端音乐副本。Expo/EAS 和 GitHub Actions 只负责构建应用，不参与本地音乐播放。

## 项目仓库

GitHub：<https://github.com/Nebula-Lanye/Mintune>
