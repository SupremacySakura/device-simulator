# 设备数据变更记录

## 2026-07-30

本次数据建设将系统预设扩展到 17 个，其中 13 个为 PRD 的 P0 设备，并为每个条目加入可见的可信度和独立审计记录。完整公开来源、采集日期、估算字段及交叉验证状态见 [`constants/device-sources.json`](../constants/device-sources.json)。

### 新增

- iPhone 14
- iPhone 16 Pro
- Google Pixel 8 Pro
- Google Pixel 9
- iPad Air 10.9-inch 视口类
- Surface Pro 7
- Surface Duo（双屏展开态）

### 修正

- iPhone SE (3rd generation) 的 Safe Area 改为公开模拟预设所支持的零值。
- iPhone 15 与 iPhone 15 Pro 的 Dynamic Island 宽度改为 125 CSS px。
- iPhone 14、15、15 Pro、15 Pro Max 和 16 Pro 的外框 inset 按 Apple 官方尺寸图换算，并修正屏幕圆角大于机身圆角造成的厚重角部黑边。
- iPhone SE、iPad Air 5、iPad Pro 11 (4th generation) 和 iPad mini 6 的外框按 Apple 工程图中的机身与显示活动区尺寸换算。
- Pixel 8、Pixel 8 Pro、Pixel 9、Galaxy S24、Surface Pro 7 和 Surface Duo 的外框改由厂商公布的机身尺寸、显示对角线和分辨率推导，不再共用手机或平板模板。
- 非对称外框 inset 现在会随设备方向旋转，横屏尺寸、绘制 padding、自动缩放和标尺偏移使用同一套方向计算。
- Google Pixel 8 的 Safe Area 和开孔边界改用 Chrome 设备定义。
- iPad 名称与逻辑视口类对齐 Apple 布局参考；移除没有公开几何依据的摄像头和 Home Indicator 图形。
- 删除系统设备中无法由公开来源支持的手势条和接近传感器图形。
- iPhone 14/15/15 Pro/15 Pro Max/16 Pro 与 Pixel 8/8 Pro/9 的横屏摄像头几何按公开竖屏边界逆时针旋转换算，避免切换横屏后挖孔丢失或出现在错误一侧。
- 桌面参考视口不再引用需要工作区登录的飞书文档；其来源列表留空、`crossValidated` 设为 `false`，并明确标注为产品参考定义。
- 来源台账的 `notes` 统一为中文；设备列表和对比设备库为折叠屏使用独立的双设备图标。

### 浏览器 QA

- iPhone 15 Pro：竖屏内容视口为 393×759，向下偏移 59 px；横屏为 734×372，向右偏移 59 px。两个方向的灵动岛均完全位于 Safe Area 内。
- Pixel 8：竖屏内容视口为 412×865，向下偏移 50 px；横屏为 865×412，向右偏移 50 px。挖孔在两个方向都不与页面内容重叠。
- Galaxy S24 与 iPad Pro 11-inch：由于台账采用零 Safe Area 回退，iframe 在横竖屏均保持完整视口尺寸。
- Surface Duo：1114×720 方向保持 34×720 纵向铰链，720×1114 方向保持 720×34 横向铰链，iframe 尺寸与内容视口一致。

### 稳定性

原有 10 个系统设备 ID 全部保留：`iphone-se-3rd-generation`、`iphone-15`、`iphone-15-pro`、`iphone-15-pro-max`、`google-pixel-8`、`samsung-galaxy-s24`、`ipad-mini`、`ipad-pro-11`、`desktop-1280x720`、`desktop-1440x900`。

### 已知限制

- Galaxy S24 与三个 iPad 视口类的视觉遮挡字段为中可信；Safe Area 使用显式记录的零值回退，不绘制未经验证的摄像头或显示特征。
- Chrome 的 Android 设备定义尚未完整建模底部导航栏 Safe Area，因此 Pixel 条目只采用来源明确提供的边界。
- Pixel、Galaxy 和 Surface 未公开显示活动区相对机身的完整工程尺寸；外框采用居中显示区假设并标为 `medium`，具体推导字段记录在来源台账中。
- DPR 和 UA 仍是配置元数据，不会改变 iframe 的真实运行环境或网络请求。
- Safe Area 会为 iframe 内容视口留白，但不会向页面注入 CSS `env()`。
- Apple 外框 inset 来自官方工程图；其他物理设备采用明确记录的厂商规格推导。CSS 圆角、颜色和按钮仍是展示近似值。
