# 仓库指南

## 项目结构与模块组织

本项目是使用 React、TypeScript 和 WXT 构建的浏览器扩展。入口位于 `entrypoints/`：`popup/` 用于启动模拟器，`simulator/` 是主工作台，`demo/` 提供离线示例，根目录下的 background/content 脚本负责协调扩展行为。可复用 UI 按职责存放在 `components/`。

状态放在 `stores/`，浏览器 API 与持久化边界放在 `services/`，共享逻辑放在 `utils/`，规范数据类型放在 `types/`。默认值归入 `constants/`，可复用 React 行为归入 `hooks/`，单元测试统一放在 `tests/`。不要编辑或提交自动生成的 `.output/` 和 `.wxt/` 文件。

## 构建、测试与开发命令

使用 pnpm 10，并确保 Node.js 版本不低于 20.19。

- `pnpm install`：按 `pnpm-lock.yaml` 安装依赖。
- `pnpm dev`：启动 Chromium 开发运行器；`pnpm dev:firefox` 用于 Firefox。
- `pnpm build`：将 Chromium 扩展构建到 `.output/chrome-mv3`。
- `pnpm typecheck`：执行严格 TypeScript 类型检查，不生成文件。
- `pnpm lint`：检查 ESLint 规则；`pnpm lint:fix` 自动修复可修复问题。
- `pnpm format:check`：检查 Prettier 格式；`pnpm format` 自动格式化。
- `pnpm test`：单次运行 Vitest；`pnpm test:watch` 启动监听模式。
- `pnpm zip`：打包可分发的扩展文件。

## 编码风格与命名约定

Prettier 规定使用单引号、分号、尾随逗号、两空格缩进和 100 字符行宽。React 组件及导出类型使用 PascalCase，函数和变量使用 camelCase，非组件模块文件使用 kebab-case，例如 `device-scale.ts`。Hook 文件以 `use-` 开头，函数以 `use...` 命名。优先使用类型专用导入；ESLint 禁止未处理和误用的 Promise。浏览器或存储副作用应封装在 service 中。

## 测试指南

Vitest 在 Node 环境运行 `**/*.test.ts`。测试文件按被测单元或行为命名，例如 `tests/device-validation.test.ts`。验证逻辑、坐标计算、URL 处理、导入流程、存储边界及缺陷修复都应添加测试。项目暂未设置最低覆盖率；提交 PR 前至少运行 `pnpm test`、`pnpm typecheck` 和 `pnpm lint`。

## 提交与 Pull Request 规范

近期提交采用带作用域的 Conventional Commits，例如 `feat(panel-layout): ...`。标题应简洁并使用祈使语气，例如 `fix(simulator): 修复旋转后缩放丢失`；默认中文，但单次提交需保持一致。PR 应说明用户可见的变化、列出验证命令、关联相关 Issue，并为 UI 变更附截图或短视频。若涉及扩展权限、存储结构或浏览器兼容性，必须明确说明。

## Agent skills

### Issue tracker

议题通过 GitHub Issues 跟踪（仓库 `SupremacySakura/device-simulator`，使用 `gh` CLI)。参见 `docs/agents/issue-tracker.md`。

### Triage labels

使用五种规范分诊标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。参见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文（single-context）布局：根目录 `GLOSSARY.md` + `docs/adr/`。参见 `docs/agents/domain.md`。
