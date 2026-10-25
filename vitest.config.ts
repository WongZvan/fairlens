import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // apps/* 纳入（m1.6 缺陷直报即修）：此前 desktop 的 nodes/shortcuts 等单测不在根 pnpm test（CI test job）范围
    projects: ['packages/*', 'tools/*', 'apps/*'],
  },
});
