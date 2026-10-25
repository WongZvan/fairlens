import type { PersistencePort } from '@fairlens/core';
import { createMemoryAdapter } from './adapters/memory-adapter.js';
import { createTauriSqlAdapter } from './adapters/tauri-sql-adapter.js';

const isTauri = '__TAURI_INTERNALS__' in globalThis;

let instance: PersistencePort | null = null;

/** 持久层单例：Tauri 走 SQLite，浏览器 dev 走内存（重启即失，不影响真机数据） */
export function persistence(): PersistencePort {
  return (instance ??= isTauri ? createTauriSqlAdapter() : createMemoryAdapter());
}
