# 工具条用 Shadow DOM 注入，而非 React 覆盖层

> **部分被 ADR-0009 取代。** "用 Shadow DOM 隔离样式、不引入 React 运行时"仍成立；但覆盖层不再是工具条，而是承载 iframe 与设备框的完整图层。下文关于"没有画布可以承载 React 覆盖层"的前提已失效。

CDP 模拟下页面视口就是设备视口，没有画布可以承载 React 覆盖层树，且注入 React 运行时会把整个框架塞进用户页面。

决定：工具条是一个 unlisted script，通过 `scripting.executeScript` 注入，挂载在 closed Shadow DOM 内的固定定位容器里，用原生 DOM 与内联样式实现。

理由：Shadow DOM 隔离页面样式，避免目标站点 CSS 污染工具条；不引入 React 运行时，注入体积小、无框架冲突；工具条只有设备选择、旋转、缩放、关闭四类控件，原生 DOM 足够且更可控。
