# ADR：单行命令栏 + 导出 PDF/归档 + 内联搜索

> 决策编号：总账 #124 / #125 / #126
> 日期：2026-11-13
> 状态：已定案（用户四轮拍板：形态/导出范围/自动保存位置/菜单集/PDF 路径/归档落盘/保存按钮语义）
> 关联：§5.2 权限矩阵 / §5.6 快捷键与命令面板 / §5.7 关闭保护与保存 / §9 导出 / §12.3 小屏适配 / §12.5 设置
> 背景：用户提出「顶部工具栏做成 Microsoft Office / WPS 那种形态（保存、导出 PDF/Word、自动保存切换）」

## 1. 被否决的方案：Ribbon（多行选项卡功能区）

**不做**，三条硬理由：

| 理由 | 事实 |
|---|---|
| 垂直空间 | 960×640 最小窗口下，固定 chrome 已是 `42(titlebar)+30(status)+44(toolbar)=116px`（18.1%），画布仅 524px。Ribbon（选项卡 32 + 功能区 88）要再加 ~120px → 画布剩 ~404px。与 §12.3「最小窗口 960×640…画布优先保宽」冲突 |
| 内容密度 | Ribbon 的「开始/插入/布局」三组在本产品里 80% 必须是灰的——字体/字号/颜色/页边距/表格/图片全被 §5.2 权限矩阵在 schema 层禁止。一个大部分禁用的大功能区是最差的可发现性 |
| 产品定位 | FairLens 卖的是「版式锁定 + AI 打磨闭环」（§1.5），不是自由排版。Ribbon 的视觉语言暗示「什么都能调」，与定位相反 |

**采用**：单行命令栏（44px）+ 四个顶级菜单（文件/编辑/视图/AI）。净省 42px 画布，且「文件→导出」是 Office/WPS 用户共有的心智模型。

## 2. 命令栏结构与取舍

```
文件 编辑 视图 AI │ ↶ ↷ │ 模板：经典单栏 ▾        ⇅ 自动保存  导出 ▾  ● ☀ ⚙ ─ □ ✕
```

- **模板三按钮 → 下拉**：960px 下三按钮约 230px，下拉约 110px。省出的宽度给菜单。
- **激活状态 chip → 圆点**：原「● 已激活」约 60px，收成 8px 圆点 + tooltip/aria。语义（#111）不变。
- **保存按钮按模式显隐**（用户选择）：手动模式显示「保存」+ dirty 点；自动模式不显示——避免出现"已自动保存还要手动点"的矛盾控件。`Ctrl+S` 两模式都可用。
- **自动保存开关常驻**（用户选择）：与设置→通用共用 `setAutosave`（切手动前先落盘）。状态栏仍只做状态指示，控件与指示分离。
- **未实现项一律 `disabled` + 里程碑徽标**（m1.8 / M5 / M3 / M4）——不做"点了没反应"的空按钮。`menu-model.ts` 是纯函数，单测锁住这条规则。

## 3. 导出 PDF：为什么是 WebView2 PrintToPdf 而不是 window.print

用户明确：「导出是下载到本地，不是导出去打印」。

事实链（2026-11-13 核查）：
- `tauri 2.12.5` 的 `WebviewWindow::print()` 在 Windows 上只是 `eval("window.print()")`（`wry-0.57.1/src/webview2/mod.rs:1886`）→ 弹系统打印对话框，**不落盘**。
- 底层 COM 有 `ICoreWebView2_7::PrintToPdf(resultfilepath, settings, handler)`（`webview2-com-sys-0.39.1/src/bindings.rs:43637`）→ 直接写文件。
- 取接口路径：`PlatformWebview::controller()` → `CoreWebView2()` → cast `ICoreWebView2_7`；`PlatformWebview::environment()` → cast `ICoreWebView2Environment6` → `CreatePrintSettings`。

**实现**（`apps/desktop/src-tauri/src/export.rs`）：
- `export_pdf(path)`：A4 8.27×11.69 英寸、四边距 0、`shouldPrintBackgrounds=true`、`shouldPrintHeaderAndFooter=false`；失败把 HRESULT 原文回传（不吞异常）
- `save_archive(path, json)`：`fs::write`，Rust 不碰业务
- 路径来源：`tauri-plugin-dialog` 的 `save()`（唯一新增插件；**不装 fs 插件**——PDF 由 WebView2 自己写盘，归档只写一个字符串）
- 打印时隐藏应用 chrome：`features/templates/print-css/print-shell.css`（只在 `@media print` 生效）。**不进 `print-css/base.ts`**——那是纸面内容样式，chrome 隐藏是另一类关注点（2026-11-13 曾把屏幕控件样式写进 base.ts 被用户拒绝的教训）

## 4. 归档导出：为什么 reviewSessions / patchLog 是空数组

`FairlensFile`（§4.7）包含 `resume` / `snapshots` / `reviewSessions` / `patchLog` 四项。实测：
- `review_sessions` 表与 `ai_patch_log` 表**全仓零 INSERT**（DDL 存在，M3/M4 才产生数据）
- `PersistencePort` 也没有这两个方法

所以归档里它们是 `[]`——**如实反映"现在没有这类数据"，不是漏做**。等 M3（AI 修订）与 M4（评估）接上，自动就有内容，归档格式无需改。

## 5. 内联搜索（#126）

- 纯函数 `findMatches(doc, query)`：遍历 textblock 内的文本片段，拼段后找子串再映射回绝对位置；**不跨文本块匹配**（不同 bullet 之间连起来无意义）
- 高亮：`Decoration.inline`，当前项加深；插件 `addToHistory: false`，搜索不污染撤销栈
- UI：`SearchBar` 浮在画布右上，`Enter` 下一条 / `Shift+Enter` 上一条 / `Esc` 关闭；IME 合成态不触发（复用 `isComposingKey`）
- 关闭时 `clearFind()` 清装饰——否则高亮会留在纸面上

## 6. 状态栏字数统计

`docStats(doc)`（`packages/core`）：
- 字数 = 所有 bullet run 文本拼接后**排除空白**的字符数（简历场景关心"写了多少"，空格不算）
- 要点数 = 有文本的 bullet 数；条目数 = entries 数（含空壳）
- **不含页头 profile 与 basicFields**——那是标识信息，计入会误导"我写了多少"

## 7. 已知限制（诚实声明）

1. **PDF 是"整页打印"，不是"精确分页"**：`PrintToPdf` 按 CSS 分页，纸面 `min-height:297mm` 可能产生空白尾页（视内容而定）。CDP 的精确分页仍是 m5.1 的正路；当前实现满足"导出成文件"这一需求。
2. **PDF 不含链接注记**：`PrintToPdf` 保留可点链接（WebView2 行为），但"注记"式的书签/大纲不在此列。
3. **归档不能在浏览器模式用**：`invoke('save_archive')` 仅在 Tauri 下存在；浏览器模式给出明确 toast，不静默失败。
4. **自定义分区在 PDF 中的分页**：新分区内容若跨页，依赖 `print-css` 的 `break-inside` 规则（既有），新分区没有专属规则——视觉与内置分区一致。
5. **Word / 批注版 PDF / 长图 / HTML 未实现**（置灰 M5）。

## 8. 传播清单

- [x] `docs/01` §9（PDF 实现路径）、§5.7（自动保存双入口）、§12.5（命令栏形态）、附录 A（invoke 命令）
- [x] 附录 E #124/#125/#126
- [x] 本 ADR
- [x] `packages/core` 新增 `doc-stats.ts`（纯函数 + 7 单测）
- [x] 模块 MD：m1.1（命令栏取代双行）、m1.5（搜索条 + 快捷键表）、m5.1（PDF 已提前落地）
- [x] STATE / 验收手册第 12 节

## 9. 修复记录（2026-11-17，用户直报两项 + 实测发现一项）

| # | 现象 | 根因（文件:行） | 修法 |
|---|---|---|---|
| 1 | 切自动保存时「模板：经典单栏」左右移动 | `CommandBar.tsx` 保存按钮按 `!autosave` 条件渲染；`shell.css` 两段 `.cmd-drag{flex:1 1 8px}` 在按钮卸载后各长胖 ~32px，把后面的图标+模板整体推右 | 伸缩空白减为一段并移到**编辑区群组之后**；右群组（保存/自动保存/导出/激活点）包进 `.cmd-right{margin-left:auto}`。保存按钮显隐只改变它自己左侧空隙，模板/菜单/撤销零位移（浏览器实测：切换前后 template.left=275/ icons=212/ menus=46/ export=794 全部不变） |
| 2 | 顶栏下拉看不到 | `.cmdbar{overflow:hidden}` 裁掉 `position:absolute; top:calc(100%+4px)` 的下拉：锚 28px 高按钮 → 下拉顶边 32px，44px 栏只留 12px | 下拉改 `createPortal(body)` + `position:fixed`（`app/dropdown.tsx`）。纯函数 `placeDropdown` 负责左右对齐/视口夹取/下方不足翻转向上，`resize`+`scroll` 重定位；样式坐标全由内联给，CSS 只留外观与 `max-height` 兜底 |
| 3 | 内联搜索条浮在命令栏上挡住「导出」（实测发现） | `SearchBar` 挂在 `.editor-mock` 下，而 `.editor-mock` 无 `position` → `absolute; top:10px` 按视口算，落在 y=10（命令栏 0–44） | `.editor-mock{position:relative}`，搜索条回到画布顶部 y=54 |

**portal 化的连带必改点**：下拉节点搬进 body 后，旧的「锚点 ref 是否包含 target」dismiss 判定会把「点下拉项」误判成「点外面」——mousedown 先卸载、click 随后丢失，菜单项点不动。`Dropdown` 的判定改为 **锚点 ∪ 下拉节点**，并统一接管 Esc（模板/导出下拉原先没有 Esc，现三个下拉行为一致）。

**顺带兜底**：`.cmd-template` 改为唯一可收缩项（`flex:0 1 auto; min-width:0` + 值文本省略号），保证 960px 下永远不会把窗口三键挤出视口。`.cmd-drop-left/right` 两个类被 `align` prop 取代后删除。
