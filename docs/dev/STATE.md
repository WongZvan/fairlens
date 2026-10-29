# FairLens 开发状态快照（STATE）

> **跨会话进度的唯一快照**。规则：①每模块收尾必须同步本文件与 `modules/README.md`（并入 DoD）；②只存指针与状态，**不复制字段/契约细节**——唯一事实源=`docs/01-技术开发文档.md` 与 `packages/shared/src/`，**禁止凭记忆引用字段名**；③新会话启动协议：**第 0 步读本文件「悬挂事项」节** → 读当前模块的 `modules/mX/mX.Y-*.md` → 读 docs/01 对应章节 → `git log --oneline -20` → 对齐开工；④**会话结束前必须更新「悬挂事项」节**（防上下文切换丢失，docs/01 §3.6）。

## 当前进度

| 项 | 状态 |
|---|---|
| 里程碑 | M1 进行中（6/8）：**m1.1–m1.6 已收口**（m1.6=deb5d6a）；M0 已收口（tag v0.1.0-m0） |
| 当前模块 | 下一 **m1.7 导入管线**（LLM 接入点留 m3.5）；m1.1 打样待用户最终过目 |
| 当前分支 | dev=deb5d6a（与 origin 同步，工作区干净）；main=e3956fe（按流程 M1 整体收口时合并，落后属预期）。m1.6 squash 事实：内容在 09ecebf（squash）+ 8353bcd（归因更正）/ deb5d6a（反馈轮四项）两次修订，feat/m1.6 已删 |
| 已落地 | 编辑器核心全通：真 Tiptap 画布/3 套模板/Ctrl+K 面板/快捷键全集/悬浮工具条(悬停门控)/右键菜单/侧栏拖拽调宽/缩放三态/激活门/**m1.6 持久层**（packages/core 首落/SQLite 迁移/自动保存防抖+失焦保存/关闭保护双模式/快照四态 diff+双栏对比+回滚/settings 四键预留）+ **tauri 启动入口**（`pnpm tauri:dev`）与**窗口操作权限修复**（三键/任务栏关闭可用）——实录见 `modules/m1/` 六文件 |
| 未落地 | m1.7–m1.8；packages/core 后续（diff-apply 等 M3）与 prompts（M1–M3）· lease 实现（M2）· keygen issue 等（M2/M5） |

## 环境实录（跨会话必知，细节见 notes/）

- **Rust 已装**（1.99.1，2026-10-25 发现——此前实录过时）；cargo 首拉走 `~/.cargo/config.toml` proxy=127.0.0.1:7897（系统代理 2334 已死会被 libcurl 拾取）；tauri-plugin-sql 已接入（迁移 v1=附录 B DDL）
- git 本地代理=7897（全局 2334 失效，会间歇掉线，掉线时本地提交不丢、恢复后推送）；npm registry 直连（~/.npmrc 死代理已删，有备份）
- pnpm 11 构建许可=pnpm-workspace.yaml `allowBuilds`；契约校验已做 CRLF 归一；.gitattributes 统一 LF
- 分支保护待用户在 GitHub 开启（CI 已就绪）
- 测试激活码：`FL-2026-Q4XY-8F3K`（格式校验态；真验签=M2）

## 悬挂事项（会话切换前必更新；新会话第 0 步先读此处）

**待用户决策**（2026-10-25 清账，当前无）
- ~~m1.6 策略 A/B~~ → 已定案 A（装 Rust 全量），见 decisions/
- ~~检查单第 4 项是否固化 §3.6~~ → 已固化（§3.6 规则① 勾选一致性核对）

**待人工验收**（自动化无法覆盖）
1. Ctrl+点击链接跳转（系统键组合无法模拟；函数链与语义层已验证）
2. GitHub 分支保护三步（Settings→Rulesets，清单见 02 手册②）
3. CI 首跑确认四 job 全绿
4. m1.1 打样最终过目（九轮反馈后整体观感）
5. **m1.6 tauri 真机冒烟**——**自动部分已过**（2026-10-25 首跑 `pnpm tauri:dev` 成功：fairlens.exe 起窗、`%APPDATA%\com.fairlens.desktop\fairlens_dev.db` 生成+WAL、_sqlx_migrations+附录 B 五表建齐、resumes 已有真机写入的示例简历行）；**收口后反馈轮四项已修待复验**（右栏 resizer 真内缘+CTA 纵向滚动可达 / 三键换 lucide / 大纲更严过滤含空 bullet 契约修复 / 右键文案「创建条目副本」）；**剩余人工操作项**：编辑→关窗→重开数据仍在（真持久层核心验收）/三键与标题栏拖动真机验（lucide 图标仅真窗可见）/关闭保护弹窗（Tauri onCloseRequested 路径）/Ctrl+S toast/快照对话框真机过一遍/大纲拖拽排序回归。启动命令已固化：项目根 `pnpm tauri:dev`（@tauri-apps/cli 已入 devDeps；注意勿在主目录裸跑 `pnpm tauri dev`——cwd 无 package.json 会报 NO_IMPORTER_MANIFEST_FOUND；改 capabilities 后须见 `Compiling fairlens` 才算重编）

**占位清理账**（接手人必读）
- ~~mockup store `dirty` 占位~~（m1.6 已接管：editor-doc store；mockup.dirty 字段已删）
- `edit.entry-duplicate` 占位命令（真实现已在右键菜单；m1.8 面板接）与 Ctrl+F 吞键（m1.6 内联查找——实际未做，Ctrl+F 仍吞键占位，见下方更正）
- **更正**：Ctrl+F 内联查找不在 m1.6 任务清单（导航表 m1.5 行「Ctrl+F 面板=M1.6」指面板入口沿用）——真内联查找仍待后续模块排期
- m1.4 剩余：结构 gating→m1.5 命令层、背景层 #86（settings 四键已预留，背景渲染待 m2.3 配置 UI 接）、IME 专项、粘贴气泡 UI

## 流程增补（2026-10-24 采纳，docs/01 §3.6/§3.7）

- 模块化目录导航：29 模块各持开发细节 MD（本目录 `modules/`）
- 缺陷直报与即修：发现逻辑错误/设计缺陷→向用户直报附证据→范围内即修+回归测试（先红后绿）→记录 `decisions/`
- #86 画布背景四态（浅/深/跟随主题/自定义图+本地导入）：m1.4 预留层→m2.3 配置 UI
- #90 台面纸墨质感+缩放三态：已实装（cf57d07）
- #87–#89 设置窗/激活门/状态栏定案；#92 键位+面板填充；#93 右键菜单与入口分工；#94 工具条悬停门控+侧栏调宽——均已实装（总账 94 条）
- 2026-10-25 m1.6 策略 A（装 Rust 全量）定案（decisions/）；§3.6 固化勾选一致性核对；总账编号漂移修复（#100 重复→#101/#102）——第五轮记账缺口（总账无条目+用户级 Changelog 漏行+SOP 侧 3 条固化未寻获）已直报待拍板
- 2026-10-25 m1.6 收口：总账 #103（策略 A）/ #104（CI 门禁补 apps/*）；快照 diff 四态注记；窗口 API npm 化（withGlobalTauri 缺陷即修）；模块 MD 补录规格（双栏对比/失焦保存/800ms）已照做
- 2026-10-25 tauri 启动入口补齐（@tauri-apps/cli 入 devDeps，根 script `tauri:dev`）；tauri dev 首跑通过（编译 30.7s 复用缓存）；SQLite 真持久层落盘验证通过（详见悬挂事项⑤）
- 2026-10-25 真机缺陷直报即修：窗口三键/任务栏关闭全失效=capabilities 缺窗口操作权限（core:window:default 仅含查询类，已补 minimize/toggle-maximize/close/destroy/start-dragging 五权限）+窗口命令 Promise 加 catch 不再静默；第五轮记账缺口经用户拍板"全部补录"清账（总账 #105：SOP 来源行锚定/两文件 Changelog 第五轮行/命令 4 措辞统一；G-D 频率核实=已固化）
- 2026-10-25 归因更正（git 考古）：窗口三键缺陷的 window.__TAURI__ 写法系 **m1.1 迁移重写引入**（m0.3 原始 TitleBar 为 npm 包正确写法，872b440 可证）——第三起"迁移重写断裂"先例，教训入 m1.6/m0.3 偏离节（迁移组件=重写审查点，逐 API 路线核对）
- 2026-10-25 收口后反馈轮②（总账 #106）：选区态右键补剪切/复制/粘贴/全选（右键不折叠选区）；工具条可达区=选区∪工具条∪走廊+150ms 宽限+隐藏时 pointer-events:none+blur 后复显+自愈；定位 appendTo body+fixed（修 zoom 0.8 坐标错算）；Ctrl+K/Ctrl+D 接线；右键粘贴改 clipboard.read。待你真机复验：工具条悬停/加号粗体/链接/Ctrl+D/右键四项
