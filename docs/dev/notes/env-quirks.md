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

## Rust（待装）
- 未安装：`winget install Rustlang.Rustup` + VS Installer 勾选"使用 C++ 的桌面开发"。M1 的 `tauri dev/build` 首验前装好；web 模式（vite）不受影响。
