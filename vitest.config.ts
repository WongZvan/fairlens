import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // apps/* 纳入（m1.6 缺陷直报即修）：此前 desktop 的 nodes/shortcuts 等单测不在根 pnpm test（CI test job）范围
    // functions/* 纳入（2026-11-21）：lease 端点是唯一服务端，占位期也要被覆盖率门禁管住（m2.1 实现后自动继续纳入）
    projects: ['packages/*', 'tools/*', 'apps/*', 'functions/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      // §14：shared/core/keygen/lease 单测覆盖率门禁；apps/desktop 不在规格范围（由 E2E + 人工验收覆盖）
      include: [
        'packages/shared/src/**/*.ts',
        'packages/core/src/**/*.ts',
        'tools/keygen/src/**/*.ts',
        'functions/lease/src/**/*.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      // 逐包阈值：shared 的高覆盖不得抵消 keygen 的低覆盖
      thresholds: {
        'packages/shared/src/**': { lines: 80, functions: 80, branches: 80 },
        'packages/core/src/**': { lines: 80, functions: 80, branches: 80 },
        'tools/keygen/src/**': { lines: 80, functions: 80, branches: 80 },
        'functions/lease/src/**': { lines: 80, functions: 80, branches: 80 },
      },
    },
  },
});
