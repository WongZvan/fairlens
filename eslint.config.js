import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

// 防腐规则①：依赖方向单向 shared←core←features（docs/01 §2.4）
export default tseslint.config(
  { ignores: ['**/dist/**', '**/target/**', '**/node_modules/**', '**/*.config.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['packages/shared/src/**', 'packages/core/src/**', 'packages/prompts/src/**', 'apps/desktop/src/**', 'tools/keygen/src/**'],
      'boundaries/elements': [
        { type: 'shared', pattern: 'packages/shared/src/**' },
        { type: 'core', pattern: 'packages/core/src/**' },
        { type: 'prompts', pattern: 'packages/prompts/src/**' },
        { type: 'desktop', pattern: 'apps/desktop/src/**' },
        { type: 'keygen', pattern: 'tools/keygen/src/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'shared', allow: [] },
            { from: 'core', allow: ['shared'] },
            { from: 'prompts', allow: ['shared'] },
            { from: 'desktop', allow: ['shared', 'core', 'prompts'] },
            { from: 'keygen', allow: ['shared'] },
          ],
        },
      ],
    },
  },
);
