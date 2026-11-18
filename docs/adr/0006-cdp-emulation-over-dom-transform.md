# 用 chrome.debugger 的 CDP 设备模拟替代直接 DOM 变换

> **已被 ADR-0008 取代。** 产品需要设备外壳，而 CDP 无法在视口之外绘制，故回到 iframe 覆盖层。保留原文仅作决策记录。

ADR-0004 决定给目标页根元素应用 `transform: scale()` 来伪造设备视口。实测证明该机制不成立：CSS transform 不改变视口，`@media (max-width: 500px)` 在 1400px 窗口、393px 容器下依然求值为 false。按 ADR-0004 实现会得到"手机形状的框里装着桌面布局"，比不做更糟。

决定：改用 `chrome.debugger` 附加到目标标签页，通过 DevTools 协议 `Emulation.setDeviceMetricsOverride` 设定真实视口与 DPR，通过 `Emulation.setSafeAreaInsetsOverride` 提供真实 `env(safe-area-inset-*)`。实测结果：`innerWidth=393`、`matchMedia('(max-width:500px)')=true`、`devicePixelRatio=3`、`env(safe-area-inset-top)=59px`，且 `scrollY` 保持不变。ADR-0004 据此被取代。

## Consequences

- **设备外壳无法绘制**。CDP 把整个标签页的视口换成设备尺寸，视口之外的像素属于浏览器、页面涂不到，因此"带投影浮在画布上的设备框"不可实现。视觉表达改为"页面即设备"：整块视口就是那台手机，UI 退场为一个自动隐藏的悬浮工具条。
- **需要 `debugger` 权限**，安装时会出现高危权限警告。
- **DevTools 已附加时无法工作**。一个标签页只允许一个调试客户端，此时 `attach` 失败，必须提示用户先关闭 DevTools。
- **缩放只能整体缩放渲染结果**，不支持任意平移；居中由浏览器负责。
