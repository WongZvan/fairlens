# 2026-11-05 预览纸面结构 + 四项反馈修复

> 状态：已定案（2026-11-05 用户拍板；总账 #116/#117）
> 触发：用户四项反馈——①拖动窗口边界不能往内缩 ②粘贴气泡与预览字体/版面兼容性 ③右栏六维雷达被裁 ④左栏大纲下拉键未实现。

## 结论摘要

1. **窗口不能内缩**：主窗运行时最小 1152×720 vs 默认 1280×800，向内仅 128×80；且激活门/主窗切换未等 `hydrated`，异步分支可能把窗口顶在最小尺寸。改为主窗 min **960×640**、门态 420×380、`hydrated` 后再应用窗口形态（#116）。
2. **粘贴气泡与版面**：粘贴只保留 schema 白名单（文本 + bold/italic/link + fl 结构），**字体/字号/颜色不会进入文档模型**——这是「版式锁定」设计。预览的字体与版面大部分在现有 schema 内可表达，缺的是节点/DOM/序列化与 printCSS 接线。本轮补齐「完整预览纸面结构」（#117）。
3. **雷达被裁**：左右栏各嵌套两层 `aside`（双击 padding + 内层 overflow），雷达固定 196px 在右栏 220px 时可用宽仅 163px；左侧标签 `end` 锚点越界。去嵌套 + SVG 响应式 + 标签锚点修正。
4. **大纲下拉键**：`ChevronDown` 只是装饰图标，无展开状态/事件。补分区级折叠（持久化 localStorage）。

## 纸面结构定案（#117）

- **契约新增 `ResumeDoc.profile`**：`{ name: string; headline?: string; contactLine?: string }`，可选、旧文档兼容；对应预览页头。`contactLine` 一行展示，http/https/mailto/email 自动链接化。
- **PM 节点**：
  - `flPageHeader`（atom）↔ profile；
  - `flBasicField`（inline content）↔ BasicField（值原生编辑，label/href 为 attrs）；
  - `flPhotoSlot`（atom）↔ PhotoSlot；无真实资产时渲染虚线占位（上传随 m5.1）；
  - `flSkillGroup`（inline content，hardBreak 分隔 items）↔ SkillGroup；
  - `flEntryHeader` 由 inline 内容改 **atom**：org/role/start/end/ongoing 走 attrs；展示 org/role/date 三段，点击弹元信息编辑（修「编辑条目不持久化」旧缺陷）；
  - `flColumn`（duo 专用）side/main 容器；classic/sidebar 保持扁平 sections；
  - `flSection` 输出 `data-section-type`，内部 `order` attr 用于 duo 分组后还原文档顺序。
- **模板**：`resumeDocToPm` 按 templateId 选择扁平或 duo 双栏；三套模板切换按钮真实写回 `doc.templateId`（此前只改 UI 状态）。
- **printCSS**：按预览画板（566×800 ≈ A4 的 0.713 倍）等比 ×1.4023：正文 13pt、姓名 28pt、分区 15pt、行高 1.5、页边距 17×20mm；分区标题尾部细线；条目三段行；要点墨色方块；页头 2px 墨线；duo 侧栏 73.5mm。
- **字体**：正文 IBM Plex Sans（拉丁）+ IBM Plex Sans SC（中文），标题 Noto Serif SC；使用官方 `@ibm/plex-sans-sc`（OFL，woff2 子集），字体主题新增第 4 套 `plex`（契约允许 2–4 套）。

## 影响文件

- 契约：`packages/shared/src/resume.ts`、`contracts.test.ts`
- 节点/序列化：`apps/desktop/src/features/editor/nodes.ts`、`nodes.test.ts`
- 画布/NodeView：`CanvasEditor.tsx`、新增 `NodeViews/*`、`MetaDialog.tsx`
- 模板：`templates/manifests/*`、`templates/print-css/*`、`templates.test.ts`、`sample-data.ts`
- 布局/窗口：`AppShell.tsx`、`EditorMockup.tsx`、`OutlineTreeLive.tsx`、`stores/mockup.ts`、`mockup.css`、`i18n/locales/zh-CN.ts`
- 字体：`apps/desktop/package.json`、`main.tsx`
- 文档：总账 #116/#117、docs/01 §4.1/§5.3/§5.2/§8/§12.3/§12.4/§14/Changelog、相关模块 MD、STATE、导航表、README

## 测试与验收

- 单测：profile round-trip、basicFields/photo/skills、duo column 展平/order、entry header 日期解析、contactLine 链接化、大纲折叠纯函数、模板切换。
- 门禁：test/lint/typecheck/contract/build。
- 浏览器：字体 computed style、纸面截图对比预览、三模板切换、页头/条目头编辑、雷达 220/296 两档、大纲折叠持久化。
- 真窗人工：窗口 1280×800 → 960×640 内缩；激活启动无 min 竞态；Plex Sans SC 真窗渲染；SQLite 持久化。

## 明确不做

照片上传/资产库（占位随模板，实作 m5.1）；基本信息字段/技能组增删 UI（本轮编辑现有值）；样式选项设置 UI（第 4 套主题进数据，入口 m2.3）；真实分页/导入导出；任意字体/字号/颜色/表格/时间线（违反版式锁定）。
