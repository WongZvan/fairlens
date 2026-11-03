# 环境坑与解法实录（跨会话必读）

## 网络
- **git**：仓库本地级代理 `http://127.0.0.1:7897`（`git config --local http.proxy`）；全局配置里残留的 2334 已失效勿用。GitHub 走 7897 通、直连也通；**registry.npmjs.org 直连通、走 7897 反而 TLS 失败**——所以 npm/pnpm 直连。
- **~/.npmrc 死代理已删**（原 proxy/https-proxy=2334；备份 `.npmrc.bak-20261024`）。

## 工具链版本怪癖
- pnpm 11：构建脚本许可在 `pnpm-workspace.yaml` 的 `allowBuilds`（esbuild=true）；`pnpm run <script> -- args` 会把 `--` 透传为字面参数，传参时**不要加 `--`**。
- vitest 3.2：`vitest.workspace.ts` 已弃用，用根 `vitest.config.ts` 的 `test.projects`。
- Windows `execFileSync('pnpm'|'npm')` 无 .cmd 解析会静默崩——需要子进程时改用纯函数导入或加 `shell:true`。
- Node 24 + `import.meta.dirname` 可用（未用 fileURLToPath 的老写法）。

## 换行
- `core.autocrlf` 工作区 CRLF 会让字节比对误报——契约校验已做 `\r\n` 归一；`.gitattributes` 统一 LF 入仓。
- Bash 里 `"m${var%%.*}"` 类前缀拼接要小心变量本身已含前缀（曾因此把目录写成 mm1/——低级但真实）。

## Rust / Tauri
- **Rust 已装**（1.99.1，2026-10-25 发现）；cargo 走 `~/.cargo/config.toml` proxy=127.0.0.1:7897（系统死代理 2334 会被 libcurl 拾取导致 crates.io 连不上）。首编 sqlx+tauri 全树约 30–40 分钟属正常。
- **capabilities / tauri.conf 改动必须强制重编**：`cargo build` 可能显示 `Finished` 却没有重跑 tauri-build → 权限不生效。先 `touch src-tauri/build.rs` 再 build，并**核对生成物** `target/debug/build/fairlens-*/out/capabilities.json` 是否包含新权限（#114 实证：`opener:allow-default-urls` 缺生成物时 `open_url` 报 "Not allowed to open url"）。
- `tauri dev` 被 Ctrl+C/关终端后 `fairlens.exe` 与 vite 可能残留 → 二启动报 `Port 1420 already in use` 但仍拉窗（连的是残留前端）；`pnpm dev:kill` 清理，`tauri:dev` 已内置前置清理。

## 真窗取证（CDP，2026-11-03 新增，定位链接打不开的关键手段）
```bash
# 1) 带远程调试端口启动（WebView2）
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222 --remote-allow-origins=*" pnpm tauri:dev
# 2) 列目标
curl -s http://127.0.0.1:9222/json
# 3) Python websocket-client 执行任意前端代码（Runtime.evaluate, awaitPromise=true）
```
```python
import json, requests, websocket
page = next(t for t in requests.get('http://127.0.0.1:9222/json').json() if t['type']=='page')
ws = websocket.create_connection(page['webSocketDebuggerUrl'])
ws.send(json.dumps({"id":1,"method":"Runtime.evaluate","params":{"expression":"1+1","returnByValue":True}}))
print(json.loads(ws.recv()))
```
典型用途：`window.__TAURI_INTERNALS__.invoke('plugin:opener|open_url',{url})` 抓权限错误原文；读取 `__flErrors`/`__flBubbleLog`；合成事件调用。

## 编辑/工具链陷阱（2026-11-03）
- **plan mode 会拦截写操作**：编辑工具返回 “Plan mode only allows read-only tools” 时改动**没有落盘**——恢复执行后必须复核文件内容（#114 教训：#113 曾误以为已补 capabilities）。
- 大文件改动用脚本替换后，务必 grep 关键标记确认（`grep -n allow-default-urls ...`）。
