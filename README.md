# Device Simulator

一个浏览器扩展，让你在**正在开发的页面上**一键查看移动端的真实视口、安全区与断点表现。

点击扩展图标即可在当前页面上叠加一台带外壳的手机，目标页在设备屏幕里重新加载一次，关闭覆盖层后宿主页原样可见。

## 怎么做的

覆盖层注入到宿主页，里面是一个指向目标页的 iframe：

- iframe 的 CSS 尺寸**严格等于**设备视口（如 393×852），所以 `@media` 查询按真机宽度求值
- 外层用 `transform: scale()` 缩小显示，缩放不改变 iframe 内部的视口
- 刘海与 Home Indicator 是画在 iframe 之上的**遮挡层**，内容会像真机一样延伸到其下方

详见 `docs/adr/0008-iframe-overlay-for-device-shell.md`。

## 使用

1. `pnpm install && pnpm build`
2. 打开 `chrome://extensions`，开启开发者模式，加载 `.output/chrome-mv3`
3. 打开你要预览的页面（通常是 `localhost:3000`），点击工具栏中的扩展图标
4. 顶部会出现一条自动隐藏的工具条：选择设备、切换横竖屏、缩放、退出

想预览还没打开的地址？在扩展详情里打开「扩展选项」进入工作台，输入 URL 即可，工作台内嵌同一套设备舞台。

## 已知限制

这些是 iframe 方案的固有限制，不是 bug：

- **目标页会重新加载**。宿主页本身不被改动。
- **部分站点禁止被嵌入**。`X-Frame-Options` 或 CSP `frame-ancestors` 会拒绝 iframe；本地 dev server 通常不受影响。
- **无法伪造 DPR**。iframe 继承宿主标签页的 `devicePixelRatio`。
- **`chrome://` 等浏览器内部页面无法注入**。
- **缩放是外层渲染缩放**，不改变 iframe 内部的 CSS 视口宽度。
- **不自动降级**。加载失败只提示可能原因，不会偷偷切到另一条渲染路径。

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
  background.ts        图标点击，一次性注入覆盖层
  simulator/           独立工作台（输入 URL，内嵌设备舞台）
constants/             系统设备预设与存储键
hooks/                 存储初始化
services/              覆盖层注入、存储
stores/                device / simulator / settings
types/                 数据类型
utils/                 设备布局换算、URL 规范化
tests/                 纯函数与 store 单元测试
```

## 设计文档

- `GLOSSARY.md` — 领域术语
- `PRODUCT.md` — 产品定位与原则
- `docs/adr/` — 架构决策记录（ADR-0008 解释了为什么用 iframe 覆盖层）
