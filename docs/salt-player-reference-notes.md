# Salt Player 参考分析

来源：
- https://github.com/Moriafly/SaltPlayerSource/archive/refs/heads/main.zip
- https://github.com/Moriafly/SaltPlayerSource
- https://github.com/Moriafly/SaltUI
- https://github.com/Moriafly/media-kit

结论：SaltPlayerSource 不是完整 Android 应用源代码，主要包含 README、发布说明、翻译、隐私政策和图片资源。其 README 指向 SaltUI（UI 组件）和 media-kit（Android 媒体播放/通知基础）。

与 Mintune 当前 UI 相关的参考点：
- 列表项使用较小圆角和紧凑间距。
- 胶囊/底部 Sheet 使用更大的圆角。
- 播放详情页使用轻量层级，不是整页厚重玻璃卡片。
- 播放详情控制以轻量图标为主。
- 歌词、播放队列和歌曲操作使用独立页面或底部 Sheet。
- SaltUI 源码中可见 RoundedColumn、Layer、BottomSheetScaffold、SheetPanel 等组件，SheetPanel 的圆角根据关闭按钮尺寸和 padding 计算。
