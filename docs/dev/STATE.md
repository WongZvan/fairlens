# FairLens 开发状态快照（STATE）

> **跨会话进度的唯一快照**。规则：①每模块收尾必须同步本文件与 `modules/README.md`（并入 DoD）；②只存指针与状态，**不复制字段/契约细节**——唯一事实源=`docs/01-技术开发文档.md` 与 `packages/shared/src/`，**禁止凭记忆引用字段名**；③新会话启动协议：读本文件 → 读当前模块的 `modules/mX/mX.Y-*.md` → 读 docs/01 对应章节 → `git log --oneline -20` → 对齐开工。

## 当前进度

| 项 | 状态 |
|---|---|
| 里程碑 | **M0 已收口**（tag `v0.1.0-m0`，main/dev=`872b440`，2026-10-24） |
| 下一里程碑 | **M1 画布编辑器**（m1.1 UI 打样起步），待用户开工指令 |
| 当前分支 | main（干净）；dev=main |
| 已落地 | 见 `modules/m0/` 四文件"实现要点"实录 |
| 未落地 | packages/core 与 prompts（M1–M3）· lease 实现（M2）· keygen issue 等（M2/M5） |

## 环境实录（跨会话必知，细节见 notes/）

- **Rust 未装**（M1 的 tauri dev/build 验证前装：rustup+MSVC；web 模式不受阻）
- git 本地代理=7897（全局 2334 失效）；npm registry 直连（~/.npmrc 死代理已删，有备份）
- pnpm 11 构建许可=pnpm-workspace.yaml `allowBuilds`；契约校验已做 CRLF 归一；.gitattributes 统一 LF
- 分支保护待用户在 GitHub 开启（CI 已就绪）

## 流程增补（2026-10-24 采纳，docs/01 §3.6/§3.7）

- 模块化目录导航：29 模块各持开发细节 MD（本目录 `modules/`）
- 缺陷直报与即修：发现逻辑错误/设计缺陷→向用户直报附证据→范围内即修+回归测试（先红后绿）→记录 `decisions/`
