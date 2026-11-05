# FairLens

> 画布式简历工作台——编辑即所见，AI 以红笔批注与块级修订陪你打磨简历。（暂无中文名）

FairLens 面向按批次组织的面试候选人（客户方授权激活），提供：真 A4 画布编辑器（版式由模板锁定、内容随你）、AI 块级修订（内联 diff）、全篇评估（六维雷达 + 红笔批注）、双轨导出（定稿 PDF/Word + 批注版 HTML/长图）、简历库与 .fairlens 归档迁移。数据全本地，AI 走用户自有 Key 直连。

**当前状态**：✅ 设计基线 v0.1 已封版（四轮审计 36 项闭环）｜🚧 **M1 开发中（6/8 模块收口：m1.1–m1.6，m1.1 待过目；2026-11-05 预览纸面结构/字体/雷达/大纲修复；下一 m1.7 导入管线暂缓）**｜dev 分支活跃

> 开发进度唯一快照：`docs/dev/STATE.md`（每模块收尾同步）；决策总账与逐字段契约见 `docs/01-技术开发文档.md`。

## 快速开始（开发者）

```bash
pnpm install          # 安装依赖（Node ≥20 + pnpm 11）
pnpm test             # 单测（本仓当前全绿；计数见 CI/STATE）
pnpm lint && pnpm typecheck
pnpm tauri:dev        # 真窗开发（自动清理残留 vite/fairlens.exe；首次 cargo 编译较久）
pnpm dev              # 仅浏览器前端（localhost:1420）
pnpm dev:kill         # 清理残留进程 / 释放 1420
```

打样激活码（格式校验态，真验签=M2）：`FL-2026-Q4XY-8F3K`。

## 文档索引

| 文档 | 内容 |
|---|---|
| [docs/01-技术开发文档.md](docs/01-技术开发文档.md) | **唯一事实源**：PRD + 逐字段数据契约（zod）+ 架构 + 开发流程（分支/环境分离/测试门禁/分模块顺序）+ UI 设计系统 + 成本部署手册 + 决策总账 118 条 + 1.0 路线图 |
| [docs/02-开发启动手册.md](docs/02-开发启动手册.md) | 开发前流程顺序：远程仓库/分支保护/环境准备/M0 启动/里程碑节奏/外部资源时机表 |
| [docs/design-previews/](docs/design-previews/) | 五份设计基线预览（M1 UI 打样的在库参照）：亮色主界面 / 夜墨深色（含设置窗） / 模型连接页 / 四声部字体 / 简历库+导出下拉 |

## 仓库结构（M0–M1 已落地；prompts 于 M1–M3 生成）

```
fairlens/
├─ apps/desktop/        # Tauri 2 桌面应用（React+TS；src-tauri Rust 薄层 <300 行）
├─ packages/shared/     # ✅ M0：全契约（zod 逐字段，含全部预留类型）
├─ packages/core/       # ✅ M1：snapshot-diff / autosave / settings / persistence-port
├─ packages/prompts/    # M1–M3 生成
├─ functions/lease/     # 契约已冻结（lease-api.v1.json）；端点实现=M2
├─ tools/keygen/        # ✅ M0：init（双环境密钥对）；issue 等=M2/M5
└─ keys/                # 本地密钥（gitignore，绝不入仓）
```

## 版本策略

- **0.1**（当前规划）= M0–M5 全范围首发，里程碑收口打预发布 tag（`v0.1.0-m1…`），M5 正式发布 `v0.1.0`
- **0.x** = 触发器提前的小迭代（机构网关/macOS 等）
- **1.0** = 生态路线图（垂类工作台/资源市场/云同步/模拟面试，详见 01 文档附录 F）

## 开发约定

- 先改文档（决策总账+正文）再写代码；每里程碑 DoD 首条 = 测试全绿
- 三层分支：`main`（保护，收口+发布）← `dev`（集成）← `feat/*`（短分支 squash）
- 严格 dev/prod 环境分离（双密钥对/双构建标识/双数据库）；AI 辅助开发约定见 01 文档 §3.4

## License

MIT（见 [LICENSE](LICENSE)，2026 JasperWang）。字体依循各自许可：IBM Plex / IBM Plex Sans SC / Noto Serif SC 为 OFL；楷体为系统字体引用不打包。
