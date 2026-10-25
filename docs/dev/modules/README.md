# 模块导航总表（29 模块单元 = feat 分支粒度）

> 状态图例：⬜未开始 ｜ 🔄进行中（标注 feat 分支）｜ ✅已收口（标注 commit）。收口=回填模块文件"实现要点"+本表+STATE.md（DoD 的一部分）。三原则：契约先行/风险前置/依赖驱动+垂直可用；并行对见 docs/01 §3.5。

| # | 模块 | 面归属 | 状态 | 细节文件 | feat 分支 |
|---|---|---|---|---|---|
| m0.1 | Monorepo+CI 三门禁 | 共享 | ✅ 872b440 | [m0/m0.1-monorepo-ci.md](m0/m0.1-monorepo-ci.md) | feat/m0-scaffold |
| m0.2 | shared 全契约+单测 | 共享 | ✅ 872b440 | [m0/m0.2-shared-contracts.md](m0/m0.2-shared-contracts.md) | feat/m0-scaffold |
| m0.3 | desktop 应用壳 | 共享 | ✅ 872b440 | [m0/m0.3-desktop-shell.md](m0/m0.3-desktop-shell.md) | feat/m0-scaffold |
| m0.4 | keygen init+契约冻结 | 共享 | ✅ 872b440 | [m0/m0.4-keygen-contract.md](m0/m0.4-keygen-contract.md) | feat/m0-scaffold |
| m1.1 | UI 可点击打样（含激活门/设置壳，九轮反馈） | 基础 | ✅ 4f3b4b7（待最终过目） | [m1/m1.1-ui-mockup.md](m1/m1.1-ui-mockup.md) | feat/m1-ui-mockup |
| m1.2 | 模板数据层（3 套+printCSS） | 基础 | ✅ 64478c6 | [m1/m1.2-template-data.md](m1/m1.2-template-data.md) | feat/m1.2-template-data |
| m1.3 | Tiptap 节点+blockId | 基础 | ✅ 9066395 | [m1/m1.3-tiptap-nodes.md](m1/m1.3-tiptap-nodes.md) | feat/m1.3-tiptap-nodes |
| m1.4 | 画布渲染（权限矩阵/粘贴归一化） | 基础 | 🔄 主体已通（ed0c76e 起；结构 gating/背景层/IME 专项挂后续模块） | [m1/m1.4-canvas.md](m1/m1.4-canvas.md) | feat/m1.4-canvas |
| m1.5 | 树/快捷键/命令面板/Ctrl+F | 基础 | ✅ 92b4cad（Ctrl+F 面板=M1.6） | [m1/m1.5-tree-shortcuts.md](m1/m1.5-tree-shortcuts.md) | feat/m1.5-tree-shortcuts |
| m1.6 | 持久层+快照+关闭保护 | 基础 | ✅ e224273（真机冒烟待人工验收） | [m1/m1.6-persist-snapshot.md](m1/m1.6-persist-snapshot.md) | feat/m1.6 |
| m1.7 | 导入管线（LLM 接入点留 m3.5） | 基础 | ⬜ | [m1/m1.7-import.md](m1/m1.7-import.md) | 待切 |
| m1.8 | 简历库首页 | 基础 | ⬜ | [m1/m1.8-library-home.md](m1/m1.8-library-home.md) | 待切 |
| m2.1 | lease 端点（miniflare） | 共享 | ⬜ | [m2/m2.1-lease-endpoint.md](m2/m2.1-lease-endpoint.md) | 待切 |
| m2.2 | 双证状态机（幂等恢复边） | 共享 | ⬜ | [m2/m2.2-license-statemachine.md](m2/m2.2-license-statemachine.md) | 待切 |
| m2.3 | 激活向导+设置+角色门控 | 共享 | ⬜ | [m2/m2.3-activation-ui.md](m2/m2.3-activation-ui.md) | 待切 |
| m2.4 | keygen 全命令+灾备 | 共享 | ⬜ | [m2/m2.4-keygen-full.md](m2/m2.4-keygen-full.md) | 待切 |
| m3.1 | llm-client+sse+AiGateway(direct) | 基础 | ⬜ | [m3/m3.1-llm-client.md](m3/m3.1-llm-client.md) | 待切 |
| m3.2 | 模型连接页+consent | 基础 | ⬜ | [m3/m3.2-provider-settings.md](m3/m3.2-provider-settings.md) | 待切 |
| m3.3 | prompt-renderer+兜底包 | 基础 | ⬜ | [m3/m3.3-prompt-renderer.md](m3/m3.3-prompt-renderer.md) | 待切 |
| m3.4 | 块级修订闭环 | 基础 | ⬜ | [m3/m3.4-block-revise.md](m3/m3.4-block-revise.md) | 待切 |
| m3.5 | 导入 LLM 接入+mock Provider | 基础 | ⬜ | [m3/m3.5-import-llm-mock.md](m3/m3.5-import-llm-mock.md) | 待切 |
| m4.1 | evaluator+面板 | 基础 | ⬜ | [m4/m4.1-evaluator.md](m4/m4.1-evaluator.md) | 待切 |
| m4.2 | 红笔批注系统 | 基础 | ⬜ | [m4/m4.2-redpen.md](m4/m4.2-redpen.md) | 待切 |
| m4.3 | AI 走查 | 基础 | ⬜ | [m4/m4.3-walkthrough.md](m4/m4.3-walkthrough.md) | 待切 |
| m4.4 | 评测台+20 份校准 | dev | ⬜ | [m4/m4.4-bench-dev.md](m4/m4.4-bench-dev.md) | 待切 |
| m5.1 | 导出双轨+归档+文件关联 | 基础 | ⬜ | [m5/m5.1-export.md](m5/m5.1-export.md) | 待切 |
| m5.2 | 资源中心+模板工作室+诊断中心+dev 命令 | dev | ⬜ | [m5/m5.2-dev-toolbox.md](m5/m5.2-dev-toolbox.md) | 待切 |
| m5.3 | Prompt Studio 全功能 | dev | ⬜ | [m5/m5.3-prompt-studio.md](m5/m5.3-prompt-studio.md) | 待切 |
| m5.4 | NSIS/更新器/流水线/灾备演练/验收 | 共享 | ⬜ | [m5/m5.4-release.md](m5/m5.4-release.md) | 待切 |

**并行对**：m2.1–m2.2 ∥ m3.1–m3.3；m2.3–m2.4 ∥ m3.4；m4.4、m5.2–m5.3（dev 面）可与基础面收尾并行。
**命名**：共享/基础面 `feat/<模块>`；dev 面 `feat/dev-*`。
