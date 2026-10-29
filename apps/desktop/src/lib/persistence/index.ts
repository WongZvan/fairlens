import type { PersistencePort } from '@fairlens/core';
import { createMemoryAdapter } from './adapters/memory-adapter.js';
import { createTauriSqlAdapter } from './adapters/tauri-sql-adapter.js';

const isTauri = '__TAURI_INTERNALS__' in globalThis;

let instance: PersistencePort | null = null;

/** 持久层单例：Tauri 走 SQLite，浏览器 dev 走内存（重启即失，不影响真机数据） */
export function persistence(): PersistencePort {
  return (instance ??= isTauri ? createTauriSqlAdapter() : createMemoryAdapter());
}

/**
 * 启动自愈（#109）：逐行加载一次，触发适配器层的旧数据修复与写回。
 * 早期版本的换序缺陷曾写入 null 条目/空 runs，坏行会让编辑器加载失败；这里一次性收敛。
 */
export async function repairAllResumes(): Promise<void> {
  const port = persistence();
  try {
    const metas = await port.listResumeMetas();
    for (const m of metas) {
      try {
        await port.getResume(m.id);
      } catch (err) {
        console.warn('[persistence] 简历修复失败（跳过）', m.id, err);
      }
    }
  } catch (err) {
    console.warn('[persistence] 启动自愈跳过', err);
  }
}
