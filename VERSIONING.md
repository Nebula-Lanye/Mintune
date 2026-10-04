# Mintune 薄荷音乐版本号管理

## 当前分支策略

当前项目使用 `main` 作为测试版和 Android APK 验证构建分支。暂不依赖独立的 `beta` 分支；稳定版本确认后，再从 `main` 发布正式 Release。

## 版本号规则

- 格式：`主版本.次版本.补丁版本`
- 补丁版本每次递增 50：`005 → 055 → 105 → 155 → ... → 955`
- 补丁版本达到 `955` 后，次版本递增 1，补丁版本重置为 `005`
- 已发布版本不可回退或重复使用

## 当前版本

- 应用版本：`0.4.155`
- Android versionCode：`155`
- 分支：`main`
- 版本类型：测试版 / Android APK 验证版

## 配置位置

```ts
// app.config.ts
version: "0.4.155",
android: {
  versionCode: 155,
}
```

同时保持 `package.json` 的 `version` 与 `app.config.ts` 一致。

## Android 版本号

`version` 是用户看到的版本号；`android.versionCode` 必须是递增整数。版本号 `1.0.005` 对应的 Android versionCode 应使用整数，例如 `10005`，不能直接写成带小数点的字符串。

## 发布流程

1. 修改 `app.config.ts`、`package.json` 和 `CHANGELOG.md`。
2. 运行 `pnpm check`、`pnpm test -- --run` 和 `pnpm lint`。
3. 提交并推送 `main`。
4. 手动触发 `.github/workflows/android-apk.yml`。
5. 下载并校验 Android APK。
