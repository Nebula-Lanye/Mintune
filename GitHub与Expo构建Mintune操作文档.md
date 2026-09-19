# GitHub 与 Expo 构建 Mintune APK 操作文档

## 1. 文档目标

本指南用于在电脑上配置 GitHub Actions，并使用 Expo 的访问令牌构建可安装到 Android 手机的 Mintune APK。电脑不需要登录 Manus，只需要登录 GitHub 和 Expo。

Mintune 当前采用与 `wallifyApp` 相同的构建思路：GitHub Actions 负责执行任务，Expo Application Services（EAS）负责本地 Android 构建，GitHub Actions Artifacts 负责保存和下载 APK。

> **重要安全说明：** GitHub Token、Expo Token、Android 签名密码和 keystore 文件都属于敏感信息。不要把它们发送到聊天、提交到代码仓库或发布到公开网盘。

## 2. 准备工作

请确认你拥有以下账号和权限：

- 一个能够访问 `Nebula-Lanye/Mintune` 仓库的 GitHub 账号，并且具有仓库管理员权限。
- 一个 Expo 账号，可以登录 Expo 控制台并创建 Access Token。
- 一台可以正常打开网页的电脑。构建过程在 GitHub 云端执行，电脑不需要安装 Node.js、Java、Android Studio 或 Expo CLI。

Mintune 仓库地址如下：

[打开 Mintune 仓库](https://github.com/Nebula-Lanye/Mintune)

## 3. 登录 GitHub

打开 [GitHub 登录页](https://github.com/login)，登录拥有 Mintune 仓库管理权限的账号。登录后打开 [Mintune 仓库](https://github.com/Nebula-Lanye/Mintune)。

随后打开仓库的 Actions Secrets 页面：

[Mintune Actions Secrets](https://github.com/Nebula-Lanye/Mintune/settings/secrets/actions)

如果页面中可以看到 **New repository secret** 按钮，说明权限正确。如果看不到该按钮，请切换到拥有仓库管理员权限的 GitHub 账号，或者请仓库所有者为当前账号授予管理权限。

## 4. 下载签名配置文件

Mintune 已生成一套 Android 签名配置。请下载以下文件，并只保存在自己的电脑上：

[下载 GitHub Secrets 配置内容](</home/ubuntu/Mintune/mintune-signing/GITHUB_SECRETS.txt>)

文件包含以下四项内容：

```text
KEYSTORE_BASE64=...
KEYSTORE_PASSWORD=...
KEY_ALIAS=mintune
KEY_PASSWORD=...
```

添加 Secret 时，只复制每个等号右侧的值。不要把 `KEYSTORE_BASE64=` 这一段名称一起复制到值输入框中。

这套签名信息必须长期保存。以后发布 Mintune 更新版本时，仍然需要使用同一套签名信息，否则 Android 可能无法覆盖更新已安装的版本。

## 5. 在 GitHub 添加 Android 签名 Secrets

打开 [Mintune Actions Secrets](https://github.com/Nebula-Lanye/Mintune/settings/secrets/actions)，点击 **New repository secret**。下面四项需要分别创建，每项创建后点击 **Add secret**。

| Secret 名称 | Secret 值来源 |
| --- | --- |
| `KEYSTORE_BASE64` | 从 `GITHUB_SECRETS.txt` 的 `KEYSTORE_BASE64=` 后复制完整长字符串 |
| `KEYSTORE_PASSWORD` | 从 `GITHUB_SECRETS.txt` 的 `KEYSTORE_PASSWORD=` 后复制密码 |
| `KEY_ALIAS` | 填写 `mintune` |
| `KEY_PASSWORD` | 从 `GITHUB_SECRETS.txt` 的 `KEY_PASSWORD=` 后复制密码 |

添加完成后，Secrets 页面应该显示四个名称。GitHub 不会显示 Secret 的实际值，只会显示名称或掩码，这是正常现象。

## 6. 创建 Expo Access Token

Expo Token 用于允许 GitHub Actions 代表你的 Expo 账号执行 EAS 构建。

打开 [Expo Access Tokens](https://expo.dev/settings/access-tokens)。登录 Expo 后，点击 **Create token**。名称可以填写：

```text
Mintune GitHub Actions
```

创建成功后，立即复制 Token。Token 可能只会完整显示一次。

回到 [Mintune Actions Secrets](https://github.com/Nebula-Lanye/Mintune/settings/secrets/actions)，点击 **New repository secret**，填写：

```text
Name: EXPO_TOKEN
Secret: 刚才复制的 Expo Token
```

完成后，GitHub Actions Secrets 应该一共有五项：

```text
EXPO_TOKEN
KEYSTORE_BASE64
KEYSTORE_PASSWORD
KEY_ALIAS
KEY_PASSWORD
```

## 7. 手动启动 APK 构建

打开 [Mintune GitHub Actions](https://github.com/Nebula-Lanye/Mintune/actions)。

在左侧选择 **Build Android APK**，然后点击右上角的 **Run workflow**。分支选择 `main`，再点击绿色的 **Run workflow** 按钮。

打开新生成的运行记录后，可以看到以下主要步骤：

1. Checkout repository：获取 Mintune 源代码。
2. Set up pnpm：准备项目依赖管理工具。
3. Set up Node.js：准备 Node.js 运行环境。
4. Set up JDK 17：准备 Android 编译所需的 Java 环境。
5. Set up Android SDK：准备 Android SDK 和构建工具。
6. Install EAS CLI：安装 Expo 的 EAS 命令行工具。
7. Set up Expo token：读取 `EXPO_TOKEN`。
8. Restore Android signing key：恢复 Android 签名文件。
9. Build APK locally：构建 APK。
10. Upload Android APK：上传 APK 构建产物。

所有步骤显示绿色对勾后，说明构建成功。

## 8. 下载 APK

打开成功的 GitHub Actions 运行记录，滚动到页面底部，找到 **Artifacts** 区域。点击：

```text
mintune-android-apk
```

下载得到一个 ZIP 文件。解压后可以看到：

```text
mintune.apk
```

将 APK 传到 Android 手机，点击安装即可。如果系统提示不允许安装，请在 Android 设置中允许当前浏览器或文件管理器安装未知来源应用。

## 9. 后续更新版本

每次发布新的 APK 前，需要同时修改两个版本字段：`version` 是用户看到的版本名称，`android.versionCode` 是 Android 用来判断升级顺序的内部版本号。`versionCode` 每次都必须递增，不能重复或降低。

这两个字段位于仓库的 `app.config.ts`：

```ts
version: "1.0.0",
android: {
  versionCode: 1,
```

例如第一次更新可以改为：

```ts
version: "1.0.1",
android: {
  versionCode: 2,
```

之后依次使用 `1.0.2` 与 `3`，再使用 `1.1.0` 与 `4`。版本名称可以按产品需要调整，但 `versionCode` 必须始终比上一次更大。

更新流程如下：

1. 在 GitHub 仓库中打开 `app.config.ts`。
2. 点击编辑按钮，修改 `version` 和 `android.versionCode`。
3. 点击 **Commit changes**，提交到 `main` 分支。
4. 打开 [Mintune GitHub Actions](https://github.com/Nebula-Lanye/Mintune/actions)。
5. 运行 **Build Android APK** 工作流。
6. 从 `Artifacts → mintune-android-apk` 下载新版 APK。
7. 在手机上直接覆盖安装。不要更换 Android 签名文件或签名密码。

如果只是修复代码，也建议递增 `versionCode`。如果准备向用户发布，建议同时递增可见的 `version`。

## 10. 常见问题

### 9.1 找不到 Settings

当前 GitHub 账号可能没有仓库管理员权限。请登录拥有 `Nebula-Lanye/Mintune` 管理权限的账号，再打开 [Mintune Actions Secrets](https://github.com/Nebula-Lanye/Mintune/settings/secrets/actions)。

### 9.2 找不到 New repository secret

请确认你打开的是仓库级别的 Actions Secrets 页面，而不是个人账号的 Secrets 页面。正确地址是：

[https://github.com/Nebula-Lanye/Mintune/settings/secrets/actions](https://github.com/Nebula-Lanye/Mintune/settings/secrets/actions)

### 9.3 工作流提示 EXPO_TOKEN 缺失

这表示 `EXPO_TOKEN` 尚未创建，或者 Secret 名称拼写不正确。名称必须完全写成大写：

```text
EXPO_TOKEN
```

### 9.4 工作流提示签名错误

请检查以下内容：

- `KEYSTORE_BASE64` 是否完整复制。
- 是否复制了等号后面的内容，而不是复制了 Secret 名称。
- `KEY_ALIAS` 是否为 `mintune`。
- `KEYSTORE_PASSWORD` 和 `KEY_PASSWORD` 是否分别复制正确。
- 是否误删了 Secret 后重新生成了另一套密码。

### 9.5 构建成功但手机无法覆盖安装

不要删除或更换已经生成的签名信息。Android 应用更新必须继续使用同一套签名。如果之前安装的是另一套签名构建，需要先卸载旧版本，再安装新 APK；卸载会删除应用本地数据。

### 9.6 构建时间较长

第一次 EAS Local Build 需要下载依赖、Android SDK 和 Gradle 组件，通常会比后续构建慢。只要工作流仍在运行，就不要重复点击 **Run workflow**。

## 11. 安全清单

完成配置后，请确认以下事项：

- 不要把 `GITHUB_SECRETS.txt` 提交到 GitHub。
- 不要公开 `mintune-release.jks` 文件。
- 不要公开 Expo Token。
- 不要把 Android 签名密码发送给其他人。
- 将签名文件和密码备份到安全位置。
- 删除电脑下载目录中不再需要的临时副本。

## 参考资料

[1]: https://docs.expo.dev/accounts/programmatic-access/ "Expo Programmatic access"
[2]: https://docs.expo.dev/build/building-on-ci/ "Expo Trigger builds from CI"
[3]: https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions "GitHub Using secrets in GitHub Actions"
