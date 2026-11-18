# 注入模式采用直接 DOM 变换而非 iframe 包裹

> **已被 ADR-0006 取代。** 本文的 `transform: scale()` 机制经实测无法影响 `@media` 求值，保留原文仅作决策记录。

注入模式下把目标页"框"进设备有两种根本方式：(1) 覆盖层里放 `<iframe src="当前页URL">`；(2) 不创建 iframe，直接给当前页根元素应用 CSS 变换并叠加设备外壳。

决定：采用方式 2——直接 DOM 变换。注入脚本后，给目标页 `<html>`/`<body>` 应用固定宽度、居中外边距与 `transform: scale()`，并用独立图层叠加刘海、安全区与设备外壳。目标页不重新加载。`position: fixed` 元素通过缩放容器的 transform 自然成为其 containing block，无需额外脚本修正。

理由：方式 1 要求目标页重新加载（丢失滚动位置与表单状态），且受 `X-Frame-Options` 与 CSP `frame-ancestors` 限制——开发者自己的 dev server 一旦配置安全头便无法预览，这恰恰是核心用户场景。方式 2 对除 `chrome://` 外的所有页面都有效，目标页状态与 HMR 连接完整保留，是唯一符合"预览我正在开发的页面"这一核心定位的方案。
