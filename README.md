# Device Simulator

一个浏览器扩展，让你在**正在开发的页面上**一键查看移动端的真实视口、安全区与断点表现。

点击扩展图标即可把当前标签页切换为指定设备的视口。页面不会重新加载，滚动位置与表单内容原样保留。

## 怎么做的

扩展通过 `chrome.debugger` 附加到当前标签页，用 DevTools 协议设定真实的模拟环境：

- `Emulation.setDeviceMetricsOverride` — 真实视口尺寸、DPR 与屏幕方向
- `Emulation.setSafeAreaInsetsOverride` — 真实 `env(safe-area-inset-*)`

因为改的是浏览器真正的视口，`@media` 查询会按设备宽度求值——这一点是 `transform: scale()` 之类的 CSS 手段做不到的。

## 使用

1. `pnpm install && pnpm build`
2. 打开 `chrome://extensions`，开启开发者模式，加载 `.output/chrome-mv3`
3. 打开你要预览的页面（通常是 `localhost:3000`），点击工具栏中的扩展图标
4. 顶部会出现一条自动隐藏的工具条：选择设备、切换横竖屏、缩放、退出

想预览还没打开的地址？点击扩展图标旁的「选项」进入独立工作台，输入 URL 即可。

## 已知限制

这些是 CDP 方案的固有限制，不是 bug：

- **需要 `debugger` 权限**。安装时浏览器会显示相应的高危权限提示。
- **DevTools 已打开时无法预览**。一个标签页只允许一个调试客户端，请先关闭该页面的 DevTools。
- **`chrome://` 等浏览器内部页面无法预览**，工具条会给出提示。
- **没有设备外壳**。模拟的是真实视口，视口之外属于浏览器，页面无法绘制，因此不画刘海、边框或投影。
- **缩放是整体渲染缩放**，不改变页面内的 CSS 视口宽度。

## 开发

```bash
pnpm dev            # Chromium 开发运行器
pnpm build          # 构建到 .output/chrome-mv3
pnpm test           # Vitest
pnpm typecheck      # 严格类型检查
pnpm lint           # ESLint
pnpm format:check   # Prettier 检查
```

## 结构

```text
entrypoints/
  background.ts        图标点击、CDP 会话、工具条更新
  simulator/           独立工作台（输入 URL）
constants/             系统设备预设与存储键
hooks/                 存储初始化
services/              CDP 客户端、工具条注入、存储
stores/                device / simulator / settings
types/                 数据类型
utils/                 视口换算、缩放、URL 规范化
tests/                 纯函数与 store 单元测试
```

## 设计文档

- `GLOSSARY.md` — 领域术语
- `PRODUCT.md` — 产品定位与原则
- `docs/adr/` — 架构决策记录（尤其 ADR-0006 解释了为什么用 CDP）
