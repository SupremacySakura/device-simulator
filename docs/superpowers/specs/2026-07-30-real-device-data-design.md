# 真实设备数据与可信度设计

## 1. 背景与决策

本设计落实《设备模拟插件真实设备数据建设 PRD》的 V1 设备数据建设，并采用以下已确认的产品决策：

- 所有设备事实参数只能来自互联网公开来源，不依赖用户提供的真机、远程设备或私有截图。
- 允许在现有 `DeviceProfile` 中增加顶层可信度字段，用于在运行时标注当前设备配置的整体可信度。
- 具体来源、估算字段和交叉验证结果继续保存在旁路审计台账，不把长链接和维护说明塞入运行时对象。
- 不用物理分辨率除以推测 DPR 来生成 CSS viewport。
- 互联网证据不足时允许使用明确标注的产品视觉回退，但不得把回退值描述成真实设备事实。

该决策解决了 Galaxy S24 的现实限制：公开资料足以确认 360×780 CSS viewport 和 DPR 3，但不足以把 Safe Area、开孔位置、屏幕圆角和手势条全部提升到高可信。S24 保留稳定 ID，并以中可信配置交付；审计台账列出未验证或回退字段。

## 2. 目标与非目标

### 2.1 目标

- 保持现有设备选择、自定义设备、收藏、历史和对比实例的稳定 ID 兼容性。
- 上线 PRD 指定的 13 个 P0 配置，并保留两个经核验的既有补充设备和两个桌面参考视口。
- 为所有系统设备填写运行时可信度，在单设备列表、对比设备库和属性面板中可见。
- 建立来源台账、设备数据变更记录和系统数据全集测试。
- 扩展现有运行时校验，拒绝明显越界的 Safe Area、摄像头和显示特征。
- 增加折叠屏分类入口，并明确 CSS viewport、DPR、UA 和 Safe Area 的能力边界。

### 2.2 非目标

- 不采集或模拟 CPU、GPU、内存、电池、刷新率、网络、传感器和真实触摸。
- 不改变 iframe 的真实 `window.devicePixelRatio` 或 HTTP User-Agent。
- 不把 Safe Area overlay 宣称为页面内标准 `env(safe-area-inset-*)` 注入。
- 不为折叠屏增加多状态模型；Surface Duo 只表示双屏展开态。
- 不把没有公开 CSS viewport 证据的国内 Android P1 设备写入 `SYSTEM_DEVICES`。
- 不增加品牌分组、远程设备服务、虚拟列表或自动抓取任务。

## 3. 设备范围

V1 系统库共 17 项：13 个 P0、2 个经核验的既有补充设备、2 个产品定义的桌面参考视口。

| ID                         | 名称                                | 范围 | 可信度   |
| -------------------------- | ----------------------------------- | ---- | -------- |
| `iphone-se-3rd-generation` | iPhone SE (3rd generation)          | P0   | `high`   |
| `iphone-14`                | iPhone 14                           | P0   | `high`   |
| `iphone-15-pro`            | iPhone 15 Pro                       | P0   | `high`   |
| `iphone-15-pro-max`        | iPhone 15 Pro Max                   | P0   | `high`   |
| `iphone-16-pro`            | iPhone 16 Pro                       | P0   | `high`   |
| `google-pixel-8`           | Google Pixel 8                      | P0   | `high`   |
| `google-pixel-8-pro`       | Google Pixel 8 Pro                  | P0   | `high`   |
| `google-pixel-9`           | Google Pixel 9                      | P0   | `high`   |
| `samsung-galaxy-s24`       | Samsung Galaxy S24                  | P0   | `medium` |
| `ipad-air-10-9`            | iPad Air 10.9-inch viewport class   | P0   | `medium` |
| `ipad-pro-11`              | iPad Pro 11-inch viewport class     | P0   | `medium` |
| `surface-pro-7`            | Microsoft Surface Pro 7             | P0   | `high`   |
| `surface-duo-spanned`      | Microsoft Surface Duo（双屏展开态） | P0   | `high`   |
| `iphone-15`                | iPhone 15                           | 补充 | `high`   |
| `ipad-mini`                | iPad mini viewport class            | 补充 | `medium` |
| `desktop-1280x720`         | Desktop viewport 1280 × 720         | 参考 | `high`   |
| `desktop-1440x900`         | Desktop viewport 1440 × 900         | 参考 | `high`   |

已有同语义 ID 必须保留。新增 ID 使用小写 kebab-case。桌面条目的高可信表示产品定义的参考视口数值是确定的，不表示它们对应某台真实硬件。

## 4. 运行时模型

在 `types/device.ts` 新增：

```ts
export type DeviceConfidence = 'high' | 'medium' | 'low' | 'unverified';

export interface DeviceProfile {
  // existing fields
  confidence?: DeviceConfidence;
}
```

`confidence` 保持可选，原因是旧版持久化自定义设备和已有导入文件没有该字段。运行时统一通过辅助函数读取：

```ts
export function getDeviceConfidence(device: DeviceProfile): DeviceConfidence {
  return device.confidence ?? 'unverified';
}
```

语义如下：

| 值           | 语义                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------- |
| `high`       | CSS viewport/DPR 来自官方开发工具或实测公开资料，关键 Safe Area/开孔有官方或平台资料支持 |
| `medium`     | 核心 viewport/DPR 有可信公开证据，但部分视觉字段只使用单一来源、产品回退或未模拟         |
| `low`        | 主要依赖第三方资料或存在影响布局的估算；不得作为新的默认设备准入标准                     |
| `unverified` | 没有完成系统数据审计；旧版和用户自定义设备的默认状态                                     |

系统设备必须显式填写 `confidence`。所有新建、复制、编辑或导入的自定义设备在进入 store 时统一归一化为 `unverified`，避免用户数据借用系统设备的高可信标签。V1 编辑器不提供修改可信度的入口。

## 5. 数据来源与映射

### 5.1 来源优先级

1. Chrome DevTools 当前 `EmulatedDevices.ts`。
2. Apple、Android、Microsoft、Samsung 等厂商或平台官方资料。
3. Playwright 等可信工具项目的设备描述和已合并修正记录。
4. 可信第三方资料仅作交叉验证，不单独决定高可信配置。

采集日期统一为 2026-07-30。运行时只保存映射后的事实字段和可信度，不保存 URL。

### 5.2 关键映射规则

- `portrait/landscape.width/height` 使用 CSS px；不得写物理分辨率。
- `devicePixelRatio` 使用 DevTools 或公开实测报告值；它仍只是元数据。
- Safe Area 和开孔按方向独立录入，横屏数据不由竖屏坐标旋转生成。
- Chrome 没有给出可靠横屏开孔时，横屏 `cameras=[]`，并在来源台账写明“未模拟”。
- 没有可靠视觉数据时，摄像头和 display feature 使用空数组；`screenBorderRadius` 和 `frame` 可使用统一产品视觉模板，但必须在台账 `notes` 中说明它们不参与设备事实可信度计算，也不代表物理机身。
- Galaxy S24 的 CSS viewport 和 DPR 使用公开工具项目已核验值；互联网没有提供可审计视觉字段时，使用不遮挡内容的中性视觉回退，并把相应字段列入 `estimatedFields`，整体可信度为 `medium`。
- Surface Duo 使用 Chrome 的 spanned viewport 和 34px hinge；配置名和 ID 必须明确“展开态”。

## 6. 来源审计台账

新增 `constants/device-sources.json`，以系统 ID 为键。每条记录结构如下：

```json
{
  "iphone-15-pro": {
    "deviceId": "iphone-15-pro",
    "kind": "device",
    "priority": "P0",
    "sourceUrls": [
      "https://raw.githubusercontent.com/ChromeDevTools/devtools-frontend/main/front_end/models/emulation/EmulatedDevices.ts"
    ],
    "collectedAt": "2026-07-30",
    "confidence": "high",
    "estimatedFields": [],
    "crossValidated": true,
    "notes": "来源口径和已知限制的简短说明"
  }
}
```

字段规则：

- `deviceId` 必须与对象键及运行时 profile ID 一致。
- `kind` 为 `device` 或 `reference`。
- `priority` 为 `P0`、`supplemental` 或 `reference`。
- 真实设备的 `sourceUrls` 至少一项；P0 高可信核心字段至少有官方开发工具加一个独立官方/可信交叉来源。
- `collectedAt` 使用 `YYYY-MM-DD`。
- `confidence` 必须与运行时 profile 一致。
- `estimatedFields` 使用完整字段路径，例如 `portrait.screenBorderRadius`。
- `estimatedFields` 只记录被当作设备事实使用的估算字段，非空时不得写 `high`。统一产品 `frame` 和 `screenBorderRadius` 属于展示样式，不写入 `estimatedFields`，但需在 `notes` 声明。
- `crossValidated=false` 的记录不得写 `high`。
- `reference` 条目允许使用仓库产品定义作为来源，但 `notes` 必须说明不是硬件设备。

## 7. UI 设计

### 7.1 标签

可信度标签映射固定为：

| 值           | 文案   | 色彩语义 |
| ------------ | ------ | -------- |
| `high`       | 高可信 | 绿色     |
| `medium`     | 中可信 | 琥珀色   |
| `low`        | 低可信 | 红色     |
| `unverified` | 未验证 | 灰色     |

设备列表项、对比设备库条目和属性面板均显示标签。列表使用紧凑标签；属性面板同时显示解释文本。标签不得声称插件已经模拟真实 DPR、UA、OS 或浏览器内核。

### 7.2 能力边界

- 尺寸文案改为“CSS 视口（px）”。
- DPR 和 UA 后显示“元数据，不改变 iframe 环境/请求”。
- Safe Area 区域显示“视觉覆盖层，不等同于页面内 `env()`”。
- 单状态折叠设备名称包含“展开态”或“外屏态”。
- 单设备和对比设备库共用的分类 Tab 增加“折叠屏”。

## 8. 校验设计

继续使用 `utils/validation.ts` 和 Vitest，不增加新校验依赖。

### 8.1 Profile 校验

- `confidence` 缺失时合法；存在时必须属于四个枚举值。
- viewport 宽高必须大于 0 且不超过 4000 CSS px。
- DPR 必须处于 0.5–5。
- `safeArea.top + bottom < height`，`left + right < width`。
- `screenBorderRadius <= min(width, height) / 2`。
- 摄像头解析 absolute/anchor 坐标后，其轴对齐边界框不得超出 viewport。
- display feature 的轴对齐边界框不得超出 viewport。
- 旋转对象按旋转后外接矩形校验；确有来源的例外只能在系统数据集测试中显式白名单，不能放宽通用 validator。

### 8.2 系统数据集校验

新增 `tests/system-devices.test.ts`，验证：

- 17 个系统条目全部通过 `validateDeviceProfile`。
- 顶层 ID 全局唯一，系统设备全部显式填写可信度。
- 每个系统 ID 恰好对应一条来源记录，来源 ID 和可信度一致。
- 13 个 P0 ID 完整存在；新增未准入 P1 不得混入。
- 规范化 `brand + model + state` 不重复。
- 普通 phone/tablet 的方向关系正确，`surface-duo-spanned` 是明确白名单。
- Surface Duo 两方向 hinge 完全位于 viewport。
- 比较模式硬编码预设中的设备 ID 均可解析。
- 高可信记录 `crossValidated=true` 且没有设备事实类 `estimatedFields`。

旧自定义设备没有 `confidence` 时仍通过现有导入和持久化测试，并在 store 中显示为 `unverified`。

## 9. 文件职责

| 文件                                          | 变更职责                                   |
| --------------------------------------------- | ------------------------------------------ |
| `types/device.ts`                             | 新增可信度类型和可选字段                   |
| `constants/default-devices.ts`                | 更新 17 个系统配置并保持稳定导出           |
| `constants/device-sources.json`               | 保存来源、日期、可信度、估算和交叉验证信息 |
| `utils/device-profile.ts`                     | 提供可信度回退和复制归一化逻辑             |
| `utils/device-confidence.ts`                  | 提供可信度文案和色彩语义映射               |
| `utils/validation.ts`                         | 增加可信度与几何边界校验                   |
| `stores/device-store.ts`                      | 把所有自定义数据归一化为 `unverified`      |
| `components/device/DeviceCategoryTabs.tsx`    | 增加折叠屏分类                             |
| `components/device/DeviceConfidenceBadge.tsx` | 统一渲染可信度标签                         |
| `components/device/DeviceListItem.tsx`        | 显示紧凑可信度标签                         |
| `components/compare/CompareDeviceLibrary.tsx` | 显示紧凑可信度标签                         |
| `components/device/DevicePropertyPanel.tsx`   | 显示可信度和能力边界说明                   |
| `components/editor/SafeAreaEditor.tsx`        | 显示 Safe Area overlay 说明                |
| `components/compare/ComparePropertyPanel.tsx` | 在对比模式的 Safe Area 控制旁显示相同说明  |
| `tests/device-validation.test.ts`             | 覆盖新枚举和边界失败用例                   |
| `tests/system-devices.test.ts`                | 覆盖系统数据、来源和稳定引用               |
| `tests/device-profile.test.ts`                | 覆盖可信度回退与复制归一化                 |
| `tests/device-confidence.test.ts`             | 覆盖可信度文案、回退和分类入口             |
| `tests/compare-store.test.ts`                 | 保证新增设备不破坏重复实例和稳定 ID        |
| `docs/device-data-changelog.md`               | 记录新增、修正、可信度和已知限制           |
| `README.md`                                   | 更新系统设备数量和模拟能力边界             |

## 10. 数据流与兼容性

系统设备随扩展版本从 `SYSTEM_DEVICES` 加载，来源台账不进入 store。store 合并用户数据时：

1. 克隆系统设备并保留其显式可信度。
2. 过滤与系统 ID 冲突的自定义数据。
3. 把所有自定义设备可信度归一化为 `unverified`。
4. 旧 `currentDeviceId`、收藏和对比实例继续按稳定 ID 解析。
5. 新增系统设备只扩展可选列表，不自动创建 iframe，也不写入用户存储。

`confidence` 可选，因此无需提升现有存储版本或导入 schema 版本。导出自定义设备时会输出归一化后的 `unverified`；旧导入文件不带该字段仍合法。

## 11. 错误处理

- 来源台账缺项、重复、ID 不一致或可信度不一致由测试阻止合并。
- 无法映射到现有模型的动态行为只写入 `notes`，不得临时扩造字段。
- 设备数据越界由 validator 返回精确路径，例如 `$.portrait.safeArea.bottom`。
- UI 遇到未知可信度值时由 validator 拒绝；旧数据缺失字段显示“未验证”。
- iframe 被 CSP、X-Frame-Options 或登录态阻止仍按现有加载错误处理，不归因于设备可信度。

## 12. 测试与验收

实现使用测试驱动流程：先添加失败测试，再补最小实现。合并前运行：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

人工抽样覆盖 iPhone SE、iPhone 15 Pro、Pixel 8、Galaxy S24、iPad Air、Surface Pro 7 和 Surface Duo 展开态。每台验证搜索、分类、选择、横竖方向、可信度标签、Safe Area/开孔开关和对比添加。

验收结果必须明确：

- 13 个 P0 均存在，其中 S24 为中可信，其限制对用户可见。
- 17 个系统条目和来源台账一一对应。
- 所有互联网来源、采集日期和估算字段可审计。
- 旧自定义数据、收藏、当前选择、历史和对比引用不丢失。
- UI 不声称真实模拟 DPR、UA、OS、内核或标准 Safe Area `env()`。
