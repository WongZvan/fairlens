# ADR：AI 读取契约（文档投影 + blockId 作用域 patch）

> 决策编号：总账 #119
> 日期：2026-11-13
> 状态：已定案（用户拍板 4 项 + 追问确认 3 项）
> 关联：§4.4 提示词契约 / §5.4 修订闭环 / §6.1–§6.5 AI 层 / m3.1、m3.3、m3.4、m4.3 / 附录 B `ai_patch_log`
> 实现：`packages/core/src/doc-projection.ts`（+ `entry-date.ts`）

## 1. 问题

未来接入大模型后，"逐行/按模块读取简历"具体怎么做，此前的规格只写了结果（"按 entry 逐块调用""启动前 Token 估算"），没写**读取的载体与锚点**。如果现在不定义，M3 会现场发明，而 M3 的三条铁律又互相拉扯：

- 反编造：字段名唯一事实源是契约源码；
- 契约先行：预留的是类型与插槽，不是猜的代码；
- 测试门禁：真实 LLM 永不进自动化。

## 2. 结论（一句话）

**不做切片器，做投影器**：把 `ResumeDoc` 无损投影成「每行都带 blockId 锚点的 Markdown 文本」，在应用侧按作用域（整篇/分区/条目）决定给模型看什么；模型的回写只能是 `{blockId, markdown}`，由应用反解为 `Run[]` 并走 zod。

## 3. 关键判断与理由

### 3.1 「逐行」= 语义行 = Bullet，不是字符行

简历里的换行只由 `hardBreak` 产生，序列化时被编码成 `Run.text` 内的 `\n`（`nodes.ts` 的 `runsOf`/`textWithBreaks`）。因此：

- 字符行无法独立锚定（一个 bullet 内可能有 3 个视觉行，共用一个 blockId）；
- 语义行 = `Bullet`，天然一一对应 blockId，是唯一能"改这一行而不碰别的"的单位。

**推论**：`ProjectedLine.blockId` 必为 Bullet id；条目头（org/role/日期）只作上下文不进改写目标。

### 3.2 不引入模型侧工具调用（function calling / tools）

| 原因 | 具体证据 |
|---|---|
| 协议不统一 | §6.1 定的是「OpenAI 兼容唯一协议」，而四家预设（deepseek/qwen/glm/doubao）对 `tools` 的支持与 schema 方言互有差异；引入即需要 provider 能力探测矩阵，与「preset 纯预填」(#15) 冲突 |
| 无法进自动化 | §14 硬门禁要求「真实 LLM 永不进自动化」。工具调用是模型行为，mock 只能造假轨迹，测不出真问题 |
| 绕过防线 | 写入工具会绕过 zod 契约、单事务、快照与撤销栈——而这三样正是版式不可破坏的保证 |
| 目标不匹配 | 用户目标（2026-11-13 拍板）是**提高改写精度**，不是让模型自主探索。简历是 3 页量级，整篇喂入远未触上下文上限 |

**替代方案**：应用侧切片（`projectScope`）——谁看哪段由代码决定，不靠模型自觉。

### 3.3 回写 = blockId 作用域 patch

模型输出形状固定为：`[{ blockId, markdown }]`。

管线（M3 实现，本次只出契约与投影）：

```
projectScope(doc, scope) → renderProjection() → prompt（PromptSet.structure 槽位）
  → chat() → 模型返回 [{ blockId, markdown }]
  → markdownToRuns(markdown)  → null 即拒收该条（不静默跳过）
  → Run[] 经 ResumeDoc zod 校验 → 单事务写入 → 自动快照(trigger='ai-accept') → 写 ai_patch_log
```

- `ai_patch_log` 五列已就位（`db.rs:24`）：`original_text` = 原 Markdown，`suggested_text` = 新 Markdown，`accepted` = 采纳位。**这是审计铁证**：任何一次 AI 改写都能还原"模型看的是什么、改成了什么"。
- **`diff-apply` 仍留 M3**：本次只产出文本与反解，不落盘。理由=没有真 provider 就无法验证"采纳→单事务→Ctrl+Z 一次撤销"这条链，提前写只会得到测不出的代码（违反 §6 契约冻结精神）。

### 3.4 Token 估算：混合口径 × 1.2

`docs/01 §6.3` 原文只有「中文 1.5 字≈1token」。这个值对中文密集文本**偏乐观**（BPE 对长尾汉字与全角标点的切分更碎）。实现取：

```
tokens = ceil( (CJK字符/1.5 + 其余字符/4) × 1.2 )
```

- CJK 判定：`\u3000-\u303f`（全角标点）、`\u3400-\u4dbf`、`\u4e00-\u9fff`、`\uff00-\uffef`。
- 1.2 安全系数由单测锁定（改它会红），避免日后被"顺手优化"掉。
- 该口径同时用于 §5.5 走查的"启动前 Token 估算"与 `contextWindow` 预算判断（M4）。

## 4. 最小可用范围（本次已交付）

`packages/core/src/doc-projection.ts`：

| 导出 | 作用 |
|---|---|
| `estimateTokens(text)` | 上述口径 |
| `runsToMarkdown(runs)` | 无损编码；嵌套顺序固定 link 最内 → italic → bold |
| `markdownToRuns(md)` | 宽松解码（含 `__粗__`、`***粗斜***`、url 内成对括号）；空文本返回 `null` |
| `projectDoc(doc)` | 投影树（profile + sections/fields/entries/lines/skills + hasPhoto） |
| `renderProjection(tree)` | 给模型看的文本，每行带 `[blockId]` |
| `estimateProjection(tree)` | 渲染文本的 token 估算 |
| `projectScope(doc, scope)` | `'doc'` / `{kind:'section'}` / `{kind:'entry'}` |
| `collectProjectedIds(tree)` | 自检：确认投影没造出原文不存在的 id |

**不复用** `snapshot-diff.ts` 的 `runsText`：它截断到 40 字（UI label 用途）。投影必须无损，否则模型看到残缺句，改写必然失真——这条已写进代码注释与测试（「长要点不被截断」用例）。

## 5. 明确不做（附理由，防日后被当成遗漏）

| 不做 | 理由 |
|---|---|
| tiktoken 精确分词 | 纯前端无 node 依赖；34MB wasm + 每次加载，收益不抵成本 |
| 自动分片/滑动窗口 | 目标不是应对超长上下文；简历量级不会触发。**触发条件**：用户实测文档估算 > contextWindow×0.5，再立项 |
| 模型侧工具/函数调用 | 见 §3.2 |
| RAG / 向量检索 | 附录 F 已有触发条件（评估需注入垂类知识库且提示词拼接不够用） |
| 投影里包含照片二进制 | 二进制不进 prompt；只报 `hasPhoto` |
| 双向完美往返（压缩/重排也保真） | 只保证"不经模型直接往返"；模型改写后标记按 Markdown 语义重算，不承诺还原原 run 切分 |

## 6. 已知限制（诚实声明）

1. **相邻同样式 run 会被合并**：`[{text:'a',bold},{text:'b',bold}]` 往返后变成 `[{text:'ab',bold}]`。语义等价、视觉无差，但 diff 粒度会变。这是有意的（减少 token 与模型改写噪音）。
2. **Markdown 不是完整 CommonMark**：只支持模型实际会产出的四种标记。`#` 标题、列表符号、表格等一律按字面文本处理。
3. **`\n` 在行内保留**：一个 bullet 内的视觉换行原样留在 markdown 里，模型看到的是同一行内的换行。若模型把 `\n` 删掉或增加，回写后 blockId 不变（仍是一个 bullet），只是内部换行变化。
4. **`section.title` 为空白**时投影照原样输出空白标题（不回落类型名）——回落是 UI 层的事（`OutlineTreeLive`）。模型层看到的是真实数据。

## 7. 验证方式

- `packages/core/src/doc-projection.test.ts`：38 用例（token 边界 / 编解码往返含转义与嵌套 / 投影树结构与过滤 / 渲染锚点 / 作用域切片不越界 / 不造假锚点）。
- 后续 M3 接线时新增集成测试：mock Provider 返回固定 `[{blockId, markdown}]` → 断言落库后 `SnapshotDiff` 只含该 blockId。

## 8. 传播清单（本次已勾）

- [x] 总账 #119
- [x] ADR（本文件）
- [x] `packages/core` 实现 + 单测
- [x] `packages/core/src/index.ts` 导出
- [x] `entry-meta.ts` 的 `formatDateRange` 上移到 core（避免两份实现漂移）
- [x] 模块 MD：m3.3（prompt-renderer 消费方）、m3.4（回写契约）、m4.3（走查 Token 估算口径）
- [x] STATE：待人工验收指向 `acceptance/M1.md`；未落地项注明投影已就位
- [ ] 正文 §5.4/§6.3 —— **待 M3 开工时**随 diff-apply 一起修订（现在是投影层，尚未改变 §5.4 的行为描述，提前改会造成"文档写了代码没有"）