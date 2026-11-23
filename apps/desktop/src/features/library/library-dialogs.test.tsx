// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumeMeta } from '@fairlens/core';
import '../../i18n/index.js';
import { ConfirmDialog } from '../../app/ConfirmDialog.js';
import { RenameDialog } from './LibraryView.js';

/**
 * #129 写失败可见性（codex 复核）：
 *  - 重命名失败：弹窗不关闭、错误可见；成功才关闭；
 *  - 删除确认：pending 禁用按钮、error 显示在框内（可重试）。
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const meta = (over: Partial<ResumeMeta> = {}): ResumeMeta => ({
  id: 'ResumeLib001',
  title: '目标简历',
  verticalId: 'general',
  status: 'active',
  updatedAt: '2026-11-23T00:00:00.000Z',
  templateId: 'tpl-classic',
  snapshotCount: 0,
  ...over,
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

const button = (label: string): HTMLButtonElement => {
  const found = [...document.querySelectorAll('button')].find((b) => b.textContent === label);
  if (!found) throw new Error(`button not found: ${label}`);
  return found as HTMLButtonElement;
};

describe('重命名弹窗失败可见（#129）', () => {
  it('落库失败：弹窗保持、显示错误；重试成功后才关闭', async () => {
    const onSave = vi.fn(async () => false);
    const onClose = vi.fn();
    act(() => root.render(<RenameDialog meta={meta()} onClose={onClose} onSave={onSave} />));

    await act(async () => { button('保存').click(); });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('重命名失败，请重试');

    onSave.mockImplementation(async () => true);
    await act(async () => { button('保存').click(); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('删除确认 pending/error（#129）', () => {
  it('pending 时两按钮禁用；error 显示在框内', () => {
    act(() => root.render(
      <ConfirmDialog
        open
        title="删除「目标简历」？"
        body="将一并删除 2 个快照"
        confirmLabel="删除"
        pending
        error="删除失败，请重试"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    ));
    expect(button('保存中…').disabled).toBe(true);
    expect(button('取消').disabled).toBe(true);
    expect(document.body.textContent).toContain('删除失败，请重试');
  });

  it('非 pending 时可点', () => {
    act(() => root.render(
      <ConfirmDialog
        open
        title="删除「目标简历」？"
        body="将一并删除 2 个快照"
        confirmLabel="删除"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    ));
    expect(button('删除').disabled).toBe(false);
    expect(button('取消').disabled).toBe(false);
  });
});
