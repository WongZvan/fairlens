# FairLens 开发状态快照（STATE）

> **跨会话进度的唯一快照**。规则：①每模块收尾必须同步本文件与 `modules/README.md`（并入 DoD）；②只存指针与状态，**不复制字段/契约细节**——唯一事实源=`docs/01-技术开发文档.md` 与 `packages/shared/src/`，**禁止凭记忆引用字段名**；③新会话启动协议：**第 0 步读本文件「悬挂事项」节** → 读当前模块的 `modules/mX/mX.Y-*.md` → 读 docs/01 对应章节 → `git log --oneline -20` → 对齐开工；④**会话结束前必须更新「悬挂事项」节**（防上下文切换丢失，docs/01 §3.6）。

## 当前进度

| 项 | 状态 |
|---|---|
| 里程碑 | M1 进行中（6/8，m1.1 待过目）：**m1.1–m1.6 已收口**（m1.4 尾项 2026-11-04 补齐；m1.6=deb5d6a）；**2026-11-05 预览纸面结构/字体/雷达/大纲修复（#116/#117/#118）**；**2026-11-13 人工验收手册 + AI 读取契约（#119）+ 反馈六项（#120–#123）+ 单行命令栏/导出 PDF/归档/内联搜索（#124–#126）**；m1.8 已实现、待真窗收口（#129 顺序前置；m1.7 后置暂缓）；M0 已收口（tag v0.1.0-m0） |
| 当前模块 | 预览纸面结构/反馈修复/命令栏已落地；**2026-11-17 命令栏回归修复（下拉 portal 化 + 右群组右对齐 + 搜索条定位）+ UIUX 契约轮（#127：结构编辑/空白点击全量/浮层契约/去假象）**；验收手册见 `acceptance/M1.md`（§12.7–§13.7 为新增待验项）；**2026-11-17 二次打磨：退出项移除/示例胶囊/底栏字体/模板按钮/文案清理**；**m5.1 导出 PDF 与归档已提前落地（#125）**，Word/批注版/长图/HTML 仍待 M5；**m1.8 已实现（含复核修复）**，真窗 §14 待验；m1.7 后置暂缓（LLM 接入点留 m3.5）；m1.1 打样待用户最终过目 |
| 当前分支 | **HEAD=`<以 git log -1 为准>` → 最近 squash=`9174ce2`（#129 清空快照阶段保护）→ 上一 squash=`02a4e08`（关窗等待/失败回滚）→ `7cc56a9`（清空落盘竞态）→ `5264a5c`（四轮）→ `5d03eae`（三轮）→ `662102f`（二轮）→ `7a99b3b`（复核一轮：并发/初始化/失败/身份）→ `8e41823`（m1.8 业务闭环）→ `69845e0`（#128 首用闭环）→ `dd23b59`（E2E exec 修复，CI 首绿）→ `2a4bd6f`（port 绑定尝试）→ `382fb25`（CI 门禁补齐）→ `4b3d943`（文档核对）→ 代码基线=`cceb793`**（#127 四次打磨）。**指针约定**：本表写在提交里，故 HEAD 恒比表内所写 hash 多一个回填提交——核对时先跑 `git log -1`，不要把表内 hash 当 HEAD 追。历史：58f1525=三次打磨、4749f71=二次打磨、340e4bf=UIUX 契约轮、b3468f3=命令栏回归修复、4ed17b4=#124–#126。`fix/m1-doc-sync`、`fix/m0-ci-gates`、`fix/m0-e2e-host`、`fix/m0-e2e-exec`、`feat/m1-ux-contract`、`feat/m1-ui-polish` 均已删。main=e3956fe（按流程 M1 整体收口时合并，落后属预期）。历史：m1.6 squash=09ecebf（+8353bcd 归因更正/deb5d6a 反馈轮四项），feat/m1.6 已删；#107–#123 反馈修复与文档同步直推 dev |
| 已落地 | 编辑器核心全通：真 Tiptap 画布/3 套模板（切换真实生效）/Ctrl+K 面板/快捷键全集/悬浮工具条(悬停门控)/右键菜单/侧栏拖拽调宽/缩放三态/激活门/**m1.6 持久层**（packages/core 首落/SQLite 迁移/自动保存防抖+失焦保存/关闭保护双模式/快照四态 diff+双栏对比+回滚/settings 六键预留）+ **tauri 启动入口**（`pnpm tauri:dev`）与**窗口操作权限修复**（三键/任务栏关闭可用）+ **m1.4 尾项**（粘贴气泡/仅文本 Ctrl+Shift+V/大段提示/图片 toast/链接白名单/maxEntries gating/IME 守卫）+ **预览纸面结构**（ResumeDoc.profile/页头/basicFields/skills/照片槽占位/条目三段行/duo 双栏/Plex Sans SC/A4 等比 printCSS）+ **大纲完整树**（标题跟随画布 section.title/全部分区/字段与技能组叶节点）+ **2026-11-13 反馈六项**（dirty 基线比较/粘贴块转要点/长文提示/分区自由化+增删命令/页头附加字段/日期自由文本/要点 Tab 缩进 0–2）——实录见 `modules/m1/` 八文件；**#106–#114 反馈修复见文末流程增补**；**2026-11-13 命令栏/导出/搜索（#124–#126）+ 2026-11-17 命令栏回归修复与 UIUX 契约轮（#127：结构编辑/空白点击/浮层契约/去假象）** |
| 未落地 | **m1.8 已实现并合入 dev（8e41823），真窗 §14 待验**；m1.7 后置暂缓；**m1.4 背景层 #86**（定案延后 m2.3）；packages/core 后续（**diff-apply** 等 M3）与 prompts（M1–M3）· lease 实现（M2）· keygen issue 等（M2/M5）。**AI 读取层已就位**（#119：`packages/core/doc-projection.ts` 投影/编解码/token 估算/作用域切片）——M3/M4 直接消费，勿重造。**分区拖拽排序**未做（顺序=文档顺序，新增追加末尾）；**Word 生成器必须读 bullet.depth**（m5.1）；下拉键盘方向键导航（Tab 可达，属可访问性增强，未排期）；**命令面板/悬浮工具条标题仍硬编码中文**（i18n 清理下一轮；canvas-menu 已迁） |

## 环境实录（跨会话必知，细节见 notes/）

- **Rust 已装**（1.99.1，2026-10-25 发现——此前实录过时）；cargo 首拉走 `~/.cargo/config.toml` proxy=127.0.0.1:7897（系统代理 2334 已死会被 libcurl 拾取）；tauri-plugin-sql 已接入（迁移 v1=附录 B DDL）
- **tauri dev 中断会残留进程**（Ctrl+C/关终端后 `fairlens.exe` 与 vite 可能存活）→ 二启动报 `Port 1420 already in use` 但仍拉窗；先跑 `pnpm dev:kill`（清 1420 端口+fairlens.exe）再启动（`tauri:dev` 已内置前置清理）
- **窗口圆角=透明窗口+CSS**（#112）：Win10 无原生窗口圆角，依赖 `transparent:true`+`noRedirectionBitmap:true`；改 window 配置（tauri.conf.json）必须重编（见 `Compiling fairlens`），仅热更前端无效
- git 本地代理=7897（全局 2334 失效，会间歇掉线，掉线时本地提交不丢、恢复后推送）；npm registry 直连（~/.npmrc 死代理已删，有备份）
- **2026-11-21 网络实录**：registry.npmjs.org 与本地代理同时不可达，`pnpm add` 用**一次性** `--registry=https://registry.npmmirror.com` 完成（未改任何配置文件；lockfile 无镜像 URL，仅 integrity）。Playwright 浏览器用 `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright` 安装。这两条只在网络挂掉时用
- pnpm 11 构建许可=pnpm-workspace.yaml `allowBuilds`；契约校验已做 CRLF 归一；.gitattributes 统一 LF；`@ibm/plex-sans-sc` postinstall 仅 telemetry → `allowBuilds: false`（字体已随包，不执行上报脚本）
- 分支保护待用户在 GitHub 开启（CI 已就绪；2026-11-21 起为六 job，需勾 `coverage` 与 `e2e`）
- 真窗取证=CDP（`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` + Runtime.evaluate）；capabilities 改动须强制重编并核对生成物 `out/capabilities.json`——细节见 `notes/env-quirks.md`
- 测试激活码：`FL-2026-Q4XY-8F3K`（格式校验态；真验签=M2；#113 起打样态激活记忆存 settings.license，重开免门）

## 交接卡（新会话第一屏；2026-11-18 核对同步后写）

> 新会话按 AGENTS.md §4 启动协议：读本文件「悬挂事项」→ 当前模块 MD → docs/01 对应章节 → `git log --oneline -20`。以下为省一次考古的速读。

| 项 | 值 |
|---|---|
| 代码基线 | `dev=9174ce2`（m1.8 + 清空快照阶段保护）；#127 代码基线=`cceb793`；**工作区干净** |
| 当前分支 | `dev`（`feat/m1.8-library` 已 squash 合并并删除） |
| 测试基线 | **378 全绿**（50 文件）；覆盖率四包达标（core 96.27 / shared 100 / keygen 93.84 / lease 100 行）；lint / typecheck / contract 零漂移 / build / E2E **9 条**全过 |
| CI 门禁 | 六 job：`lint` / `typecheck` / `test` / `coverage` / `contract-zero-drift` / `e2e`（全部 actions 已固定 SHA）；**2026-11-21 首绿**（run 44884436909 @ dd23b59） |
| 唯一事实源 | `docs/01-技术开发文档.md`（附录 E 总账 **129 条**）+ `packages/shared/src/`（zod 契约）。**引用字段名前去读源** |
| 下一步 | **① m1.8 真窗验收**（`acceptance/M1.md §14.1–§14.6`，含 SQLite 四表级联夹具）→ ② **M1 收口证据**：§1–§13.10 真窗/持久化 → ③ m1.7 导入（后置暂缓） |
| 不要做 | 不要把 `dev` 推成 `main`（M1 整体收口才合并）；不要改 `AGENTS.md` 入 git；不要凭记忆引用字段名 |
| 启动命令 | `pnpm dev:kill` → `pnpm tauri:dev`（清残留 vite/fairlens.exe）；浏览器调试用 `pnpm dev` |

**#127 四轮打磨的一句话总结**（本轮全部工作）：UIUX 契约轮（浮层/键盘/去假象 + 结构编辑 + 保存失败拦截）→ 二次（退出项移除/示例胶囊/底栏字体/模板按钮/删废话）→ 三次（底栏帮助入口改键帽）→ 四次（只留 `?`、下拉箭头随悬停零位移）。全部已 squash 到 `dev` 并推送。

## 悬挂事项（会话切换前必更新；新会话第 0 步先读此处）

**待用户决策**（当前 0 项）
- ~~m1.8 库页预览待过目~~ → **已放行（2026-11-23）**：用户明确「可以开动 m1.8 了」，ADR §4 记录；视觉复核留在验收 §14.0
- ~~docs/01 §1.7 标题吞正文~~ → 已按**最小改动**修复（2026-11-13）：仅在「范围铁律（v1 明确不做）」后断行，正文另起一段，**文字未改**。若你认为范围铁律应另设小节（改动更大），告诉我即可调整
- ~~m1.6 策略 A/B~~ → 已定案 A（装 Rust 全量），见 decisions/
- ~~检查单第 4 项是否固化 §3.6~~ → 已固化（§3.6 规则① 勾选一致性核对）
- ~~AGENTS.md 是否入库~~ → **已定案（2026-11-04）：保持不入库**（维持 .gitignore；SOP 为个人工作流文件，不随仓库分发）

**待人工验收**（自动化无法覆盖；按影响面降序；2026-11-13 核对收敛，与「已自动确认」重叠项已移出/合并）

> **2026-11-23 更新**：m1.8 §14 已真窗验收通过（见第 16 项）。遗留一个 P3 观察：旧库中**同名**简历在卡片上文字相同、视觉不可辨（新建时有标题去重，旧数据不去重）；操作可用（`aria-label`/列表顺序区分），是否加旧数据去重待定。

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
10. **项目级三项**：m1.1 打样最终过目 / GitHub 分支保护三步（2026-11-21 起需勾 **六个** checks：lint/typecheck/test/coverage/contract-zero-drift/e2e）/ CI 首跑六 job 全绿 → 手册 §10（`coverage` 与 `e2e` 为 2026-11-21 新增，首跑前分支保护列表里还没有这两项）
11. **编辑器工具条真窗**：工具条 B/I/链接点击 / 点纸面空白新增要点 / 空要点 Enter 删行（浏览器与单测均已过）；顺手验链接文字首尾空格不延长下划线（暂未单独成节，可并入手册 §7 顺手做）
12. **命令栏下拉与零位移（#124 回归，2026-11-17）**：五个下拉完整可见/跟随窗口缩放/Esc 可关/下拉项真的能点；切自动保存时菜单、撤销、模板像素级不动，960×640 下窗口三键完整 → 手册 §12.7/§12.8（浏览器已程序化验证，真窗待点）
13. **UIUX 契约轮（#127，2026-11-17）**：结构编辑（新增/删除/复制条目、空分区可用）、空白点击全量、结构锚点防误删、保存失败可见可重试+关窗拦截、浮层关闭/焦点、示例清空与去假象 → 手册 §13（浏览器已程序化验证关键路径，真窗待点；保存失败需只读目录造障）
14. **UIUX 二次/三次/四次打磨 + 底栏快捷键入口（#127 追加，2026-11-17）**：文件菜单无退出项、✕/Alt+F4 走保护框；示例胶囊不占布局不压搜索条；底栏中文 UI 体/数字 mono；模板按钮图标+名称；无 tplNote 等废话；**底栏右下只剩一个 `?` 键帽**（点击开速查表）；**模板/导出箭头 hover/聚焦/展开时原地淡入、零位移** → 手册 §13.6/§13.7/§13.8（浏览器已验；真窗待点，含键盘 Tab 聚焦的焦点环）
15. **首用闭环（#128，2026-11-21）**：清空示例后空「基本信息」可用 `添加字段`（常显入口）→ 填字段值；姓名未填时导出被拦；归档正文=当前画布；清空失败不谎报；库页底栏无编辑器状态 → 手册 §13.9/§13.10（浏览器 E2E 已过；真窗待点，含 SQLite 重开仍在、归档 JSON 内容核对）
16. ~~**m1.8 多份闭环（#129）** → **已验收（2026-11-23 真窗）**：§14.0–§14.6 全部 PASS（含 Alt+F4/WM_CLOSE 关窗保护、SQLite 四表级联 0/0/0、删光重启为空、旧库 A/B 与一次性回填）；证据见 acceptance/evidence/2026-11-23-m18/

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
- 2026-11-17 克制原则（#127 四次打磨，ADR §10）：
  - 底栏右下只留 `?` 键帽（去掉「快捷键」文字，按钮即键帽 22×20；点击开速查表）
  - 下拉触发器（模板/导出）箭头默认隐藏，hover/:focus-visible/aria-expanded 时原地淡入；箭头绝对定位在预留 padding 内 → 按钮宽度与文字零位移（浏览器 rect 实测一致）
  - 范围：只改下拉触发器；大纲树/搜索上下列/抽屉把手等功能性箭头保持常显
  - 验证：326 测试 / lint / typecheck / build；浏览器 hover 前后 rect 相同、展开后移开指针仍显示；截图对照
- 2026-11-18 交接前文档全量核对（`fix/m1-doc-sync`，零代码改动；ADR §11）：修 6 处漂移——①docs/01 附录 E 条数 126→127（含日期补 11-17）；②#127 总账条目缺 ⑭四次打磨 → 补；③§12.5 状态栏仍写「Ctrl+K 提示」+ 三/四次打磨归属混淆 → 分开；④README 状态行停在 11-05、总账条数 → 更新；⑤验收手册 §12.1/§12.8 仍写 `模板：经典单栏 ▾` 与里程碑徽标 → 改版式图标+「未开放」；⑥§13.8 排在 §13.7 之前 → 归位。另修导航表 m1.5「Ctrl+F 待后续」过时注记。**通用教训**：多轮打磨的收口 DoD 必须把「附录 E 条数 + 对应条目编号」当独立勾选项，否则只更 ADR/STATE、漏掉唯一事实源正文与账本
- 2026-11-21 CI 门禁补齐（`fix/m0-ci-gates`，ADR `decisions/2026-11-21-ci-gates-e2e.md`；外部审查 3 项 + 自查 4 项）：
  - **coverage**：`@vitest/coverage-v8` + `vitest.config.ts` 逐包 glob 阈值（行/函数/分支各 80%）；`projects` 加 `functions/*`；根脚本 `test:coverage`；CI 新增 `coverage` job。实测 core 96.27 / shared 100 / keygen 93.84 / lease 100（行）
  - **keygen CLI 重构**：顶层 `cli.ts`（37 行、含 `process.exit`、零覆盖）抽为 `run.ts` 的 `runCli(argv, deps)`；`cli.ts` 只留 4 行入口装配；+7 测试。**行为不变**，`keygen` 脚本不动
  - **lease 占位补测**：501 + `invalid-request` 断言，占位也受门禁管
  - **actions SHA pin**：checkout/setup-node/pnpm-action-setup 全部 40 位 SHA + 版本注释；顶层 `permissions: contents: read`；**修正 m0.1 MD 中「actions 版本 pin」的不实记录**
  - **Playwright**：`playwright.config.ts` + `e2e/smoke.spec.ts`（激活→编辑→切模板→保存，断言 `data-template` 与 `.toast`），本地 8.1s 通过；CI 新增 `e2e` job。**边界**：浏览器模式，不替代真窗人工验收
  - **STATE 指针根治**：改为「HEAD→最近 squash→代码基线」三层 + 明确「表内 hash 恒比 HEAD 少一个回填提交」的约定，不再每轮追 hash
  - **附带修复（缺陷直报即修）**：根 `pnpm build` 在 Windows 上一直空转——`--filter './packages/*'` 的单引号在 cmd.exe 下是字面量，pnpm 报 No projects matched；改双引号后恢复（CI 在 Linux 无感，故长期未暴露）。教训：跨平台 scripts 只用双引号，CI 绿不代表本地脚本可用
  - **CI 首跑复盘**：六 job 中只有 `e2e` 红（step 7 正好 181s = webServer 超时）。根因=`pnpm run dev -- --host …` 把 `--` 原样透传给 vite（本地日志 `vite "--" "--host" "127.0.0.1"`），参数不生效；Windows 的 localhost 恰好可用所以本地蒙混通过。修法=`command` 改 `pnpm --filter @fairlens/desktop exec vite --host 127.0.0.1`（exec 直接透传 argv，且显式绑 IPv4）。**2026-11-21 首绿：run 44884436909 @ dd23b59，六 job 全过**
  - 验证：**334 测试 / 43 文件全绿**；lint / typecheck / contract 零漂移 / build / e2e 1 passed；CI YAML 六 job 且全部 SHA 已校验
  - **通用教训**：①规格里写的门禁 ≠ 仓库里真实存在的门禁，收口应逐条对照 §14 而不是只看「测试全绿」；②文档写「已完成」的纪律项要能指到具体配置（pin 要看到 SHA），否则是自述而非证据
- 2026-11-21 首用闭环（#128，ADR `decisions/2026-11-21-first-use.md`；codex 首用走查：3 个阻断 + 2 个阶段问题 + 2 项旧缺陷）：
  - **空白基本信息可写**：`type='basic'` 分区标题按钮改为「添加字段」（不再插「机构名称」条目）；`insertSection` 对 basic 只建 header；`addBasicField({sectionId,label})` 支持显式分区定位；空分区入口常显（`.is-empty`）
  - **姓名真实性**：`Profile.name` 放开为空串（T2 契约变更），空白简历 `name=''`；画布占位显示；`lib/export-guard.ts` 在 PDF/归档导出前统一拦截；打印兜底隐藏占位；投影输出「（未填写）」
  - **归档一致性**：正文改取当前文档 `st.doc`，不再读库中防抖前的旧版本
  - **清空失败可见**：`replaceDoc` 返回 `{ok}`，失败 toast「清空失败」而非「已清空」
  - **库页语义**：状态栏保存状态/字数/回执仅编辑器显示；m1.8 多简历库在模块 MD 标为 **M1 收口阻塞项**
  - **分区对话框**：标题为主路径，「类型标识」收进高级设置折叠区
  - 验证：**340 测试 / 45 文件全绿**；coverage 四包维持；lint / typecheck / contract / build；**E2E 3 条**（smoke + 首用两条）全过
  - **教训**：①「新增内容」的入口必须能在**空状态**下被看见（hover 门控 + 只挂在已有子项上 = 死路）；②占位文案不是数据——任何「用户必然要改」的假设都要在数据层或导出层落实为校验；③从持久层回读数据前先问「这份数据可能落后于内存吗」
- 2026-11-21 m1.8 简历库前置（#129，T3；ADR `decisions/2026-11-21-m18-library.md`；codex 指出规格顺序与状态表冲突）：
  - **顺序**：M1 尾部改为 `m1.6 → m1.8 → m1.7`（库首页是首用闭环最后一环；导入需要库作为落点；m1.7 仍暂缓）。§3.5/导航表/两模块 MD 同步
  - **导入区**：m1.7 前为禁用占位；用户可见文案「导入暂未开放」（2026-11-23 修订：UI 不出现模块号）
  - **归档**：软归档 `status='archived'`（置灰、默认不参与统计、「显示归档」切回）；.fairlens 导出仍归 m5.1「备份与恢复」
  - **首启示例**：保留「示例简历」卡片（可删）；模板卡=新建空白简历，不再导向示例
  - **多简历闭环**：`listResumeMetas` 扩为全部状态+templateId+snapshotCount；新增 library store；`openCurrent()`→`openResume(id)`；新建/切换/重命名/归档/删除/空态进验收
  - **切换保护**：不新增关闭意图，走「返回库（已有保护）→ 打开另一份」
  - **预览先行**：先交可点击预览，过目确认后才写交互
- 2026-11-23 m1.8 业务闭环实现（#129，ADR 已标已实施）：
  - **持久层**：`ResumeMeta`（全部状态 + templateId + snapshotCount）；SQL 单查询带子计数；memory 同步
  - **迁移**：db.rs v2 `ai_patch_log_fk_cascade` 重建表补 `ON DELETE CASCADE`；适配器断言 `PRAGMA foreign_keys=1`；`deleteResume` 单条 DELETE 原子级联四表；memory 显式清快照
  - **状态**：`stores/library.ts`（三态播种/新建/重命名/软归档/删除）；`editor-doc.openCurrent()`→`openResume(id)`，编辑器不再“查不到就建”
  - **视图**：`features/library/`（LibraryView + view-model + CSS）；模板常量抽 `templates/choices.ts`；卡片菜单/删除确认/重命名复用 Dropdown/ConfirmDialog/Overlay
  - **坑**：卡片不能嵌套可交互控件；重绘后按 id 找回焦点；空态仅 `metas.length===0`（全部归档另走提示）；memory 与 SQL 删除路径要分别验
  - 验证：**354 测试 / 47 文件**；**E2E 8 条**（smoke + first-use 2 + library 5）；lint/typecheck/contract/build；`cargo test db::tests` 通过。真窗 §14 待人工
- 2026-11-23 m1.8 复核修复（codex 四轮，分支 `fix/m1.8-races`）：
  - **打开并发**：editor-doc 改 session（row+controller）模型，保存绑定会话；openSeq 后发胜出，superseded 静默；旧会话在途保存只写自己的行
  - **初始化串行**：library.init() 单飞，写操作先 await，initialized 前模板卡禁用——示例播种不可能被新建抢占
  - **失败可见**：重命名失败弹窗保留+错误；ConfirmDialog 增 pending/error（删除失败可重试）；归档失败 toast
  - **示例身份**：settings.sampleResumeId；重命名保留，清空/删除释放；不再按标题判断
  - **归档对比度**：去掉整卡 opacity，改 tint+虚线；实测 light 15.38 / dark 11.77（opacity=1），验收 §14.0
  - 验证：**362 测试 / 50 文件**；**E2E 9 条**；lint/typecheck 绿
- 2026-11-23 m1.8 复核二轮修复（分支 `fix/m1.8-races2`）：
  - **旧库身份回填**：上一版只有 sampleSeeded、无 sampleResumeId → 按「唯一标题示例简历 + 文档与 sampleDoc 一致」回填；同名多条或内容改过不猜（防误认用户简历）
  - **清空跨视图同步**：library.refresh() 每次重读 sampleResumeId；清空示例返回库页徽标立即消失（E2E 断言）
  - **刷新失败不吞**：refreshInner 抛出；init 失败可重试；重命名/归档/删除后刷新失败返回 false + error
  - **连续新建串行**：createChain + 每次读最新标题，连续点击得到「我的简历 / 我的简历 2」；提交中模板卡禁用
  - 文档：docs/01 §5.1/§12.5 身份规则、STATE 待决策 0 项（预览已放行）、验收 14.6 A/B 两组
  - 验证：**367 测试 / 50 文件**；E2E 9 条；lint/typecheck 绿
- 2026-11-23 m1.8 复核三轮修复（分支 `fix/m1.8-races3`）：
  - **写/刷新失败区分**：create/rename/archive/remove 返回 `WriteOutcome`；`write-failed` 弹窗保留，`refresh-failed` 关闭弹窗并提示「已完成但列表刷新失败；可重新加载」
  - **刷新乱序**：refreshInner 带请求序号，旧列表晚到不覆盖新结果；库页顶部错误条对已初始化状态也可见并可重新加载
  - **身份读写失败可见**：sampleResumeId 读取失败不清徽标；清空示例删键失败 → `replaceDoc` 返回 `sampleCleared=false` 并 toast 如实提示
  - **回填一次性**：新增 settings `sampleIdentityMigrated`；清空后恢复内容/改回同名重启不再复活身份
  - 验证：**370 测试 / 50 文件**；E2E 9 条；lint/typecheck/coverage/build/contract 绿
- 2026-11-23 m1.8 复核四轮修复（分支 `fix/m1.8-races4`）：
  - **回填读取故障**：findLegacySample 的候选文档读取失败不再当作“没找到”，不写 `sampleIdentityMigrated`；init 失败可重试，下次启动重试
  - **身份清理失败**：remove 返回 `cleanup-failed`；库页显示「重试清除示例标识」按钮（普通刷新不会重试清理），不再给无效的“重新加载”指引
  - **刷新串行**：refreshInner 改为按发起顺序串行执行，旧查询不可能晚到覆盖；写后刷新不会被超越后静默成功
  - **编辑器身份读取**：openResume 读 sampleResumeId 失败返回 `error` 并保留 lastError，不带着错误身份进入（清空入口不消失）
  - 验证：**374 测试 / 50 文件**；E2E 9 条；lint/typecheck/coverage/build/contract 绿
- 2026-11-23 m1.8 清空落盘竞态修复（分支 `fix/m1.8-clear-race`）：
  - **清空确认 pending**：落盘完成前确认框保持打开（按钮禁用、Esc/遮罩不关），期间无法返回库/选“不保存”
  - **openResume 等待在途替换**：`replaceInFlight` 保证旧文档写入完成后再切会话；`discardPendingChanges` 在替换落盘中不产生效果
  - **身份判断前移**：`replaceDoc` 开始时捕获 `isSample`，避免保存期间切换会话后用当前会话判断清错身份
  - **延迟落库测试**：清空写入挂起 → 打开 B → 释放写入 → 旧简历写空白且身份清理、B 不受影响
  - 验证：**375 测试 / 50 文件**；E2E 9 条；lint/typecheck 绿
- 2026-11-23 m1.8 清空关窗/失败回滚修复（分支 `fix/m1.8-clear-close`）：
  - **关窗统一等待**：`requestClose` 先 `waitForReplace()`；Alt+F4/任务栏关闭不再能在清空落盘中选择“不保存”后销毁窗口
  - **失败回滚**：`replaceDoc` 保存失败恢复画布/标题/会话行（磁盘原版本、身份未动），取消后不会把空白留在画布上
  - **测试**：377 测试 / 50 文件（新增失败回滚、waitForReplace 挂起 2 条）；E2E 9
- 2026-11-23 m1.8 清空快照阶段保护（分支 `fix/m1.8-clear-snapshot`）：
  - **保护范围扩到整个清空**：`activeOps` 集合 + `runExclusive`；快照写入与正文替换都在保护内，`waitForReplace` 快照阶段也阻塞
  - EditorMockup 清空改 `runExclusive(async () => { createSnapshot; replaceDoc })`
  - 测试：快照挂起 → waitForReplace 不返回、丢弃无效 → 释放后清空完成且身份清理；**378 测试 / 50 文件**；E2E 9
  - ADR 状态行标注为定案轮历史值（354/8），当前值以 STATE 为准
- 2026-11-23 m1.8 真窗验收（§14.0–§14.6，`pnpm tauri:dev` + dev SQLite + CDP 驱动）：
  - 结果全部 **PASS**；证据图 12 张保存在 `acceptance/evidence/2026-11-23-m18/`，判定表与观测记录见 `acceptance/M1.md §14 判定结果`
  - 关键取证：Alt+F4 与 `WM_CLOSE` 均触发关闭保护且窗口不销毁；删除后 `resume_snapshots`/`review_sessions`/`ai_patch_log` 均 0；删光重启仍 0 张；旧库 A 组只补标记、B 组回填身份、删除身份后不复活
  - 观测（非缺陷）：旧库同名简历视觉不可辨（新建有去重、旧数据未去重）；清空 pending 在本机 <150ms 未能截图（状态层测试已覆盖）
  - 环境处理：验收前备份 dev 库、验收后已还原原数据；临时脚本未入仓
