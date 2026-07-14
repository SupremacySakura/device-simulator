# Device Simulator

Device Simulator 是一个面向前端开发者的浏览器扩展工作台，用真实的 CSS 视口宽高承载网页，并在 iframe 外部叠加设备外壳、安全区、摄像头、挖孔、灵动岛和 Home Indicator。它适合调试响应式断点、异形屏遮挡和自定义设备配置。

当前版本为 `1.0.0`，优先支持 Chromium，并保留 Firefox 构建与兼容结构。

> 功能截图：加载扩展后打开 `simulator.html` 即可看到内置 Demo Store。仓库暂不提交二进制截图，避免示例图与实际版本失去同步。

## 功能

- Popup 读取当前标签页，并把完整模拟器覆盖层直接注入当前网页；地址栏继续保留原始网页 URL。
- “空白模拟器”仍可按需打开独立扩展工作台。
- 10 个系统预设，包含手机、平板和桌面设备；横屏与竖屏分别建模。
- iframe 始终使用设备的真实 CSS 视口尺寸，画布缩放仅作用于外层 `transform: scale()`。
- 支持 10%–300% 连续手动缩放、顶部快捷步进和自动适应缩放。
- 选择工具与小手模式可切换；小手模式支持自由拖动画布、指针锚定滚轮缩放、方向键平移、加减键缩放和一键居中。
- 独立的设备外壳、屏幕圆角、安全区、摄像头和其他显示特征图层。
- 摄像头支持 absolute/anchor 定位、多个实例、选中、拖拽、方向键微调和 Shift 加速。
- 自定义设备新增、编辑、复制、收藏、删除和本地持久化。
- 安全区、摄像头、显示特征、设备边框和双方向视口实时编辑。
- JSON 实时预览、复制、覆盖表单；配置文件导入和三种冲突策略。
- 标尺、网格、阴影、画布背景、横竖屏和模拟器 URL 历史。
- 设备列表与设备信息面板支持标题栏快捷收起、画布边缘一键展开；窄屏自动切换为互斥抽屉并支持 Escape 关闭。
- 实验性的当前可视设备区域截图。
- 内置完全离线的响应式 Demo Store，无外部图片或字体依赖。
- 单设备 / 多设备对比两种持久化工作模式；对比画布支持重复添加同一模板、独立 URL、方向、缩放和显示开关。
- 对比模式支持无限画布、触控板平移、指针锚点缩放、设备拖放添加、批量拖动、框选、多选、自动排列、对齐与等距分布。
- 对比设备支持全局加载、统一刷新/方向、实例复制、失效模板替换，以及受控页面的比例滚动和导航同步。

## 技术栈

- [WXT](https://wxt.dev/) + Chrome Extension Manifest V3
- React 19 + TypeScript strict
- Tailwind CSS 4（官方 Vite 插件）
- Zustand 5
- pnpm
- ESLint 9 + Prettier
- Vitest

Tailwind CSS 4 使用 CSS-first 配置，入口在 `app.css`，因此不需要 Tailwind 3 风格的 `tailwind.config.ts` 或 `content` 数组。

## 环境要求

- Node.js 20.19+（推荐 Node.js 22）
- pnpm 10+
- Chrome、Edge 或其他 Chromium 浏览器

## 安装与开发

```bash
pnpm install
pnpm dev
```

Firefox 开发模式：

```bash
pnpm dev:firefox
```

WXT 开发命令会生成开发扩展目录并启动浏览器 runner。若不希望自动启动浏览器，可参考 WXT runner 配置后手动加载 `.output/chrome-mv3-dev`。

## 在 Chrome 中加载未打包扩展

1. 执行 `pnpm build`。
2. 打开 `chrome://extensions`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择项目下的 `.output/chrome-mv3`。
6. 点击工具栏中的 Device Simulator 图标，再点“在当前页中模拟”。模拟器会覆盖当前网页，但地址栏不会跳转到 `chrome-extension://…/simulator.html?url=…`。

页面内模式右上角有退出按钮，按下后会移除注入层并恢复原页面滚动。Chrome Web Store、`chrome://` 等浏览器受保护页面不允许脚本注入，此时可使用“空白模拟器”。

开发模式产物位于 `.output/chrome-mv3-dev`，生产构建位于 `.output/chrome-mv3`。

## 质量检查、构建与打包

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm zip
```

Firefox：

```bash
pnpm build:firefox
pnpm zip:firefox
```

打包文件由 WXT 输出到 `.output`。

## 目录结构

```text
device-simulator/
├── entrypoints/
│   ├── popup/                 # 轻量启动器
│   ├── simulator/             # 三栏模拟器工作台
│   ├── demo/                  # 离线响应式演示页
│   ├── background.ts          # 消息与页面内注入协调
│   └── content.ts             # localhost 安全区与对比同步通信桥
├── components/
│   ├── common/                # 按钮、字段、弹窗、Toast、状态组件
│   ├── layout/                # 品牌、工作台外壳、侧边导航
│   ├── toolbar/               # 顶部工具栏
│   ├── device/                # 设备列表和属性面板
│   ├── compare/               # 多设备工作区、无限画布、节点与批量属性
│   ├── simulator/             # 画布、外壳、iframe 与覆盖图层
│   └── editor/                # 设备编辑、摄像头和导入导出
├── constants/                 # 系统预设、默认设置、存储键
├── hooks/                     # 自动缩放、设备选择、存储初始化
├── services/                  # 存储、消息、对比运行时、截图、导入导出
├── stores/                    # device/simulator/settings/history/compare
├── types/                     # 唯一的数据类型定义
├── utils/                     # 坐标、缩放、对比布局/同步、URL、校验、复制
├── tests/                     # 纯函数单元测试
├── app.css
├── wxt.config.ts
├── tsconfig.json
├── eslint.config.js
├── prettier.config.js
└── vitest.config.ts
```

## 设备配置模型

`DeviceProfile` 保存设备元数据、DPR、两个独立方向和外壳配置：

```ts
interface DeviceProfile {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  category: 'phone' | 'tablet' | 'desktop' | 'foldable' | 'custom';
  devicePixelRatio: number;
  userAgent?: string;
  portrait: DeviceViewportConfig;
  landscape: DeviceViewportConfig;
  frame: DeviceFrameConfig;
  isSystem: boolean;
  favorite: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}
```

`portrait` 和 `landscape` 不会在运行时通过简单交换宽高生成。每个方向独立保存尺寸、屏幕圆角、安全区、摄像头数组和显示特征数组，因此横屏可以拥有完全不同的挖孔与安全区。

系统设备不可直接编辑或删除。选择“复制并编辑”会生成新的 UUID、深复制嵌套数组并将 `isSystem` 设为 `false`。

## 摄像头数组与位置计算

每个 `DeviceViewportConfig` 都有独立的 `cameras: DeviceCamera[]`。摄像头坐标原点始终是 `DeviceScreen` 左上角 `(0, 0)`，不受设备外壳 inset 或 border 变化影响。

absolute 模式直接使用 `x/y`。anchor 模式按视口和摄像头尺寸解析：

```text
left:   x = offsetX
center: x = viewport.width / 2 - camera.width / 2 + offsetX
right:  x = viewport.width - camera.width - offsetX

top:    y = offsetY
center: y = viewport.height / 2 - camera.height / 2 + offsetY
bottom: y = viewport.height - camera.height - offsetY
```

拖拽使用 Pointer Events。屏幕上的指针位移先除以当前视觉缩放比例，再更新设备 CSS 坐标。right/bottom 锚点的正偏移方向朝视口内部，因此向右或向下拖动时对应 offset 使用反向增量。越界配置只显示警告，不会被静默截断。

## 缩放与媒体查询

`DeviceScreen` 和 iframe 的宽高始终等于当前方向的 CSS viewport。用户看到的缩放发生在 `DeviceScaleWrapper` 等价的外层容器：

```css
transform: scale(var(--preview-scale));
transform-origin: top center;
```

画布以可用区域中心为原点，局部平移状态通过外层 `translate3d()` 应用，不会改变 iframe 的 CSS 视口。小手模式使用覆盖在 iframe 上方的透明 Pointer Events 交互层，因此拖拽经过跨域 iframe 时也不会中断；切回选择工具后，该交互层会被移除，网页交互和摄像头编辑恢复正常。

滚轮缩放以当前指针为锚点同步修正画布平移量，手动范围限制在 `0.1` 到 `3`。自动适应仍以可用画布空间和完整设备外框计算，并限制在 `0.25` 到 `1.5`。点击“居中设备”只重置平移量；点击“自动适应”会同时居中并恢复自动比例。

小手模式在画布捕获阶段使用非被动 `wheel` 监听，并取消浏览器默认缩放行为。因此触控板捏合或 `Ctrl/⌘ + 滚轮` 只会修改画布内容比例，不会缩放扩展工作台或承载扩展的外部网页。

## 多设备对比

单设备工具栏或左侧“对比”入口可切换到多设备对比。首次进入且画布为空时，当前设备、方向、URL、安全区和缩放会创建为一个对比实例；退出不会删除实例，再次进入会恢复上一次布局。

左侧设备库支持搜索、分类、收藏、最近使用和已添加数量。点击设备会添加到当前视口中心，也可以：

- 将设备拖到画布指定位置。
- 快速添加竖屏、横屏或三个副本。
- 从“添加设备”弹窗一次加入移动端、iOS、Android 或响应式常用组合。
- 重复添加同一个 `DeviceProfile`；每次都会生成新的实例 UUID。

每个实例只保存 `deviceId`，不会复制设备模板。模板被编辑后，引用它的全部实例会更新外观；自定义模板被删除后，实例保留为可恢复的“失效设备”，可以更换模板或删除实例。

### 画布操作

- 中键拖动画布，或先按住 `Space` 再用左键拖动。
- 在画布背景使用触控板/滚轮平移；`Ctrl/⌘ + 滚轮` 以指针位置为中心缩放。
- 指针位于 iframe 内时，滚轮默认交给被预览页面；先按住 `Space` 会启用透明画布导航层，此时 iframe 上方的拖动和滚轮也只操作对比画布。
- 画布缩放范围为 20%–200%，实例缩放范围为 25%–200%。两层缩放只作用于外部 transform，iframe 仍保持设备真实 CSS 宽高。
- 空白区域左键拖动可框选；`Shift + 点击/框选` 或 `Ctrl/⌘ + 点击` 可多选。
- 拖动任一已选设备的标题栏会批量移动全部选中设备。移动期间只更新临时坐标，并用透明层阻止 iframe 抢占 Pointer Event；结束时一次性提交到 Store。
- 可启用点阵网格和吸附，或使用横向、纵向、网格自动排列。排列、对齐、分布和“适应全部”都按方向、外框 inset 和实例缩放后的视觉尺寸计算。

快捷键：

```text
Delete / Backspace     删除选中设备（会确认）
Ctrl/⌘ + D             复制选中设备
Ctrl/⌘ + A             选中全部设备
Escape                 清除选择或退出当前交互
方向键                 移动 1px
Shift + 方向键         移动 10px
Ctrl/⌘ + 0             适应全部设备
Ctrl/⌘ + + / -         缩放画布
Space + 拖动           平移画布
```

输入框、文本域、下拉框或可编辑元素获得焦点时不会触发这些快捷键。

### URL、刷新和方向

顶部全局 URL 沿用单设备的规范化规则：`localhost:3000` 补 `http://`，普通域名补 `https://`，非法或危险 scheme 会被拒绝。点击“加载全部”会更新所有实例并写入 URL 历史；单个实例也可以使用独立 URL，并可恢复为全局 URL。

“刷新全部”和“旋转全部”始终作用于全部实例。同步刷新开启后，从任意实例刷新也会刷新全部；同步方向开启后，旋转任意实例会同步其余实例。每个 iframe 使用稳定的实例 ID 作为 React key，画布平移、缩放和设备移动不会卸载 iframe；只有 URL 改变或显式刷新会更新 iframe 内容。

### 滚动与导航同步

滚动同步使用 0–1 的页面进度而不是绝对像素：来源页面的 `scrollTop / 可滚动高度` 会映射到目标页面自己的可滚动高度，因此不同视口仍能保持接近的阅读进度。消息包含实例 ID、工作区 session、随机 bridge token 和 sync token；远端滚动有短时抑制窗口，避免互相回传形成循环。

同步能力分级如下：

- 内置 `demo.html`：扩展同源，可同步滚动和真实导航。
- `localhost`、`*.localhost`、`127.0.0.1`：content script 在子 frame 中建立经 background 校验的长连接，可同步滚动；导航通过 `popstate`、`hashchange` 和 URL 变化检测同步。
- 其他 HTTP(S) iframe：仍可手动全局加载、独立加载、刷新、旋转和缩放，但扩展不会申请广域 host 权限，也不能可靠读取跨域滚动或真实 URL；实例会明确显示“同步不可用”。

同步开关保持开启时，不支持的实例不会伪造成功状态；其他已建立桥接的实例仍可继续同步。X-Frame-Options、CSP、Cookie 和登录限制也不会被绕过。

### 性能与持久化

对比实例、布局、画布 transform、同步设置和网格设置存入独立的 `compareStore`。iframe 引用、加载计时器、临时拖动坐标、框选矩形、同步 token 和运行时能力不会持久化。对比存储使用独立版本号和逐版本迁移，不会提升现有设备/设置存储版本。

每个节点使用稳定 key 和 `React.memo`；画布/设备拖动通过 `requestAnimationFrame` 更新临时状态，结束后才写 Store。超过 8 个 iframe 时会显示性能提示，不强制限制数量。建议通常同时保留 8 个以内，尤其是加载大型应用或多个开发服务器时。

## 本地存储

组件不直接访问扩展存储。`storage-service.ts` 统一封装 `browser.storage.local`，并使用以下 envelope：

```ts
interface PersistedState<T> {
  version: number;
  data: T;
}
```

启动时会验证持久化内容；版本不匹配或字段无效时回退到系统默认值。当前有五个独立 Zustand store：

- `deviceStore`：设备、当前选择、收藏、过滤和 CRUD。
- `simulatorStore`：URL、导航、方向、缩放、iframe、图层和面板状态。
- `settingsStore`：默认设备、默认缩放和工作台偏好。
- `historyStore`：最近 URL、最近设备与 URL/设备组合。
- `compareStore`：工作模式、对比实例、画布、选择、同步与独立运行时状态。

对比数据使用独立的 `device-simulator:compare` key 和版本号。迁移会清理结构损坏、非法 URL、重复实例 ID 和非有限坐标，但会保留 `deviceId` 已找不到模板的合法实例，以便用户更换设备。选择状态和 iframe 运行时状态不会写入存储。

## 导入与导出

导出文件使用：

```ts
interface DeviceExportFile {
  schemaVersion: number;
  exportedAt: number;
  devices: DeviceProfile[];
}
```

导入不会直接信任 JSON。它会验证 envelope、schemaVersion、每个嵌套字段、有限数字、正尺寸、安全区、枚举和重复 ID。ID 或名称冲突可以选择：

- 创建副本：保留现有数据并生成新 ID/名称。
- 覆盖：仅覆盖自定义设备；系统预设仍创建副本。
- 跳过：只导入没有冲突的项目。

导入系统设备时会自动转换为自定义设备，并返回成功、覆盖、复制、跳过和失败统计。

## iframe 限制

Device Simulator 不能保证加载所有网页，也不会默认移除网站的安全响应头。目标页面可能因以下原因无法正确显示：

- `X-Frame-Options` 禁止嵌入。
- CSP `frame-ancestors` 不允许扩展来源。
- 登录态或第三方 Cookie 在 iframe 中不可用。
- 跨域同源策略禁止扩展读取 iframe 内部 DOM、URL 和错误详情。
- 页面通过 `window.top`、`window.self` 或反嵌入脚本改变行为。
- 浏览器对跨域 iframe 的加载失败、空白页和 CSP 拦截没有统一、可靠的可观察信号。

工作台使用加载超时与通用诊断提示，但不会伪造精确失败原因。建议优先调试允许嵌入的本地开发页面。后续可在用户明确授权后评估 `declarativeNetRequest` 方案；当前版本没有该权限，也不会修改响应头。

普通 iframe 可以准确模拟 CSS viewport 和媒体查询宽高，但不能真正改写浏览器原生的：

- `window.devicePixelRatio`
- HTTP User-Agent
- 完整触控、GPU、字体渲染和操作系统行为
- `env(safe-area-inset-*)`

DPR 与 User-Agent 目前是设备配置元数据。安全区覆盖层不会给目标页面添加 padding，也不会声称覆盖原生 `env()`。localhost 通信桥可以提供 `--device-safe-area-*` 自定义 CSS 变量，目标项目需主动使用这些变量。

## 截图限制

截图按钮是实验性能力：它调用浏览器的当前可视标签页截图，再按设备外框的可见矩形裁剪。因此：

- 只能得到当前浏览器窗口中可见的设备区域。
- 设备被滚动到画布外的部分不会被补全。
- 浏览器权限、窗口状态或平台实现可能导致失败。
- 功能不会使用 DOM 截图库伪装跨域 iframe 的完整合成结果。

失败时工作台会显示明确错误，不会生成误导图片。

## 浏览器权限

生产 Manifest 使用：

- `storage`：保存自定义设备、偏好和历史。
- `activeTab`：仅在用户主动点击扩展后，授予当前标签页的临时访问能力。
- `scripting`：把隔离的模拟器 iframe 覆盖层注入用户主动选择的当前标签页；不会改写页面业务 DOM。

页面内模拟使用 `activeTab + scripting.executeScript` 按次注入，不注册 `<all_urls>` 内容脚本，也不申请广域 host 权限。常驻 content script 只匹配 `localhost`、`*.localhost` 与 `127.0.0.1`，用于本地开发页面的安全区变量和对比滚动/导航桥；它会校验 iframe name 中的工作区 session、实例 ID 与随机 token，并通过 background 长连接路由，不接受普通网页伪造的扩展消息。

页面内 iframe 所需的 Web Accessible Resource 只暴露 `simulator.html`。Chrome MV3 启用 `use_dynamic_url`，避免网站通过固定扩展 ID 直接探测资源；Firefox 使用浏览器分配的随机 `moz-extension` UUID。所有外部 URL 会在消息入口、启动服务、历史写入和持久化恢复边界重新规范化，只允许 HTTP(S)。关闭覆盖层的 `postMessage` 使用实际承载页面的精确 origin，并由父页面同时校验扩展 origin、iframe source 和一次性 session ID。

## 测试覆盖

Vitest 覆盖以下纯函数行为：

- 摄像头 absolute 与 anchor 坐标，以及 right/bottom 拖拽偏移。
- 自动缩放、padding 和上下限。
- 小手模式拖拽位移、连续滚轮缩放和指针锚点稳定性。
- localhost/loopback 与普通域名 URL 规范化、危险 scheme 拒绝。
- 设备完整运行时校验，包括 NaN、负安全区和重复摄像头 ID。
- 导入 envelope、部分失败和 overwrite/skip/copy 冲突策略。
- 横竖屏独立配置读取。
- 自定义设备复制的元数据与嵌套深拷贝。
- Compare Store 的添加、复制、删除、多选、运行时/持久化分离和旧版本迁移。
- 画布双向坐标换算、锚点缩放、视觉尺寸、边界与适应全部设备。
- 横向、纵向、网格排列，八种对齐/分布行为和失效模板处理。
- 滚动进度跨页面映射、严格消息校验、非法 token/progress/URL 拒绝。

## 已知问题

- iframe 限制和跨域状态判断遵循上文边界。
- 页面内模式保留原始地址栏 URL，但设备屏幕中的内容仍由 iframe 承载，因此目标站点的 XFO/CSP 限制依然有效。
- 不受控的普通跨域页面无法同步真实滚动与 iframe 内导航；需要使用内置 Demo 或已建立本地 content bridge 的页面。
- 从 iframe 内部发起的文件下载、弹窗、权限请求和登录流程仍取决于浏览器及目标站点策略。
- 当前未实现对比实例的剪贴板 JSON 复制粘贴和远距离节点虚拟化；`Ctrl/⌘ + D` 复制实例已可用。
- 跨域 iframe 是独立浏览上下文；未按住 `Space` 时，父画布无法拦截 iframe 内部的滚轮事件。需要跨设备导航画布时应先进入临时小手层。
- `layoutMode: occupy` 只作为调试元数据和提示，不会改变 iframe 页面布局。
- DPR、User-Agent 和原生 safe-area env 尚未被真实覆盖。
- 截图只覆盖当前可视设备区域。
- 当前没有云同步、设备配置分享或团队协作。

## 后续规划

- 用户明确授权后的可选响应头调试规则。
- 用户授权的可选站点桥接与按域名 host permission 管理。
- 完整页面分片截图与可靠拼接。
- 设备侧键、铰链、折叠态和多视口预设。
- 面向被调试项目的轻量 SDK 与双向安全区/占用区通信。
- 配置迁移向导、云同步和可分享设备库。
- Firefox 实机回归与商店发布自动化。

## 设计依据

工程遵循 WXT 的 unlisted page 与 Manifest 配置方式；WXT 会将 `entrypoints/simulator/index.html` 生成成扩展内的 `/simulator.html`。Tailwind 使用官方 Vite 插件接入 WXT 的 Vite 配置。
