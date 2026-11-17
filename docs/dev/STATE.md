# FairLens 开发状态快照（STATE）

> **跨会话进度的唯一快照**。规则：①每模块收尾必须同步本文件与 `modules/README.md`（并入 DoD）；②只存指针与状态，**不复制字段/契约细节**——唯一事实源=`docs/01-技术开发文档.md` 与 `packages/shared/src/`，**禁止凭记忆引用字段名**；③新会话启动协议：**第 0 步读本文件「悬挂事项」节** → 读当前模块的 `modules/mX/mX.Y-*.md` → 读 docs/01 对应章节 → `git log --oneline -20` → 对齐开工；④**会话结束前必须更新「悬挂事项」节**（防上下文切换丢失，docs/01 §3.6）。

## 当前进度

| 项 | 状态 |
|---|---|
| 里程碑 | M1 进行中（6/8，m1.1 待过目）：**m1.1–m1.6 已收口**（m1.4 尾项 2026-11-04 补齐；m1.6=deb5d6a）；**2026-11-05 预览纸面结构/字体/雷达/大纲修复（#116/#117/#118）**；**2026-11-13 人工验收手册 + AI 读取契约（#119）+ 反馈六项（#120–#123）+ 单行命令栏/导出 PDF/归档/内联搜索（#124–#126）**；下一 m1.7 暂缓；M0 已收口（tag v0.1.0-m0） |
| 当前模块 | 预览纸面结构/反馈修复/命令栏已落地；**2026-11-17 命令栏回归修复（下拉 portal 化 + 右群组右对齐 + 搜索条定位）+ UIUX 契约轮（#127：结构编辑/空白点击全量/浮层契约/去假象）**；验收手册见 `acceptance/M1.md`（§12.7–§13.7 为新增待验项）；**2026-11-17 二次打磨：退出项移除/示例胶囊/底栏字体/模板按钮/文案清理**；**m5.1 导出 PDF 与归档已提前落地（#125）**，Word/批注版/长图/HTML 仍待 M5；下一 **m1.7 导入管线**（用户指示暂缓；LLM 接入点留 m3.5）；m1.1 打样待用户最终过目 |
| 当前分支 | dev=58f1525（2026-11-17 #127 三次打磨：底栏 [?] 快捷键；其前 4749f71=二次打磨、340e4bf=UIUX 契约轮、b3468f3=命令栏回归修复、4ed17b4=#124–#126）；`feat/m1-ux-contract`、`feat/m1-ui-polish` 已删。main=e3956fe（按流程 M1 整体收口时合并，落后属预期）。历史：m1.6 squash=09ecebf（+8353bcd 归因更正/deb5d6a 反馈轮四项），feat/m1.6 已删；#107–#123 反馈修复与文档同步直推 dev |
| 已落地 | 编辑器核心全通：真 Tiptap 画布/3 套模板（切换真实生效）/Ctrl+K 面板/快捷键全集/悬浮工具条(悬停门控)/右键菜单/侧栏拖拽调宽/缩放三态/激活门/**m1.6 持久层**（packages/core 首落/SQLite 迁移/自动保存防抖+失焦保存/关闭保护双模式/快照四态 diff+双栏对比+回滚/settings 六键预留）+ **tauri 启动入口**（`pnpm tauri:dev`）与**窗口操作权限修复**（三键/任务栏关闭可用）+ **m1.4 尾项**（粘贴气泡/仅文本 Ctrl+Shift+V/大段提示/图片 toast/链接白名单/maxEntries gating/IME 守卫）+ **预览纸面结构**（ResumeDoc.profile/页头/basicFields/skills/照片槽占位/条目三段行/duo 双栏/Plex Sans SC/A4 等比 printCSS）+ **大纲完整树**（标题跟随画布 section.title/全部分区/字段与技能组叶节点）+ **2026-11-13 反馈六项**（dirty 基线比较/粘贴块转要点/长文提示/分区自由化+增删命令/页头附加字段/日期自由文本/要点 Tab 缩进 0–2）——实录见 `modules/m1/` 八文件；**#106–#114 反馈修复见文末流程增补**；**2026-11-13 命令栏/导出/搜索（#124–#126）+ 2026-11-17 命令栏回归修复与 UIUX 契约轮（#127：结构编辑/空白点击/浮层契约/去假象）** |
| 未落地 | m1.7–m1.8（m1.7 暂缓）；**m1.4 背景层 #86**（定案延后 m2.3）；packages/core 后续（**diff-apply** 等 M3）与 prompts（M1–M3）· lease 实现（M2）· keygen issue 等（M2/M5）。**AI 读取层已就位**（#119：`packages/core/doc-projection.ts` 投影/编解码/token 估算/作用域切片）——M3/M4 直接消费，勿重造。**分区拖拽排序**未做（顺序=文档顺序，新增追加末尾）；**Word 生成器必须读 bullet.depth**（m5.1）；下拉键盘方向键导航（Tab 可达，属可访问性增强，未排期）；**命令面板/悬浮工具条标题仍硬编码中文**（i18n 清理下一轮；canvas-menu 已迁） |

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
- ~~docs/01 §1.7 标题吞正文~~ → 已按**最小改动**修复（2026-11-13）：仅在「范围铁律（v1 明确不做）」后断行，正文另起一段，**文字未改**。若你认为范围铁律应另设小节（改动更大），告诉我即可调整
- ~~m1.6 策略 A/B~~ → 已定案 A（装 Rust 全量），见 decisions/
- ~~检查单第 4 项是否固化 §3.6~~ → 已固化（§3.6 规则① 勾选一致性核对）
- ~~AGENTS.md 是否入库~~ → **已定案（2026-11-04）：保持不入库**（维持 .gitignore；SOP 为个人工作流文件，不随仓库分发）

**待人工验收**（自动化无法覆盖；按影响面降序；2026-11-13 核对收敛，与「已自动确认」重叠项已移出/合并）

> **操作路径与判定标准全部在 [`acceptance/M1.md`](acceptance/M1.md)**（每条四段：前提/步骤/判定/取证；勾选表在文末）。本节的编号与手册编号一一对应。
> 交接提示：新会话/新终端先 `pnpm dev:kill` 再 `pnpm tauri:dev`（清残留 vite/fairlens.exe）；环境取证方法（CDP）与 capabilities 重编陷阱见 `notes/env-quirks.md`。

1. **IME 真机（最高风险）**：中文输入法组合期间 Enter/Ctrl+快捷键不误触（仅单测守卫覆盖，需真实输入法）→ 手册 §1
2. **关闭保护真窗**：手动模式编辑后关窗应弹「保存/不保存/取消」（逻辑与单测已过，真窗待点）——不通过=丢数据风险 → 手册 §2
3. **窗口形态真窗（#116 + #112）**：从 1280×800 拖边向内应能到 960×640（不再被 1152×720 夹住）；激活启动不被顶在最小尺寸；门口 420×380 圆角/无黑边、主窗圆角、最大化后四角应变直角（最大化时拖边不缩放属系统行为）→ 手册 §3
4. **持久化**：编辑→关窗→重开数据仍在；`fairlens_dev.db` 五表齐、`doc_json` 含刚写的字符串 → 手册 §4
5. **快照全流程**：命令面板保存快照 → 改内容 → diff 四态显示 → 回滚 → 内容回来 → Ctrl+Z 不撤掉回滚 → 手册 §5
6. **链接：真实 Ctrl+点击**——CDP 真窗实测 `opener.open_url` 已成功（"Not allowed to open url" 已消除），但完整键组合（cua.keypress+click / 合成 MouseEvent 均无法还原）仍未人工验证；失败会弹 toast → 手册 §6
7. **m1.4 尾项真窗**：富文本粘贴气泡定位/观感 →「仅文本」原地替换；Ctrl+Shift+V 纯文本；大段粘贴提示；图片忽略 toast；条目上限 toast（浏览器冒烟已过，见 m1.4 MD）→ 手册 §7
8. **预览纸面真窗（#117）**：Plex Sans SC 中文渲染、页头/条目三段行/duo 侧栏/照片虚线槽观感；三套模板切换；页头与条目头 MetaDialog 编辑后 SQLite 持久化 → 手册 §8
9. **雷达/大纲真窗**：右栏 220/296 两档雷达完整可见；大纲分区折叠面板收起再开仍保留；大纲标题跟随画布改名、基本信息字段/技能组叶节点可点击定位 → 手册 §9
10. **项目级三项**：m1.1 打样最终过目 / GitHub 分支保护三步 / CI 首跑四 job 全绿 → 手册 §10
11. **编辑器工具条真窗**：工具条 B/I/链接点击 / 点纸面空白新增要点 / 空要点 Enter 删行（浏览器与单测均已过）；顺手验链接文字首尾空格不延长下划线（暂未单独成节，可并入手册 §7 顺手做）
12. **命令栏下拉与零位移（#124 回归，2026-11-17）**：五个下拉完整可见/跟随窗口缩放/Esc 可关/下拉项真的能点；切自动保存时菜单、撤销、模板像素级不动，960×640 下窗口三键完整 → 手册 §12.7/§12.8（浏览器已程序化验证，真窗待点）
13. **UIUX 契约轮（#127，2026-11-17）**：结构编辑（新增/删除/复制条目、空分区可用）、空白点击全量、结构锚点防误删、保存失败可见可重试+关窗拦截、浮层关闭/焦点、示例清空与去假象 → 手册 §13（浏览器已程序化验证关键路径，真窗待点；保存失败需只读目录造障）
14. **UIUX 二次打磨 + 底栏帮助入口（#127 追加，2026-11-17）**：文件菜单无退出项、✕/Alt+F4 走保护框；示例胶囊不占布局不压搜索条；底栏中文 UI 体/数字 mono；模板按钮图标+名称；无 tplNote 等废话 → 手册 §13.6/§13.7（浏览器已验；底栏右侧现为 `[?] 快捷键` 按钮，点击开速查表）

**已自动确认（不再列为待办）**：#107 大纲拖拽不崩（根因 #109 已修）/ #109 编辑器空白修复 / #111 激活门无黑边 / #112 门 420×380 圆角 / #113 激活持久化 / #114 链接作用域与点空白新增（浏览器+CDP）/ m1.4 尾项浏览器冒烟（气泡/仅文本无 mark/Ctrl+Shift+V/大段/图片/链接白名单/上限 toast）/ 2026-11-05 预览纸面浏览器冒烟（三套模板切换/页头与条目头编辑/雷达 220px/大纲折叠/字体 computed style）/ 2026-11-05 大纲完整树浏览器冒烟（标题跟随画布改名/字段与技能叶定位/基本信息折叠/全部分区显示）/ 2026-11-05 旧 SQLite 简历真窗（CDP）：空基本信息仍显示、空白页头占位、Plex 字体 / 2026-11-05 主窗圆角与激活重启免门（真机确认）

**占位清理账**（接手人必读）
- ~~mockup store `dirty` 占位~~（m1.6 已接管：editor-doc store；mockup.dirty 字段已删）
- `edit.entry-duplicate` 占位命令已消除（#107：命令面板同名命令=复制当前要点，真实现）；Ctrl+F 已落地（#126 内联查找，2026-11-17 修搜索条遮挡命令栏）
- ~~**Ctrl+Shift+V 仅文本粘贴仍未接通**~~ → 已接通（2026-11-04 m1.4 尾项：事件/右键/快捷键共用粘贴管线，气泡可转纯文本；测试+浏览器冒烟过）
- **Ctrl+F**：已落地（#126：`findMatches` 纯函数 + Decoration 高亮 + SearchBar；2026-11-17 修搜索条定位到画布顶部，不再遮挡命令栏导出按钮）
- m1.4 剩余：实现层面仅背景层 #86（settings 六键已预留，渲染+配置 UI 定案延后 m2.3）；结构 gating/粘贴气泡/IME 已清；真窗尾项需人工验收（见待人工第 7 项）

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
- 2026-11-05 预览纸面结构 + 四项反馈修复（总账 #116/#117，ADR `decisions/2026-11-05-preview-paper-parity.md`）：主窗 min 960×640 + hydrated 串行；ResumeDoc.profile；新节点 pageHeader/basicField/photoSlot/skillGroup/column + entryHeader atom；duo 双栏；Plex Sans SC；printCSS A4 等比；三套模板切换真实生效；雷达去双层 aside + 响应式；大纲分区折叠。全仓 176 测试绿；浏览器冒烟通过；真窗窗口/字体/持久化待人工
- 2026-11-05 大纲标题/完整树（总账 #118）：标题跟随画布 `section.title`（空标题回落类型名）；全部分区显示（含空基本信息）；basicFields/skillGroups 只读叶节点；仅条目可拖拽；关联修 CanvasEditor 点 h3 误判空白
- 2026-11-05 文档全量同步（审计）：修复 m1.1 重复段、m1.2/m1.3 空重复标题与计数/主题/栏宽、m1.4 雷达尺寸、m1.5 排版、m1.6 旧大纲规则注记；docs/01 附录 E 条数/#81 修订注记/§12.2 字体分区/§5.3 前缀/Ctrl+F 口径；README/STATE/导航表/02 手册同步。无代码改动，176 测试保持绿
- 2026-11-13 核对状态层（命令 0，git 零漂移）；**发现并修复文档缺陷 4 类**（fix/docs-integrity）：①docs/01 §4.7 标题行误吞 ```ts 围栏 → 导致 §4.8 被吞进代码块（唯一事实源 P1）；②§1 编号重复（§1.6 出现两次）→ 非功能需求改 §1.8；③附录 E 条目错位与拼接（#90/#91 腰斩拼接、#94 错位在 #112–#113 之间、#97/#98 与 #100/#101 倒序）→ 仅调行序与拼接，文字编号未改；④m1.5 MD 引用不存在的 §5.10/§5.5 → 改 §5.6（反编造铁律的失效锚点）。同时 STATE dev 指针 3503f5a→eea7566、待人工验收 11 条按影响面重排为 10 条并清掉与「已自动确认」的重叠项、导航表 m1.1/m1.3/m1.5 补注实现提交 hash。**复核补充**：源码注释里同一批失效锚点（shortcuts/command-registry/EditorMockup/evaluation.ts）一并修掉——上次只修 MD 漏了 TS 注释
- 2026-11-13 人工验收手册 + AI 读取契约（总账 #119，ADR `decisions/2026-11-13-ai-read-contract.md`）：①新增 `acceptance/M1.md`——11 条验收逐步写成「前提/步骤/判定/取证」四段，文案全部取自 zh-CN.ts（脚本校验 44 处 UI 串命中）；②`packages/core/doc-projection.ts` 新模块（投影/无损 Markdown 编解码/token 混合估算×1.2/作用域切片），39 新单测；③`formatDateRange` 上移 core（消除两份实现）；④不引模型侧工具调用、回写=blockId 作用域 patch、diff-apply 留 M3——理由全在 ADR；⑤传播：m3.3/m3.4/m4.3 模块 MD + 总账 + STATE + README 条数 + §14-M1 补测条目。全仓 215 测试绿
- 2026-11-13 单行命令栏 + 导出 PDF/归档 + 内联搜索（总账 #124–#126，ADR `decisions/2026-11-13-command-bar.md`）：
  - **#124 命令栏**：titlebar(42)+toolbar(44) 合并为 `.cmdbar`(44)，净省 42px；四菜单（menu-model.ts 纯函数，未实现项 disabled+badge）；模板改下拉、激活状态收圆点；保存按钮仅手动模式显形；自动保存开关常驻（与设置同步）；状态栏字数/要点统计（`core/doc-stats.ts`）。**Ribbon 否决**（空间+权限矩阵双冲突）
  - **#125 导出**：PDF 走 WebView2 `ICoreWebView2_7::PrintToPdf` **直写文件**（`Window::print()` 在 Windows 上只是 `eval("window.print()")` 会弹打印对话框，不符合"下载到本地"）；新增 `tauri-plugin-dialog`（唯一插件）+ `webview2-com`；自建命令 `export_pdf`/`save_archive`；`print-css/print-shell.css` 隐藏 chrome（不进 base.ts）；归档 `reviewSessions`/`patchLog` 空数组（两表零写入方，如实反映）
  - **#126 内联搜索**：`findMatches` 纯函数（不跨 bullet）+ Decoration 高亮（不入撤销栈）+ SearchBar（Enter/Shift+Enter/Esc/IME）
  - 验证：294 测试绿（+31）/ lint / typecheck / contract 零漂移 / `cargo check` 通过 / capabilities 生成物含 `dialog:allow-save`+`opener:allow-open-path`
- 2026-11-13 用户真机反馈六项（总账 #120–#123，ADR `decisions/2026-11-13-schema-relax.md`）：
  - **#120 三个 bug**：①dirty 从「编辑过就脏」的闩锁改为与 `savedDoc` 基线比较（`packages/core/doc-equality.ts` 的 `sameDoc`，键序无关）——修「新建要点再删掉仍弹三键框」；`discardPendingChanges` 同时把文档复位；②粘贴的多块富文本逐块转 `flBullet` 并各生成 blockId——修「粘贴段落点不进去 + 重开丢失」（根因：`flEntry` 只收 bullet，外部 `<p>` 落 doc 根被 `pmToResumeDoc` 静默丢弃），同时修掉「粘贴节点无 blockId → 每次序列化重新生成」；③长文 toast 提前到区间判空之前——修「Ctrl+V 长文不弹提示」（区间推导改为粘贴前后 selection，兼容 ReplaceAroundStep）
  - **#121 分区自由化**：`Section.type` 放开为自由字符串；`flSection` 增 `insertSection`/`deleteSection`/`addBasicField`；命令面板「新增分区…」+`SectionDialog`、「删除当前分区」（至少留一个）；大纲显示名 `outlineSectionLabel`（自定义 type 回落原文，不再错显「基本信息」）；自定义分区不限条数
  - **#122 页头字段与日期**：`Profile.fields?: BasicField[]`（三项固定保留，模板/printCSS 依赖）+ `ProfileFieldsDialog`（动态增删改）；`BasicFieldView` 加编辑/新增/删除；`Entry.start/end` 改自由文本（'2022'/'大三'/'2022年9月' 均合法，仅两端都是 YYYY.MM 才校验先后），移除 `dateInvalid`
  - **#123 层级缩进**：`Bullet.depth?: 0|1|2`（0 不落库）；Tab/Shift+Tab 夹取（抽 `bullet-depth.ts` 纯函数 + 6 单测，始终 preventDefault）；print-css 加 data-depth 缩进（内容排版，导出保留）；snapshot-diff 的 bullet payload 纳入 depth；投影每级两空格
  - **样式落点教训（用户拒绝一次编辑后自查）**：`print-css/*` 是纸面内容+导出样式源，**屏幕专用 chrome（字段按钮组/页头附加字段）一律不进**；屏内控件样式落 `mockup.css`，页头附加字段复用既有 `.fl-head .contact` 规则、零新 CSS
  - 验证：263 测试绿（+48）；lint/typecheck 绿；print-css 仅 data-depth 内容排版规则
- 2026-11-17 命令栏回归修复（用户直报两项 + 实测发现一项；ADR 2026-11-13-command-bar §9 修复记录）：
  - **①切自动保存模板左右移动**：根因=保存按钮按 `!autosave` 条件渲染 + 两段 `flex:1 1 8px` 伸缩空白平分空出的 64px。修法=伸缩区减为一段并移到编辑区群组之后，右群组 `.cmd-right{margin-left:auto}` 整体贴右。浏览器实测切换前后 template.left=275 / icons=212 / menus=46 / export=794 全部不变，只有保存按钮在开关左侧出现/消失
  - **②命令栏下拉看不到**：根因=`.cmdbar{overflow:hidden}` 把 `absolute; top:calc(100%+4px)` 的下拉从 32px 处裁到只剩 12px。修法=新增 `app/dropdown.tsx`（portal 到 body + `position:fixed`），纯函数 `placeDropdown` 负责左右对齐/视口夹取/下方不足翻转向上 + 8 单测；`resize`/`scroll` 重定位；`Dropdown` 统一接管点外关闭与 Esc。**连带必改**：dismiss 判定必须为「锚点 ∪ 下拉节点」，否则点下拉项先卸载再丢 click
  - **③内联搜索条遮挡命令栏（实测发现）**：`.editor-mock` 无定位上下文 → `SearchBar` 的 `top:10px` 按视口落到 y=10，压住「导出」（点击被 `search-count` 拦截）。修法=`.editor-mock{position:relative}`，搜索条回到 y=54
  - 兜底：`.cmd-template` 改唯一可收缩项（`flex:0 1 auto; min-width:0` + 值文本省略号），960px 下不会把窗口三键挤出视口；删除 `.cmd-drop-left/right` 死 CSS
  - 验证：302 测试绿（+8）/ lint / typecheck / contract 零漂移；浏览器 960×640 程序化实测（五个下拉可见、模板零位移、下拉项点击生效、Esc 全关）；真窗待人工（手册 §12.7/§12.8）

- 2026-11-17 UIUX 交互契约轮（#127，ADR `decisions/2026-11-17-ux-contract.md`；用户要求"以 ZCode 为参照但不照搬，逐项讨论"）：
  - **审计（三份只读 + 复核）**：P0 六项（新分区文字丢失/行首 Backspace 删页头/假保存/失败不拦关窗/无条目增删/空白点击过窄）+ P1 五类（浮层五种退出/无焦点归还/快捷键乱触发/假评估面板/假分页/里程碑徽标进界面/搜索条盖右栏）
  - **R1 浮层契约**：`app/Overlay.tsx`（点遮罩+Esc+焦点归还+焦点陷阱+`data-overlay-open`）迁移 7 处浮层；CloseGuard 例外（`closeOnBackdrop=false`，Esc=取消）
  - **R2 键盘契约**：Ctrl+K 恒命令面板、链接改 Ctrl+Shift+K；`shouldIgnoreShortcut` 守卫；`?` 快捷键速查（`shortcut-list.ts` 单一源）
  - **R3 不做假按钮**：评估面板空态、删假分页、菜单徽标「未开放」+人话（修订 #124⑥）、状态栏/简历库去里程碑与"打样"、右栏默认关闭并持久化、照片槽点击说明
  - **P0/结构**：`insertSection` 改插合法空条目；`insertEntry/deleteEntry/duplicateEntry` + 分区标题「添加条目」/条目头「⋯」/命令面板/右键；`atom-guard` 拦结构锚点删除（7 单测）；`pickClickTarget` 空白点击全量（9 单测）；`flush/saveNow` 返回 `{ok}`，失败 toast+状态栏重试+`save-error` 关窗拦截
  - **契约**：`Entry.org` → `min(1).optional()`（新建条目可先空着；空串不落库）
  - **示例与打磨**：`SAMPLE_RESUME_TITLE` 横幅 + 一键清空为空白简历（先自动快照，`blank-doc.ts` 4 单测）；Toast 不挡点击/按字数计时/去重；页头字段 Enter；删除分区应用内确认；导出下拉补归档；视图菜单按真实缩放打勾；粘贴气泡 4s→8s
  - 验证：**325 测试绿（+23）** / lint / typecheck / contract 零漂移 / vite build；浏览器 960×640 程序化实测（新增条目→输入→状态栏 6 条要点、空分区点空白建条目、下拉徽标「未开放」、导出下拉含归档、条目⋯删除+toast、Ctrl+K 面板 13 条命令、设置默认"通用"+Esc关、`?` 速查 15 条、示范清空后 1 分区 0 条目、搜索条在 `.m-center` top=54）
  - 真窗待人工：手册 §13（含只读目录造保存失败）；遗留：命令面板/悬浮工具条标题 i18n 未迁（下一轮）
- 2026-11-17 UIUX 二次打磨（#127 追加，用户二轮直报；ADR §8）：
  - **退出项**：文件菜单移除「关闭窗口」（易被误读为关下拉）；退出只保留标题栏 ✕ 与 Alt+F4，✕ tooltip「退出 FairLens（Alt+F4）」；速查表补 Alt+F4
  - **示例**：30px 横幅（且被搜索条压住）→ 画布左上悬浮胶囊「示例简历 · 清空」，不占布局、不重叠；说明句删除
  - **字体**：底栏去 `mono` 类——中文走 Plex Sans SC 11.5px，仅数字（tabular）与快捷键提示走 Plex Mono；模式词/状态词分层着色；模板按钮「模板：」→ `LayoutTemplate` 图标 + 模板名（aria「切换模板：…」）
  - **废话**：删左栏 tplNote；空态「暂无内容」；简历库/评估/设置/清空回执/导出 hint 缩短；清死键（pagebreak/m1/unactivated/mockOnly）
  - 验证：326 测试绿 / lint / typecheck / contract / build；浏览器 960×640 实测（菜单无退出项、胶囊 (233,54) 与搜索条共存、底栏 computed font=Plex Sans/数字=Plex Mono、模板按钮仅"经典单栏"）
- 2026-11-17 底栏帮助入口（#127 三次打磨，ADR §9）：
  - 底栏右下「Ctrl+K 命令面板 · ? 快捷键」→ 可点击 `[?] 快捷键` 按钮（`statusbar-help`）：根因=`.statusbar-hint` 子选择器写回 mono + Plex Mono 无 CJK 字形（汉字落系统等宽回退）+ 10.5px/opacity 使 light 对比度约 3.3:1
  - 键帽 `?` 走 mono、中文标签走 UI 体 11px，点击打开速查表；`?` 键补 IME 守卫；顺修 FloatingToolbar 链接按钮 title（Ctrl+K→Ctrl+Shift+K）
  - 验证：326 测试绿 / lint / typecheck / build；浏览器点击打开速查表、截图确认键帽与中文 UI 体
