# FairLens 开发状态快照（STATE）

> **跨会话进度的唯一快照**。规则：①每模块收尾必须同步本文件与 `modules/README.md`（并入 DoD）；②只存指针与状态，**不复制字段/契约细节**——唯一事实源=`docs/01-技术开发文档.md` 与 `packages/shared/src/`，**禁止凭记忆引用字段名**；③新会话启动协议：**第 0 步读本文件「悬挂事项」节** → 读当前模块的 `modules/mX/mX.Y-*.md` → 读 docs/01 对应章节 → `git log --oneline -20` → 对齐开工；④**会话结束前必须更新「悬挂事项」节**（防上下文切换丢失，docs/01 §3.6）。

## 当前进度

| 项 | 状态 |
|---|---|
| 里程碑 | M1 进行中（6/8）：**m1.1–m1.6 已收口**（m1.4 尾项 2026-11-04 补齐；m1.6=deb5d6a）；**2026-11-05 预览纸面结构/字体/雷达/大纲修复（#116/#117）**；下一 m1.7 暂缓；M0 已收口（tag v0.1.0-m0） |
| 当前模块 | 预览纸面结构/反馈修复已落地；下一 **m1.7 导入管线**（用户指示暂缓；LLM 接入点留 m3.5）；m1.1 打样待用户最终过目 |
| 当前分支 | dev=6fbfb2a（2026-11-05 预览纸面结构/反馈修复 squash；其后仅文档同步，最新以 `git log -1` 为准；已推送 origin）；feat/m1-preview-parity 已删；main=e3956fe（按流程 M1 整体收口时合并，落后属预期）。m1.6 squash 事实：内容在 09ecebf（squash）+ 8353bcd（归因更正）/ deb5d6a（反馈轮四项）两次修订，feat/m1.6 已删；其后 #107–#114 反馈修复均直推 dev |
| 已落地 | 编辑器核心全通：真 Tiptap 画布/3 套模板（切换真实生效）/Ctrl+K 面板/快捷键全集/悬浮工具条(悬停门控)/右键菜单/侧栏拖拽调宽/缩放三态/激活门/**m1.6 持久层**（packages/core 首落/SQLite 迁移/自动保存防抖+失焦保存/关闭保护双模式/快照四态 diff+双栏对比+回滚/settings 六键预留）+ **tauri 启动入口**（`pnpm tauri:dev`）与**窗口操作权限修复**（三键/任务栏关闭可用）+ **m1.4 尾项**（粘贴气泡/仅文本 Ctrl+Shift+V/大段提示/图片 toast/链接白名单/maxEntries gating/IME 守卫）+ **预览纸面结构**（ResumeDoc.profile/页头/basicFields/skills/照片槽占位/条目三段行/duo 双栏/Plex Sans SC/A4 等比 printCSS）——实录见 `modules/m1/` 八文件；**#106–#114 反馈修复见文末流程增补** |
| 未落地 | m1.7–m1.8（m1.7 暂缓）；packages/core 后续（diff-apply 等 M3）与 prompts（M1–M3）· lease 实现（M2）· keygen issue 等（M2/M5） |

## 环境实录（跨会话必知，细节见 notes/）

- **Rust 已装**（1.99.1，2026-10-25 发现——此前实录过时）；cargo 首拉走 `~/.cargo/config.toml` proxy=127.0.0.1:7897（系统代理 2334 已死会被 libcurl 拾取）；tauri-plugin-sql 已接入（迁移 v1=附录 B DDL）
- **tauri dev 中断会残留进程**（Ctrl+C/关终端后 `fairlens.exe` 与 vite 可能存活）→ 二启动报 `Port 1420 already in use` 但仍拉窗；先跑 `pnpm dev:kill`（清 1420 端口+fairlens.exe）再启动（`tauri:dev` 已内置前置清理）
- **窗口圆角=透明窗口+CSS**（#112）：Win10 无原生窗口圆角，依赖 `transparent:true`+`noRedirectionBitmap:true`；改 window 配置（tauri.conf.json）必须重编（见 `Compiling fairlens`），仅热更前端无效
- git 本地代理=7897（全局 2334 失效，会间歇掉线，掉线时本地提交不丢、恢复后推送）；npm registry 直连（~/.npmrc 死代理已删，有备份）
- pnpm 11 构建许可=pnpm-workspace.yaml `allowBuilds`；契约校验已做 CRLF 归一；.gitattributes 统一 LF；`@ibm/plex-sans-sc` postinstall 仅 telemetry → `allowBuilds: false`（字体已随包，不执行上报脚本）
- 分支保护待用户在 GitHub 开启（CI 已就绪）
- 真窗取证=CDP（`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` + Runtime.evaluate）；capabilities 改动须强制重编并核对生成物 `out/capabilities.json`——细节见 `notes/env-quirks.md`
- 测试激活码：`FL-2026-Q4XY-8F3K`（格式校验态；真验签=M2；#113 起打样态激活记忆存 settings.license，重开免门）

## 悬挂事项（会话切换前必更新；新会话第 0 步先读此处）

**待用户决策**（当前 0 项）
- ~~m1.6 策略 A/B~~ → 已定案 A（装 Rust 全量），见 decisions/
- ~~检查单第 4 项是否固化 §3.6~~ → 已固化（§3.6 规则① 勾选一致性核对）
- ~~AGENTS.md 是否入库~~ → **已定案（2026-11-04）：保持不入库**（维持 .gitignore；SOP 为个人工作流文件，不随仓库分发）

**待人工验收**（自动化无法覆盖；2026-11-03 收敛，已自动确认项移出）

> 交接提示：新会话/新终端先 `pnpm dev:kill` 再 `pnpm tauri:dev`（清残留 vite/fairlens.exe）；环境取证方法（CDP）与 capabilities 重编陷阱见 `notes/env-quirks.md`。

1. **链接：真实 Ctrl+点击**——CDP 真窗实测 `opener.open_url` 已成功（"Not allowed to open url" 已消除）；失败会弹 toast
2. **窗口**：最大化后四角应变直角（门 420×380 圆角/无黑边/主窗圆角/激活重启免门 均已真机确认）
3. **关闭保护**：手动模式编辑后关窗应弹「保存/不保存/取消」（逻辑与单测已过，真窗待点）
4. **编辑器真窗**：工具条 B/I/链接点击 / 点纸面空白新增要点 / 空要点 Enter 删行（浏览器与单测均已过）；顺手验链接文字首尾空格不延长下划线
5. **m1.6 真机冒烟剩余**：编辑→关窗→重开数据仍在 / 三键与状态栏拖动 / Ctrl+S toast / 快照对话框全流程 / 大纲拖拽换序效果（不崩已确认）
6. **项目级**：m1.1 打样最终过目 / GitHub 分支保护三步 / CI 首跑四 job 全绿
7. **m1.4 尾项真窗**：富文本粘贴气泡定位/观感 →「仅文本」原地替换；Ctrl+Shift+V 纯文本；大段粘贴提示；图片忽略 toast；条目上限 toast（浏览器冒烟已过，见 m1.4 MD）
8. **IME 真机**：中文输入法组合期间 Enter/Ctrl+快捷键不误触（仅单测守卫覆盖，需真实输入法）
9. **窗口最小尺寸（#116）**：真窗从 1280×800 拖边向内应能到 960×640（不再被 1152×720 夹住）；激活启动不再被顶在最小尺寸；最大化时拖边不缩放属系统行为
10. **预览纸面真窗（#117）**：Plex Sans SC 中文渲染、页头/条目三段行/duo 侧栏/照片虚线槽观感；三套模板切换；页头与条目头 MetaDialog 编辑后 SQLite 持久化
11. **雷达/大纲真窗**：右栏 220/296 两档雷达完整可见；大纲分区折叠面板收起再开仍保留

**已自动确认（不再列为待办）**：#107 大纲拖拽不崩（根因 #109 已修）/ #109 编辑器空白修复 / #111 激活门无黑边 / #112 门 420×380+圆角+主窗圆角 / #113 激活持久化 / #114 链接作用域与点空白新增（浏览器+CDP）/ m1.4 尾项浏览器冒烟（气泡/仅文本无 mark/Ctrl+Shift+V/大段/图片/链接白名单/上限 toast）/ 2026-11-05 预览纸面浏览器冒烟（三套模板切换/页头与条目头编辑/雷达 220px/大纲折叠/字体 computed style）

**占位清理账**（接手人必读）
- ~~mockup store `dirty` 占位~~（m1.6 已接管：editor-doc store；mockup.dirty 字段已删）
- `edit.entry-duplicate` 占位命令已消除（#107：命令面板同名命令=复制当前要点，真实现）；Ctrl+F 吞键仍占位（内联查找待后续模块，见下方更正）
- ~~**Ctrl+Shift+V 仅文本粘贴仍未接通**~~ → 已接通（2026-11-04 m1.4 尾项：事件/右键/快捷键共用粘贴管线，气泡可转纯文本；测试+浏览器冒烟过）
- **更正**：Ctrl+F 内联查找不在 m1.6 任务清单（导航表 m1.5 行「Ctrl+F 面板=M1.6」指面板入口沿用）——真内联查找仍待后续模块排期
- m1.4 剩余：仅背景层 #86（settings 六键已预留，渲染+配置 UI 定案延后 m2.3）；结构 gating/粘贴气泡/IME 已清

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
- 2026-10-25 收口后反馈轮③–⑥（总账 #107–#114）：#107 九项（自动保存开关/图标切换/状态栏拖动/拖选抑制/禁拖拽/链接态失效/命令面板订阅/Ctrl+D 要点级/ErrorBoundary+dev:kill）；#108 退出可诊断性（panic hook+生命周期日志+日志落盘）；#109 旧数据修复+启动自愈（真机空白根因=null 条目/数字日期）；#110 dirty 单一所有者+激活门小窗+工具条 mousedown；#111 门去黑边+链接 mousedown+顶栏/状态栏重排+分段开关；#112 透明窗口圆角+门 420×380+状态栏模式圆点；#113 空白脱链+空要点 Enter 删行+激活打样级持久化；#114 点空白新增要点+链接 opener 作用域真正生效（CDP 真窗取证）。全部直推 dev，110 测试绿
- 2026-11-04 m1.4 尾项补齐（总账 #115，ADR `decisions/2026-11-04-m1.4-tail.md`）：粘贴气泡（立即插入保留格式+4 秒内转纯文本）/Ctrl+Shift+V/大段提示/图片 toast/右键统一管线；maxEntries 结构 gating；IME 合成态守卫；链接 scheme 白名单绑定 Link isAllowedUri（修死代码）；测试引入 jsdom；全仓 145 测试绿。状态层漂移修复：m1.4 口径/m1.5 重复段/m1.6 键数/§14 锚点/STATE 指针与「六文件」
- 2026-11-05 预览纸面结构 + 四项反馈修复（总账 #116/#117，ADR `decisions/2026-11-05-preview-paper-parity.md`）：主窗 min 960×640 + hydrated 串行；ResumeDoc.profile；新节点 pageHeader/basicField/photoSlot/skillGroup/column + entryHeader atom；duo 双栏；Plex Sans SC；printCSS A4 等比；三套模板切换真实生效；雷达去双层 aside + 响应式；大纲分区折叠。全仓 169 测试绿；浏览器冒烟通过；真窗窗口/字体/持久化待人工
