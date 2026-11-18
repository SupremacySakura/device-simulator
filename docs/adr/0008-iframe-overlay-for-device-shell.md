# 回到 iframe 覆盖层，以换取设备外壳

ADR-0006 选择了 `chrome.debugger` 路线，换来真实视口与 DPR，代价是无法绘制设备外壳——CDP 把整个标签页的视口换成设备尺寸，视口之外的像素属于浏览器，页面涂不到。产品需要"设备浮在画布上"的视觉，因此改回 iframe。

决定：注入一个覆盖层，其中放一个指向目标页的 iframe。iframe 的 CSS 尺寸严格等于设备视口（如 393×852），外层用 `transform: scale()` 缩小显示，因此媒体查询与断点判断完全正确。安全区以**遮挡层**表达：iframe 保持完整视口，刘海与 Home Indicator 作为图层盖在内容之上，与真机行为一致（内容会延伸到刘海下方）。

## Consequences

- **目标页会重新加载一次**。宿主页本身不被改动，关闭覆盖层后原样可见。
- **跨域页面可能被拒**。`X-Frame-Options` 与 CSP `frame-ancestors` 会让部分站点无法嵌入；本地 dev server 通常不受影响。失败时只报错并给出排查建议，不做自动降级——同时维护两条渲染路径正是本次重构要消灭的东西。
- **无法伪造 DPR**。iframe 继承宿主的 `devicePixelRatio`。
- **`debugger` 权限被移除**，manifest 回到 `storage` + `activeTab` + `scripting`，安装时不再出现高危警告，也不与 DevTools 冲突。
- **覆盖层自包含**：设备、方向、缩放状态全部存在于页面内，background 只负责一次性注入。这消除了 MV3 service worker 休眠导致会话丢失的一整类问题。
